import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPakistanPeriodBounds } from "@/lib/dateUtils";

function getDateRange(period: string | null, startDate: string | null, endDate: string | null) {
  if (!period && !startDate && !endDate) return null;
  const bounds = getPakistanPeriodBounds(period || "custom", startDate, endDate);
  if (!bounds.start && !bounds.end) return null;

  const range: any = {};
  if (bounds.start) range.gte = bounds.start;
  if (bounds.end) range.lte = bounds.end;
  return range;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const branchId = searchParams.get("branchId");
    const productId = searchParams.get("productId");
    const period = searchParams.get("period");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const saleWhere: any = { isDeleted: false };
    const returnWhere: any = { isDeleted: false };
    const expenseWhere: any = { isDeleted: false };

    if (branchId) {
      saleWhere.branchId = branchId;
      returnWhere.branchId = branchId;
      expenseWhere.branchId = branchId;
    }

    const dateRange = getDateRange(period, startDate, endDate);
    if (dateRange) {
      saleWhere.createdAt = dateRange;
      returnWhere.createdAt = dateRange;
      expenseWhere.createdAt = dateRange;
    }

    if (productId) {
      saleWhere.items = {
        some: { productId },
      };
      returnWhere.items = {
        some: { productId },
      };
    }

    // 1. Fetch Sales and SaleItems
    const sales = await prisma.sale.findMany({
      where: saleWhere,
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    // 2. Fetch Sales Returns and Items
    const salesReturns = await prisma.salesReturn.findMany({
      where: returnWhere,
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    let grossRevenue = 0;
    let grossCogs = 0;
    let totalReturnsRefund = 0;
    let returnedCogs = 0;

    // 3. Fetch Purchase Items & Active Inventory Layers for exact FIFO Reconciliation
    const [purchaseItems, inventoryLayers] = await Promise.all([
      prisma.purchaseItem.findMany({
        where: {
          purchase: { isDeleted: false, ...(branchId ? { branchId } : {}) },
          ...(productId ? { productId } : {}),
        },
        select: {
          productId: true,
          quantity: true,
          purchaseRate: true,
          total: true,
        },
      }),
      prisma.inventoryLayer.findMany({
        where: {
          ...(branchId ? { branchId } : {}),
          ...(productId ? { productId } : {}),
          remainingQty: { gt: 0 },
        },
        select: {
          productId: true,
          remainingQty: true,
          costPerUnit: true,
        },
      }),
    ]);

    const productPurchasedMap = new Map<string, number>();
    for (const pi of purchaseItems) {
      const lineTotal = Number(pi.total || Number(pi.quantity) * Number(pi.purchaseRate));
      productPurchasedMap.set(pi.productId, (productPurchasedMap.get(pi.productId) || 0) + lineTotal);
    }

    const productRemainingMap = new Map<string, number>();
    for (const layer of inventoryLayers) {
      const layerVal = Number(layer.remainingQty) * Number(layer.costPerUnit);
      productRemainingMap.set(layer.productId, (productRemainingMap.get(layer.productId) || 0) + layerVal);
    }

    const productMap = new Map<string, any>();

    // Process Sales
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (productId && item.productId !== productId) return;

        const qty = Number(item.quantity);
        const rev = Number(item.lineTotal || Number(item.sellingPrice) * qty - Number(item.discount || 0));
        let cost = Number(item.fifoCost || 0);

        if (cost <= 0) {
          const unitCost = Number(item.product?.sellingPrice || 0) * 0.7;
          cost = qty * unitCost;
        }

        grossRevenue += rev;
        grossCogs += cost;

        if (!productMap.has(item.productId)) {
          productMap.set(item.productId, {
            productId: item.productId,
            productName: item.product?.name || "Product",
            sku: item.product?.sku || "",
            categoryName: item.product?.category?.name || "General",
            unitAbbr: item.product?.unit?.abbreviation || "",
            sellingPrice: Number(item.product?.sellingPrice || 0),
            quantitySold: 0,
            quantityReturned: 0,
            netQuantitySold: 0,
            totalQuantitySold: 0,
            grossRevenue: 0,
            refundAmount: 0,
            netRevenue: 0,
            totalRevenue: 0,
            grossCogs: 0,
            returnedCogs: 0,
            netCogs: 0,
            totalFifoCost: 0,
            grossProfit: 0,
            marginPercent: 0,
            isLoss: false,
          });
        }

        const pData = productMap.get(item.productId);
        pData.quantitySold += qty;
        pData.grossRevenue += rev;
        pData.grossCogs += cost;
      });
    });

    // Process Returns & Deduct from P&L
    salesReturns.forEach((sReturn) => {
      sReturn.items.forEach((item) => {
        if (productId && item.productId !== productId) return;

        const qty = Number(item.quantity);
        const refund = Number(item.refundAmount || 0);
        // Cost of returned goods restored into inventory
        const unitSelling = Number(item.product?.sellingPrice || item.unitRefundRate || 0);
        const restockedCost = qty * (unitSelling * 0.7);

        totalReturnsRefund += refund;
        returnedCogs += restockedCost;

        if (!productMap.has(item.productId)) {
          productMap.set(item.productId, {
            productId: item.productId,
            productName: item.product?.name || "Product",
            sku: item.product?.sku || "",
            categoryName: item.product?.category?.name || "General",
            unitAbbr: item.product?.unit?.abbreviation || "",
            sellingPrice: Number(item.product?.sellingPrice || 0),
            quantitySold: 0,
            quantityReturned: 0,
            netQuantitySold: 0,
            totalQuantitySold: 0,
            grossRevenue: 0,
            refundAmount: 0,
            netRevenue: 0,
            totalRevenue: 0,
            grossCogs: 0,
            returnedCogs: 0,
            netCogs: 0,
            totalFifoCost: 0,
            grossProfit: 0,
            marginPercent: 0,
            isLoss: false,
          });
        }

        const pData = productMap.get(item.productId);
        pData.quantityReturned += qty;
        pData.refundAmount += refund;
        pData.returnedCogs += restockedCost;
      });
    });

    // Exact FIFO All-Time Reconciliation: Total COGS = Total Purchases - Remaining Inventory Valuation
    if (!dateRange) {
      let reconciledTotalGrossCogs = 0;
      for (const [pId, pData] of productMap.entries()) {
        const purchasedVal = productPurchasedMap.get(pId);
        const remainingVal = productRemainingMap.get(pId) || 0;
        if (purchasedVal !== undefined && purchasedVal > 0) {
          const exactNetCogs = Math.max(0, purchasedVal - remainingVal);
          pData.grossCogs = exactNetCogs + Number(pData.returnedCogs || 0);
          pData.netCogs = exactNetCogs;
        }
        reconciledTotalGrossCogs += pData.grossCogs;
      }
      if (reconciledTotalGrossCogs > 0) {
        grossCogs = reconciledTotalGrossCogs;
      }
    }

    // Net Calculations
    const netRevenue = Math.max(0, grossRevenue - totalReturnsRefund);
    const netCogs = Math.max(0, grossCogs - returnedCogs);

    const itemizedBreakdown = Array.from(productMap.values()).map((p) => {
      p.netQuantitySold = Math.max(0, p.quantitySold - p.quantityReturned);
      p.totalQuantitySold = p.netQuantitySold || p.quantitySold;
      p.netRevenue = Math.max(0, p.grossRevenue - p.refundAmount);
      p.totalRevenue = p.netRevenue || p.grossRevenue;
      p.netCogs = Math.max(0, p.grossCogs - p.returnedCogs);
      p.totalFifoCost = p.netCogs || p.grossCogs;
      p.grossProfit = p.netRevenue - p.netCogs;
      p.marginPercent = p.netRevenue > 0 ? Number(((p.grossProfit / p.netRevenue) * 100).toFixed(2)) : 0;
      p.isLoss = p.grossProfit < 0;
      return p;
    });

    // 3. Fetch Expenses
    let totalExpenses = 0;
    if (!productId) {
      const expenses = await prisma.expense.findMany({
        where: expenseWhere,
      });
      totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    }

    // 4. Compute Margins
    const grossProfit = netRevenue - netCogs;
    const netProfit = grossProfit - totalExpenses;
    const grossMarginPercent = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
    const netMarginPercent = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    const lossMakingItems = itemizedBreakdown.filter((p) => p.isLoss);

    return NextResponse.json({
      revenue: netRevenue,
      netRevenue,
      grossRevenue,
      totalSalesRevenue: grossRevenue,
      totalReturns: totalReturnsRefund,
      totalSalesReturns: totalReturnsRefund,
      totalReturnsCount: salesReturns.length,
      cogs: netCogs,
      totalCOGS: netCogs,
      grossCogs,
      returnedCogs,
      grossProfit,
      expenses: totalExpenses,
      operatingExpenses: totalExpenses,
      totalExpenses,
      netProfit,
      grossProfitMargin: Number(grossMarginPercent.toFixed(2)),
      grossMarginPercent: Number(grossMarginPercent.toFixed(2)),
      netProfitMargin: Number(netMarginPercent.toFixed(2)),
      netMarginPercent: Number(netMarginPercent.toFixed(2)),
      totalSalesCount: sales.length,
      itemizedBreakdown,
      lossMakingItems,
      lossItemsCount: lossMakingItems.length,
    });
  } catch (error: any) {
    console.error("Error calculating Profit & Loss:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
