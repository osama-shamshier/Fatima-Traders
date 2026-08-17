"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PAKISTANI_BANKS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard, RefreshCw, DollarSign, User } from "lucide-react";
import { Loader } from "@/components/ui/loader";

interface BuyerLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  buyerId: string | null;
  buyerName?: string;
  onSuccess?: () => void;
}

export function BuyerLedgerModal({ isOpen, onClose, buyerId, buyerName, onSuccess }: BuyerLedgerModalProps) {
  const [ledger, setLedger] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number>(0);

  // Settlement Form State
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settleForm, setSettleForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    bankName: "",
    bankReference: "",
    notes: "",
  });

  useEffect(() => {
    if (isOpen && buyerId) {
      fetchLedger();
    }
  }, [isOpen, buyerId]);

  const fetchLedger = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/buyers/${buyerId}/ledger`);
      if (res.ok) {
        const data = await res.json();
        setLedger(data);
        if (data.length > 0) {
          const lastEntry = data[data.length - 1];
          setCurrentBalance(Number(lastEntry.balance || 0));
          setSettleForm((prev) => ({ ...prev, amount: String(Math.max(0, Number(lastEntry.balance))) }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch buyer ledger", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerId) return;

    const amountNum = Number(settleForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid positive payment amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const refText = [
        settleForm.bankName ? `Bank: ${settleForm.bankName}` : null,
        settleForm.bankReference ? `Ref: ${settleForm.bankReference}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const payload = {
        buyerId,
        amount: amountNum,
        paymentMethod: settleForm.paymentMethod,
        bankReference: refText || undefined,
        notes: settleForm.notes || "Bill settlement payment",
      };

      const res = await fetch("/api/buyer-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsSettleOpen(false);
        setSettleForm({
          amount: "",
          paymentMethod: "CASH",
          bankName: "",
          bankReference: "",
          notes: "",
        });
        fetchLedger();
        if (onSuccess) onSuccess();
      } else {
        alert("Failed to record settlement payment.");
      }
    } catch (error) {
      console.error("Error submitting settlement", error);
      alert("Error processing settlement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full sm:max-w-6xl max-h-[92vh] flex flex-col bg-white rounded-2xl p-6 shadow-2xl overflow-hidden">
        <DialogHeader className="border-b pb-3 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" /> Customer Financial Ledger & Settlement — {buyerName || "Buyer"}
            </DialogTitle>
            <p className="text-xs text-slate-500">Complete chronological ledger history of invoices, credit collections, and account settlements.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[11px] text-slate-500 font-semibold uppercase block">Current Outstanding</span>
              <span className={`text-xl font-extrabold font-mono ${currentBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {formatCurrency(currentBalance)}
              </span>
            </div>

            <Button
              onClick={() => setIsSettleOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 px-4 shadow-sm"
            >
              <CreditCard className="w-4 h-4 mr-1.5" /> Settle Bill / Record Payment
            </Button>
          </div>
        </DialogHeader>

        {/* Inline Settlement Form */}
        {isSettleOpen && (
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl my-2 space-y-3 shrink-0">
            <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
              <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" /> Record Bill Settlement Payment
              </h4>
              <button onClick={() => setIsSettleOpen(false)} className="text-xs text-slate-500 hover:text-slate-800 font-bold">
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Payment Amount (PKR) *</Label>
                <Input
                  type="number"
                  step="any"
                  required
                  value={settleForm.amount}
                  onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })}
                  className="text-sm font-bold text-emerald-700 mt-1 bg-white"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Payment Method *</Label>
                <select
                  value={settleForm.paymentMethod}
                  onChange={(e) => setSettleForm({ ...settleForm, paymentMethod: e.target.value })}
                  className="input text-xs bg-white mt-1"
                >
                  <option value="CASH">💵 Cash</option>
                  <option value="BANK_TRANSFER">🏦 Bank / Digital Wallet</option>
                </select>
              </div>

              {settleForm.paymentMethod === "BANK_TRANSFER" ? (
                <div>
                  <Label className="text-xs font-semibold">Pakistani Bank / Wallet *</Label>
                  <select
                    value={settleForm.bankName}
                    onChange={(e) => setSettleForm({ ...settleForm, bankName: e.target.value })}
                    className="input text-xs bg-white mt-1"
                    required={settleForm.paymentMethod === "BANK_TRANSFER"}
                  >
                    <option value="">Select Bank</option>
                    {PAKISTANI_BANKS.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <Label className="text-xs font-semibold">Receipt / Notes</Label>
                  <Input
                    placeholder="e.g. Partial cash settlement"
                    value={settleForm.notes}
                    onChange={(e) => setSettleForm({ ...settleForm, notes: e.target.value })}
                    className="text-xs mt-1 bg-white"
                  />
                </div>
              )}

              {settleForm.paymentMethod === "BANK_TRANSFER" && (
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">TRX / Bank Reference #</Label>
                  <Input
                    placeholder="TRX-98765432"
                    value={settleForm.bankReference}
                    onChange={(e) => setSettleForm({ ...settleForm, bankReference: e.target.value })}
                    className="text-xs mt-1 bg-white"
                  />
                </div>
              )}

              <div className="sm:col-span-3 flex justify-end gap-2 pt-2 border-t border-emerald-200">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsSettleOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                >
                  {isSubmitting ? "Saving..." : "Confirm & Apply Settlement"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Complete Screen Table — NO HORIZONTAL SCROLLBAR NEEDED */}
        <div className="flex-1 overflow-y-auto mt-2 border rounded-xl bg-white shadow-xs">
          {isLoading ? (
            <Loader text="Loading customer ledger..." className="py-12" />
          ) : (
            <table className="w-full text-xs text-left border-collapse table-fixed">
              <thead className="bg-slate-50 sticky top-0 font-semibold border-b text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-28">Date</th>
                  <th className="p-3 w-28">Type</th>
                  <th className="p-3 w-32">Invoice / Ref #</th>
                  <th className="p-3">Details / Description</th>
                  <th className="p-3 text-right w-36">Debit (Bill Charged)</th>
                  <th className="p-3 text-right w-36">Credit (Paid)</th>
                  <th className="p-3 text-right w-40">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      No ledger transactions recorded for this customer yet.
                    </td>
                  </tr>
                ) : (
                  ledger.map((entry, index) => (
                    <tr key={`${entry.id}-${index}`} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-600 font-mono whitespace-nowrap">{formatDate(entry.date)}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            entry.type === "SALE"
                              ? "outline"
                              : entry.type === "PAYMENT"
                              ? "success"
                              : "warning"
                          }
                          className="text-[11px] font-bold"
                        >
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
                      <td
                        className={`p-3 text-right font-mono font-extrabold text-sm whitespace-nowrap ${
                          entry.balance > 0 ? "text-slate-900" : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(entry.balance)}
                      </td>
                    </tr>
                  ))
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
