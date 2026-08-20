"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDate, translateExpenseCategory } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableLoader } from "@/components/ui/loader";
import { ExpenseFormModal } from "@/components/expenses/ExpenseFormModal";
import { ExpenseCategoryModal } from "@/components/expenses/ExpenseCategoryModal";
import { PlusCircle, Tags, Trash2, Filter, Receipt } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

export default function ExpensesPage() {
  const t = useTranslations("expenses");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isUrdu = locale === "ur";

  const [expenses, setExpenses] = useState<any[]>([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Date Filter State
  const [period, setPeriod] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period !== "all") params.append("period", period);
      if (period === "custom") {
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
      }

      const res = await fetch(`/api/expenses?${params.toString()}`);
      const data = await res.json();
      setExpenses(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [period]);

  const handleCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExpenses();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this expense?")) return;

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchExpenses();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-slate-500 text-sm">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)} className="text-xs font-semibold">
            <Tags className="me-1.5 h-3.5 w-3.5" /> {t("manageCategories")}
          </Button>
          <Button onClick={() => setIsExpenseModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm">
            <PlusCircle className="me-1.5 h-3.5 w-3.5" /> {t("recordExpense")}
          </Button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900 uppercase">{t("filterTitle")}</span>
          </div>

          {/* Filter Quick Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: tc("allTime") },
              { id: "today", label: tc("today") },
              { id: "this_week", label: tc("thisWeek") },
              { id: "this_month", label: tc("thisMonth") },
              { id: "last_month", label: tc("lastMonth") },
              { id: "custom", label: tc("customRange") },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  period === p.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Form */}
        {period === "custom" && (
          <form onSubmit={handleCustomApply} className="flex flex-wrap items-end gap-3 pt-1">
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">{tc("startDate")}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs py-1 px-2 bg-slate-50 mt-0.5"
                required
              />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">{tc("endDate")}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs py-1 px-2 bg-slate-50 mt-0.5"
                required
              />
            </div>
            <Button type="submit" size="sm" className="bg-blue-600 text-white text-xs font-semibold">
              {tc("apply")}
            </Button>
          </form>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-medium uppercase">{t("totalExpenses")}</span>
            <span className="text-2xl font-bold font-mono text-rose-600 block mt-1">
              {formatCurrency(totalExpenseAmount)}
            </span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-medium uppercase">{t("totalTransactions")}</span>
            <span className="text-2xl font-bold font-mono text-slate-900 block mt-1">
              {expenses.length}
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Expense Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b font-semibold uppercase">
              <tr>
                <th className="p-3.5">{t("colDate")}</th>
                <th className="p-3.5">{t("colCategory")}</th>
                <th className="p-3.5">{t("colBranch")}</th>
                <th className="p-3.5">{t("colMethod")}</th>
                <th className="p-3.5">{t("colBankRef")}</th>
                <th className="p-3.5">{t("colNotes")}</th>
                <th className="p-3.5 text-right">{t("colAmount")}</th>
                <th className="p-3.5 text-right">{t("colAction")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <TableLoader colSpan={8} text="Loading expenses..." />
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    {t("noExpenses")}
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">{formatDate(expense.createdAt || expense.expenseDate)}</td>
                    <td className="p-3.5">
                      <Badge variant="outline" className="text-[10px] font-bold text-slate-800">
                        {translateExpenseCategory(expense.category?.name, isUrdu)}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-slate-600">{expense.branch?.name || "-"}</td>
                    <td className="p-3.5">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {expense.paymentMethod}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-slate-600 font-mono">{expense.referenceNumber || "-"}</td>
                    <td className="p-3.5 text-slate-600 max-w-xs truncate">{expense.notes || "-"}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-rose-600 text-sm">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(expense.id)}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-7 w-7 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={fetchExpenses}
      />

      <ExpenseCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={fetchExpenses}
      />
    </div>
  );
}
