"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";

interface PurchaseViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: string | null;
}

export function PurchaseViewModal({ isOpen, onClose, purchaseId }: PurchaseViewModalProps) {
  const [purchase, setPurchase] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && purchaseId) {
      fetchPurchase();
    }
  }, [isOpen, purchaseId]);

  const fetchPurchase = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchases/${purchaseId}`);
      if (res.ok) {
        setPurchase(await res.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-bold text-slate-900">Purchase Invoice Details</DialogTitle>
        </DialogHeader>
        {loading ? (
          <Loader text="Loading purchase details..." className="py-12" />
        ) : purchase ? (
          <div className="py-4 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-xs font-medium">
              <div>
                <p className="text-slate-500 font-semibold">Invoice Number</p>
                <p className="font-mono font-bold text-blue-600 text-sm">{purchase.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold">Date</p>
                <p className="font-bold text-slate-900">{formatDate(purchase.purchaseDate)}</p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold">Supplier</p>
                <p className="font-bold text-slate-900">{purchase.supplier?.name}</p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold">Branch</p>
                <p className="font-bold text-slate-900">{purchase.branch?.name}</p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold mb-1">Status</p>
                <Badge
                  variant={
                    purchase.paymentStatus === "PAID"
                      ? "success"
                      : purchase.paymentStatus === "PARTIAL"
                      ? "warning"
                      : "danger"
                  }
                >
                  {purchase.paymentStatus}
                </Badge>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-sm text-slate-900 mb-2">Line Items</h4>
              <div className="relative w-full overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b font-semibold text-slate-600">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Rate</th>
                      <th className="p-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {purchase.items?.map((item: any) => {
                      const qty = Number(item.quantity || 0);
                      const rate = Number(item.purchaseRate || 0);
                      const lineTotal = item.total !== undefined ? Number(item.total) : item.lineTotal !== undefined ? Number(item.lineTotal) : qty * rate;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{item.product?.name || "Product"}</td>
                          <td className="p-3 text-right font-mono">{qty}</td>
                          <td className="p-3 text-right font-mono">{formatCurrency(rate)}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-xs font-semibold">
                <div className="flex justify-between text-slate-700">
                  <span>Total Amount:</span>
                  <span className="font-bold text-sm text-slate-900">{formatCurrency(purchase.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Amount Paid:</span>
                  <span className="font-bold">{formatCurrency(purchase.amountPaid)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-rose-700">
                  <span>Outstanding Pending:</span>
                  <span className="font-bold text-sm">{formatCurrency(purchase.outstandingAmount)}</span>
                </div>
              </div>
            </div>

            {purchase.notes && (
              <div className="bg-slate-50 p-3 rounded-xl border text-xs">
                <p className="text-slate-500 font-semibold">Notes</p>
                <p className="text-slate-700 mt-0.5">{purchase.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">Purchase record not found.</div>
        )}
        <DialogFooter className="border-t pt-3">
          <Button variant="outline" onClick={onClose} size="sm">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
