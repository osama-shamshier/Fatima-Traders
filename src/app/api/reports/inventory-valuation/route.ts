import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const layers = await prisma.inventoryLayer.findMany({
      where: {
        remainingQty: { gt: 0 }
      },
      include: {
        branch: { select: { name: true } },
        product: { select: { name: true, sku: true } }
      }
    });

    const valuationMap: Record<string, any> = {};
    let totalValuation = 0;

    for (const layer of layers) {
      const branchId = layer.branchId;
      const productId = layer.productId;
      const key = `${branchId}-${productId}`;
      
      if (!valuationMap[key]) {
        valuationMap[key] = {
          branchId,
          branchName: layer.branch.name,
          productId,
          productName: layer.product.name,
          sku: layer.product.sku,
          totalQuantity: 0,
          totalValuation: 0,
        };
      }

      const layerQty = Number(layer.remainingQty);
      const layerCost = Number(layer.costPerUnit);
      const layerValue = layerQty * layerCost;

      valuationMap[key].totalQuantity += layerQty;
      valuationMap[key].totalValuation += layerValue;
      totalValuation += layerValue;
    }

    const breakdown = Object.values(valuationMap);

    return NextResponse.json({
      totalValuation,
      breakdown
    });
  } catch (error) {
    console.error("[INVENTORY_VALUATION_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
