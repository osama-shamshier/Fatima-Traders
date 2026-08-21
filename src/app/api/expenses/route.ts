import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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

    const result = await prisma.$transaction(
      async (tx) => {
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
      },
      {
        maxWait: 15000,
        timeout: 60000,
      }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: error.message || "Failed to record expense" }, { status: 500 });
  }
}
