import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, branchId, isActive } = body;

    const counter = await prisma.cashCounter.update({
      where: { id },
      data: { name, branchId, isActive },
    });

    return NextResponse.json(counter);
  } catch (error) {
    console.error("Error updating counter:", error);
    return NextResponse.json({ error: "Failed to update counter" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.cashCounter.update({
      where: { id },
      data: { 
        isDeleted: true
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting counter:", error);
    return NextResponse.json({ error: "Failed to delete counter" }, { status: 500 });
  }
}
