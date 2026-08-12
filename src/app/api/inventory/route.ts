import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const search = searchParams.get("search");
    const lowStock = searchParams.get("lowStock") === "true";

    const where: any = {};

    if (branchId) {
      where.branchId = branchId;
    }

    if (search) {
      where.product = {
        isDeleted: false,
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ],
      };
    } else {
      where.product = {
        isDeleted: false,
      };
    }

    const inventory = await prisma.inventory.findMany({
      where,
      include: {
        product: {
          include: {
            category: true,
            unit: true,
          },
        },
        branch: true,
      },
      orderBy: {
        product: {
          name: "asc",
        },
      },
    });

    let result = inventory.map((item) => ({
      ...item,
      quantity: Number(item.quantity || 0),
      minStockLevel: Number(item.product.minStockLevel || 0),
    }));

    if (lowStock) {
      result = result.filter((item) => item.quantity <= item.minStockLevel);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching real-time inventory:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch inventory" }, { status: 500 });
  }
}
