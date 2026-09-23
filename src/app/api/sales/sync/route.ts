import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeInventoryFIFO } from "@/lib/fifo";
import { generateInvoiceNumber } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let {
      clientSaleId,
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

    // 1. Idempotency verification: Check if this clientSaleId was already synced
    if (clientSaleId) {
      const existingSale = await prisma.sale.findFirst({
        where: {
          notes: {
            contains: `[ClientSaleId: ${clientSaleId}]`,
          },
          isDeleted: false,
        },
        include: {
          buyer: true,
          branch: true,
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      });

      if (existingSale) {
        return NextResponse.json(existingSale, { status: 200 });
      }
    }

    // 2. Fetch context concurrently
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

    const saleDate = offlineCreatedAt ? new Date(offlineCreatedAt) : new Date();

    const result = await prisma.$transaction(
      async (tx) => {
        const invoiceNumber = generateInvoiceNumber();

        const fifoItems = items.map((i: any) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          sellingPrice: Number(i.sellingPrice),
          discount: Number(i.discount || 0),
        }));

        // Deduct inventory batches via FIFO
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

        const clientRefTag = clientSaleId ? `[ClientSaleId: ${clientSaleId}]` : "";
        const offlineInvTag = offlineInvoiceNumber ? `[OfflineInv: ${offlineInvoiceNumber}]` : "";

        const fullNotes = [
          notes,
          clientRefTag,
          offlineInvTag,
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
            saleDate,
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

        await tx.auditLog.create({
          data: {
            userId,
            action: "SYNC_OFFLINE_SALE",
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
    console.error("Error syncing offline sale:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync offline sale" },
      { status: 400 }
    );
  }
}
