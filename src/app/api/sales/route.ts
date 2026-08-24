import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeInventoryFIFO } from "@/lib/fifo";
import { generateInvoiceNumber } from "@/lib/utils";
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

    // Format sales: Walk-in sales (no registered buyer) are full cash sales
    const normalizedSales = sales.map((sale) => {
      if (!sale.buyerId && !sale.buyer) {
        return {
          ...sale,
          amountPaid: Number(sale.grandTotal || 0),
          outstandingAmount: 0,
          paymentStatus: "PAID",
        };
      }
      return sale;
    });

    return NextResponse.json(normalizedSales);
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
          sellingPrice: Number(i.sellingPrice),
          discount: Number(i.discount || 0),
        }));

        const consumedItems = await consumeInventoryFIFO(tx, branchId, fifoItems);

        let subtotal = 0;
        const saleItemsData = fifoItems.map((item: any, idx: number) => {
          const lineTotal = item.quantity * item.sellingPrice - item.discount;
          subtotal += lineTotal;
          const consumed = consumedItems[idx] || { fifoCost: 0 };
          return {
            productId: item.productId,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            discount: item.discount,
            lineTotal,
            fifoCost: consumed.fifoCost,
          };
        });

        const grandTotal = Math.max(0, subtotal - Number(discount) + Number(roundOff));
        const amountPaidNum = Math.min(grandTotal, Math.max(0, Number(amountPaid)));
        const outstandingAmount = Math.max(0, grandTotal - amountPaidNum);

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
          select: {
            id: true,
            invoiceNumber: true,
            saleDate: true,
            subtotal: true,
            discount: true,
            roundOff: true,
            grandTotal: true,
            amountPaid: true,
            outstandingAmount: true,
            paymentStatus: true,
            paymentMethod: true,
            dueDate: true,
            notes: true,
            buyer: {
              select: {
                id: true,
                name: true,
                companyName: true,
                contactNumber: true,
                address: true,
              },
            },
            branch: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
              },
            },
            items: {
              select: {
                id: true,
                quantity: true,
                sellingPrice: true,
                discount: true,
                lineTotal: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    unit: { select: { abbreviation: true } },
                  },
                },
              },
            },
          },
        });

        // If sale is associated with a buyer and initial payment was made, record in buyer payment history
        if (buyerId && amountPaidNum > 0) {
          await tx.buyerPayment.create({
            data: {
              buyerId,
              saleId: sale.id,
              amount: amountPaidNum,
              paymentMethod: paymentMethod === "BANK_TRANSFER" ? "BANK_TRANSFER" : "CASH",
              bankReference: bankReference || null,
              notes: fullNotes || `Payment for Invoice #${invoiceNumber}`,
              createdById: userId,
            },
          });
        }

        // Audit Log
        await tx.auditLog.create({
          data: {
            userId,
            action: "CREATE",
            entity: "sale",
            entityId: sale.id,
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
    return NextResponse.json(
      { error: error.message || "Failed to process sale" },
      { status: 400 }
    );
  }
}
