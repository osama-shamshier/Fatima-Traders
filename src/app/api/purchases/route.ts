import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createInventoryLayers } from "@/lib/fifo";

export async function GET() {
  try {
    const [purchases, allSuppliers] = await Promise.all([
      prisma.purchase.findMany({
        where: { isDeleted: false },
        include: {
          supplier: {
            select: { name: true, id: true },
          },
          branch: {
            select: { name: true, id: true },
          },
          createdBy: {
            select: { name: true, id: true },
          },
          items: {
            include: {
              product: {
                select: { name: true, sellingPrice: true },
              },
            },
          },
        },
        orderBy: { purchaseDate: "desc" },
      }),
      prisma.supplier.findMany({
        where: { isDeleted: false },
        include: {
          purchases: {
            where: { isDeleted: false },
            orderBy: [{ purchaseDate: "asc" }, { createdAt: "asc" }],
            select: { id: true, totalAmount: true },
          },
          supplierPayments: {
            where: { isDeleted: false },
            select: { amount: true },
          },
        },
      }),
    ]);

    // Build map of reconciled purchases for all suppliers (FIFO allocation of payments)
    const reconciledPurchaseMap = new Map<
      string,
      { amountPaid: number; outstandingAmount: number; paymentStatus: string }
    >();

    const dbUpdatesToRun: Array<{ id: string; amountPaid: number; outstandingAmount: number; paymentStatus: string }> = [];

    for (const supplier of allSuppliers) {
      let totalCredit = (supplier.supplierPayments || []).reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0
      );

      for (const pur of supplier.purchases) {
        const totalAmount = Number(pur.totalAmount || 0);
        const allocatedPaid = Math.min(totalCredit, totalAmount);
        const outstanding = Math.max(0, totalAmount - allocatedPaid);
        const status = outstanding <= 0 ? "PAID" : allocatedPaid > 0 ? "PARTIAL" : "PENDING";

        reconciledPurchaseMap.set(pur.id, {
          amountPaid: allocatedPaid,
          outstandingAmount: outstanding,
          paymentStatus: status,
        });

        totalCredit -= allocatedPaid;
      }
    }

    const normalizedPurchases = purchases.map((purchase) => {
      const reconciled = reconciledPurchaseMap.get(purchase.id);
      if (reconciled) {
        if (
          Number(purchase.amountPaid) !== reconciled.amountPaid ||
          Number(purchase.outstandingAmount) !== reconciled.outstandingAmount ||
          purchase.paymentStatus !== reconciled.paymentStatus
        ) {
          dbUpdatesToRun.push({
            id: purchase.id,
            amountPaid: reconciled.amountPaid,
            outstandingAmount: reconciled.outstandingAmount,
            paymentStatus: reconciled.paymentStatus,
          });
        }

        return {
          ...purchase,
          amountPaid: reconciled.amountPaid,
          outstandingAmount: reconciled.outstandingAmount,
          paymentStatus: reconciled.paymentStatus,
        };
      }
      return purchase;
    });

    if (dbUpdatesToRun.length > 0) {
      Promise.all(
        dbUpdatesToRun.map((u) =>
          prisma.purchase.update({
            where: { id: u.id },
            data: {
              amountPaid: u.amountPaid,
              outstandingAmount: u.outstandingAmount,
              paymentStatus: u.paymentStatus as any,
            },
          })
        )
      ).catch((err) => console.error("Database purchase reconciliation update error:", err));
    }

    return NextResponse.json(normalizedPurchases);
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      supplierId,
      branchId,
      invoiceNumber,
      purchaseDate,
      items,
      amountPaid = 0,
      notes,
    } = body;

    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "No users found in system" }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Items are required" }, { status: 400 });
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

    const amountPaidNum = Number(amountPaid);
    const outstandingAmountNum = totalAmountNum - amountPaidNum;

    let paymentStatus: "PAID" | "PARTIAL" | "PENDING" = "PENDING";
    if (amountPaidNum >= totalAmountNum) {
      paymentStatus = "PAID";
    } else if (amountPaidNum > 0) {
      paymentStatus = "PARTIAL";
    }

    const purchase = await prisma.$transaction(
      async (tx) => {
        const newPurchase = await tx.purchase.create({
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
            createdById: user.id,
            items: {
              create: purchaseItemsData,
            },
          },
          include: {
            items: true,
          },
        });

        // Automatically update retail sale prices on the Product catalog if updated in purchase form
        for (const item of items) {
          const newSellingPrice = Number(item.newSellingPrice || item.sellingPrice || 0);
          if (item.productId && newSellingPrice > 0) {
            await tx.product.update({
              where: { id: item.productId },
              data: { sellingPrice: newSellingPrice },
            });
          }
        }

        const inventoryItemsInput = newPurchase.items.map((item) => ({
          productId: item.productId,
          purchaseItemId: item.id,
          quantity: Number(item.quantity),
          costPerUnit: Number(item.purchaseRate),
        }));

        await createInventoryLayers(tx as any, branchId, inventoryItemsInput);

        if (amountPaidNum > 0) {
          await tx.supplierPayment.create({
            data: {
              supplierId,
              purchaseId: newPurchase.id,
              amount: amountPaidNum,
              paymentMethod: "CASH",
              notes: "Initial payment for purchase",
            },
          });
        }

        return newPurchase;
      },
      {
        maxWait: 15000,
        timeout: 60000,
      }
    );

    return NextResponse.json(purchase, { status: 201 });
  } catch (error: any) {
    console.error("Error creating purchase:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
