"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExpenseFormModal } from "@/components/expenses/ExpenseFormModal";
import { ExpenseCategoryModal } from "@/components/expenses/ExpenseCategoryModal";
import { PlusCircle, Tags, Trash2, Filter, Receipt } from "lucide-react";

export default function ExpensesPage() {
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
          <h1 className="text-2xl font-bold text-slate-900">Operational Expenses & Cash Disbursements</h1>
          <p className="text-slate-500 text-sm">Track branch operational expenses, utility payments, and category totals.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)} className="text-xs font-semibold">
            <Tags className="mr-1.5 h-3.5 w-3.5" /> Manage Categories
          </Button>
          <Button onClick={() => setIsExpenseModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm">
            <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Record Expense
          </Button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900 uppercase">Date Period Filter</span>
          </div>

          {/* Filter Quick Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "this_week", label: "This Week" },
              { id: "this_month", label: "This Month" },
              { id: "last_month", label: "Last Month" },
              { id: "custom", label: "Custom Range" },
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

        {/* Custom Date Inputs */}
        {period === "custom" && (
          <form onSubmit={handleCustomApply} className="flex flex-wrap items-end gap-3 pt-1">
            <div>
              <Label className="text-xs font-semibold">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs py-1 px-2.5 mt-1 bg-slate-50"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs py-1 px-2.5 mt-1 bg-slate-50"
              />
            </div>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              Apply Custom Range
            </Button>
          </form>
        )}

        {/* Filter Summary Stats */}
        <div className="flex flex-wrap justify-between items-center text-xs font-semibold text-slate-600 pt-1">
          <span>Showing {expenses.length} expense record(s)</span>
          <span className="text-slate-900 font-mono">
            Total Expense: <strong className="text-rose-600 font-bold">{formatCurrency(totalExpenseAmount)}</strong>
          </span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b font-semibold uppercase">
              <tr>
                <th className="p-3.5">Date & Time</th>
                <th className="p-3.5">Expense Category</th>
                <th className="p-3.5">Branch</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5">Reference / TRX</th>
                <th className="p-3.5 text-right">Amount (PKR)</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No expense records found for the selected period.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-mono text-slate-600">{formatDate(expense.createdAt || expense.expenseDate)}</td>
                    <td className="p-3.5">
                      <Badge variant="outline" className="text-[11px] font-bold text-slate-900">
                        {expense.category?.name || "General"}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-slate-800 font-semibold">{expense.branch?.name || "Main Branch"}</td>
                    <td className="p-3.5">
                      <Badge variant={expense.paymentMethod === "CASH" ? "success" : "warning"} className="text-[10px] font-bold">
                        {expense.paymentMethod}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-slate-600 font-mono truncate max-w-xs">{expense.reference || expense.notes || "-"}</td>
                    <td className="p-3.5 text-right font-mono font-extrabold text-sm text-rose-600">
                      {formatCurrency(Number(expense.amount))}
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                        onClick={() => handleDelete(expense.id)}
                        title="Cancel Expense"
                      >
                        <Trash2 className="h-4 w-4" />
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
        onSuccess={() => {}}
      />
    </div>
  );
}
