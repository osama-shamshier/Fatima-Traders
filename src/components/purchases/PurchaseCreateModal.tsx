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
import { useTranslations } from "next-intl";

interface PurchaseCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PurchaseCreateModal({ isOpen, onClose, onSuccess }: PurchaseCreateModalProps) {
  const t = useTranslations("purchases");
  const tc = useTranslations("common");

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
      if (suppRes.ok) {
        const sData = await suppRes.json();
        const sList = Array.isArray(sData) ? sData : [];
        setSuppliers(sList);
        if (sList.length > 0 && !formData.supplierId) {
          setFormData((prev) => ({ ...prev, supplierId: sList[0].id }));
        }
      }
      if (branchRes.ok) {
        const bData = await branchRes.json();
        const bList = Array.isArray(bData) ? bData : [];
        setBranches(bList);
        if (bList.length > 0 && !formData.branchId) {
          setFormData((prev) => ({ ...prev, branchId: bList[0].id }));
        }
      }
      if (prodRes.ok) {
        const pData = await prodRes.json();
        setProducts(Array.isArray(pData) ? pData : []);
      }
    } catch (error) {
      console.error("Error loading purchase modal dropdown data:", error);
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
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.purchaseRate) || 0), 0);
  };

  const totalAmount = calculateTotal();
  const balanceRemaining = Math.max(0, totalAmount - (Number(formData.amountPaid) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplierId || !formData.branchId) {
      alert("Please select both Supplier and Branch.");
      return;
    }

    if (items.some((i) => !i.productId || Number(i.quantity) <= 0 || Number(i.purchaseRate) < 0)) {
      alert("Please ensure all items have a valid Product, Quantity (>0), and Purchase Rate.");
      return;
    }

    setLoading(true);

    try {
      const refText = [
        formData.bankName ? `Bank: ${formData.bankName}` : null,
        formData.bankReference ? `Ref: ${formData.bankReference}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const payload = {
        ...formData,
        amountPaid: Number(formData.amountPaid) || 0,
        bankReference: refText || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          purchaseRate: Number(i.purchaseRate),
          newSellingPrice: Number(i.newSellingPrice) > 0 ? Number(i.newSellingPrice) : undefined,
        })),
      };

      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create purchase");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Error creating purchase bill");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl p-6 shadow-2xl overflow-hidden">
        <DialogHeader className="border-b pb-3 mb-2">
          <DialogTitle className="text-xl font-bold text-slate-900">{t("modalCreateTitle")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Header Info Section */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <Label className="text-xs font-semibold">{t("selectSupplier")} *</Label>
              <select
                name="supplierId"
                value={formData.supplierId}
                onChange={handleChange}
                className="input text-xs bg-white mt-1 w-full"
                required
              >
                <option value="">-- {t("selectSupplier")} --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.companyName ? `(${s.companyName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">{t("selectBranch")} *</Label>
              <select
                name="branchId"
                value={formData.branchId}
                onChange={handleChange}
                className="input text-xs bg-white mt-1 w-full"
                required
              >
                <option value="">-- {t("selectBranch")} --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">{t("invoiceNumber")}</Label>
              <Input
                name="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={handleChange}
                placeholder="e.g. INV-98231"
                className="text-xs bg-white mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">{t("purchaseDate")} *</Label>
              <Input
                type="date"
                name="purchaseDate"
                value={formData.purchaseDate}
                onChange={handleChange}
                className="text-xs bg-white mt-1"
                required
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-100/80 border-b flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {t("purchaseItems")}
              </h4>
              <Button type="button" size="sm" onClick={addItem} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                <Plus className="w-3.5 h-3.5 mr-1" /> {t("addItem")}
              </Button>
            </div>

            <div className="p-3 space-y-2.5">
              {items.map((item, index) => {
                const lineTotal = (Number(item.quantity) || 0) * (Number(item.purchaseRate) || 0);

                return (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-200">
                    <div className="sm:col-span-4">
                      <Label className="text-[10px] text-slate-500 font-semibold">{t("colProduct")} *</Label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                        className="input text-xs bg-white mt-0.5 w-full"
                        required
                      >
                        <option value="">-- {tc("search")} Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-[10px] text-slate-500 font-semibold">{t("colQuantity")} *</Label>
                      <Input
                        type="number"
                        step="any"
                        min="0.001"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                        className="text-xs bg-white mt-0.5 font-bold text-center"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-[10px] text-slate-500 font-semibold">{t("colPurchaseRate")} *</Label>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={item.purchaseRate}
                        onChange={(e) => handleItemChange(index, "purchaseRate", e.target.value)}
                        className="text-xs bg-white mt-0.5 font-mono font-bold text-right text-slate-900"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-[10px] text-blue-600 font-semibold flex items-center gap-0.5">
                        <Tag className="w-2.5 h-2.5" /> {t("colSellingPrice")}
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={item.newSellingPrice}
                        onChange={(e) => handleItemChange(index, "newSellingPrice", e.target.value)}
                        className="text-xs bg-white mt-0.5 font-mono font-bold text-right text-blue-600"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-3 sm:pt-0">
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block uppercase">{t("colLineTotal")}</span>
                        <span className="font-mono font-extrabold text-xs text-slate-900">
                          {formatCurrency(lineTotal)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="text-rose-500 hover:text-rose-700 disabled:opacity-30 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment & Remarks Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Left: Notes */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">{t("purchaseItems")} / {tc("notes") || "Remarks"}</Label>
              <Textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add supplier notes, freight details, or batch reference"
                className="text-xs bg-white min-h-[90px]"
              />
            </div>

            {/* Right: Payment Calculation */}
            <div className="space-y-3 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex justify-between items-center text-xs pb-2 border-b">
                <span className="font-bold text-slate-700 uppercase">{t("colTotalAmount")}:</span>
                <span className="text-lg font-black font-mono text-slate-900">{formatCurrency(totalAmount)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-semibold">{t("amountPaid")}</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    max={totalAmount}
                    name="amountPaid"
                    value={formData.amountPaid}
                    onChange={handleChange}
                    className="text-xs font-bold text-emerald-600 font-mono mt-0.5"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold">{t("paymentMethod")}</Label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    className="input text-xs bg-white mt-0.5 w-full"
                  >
                    <option value="CASH">{t("cash")}</option>
                    <option value="BANK_TRANSFER">{t("bank")}</option>
                  </select>
                </div>
              </div>

              {formData.paymentMethod === "BANK_TRANSFER" && Number(formData.amountPaid) > 0 && (
                <div className="grid grid-cols-2 gap-2 p-2 bg-blue-50/70 rounded-lg border border-blue-100 text-xs">
                  <div>
                    <Label className="text-[10px]">Bank / Wallet</Label>
                    <select
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleChange}
                      className="input text-xs bg-white mt-0.5 w-full"
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
                    <Label className="text-[10px]">TRX Ref #</Label>
                    <Input
                      name="bankReference"
                      value={formData.bankReference}
                      onChange={handleChange}
                      placeholder="TRX-12345"
                      className="text-xs bg-white mt-0.5"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center text-xs pt-1">
                <span className="font-semibold text-slate-500">{t("colOutstanding")}:</span>
                <span className={`font-mono font-bold ${balanceRemaining > 0 ? "text-rose-600 text-sm" : "text-emerald-600"}`}>
                  {formatCurrency(balanceRemaining)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm">
              {loading ? tc("saving") : t("savePurchase")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
