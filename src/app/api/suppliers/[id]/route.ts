import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, contactNumber, address, companyName, notes, isActive } = body;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        contactNumber,
        address,
        companyName,
        notes,
        isActive,
      },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Error updating supplier:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
