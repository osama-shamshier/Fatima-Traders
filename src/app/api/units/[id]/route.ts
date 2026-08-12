import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, abbreviation } = body;

    const unit = await prisma.unit.update({
      where: { id },
      data: { name, abbreviation },
    });

    return NextResponse.json(unit);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Unit with this name/abbreviation already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update unit" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.unit.update({
      where: { id },
      data: { 
        isDeleted: true
      },
    });

    return NextResponse.json({ message: "Unit deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete unit" }, { status: 500 });
  }
}
