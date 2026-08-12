import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      totalProducts,
      activeBranches,
      salesToday,
      buyerPaymentsToday,
      totalRevenueAgg,
      lowStockProducts,
      recentSales,
      buyersWithSales,
      suppliersWithPurchases,
    ] = await Promise.all([
      prisma.product.count({ where: { isDeleted: false, isActive: true } }),
      prisma.branch.count({ where: { isDeleted: false, isActive: true } }),
      prisma.sale.findMany({
        where: {
          isDeleted: false,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        include: {
          buyer: true,
          branch: true,
        },
      }),
      prisma.buyerPayment.findMany({
        where: {
          isDeleted: false,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        include: {
          buyer: true,
          sale: true,
        },
      }),
      prisma.sale.aggregate({
        where: { isDeleted: false },
        _sum: { grandTotal: true, amountPaid: true },
      }),
      prisma.inventory.count({
        where: {
          quantity: { lte: 10 },
        },
      }),
      prisma.sale.findMany({
        where: { isDeleted: false },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          buyer: true,
          branch: true,
        },
      }),
      prisma.buyer.findMany({
        where: { isDeleted: false },
        include: {
          sales: { where: { isDeleted: false } },
          buyerPayments: { where: { isDeleted: false } },
          salesReturns: { where: { isDeleted: false } },
        },
      }),
      prisma.supplier.findMany({
        where: { isDeleted: false },
        include: {
          purchases: { where: { isDeleted: false } },
          supplierPayments: { where: { isDeleted: false } },
        },
      }),
    ]);

    const salesTodayCount = salesToday.length;
    const salesTodayRevenue = salesToday.reduce((sum, s) => sum + Number(s.grandTotal || 0), 0);
    const totalRevenue = Number(totalRevenueAgg._sum.grandTotal || totalRevenueAgg._sum.amountPaid || 0);

    // Today's Sales Payment Breakdown
    let todayCashSales = 0;
    let todayBankSales = 0;
    let todayPendingCredit = 0;
    const bankDetailsList: any[] = [];

    salesToday.forEach((sale) => {
      const paid = Number(sale.amountPaid || 0);
      const outstanding = Number(sale.outstandingAmount || 0);

      todayPendingCredit += outstanding;

      if (sale.paymentMethod === "BANK_TRANSFER") {
        todayBankSales += paid;
        if (paid > 0) {
          bankDetailsList.push({
            id: sale.id,
            invoiceNumber: sale.invoiceNumber,
            customerName: sale.buyer?.name || "Walk-in Customer",
            amount: paid,
            paymentMethod: "Bank Transfer",
            reference: sale.notes || "Bank Transfer Sale",
            createdAt: sale.createdAt,
          });
        }
      } else {
        todayCashSales += paid;
      }
    });

    // Also include today's buyer collections that went through bank transfer
    buyerPaymentsToday.forEach((bp) => {
      const paid = Number(bp.amount || 0);
      if (bp.paymentMethod === "BANK_TRANSFER") {
        todayBankSales += paid;
        bankDetailsList.push({
          id: bp.id,
          invoiceNumber: bp.sale?.invoiceNumber || "Collection Settlement",
          customerName: bp.buyer?.name || "Customer",
          amount: paid,
          paymentMethod: "Bank Transfer Collection",
          reference: bp.bankReference || bp.notes || "Bank Payment",
          createdAt: bp.createdAt,
        });
      } else {
        todayCashSales += paid;
      }
    });

    // Exact Customer Outstanding Receivables
    const outstandingDebtors = buyersWithSales
      .map((buyer) => {
        const totalSales = buyer.sales.reduce((sum, s) => sum + Number(s.grandTotal || s.subtotal || 0), 0);
        const totalPayments = buyer.buyerPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const totalReturns = buyer.salesReturns ? buyer.salesReturns.reduce((sum, r) => sum + Number(r.totalRefund || 0), 0) : 0;
        const outstanding = Math.max(0, totalSales - totalPayments - totalReturns);

        return {
          id: buyer.id,
          name: buyer.name,
          companyName: buyer.companyName,
          contactNumber: buyer.contactNumber,
          totalOutstanding: outstanding,
        };
      })
      .filter((b) => b.totalOutstanding > 0)
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    const totalBuyerReceivables = outstandingDebtors.reduce((sum, b) => sum + b.totalOutstanding, 0);

    // Exact Supplier Outstanding Payables
    const totalSupplierPayables = suppliersWithPurchases.reduce((sum, s) => {
      const pur = s.purchases.reduce((pSum, p) => pSum + Number(p.totalAmount || 0), 0);
      const pay = s.supplierPayments.reduce((paySum, p) => paySum + Number(p.amount || 0), 0);
      return sum + Math.max(0, pur - pay);
    }, 0);

    return NextResponse.json({
      totalProducts,
      activeBranches,
      salesTodayCount,
      salesTodayRevenue,
      todayCashSales,
      todayBankSales,
      todayPendingCredit,
      bankDetailsList,
      totalRevenue,
      totalSupplierPayables,
      totalBuyerReceivables,
      lowStockProducts,
      recentSales,
      outstandingDebtors,
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
