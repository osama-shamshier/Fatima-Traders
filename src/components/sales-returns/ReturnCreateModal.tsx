"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PAKISTANI_BANKS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, RotateCcw, AlertTriangle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

interface ReturnItemRow {
  productId: string;
  quantity: number;
  unitRefundRate: number;
  reason: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReturnCreateModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [buyerSales, setBuyerSales] = useState<any[]>([]);

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>(""); // "" = Walk-in Customer
  const [selectedSaleId, setSelectedSaleId] = useState<string>(""); // "" = Direct / No Invoice
  const [refundMethod, setRefundMethod] = useState<"ADJUSTMENT" | "CASH" | "BANK_TRANSFER">("CASH");
  const [bankName, setBankName] = useState<string>("");
  const [bankReference, setBankReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [reason, setReason] = useState<string>("Customer Return");

  const [items, setItems] = useState<ReturnItemRow[]>([
    { productId: "", quantity: 1, unitRefundRate: 0, reason: "" },
  ]);

  // Selected Buyer Data & Pending Credit
  const selectedBuyer = buyers.find((b) => b.id === selectedBuyerId);
  const pendingCredit = selectedBuyer ? Number(selectedBuyer.totalOutstanding || 0) : 0;

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen]);

  const fetchInitialData = async () => {
    try {
      const [branchesRes, buyersRes, productsRes] = await Promise.all([
        fetch("/api/branches"),
        fetch("/api/buyers"),
        fetch("/api/products"),
      ]);

      if (branchesRes.ok) {
        const bList = await branchesRes.json();
        setBranches(bList);
        if (bList.length > 0 && !selectedBranchId) {
          setSelectedBranchId(bList[0].id);
        }
      }

      if (buyersRes.ok) {
        const byData = await buyersRes.json();
        setBuyers(byData);
      }

      if (productsRes.ok) {
        const pData = await productsRes.json();
        setProducts(pData);
      }
    } catch (error) {
      console.error("Failed to load initial return form data", error);
    }
  };

  // When buyer changes, fetch their past sales & auto-set refund method recommendation
  useEffect(() => {
    if (selectedBuyerId) {
      fetch(`/api/sales?buyerId=${selectedBuyerId}`)
        .then((r) => r.json())
        .then((sList) => {
          if (Array.isArray(sList)) setBuyerSales(sList);
        })
        .catch(console.error);

      // If buyer has pending debt, default to adjusting in pending balance
      if (pendingCredit > 0) {
        setRefundMethod("ADJUSTMENT");
      } else {
        setRefundMethod("CASH");
      }
    } else {
      setBuyerSales([]);
      setSelectedSaleId("");
      setRefundMethod("CASH");
    }
  }, [selectedBuyerId, pendingCredit]);

  // Handle product selection in a row
  const handleProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    const updated = [...items];
    updated[index].productId = productId;
    updated[index].unitRefundRate = prod ? Number(prod.sellingPrice || 0) : 0;
    setItems(updated);
  };

  // Handle field change in row
  const handleRowChange = (index: number, field: keyof ReturnItemRow, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { productId: "", quantity: 1, unitRefundRate: 0, reason: "" }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Total Return Refund Calculation
  const totalReturnAmount = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitRefundRate || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      alert("Please select at least one product with quantity greater than 0");
      return;
    }

    if (refundMethod === "BANK_TRANSFER" && !bankName) {
      alert("Please select a bank or digital wallet for the refund");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        branchId: selectedBranchId || branches[0]?.id,
        buyerId: selectedBuyerId || null,
        saleId: selectedSaleId || null,
        refundMethod,
        bankName: refundMethod === "BANK_TRANSFER" ? bankName : null,
        bankReference: refundMethod === "BANK_TRANSFER" ? bankReference : null,
        reason,
        notes,
        items: validItems,
      };

      const res = await fetch("/api/sales-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert(`Failed to process return: ${err.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error processing sales return", error);
      alert("Error occurred while processing return");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto bg-white rounded-2xl p-6 shadow-2xl">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-rose-600" />
            <DialogTitle className="text-xl font-bold text-slate-900">Process Sales Return & Restock</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Top Row: Branch & Customer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Store Branch *</Label>
              <select
                required
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="input text-xs bg-white mt-1 w-full"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Customer / Buyer *</Label>
              <select
                value={selectedBuyerId}
                onChange={(e) => setSelectedBuyerId(e.target.value)}
                className="input text-xs bg-white mt-1 w-full font-medium"
              >
                <option value="">👤 Walk-in Customer (Cash Sale)</option>
                {buyers.map((b) => (
                  <option key={b.id} value={b.id}>
                    🏢 {b.name} {b.companyName ? `(${b.companyName})` : ""}
                    {Number(b.totalOutstanding || 0) > 0 ? ` — Pending: Rs. ${Number(b.totalOutstanding).toLocaleString()}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer Credit Status Badge */}
          {selectedBuyer && (
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              pendingCredit > 0 ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-slate-50 border-slate-200 text-slate-700"
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${pendingCredit > 0 ? "text-amber-600" : "text-slate-400"}`} />
                <span>
                  Customer Total Outstanding Credit:{" "}
                  <strong className={`font-bold font-mono text-sm ${pendingCredit > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {formatCurrency(pendingCredit)}
                  </strong>
                </span>
              </div>
              {pendingCredit > 0 && (
                <span className="text-[11px] font-semibold bg-amber-200/80 px-2 py-0.5 rounded text-amber-800">
                  Can adjust return amount against pending balance
                </span>
              )}
            </div>
          )}

          {/* Optional Invoice Selection if buyer has past sales */}
          {buyerSales.length > 0 && (
            <div>
              <Label className="text-xs font-semibold text-slate-700">Link to Original Invoice (Optional)</Label>
              <select
                value={selectedSaleId}
                onChange={(e) => setSelectedSaleId(e.target.value)}
                className="input text-xs bg-white mt-1 w-full"
              >
                <option value="">-- Direct Return (No Specific Invoice) --</option>
                {buyerSales.map((s) => (
                  <option key={s.id} value={s.id}>
                    Invoice #{s.invoiceNumber} — Total: {formatCurrency(s.grandTotal)} (Paid: {formatCurrency(s.amountPaid)}, Out: {formatCurrency(s.outstandingAmount)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Items Section */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                📦 Products Being Returned
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addItemRow} className="text-xs h-7 gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Another Item
              </Button>
            </div>

            <div className="space-y-2.5">
              {items.map((row, index) => {
                const lineTotal = Number(row.quantity || 0) * Number(row.unitRefundRate || 0);
                const selectedProd = products.find((p) => p.id === row.productId);

                return (
                  <div
                    key={index}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end"
                  >
                    <div className="md:col-span-5">
                      <Label className="text-[11px] font-semibold text-slate-600">Select Product *</Label>
                      <select
                        required
                        value={row.productId}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                        className="input text-xs bg-white mt-1 w-full font-medium"
                      >
                        <option value="">-- Choose Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) — Price: {formatCurrency(p.sellingPrice)}/{p.unit?.abbreviation || "unit"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-[11px] font-semibold text-slate-600">
                        Qty ({selectedProd?.unit?.abbreviation || "units"}) *
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        value={row.quantity}
                        onChange={(e) => handleRowChange(index, "quantity", Number(e.target.value))}
                        className="text-xs mt-1 bg-white font-bold"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-[11px] font-semibold text-slate-600">Refund Rate (PKR) *</Label>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={row.unitRefundRate}
                        onChange={(e) => handleRowChange(index, "unitRefundRate", Number(e.target.value))}
                        className="text-xs mt-1 bg-white font-bold text-rose-600"
                      />
                    </div>

                    <div className="md:col-span-2 text-right">
                      <Label className="text-[10px] font-bold uppercase text-slate-500">Line Total</Label>
                      <div className="text-sm font-extrabold font-mono text-slate-900 mt-1.5">
                        {formatCurrency(lineTotal)}
                      </div>
                    </div>

                    <div className="md:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={items.length <= 1}
                        onClick={() => removeItemRow(index)}
                        className="text-rose-600 hover:bg-rose-50 p-1.5 h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Refund Settlement Options */}
          <div className="space-y-3 pt-3 border-t">
            <Label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              💰 Refund & Settlement Method *
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: Adjust in Pending Credit (Only if buyer selected) */}
              {selectedBuyerId && pendingCredit > 0 && (
                <div
                  onClick={() => setRefundMethod("ADJUSTMENT")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    refundMethod === "ADJUSTMENT"
                      ? "bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">📉 Adjust in Pending</span>
                    {refundMethod === "ADJUSTMENT" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Reduce customer outstanding credit by {formatCurrency(totalReturnAmount)}
                  </p>
                </div>
              )}

              {/* Option 2: Cash Refund */}
              <div
                onClick={() => setRefundMethod("CASH")}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  refundMethod === "CASH"
                    ? "bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">💵 Cash Refund</span>
                  {refundMethod === "CASH" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pay cash refund immediately to customer
                </p>
              </div>

              {/* Option 3: Bank Transfer */}
              <div
                onClick={() => setRefundMethod("BANK_TRANSFER")}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  refundMethod === "BANK_TRANSFER"
                    ? "bg-purple-50/90 border-purple-500 ring-2 ring-purple-500/20"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">🏦 Bank Transfer</span>
                  {refundMethod === "BANK_TRANSFER" && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Send refund to customer bank account / digital wallet
                </p>
              </div>
            </div>

            {/* Bank Transfer Details Form */}
            {refundMethod === "BANK_TRANSFER" && (
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-purple-50/60 rounded-xl border border-purple-100">
                <div>
                  <Label className="text-xs font-medium text-purple-900">Select Bank / Wallet *</Label>
                  <select
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="input text-xs bg-white mt-1 w-full"
                  >
                    <option value="">-- Choose Bank / Wallet --</option>
                    {PAKISTANI_BANKS.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-purple-900">TRX / Reference #</Label>
                  <Input
                    placeholder="e.g. TRX-12345678"
                    value={bankReference}
                    onChange={(e) => setBankReference(e.target.value)}
                    className="text-xs mt-1 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Return Reason & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Reason for Return</Label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input text-xs bg-white mt-1 w-full"
              >
                <option value="Customer Return">Customer Return</option>
                <option value="Defective / Damaged Item">Defective / Damaged Item</option>
                <option value="Wrong Item Delivered">Wrong Item Delivered</option>
                <option value="Quality Issue">Quality Issue</option>
                <option value="Customer Changed Mind">Customer Changed Mind</option>
                <option value="Billing Correction">Billing Correction</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Additional Notes</Label>
              <Input
                placeholder="Optional comments or batch notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs mt-1"
              />
            </div>
          </div>

          {/* Live Summary Footer */}
          <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-4 mt-3">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Total Return Refund Amount:</span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                {formatCurrency(totalReturnAmount)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Settlement Action:</span>
              <Badge className="bg-white/10 text-white border-white/20 font-bold">
                {refundMethod === "ADJUSTMENT"
                  ? `📉 Adjust Rs. ${totalReturnAmount.toLocaleString()} against Pending Credit`
                  : refundMethod === "BANK_TRANSFER"
                  ? `🏦 Bank Transfer (${bankName || "Digital"})`
                  : "💵 Cash Payout"}
              </Badge>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || totalReturnAmount <= 0}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing Return...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" /> Process Return & Restock ({formatCurrency(totalReturnAmount)})
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
