"use client";

import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PAKISTANI_BANKS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard, RefreshCw, DollarSign, User, Download, Calendar, X, FileText } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { useTranslations } from "next-intl";
import { generateLedgerPDF } from "@/lib/pdfExport";

interface BuyerLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  buyerId: string | null;
  buyerName?: string;
  onSuccess?: () => void;
}

export function BuyerLedgerModal({ isOpen, onClose, buyerId, buyerName, onSuccess }: BuyerLedgerModalProps) {
  const t = useTranslations("ledger");
  const tc = useTranslations("common");

  const [ledger, setLedger] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

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
      setStartDate("");
      setEndDate("");
    }
  }, [isOpen, buyerId]);

  const fetchLedger = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/buyers/${buyerId}/ledger`);
      if (res.ok) {
        const data = await res.json();
        setLedger(Array.isArray(data) ? data : []);
        if (data.length > 0) {
          const lastEntry = data[data.length - 1];
          setSettleForm((prev) => ({ ...prev, amount: String(Math.max(0, Number(lastEntry.balance))) }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch buyer ledger", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Date Filtering & Running Balance recalculation
  const { openingBalance, filteredLedger, periodDebit, periodCredit, closingBalance } = useMemo(() => {
    let openBal = 0;
    let entries: any[] = [];

    const start = startDate ? new Date(startDate + "T00:00:00") : null;
    const end = endDate ? new Date(endDate + "T23:59:59") : null;

    ledger.forEach((item) => {
      const itemDate = new Date(item.date);
      if (start && itemDate < start) {
        openBal += (Number(item.debit) || 0) - (Number(item.credit) || 0);
      } else if ((!start || itemDate >= start) && (!end || itemDate <= end)) {
        entries.push(item);
      }
    });

    let running = openBal;
    let pDebit = 0;
    let pCredit = 0;

    const recalculatedEntries = entries.map((item) => {
      const debit = Number(item.debit) || 0;
      const credit = Number(item.credit) || 0;
      pDebit += debit;
      pCredit += credit;
      running += debit - credit;
      return {
        ...item,
        calculatedBalance: running,
      };
    });

    return {
      openingBalance: openBal,
      filteredLedger: recalculatedEntries,
      periodDebit: pDebit,
      periodCredit: pCredit,
      closingBalance: running,
    };
  }, [ledger, startDate, endDate]);

  const handleDownloadPDF = () => {
    if (filteredLedger.length === 0 && openingBalance === 0) {
      alert("No ledger entries to export for selected dates.");
      return;
    }

    generateLedgerPDF({
      partyType: "Customer",
      partyName: buyerName || "Customer",
      startDate,
      endDate,
      openingBalance,
      periodDebit,
      periodCredit,
      closingBalance,
      entries: filteredLedger,
    });
  };

  const handleDownloadCSV = () => {
    if (filteredLedger.length === 0 && openingBalance === 0) {
      alert("No ledger entries to export for selected dates.");
      return;
    }

    const headers = ["Date", "Type", "Ref / Invoice #", "Description", "Debit (Invoiced)", "Credit (Received)", "Running Balance"];
    const rows: string[][] = [];

    if (startDate) {
      rows.push([startDate, "OPENING", "-", "Opening Balance Brought Forward", "0", "0", String(openingBalance)]);
    }

    filteredLedger.forEach((entry) => {
      rows.push([
        entry.date ? entry.date.split("T")[0] : "",
        entry.type || "",
        `"${entry.reference || ""}"`,
        `"${(entry.description || "").replace(/"/g, '""')}"`,
        String(entry.debit || 0),
        String(entry.credit || 0),
        String(entry.calculatedBalance || 0),
      ]);
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Ledger_${buyerName?.replace(/\s+/g, "_") || "Customer"}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const setPresetRange = (preset: "THIS_MONTH" | "LAST_30" | "ALL") => {
    const now = new Date();
    if (preset === "THIS_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "LAST_30") {
      const past30 = new Date();
      past30.setDate(past30.getDate() - 30);
      setStartDate(past30.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else {
      setStartDate("");
      setEndDate("");
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
      <DialogContent className="max-w-6xl w-full sm:max-w-6xl max-h-[94vh] flex flex-col bg-white rounded-2xl p-4 sm:p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="border-b pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
          <div className="flex-1">
            <DialogTitle className="text-base sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600 shrink-0" /> {t("title")} — {buyerName || "Customer"}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("subtitle", { name: buyerName || "Customer" })}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between md:justify-end gap-3">
            <div className="text-start md:text-end">
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold uppercase block">{t("closingBalance")}</span>
              <span className={`text-base sm:text-xl font-extrabold font-mono ${closingBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {formatCurrency(closingBalance)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCSV}
                disabled={filteredLedger.length === 0 && openingBalance === 0}
                className="text-xs font-semibold gap-1 border-slate-300 hover:bg-slate-50 h-8 px-2.5"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" /> {t("exportCsv")}
              </Button>

              <Button
                size="sm"
                onClick={handleDownloadPDF}
                disabled={filteredLedger.length === 0 && openingBalance === 0}
                className="text-xs font-semibold gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-xs h-8 px-2.5"
              >
                <FileText className="w-3.5 h-3.5" /> {t("printPdf")}
              </Button>

              <Button
                size="sm"
                onClick={() => setIsSettleOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3 shadow-xs"
              >
                <CreditCard className="w-3.5 h-3.5 me-1" /> {t("settleAccount")}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Date Filter Bar (Hidden in Print) */}
        <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200 mt-2 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> {t("filterDates")}:
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">{t("fromDate")}:</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-7 text-xs py-0 px-2 bg-white w-32 font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">{t("toDate")}:</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-7 text-xs py-0 px-2 bg-white w-32 font-medium"
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 px-2 py-1 rounded"
              >
                <X className="w-3 h-3" /> {tc("cancel")}
              </button>
            )}
          </div>

          {/* Quick Filter Presets */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPresetRange("THIS_MONTH")}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
            >
              {t("presetMonth")}
            </button>
            <button
              onClick={() => setPresetRange("LAST_30")}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
            >
              {t("preset30Days")}
            </button>
            <button
              onClick={() => setPresetRange("ALL")}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                !startDate && !endDate
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {t("presetAll")}
            </button>
          </div>
        </div>

        {/* Inline Settlement Form */}
        {isSettleOpen && (
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl my-2 space-y-3 shrink-0 print:hidden">
            <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
              <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" /> {t("settleModalTitle")}
              </h4>
              <button onClick={() => setIsSettleOpen(false)} className="text-xs text-slate-500 hover:text-slate-800 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">{t("settleAmountLabel")} *</Label>
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
                <Label className="text-xs font-semibold">{t("paymentMethod")} *</Label>
                <select
                  value={settleForm.paymentMethod}
                  onChange={(e) => setSettleForm({ ...settleForm, paymentMethod: e.target.value })}
                  className="input text-xs bg-white mt-1"
                >
                  <option value="CASH">{t("cash")}</option>
                  <option value="BANK_TRANSFER">{t("bankTransfer")}</option>
                </select>
              </div>

              {settleForm.paymentMethod === "BANK_TRANSFER" ? (
                <div>
                  <Label className="text-xs font-semibold">{t("selectBank")} *</Label>
                  <select
                    value={settleForm.bankName}
                    onChange={(e) => setSettleForm({ ...settleForm, bankName: e.target.value })}
                    className="input text-xs bg-white mt-1"
                    required={settleForm.paymentMethod === "BANK_TRANSFER"}
                  >
                    <option value="">{t("selectBank")}</option>
                    {PAKISTANI_BANKS.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <Label className="text-xs font-semibold">{t("colNotes")}</Label>
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
                  <Label className="text-xs font-semibold">{t("bankRef")}</Label>
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
                  {tc("cancel")}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                >
                  {isSubmitting ? t("saving") : t("saveSettlement")}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Printable / Viewable Ledger Content */}
        <div id="buyer-ledger-print-area" className="flex-1 overflow-y-auto mt-2 p-1">
          {/* Official Letterhead (Visible in Print / PDF) */}
          <div className="hidden print:block mb-6 border-b pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-wide uppercase">FATIMA TRADERS</h1>
                <p className="text-xs text-slate-600">Chemical & Packing Materials Store</p>
                <p className="text-xs text-slate-600">Purani Ghalla Mandi, Ahmad Pur East | Tel: 0334-7776934</p>
              </div>
              <div className="text-end">
                <h2 className="text-lg font-bold text-slate-900 uppercase">Customer Account Statement</h2>
                <p className="text-xs text-slate-500 font-mono">Date Generated: {formatDate(new Date())}</p>
                <p className="text-xs font-bold text-slate-800 mt-1">Customer: {buyerName || "Customer"}</p>
                <p className="text-[11px] text-blue-700 font-semibold font-mono mt-0.5">
                  Period: {startDate ? formatDate(startDate) : "Beginning"} — {endDate ? formatDate(endDate) : "Today"}
                </p>
              </div>
            </div>

            {/* Print Summary Metrics */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t text-xs">
              <div className="p-2 bg-slate-50 border rounded">
                <span className="text-slate-500 block text-[10px] uppercase">{t("openingBalance")}:</span>
                <strong className="text-slate-900 font-mono">{formatCurrency(openingBalance)}</strong>
              </div>
              <div className="p-2 bg-slate-50 border rounded">
                <span className="text-slate-500 block text-[10px] uppercase">{t("periodDebit")}:</span>
                <strong className="text-rose-700 font-mono">{formatCurrency(periodDebit)}</strong>
              </div>
              <div className="p-2 bg-slate-50 border rounded">
                <span className="text-slate-500 block text-[10px] uppercase">{t("periodCredit")}:</span>
                <strong className="text-emerald-700 font-mono">{formatCurrency(periodCredit)}</strong>
              </div>
              <div className="p-2 bg-slate-50 border rounded">
                <span className="text-slate-500 block text-[10px] uppercase">{t("closingBalance")}:</span>
                <strong className="text-rose-700 font-mono font-black">{formatCurrency(closingBalance)}</strong>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-xl bg-white shadow-xs overflow-x-auto w-full">
            {isLoading ? (
              <Loader text="Loading customer ledger..." className="py-12" />
            ) : (
              <table className="w-full text-xs text-left border-collapse min-w-[680px]">
                <thead className="bg-slate-50 sticky top-0 font-semibold border-b text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="p-3 w-28">{t("colDate")}</th>
                    <th className="p-3 w-24">{t("colType")}</th>
                    <th className="p-3 w-32">{t("colRef")}</th>
                    <th className="p-3 min-w-[120px]">{t("colNotes")}</th>
                    <th className="p-3 text-right w-28">{t("colDebit")}</th>
                    <th className="p-3 text-right w-28">{t("colCredit")}</th>
                    <th className="p-3 text-right w-32">{t("colBalance")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {/* Opening Balance Row if date filtered */}
                  {startDate && (
                    <tr className="bg-blue-50/40 font-bold border-b border-blue-100">
                      <td className="p-3 font-mono text-slate-600">{formatDate(startDate)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] uppercase font-black">
                          OPENING
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-400">-</td>
                      <td className="p-3 text-slate-800">{t("openingBalance")}</td>
                      <td className="p-3 text-right font-mono">-</td>
                      <td className="p-3 text-right font-mono">-</td>
                      <td className="p-3 text-right font-mono font-extrabold text-slate-900">
                        {formatCurrency(openingBalance)}
                      </td>
                    </tr>
                  )}

                  {filteredLedger.map((entry, index) => (
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
                          entry.calculatedBalance > 0 ? "text-slate-900" : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(entry.calculatedBalance)}
                      </td>
                    </tr>
                  ))}

                  {filteredLedger.length === 0 && openingBalance === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400">
                        {t("noEntries")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Printable Signature Footers */}
          <div className="hidden print:flex justify-between items-center mt-12 pt-6 border-t text-xs text-slate-600">
            <div>
              <p className="border-t border-slate-400 pt-1 w-44 text-center font-bold">Prepared By</p>
            </div>
            <div>
              <p className="border-t border-slate-400 pt-1 w-44 text-center font-bold">Customer Signature</p>
            </div>
            <div>
              <p className="border-t border-slate-400 pt-1 w-44 text-center font-bold">Authorized Signatory</p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 border-t pt-3 flex justify-between items-center shrink-0 print:hidden">
          <Button variant="outline" onClick={fetchLedger} size="sm">
            <RefreshCw className="w-3.5 h-3.5 me-1" /> {tc("refresh")}
          </Button>
          <Button variant="outline" onClick={onClose} size="sm">
            {tc("cancel")}
          </Button>
        </DialogFooter>

        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              background: white !important;
              color: black !important;
            }
            body * {
              visibility: hidden;
            }
            #buyer-ledger-print-area, #buyer-ledger-print-area * {
              visibility: visible;
            }
            #buyer-ledger-print-area {
              position: static !important;
              display: block !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            div[role="dialog"], div[role="dialog"] > div {
              position: static !important;
              transform: none !important;
              max-height: none !important;
              height: auto !important;
              overflow: visible !important;
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}} />
      </DialogContent>
    </Dialog>
  );
}
