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

      if (purchaseId) {
        const purchase = await tx.purchase.findUnique({
          where: { id: purchaseId },
        });

        if (purchase) {
          const newAmountPaid = Number(purchase.amountPaid) + amountNum;
          const totalAmount = Number(purchase.totalAmount);
          const newOutstanding = totalAmount - newAmountPaid;

          let paymentStatus: "PAID" | "PARTIAL" | "PENDING" = "PENDING";
          if (newAmountPaid >= totalAmount) {
            paymentStatus = "PAID";
          } else if (newAmountPaid > 0) {
            paymentStatus = "PARTIAL";
          }

          await tx.purchase.update({
            where: { id: purchaseId },
            data: {
              amountPaid: newAmountPaid,
              outstandingAmount: newOutstanding,
              paymentStatus,
            },
          });
        }
      }

      return newPayment;
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Error creating supplier payment:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
