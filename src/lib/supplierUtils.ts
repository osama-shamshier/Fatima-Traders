import { PrismaClient } from "@prisma/client";

type PrismaTx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * Reconciles active purchases and payments for a given supplier in FIFO order.
 * Updates amountPaid, outstandingAmount, and paymentStatus on all active purchases.
 */
export async function reconcileSupplier(tx: PrismaTx, supplierId: string) {
  const supplierPurchases = await tx.purchase.findMany({
    where: { supplierId, isDeleted: false },
    orderBy: [{ purchaseDate: "asc" }, { createdAt: "asc" }],
  });

  const allPayments = await tx.supplierPayment.findMany({
    where: { supplierId, isDeleted: false },
  });

  let totalCredit = allPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  for (const pur of supplierPurchases) {
    const totalAmount = Number(pur.totalAmount || 0);
    const allocatedPaid = Math.min(totalCredit, totalAmount);
    const outstanding = Math.max(0, totalAmount - allocatedPaid);
    const status = outstanding <= 0 ? "PAID" : allocatedPaid > 0 ? "PARTIAL" : "PENDING";

    if (
      Number(pur.amountPaid) !== allocatedPaid ||
      Number(pur.outstandingAmount) !== outstanding ||
      pur.paymentStatus !== status
    ) {
      await tx.purchase.update({
        where: { id: pur.id },
        data: {
          amountPaid: allocatedPaid,
          outstandingAmount: outstanding,
          paymentStatus: status as any,
        },
      });
    }

    totalCredit -= allocatedPaid;
  }
}
