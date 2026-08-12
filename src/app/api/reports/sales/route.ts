import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const branchId = searchParams.get("branchId");

    const whereClause: any = {
      sale: {
        isDeleted: false,
      }
    };

    if (startDate || endDate) {
      whereClause.sale.saleDate = {};
      if (startDate) whereClause.sale.saleDate.gte = new Date(startDate);
      if (endDate) whereClause.sale.saleDate.lte = new Date(endDate);
    }

    if (branchId) {
      whereClause.sale.branchId = branchId;
    }

    const saleItems = await prisma.saleItem.findMany({
      where: whereClause,
      include: {
        sale: {
          include: {
            branch: { select: { name: true } },
            createdBy: { select: { name: true } }
          }
        },
        product: { select: { name: true, sku: true } }
      }
    });

    const salesMap: Record<string, any> = {};

    for (const item of saleItems) {
      const bId = item.sale.branchId;
      const bName = item.sale.branch.name;
      const cId = item.sale.createdById;
      const cName = item.sale.createdBy.name;
      const pId = item.productId;
      const pName = item.product.name;
      
      const key = `${bId}-${cId}-${pId}`;

      if (!salesMap[key]) {
        salesMap[key] = {
          branchId: bId,
          branchName: bName,
          cashierId: cId,
          cashierName: cName,
          productId: pId,
          productName: pName,
          sku: item.product.sku,
          totalQuantity: 0,
          totalRevenue: 0,
          totalDiscount: 0,
        };
      }

      salesMap[key].totalQuantity += Number(item.quantity);
      salesMap[key].totalRevenue += Number(item.lineTotal);
      salesMap[key].totalDiscount += Number(item.discount);
    }

    return NextResponse.json(Object.values(salesMap));
  } catch (error) {
    console.error("[SALES_REPORT_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
