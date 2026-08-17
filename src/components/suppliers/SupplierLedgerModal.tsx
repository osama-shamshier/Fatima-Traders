"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Truck } from "lucide-react";
import { Loader } from "@/components/ui/loader";

interface SupplierLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: string;
  supplierName: string;
}

export function SupplierLedgerModal({ isOpen, onClose, supplierId, supplierName }: SupplierLedgerModalProps) {
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && supplierId) {
      fetchLedger();
    }
  }, [isOpen, supplierId]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/ledger`);
      if (res.ok) {
        const data = await res.json();
        setLedger(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const lastEntry = ledger.length > 0 ? ledger[ledger.length - 1] : null;
  const currentPayable = lastEntry ? Number(lastEntry.balance || 0) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-full sm:max-w-6xl max-h-[92vh] flex flex-col bg-white rounded-2xl p-6 shadow-2xl overflow-hidden">
        <DialogHeader className="border-b pb-3 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" /> Supplier Financial Ledger — {supplierName}
            </DialogTitle>
            <p className="text-xs text-slate-500">Chronological history of purchase invoices, disbursements, and payables running balance.</p>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">Current Payable Balance</span>
            <span className={`text-xl font-extrabold font-mono ${currentPayable > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {formatCurrency(currentPayable)}
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 border rounded-xl bg-white shadow-xs">
          {loading ? (
            <Loader text="Loading supplier ledger..." className="py-12" />
          ) : (
            <table className="w-full text-xs text-left border-collapse table-fixed">
              <thead className="bg-slate-50 sticky top-0 font-semibold border-b text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-28">Date</th>
                  <th className="p-3 w-28">Type</th>
                  <th className="p-3 w-32">Ref / Invoice #</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right w-36">Debit (Bill Added)</th>
                  <th className="p-3 text-right w-36">Credit (Paid)</th>
                  <th className="p-3 text-right w-40">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {ledger.map((entry, idx) => (
                  <tr key={`${entry.id}-${idx}`} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{formatDate(entry.date)}</td>
                    <td className="p-3">
                      <Badge variant={entry.type === "PURCHASE" ? "outline" : "success"} className="text-[11px] font-bold">
                        {entry.type}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono font-bold text-blue-600 truncate">{entry.reference || "-"}</td>
                    <td className="p-3 text-slate-700 truncate">{entry.description || "-"}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                      {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                      {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-sm text-slate-900 whitespace-nowrap">
                      {formatCurrency(entry.balance)}
                    </td>
                  </tr>
                ))}
                {ledger.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      No ledger transactions found for this supplier.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter className="mt-4 border-t pt-3 flex justify-between items-center shrink-0">
          <Button variant="outline" onClick={fetchLedger} size="sm">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Ledger
          </Button>
          <Button variant="outline" onClick={onClose} size="sm">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
