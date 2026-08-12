import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Prisma } from "@prisma/client"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId")
    const productId = searchParams.get("productId")
    const movementType = searchParams.get("movementType")

    const where: any = {}

    if (branchId) {
      where.branchId = branchId
    }

    if (productId) {
      where.productId = productId
    }

    if (movementType) {
      where.movementType = movementType
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: true,
        branch: true,
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json(movements)
  } catch (error) {
    console.error("Error fetching stock movements:", error)
    return NextResponse.json(
      { error: "Failed to fetch stock movements" },
      { status: 500 }
    )
  }
}
