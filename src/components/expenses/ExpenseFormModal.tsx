"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PAKISTANI_BANKS } from "@/lib/constants";
import { translateExpenseCategory } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import { recordOfflineExpense } from "@/lib/offline/cacheService";
import { getAllFromStore, putManyInStore } from "@/lib/offline/db";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExpenseFormModal({ isOpen, onClose, onSuccess }: Props) {
  const t = useTranslations("expenses");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isUrdu = locale === "ur";

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    branchId: "",
    categoryId: "",
    amount: "",
    paymentMethod: "CASH",
    bankName: "",
    bankReference: "",
    expenseDate: new Date().toISOString().split("T")[0],
    referenceNumber: "",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        fetch("/api/expense-categories")
          .then((r) => r.json())
          .then((cats) => {
            setCategories(cats);
            putManyInStore("expense_categories", cats).catch(() => {});
          })
          .catch(console.error);

        fetch("/api/branches")
          .then((r) => r.json())
          .then((bList) => {
            setBranches(bList);
            if (bList.length > 0) {
              setFormData((prev) => ({ ...prev, branchId: bList[0].id }));
            }
          })
          .catch(console.error);
      } else {
        // Offline fallback
        getAllFromStore("expense_categories")
          .then(setCategories)
          .catch(console.error);
        getAllFromStore("branches")
          .then((bList) => {
            setBranches(bList);
            if (bList.length > 0) {
              setFormData((prev) => ({ ...prev, branchId: bList[0].id }));
            }
          })
          .catch(console.error);
      }
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) {
      alert("Please select an expense category");
      return;
    }
    const amountNum = Number(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid expense amount");
      return;
    }

    setLoading(true);
    let isOffline = typeof navigator !== "undefined" && !navigator.onLine;

    try {
      if (!isOffline) {
        try {
          const response = await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...formData,
              amount: amountNum,
            }),
          });

          if (response.ok) {
            setFormData({
              branchId: branches[0]?.id || "",
              categoryId: "",
              amount: "",
              paymentMethod: "CASH",
              bankName: "",
              bankReference: "",
              expenseDate: new Date().toISOString().split("T")[0],
              referenceNumber: "",
              notes: "",
            });
            onSuccess();
            onClose();
            return;
          } else {
            const err = await response.json().catch(() => ({}));
            alert(`Failed to record expense: ${err.error || "Server error"}`);
            return;
          }
        } catch (netErr) {
          console.warn("Online expense creation failed, saving offline:", netErr);
          isOffline = true;
        }
      }

      if (isOffline) {
        const catObj = categories.find((c) => c.id === formData.categoryId);
        await recordOfflineExpense({
          ...formData,
          amount: amountNum,
          categoryName: catObj?.name,
          date: formData.expenseDate,
        });

        setFormData({
          branchId: branches[0]?.id || "",
          categoryId: "",
          amount: "",
          paymentMethod: "CASH",
          bankName: "",
          bankReference: "",
          expenseDate: new Date().toISOString().split("T")[0],
          referenceNumber: "",
          notes: "",
        });
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error(error);
      alert("Error occurred while recording expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px] bg-white rounded-2xl p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-bold text-slate-900">{t("modalRecordTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">{t("selectBranch")} *</Label>
              <select
                required
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="input text-xs bg-white mt-1 w-full"
              >
                <option value="">{t("selectBranch")}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">{t("selectCategory")} *</Label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="input text-xs bg-white mt-1 w-full"
              >
                <option value="">{t("chooseCategory")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {translateExpenseCategory(c.name, isUrdu)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">{t("amountPkr")} *</Label>
              <Input
                type="number"
                step="any"
                required
                min="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="text-base font-bold text-rose-600 mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">{t("expenseDate")}</Label>
              <Input
                type="date"
                required
                value={formData.expenseDate}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                className="text-xs mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">{t("paymentMethod")} *</Label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="input text-xs bg-white mt-1 w-full"
            >
              <option value="CASH">{t("cash")}</option>
              <option value="BANK_TRANSFER">{t("bank")}</option>
            </select>
          </div>

          {formData.paymentMethod === "BANK_TRANSFER" && (
            <div className="space-y-3 bg-blue-50/60 p-3 rounded-xl border border-blue-100">
              <div>
                <Label className="text-xs">{t("selectBank")}</Label>
                <select
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="input text-xs bg-white mt-1 w-full"
                  required={formData.paymentMethod === "BANK_TRANSFER"}
                >
                  <option value="">-- {t("selectBank")} --</option>
                  {PAKISTANI_BANKS.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs">{t("trxRef")}</Label>
                <Input
                  placeholder="TRX-123456"
                  value={formData.bankReference}
                  onChange={(e) => setFormData({ ...formData, bankReference: e.target.value })}
                  className="text-xs mt-1 bg-white font-mono"
                />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold">{t("notesPurpose")}</Label>
            <Textarea
              placeholder="e.g. Monthly shop rent payment or electricity bill receipt"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="text-xs mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="bg-rose-600 hover:bg-rose-700 text-white font-semibold">
              {loading ? tc("saving") : t("saveExpense")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
