import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { reconcileSupplier } from "@/lib/supplierUtils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const purchase = await prisma.purchase.findUnique({
      where: { id, isDeleted: false },
      include: {
        supplier: true,
        branch: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: true,
            inventoryLayers: true,
          },
        },
        payments: {
          where: { isDeleted: false },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    return NextResponse.json(purchase);
  } catch (error) {
    console.error("Error fetching purchase details:", error);
    return NextResponse.json({ error: "Failed to fetch purchase details" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            inventoryLayers: true,
          },
        },
      },
    });

    if (!purchase || purchase.isDeleted) {
      return NextResponse.json({ error: "Purchase bill not found or already deleted." }, { status: 404 });
    }

    // Check if any items from this purchase batch have already been sold in customer sales
    for (const item of purchase.items) {
      for (const layer of item.inventoryLayers) {
        const initialQty = Number(layer.quantity || 0);
        const remainingQty = Number(layer.remainingQty || 0);
        const consumed = initialQty - remainingQty;

        if (consumed > 0.0001) {
          return NextResponse.json(
            {
              error: `Cannot delete purchase bill: ${consumed} unit(s) of "${item.product?.name || "Product"}" have already been sold in sales. Please adjust or return those sales first, or edit this purchase bill instead.`,
            },
            { status: 400 }
          );
        }
      }
    }

    await prisma.$transaction(
      async (tx) => {
        // 1. Revert Inventory physical stock and remove FIFO inventory layers
        for (const item of purchase.items) {
          const qty = new Prisma.Decimal(item.quantity);

          // Decrement branch inventory stock
          await tx.inventory.upsert({
            where: {
              productId_branchId: {
                productId: item.productId,
                branchId: purchase.branchId,
              },
            },
            update: {
              quantity: { decrement: qty },
            },
            create: {
              productId: item.productId,
              branchId: purchase.branchId,
              quantity: new Prisma.Decimal(0).sub(qty),
            },
          });

          // Delete inventory layers for this purchase item
          await tx.inventoryLayer.deleteMany({
            where: { purchaseItemId: item.id },
          });

          // Record stock movement (OUT)
          await tx.stockMovement.create({
            data: {
              branchId: purchase.branchId,
              productId: item.productId,
              movementType: "OUT",
              quantity: qty,
              referenceType: "purchase_deletion",
              referenceId: purchase.id,
              notes: `Stock removed due to deletion of purchase bill #${purchase.invoiceNumber || purchase.id}`,
            },
          });
        }

        // 2. Soft-delete linked supplier payments for this purchase
        await tx.supplierPayment.updateMany({
          where: {
            purchaseId: id,
            isDeleted: false,
          },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        });

        // 3. Soft-delete the purchase
        await tx.purchase.update({
          where: { id },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        });

        // 4. Reconcile supplier payments and outstanding purchases
        await reconcileSupplier(tx as any, purchase.supplierId);
      },
      {
        maxWait: 15000,
        timeout: 60000,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Purchase bill deleted successfully. Inventory, payments, and supplier balance have been updated.",
    });
  } catch (error: any) {
    console.error("Error deleting purchase:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete purchase" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      supplierId,
      branchId,
      invoiceNumber,
      purchaseDate,
      items,
      amountPaid = 0,
      paymentMethod = "CASH",
      bankReference,
      notes,
    } = body;

    if (!supplierId || !branchId) {
      return NextResponse.json({ error: "Supplier and Branch are required." }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one purchase item is required." }, { status: 400 });
    }

    for (const item of items) {
      if (!item.productId || Number(item.quantity) <= 0 || Number(item.purchaseRate) < 0) {
        return NextResponse.json(
          { error: "All items must have a valid product, quantity (> 0), and non-negative purchase rate." },
          { status: 400 }
        );
      }
    }

    // Fetch existing purchase with items and layers
    const existingPurchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            inventoryLayers: true,
          },
        },
      },
    });

    if (!existingPurchase || existingPurchase.isDeleted) {
      return NextResponse.json({ error: "Purchase bill not found." }, { status: 404 });
    }

    // Track previously consumed quantities per product in this purchase batch
    const consumedByProduct = new Map<string, { consumed: number; productName: string }>();

    for (const oldItem of existingPurchase.items) {
      let itemConsumed = 0;
      for (const layer of oldItem.inventoryLayers) {
        const initQty = Number(layer.quantity || 0);
        const remQty = Number(layer.remainingQty || 0);
        const diff = initQty - remQty;
        if (diff > 0.0001) {
          itemConsumed += diff;
        }
      }

      if (itemConsumed > 0.0001) {
        const prev = consumedByProduct.get(oldItem.productId);
        consumedByProduct.set(oldItem.productId, {
          consumed: (prev ? prev.consumed : 0) + itemConsumed,
          productName: oldItem.product?.name || "Product",
        });
      }
    }

    // Validation 1: If items were consumed, branch cannot be changed
    if (existingPurchase.branchId !== branchId && consumedByProduct.size > 0) {
      return NextResponse.json(
        {
          error: "Cannot change destination branch because units from this purchase batch have already been sold in the original branch.",
        },
        { status: 400 }
      );
    }

    // Validation 2: Ensure any partially consumed products are not deleted and quantity >= consumed
    for (const [prodId, info] of consumedByProduct.entries()) {
      const matchingNewItem = items.find((it: any) => it.productId === prodId);
      if (!matchingNewItem) {
        return NextResponse.json(
          {
            error: `Cannot remove "${info.productName}" from bill because ${info.consumed} unit(s) have already been sold.`,
          },
          { status: 400 }
        );
      }

      if (Number(matchingNewItem.quantity) < info.consumed) {
        return NextResponse.json(
          {
            error: `Cannot reduce quantity of "${info.productName}" below ${info.consumed} because ${info.consumed} unit(s) have already been sold from this purchase.`,
          },
          { status: 400 }
        );
      }
    }

    let totalAmountNum = 0;
    const purchaseItemsData = items.map((item: any) => {
      const lineTotal = Number(item.quantity) * Number(item.purchaseRate);
      totalAmountNum += lineTotal;
      return {
        productId: item.productId,
        quantity: item.quantity,
        purchaseRate: item.purchaseRate,
        total: lineTotal,
      };
    });

    const amountPaidNum = Math.max(0, Number(amountPaid || 0));
    const outstandingAmountNum = Math.max(0, totalAmountNum - amountPaidNum);

    let paymentStatus: "PAID" | "PARTIAL" | "PENDING" = "PENDING";
    if (amountPaidNum >= totalAmountNum) {
      paymentStatus = "PAID";
    } else if (amountPaidNum > 0) {
      paymentStatus = "PARTIAL";
    }

    const updated = await prisma.$transaction(
      async (tx) => {
        // 1. Revert previous inventory stock from old branch
        for (const oldItem of existingPurchase.items) {
          const oldQty = new Prisma.Decimal(oldItem.quantity);
          await tx.inventory.upsert({
            where: {
              productId_branchId: {
                productId: oldItem.productId,
                branchId: existingPurchase.branchId,
              },
            },
            update: {
              quantity: { decrement: oldQty },
            },
            create: {
              productId: oldItem.productId,
              branchId: existingPurchase.branchId,
              quantity: new Prisma.Decimal(0).sub(oldQty),
            },
          });
        }

        // 2. Delete old InventoryLayers for this purchase's items
        const oldItemIds = existingPurchase.items.map((i) => i.id);
        await tx.inventoryLayer.deleteMany({
          where: {
            purchaseItemId: { in: oldItemIds },
          },
        });

        // 3. Delete old PurchaseItems
        await tx.purchaseItem.deleteMany({
          where: { purchaseId: id },
        });

        // 4. Update the Purchase record and recreate items
        const newPurchase = await tx.purchase.update({
          where: { id },
          data: {
            supplierId,
            branchId,
            invoiceNumber,
            purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
            totalAmount: totalAmountNum,
            amountPaid: amountPaidNum,
            outstandingAmount: outstandingAmountNum,
            paymentStatus,
            notes,
            items: {
              create: purchaseItemsData,
            },
          },
          include: {
            items: true,
          },
        });

        // 5. Create new InventoryLayers, increment new branch inventory, log movements
        for (const item of newPurchase.items) {
          const qty = new Prisma.Decimal(item.quantity);
          const cost = new Prisma.Decimal(item.purchaseRate);

          const consumedInfo = consumedByProduct.get(item.productId);
          const consumedUnits = consumedInfo ? consumedInfo.consumed : 0;
          const remainingQty = Prisma.Decimal.max(0, qty.sub(new Prisma.Decimal(consumedUnits)));

          // Create FIFO inventory layer with exact remainingQty
          await tx.inventoryLayer.create({
            data: {
              branchId,
              productId: item.productId,
              purchaseItemId: item.id,
              quantity: qty,
              remainingQty,
              costPerUnit: cost,
            },
          });

          // Increment Branch Inventory Stock
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

          // Record stock movement (IN)
          await tx.stockMovement.create({
            data: {
              branchId,
              productId: item.productId,
              movementType: "IN",
              quantity: qty,
              referenceType: "purchase_edit",
              referenceId: item.id,
              notes: `Purchase updated at ${Number(cost)}/unit (Bill #${invoiceNumber || id})`,
            },
          });
        }

        // 6. Automatically update retail sale prices on the Product catalog if specified
        for (const item of items) {
          const newSellingPrice = Number(item.newSellingPrice || item.sellingPrice || 0);
          if (item.productId && newSellingPrice > 0) {
            await tx.product.update({
              where: { id: item.productId },
              data: { sellingPrice: newSellingPrice },
            });
          }
        }

        // 7. Manage linked supplier payment
        const existingPayment = await tx.supplierPayment.findFirst({
          where: { purchaseId: id, isDeleted: false },
        });

        if (amountPaidNum > 0) {
          if (existingPayment) {
            await tx.supplierPayment.update({
              where: { id: existingPayment.id },
              data: {
                supplierId,
                amount: amountPaidNum,
                paymentMethod: (paymentMethod as any) || existingPayment.paymentMethod,
                bankReference: bankReference ?? existingPayment.bankReference,
              },
            });
          } else {
            await tx.supplierPayment.create({
              data: {
                supplierId,
                purchaseId: id,
                amount: amountPaidNum,
                paymentMethod: (paymentMethod as any) || "CASH",
                bankReference,
                notes: `Payment for purchase bill #${invoiceNumber || id}`,
              },
            });
          }
        } else if (existingPayment) {
          await tx.supplierPayment.update({
            where: { id: existingPayment.id },
            data: {
              isDeleted: true,
              deletedAt: new Date(),
            },
          });
        }

        // 8. Reconcile supplier(s)
        await reconcileSupplier(tx as any, supplierId);
        if (existingPurchase.supplierId !== supplierId) {
          await reconcileSupplier(tx as any, existingPurchase.supplierId);
        }

        return newPurchase;
      },
      {
        maxWait: 15000,
        timeout: 60000,
      }
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating purchase:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update purchase" },
      { status: 500 }
    );
  }
}
