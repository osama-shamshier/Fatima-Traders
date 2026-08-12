import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { actualAmount, notes } = body;

    if (actualAmount === undefined) {
      return NextResponse.json({ error: "Actual amount is required" }, { status: 400 });
    }

    const counterSession = await prisma.cashCounterSession.findUnique({
      where: { id }
    });

    if (!counterSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (counterSession.status === "CLOSED") {
      return NextResponse.json({ error: "Session is already closed" }, { status: 400 });
    }

    // Calculate expected amount
    // In a real scenario, this would aggregate sales, refunds, etc., tied to this session.
    // For now, we stub it as just opening amount since those entities might not exist yet.
    // Expected = openingAmount + cashSales + cashCollections - cashRefunds - cashExpenses
    
    const openingAmount = Number(counterSession.openingAmount);
    
    // Stub out expected cash calculations
    let totalCashIn = 0;
    let totalCashOut = 0;

    const expectedAmount = openingAmount + totalCashIn - totalCashOut;
    const difference = Number(actualAmount) - expectedAmount;

    const closedSession = await prisma.cashCounterSession.update({
      where: { id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closingAmount: new Prisma.Decimal(actualAmount),
        expectedAmount: new Prisma.Decimal(expectedAmount),
        difference: new Prisma.Decimal(difference),
        notes: notes ? (counterSession.notes ? `${counterSession.notes}\nClosing Note: ${notes}` : notes) : counterSession.notes,
      }
    });

    return NextResponse.json(closedSession);
  } catch (error) {
    console.error("Error closing session:", error);
    return NextResponse.json({ error: "Failed to close session" }, { status: 500 });
  }
}
