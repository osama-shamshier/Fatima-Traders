import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const branchId = searchParams.get("branchId");

    const where: any = { isDeleted: false };
    if (status) where.status = status;
    if (branchId) {
      where.OR = [{ sourceBranchId: branchId }, { destBranchId: branchId }];
    }

    const transfers = await prisma.stockTransfer.findMany({
      where,
      include: {
        sourceBranch: true,
        destBranch: true,
        createdBy: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(transfers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fromBranchId, toBranchId, items, notes } = body;

    const transfer = await prisma.$transaction(async (tx) => {
      const adminUser = await tx.user.findFirst({ select: { id: true } });
      const created = await tx.stockTransfer.create({
        data: {
          sourceBranchId: fromBranchId,
          destBranchId: toBranchId,
          status: "PENDING",
          reason: notes || "",
          createdById: adminUser?.id || "",
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: true },
      });

      return created;
    });

    return NextResponse.json(transfer);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
