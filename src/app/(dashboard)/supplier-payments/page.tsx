"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableLoader } from "@/components/ui/loader";
import { PAKISTANI_BANKS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard, Plus, Truck, RefreshCw, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

export default function SupplierPaymentsPage() {
  const t = useTranslations("supplierPayments");
  const tc = useTranslations("common");

  const [payments, setPayments] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");

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
      if (res.ok) {
        const data = await res.json();
        setPayments(Array.isArray(data) ? data : []);
      }
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

  const filteredPayments = payments.filter((p) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.supplier?.name?.toLowerCase().includes(q) ||
      p.supplier?.companyName?.toLowerCase().includes(q) ||
      p.purchase?.invoiceNumber?.toLowerCase().includes(q) ||
      p.bankReference?.toLowerCase().includes(q) ||
      p.notes?.toLowerCase().includes(q);

    const matchesMethod = methodFilter === "ALL" || p.paymentMethod === methodFilter;

    return matchesSearch && matchesMethod;
  });

  const totalDisbursed = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

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
    <div className="space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-blue-600" /> {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> {t("recordPayment")}
        </Button>
      </div>

      {/* Search Bar & Method Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-7 relative">
          <Search className="absolute start-3.5 top-3 w-4 h-4 text-slate-400" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10 pe-9 text-xs bg-white border-slate-200 shadow-xs h-10 rounded-xl"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute end-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Method Filter Pills */}
        <div className="sm:col-span-5 flex gap-1.5 overflow-x-auto justify-start sm:justify-end">
          {[
            { id: "ALL", label: t("allPayments") },
            { id: "CASH", label: t("cash") },
            { id: "BANK_TRANSFER", label: t("bank") },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setMethodFilter(pill.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                methodFilter === pill.id
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex justify-between items-center text-xs">
          <span className="text-slate-500 font-semibold">{t("totalDisbursed")}:</span>
          <span className="text-base font-extrabold font-mono text-rose-600">
            {formatCurrency(totalDisbursed)}
          </span>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex justify-between items-center text-xs">
          <span className="text-slate-500 font-semibold">{t("totalCount")}:</span>
          <span className="text-base font-extrabold font-mono text-blue-700">
            {payments.length}
          </span>
        </div>
      </div>

      {/* Supplier Payment Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50/80">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            {t("historyTitle")} ({filteredPayments.length})
          </h3>
          <Button variant="outline" size="sm" onClick={fetchPayments} className="h-7 text-xs">
            <RefreshCw className="w-3.5 h-3.5 me-1" /> {tc("refresh")}
          </Button>
        </div>

        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-600 border-b font-bold uppercase">
              <tr>
                <th className="h-11 px-4">{t("colDate")}</th>
                <th className="h-11 px-4">{t("colSupplier")}</th>
                <th className="h-11 px-4">{t("colBill")}</th>
                <th className="h-11 px-4">{t("colMethod")}</th>
                <th className="h-11 px-4">{t("colBankRef")}</th>
                <th className="h-11 px-4 text-right">{t("colAmount")}</th>
                <th className="h-11 px-4">{t("colNotes")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <TableLoader colSpan={7} text="Loading supplier payments..." />
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {search || methodFilter !== "ALL"
                      ? t("noPayments")
                      : t("noPayments")}
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 whitespace-nowrap text-slate-600 font-mono">
                      {formatDate(p.createdAt || p.paymentDate)}
                    </td>
                    <td className="p-4 font-bold text-slate-900">
                      {p.supplier?.name}
                      {p.supplier?.companyName && (
                        <span className="text-[10px] text-slate-400 font-normal block">
                          {p.supplier.companyName}
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-bold font-mono text-blue-600">
                      {p.purchase?.invoiceNumber ? `#${p.purchase.invoiceNumber}` : t("generalAccount")}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="text-[11px] font-bold">
                        {p.paymentMethod}
                      </Badge>
                    </td>
                    <td className="p-4 text-slate-600 font-mono text-xs">{p.bankReference || "-"}</td>
                    <td className="p-4 text-right font-extrabold font-mono text-rose-600 text-sm">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="p-4 text-slate-500 truncate max-w-xs">{p.notes || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Supplier Payment Modal */}
      {isModalOpen && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="modal-content max-w-md w-full p-6 bg-white rounded-2xl shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b">{t("modalTitle")}</h3>
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <Label className="text-xs font-semibold">{t("selectSupplier")} *</Label>
                <select
                  required
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value, purchaseId: "" })}
                  className="input text-xs bg-white mt-1 w-full"
                >
                  <option value="">-- {t("selectSupplier")} --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.companyName || "Individual"})
                    </option>
                  ))}
                </select>
              </div>

              {formData.supplierId && filteredPurchases.length > 0 && (
                <div>
                  <Label className="text-xs font-semibold">{t("outstandingBill")}</Label>
                  <select
                    value={formData.purchaseId}
                    onChange={(e) => setFormData({ ...formData, purchaseId: e.target.value })}
                    className="input text-xs bg-white mt-1 w-full"
                  >
                    <option value="">{t("generalAccount")}</option>
                    {filteredPurchases.map((p) => (
                      <option key={p.id} value={p.id}>
                        Bill #{p.invoiceNumber} - {tc("pending")}: {formatCurrency(p.outstandingAmount)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold">{t("amountPaid")} *</Label>
                <Input
                  type="number"
                  step="any"
                  required
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="font-bold text-rose-600 text-base mt-1 bg-white"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">{t("colMethod")} *</Label>
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
                    <Label className="text-xs font-semibold">{tc("selectBank") || "Pakistani Bank / Wallet"} *</Label>
                    <select
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="input text-xs bg-white mt-1 w-full"
                      required={formData.paymentMethod === "BANK_TRANSFER"}
                    >
                      <option value="">-- Select Bank / Wallet --</option>
                      {PAKISTANI_BANKS.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">{t("colBankRef")}</Label>
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
                <Label className="text-xs font-semibold">{t("colNotes")}</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Bank cheque # / Transfer receipt"
                  className="mt-1 text-xs bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  {tc("cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  {isSubmitting ? tc("saving") : t("savePayment")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
