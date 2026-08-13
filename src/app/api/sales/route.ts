import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeInventoryFIFO } from "@/lib/fifo";
import { generateInvoiceNumber } from "@/lib/utils";

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
    const buyerId = searchParams.get("buyerId");
    const period = searchParams.get("period");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const whereClause: any = { isDeleted: false };

    if (branchId) whereClause.branchId = branchId;
    if (buyerId) whereClause.buyerId = buyerId;

    const dateRange = getDateRange(period, startDate, endDate);
    if (dateRange) {
      whereClause.createdAt = dateRange;
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        buyer: { select: { id: true, name: true, companyName: true, contactNumber: true } },
        branch: { select: { id: true, name: true } },
        cashCounter: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let {
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

    // Execute pre-checks concurrently in a single network round-trip
    const [user, defaultBranch, activeSession] = await Promise.all([
      prisma.user.findFirst(),
      !branchId ? prisma.branch.findFirst({ where: { isActive: true, isDeleted: false } }) : null,
      !sessionId ? prisma.cashCounterSession.findFirst({ where: { status: "OPEN" } }) : null,
    ]);

    if (!user) throw new Error("No user found in system.");
    const userId = user.id;

    if (!branchId && defaultBranch) {
      branchId = defaultBranch.id;
    }

    if (!branchId) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 });
    }

    if (!sessionId && activeSession) {
      sessionId = activeSession.id;
      cashCounterId = activeSession.cashCounterId;
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const invoiceNumber = generateInvoiceNumber();

        const fifoItems = items.map((i: any) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
        }));

        const fifoResult = await consumeInventoryFIFO(tx as any, branchId, fifoItems);

        let subtotal = 0;
        const saleItemsData = items.map((item: any, index: number) => {
          const lineTotal = Number(item.quantity) * Number(item.sellingPrice) - Number(item.discount || 0);
          subtotal += lineTotal;
          return {
            productId: item.productId,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            discount: item.discount || 0,
            lineTotal,
            fifoCost: fifoResult[index].fifoCost,
          };
        });

        const grandTotal = Math.max(0, subtotal - Number(discount) + Number(roundOff));
        const amountPaidNum = Number(amountPaid);
        const outstandingAmount = grandTotal - amountPaidNum;

        if (!buyerId && amountPaidNum < grandTotal) {
          throw new Error(
            "Credit sales are not allowed for Walk-in Customers. Please select a registered buyer to record partial or pending credit."
          );
        }

        const paymentStatus =
          amountPaidNum >= grandTotal ? "PAID" : amountPaidNum > 0 ? "PARTIAL" : "PENDING";

        const fullNotes = [
          notes,
          bankName ? `Bank/Wallet: ${bankName}` : null,
          bankReference ? `Ref: ${bankReference}` : null,
        ]
          .filter(Boolean)
          .join(" | ");

        const sale = await tx.sale.create({
          data: {
            invoiceNumber,
            branchId,
            buyerId: buyerId || null,
            cashCounterId: cashCounterId || null,
            sessionId: sessionId || null,
            createdById: userId,
            dueDate: dueDate ? new Date(dueDate) : null,
            subtotal,
            discount: Number(discount),
            roundOff: Number(roundOff),
            grandTotal,
            amountPaid: amountPaidNum,
            outstandingAmount,
            paymentStatus,
            paymentMethod: paymentMethod === "BANK_TRANSFER" ? "BANK_TRANSFER" : "CASH",
            notes: fullNotes,
            items: {
              create: saleItemsData,
            },
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            buyer: true,
            branch: true,
          },
        });

        if (amountPaidNum > 0 && buyerId) {
          await tx.buyerPayment.create({
            data: {
              buyerId,
              saleId: sale.id,
              amount: amountPaidNum,
              paymentMethod: paymentMethod === "BANK_TRANSFER" ? "BANK_TRANSFER" : "CASH",
              bankReference: bankReference || bankName || null,
              createdById: userId,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            userId,
            action: "CREATE",
            entity: "sale",
            entityId: sale.id,
            branchId,
            newValues: JSON.parse(JSON.stringify(sale)),
          },
        });

        return sale;
      },
      {
        maxWait: 15000,
        timeout: 60000,
      }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Error creating sale:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
