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

    // Sales Revenue (Direct POS Invoice Billing)
    sales.forEach((s: any) => {
      const total = Number(s.grandTotal ?? s.totalAmount ?? s.subtotal ?? 0);
      entries.push({
        date: s.createdAt,
        type: "Sales Revenue",
        description: `Sale to ${s.buyer?.name || "Walk-in Customer"} (${s.paymentMethod})`,
        reference: `INV #${s.invoiceNumber}`,
        debit: 0,
        credit: total,
      });
    });

    // Purchases (Direct Supplier Purchase Bills)
    purchases.forEach((p: any) => {
      const total = Number(p.totalAmount ?? 0);
      entries.push({
        date: p.createdAt,
        type: "Purchase Expense",
        description: `Purchase from ${p.supplier?.name || "Supplier"}`,
        reference: `PUR #${p.invoiceNumber || p.id.slice(0, 8)}`,
        debit: total,
        credit: 0,
      });
    });

    // Store Operational Expenses
    expenses.forEach((e: any) => {
      entries.push({
        date: e.createdAt,
        type: `Expense (${e.category?.name || "General"})`,
        description: e.notes || e.description || "Operational Expense",
        reference: e.reference || "Voucher",
        debit: Number(e.amount),
        credit: 0,
      });
    });

    // Customer Credit Settlements (Only unlinked collections to prevent double counting with Sales Revenue)
    buyerPayments.forEach((bp: any) => {
      if (!bp.saleId) {
        entries.push({
          date: bp.createdAt,
          type: "Credit Settlement",
          description: `Credit Settlement from ${bp.buyer?.name || "Customer"} (${bp.paymentMethod})`,
          reference: bp.bankReference ? `Ref: ${bp.bankReference}` : `REC (${bp.buyer?.name || "Customer"})`,
          debit: 0,
          credit: Number(bp.amount),
        });
      }
    });

    // Supplier Payments (Only unlinked settlements to prevent double counting with Purchases)
    supplierPayments.forEach((sp: any) => {
      if (!sp.purchaseId) {
        entries.push({
          date: sp.createdAt,
          type: "Supplier Payment",
          description: `Payment to ${sp.supplier?.name || "Supplier"} (${sp.paymentMethod})`,
          reference: sp.bankReference ? `Ref: ${sp.bankReference}` : `PAY (${sp.supplier?.name || "Supplier"})`,
          debit: Number(sp.amount),
          credit: 0,
        });
      }
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
