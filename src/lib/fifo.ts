import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PrismaTx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export interface PurchaseItemInput {
  productId: string;
  purchaseItemId?: string;
  quantity: number;
  costPerUnit: number;
}

export interface SaleItemInput {
  productId: string;
  quantity: number;
}

export interface ReturnItemInput {
  productId: string;
  quantity: number;
  costPerUnit: number;
}

/**
 * Creates inventory cost layers when a purchase is finalized.
 * Increases branch-wise stock and records IN stock movement.
 */
export async function createInventoryLayers(
  tx: PrismaTx,
  branchId: string,
  items: PurchaseItemInput[]
) {
  for (const item of items) {
    const qty = new Prisma.Decimal(item.quantity);
    const cost = new Prisma.Decimal(item.costPerUnit);

    // 1. Create FIFO Inventory Layer
    await tx.inventoryLayer.create({
      data: {
        branchId,
        productId: item.productId,
        purchaseItemId: item.purchaseItemId || null,
        quantity: qty,
        remainingQty: qty,
        costPerUnit: cost,
      },
    });

    // 2. Upsert Branch Inventory Stock
    await tx.inventory.upsert({
      where: {
        productId_branchId: {
          productId: item.productId,
          branchId,
        },
      },
      update: {
        quantity: { increment: qty },
      },
      create: {
        branchId,
        productId: item.productId,
        quantity: qty,
      },
    });

    // 3. Record Stock Movement
    await tx.stockMovement.create({
      data: {
        branchId,
        productId: item.productId,
        movementType: "IN",
        quantity: qty,
        referenceType: "purchase",
        referenceId: item.purchaseItemId || null,
        notes: `Purchase batch added at ${item.costPerUnit}/unit`,
      },
    });
  }
}

/**
 * Consumes inventory layers using FIFO (First-In, First-Out).
 * Decreases remainingQty layer by layer, calculates line COGS,
 * decreases branch-wise stock, and records OUT stock movement.
 */
export async function consumeInventoryFIFO(
  tx: PrismaTx,
  branchId: string,
  items: SaleItemInput[]
): Promise<Array<{ productId: string; fifoCost: Prisma.Decimal; consumedQty: number }>> {
  const result: Array<{ productId: string; fifoCost: Prisma.Decimal; consumedQty: number }> = [];

  for (const item of items) {
    let remainingToConsume = new Prisma.Decimal(item.quantity);
    let totalLineCOGS = new Prisma.Decimal(0);

    // Fetch oldest available layers with remainingQty > 0
    const layers = await tx.inventoryLayer.findMany({
      where: {
        branchId,
        productId: item.productId,
        remainingQty: { gt: 0 },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    for (const layer of layers) {
      if (remainingToConsume.lte(0)) break;

      const layerRemaining = new Prisma.Decimal(layer.remainingQty);
      const consumeFromThisLayer = Prisma.Decimal.min(remainingToConsume, layerRemaining);

      const layerCOGS = consumeFromThisLayer.mul(new Prisma.Decimal(layer.costPerUnit));
      totalLineCOGS = totalLineCOGS.add(layerCOGS);

      const newRemaining = layerRemaining.sub(consumeFromThisLayer);
      remainingToConsume = remainingToConsume.sub(consumeFromThisLayer);

      // Update layer remainingQty
      await tx.inventoryLayer.update({
        where: { id: layer.id },
        data: { remainingQty: newRemaining },
      });
    }

    // Fallback if remaining stock was not covered by existing purchase FIFO layers
    if (remainingToConsume.gt(0)) {
      const prod = await tx.product.findUnique({ where: { id: item.productId } });
      const fallbackCostPerUnit = prod ? new Prisma.Decimal(prod.sellingPrice).mul(0.7) : new Prisma.Decimal(0);
      const fallbackCOGS = remainingToConsume.mul(fallbackCostPerUnit);
      totalLineCOGS = totalLineCOGS.add(fallbackCOGS);

      await tx.inventoryLayer.create({
        data: {
          branchId,
          productId: item.productId,
          quantity: new Prisma.Decimal(item.quantity),
          remainingQty: new Prisma.Decimal(0),
          costPerUnit: fallbackCostPerUnit,
        },
      });
    }

    const qty = new Prisma.Decimal(item.quantity);

    // Decrease Branch Inventory Stock (upsert in case inventory row didn't exist yet)
    await tx.inventory.upsert({
      where: {
        productId_branchId: {
          productId: item.productId,
          branchId,
        },
      },
      update: {
        quantity: { decrement: qty },
      },
      create: {
        productId: item.productId,
        branchId,
        quantity: new Prisma.Decimal(0).sub(qty),
      },
    });

    // Record Stock Movement
    await tx.stockMovement.create({
      data: {
        branchId,
        productId: item.productId,
        movementType: "OUT",
        quantity: qty,
        referenceType: "sale",
        notes: `FIFO consumed at total COGS ${totalLineCOGS.toString()}`,
      },
    });

    result.push({
      productId: item.productId,
      fifoCost: totalLineCOGS,
      consumedQty: item.quantity,
    });
  }

  return result;
}

/**
 * Restores inventory when sales return occurs.
 * Creates a new layer with returned cost, increases stock.
 */
export async function restoreInventoryFIFO(
  tx: PrismaTx,
  branchId: string,
  items: ReturnItemInput[]
) {
  for (const item of items) {
    const qty = new Prisma.Decimal(item.quantity);
    const cost = new Prisma.Decimal(item.costPerUnit);

    // Create a new layer for returned stock
    await tx.inventoryLayer.create({
      data: {
        branchId,
        productId: item.productId,
        quantity: qty,
        remainingQty: qty,
        costPerUnit: cost,
      },
    });

    // Increase Branch Inventory Stock
    await tx.inventory.upsert({
      where: {
        productId_branchId: {
          productId: item.productId,
          branchId,
        },
      },
      update: {
        quantity: { increment: qty },
      },
      create: {
        branchId,
        productId: item.productId,
        quantity: qty,
      },
    });

    // Record Stock Movement
    await tx.stockMovement.create({
      data: {
        branchId,
        productId: item.productId,
        movementType: "IN",
        quantity: qty,
        referenceType: "return",
        notes: `Sales return stock restored at ${item.costPerUnit}/unit`,
      },
    });
  }
}
