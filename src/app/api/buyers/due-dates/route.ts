import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "due_today";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

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
    } else if (period === "this_week") {
      const weekStart = new Date(now);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(now);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      whereClause.dueDate = {
        gte: weekStart,
        lte: weekEnd,
      };
    } else if (period === "this_month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      whereClause.dueDate = {
        gte: monthStart,
        lte: monthEnd,
      };
    } else if (period === "custom") {
      if (startDate || endDate) {
        whereClause.dueDate = {};
        if (startDate) whereClause.dueDate.gte = new Date(startDate);
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          whereClause.dueDate.lte = e;
        }
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
