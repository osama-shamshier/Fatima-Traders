"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PAKISTANI_BANKS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Tag, AlertCircle, Save, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { getOfflineSuppliers, getOfflineProducts } from "@/lib/offline/cacheService";
import { getAllFromStore } from "@/lib/offline/db";

interface PurchaseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchaseId: string | null;
}

interface PurchaseEditItem {
  productId: string;
  quantity: number;
  purchaseRate: number;
  newSellingPrice: number;
  consumedQty?: number;
  productName?: string;
}

export function PurchaseEditModal({ isOpen, onClose, onSuccess, purchaseId }: PurchaseEditModalProps) {
  const t = useTranslations("purchases");
  const tc = useTranslations("common");

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
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

  const [items, setItems] = useState<PurchaseEditItem[]>([]);
  const [hasConsumedItems, setHasConsumedItems] = useState(false);

  useEffect(() => {
    if (isOpen && purchaseId) {
      loadInitialData();
    }
  }, [isOpen, purchaseId]);

  const loadInitialData = async () => {
    setFetching(true);
    try {
      // 1. Fetch dropdown options (suppliers, branches, products)
      const [suppRes, branchRes, prodRes] = await Promise.all([
        fetch("/api/suppliers", { signal: AbortSignal.timeout(5000) }).catch(() => null),
        fetch("/api/branches", { signal: AbortSignal.timeout(5000) }).catch(() => null),
        fetch("/api/products", { signal: AbortSignal.timeout(5000) }).catch(() => null),
      ]);

      let sList = suppRes && suppRes.ok ? await suppRes.json() : await getOfflineSuppliers().catch(() => []);
      let bList = branchRes && branchRes.ok ? await branchRes.json() : await getAllFromStore<any>("branches").catch(() => []);
      let pList = prodRes && prodRes.ok ? await prodRes.json() : await getOfflineProducts().catch(() => []);

      setSuppliers(Array.isArray(sList) ? sList : []);
      setBranches(Array.isArray(bList) ? bList : []);
      setProducts(Array.isArray(pList) ? pList : []);

      // 2. Fetch purchase record
      const res = await fetch(`/api/purchases/${purchaseId}`);
      if (!res.ok) {
        throw new Error("Failed to load purchase details.");
      }
      const data = await res.json();

      const pDate = data.purchaseDate ? new Date(data.purchaseDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

      // Parse payment info
      const initialPayment = data.payments && data.payments.length > 0 ? data.payments[0] : null;
      let bankName = "";
      let bankRef = initialPayment?.bankReference || "";
      if (bankRef.includes("Bank: ")) {
        const parts = bankRef.split(" | ");
        const bPart = parts.find((p: string) => p.startsWith("Bank: "));
        const rPart = parts.find((p: string) => p.startsWith("Ref: "));
        if (bPart) bankName = bPart.replace("Bank: ", "").trim();
        if (rPart) bankRef = rPart.replace("Ref: ", "").trim();
      }

      setFormData({
        supplierId: data.supplierId || "",
        branchId: data.branchId || "",
        invoiceNumber: data.invoiceNumber || "",
        purchaseDate: pDate,
        amountPaid: Number(data.amountPaid || 0),
        paymentMethod: initialPayment?.paymentMethod || "CASH",
        bankName,
        bankReference: bankRef,
        notes: data.notes || "",
      });

      // Parse items and detect consumed quantities
      let anyConsumed = false;
      const parsedItems: PurchaseEditItem[] = (data.items || []).map((it: any) => {
        let consumed = 0;
        if (it.inventoryLayers && Array.isArray(it.inventoryLayers)) {
          for (const l of it.inventoryLayers) {
            const initQty = Number(l.quantity || 0);
            const remQty = Number(l.remainingQty || 0);
            const diff = initQty - remQty;
            if (diff > 0.0001) consumed += diff;
          }
        }
        if (consumed > 0.0001) anyConsumed = true;

        return {
          productId: it.productId,
          quantity: Number(it.quantity || 0),
          purchaseRate: Number(it.purchaseRate || 0),
          newSellingPrice: Number(it.product?.sellingPrice || 0),
          consumedQty: consumed,
          productName: it.product?.name || "",
        };
      });

      setItems(parsedItems.length > 0 ? parsedItems : [{ productId: "", quantity: 1, purchaseRate: 0, newSellingPrice: 0 }]);
      setHasConsumedItems(anyConsumed);
    } catch (err: any) {
      console.error("Error loading purchase for edit:", err);
      alert(err.message || "Failed to load purchase details for editing.");
      onClose();
    } finally {
      setFetching(false);
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
        newItems[index].productName = p.name;
      }
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { productId: "", quantity: 1, purchaseRate: 0, newSellingPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    const item = items[index];
    if (item && item.consumedQty && item.consumedQty > 0) {
      alert(`Cannot remove "${item.productName || "this product"}" because ${item.consumedQty} unit(s) have already been sold in customer sales.`);
      return;
    }
    if (items.length === 1) {
      alert("A purchase bill must have at least one line item.");
      return;
    }
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

    if (items.length === 0) {
      alert("Please add at least one line item.");
      return;
    }

    for (const i of items) {
      if (!i.productId) {
        alert("Please ensure all items have a valid Product selected.");
        return;
      }
      if (Number(i.quantity) <= 0) {
        alert("Item quantity must be greater than 0.");
        return;
      }
      if (i.consumedQty && Number(i.quantity) < i.consumedQty) {
        alert(`Cannot reduce quantity of "${i.productName || "product"}" below ${i.consumedQty} because ${i.consumedQty} unit(s) have already been sold.`);
        return;
      }
      if (Number(i.purchaseRate) < 0) {
        alert("Purchase rate cannot be negative.");
        return;
      }
    }

    setLoading(true);

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

    try {
      const res = await fetch(`/api/purchases/${purchaseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update purchase bill.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error updating purchase:", err);
      alert(err.message || "Failed to update purchase bill.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl p-6 shadow-2xl overflow-hidden">
        <DialogHeader className="border-b pb-3 mb-2 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Edit Purchase Bill
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Modify invoice details, rates, and items. Inventory batches and supplier balances will update automatically.
            </p>
          </div>
        </DialogHeader>

        {fetching ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <span className="text-xs font-semibold">Loading purchase details...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
            {hasConsumedItems && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-800 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">Partially Sold Batch Notice:</span> Some items from this purchase have already been sold in customer sales. Locked products cannot be changed, and quantities cannot be reduced below the sold amounts.
                </div>
              </div>
            )}

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
                  disabled={hasConsumedItems}
                  className={`input text-xs mt-1 w-full ${hasConsumedItems ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
                  required
                >
                  <option value="">-- {t("selectBranch")} --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {hasConsumedItems && (
                  <span className="text-[10px] text-amber-700 block mt-0.5">Locked (items already sold)</span>
                )}
              </div>

              <div>
                <Label className="text-xs font-semibold">{t("invoiceNumber")}</Label>
                <Input
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleChange}
                  placeholder="e.g. INV-2026-001"
                  className="bg-white mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">{t("purchaseDate")} *</Label>
                <Input
                  type="date"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  className="bg-white mt-1 text-xs"
                  required
                />
              </div>
            </div>

            {/* Line Items Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t("purchaseItems")}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="h-7 text-xs font-semibold gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="w-3.5 h-3.5" /> {t("addItem")}
                </Button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b font-semibold text-slate-600">
                    <tr>
                      <th className="p-2.5 ps-3">{t("colProduct")} *</th>
                      <th className="p-2.5 w-24 text-right">{t("colQuantity")} *</th>
                      <th className="p-2.5 w-28 text-right">{t("colPurchaseRate")} *</th>
                      <th className="p-2.5 w-28 text-right">{t("colSellingPrice")}</th>
                      <th className="p-2.5 w-28 text-right">{t("colLineTotal")}</th>
                      <th className="p-2.5 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => {
                      const lineTotal = (Number(item.quantity) || 0) * (Number(item.purchaseRate) || 0);
                      const isItemLocked = !!(item.consumedQty && item.consumedQty > 0);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2 ps-3">
                            <select
                              value={item.productId}
                              onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                              disabled={isItemLocked}
                              className={`input text-xs w-full ${isItemLocked ? "bg-slate-100 text-slate-600 cursor-not-allowed" : "bg-white"}`}
                              required
                            >
                              <option value="">-- {t("colProduct")} --</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} {p.sku ? `(${p.sku})` : ""}
                                </option>
                              ))}
                            </select>
                            {isItemLocked && (
                              <span className="text-[10px] text-amber-700 block mt-0.5 font-medium">
                                ⚠️ {item.consumedQty} unit(s) already sold
                              </span>
                            )}
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min={isItemLocked ? item.consumedQty : 0.0001}
                              step="any"
                              value={item.quantity || ""}
                              onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                              className="text-right text-xs bg-white"
                              required
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={item.purchaseRate || ""}
                              onChange={(e) => handleItemChange(idx, "purchaseRate", e.target.value)}
                              className="text-right text-xs bg-white"
                              required
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={item.newSellingPrice || ""}
                              onChange={(e) => handleItemChange(idx, "newSellingPrice", e.target.value)}
                              className="text-right text-xs bg-white text-emerald-700 font-semibold"
                              placeholder="Optional"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900 pe-3">
                            {formatCurrency(lineTotal)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              disabled={isItemLocked}
                              className={`text-slate-400 hover:text-rose-600 transition-colors ${isItemLocked ? "opacity-30 cursor-not-allowed" : ""}`}
                              title={isItemLocked ? "Cannot remove sold item" : "Remove Line"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Details Section */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                {t("paymentDetails")}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold">{t("amountPaid")}</Label>
                  <Input
                    type="number"
                    min="0"
                    max={totalAmount}
                    step="any"
                    name="amountPaid"
                    value={formData.amountPaid || ""}
                    onChange={handleChange}
                    className="text-xs bg-white mt-1 font-mono font-bold text-emerald-600"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">{t("paymentMethod")}</Label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    className="input text-xs bg-white mt-1 w-full"
                  >
                    <option value="CASH">{t("cash")}</option>
                    <option value="BANK_TRANSFER">{t("bank")}</option>
                    <option value="CHEQUE">📝 Cheque</option>
                  </select>
                </div>

                {formData.paymentMethod !== "CASH" && (
                  <div>
                    <Label className="text-xs font-semibold">Select Bank</Label>
                    <select
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleChange}
                      className="input text-xs bg-white mt-1 w-full"
                    >
                      <option value="">-- Choose Pakistani Bank --</option>
                      {PAKISTANI_BANKS.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {formData.paymentMethod !== "CASH" && (
                <div>
                  <Label className="text-xs font-semibold">Transaction / Cheque / Bank Ref #</Label>
                  <Input
                    name="bankReference"
                    value={formData.bankReference}
                    onChange={handleChange}
                    placeholder="e.g. IBFT-987654321 / Cheque # 1004"
                    className="text-xs bg-white mt-1"
                  />
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div>
              <Label className="text-xs font-semibold">{tc("notes")}</Label>
              <Textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Purchase remarks, delivery details, vehicle number..."
                rows={2}
                className="text-xs bg-white mt-1"
              />
            </div>

            {/* Summary Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-900 text-white rounded-xl gap-3">
              <div className="flex gap-6 text-xs">
                <div>
                  <span className="text-slate-400 block">{t("colTotalAmount")}:</span>
                  <span className="font-extrabold font-mono text-base">{formatCurrency(totalAmount)}</span>
                </div>
                <div>
                  <span className="text-emerald-400 block">{t("colPaid")}:</span>
                  <span className="font-extrabold font-mono text-base text-emerald-400">
                    {formatCurrency(Number(formData.amountPaid) || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-rose-400 block">{t("colOutstanding")}:</span>
                  <span className="font-extrabold font-mono text-base text-rose-400">
                    {formatCurrency(balanceRemaining)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="text-xs bg-transparent text-white border-slate-700 hover:bg-slate-800">
                  {tc("cancel")}
                </Button>
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-xs font-bold gap-1.5 shadow-sm">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save & Recalculate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
