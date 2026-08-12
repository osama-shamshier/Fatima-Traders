import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function getDateRange(period: string | null, startDate: string | null, endDate: string | null) {
  const now = new Date();

  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (period === "this_week") {
    const start = new Date(now);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (period === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (period === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (startDate || endDate) {
    const range: any = {};
    if (startDate) range.gte = new Date(startDate);
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      range.lte = e;
    }
    return range;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const branchId = searchParams.get("branchId");
    const categoryId = searchParams.get("categoryId");
    const period = searchParams.get("period");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Prisma.ExpenseWhereInput = {
      isDeleted: false,
    };

    if (branchId) where.branchId = branchId;
    if (categoryId) where.categoryId = categoryId;

    const dateRange = getDateRange(period, startDate, endDate);
    if (dateRange) {
      where.createdAt = dateRange;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: true,
        branch: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { branchId, categoryId, amount, paymentMethod = "CASH", bankName, bankReference, referenceNumber, notes, expenseDate } = body;

    if (!categoryId || !amount) {
      return NextResponse.json({ error: "Category and amount are required" }, { status: 400 });
    }

    if (!branchId) {
      const defaultBranch = await prisma.branch.findFirst({ where: { isDeleted: false, isActive: true } });
      if (defaultBranch) branchId = defaultBranch.id;
      else return NextResponse.json({ error: "Branch ID is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst();
    if (!user) return NextResponse.json({ error: "No user found" }, { status: 400 });
    const createdById = user.id;

    const refText = [
      referenceNumber,
      bankName ? `Bank: ${bankName}` : null,
      bankReference ? `Ref: ${bankReference}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          branchId,
          categoryId,
          amount: Number(amount),
          paymentMethod: paymentMethod === "BANK_TRANSFER" ? "BANK_TRANSFER" : "CASH",
          reference: refText || null,
          notes,
          expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
          createdById,
        },
        include: {
          category: true,
          branch: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entity: "expense",
          entityId: expense.id,
          branchId,
          userId: createdById,
          newValues: JSON.parse(JSON.stringify(expense)),
        },
      });

      return expense;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: error.message || "Failed to record expense" }, { status: 500 });
  }
}
