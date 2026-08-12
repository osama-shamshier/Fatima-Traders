"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PAKISTANI_BANKS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard, Plus, Truck, RefreshCw } from "lucide-react";

export default function SupplierPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    supplierId: "",
    purchaseId: "",
    amount: "",
    paymentMethod: "CASH",
    bankName: "",
    bankReference: "",
    notes: "",
  });

  useEffect(() => {
    fetchPayments();
    fetchInitialData();
  }, []);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/supplier-payments");
      if (res.ok) setPayments(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [suppRes, purRes] = await Promise.all([
        fetch("/api/suppliers"),
        fetch("/api/purchases"),
      ]);
      if (suppRes.ok) setSuppliers(await suppRes.json());
      if (purRes.ok) setPurchases(await purRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const filteredPurchases = purchases.filter(
    (p) => p.supplierId === formData.supplierId && Number(p.outstandingAmount) > 0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) {
      alert("Please select a supplier");
      return;
    }
    const amountNum = Number(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid positive payment amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const refText = [
        formData.bankName ? `Bank: ${formData.bankName}` : null,
        formData.bankReference ? `Ref: ${formData.bankReference}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const payload = {
        supplierId: formData.supplierId,
        purchaseId: formData.purchaseId || undefined,
        amount: amountNum,
        paymentMethod: formData.paymentMethod,
        bankReference: refText || undefined,
        notes: formData.notes,
      };

      const res = await fetch("/api/supplier-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({
          supplierId: "",
          purchaseId: "",
          amount: "",
          paymentMethod: "CASH",
          bankName: "",
          bankReference: "",
          notes: "",
        });
        fetchPayments();
        fetchInitialData();
      } else {
        alert("Failed to record supplier payment.");
      }
    } catch (e) {
      console.error("Error submitting supplier payment:", e);
      alert("Error recording payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supplier Payments & Outgoing Disbursements</h1>
          <p className="text-slate-500 text-sm">Record payments to suppliers for inventory purchase bills and payables settlement.</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Record Supplier Payment
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-900 text-sm">Supplier Payment Log</h3>
          <Button variant="outline" size="sm" onClick={fetchPayments}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 border-b font-medium text-xs">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Supplier Name</th>
                <th className="p-4">Purchase Bill #</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4">Bank / TRX Reference</th>
                <th className="p-4 text-right">Amount Paid</th>
                <th className="p-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-sans">Loading supplier payments...</td></tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No supplier payments recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-sans text-slate-600">{formatDate(p.createdAt || p.paymentDate)}</td>
                    <td className="p-4 font-sans font-semibold text-slate-900">{p.supplier?.name}</td>
                    <td className="p-4 font-bold text-blue-600">{p.purchase?.invoiceNumber || "-"}</td>
                    <td className="p-4 font-sans">
                      <Badge variant="outline">{p.paymentMethod}</Badge>
                    </td>
                    <td className="p-4 font-sans text-slate-600">{p.bankReference || "-"}</td>
                    <td className="p-4 text-right font-bold text-rose-600">{formatCurrency(p.amount)}</td>
                    <td className="p-4 font-sans text-slate-500 truncate max-w-xs">{p.notes || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Supplier Payment Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md p-6 bg-white rounded-2xl shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Record Supplier Payment</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Select Supplier *</Label>
                <select
                  required
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value, purchaseId: "" })}
                  className="input text-sm bg-white"
                >
                  <option value="">Choose Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.companyName || "Individual"})
                    </option>
                  ))}
                </select>
              </div>

              {formData.supplierId && filteredPurchases.length > 0 && (
                <div>
                  <Label>Outstanding Purchase Bill (Optional)</Label>
                  <select
                    value={formData.purchaseId}
                    onChange={(e) => setFormData({ ...formData, purchaseId: e.target.value })}
                    className="input text-xs bg-white mt-1"
                  >
                    <option value="">General Account Payment</option>
                    {filteredPurchases.map((p) => (
                      <option key={p.id} value={p.id}>
                        Bill #{p.invoiceNumber} - Outstanding: {formatCurrency(p.outstandingAmount)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <Label>Payment Amount (PKR) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="font-bold text-rose-600 text-base"
                />
              </div>

              <div>
                <Label>Payment Method *</Label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="input text-sm bg-white"
                >
                  <option value="CASH">💵 Cash Payment</option>
                  <option value="BANK_TRANSFER">🏦 Bank Transfer / Digital Wallet</option>
                </select>
              </div>

              {formData.paymentMethod === "BANK_TRANSFER" && (
                <div className="space-y-3 bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                  <div>
                    <Label className="text-xs">Pakistani Bank / Digital Wallet *</Label>
                    <select
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="input text-xs bg-white mt-1"
                      required={formData.paymentMethod === "BANK_TRANSFER"}
                    >
                      <option value="">Select Bank / Wallet</option>
                      {PAKISTANI_BANKS.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs">TRX / Reference #</Label>
                    <Input
                      placeholder="TRX-123456"
                      value={formData.bankReference}
                      onChange={(e) => setFormData({ ...formData, bankReference: e.target.value })}
                      className="text-xs mt-1 bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>Notes / Receipt Reference</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Bank cheque # / Transfer receipt"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white font-semibold">
                  {isSubmitting ? "Saving..." : "Confirm Supplier Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
