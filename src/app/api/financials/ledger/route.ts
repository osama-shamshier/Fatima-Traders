import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [sales, purchases, expenses, buyerPayments, supplierPayments] = await Promise.all([
      prisma.sale.findMany({
        where: { isDeleted: false },
        include: { buyer: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.purchase.findMany({
        where: { isDeleted: false },
        include: { supplier: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.expense.findMany({
        where: { isDeleted: false },
        include: { category: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.buyerPayment.findMany({
        where: { isDeleted: false },
        include: { buyer: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.supplierPayment.findMany({
        where: { isDeleted: false },
        include: { supplier: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const entries: any[] = [];

    sales.forEach((s: any) => {
      entries.push({
        date: s.createdAt,
        type: "Sales Revenue",
        reference: `INV #${s.invoiceNumber}`,
        debit: 0,
        credit: Number(s.totalAmount),
      });
    });

    purchases.forEach((p: any) => {
      entries.push({
        date: p.createdAt,
        type: "Purchase Expense",
        reference: `PUR #${p.invoiceNumber || p.id.slice(0, 8)}`,
        debit: Number(p.totalAmount),
        credit: 0,
      });
    });

    expenses.forEach((e: any) => {
      entries.push({
        date: e.createdAt,
        type: `Expense (${e.category?.name || "General"})`,
        reference: e.notes || "Voucher",
        debit: Number(e.amount),
        credit: 0,
      });
    });

    buyerPayments.forEach((bp: any) => {
      entries.push({
        date: bp.createdAt,
        type: "Customer Collection",
        reference: `REC (${bp.buyer?.name || "Customer"})`,
        debit: 0,
        credit: Number(bp.amount),
      });
    });

    supplierPayments.forEach((sp: any) => {
      entries.push({
        date: sp.createdAt,
        type: "Supplier Payment",
        reference: `PAY (${sp.supplier?.name || "Supplier"})`,
        debit: Number(sp.amount),
        credit: 0,
      });
    });

    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const ledger = entries.map((entry) => {
      runningBalance += entry.credit - entry.debit;
      return {
        ...entry,
        balance: runningBalance,
      };
    });

    return NextResponse.json(ledger);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
