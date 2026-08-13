import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isDeleted: false },
      include: {
        purchases: {
          where: { isDeleted: false },
          select: { totalAmount: true },
        },
        supplierPayments: {
          where: { isDeleted: false },
          select: { amount: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedSuppliers = suppliers.map((supplier) => {
      const totalPurchases = (supplier.purchases || []).reduce(
        (sum, p) => sum + Number(p.totalAmount || 0),
        0
      );
      const totalPayments = (supplier.supplierPayments || []).reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0
      );

      const outstandingBalance = Math.max(0, totalPurchases - totalPayments);

      return {
        ...supplier,
        outstandingBalance,
      };
    });

    return NextResponse.json(formattedSuppliers);
  } catch (error: any) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, contactNumber, address, companyName, notes } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactNumber,
        address,
        companyName,
        notes,
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error: any) {
    console.error("Error creating supplier:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
