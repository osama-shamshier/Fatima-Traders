import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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
              select: { name: true },
            },
          },
        },
      },
      orderBy: { purchaseDate: "desc" },
    });

    return NextResponse.json(purchases);
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
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

    // Hardcode createdById for now if not using auth context in this snippet
    // In production, get from session
    const createdById = "cm00000000000000000000000"; // Dummy ID, better if we fetch any user or just rely on a valid user in DB

    // Let's grab the first user just for demo purposes if we don't have session
    const user = await prisma.user.findFirst();
    if (!user) {
      return new NextResponse("No users found in system", { status: 400 });
    }

    if (!items || items.length === 0) {
      return new NextResponse("Items are required", { status: 400 });
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

    const purchase = await prisma.$transaction(async (tx) => {
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
          createdById: user.id, // Replace with actual session user ID
          items: {
            create: purchaseItemsData,
          },
        },
        include: {
          items: true,
        },
      });

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
            paymentMethod: "CASH", // Defaulting to CASH for initial payment, can be dynamic
            notes: "Initial payment for purchase",
          },
        });
      }

      return newPurchase;
    });

    return NextResponse.json(purchase);
  } catch (error) {
    console.error("Error creating purchase:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
