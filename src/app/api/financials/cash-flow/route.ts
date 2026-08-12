import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // We filter for Cash-related if needed, but since it's "Cash Flow", we might include BANK_TRANSFER as well (it's liquid).
    // The prompt says: "Sales Cash + Buyer Payments" vs "Purchases Cash + Supplier Payments + Operating Expenses + Cash Refunds"
    // For simplicity, we just sum them up.

    const sales = await prisma.sale.findMany({ where: { isDeleted: false, paymentStatus: "PAID" } });
    const buyerPayments = await prisma.buyerPayment.findMany({ where: { isDeleted: false } });
    
    // Purchases paid in cash (or bank)
    const purchases = await prisma.purchase.findMany({ where: { isDeleted: false, paymentStatus: "PAID" } });
    const supplierPayments = await prisma.supplierPayment.findMany({ where: { isDeleted: false } });
    const expenses = await prisma.expense.findMany({ where: { isDeleted: false } });
    const salesReturns = await prisma.salesReturn.findMany({ where: { isDeleted: false } });

    // Assuming Sales "PAID" implies cash received at the time of sale.
    // To avoid double counting with buyerPayments, we ideally just look at amountPaid in Sales if they weren't through a separate buyer payment.
    // However, following the prompt's simple metric definitions:
    
    // Summing Cash In
    const salesCash = sales.reduce((sum, s) => sum + Number(s.amountPaid), 0);
    const buyerPaymentsTotal = buyerPayments.reduce((sum, bp) => sum + Number(bp.amount), 0);
    const totalCashIn = salesCash + buyerPaymentsTotal;

    // Summing Cash Out
    const purchasesCash = purchases.reduce((sum, p) => sum + Number(p.amountPaid), 0);
    const supplierPaymentsTotal = supplierPayments.reduce((sum, sp) => sum + Number(sp.amount), 0);
    const operatingExpensesTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const refundsTotal = salesReturns.reduce((sum, sr) => sum + Number(sr.totalRefund), 0);
    const totalCashOut = purchasesCash + supplierPaymentsTotal + operatingExpensesTotal + refundsTotal;

    const netCashFlow = totalCashIn - totalCashOut;

    return NextResponse.json({
      totalCashIn,
      totalCashOut,
      netCashFlow,
      breakdown: {
        salesCash,
        buyerPaymentsTotal,
        purchasesCash,
        supplierPaymentsTotal,
        operatingExpensesTotal,
        refundsTotal
      }
    });
  } catch (error) {
    console.error("Cash flow error:", error);
    return NextResponse.json({ error: "Failed to calculate cash flow" }, { status: 500 });
  }
}
