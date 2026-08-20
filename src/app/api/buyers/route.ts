import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const buyers = await prisma.buyer.findMany({
      where: { isDeleted: false },
      include: {
        sales: {
          where: { isDeleted: false },
          select: { grandTotal: true, subtotal: true },
        },
        buyerPayments: {
          where: { isDeleted: false },
          select: { amount: true },
        },
        salesReturns: {
          where: { isDeleted: false },
          select: { totalRefund: true, refundMethod: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedBuyers = buyers.map((buyer) => {
      // 1. Total Invoiced Sales (Debit)
      const totalSales = (buyer.sales || []).reduce(
        (sum, sale) => sum + Number(sale.grandTotal || sale.subtotal || 0),
        0
      );

      // 2. Total Payments Received (Credit)
      const totalPayments = (buyer.buyerPayments || []).reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      );

      // 3. Total Sales Returns Adjusted against Customer Debt (ADJUSTMENT only)
      // When refund is given as physical CASH or BANK_TRANSFER, the customer's debt is NOT reduced!
      const totalAdjustedReturns = (buyer.salesReturns || [])
        .filter((ret: any) => ret.refundMethod === "ADJUSTMENT" || ret.refundMethod === "BUYER_CREDIT")
        .reduce((sum, ret) => sum + Number(ret.totalRefund || 0), 0);

      // 4. Exact Double-Entry Accounting Ledger Outstanding Balance (Ground Truth)
      const totalOutstanding = Math.max(0, totalSales - totalPayments - totalAdjustedReturns);

      return {
        id: buyer.id,
        name: buyer.name,
        companyName: buyer.companyName,
        contactNumber: buyer.contactNumber,
        address: buyer.address,
        notes: buyer.notes,
        isActive: buyer.isActive,
        totalOutstanding,
      };
    });

    return NextResponse.json(formattedBuyers);
  } catch (error) {
    console.error("Error fetching buyers:", error);
    return NextResponse.json({ error: "Failed to fetch buyers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, contactNumber, address, companyName, notes } = body;

    const buyer = await prisma.buyer.create({
      data: {
        name,
        contactNumber,
        address,
        companyName,
        notes,
      },
    });

    return NextResponse.json(buyer, { status: 201 });
  } catch (error) {
    console.error("Error creating buyer:", error);
    return NextResponse.json({ error: "Failed to create buyer" }, { status: 500 });
  }
}
