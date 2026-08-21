"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import TransferCreateModal from "@/components/stock-transfers/TransferCreateModal";
import TransferReceiveModal from "@/components/stock-transfers/TransferReceiveModal";
import { Plus, ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";

export default function StockTransfersPage() {
  const t = useTranslations("stockTransfers");
  const tc = useTranslations("common");

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
    <div className="p-4 md:p-8 pt-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-blue-600" /> {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700 font-bold gap-1.5 shadow-sm">
          <Plus className="w-4 h-4" /> {t("newTransfer")}
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-600 border-b font-bold uppercase">
              <tr>
                <th className="h-11 px-4">{t("colRef")}</th>
                <th className="h-11 px-4">{t("colDate")}</th>
                <th className="h-11 px-4">{t("colFrom")}</th>
                <th className="h-11 px-4">{t("colTo")}</th>
                <th className="h-11 px-4 text-center">{t("colStatus")}</th>
                <th className="h-11 px-4 text-right">{t("colAction")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {transfers.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-4 font-mono font-bold text-blue-600">{item.transferNumber || item.id.slice(0, 8)}</td>
                  <td className="p-4 text-slate-600 font-mono">{formatDate(item.createdAt)}</td>
                  <td className="p-4 font-bold text-slate-900">{item.sourceBranch?.name || "-"}</td>
                  <td className="p-4 font-bold text-slate-900">{item.destBranch?.name || "-"}</td>
                  <td className="p-4 text-center">
                    <Badge variant={item.status === "PENDING" ? "warning" : "success"} className="text-[10px] font-bold">
                      {item.status === "PENDING" ? t("statusPending") : t("statusCompleted")}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    {item.status === "PENDING" && (
                      <Button variant="outline" size="sm" onClick={() => setSelectedTransfer(item)} className="text-xs h-7">
                        {t("receiveTransfer")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {t("noTransfers")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
