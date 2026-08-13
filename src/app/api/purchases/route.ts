import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createInventoryLayers } from "@/lib/fifo";

export async function GET() {
  try {
    const purchases = await prisma.purchase.findMany({
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
    });

    return NextResponse.json(purchases);
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
