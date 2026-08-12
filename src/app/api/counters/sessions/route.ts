import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const branchId = searchParams.get("branchId");

    const where: any = {};
    if (status) where.status = status;
    if (branchId) where.cashCounter = { branchId };

    const sessions = await prisma.cashCounterSession.findMany({
      where,
      include: {
        cashCounter: {
          include: {
            branch: { select: { id: true, name: true } }
          }
        },
        user: { select: { id: true, name: true } }
      },
      orderBy: { openedAt: "desc" }
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { cashCounterId, openingAmount, notes } = body;

    if (!cashCounterId || openingAmount === undefined) {
      return NextResponse.json({ error: "Counter ID and opening amount are required" }, { status: 400 });
    }

    // Check if counter already has an OPEN session
    const activeSession = await prisma.cashCounterSession.findFirst({
      where: {
        cashCounterId,
        status: "OPEN",
      },
    });

    if (activeSession) {
      return NextResponse.json(
        { error: "Counter already has an active OPEN session" },
        { status: 400 }
      );
    }

    const newSession = await prisma.cashCounterSession.create({
      data: {
        cashCounterId,
        userId: session.user.id,
        openingAmount,
        notes,
        status: "OPEN",
      },
      include: {
        cashCounter: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error("Error opening session:", error);
    return NextResponse.json({ error: "Failed to open session" }, { status: 500 });
  }
}
