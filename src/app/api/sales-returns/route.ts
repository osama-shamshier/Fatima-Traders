import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { restoreInventoryFIFO } from "@/lib/fifo";

export async function GET() {
  try {
    const returns = await prisma.salesReturn.findMany({
      where: { isDeleted: false },
      include: {
        sale: {
          include: {
            branch: true,
          },
        },
        buyer: true,
        items: {
          include: {
            saleItem: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(returns);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { saleId, branchId, buyerId, items, refundMethod, notes } = body;

    const result = await prisma.$transaction(async (tx) => {
      const returnItems = items.map((item: any) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      }));
      await restoreInventoryFIFO(tx, branchId, returnItems);

      const totalRefund = items.reduce(
        (sum: number, item: any) => sum + Number(item.quantity) * Number(item.unitRefundRate || item.refundRate || 0),
        0
      );

      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { items: true },
      });

      if (!sale) throw new Error("Sale not found");

      const returnItemsData = items.map((item: any) => {
        const saleItem = sale.items.find((si) => si.productId === item.productId);
        return {
          saleItemId: saleItem?.id || sale.items[0].id,
          quantity: item.quantity,
          refundAmount: Number(item.quantity) * Number(item.unitRefundRate || item.refundRate || 0),
        };
      });

      const salesReturn = await tx.salesReturn.create({
        data: {
          saleId,
          buyerId,
          refundMethod: refundMethod === "BUYER_CREDIT" ? "ADJUSTMENT" : "CASH",
          totalRefund: totalRefund,
          notes,
          items: {
            create: returnItemsData,
          },
        },
      });

      return salesReturn;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
