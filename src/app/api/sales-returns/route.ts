import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { restoreInventoryFIFO } from "@/lib/fifo";

function generateReturnReference(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RET-${year}${month}-${random}`;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const buyerId = searchParams.get("buyerId");
    const branchId = searchParams.get("branchId");

    const where: any = { isDeleted: false };
    if (buyerId) where.buyerId = buyerId;
    if (branchId) where.branchId = branchId;

    const returns = await prisma.salesReturn.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        buyer: { select: { id: true, name: true, contactNumber: true, companyName: true } },
        sale: { select: { id: true, invoiceNumber: true, grandTotal: true, saleDate: true } },
        createdBy: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: { select: { abbreviation: true } },
                category: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(returns);
  } catch (error: any) {
    console.error("Error fetching sales returns:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch sales returns" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let {
      branchId,
      buyerId,
      saleId,
      refundMethod = "CASH",
      bankName,
      bankReference,
      reason,
      notes,
      items,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required for return" }, { status: 400 });
    }

    if (!branchId) {
      const defaultBranch = await prisma.branch.findFirst({ where: { isDeleted: false, isActive: true } });
      if (defaultBranch) branchId = defaultBranch.id;
      else return NextResponse.json({ error: "Branch is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst();
    const createdById = user?.id || null;

    const referenceNumber = generateReturnReference();

    // Map refundMethod to schema enum
    let normalizedRefundMethod: "CASH" | "BANK_TRANSFER" | "ADJUSTMENT" = "CASH";
    if (refundMethod === "ADJUSTMENT" || refundMethod === "BUYER_CREDIT") {
      normalizedRefundMethod = "ADJUSTMENT";
    } else if (refundMethod === "BANK_TRANSFER") {
      normalizedRefundMethod = "BANK_TRANSFER";
    } else {
      normalizedRefundMethod = "CASH";
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Fetch product, saleItem, and purchase information for exact costing & inventory restoration
        const productIds = items.map((i: any) => i.productId);
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, sellingPrice: true },
        });
        const productMap = new Map(products.map((p) => [p.id, p]));

        const saleItemIds = items.map((i: any) => i.saleItemId).filter(Boolean);
        const saleItems = saleItemIds.length > 0
          ? await tx.saleItem.findMany({
              where: { id: { in: saleItemIds } },
              select: { id: true, fifoCost: true, quantity: true, sellingPrice: true },
            })
          : [];
        const saleItemMap = new Map(saleItems.map((si) => [si.id, si]));

        const latestPurchaseItems = await tx.purchaseItem.findMany({
          where: { productId: { in: productIds } },
          orderBy: { createdAt: "desc" },
          select: { productId: true, purchaseRate: true },
        });
        const purchaseRateMap = new Map(latestPurchaseItems.map((pi) => [pi.productId, Number(pi.purchaseRate)]));

        let totalRefundAmount = 0;
        const returnItemsForFIFO: any[] = [];
        const returnItemsData: any[] = [];

        for (const item of items) {
          const qty = Number(item.quantity);
          const rate = Number(item.unitRefundRate || item.refundRate || 0);
          const lineRefund = qty * rate;
          totalRefundAmount += lineRefund;

          const prod = productMap.get(item.productId);
          const saleItem = item.saleItemId ? saleItemMap.get(item.saleItemId) : null;

          let costPerUnit = 0;
          if (saleItem && Number(saleItem.fifoCost || 0) > 0 && Number(saleItem.quantity || 0) > 0) {
            costPerUnit = Number(saleItem.fifoCost) / Number(saleItem.quantity);
          } else if (purchaseRateMap.has(item.productId)) {
            costPerUnit = purchaseRateMap.get(item.productId)!;
          } else {
            costPerUnit = rate > 0 ? rate * 0.7 : Number(prod?.sellingPrice || 0) * 0.7;
          }

          returnItemsForFIFO.push({
            productId: item.productId,
            quantity: qty,
            costPerUnit: Math.max(0.01, costPerUnit),
          });

          returnItemsData.push({
            productId: item.productId,
            saleItemId: item.saleItemId || null,
            quantity: qty,
            unitRefundRate: rate,
            refundAmount: lineRefund,
            reason: item.reason || reason || null,
          });
        }

        // 2. RESTORE INVENTORY (Increases Stock + Adds FIFO Layer + Logs Stock Movement)
        await restoreInventoryFIFO(tx as any, branchId, returnItemsForFIFO);

        // 3. HANDLE REFUND / CREDIT ADJUSTMENT
        if (normalizedRefundMethod === "ADJUSTMENT" && buyerId) {
          if (saleId) {
            // Specific Sale Invoice adjustment
            const targetSale = await tx.sale.findUnique({ where: { id: saleId } });
            if (targetSale) {
              const currentOutstanding = Number(targetSale.outstandingAmount || 0);
              const currentPaid = Number(targetSale.amountPaid || 0);
              const totalAmount = Number(targetSale.grandTotal || 0);

              const newOutstanding = Math.max(0, currentOutstanding - totalRefundAmount);
              const newAmountPaid = Math.min(totalAmount, currentPaid + totalRefundAmount);
              const newStatus = newOutstanding <= 0 ? "PAID" : "PARTIAL";

              await tx.sale.update({
                where: { id: saleId },
                data: {
                  outstandingAmount: newOutstanding,
                  amountPaid: newAmountPaid,
                  paymentStatus: newStatus as any,
                },
              });
            }
          } else {
            // General Customer Credit Adjustment: Apply FIFO across pending sales
            const pendingSales = await tx.sale.findMany({
              where: {
                buyerId,
                isDeleted: false,
                paymentStatus: { in: ["PENDING", "PARTIAL"] },
              },
              orderBy: { createdAt: "asc" },
            });

            let unallocatedRefund = totalRefundAmount;

            for (const sale of pendingSales) {
              if (unallocatedRefund <= 0) break;

              const outstanding = Number(sale.outstandingAmount || 0);
              if (outstanding <= 0) continue;

              const apply = Math.min(unallocatedRefund, outstanding);
              const updatedOutstanding = Math.max(0, outstanding - apply);
              const updatedPaid = Number(sale.amountPaid || 0) + apply;
              const updatedStatus = updatedOutstanding <= 0 ? "PAID" : "PARTIAL";

              await tx.sale.update({
                where: { id: sale.id },
                data: {
                  outstandingAmount: updatedOutstanding,
                  amountPaid: updatedPaid,
                  paymentStatus: updatedStatus as any,
                },
              });

              unallocatedRefund -= apply;
            }
          }
        }

        // 4. Create Sales Return Header & Items
        const salesReturn = await tx.salesReturn.create({
          data: {
            referenceNumber,
            saleId: saleId || null,
            buyerId: buyerId || null,
            branchId,
            totalRefund: totalRefundAmount,
            refundMethod: normalizedRefundMethod,
            bankName: bankName || null,
            bankReference: bankReference || null,
            reason: reason || null,
            notes: notes || null,
            createdById,
            items: {
              create: returnItemsData,
            },
          },
          include: {
            branch: true,
            buyer: true,
            sale: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        // 5. Create Audit Log
        if (createdById) {
          await tx.auditLog.create({
            data: {
              userId: createdById,
              action: "CREATE",
              entity: "sales_return",
              entityId: salesReturn.id,
              branchId,
              newValues: JSON.parse(JSON.stringify(salesReturn)),
            },
          });
        }

        return salesReturn;
      },
      {
        maxWait: 15000,
        timeout: 60000,
      }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Error processing sales return:", error);
    return NextResponse.json({ error: error.message || "Failed to process sales return" }, { status: 500 });
  }
}
