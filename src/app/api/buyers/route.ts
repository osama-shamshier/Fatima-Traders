import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const buyers = await prisma.buyer.findMany({
      where: { isDeleted: false },
      include: {
        sales: {
          where: { isDeleted: false },
          select: { grandTotal: true, subtotal: true, amountPaid: true },
        },
        buyerPayments: {
          where: { isDeleted: false },
          select: { amount: true },
        },
        salesReturns: {
          where: { 
            isDeleted: false,
            refundMethod: { in: ["ADJUSTMENT", "BUYER_CREDIT"] },
          },
          select: { totalRefund: true },
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

      // 2. Total Initial Paid at POS Checkout (Credit)
      const totalPaidAtCheckout = (buyer.sales || []).reduce(
        (sum, sale) => sum + Number(sale.amountPaid || 0),
        0
      );

      // 3. Total Subsequent Ledger Payments (Credit)
      const totalSubsequentPayments = (buyer.buyerPayments || []).reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      );

      // 4. Total Sales Returns Adjusted in Pending Credit (Credit)
      const totalAdjustedReturns = (buyer.salesReturns || []).reduce(
        (sum, ret) => sum + Number(ret.totalRefund || 0),
        0
      );

      // 5. Exact Double-Entry Outstanding Balance (100% consistent with ledger)
      const totalOutstanding = Math.max(
        0,
        totalSales - totalPaidAtCheckout - totalSubsequentPayments - totalAdjustedReturns
      );

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
