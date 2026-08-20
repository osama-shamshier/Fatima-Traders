"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";

export default function TransferCreateModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const t = useTranslations("stockTransfers");
  const tc = useTranslations("common");

  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    fromBranchId: "",
    toBranchId: "",
    notes: ""
  });
  const [items, setItems] = useState([{ productId: "", quantity: 1 }]);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/branches").then(res => res.json()).then(data => setBranches(Array.isArray(data) ? data : []));
      fetch("/api/products").then(res => res.json()).then(data => setProducts(Array.isArray(data) ? data : []));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fromBranchId || !formData.toBranchId) {
      alert("Please select both source and destination branches");
      return;
    }
    if (formData.fromBranchId === formData.toBranchId) {
      alert("Source and destination branch cannot be the same");
      return;
    }
    if (items.some(i => !i.productId || Number(i.quantity) <= 0)) {
      alert("Please select valid product and quantity for all items");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stock-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, items })
      });
      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[540px] bg-white rounded-2xl p-6">
        <DialogHeader className="border-b pb-3 mb-2">
          <DialogTitle className="text-xl font-bold text-slate-900">{t("modalCreateTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">{t("sourceBranch")} *</Label>
              <select
                required
                value={formData.fromBranchId}
                onChange={e => setFormData({...formData, fromBranchId: e.target.value})}
                className="input text-xs bg-white w-full"
              >
                <option value="">-- {tc("branch")} --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">{t("destBranch")} *</Label>
              <select
                required
                value={formData.toBranchId}
                onChange={e => setFormData({...formData, toBranchId: e.target.value})}
                className="input text-xs bg-white w-full"
              >
                <option value="">-- {tc("branch")} --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="space-y-2 border p-3 rounded-xl bg-slate-50">
            <Label className="text-xs font-semibold">{t("selectItems")}</Label>
            {items.map((item, index) => (
              <div key={index} className="flex gap-2 items-center">
                <select
                  required
                  value={item.productId}
                  onChange={e => {
                    const newItems = [...items];
                    newItems[index].productId = e.target.value;
                    setItems(newItems);
                  }}
                  className="input text-xs bg-white flex-1"
                >
                  <option value="">-- Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>

                <Input
                  type="number"
                  placeholder="Qty"
                  min="0.001"
                  step="any"
                  required
                  value={item.quantity}
                  onChange={e => {
                    const newItems = [...items];
                    newItems[index].quantity = Number(e.target.value);
                    setItems(newItems);
                  }}
                  className="w-24 text-xs font-bold text-center bg-white"
                />

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                    className="text-rose-500 hover:text-rose-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItems([...items, { productId: "", quantity: 1 }])}
              className="text-xs gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Product
            </Button>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">{tc("notes") || "Notes"}</Label>
            <Input
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="e.g. Weekly branch stock replenishment"
              className="text-xs bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              {loading ? tc("saving") : t("dispatchTransfer")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
