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
      buyerSalesTotals,
      buyerPaymentTotals,
      buyerReturnTotals,
      supplierPurchaseTotals,
      supplierPaymentTotals,
    ] = await Promise.all([
      prisma.product.count({ where: { isDeleted: false, isActive: true } }),
      prisma.branch.count({ where: { isDeleted: false, isActive: true } }),
      prisma.sale.findMany({
        where: {
          isDeleted: false,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        select: {
          id: true,
          invoiceNumber: true,
          amountPaid: true,
          outstandingAmount: true,
          grandTotal: true,
          paymentMethod: true,
          notes: true,
          createdAt: true,
          buyer: { select: { name: true } },
          branch: { select: { name: true } },
        },
      }),
      prisma.buyerPayment.findMany({
        where: {
          isDeleted: false,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          bankReference: true,
          notes: true,
          createdAt: true,
          buyer: { select: { name: true } },
          sale: { select: { invoiceNumber: true } },
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
        select: {
          id: true,
          invoiceNumber: true,
          grandTotal: true,
          createdAt: true,
          buyer: { select: { name: true } },
          branch: { select: { name: true } },
        },
      }),
      prisma.sale.groupBy({
        by: ["buyerId"],
        where: { isDeleted: false, buyerId: { not: null } },
        _sum: { grandTotal: true },
      }),
      prisma.buyerPayment.groupBy({
        by: ["buyerId"],
        where: { isDeleted: false },
        _sum: { amount: true },
      }),
      prisma.salesReturn.groupBy({
        by: ["buyerId"],
        where: { isDeleted: false, buyerId: { not: null } },
        _sum: { totalRefund: true },
      }),
      prisma.purchase.groupBy({
        by: ["supplierId"],
        where: { isDeleted: false },
        _sum: { totalAmount: true },
      }),
      prisma.supplierPayment.groupBy({
        by: ["supplierId"],
        where: { isDeleted: false },
        _sum: { amount: true },
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

    const buyerIds = Array.from(
      new Set([
        ...buyerSalesTotals.map((row) => row.buyerId).filter(Boolean),
        ...buyerPaymentTotals.map((row) => row.buyerId),
        ...buyerReturnTotals.map((row) => row.buyerId).filter(Boolean),
      ])
    ) as string[];

    const buyersById = new Map(
      (
        await prisma.buyer.findMany({
          where: { id: { in: buyerIds }, isDeleted: false },
          select: { id: true, name: true, companyName: true, contactNumber: true },
        })
      ).map((buyer) => [buyer.id, buyer])
    );

    const buyerPaymentById = new Map(buyerPaymentTotals.map((row) => [row.buyerId, Number(row._sum.amount || 0)]));
    const buyerReturnById = new Map(
      buyerReturnTotals.map((row) => [row.buyerId, Number(row._sum.totalRefund || 0)])
    );

    const outstandingDebtors = buyerSalesTotals
      .map((row) => {
        if (!row.buyerId) return null;
        const buyer = buyersById.get(row.buyerId);
        if (!buyer) return null;

        const totalSales = Number(row._sum.grandTotal || 0);
        const totalPayments = buyerPaymentById.get(row.buyerId) || 0;
        const totalReturns = buyerReturnById.get(row.buyerId) || 0;
        const outstanding = Math.max(0, totalSales - totalPayments - totalReturns);

        return {
          id: buyer.id,
          name: buyer.name,
          companyName: buyer.companyName,
          contactNumber: buyer.contactNumber,
          totalOutstanding: outstanding,
        };
      })
      .filter((buyer): buyer is NonNullable<typeof buyer> => Boolean(buyer))
      .filter((b) => b.totalOutstanding > 0)
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    const totalBuyerReceivables = outstandingDebtors.reduce((sum, b) => sum + b.totalOutstanding, 0);

    // Exact Supplier Outstanding Payables
    const supplierPaymentById = new Map(
      supplierPaymentTotals.map((row) => [row.supplierId, Number(row._sum.amount || 0)])
    );
    const totalSupplierPayables = supplierPurchaseTotals.reduce((sum, row) => {
      const purchased = Number(row._sum.totalAmount || 0);
      const paid = supplierPaymentById.get(row.supplierId) || 0;
      return sum + Math.max(0, purchased - paid);
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
