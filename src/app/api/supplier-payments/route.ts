import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const payments = await prisma.supplierPayment.findMany({
      where: { isDeleted: false },
      include: {
        supplier: {
          select: { name: true },
        },
        purchase: {
          select: { invoiceNumber: true },
        },
      },
      orderBy: { paymentDate: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching supplier payments:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      supplierId,
      purchaseId,
      amount,
      paymentMethod,
      bankReference,
      notes,
    } = body;

    const amountNum = Number(amount);

    if (amountNum <= 0) {
      return new NextResponse("Amount must be greater than 0", { status: 400 });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.supplierPayment.create({
        data: {
          supplierId,
          purchaseId: purchaseId || null,
          amount: amountNum,
          paymentMethod,
          bankReference,
          notes,
        },
      });

      // Update and reconcile supplier purchases
      const supplierPurchases = await tx.purchase.findMany({
        where: { supplierId, isDeleted: false },
        orderBy: [{ purchaseDate: "asc" }, { createdAt: "asc" }],
      });

      const allPayments = await tx.supplierPayment.findMany({
        where: { supplierId, isDeleted: false },
      });

      let totalCredit = allPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      for (const pur of supplierPurchases) {
        const totalAmount = Number(pur.totalAmount || 0);
        const allocatedPaid = Math.min(totalCredit, totalAmount);
        const outstanding = Math.max(0, totalAmount - allocatedPaid);
        const status = outstanding <= 0 ? "PAID" : allocatedPaid > 0 ? "PARTIAL" : "PENDING";

        if (
          Number(pur.amountPaid) !== allocatedPaid ||
          Number(pur.outstandingAmount) !== outstanding ||
          pur.paymentStatus !== status
        ) {
          await tx.purchase.update({
            where: { id: pur.id },
            data: {
              amountPaid: allocatedPaid,
              outstandingAmount: outstanding,
              paymentStatus: status,
            },
          });
        }

        totalCredit -= allocatedPaid;
      }

      return newPayment;
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Error creating supplier payment:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
