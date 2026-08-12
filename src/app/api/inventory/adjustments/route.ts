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

    const where: any = {
      isDeleted: false,
    }

    if (branchId) {
      where.branchId = branchId
    }

    const adjustments = await prisma.stockAdjustment.findMany({
      where,
      include: {
        product: true,
        branch: true,
        createdBy: {
          select: { name: true, email: true }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json(adjustments)
  } catch (error) {
    console.error("Error fetching stock adjustments:", error)
    return NextResponse.json(
      { error: "Failed to fetch stock adjustments" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { productId, branchId, adjustmentType, newQty, reason } = body

    if (!productId || !branchId || !adjustmentType || newQty === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const adjustment = await prisma.$transaction(async (tx) => {
      // Get current inventory
      let inventory = await tx.inventory.findUnique({
        where: {
          productId_branchId: {
            productId,
            branchId
          }
        }
      })

      const previousQty = inventory ? Number(inventory.quantity) : 0
      const diff = Number(newQty) - previousQty

      if (diff === 0) {
        throw new Error("New quantity must be different from current quantity")
      }

      // Update or create inventory
      if (inventory) {
        inventory = await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: newQty }
        })
      } else {
        inventory = await tx.inventory.create({
          data: {
            productId,
            branchId,
            quantity: newQty
          }
        })
      }

      // Create stock adjustment record
      const stockAdjustment = await tx.stockAdjustment.create({
        data: {
          productId,
          branchId,
          adjustmentType,
          previousQty,
          newQty,
          quantity: Math.abs(diff), // Storing absolute difference or actual difference, instructions say difference. Schema has quantity as Decimal. We'll store absolute or raw difference. Actually diff is better.
          reason,
          createdById: session.user.id
        }
      })

      // Create stock movement record
      await tx.stockMovement.create({
        data: {
          productId,
          branchId,
          movementType: "ADJUSTMENT",
          quantity: diff,
          notes: reason || `Stock adjustment: ${adjustmentType}`
        }
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          entity: "stockAdjustment",
          entityId: stockAdjustment.id,
          branchId,
          newValues: {
            productId, branchId, adjustmentType, previousQty, newQty, reason
          }
        }
      })

      return stockAdjustment
    })

    return NextResponse.json(adjustment)
  } catch (error: any) {
    console.error("Error creating stock adjustment:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create stock adjustment" },
      { status: 500 }
    )
  }
}
