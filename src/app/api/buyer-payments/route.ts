import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const payments = await prisma.buyerPayment.findMany({
      where: { isDeleted: false },
      include: {
        buyer: true,
        sale: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching buyer payments:", error);
    return NextResponse.json({ error: "Failed to fetch buyer payments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { buyerId, saleId, amount, paymentMethod, bankReference, notes } = body;

    const amountNum = Number(amount);

    if (!buyerId || !amountNum || amountNum <= 0 || !paymentMethod) {
      return NextResponse.json(
        { error: "Buyer, valid positive amount, and payment method are required" },
        { status: 400 }
      );
    }

    // Enforce Over-Payment Restriction: Calculate exact total outstanding credit balance for this buyer
    const buyerSales = await prisma.sale.findMany({
      where: { buyerId, isDeleted: false },
      select: { grandTotal: true, amountPaid: true, outstandingAmount: true },
    });

    const totalOutstanding = buyerSales.reduce((sum, sale) => {
      const out = Number(sale.outstandingAmount);
      if (!isNaN(out) && out >= 0) return sum + out;
      const grandTotal = Number(sale.grandTotal || 0);
      const amountPaid = Number(sale.amountPaid || 0);
      return sum + Math.max(0, grandTotal - amountPaid);
    }, 0);

    if (totalOutstanding <= 0) {
      return NextResponse.json(
        { error: "This customer currently has Rs. 0 outstanding credit. No credit settlement is required." },
        { status: 400 }
      );
    }

    if (amountNum > totalOutstanding) {
      return NextResponse.json(
        {
          error: `Payment amount (Rs. ${amountNum.toLocaleString()}) cannot exceed customer's total outstanding credit (Rs. ${totalOutstanding.toLocaleString()}).`,
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst();
    const createdById = user?.id || null;

    const payment = await prisma.$transaction(
      async (tx) => {
        // 1. Create the payment record
        const newPayment = await tx.buyerPayment.create({
          data: {
            buyerId,
            saleId: saleId || null,
            amount: amountNum,
            paymentMethod: paymentMethod === "BANK_TRANSFER" ? "BANK_TRANSFER" : "CASH",
            bankReference: bankReference || null,
            notes: notes || null,
            createdById: createdById || undefined,
          },
        });

        // 2. If linked to a specific sale, update that sale directly
        if (saleId) {
          const sale = await tx.sale.findUnique({ where: { id: saleId } });
          if (sale) {
            const currentPaid = Number(sale.amountPaid || 0);
            const currentTotal = Number(sale.grandTotal || sale.subtotal || 0);
            const newAmountPaid = currentPaid + amountNum;
            const newOutstanding = Math.max(0, currentTotal - newAmountPaid);
            const newStatus = newOutstanding <= 0 ? "PAID" : "PARTIAL";

            await tx.sale.update({
              where: { id: saleId },
              data: {
                amountPaid: newAmountPaid,
                outstandingAmount: newOutstanding,
                paymentStatus: newStatus as any,
              },
            });
          }
        } else {
          // 3. FIFO Settlement: Auto-allocate payment across oldest pending invoices of this buyer!
          const pendingSales = await tx.sale.findMany({
            where: {
              buyerId,
              isDeleted: false,
              paymentStatus: { in: ["PENDING", "PARTIAL"] },
            },
            orderBy: { createdAt: "asc" }, // Oldest first
          });

          let unallocatedAmount = amountNum;

          for (const sale of pendingSales) {
            if (unallocatedAmount <= 0) break;

            const totalAmount = Number(sale.grandTotal || sale.subtotal || 0);
            const currentPaid = Number(sale.amountPaid || 0);
            const currentOutstanding = Math.max(0, totalAmount - currentPaid);

            if (currentOutstanding <= 0) {
              await tx.sale.update({
                where: { id: sale.id },
                data: { paymentStatus: "PAID", outstandingAmount: 0 },
              });
              continue;
            }

            const applyAmount = Math.min(unallocatedAmount, currentOutstanding);
            const updatedPaid = currentPaid + applyAmount;
            const updatedOutstanding = Math.max(0, totalAmount - updatedPaid);
            const updatedStatus = updatedOutstanding <= 0 ? "PAID" : "PARTIAL";

            await tx.sale.update({
              where: { id: sale.id },
              data: {
                amountPaid: updatedPaid,
                outstandingAmount: updatedOutstanding,
                paymentStatus: updatedStatus as any,
              },
            });

            unallocatedAmount -= applyAmount;
          }
        }

        // 4. Audit Log
        if (createdById) {
          await tx.auditLog.create({
            data: {
              userId: createdById,
              action: "CREATE",
              entity: "buyer_payment",
              entityId: newPayment.id,
              newValues: JSON.parse(JSON.stringify(newPayment)),
            },
          });
        }

        return newPayment;
      },
      {
        maxWait: 15000,
        timeout: 60000,
      }
    );

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    console.error("Error recording buyer payment:", error);
    return NextResponse.json({ error: error.message || "Failed to record buyer payment" }, { status: 500 });
  }
}
