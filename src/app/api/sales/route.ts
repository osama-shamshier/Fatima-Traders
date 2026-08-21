import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPakistanPeriodBounds } from "@/lib/dateUtils";
import { createSaleRecord, ProcessSalePayload } from "@/lib/saleService";

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
    const buyerId = searchParams.get("buyerId");
    const period = searchParams.get("period");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = { isDeleted: false };
    if (branchId) where.branchId = branchId;
    if (buyerId) where.buyerId = buyerId;

    const dateRange = getDateRange(period, startDate, endDate);
    if (dateRange) where.saleDate = dateRange;

    const sales = await prisma.sale.findMany({
      where,
      orderBy: { saleDate: "desc" },
      include: {
        buyer: { select: { id: true, name: true, companyName: true, contactNumber: true } },
        branch: { select: { id: true, name: true, address: true } },
        cashCounter: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: { select: { abbreviation: true } } } },
          },
        },
      },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let {
      offlineId,
      offlineInvoiceNumber,
      offlineCreatedAt,
      buyerId,
      branchId,
      cashCounterId,
      sessionId,
      discount = 0,
      roundOff = 0,
      items,
      amountPaid = 0,
      paymentMethod = "CASH",
      bankName,
      bankReference,
      dueDate,
      notes,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Items are required" }, { status: 400 });
    }

    // Resolve default branch and user
    const [user, defaultBranch] = await Promise.all([
      prisma.user.findFirst(),
      !branchId ? prisma.branch.findFirst({ where: { isActive: true, isDeleted: false } }) : null,
    ]);

    if (!user) throw new Error("No user found in system.");
    const userId = user.id;

    if (!branchId && defaultBranch) {
      branchId = defaultBranch.id;
    }

    if (!branchId) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 });
    }

    const payload: ProcessSalePayload = {
      offlineId,
      offlineInvoiceNumber,
      offlineCreatedAt,
      buyerId,
      branchId,
      cashCounterId,
      sessionId,
      discount,
      roundOff,
      amountPaid,
      paymentMethod: paymentMethod === "BANK_TRANSFER" ? "BANK_TRANSFER" : "CASH",
      bankName,
      bankReference,
      dueDate,
      notes,
      items: items.map((i: any) => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        sellingPrice: Number(i.sellingPrice),
        discount: Number(i.discount || 0),
      })),
    };

    const result = await prisma.$transaction(
      async (tx) => {
        return await createSaleRecord(tx, payload, { userId, isOfflineSync: false });
      },
      {
        maxWait: 15000,
        timeout: 60000,
      }
    );

    return NextResponse.json(result.sale, { status: 201 });
  } catch (error: any) {
    console.error("Error creating sale:", error);
    return NextResponse.json({ error: error.message || "Failed to create sale" }, { status: 500 });
  }
}
