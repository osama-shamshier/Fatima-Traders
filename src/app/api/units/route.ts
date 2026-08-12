import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const units = await prisma.unit.findMany({
      where: { isDeleted: false },
      include: {
        _count: {
          select: { products: { where: { isDeleted: false } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(units);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, abbreviation } = body;

    if (!name || !abbreviation) {
      return NextResponse.json({ error: "Name and abbreviation are required" }, { status: 400 });
    }

    const unit = await prisma.unit.create({
      data: {
        name,
        abbreviation,
      },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Unit with this name/abbreviation already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create unit" }, { status: 500 });
  }
}
