import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        buyer: true,
        branch: true,
        cashCounter: true,
        createdBy: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              include: {
                unit: true,
              }
            }
          }
        },
        payments: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    return NextResponse.json(sale);
  } catch (error) {
    console.error("Error fetching sale:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
