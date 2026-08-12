import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    let categories = await prisma.expenseCategory.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
    });

    if (categories.length === 0) {
      const defaultCategories = [
        "Rent & Lease",
        "Utilities (Electricity, Water, Gas)",
        "Salaries & Wages",
        "Transport & Freight",
        "Packaging Supplies",
        "Repairs & Maintenance",
        "Office Supplies",
        "Miscellaneous Overhead",
      ];

      for (const name of defaultCategories) {
        await prisma.expenseCategory.upsert({
          where: { name },
          update: {},
          create: { name, description: `${name} operational expenses` },
        });
      }

      categories = await prisma.expenseCategory.findMany({
        where: { isDeleted: false },
        orderBy: { name: "asc" },
      });
    }

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching expense categories:", error);
    return NextResponse.json({ error: "Failed to fetch expense categories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const category = await prisma.expenseCategory.create({
      data: { name, description },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Category already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
