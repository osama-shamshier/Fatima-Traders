import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Fetch Sales (Debit/Receivable) & initial counter payments
    const sales = await prisma.sale.findMany({
      where: { buyerId: id, isDeleted: false },
      select: {
        id: true,
        invoiceNumber: true,
        saleDate: true,
        grandTotal: true,
        amountPaid: true,
        paymentMethod: true,
        notes: true,
      },
      orderBy: { saleDate: "asc" },
    });

    // 2. Fetch Buyer Subsequent Payments (Credit/Received)
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

    // 3. Fetch Sales Returns - ONLY include returns that adjust customer credit (debt affected)
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

    // Format Sales & initial checkout payments
    sales.forEach((sale: any) => {
      // 1. Invoiced Sale (Debit)
      ledger.push({
        id: `sale-${sale.id}`,
        date: sale.saleDate,
        type: 'SALE',
        reference: sale.invoiceNumber,
        description: `Sale ${sale.notes ? '- ' + sale.notes : ''}`,
        debit: Number(sale.grandTotal),
        credit: 0,
      });

      // 2. If customer paid initial amount at checkout (amountPaid > 0)
      const paidAtCheckout = Number(sale.amountPaid || 0);
      if (paidAtCheckout > 0) {
        ledger.push({
          id: `sale-pay-${sale.id}`,
          date: sale.saleDate,
          type: 'PAYMENT',
          reference: sale.invoiceNumber,
          description: `Paid at Checkout (${sale.paymentMethod || 'CASH'}) - ${sale.invoiceNumber}`,
          debit: 0,
          credit: paidAtCheckout,
        });
      }
    });

    // Format Subsequent Ledger Payments (Credit)
    payments.forEach((payment: any) => {
      ledger.push({
        id: `pay-${payment.id}`,
        date: payment.paymentDate,
        type: 'PAYMENT',
        reference: payment.bankReference || payment.paymentMethod,
        description: `Payment Received ${payment.notes ? '- ' + payment.notes : ''}`,
        debit: 0,
        credit: Number(payment.amount),
      });
    });

    // Format Adjusted Returns (Credit)
    returns.forEach((ret: any) => {
      ledger.push({
        id: `ret-${ret.id}`,
        date: ret.returnDate,
        type: 'RETURN',
        reference: ret.referenceNumber || 'ADJUSTMENT',
        description: `Sales Return (Adjusted in Pending Credit) ${ret.notes ? '- ' + ret.notes : ''}`,
        debit: 0,
        credit: Number(ret.totalRefund),
      });
    });

    // Sort all entries chronologically
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
