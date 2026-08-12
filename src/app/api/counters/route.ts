import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const branchId = searchParams.get("branchId");

    const where: any = { isDeleted: false };
    if (branchId) {
      where.branchId = branchId;
    }

    const counters = await prisma.cashCounter.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        sessions: {
          where: { status: "OPEN" },
          include: {
            user: { select: { id: true, name: true } }
          },
          take: 1
        }
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(counters);
  } catch (error) {
    console.error("Error fetching counters:", error);
    return NextResponse.json({ error: "Failed to fetch counters" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, branchId, isActive } = body;

    if (!name || !branchId) {
      return NextResponse.json({ error: "Name and Branch ID are required" }, { status: 400 });
    }

    const counter = await prisma.cashCounter.create({
      data: {
        name,
        branchId,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(counter, { status: 201 });
  } catch (error) {
    console.error("Error creating counter:", error);
    return NextResponse.json({ error: "Failed to create counter" }, { status: 500 });
  }
}
