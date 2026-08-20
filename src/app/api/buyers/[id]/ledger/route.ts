import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Fetch Sales (Debit/Receivable)
    const sales = await prisma.sale.findMany({
      where: { buyerId: id, isDeleted: false },
      select: {
        id: true,
        invoiceNumber: true,
        saleDate: true,
        grandTotal: true,
        notes: true,
      },
      orderBy: { saleDate: "asc" },
    });

    // 2. Fetch Buyer Payments (Credit/Received)
    const payments = await prisma.buyerPayment.findMany({
      where: { buyerId: id, isDeleted: false },
      select: {
        id: true,
        paymentDate: true,
        amount: true,
        paymentMethod: true,
        bankReference: true,
        notes: true,
      },
      orderBy: { paymentDate: "asc" },
    });

    // 3. Fetch Sales Returns - ONLY returns that adjust customer credit (ADJUSTMENT)
    const returns = await prisma.salesReturn.findMany({
      where: { 
        buyerId: id, 
        isDeleted: false,
        refundMethod: "ADJUSTMENT",
      },
      select: {
        id: true,
        returnDate: true,
        totalRefund: true,
        refundMethod: true,
        referenceNumber: true,
        notes: true,
      },
      orderBy: { returnDate: "asc" },
    });

    const ledger: any[] = [];

    // Format Sales (Debit)
    sales.forEach((sale: any) => {
      ledger.push({
        id: sale.id,
        date: sale.saleDate,
        type: 'SALE',
        reference: sale.invoiceNumber,
        description: `Sale ${sale.notes ? '- ' + sale.notes : ''}`,
        debit: Number(sale.grandTotal), // Receivable increases
        credit: 0,
      });
    });

    // Format Payments (Credit)
    payments.forEach((payment: any) => {
      ledger.push({
        id: payment.id,
        date: payment.paymentDate,
        type: 'PAYMENT',
        reference: payment.bankReference || payment.paymentMethod,
        description: `Payment Received ${payment.notes ? '- ' + payment.notes : ''}`,
        debit: 0,
        credit: Number(payment.amount), // Receivable decreases
      });
    });

    // Format Returns (Credit) - only ADJUSTMENT returns that reduce customer debt
    returns.forEach((ret: any) => {
      ledger.push({
        id: ret.id,
        date: ret.returnDate,
        type: 'RETURN',
        reference: ret.referenceNumber || ret.refundMethod,
        description: `Sales Return (Adjusted in Credit) ${ret.notes ? '- ' + ret.notes : ''}`,
        debit: 0,
        credit: Number(ret.totalRefund), // Receivable decreases
      });
    });

    // Sort chronologically
    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let runningBalance = 0;
    const ledgerWithBalance = ledger.map(entry => {
      runningBalance += entry.debit - entry.credit;
      return {
        ...entry,
        calculatedBalance: runningBalance,
        balance: runningBalance,
      };
    });

    return NextResponse.json(ledgerWithBalance);
  } catch (error) {
    console.error("Error fetching buyer ledger:", error);
    return NextResponse.json({ error: "Failed to fetch buyer ledger" }, { status: 500 });
  }
}
