"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import ReturnCreateModal from "@/components/sales-returns/ReturnCreateModal";

export default function SalesReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    const res = await fetch("/api/sales-returns");
    const data = await res.json();
    setReturns(data || []);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Sales Returns</h1>
        <Button onClick={() => setIsCreateOpen(true)}>Process Return</Button>
      </div>

      <div className="bg-white rounded-md shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="p-4 font-medium text-gray-500">Reference No</th>
              <th className="p-4 font-medium text-gray-500">Date</th>
              <th className="p-4 font-medium text-gray-500">Branch</th>
              <th className="p-4 font-medium text-gray-500">Refund Method</th>
              <th className="p-4 font-medium text-gray-500">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r: any) => (
              <tr key={r.id} className="border-b">
                <td className="p-4">{r.referenceNo}</td>
                <td className="p-4">{formatDate(r.createdAt)}</td>
                <td className="p-4">{r.branch?.name || "N/A"}</td>
                <td className="p-4">
                  <Badge variant="outline">{r.refundMethod}</Badge>
                </td>
                <td className="p-4">{formatCurrency(r.totalRefundAmount)}</td>
              </tr>
            ))}
            {returns.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">No returns found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ReturnCreateModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={fetchReturns} 
      />
    </div>
  );
}
