"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import TransferCreateModal from "@/components/stock-transfers/TransferCreateModal";
import TransferReceiveModal from "@/components/stock-transfers/TransferReceiveModal";

export default function StockTransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    const res = await fetch("/api/stock-transfers");
    const data = await res.json();
    setTransfers(data || []);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Stock Transfers</h1>
        <Button onClick={() => setIsCreateOpen(true)}>New Transfer</Button>
      </div>

      <div className="bg-white rounded-md shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="p-4 font-medium text-gray-500">Reference No</th>
              <th className="p-4 font-medium text-gray-500">Date</th>
              <th className="p-4 font-medium text-gray-500">From Branch</th>
              <th className="p-4 font-medium text-gray-500">To Branch</th>
              <th className="p-4 font-medium text-gray-500">Status</th>
              <th className="p-4 font-medium text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t: any) => (
              <tr key={t.id} className="border-b">
                <td className="p-4">{t.transferNumber || t.id.slice(0, 8)}</td>
                <td className="p-4">{formatDate(t.createdAt)}</td>
                <td className="p-4">{t.sourceBranch?.name || "N/A"}</td>
                <td className="p-4">{t.destBranch?.name || "N/A"}</td>
                <td className="p-4">
                  <Badge variant={t.status === "PENDING" ? "warning" : "success"}>
                    {t.status}
                  </Badge>
                </td>
                <td className="p-4">
                  {t.status === "PENDING" && (
                    <Button variant="outline" size="sm" onClick={() => setSelectedTransfer(t)}>
                      Receive
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {transfers.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">No transfers found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TransferCreateModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={fetchTransfers} 
      />
      
      {selectedTransfer && (
        <TransferReceiveModal
          transfer={selectedTransfer}
          isOpen={!!selectedTransfer}
          onClose={() => setSelectedTransfer(null)}
          onSuccess={() => {
            setSelectedTransfer(null);
            fetchTransfers();
          }}
        />
      )}
    </div>
  );
}
