import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const module = searchParams.get("module"); // Maps to entity
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");
    const search = searchParams.get("search");

    const where: any = {};
    if (module) where.entity = module;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    
    if (search) {
      where.OR = [
        { entity: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      take: 100, // Limit to recent 100
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
