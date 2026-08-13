import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // We filter for Cash-related if needed, but since it's "Cash Flow", we might include BANK_TRANSFER as well (it's liquid).
    // The prompt says: "Sales Cash + Buyer Payments" vs "Purchases Cash + Supplier Payments + Operating Expenses + Cash Refunds"
    // For simplicity, we just sum them up.

    const [
      salesCashAgg,
      buyerPaymentsAgg,
      purchasesCashAgg,
      supplierPaymentsAgg,
      expensesAgg,
      salesReturnsAgg,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: { isDeleted: false, paymentStatus: "PAID" },
        _sum: { amountPaid: true },
      }),
      prisma.buyerPayment.aggregate({
        where: { isDeleted: false },
        _sum: { amount: true },
      }),
      prisma.purchase.aggregate({
        where: { isDeleted: false, paymentStatus: "PAID" },
        _sum: { amountPaid: true },
      }),
      prisma.supplierPayment.aggregate({
        where: { isDeleted: false },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { isDeleted: false },
        _sum: { amount: true },
      }),
      prisma.salesReturn.aggregate({
        where: { isDeleted: false },
        _sum: { totalRefund: true },
      }),
    ]);

    // Assuming Sales "PAID" implies cash received at the time of sale.
    // To avoid double counting with buyerPayments, we ideally just look at amountPaid in Sales if they weren't through a separate buyer payment.
    // However, following the prompt's simple metric definitions:
    
    // Summing Cash In
    const salesCash = Number(salesCashAgg._sum.amountPaid || 0);
    const buyerPaymentsTotal = Number(buyerPaymentsAgg._sum.amount || 0);
    const totalCashIn = salesCash + buyerPaymentsTotal;

    // Summing Cash Out
    const purchasesCash = Number(purchasesCashAgg._sum.amountPaid || 0);
    const supplierPaymentsTotal = Number(supplierPaymentsAgg._sum.amount || 0);
    const operatingExpensesTotal = Number(expensesAgg._sum.amount || 0);
    const refundsTotal = Number(salesReturnsAgg._sum.totalRefund || 0);
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
