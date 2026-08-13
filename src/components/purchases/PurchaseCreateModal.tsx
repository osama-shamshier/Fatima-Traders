"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PAKISTANI_BANKS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Tag, TrendingUp } from "lucide-react";

interface PurchaseCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PurchaseCreateModal({ isOpen, onClose, onSuccess }: PurchaseCreateModalProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    supplierId: "",
    branchId: "",
    invoiceNumber: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    amountPaid: 0,
    paymentMethod: "CASH",
    bankName: "",
    bankReference: "",
    notes: "",
  });

  const [items, setItems] = useState<
    Array<{ productId: string; quantity: number; purchaseRate: number; newSellingPrice: number }>
  >([{ productId: "", quantity: 1, purchaseRate: 0, newSellingPrice: 0 }]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const [suppRes, branchRes, prodRes] = await Promise.all([
        fetch("/api/suppliers"),
        fetch("/api/branches"),
        fetch("/api/products"),
      ]);
      if (suppRes.ok) setSuppliers(await suppRes.json());
      if (branchRes.ok) {
        const bData = await branchRes.json();
        setBranches(bData);
        if (bData.length > 0 && !formData.branchId) {
          setFormData((prev) => ({ ...prev, branchId: bData[0].id }));
        }
      }
      if (prodRes.ok) setProducts(await prodRes.json());
    } catch (error) {
      console.error(error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;

    if (field === "productId") {
      const p = products.find((prod) => prod.id === value);
      if (p) {
        newItems[index].newSellingPrice = Number(p.sellingPrice || 0);
      }
    }
    setItems(newItems);
  };

  const addItem = () =>
    setItems([...items, { productId: "", quantity: 1, purchaseRate: 0, newSellingPrice: 0 }]);

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((acc, item) => acc + item.quantity * item.purchaseRate, 0);
  const pendingAmount = Math.max(0, totalAmount - Number(formData.amountPaid || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) {
      alert("Please select a supplier");
      return;
    }
    if (!formData.branchId) {
      alert("Please select a destination branch for stock inventory");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        items,
        amountPaid: Number(formData.amountPaid),
      };

      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to record purchase");
      }

      onSuccess();
      onClose();
      // reset state
      setFormData({
        supplierId: "",
        branchId: branches[0]?.id || "",
        invoiceNumber: "",
        purchaseDate: new Date().toISOString().split("T")[0],
        amountPaid: 0,
        paymentMethod: "CASH",
        bankName: "",
        bankReference: "",
        notes: "",
      });
      setItems([{ productId: "", quantity: 1, purchaseRate: 0, newSellingPrice: 0 }]);
    } catch (error) {
      console.error(error);
      alert("Error saving purchase");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[950px] max-h-[92vh] overflow-y-auto bg-white rounded-2xl p-6">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b pb-3 mb-4">
            <DialogTitle className="text-xl font-bold text-slate-900">New Purchase & Stock Receiving</DialogTitle>
            <p className="text-xs text-slate-500">
              Record supplier purchase bill. Enter purchase rates and updated retail sale rates to auto-update product catalog pricing.
            </p>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="supplierId">Select Supplier *</Label>
                <select
                  id="supplierId"
                  name="supplierId"
                  value={formData.supplierId}
                  onChange={handleChange}
                  className="input text-sm bg-white"
                  required
                >
                  <option value="">Choose Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.companyName || "Individual"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="branchId">Receiving Branch Stock *</Label>
                <select
                  id="branchId"
                  name="branchId"
                  value={formData.branchId}
                  onChange={handleChange}
                  className="input text-sm bg-white"
                  required
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="invoiceNumber">Supplier Bill / Invoice #</Label>
                <Input
                  id="invoiceNumber"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleChange}
                  placeholder="e.g. SUP-INV-9988"
                  required
                />
              </div>
            </div>

            {/* Line Items Section */}
            <div className="mt-2 border rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Purchase Line Items & Sale Price Updates</h4>
                  <p className="text-[11px] text-slate-500">
                    Entering a new sale rate here automatically updates the item's retail price in the master catalog.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Product Line
                </Button>
              </div>

              {items.map((item, index) => {
                const prod = products.find((p) => p.id === item.productId);
                const currentSalePrice = prod ? Number(prod.sellingPrice || 0) : 0;
                const margin = item.newSellingPrice - item.purchaseRate;

                return (
                  <div key={index} className="flex flex-wrap gap-2.5 items-end bg-white p-3 rounded-lg border shadow-xs">
                    <div className="flex-1 min-w-[200px] space-y-1">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-semibold text-slate-700">Product *</Label>
                        {prod && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Current Rate: <strong className="text-slate-900">{formatCurrency(currentSalePrice)}</strong>
                          </span>
                        )}
                      </div>
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                        className="input text-xs bg-white"
                        required
                      >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) - Current Sale Rate: Rs. {p.sellingPrice}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24 space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Qty ({prod?.unit?.abbreviation || "Unit"}) *</Label>
                      <Input
                        type="number"
                        min="0.001"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                        className="text-xs font-mono font-bold"
                        required
                      />
                    </div>

                    <div className="w-28 space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Purchase Rate *</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="any"
                        value={item.purchaseRate || ""}
                        onChange={(e) => handleItemChange(index, "purchaseRate", Number(e.target.value))}
                        className="text-xs font-mono"
                        placeholder="Cost Rate"
                        required
                      />
                    </div>

                    {/* NEW SELLING PRICE INPUT FIELD */}
                    <div className="w-32 space-y-1 bg-amber-50/70 p-1.5 rounded-lg border border-amber-200">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-amber-700" /> New Sale Rate *
                        </Label>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={item.newSellingPrice || ""}
                        onChange={(e) => handleItemChange(index, "newSellingPrice", Number(e.target.value))}
                        className="text-xs font-mono font-bold bg-white text-amber-950 border-amber-300 focus:ring-amber-500"
                        placeholder="Retail Rate"
                        required
                      />
                      {item.purchaseRate > 0 && item.newSellingPrice > 0 && (
                        <div className="text-[10px] font-mono flex justify-between pt-0.5">
                          <span className="text-slate-500">Margin:</span>
                          <span className={margin >= 0 ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                            {margin >= 0 ? `+${formatCurrency(margin)}` : formatCurrency(margin)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="w-32 space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Line Subtotal</Label>
                      <Input
                        readOnly
                        value={formatCurrency(item.quantity * item.purchaseRate)}
                        className="bg-slate-50 text-xs font-bold font-mono text-slate-900"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="text-red-500 hover:text-red-700 h-9 w-9 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Financials & Payment Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <select
                    id="paymentMethod"
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    className="input text-sm bg-white mt-1"
                  >
                    <option value="CASH">💵 Cash Payment</option>
                    <option value="BANK_TRANSFER">🏦 Bank Transfer / Digital Wallet</option>
                  </select>
                </div>

                {formData.paymentMethod === "BANK_TRANSFER" && (
                  <div className="grid grid-cols-2 gap-2 bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                    <div>
                      <Label className="text-xs">Bank / Wallet *</Label>
                      <select
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleChange}
                        className="input text-xs bg-white mt-1"
                        required={formData.paymentMethod === "BANK_TRANSFER"}
                      >
                        <option value="">Select Bank</option>
                        {PAKISTANI_BANKS.map((b) => (
                          <option key={b.id} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs">TRX / Ref #</Label>
                      <Input
                        name="bankReference"
                        value={formData.bankReference}
                        onChange={handleChange}
                        placeholder="TRX-123456"
                        className="text-xs mt-1"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">Notes / Bill Description</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="e.g. Received new stock batch with revised retail selling rate"
                    className="text-xs h-20"
                  />
                </div>
              </div>

              {/* Total & Payable Summary Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
                    <span>Total Purchase Bill:</span>
                    <span className="text-base font-bold text-slate-900 font-mono">{formatCurrency(totalAmount)}</span>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="amountPaid" className="text-xs">
                      Amount Paid to Supplier (PKR)
                    </Label>
                    <Input
                      type="number"
                      id="amountPaid"
                      name="amountPaid"
                      min="0"
                      max={totalAmount}
                      step="any"
                      value={formData.amountPaid}
                      onChange={handleChange}
                      className="font-bold text-emerald-600 text-sm font-mono"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t text-sm font-bold font-mono">
                    <span className="text-slate-700">Pending Payable:</span>
                    <span className={pendingAmount > 0 ? "text-rose-600" : "text-emerald-600"}>
                      {formatCurrency(pendingAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 text-white font-semibold shadow-sm">
              {loading ? "Processing..." : "Save Purchase & Update Prices"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
