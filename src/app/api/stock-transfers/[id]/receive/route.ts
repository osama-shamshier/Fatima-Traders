import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeInventoryFIFO, createInventoryLayers } from "@/lib/fifo";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!transfer) {
        throw new Error("Transfer not found");
      }

      if (transfer.status !== "PENDING") {
        throw new Error("Transfer is not in PENDING status");
      }

      const consumeItems = transfer.items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      }));

      // Consume from origin branch
      const consumeResult = await consumeInventoryFIFO(tx, transfer.sourceBranchId, consumeItems);

      const receivedItems = transfer.items.map((item) => {
        const costDetail = consumeResult.find((r) => r.productId === item.productId);
        const fifoCost = Number(costDetail?.fifoCost || 0);
        const avgCost = Number(item.quantity) > 0 ? fifoCost / Number(item.quantity) : 0;

        return {
          productId: item.productId,
          quantity: Number(item.quantity),
          costPerUnit: avgCost,
        };
      });

      // Add to destination branch
      await createInventoryLayers(tx, transfer.destBranchId, receivedItems);

      // Update transfer status
      const updatedTransfer = await tx.stockTransfer.update({
        where: { id },
        data: {
          status: "COMPLETED",
        },
      });

      return updatedTransfer;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
