import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Fetch all active purchases for the supplier
    const purchases = await prisma.purchase.findMany({
      where: {
        supplierId: id,
        isDeleted: false,
      },
      select: {
        id: true,
        invoiceNumber: true,
        purchaseDate: true,
        totalAmount: true,
        notes: true,
      },
    });

    // Fetch all active payments for the supplier
    const payments = await prisma.supplierPayment.findMany({
      where: {
        supplierId: id,
        isDeleted: false,
      },
      select: {
        id: true,
        paymentDate: true,
        amount: true,
        paymentMethod: true,
        bankReference: true,
        notes: true,
      },
    });

    const ledger = [];

    // Map purchases to ledger entries (Credit: increasing what we owe)
    for (const p of purchases) {
      ledger.push({
        id: p.id,
        date: p.purchaseDate,
        type: "PURCHASE",
        reference: p.invoiceNumber,
        description: p.notes || "Purchase",
        debit: 0,
        credit: Number(p.totalAmount),
      });
    }

    // Map payments to ledger entries (Debit: decreasing what we owe)
    for (const p of payments) {
      ledger.push({
        id: p.id,
        date: p.paymentDate,
        type: "PAYMENT",
        reference: p.bankReference || p.paymentMethod,
        description: p.notes || `Payment (${p.paymentMethod})`,
        debit: Number(p.amount),
        credit: 0,
      });
    }

    // Sort chronologically
    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let runningBalance = 0;
    const ledgerWithBalance = ledger.map(entry => {
      // Balance = Credit (we owe more) - Debit (we paid)
      runningBalance = runningBalance + entry.credit - entry.debit;
      return {
        ...entry,
        balance: runningBalance,
      };
    });

    return NextResponse.json(ledgerWithBalance);
  } catch (error) {
    console.error("Error fetching supplier ledger:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
