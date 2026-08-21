import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPakistanDayBounds, getPakistanPeriodBounds } from "@/lib/dateUtils";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "due_today";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    const { start: todayStart, end: todayEnd } = getPakistanDayBounds();

    const whereClause: any = {
      isDeleted: false,
      outstandingAmount: { gt: 0 },
    };

    if (search) {
      whereClause.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { buyer: { name: { contains: search, mode: "insensitive" } } },
        { buyer: { companyName: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (period === "due_today") {
      whereClause.dueDate = {
        gte: todayStart,
        lte: todayEnd,
      };
    } else if (period === "overdue") {
      whereClause.dueDate = {
        lt: todayStart,
      };
    } else if (period === "this_week" || period === "this_month" || period === "custom") {
      const bounds = getPakistanPeriodBounds(period, startDate, endDate);
      if (bounds.start || bounds.end) {
        whereClause.dueDate = {};
        if (bounds.start) whereClause.dueDate.gte = bounds.start;
        if (bounds.end) whereClause.dueDate.lte = bounds.end;
      }
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        buyer: true,
        branch: true,
      },
      orderBy: { dueDate: "asc" },
    });

    const result = sales.map((sale) => {
      const due = sale.dueDate ? new Date(sale.dueDate) : null;
      let status = "NO DUE DATE";
      if (due) {
        if (due >= todayStart && due <= todayEnd) status = "DUE TODAY";
        else if (due < todayStart) status = "OVERDUE";
        else status = "UPCOMING";
      }

      return {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        buyerId: sale.buyerId,
        buyerName: sale.buyer?.name || "Walk-in Customer",
        companyName: sale.buyer?.companyName || "",
        contactNumber: sale.buyer?.contactNumber || "",
        branchName: sale.branch?.name || "Main Branch",
        grandTotal: Number(sale.grandTotal),
        amountPaid: Number(sale.amountPaid),
        outstandingAmount: Number(sale.outstandingAmount),
        saleDate: sale.createdAt,
        dueDate: sale.dueDate,
        status,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching due dates:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch due dates" }, { status: 500 });
  }
}
