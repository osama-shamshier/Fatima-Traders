import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const [
      salesCashAgg,
      buyerSettlementsAgg,
      purchasesCashAgg,
      supplierSettlementsAgg,
      expensesAgg,
      salesReturnsAgg,
    ] = await Promise.all([
      // 1. Initial cash/bank paid at POS checkout
      prisma.sale.aggregate({
        where: { isDeleted: false },
        _sum: { amountPaid: true },
      }),
      // 2. Unlinked Buyer Credit Settlements (to prevent double-counting checkout payments)
      prisma.buyerPayment.aggregate({
        where: { isDeleted: false, saleId: null },
        _sum: { amount: true },
      }),
      // 3. Initial cash/bank paid at Purchase time
      prisma.purchase.aggregate({
        where: { isDeleted: false },
        _sum: { amountPaid: true },
      }),
      // 4. Unlinked Supplier Payments (to prevent double-counting purchase checkout payments)
      prisma.supplierPayment.aggregate({
        where: { isDeleted: false, purchaseId: null },
        _sum: { amount: true },
      }),
      // 5. Operating expenses
      prisma.expense.aggregate({
        where: { isDeleted: false },
        _sum: { amount: true },
      }),
      // 6. Sales returns refunds
      prisma.salesReturn.aggregate({
        where: { isDeleted: false },
        _sum: { totalRefund: true },
      }),
    ]);

    // Summing Cash Inflows (POS checkout payments + Subsequent credit collections)
    const salesCash = Number(salesCashAgg._sum.amountPaid || 0);
    const buyerPaymentsTotal = Number(buyerSettlementsAgg._sum.amount || 0);
    const totalCashIn = salesCash + buyerPaymentsTotal;

    // Summing Cash Outflows (Purchase payments + Subsequent supplier payables + Expenses + Refunds)
    const purchasesCash = Number(purchasesCashAgg._sum.amountPaid || 0);
    const supplierPaymentsTotal = Number(supplierSettlementsAgg._sum.amount || 0);
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
        refundsTotal,
      },
    });
  } catch (error) {
    console.error("Cash flow error:", error);
    return NextResponse.json({ error: "Failed to calculate cash flow" }, { status: 500 });
  }
}
