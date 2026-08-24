import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPakistanDayBounds } from "@/lib/dateUtils";

export async function GET() {
  try {
    const { start: todayStart, end: todayEnd } = getPakistanDayBounds();

    const [
      totalProducts,
      activeBranches,
      salesToday,
      buyerPaymentsToday,
      totalRevenueAgg,
      productsData,
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
          buyerId: true,
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
          buyerId: true,
          saleId: true,
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
      prisma.product.findMany({
        where: { isDeleted: false, isActive: true },
        select: {
          id: true,
          name: true,
          sku: true,
          sellingPrice: true,
          minStockLevel: true,
          category: { select: { name: true } },
          unit: { select: { abbreviation: true, name: true } },
          inventory: {
            select: {
              branchId: true,
              quantity: true,
              branch: { select: { name: true } },
            },
          },
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
        where: { isDeleted: false, buyerId: { not: null }, refundMethod: "ADJUSTMENT" },
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

    // Calculate Low and Out of Stock items
    const lowStockList = productsData
      .map((p) => {
        const totalStock = p.inventory.reduce((sum, inv) => sum + Number(inv.quantity), 0);
        const minStock = Number(p.minStockLevel || 0);
        const isOutOfStock = totalStock <= 0;
        const isLowStock = totalStock <= minStock;

        if (isOutOfStock || isLowStock) {
          return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            categoryName: p.category?.name || "General",
            unitAbbr: p.unit?.abbreviation || "",
            currentStock: totalStock,
            minStockLevel: minStock,
            sellingPrice: Number(p.sellingPrice || 0),
            status: isOutOfStock ? "OUT_OF_STOCK" : "LOW_STOCK",
            branches: p.inventory.map((inv) => ({
              branchName: inv.branch?.name || "Branch",
              quantity: Number(inv.quantity),
            })),
          };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => a.currentStock - b.currentStock);

    const lowStockProducts = lowStockList.length;
    const outOfStockCount = lowStockList.filter((i) => i.status === "OUT_OF_STOCK").length;

    // Today's Sales breakdown
    const salesTodayCount = salesToday.length;
    const salesTodayRevenue = salesToday.reduce((sum, s) => sum + Number(s.grandTotal || 0), 0);

    const todayCashSales = salesToday
      .filter((s) => s.paymentMethod === "CASH" || !s.paymentMethod)
      .reduce((sum, s) => sum + Number(s.amountPaid || 0), 0);

    const todayPendingCredit = salesToday.reduce((sum, s) => sum + Number(s.outstandingAmount || 0), 0);

    // 1. Bank transactions from POS sales completed today
    const bankSalesDetails = salesToday
      .filter((s) => s.paymentMethod === "BANK_TRANSFER" && Number(s.amountPaid || 0) > 0)
      .map((s) => {
        let bankName = "";
        let referenceNumber = "";

        if (s.notes) {
          const bankMatch = s.notes.match(/Bank\/Wallet:\s*([^|]+)/i);
          if (bankMatch) bankName = bankMatch[1].trim();

          const refMatch = s.notes.match(/Ref:\s*([^|]+)/i);
          if (refMatch) referenceNumber = refMatch[1].trim();
        }

        return {
          id: s.id,
          type: "POS_SALE" as const,
          invoiceNumber: s.invoiceNumber,
          customerName: s.buyer?.name || "Walk-in Customer",
          branchName: s.branch?.name || "Main Branch",
          amount: Number(s.amountPaid),
          bankName: bankName || "Bank Transfer",
          referenceNumber: referenceNumber || "-",
          createdAt: s.createdAt,
        };
      });

    // Set of sale IDs already counted in POS bank sales to prevent duplicate display of auto-generated buyer payment
    const todayPosSaleIds = new Set(salesToday.map((s) => s.id));

    // 2. Bank transactions from Customer Debt Payments completed today
    const bankPaymentDetails = buyerPaymentsToday
      .filter(
        (p) =>
          p.paymentMethod === "BANK_TRANSFER" &&
          Number(p.amount || 0) > 0 &&
          (!p.saleId || !todayPosSaleIds.has(p.saleId))
      )
      .map((p) => {
        let bankName = "";
        let referenceNumber = p.bankReference || "";

        if (p.notes) {
          const bankMatch = p.notes.match(/Bank\/Wallet:\s*([^|]+)/i);
          if (bankMatch) bankName = bankMatch[1].trim();

          const refMatch = p.notes.match(/Ref:\s*([^|]+)/i);
          if (refMatch && !referenceNumber) referenceNumber = refMatch[1].trim();
        }

        return {
          id: p.id,
          type: "DEBT_COLLECTION" as const,
          invoiceNumber: p.sale?.invoiceNumber || "Customer Payment",
          customerName: p.buyer?.name || "Customer",
          branchName: "Main Branch",
          amount: Number(p.amount),
          bankName: bankName || "Bank Transfer",
          referenceNumber: referenceNumber || p.notes || "-",
          createdAt: p.createdAt,
        };
      });

    const bankDetailsList = [...bankSalesDetails, ...bankPaymentDetails].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Total digital / bank payments received today across POS and Debt collections
    const todayBankSales = bankDetailsList.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const totalRevenue = Number(totalRevenueAgg._sum.grandTotal || 0);

    // Exact Customer Outstanding Debtors Calculation
    const buyerSalesMap = new Map(
      buyerSalesTotals.filter((row) => row.buyerId !== null).map((row) => [row.buyerId!, Number(row._sum.grandTotal || 0)])
    );
    const buyerPaymentsMap = new Map(
      buyerPaymentTotals.filter((row) => row.buyerId !== null).map((row) => [row.buyerId!, Number(row._sum.amount || 0)])
    );
    const buyerReturnsMap = new Map(
      buyerReturnTotals.filter((row) => row.buyerId !== null).map((row) => [row.buyerId!, Number(row._sum.totalRefund || 0)])
    );

    const allBuyerIds = Array.from(
      new Set([
        ...Array.from(buyerSalesMap.keys()),
        ...Array.from(buyerPaymentsMap.keys()),
        ...Array.from(buyerReturnsMap.keys()),
      ])
    );

    const buyersInfo = await prisma.buyer.findMany({
      where: { id: { in: allBuyerIds }, isDeleted: false },
      select: { id: true, name: true, companyName: true, contactNumber: true },
    });

    const outstandingDebtors = buyersInfo
      .map((buyer) => {
        const totalSales = buyerSalesMap.get(buyer.id) || 0;
        const totalPayments = buyerPaymentsMap.get(buyer.id) || 0;
        const totalReturns = buyerReturnsMap.get(buyer.id) || 0;
        const outstanding = totalSales - totalPayments - totalReturns;
        return {
          id: buyer.id,
          name: buyer.name,
          companyName: buyer.companyName,
          contactNumber: buyer.contactNumber,
          totalOutstanding: outstanding,
        };
      })
      .filter((buyer): buyer is NonNullable<typeof buyer> => Boolean(buyer))
      .filter((b) => b.totalOutstanding !== 0)
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
      outOfStockCount,
      lowStockList,
      recentSales,
      outstandingDebtors,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
