"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { TableLoader } from "@/components/ui/loader";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";
import { BuyerPaymentFormModal } from "@/components/buyer-payments/BuyerPaymentFormModal";

export default function BuyerPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/buyer-payments");
      const data = await res.json();
      setPayments(data);
    } catch (error) {
      console.error("Failed to fetch payments", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Buyer Payments</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Record Payment
        </Button>
      </div>

      <div className="bg-white rounded-md border">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4 text-left font-medium text-slate-500">Date</th>
              <th className="p-4 text-left font-medium text-slate-500">Buyer</th>
              <th className="p-4 text-left font-medium text-slate-500">Sale Ref</th>
              <th className="p-4 text-left font-medium text-slate-500">Method</th>
              <th className="p-4 text-left font-medium text-slate-500">Bank Ref</th>
              <th className="p-4 text-left font-medium text-slate-500">Notes</th>
              <th className="p-4 text-right font-medium text-slate-500">Amount (PKR)</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoader colSpan={7} text="Loading payments..." />
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-slate-500">No payments recorded.</td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="border-b hover:bg-slate-50">
                  <td className="p-4 text-sm">{formatDate(payment.paymentDate)}</td>
                  <td className="p-4 font-medium">{payment.buyer?.name || "-"}</td>
                  <td className="p-4 text-slate-600">{payment.sale?.invoiceNumber || "-"}</td>
                  <td className="p-4 text-slate-600">{payment.paymentMethod}</td>
                  <td className="p-4 text-slate-600">{payment.bankReference || "-"}</td>
                  <td className="p-4 text-slate-600 truncate max-w-[200px]">{payment.notes || "-"}</td>
                  <td className="p-4 text-right font-bold text-green-600">
                    {formatCurrency(payment.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <BuyerPaymentFormModal 
          isOpen={isFormOpen} 
          onClose={() => setIsFormOpen(false)} 
          onSuccess={fetchPayments} 
        />
      )}
    </div>
  );
}
