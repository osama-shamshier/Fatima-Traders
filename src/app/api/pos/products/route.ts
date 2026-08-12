import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let branchId = searchParams.get("branchId");
    const search = searchParams.get("search");
    const categoryId = searchParams.get("categoryId");

    if (!branchId) {
      const defaultBranch = await prisma.branch.findFirst({
        where: { isActive: true, isDeleted: false },
      });
      if (defaultBranch) branchId = defaultBranch.id;
    }

    const whereClause: any = {
      isActive: true,
      isDeleted: false,
    };

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        unit: true,
        inventory: branchId
          ? {
              where: { branchId },
              select: { quantity: true },
            }
          : true,
      },
      orderBy: { name: "asc" },
    });

    const formattedProducts = products.map((product) => {
      let stock = 0;
      if (branchId && product.inventory.length > 0) {
        stock = Number(product.inventory[0].quantity);
      } else if (product.inventory.length > 0) {
        stock = product.inventory.reduce((sum: number, inv: any) => sum + Number(inv.quantity), 0);
      }
      return {
        ...product,
        availableStock: stock,
        stock,
        sellingPrice: Number(product.sellingPrice),
      };
    });

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error("Error fetching POS products:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
