import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const branchId = searchParams.get("branchId");
    const productId = searchParams.get("productId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const saleWhere: any = { isDeleted: false };
    const expenseWhere: any = { isDeleted: false };

    if (branchId) {
      saleWhere.branchId = branchId;
      expenseWhere.branchId = branchId;
    }

    if (startDate || endDate) {
      saleWhere.createdAt = {};
      expenseWhere.createdAt = {};
      if (startDate) {
        saleWhere.createdAt.gte = new Date(startDate);
        expenseWhere.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        saleWhere.createdAt.lte = new Date(endDate);
        expenseWhere.createdAt.lte = new Date(endDate);
      }
    }

    // If filtered by a specific product, filter sales that contain that product
    if (productId) {
      saleWhere.items = {
        some: {
          productId,
        },
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

    let totalRevenue = 0;
    let totalCogs = 0;

    const productMap = new Map<string, any>();

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (productId && item.productId !== productId) return;

        const qty = Number(item.quantity);
        const rev = Number(item.lineTotal || Number(item.sellingPrice) * qty - Number(item.discount || 0));
        let cost = Number(item.fifoCost || 0);

        // Dynamic fallback if fifoCost wasn't populated on earlier legacy sales
        if (cost <= 0) {
          const unitCost = Number(item.product.sellingPrice) * 0.7;
          cost = qty * unitCost;
        }

        totalRevenue += rev;
        totalCogs += cost;

        if (!productMap.has(item.productId)) {
          productMap.set(item.productId, {
            productId: item.productId,
            productName: item.product.name,
            sku: item.product.sku,
            categoryName: item.product.category?.name || "General",
            unitAbbr: item.product.unit?.abbreviation || "",
            sellingPrice: Number(item.product.sellingPrice),
            totalQuantitySold: 0,
            totalRevenue: 0,
            totalCogs: 0,
            grossProfit: 0,
            marginPercent: 0,
            isLoss: false,
          });
        }

        const pData = productMap.get(item.productId);
        pData.totalQuantitySold += qty;
        pData.totalRevenue += rev;
        pData.totalCogs += cost;
      });
    });

    const itemizedBreakdown = Array.from(productMap.values()).map((p) => {
      p.grossProfit = p.totalRevenue - p.totalCogs;
      p.marginPercent = p.totalRevenue > 0 ? Number(((p.grossProfit / p.totalRevenue) * 100).toFixed(2)) : 0;
      p.isLoss = p.grossProfit < 0;
      return p;
    });

    // 2. Fetch Expenses (only count expenses if no product filter is applied)
    let totalExpenses = 0;
    if (!productId) {
      const expenses = await prisma.expense.findMany({
        where: expenseWhere,
      });
      totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    }

    // 3. Compute Margins
    const grossProfit = totalRevenue - totalCogs;
    const netProfit = grossProfit - totalExpenses;
    const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const lossMakingItems = itemizedBreakdown.filter((p) => p.isLoss);

    return NextResponse.json({
      revenue: totalRevenue,
      cogs: totalCogs,
      grossProfit,
      expenses: totalExpenses,
      netProfit,
      grossMarginPercent: Number(grossMarginPercent.toFixed(2)),
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
