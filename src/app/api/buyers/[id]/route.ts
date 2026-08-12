import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const buyer = await prisma.buyer.findUnique({
      where: { id },
    });

    if (!buyer || buyer.isDeleted) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    }

    return NextResponse.json(buyer);
  } catch (error) {
    console.error("Error fetching buyer:", error);
    return NextResponse.json({ error: "Failed to fetch buyer" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, contactNumber, address, companyName, notes, isActive } = body;

    const buyer = await prisma.buyer.update({
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

    return NextResponse.json(buyer);
  } catch (error) {
    console.error("Error updating buyer:", error);
    return NextResponse.json({ error: "Failed to update buyer" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.buyer.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting buyer:", error);
    return NextResponse.json({ error: "Failed to delete buyer" }, { status: 500 });
  }
}
