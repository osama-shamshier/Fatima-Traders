"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TableLoader } from "@/components/ui/loader";
import { FileSearch, Search, Shield } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function AuditLogsPage() {
  const t = useTranslations("auditLogs");
  const tc = useTranslations("common");

  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");

  useEffect(() => {
    fetchLogs();
  }, [moduleFilter]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (moduleFilter) params.append("module", moduleFilter);
      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) setLogs(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.module?.toLowerCase().includes(search.toLowerCase()) ||
      log.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" /> {t("title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("subtitle")}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-2xl shadow-xs border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 text-xs bg-white"
          />
        </div>

        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="input text-xs py-2 px-3 bg-slate-50 max-w-xs"
        >
          <option value="">{t("allModules")}</option>
          <option value="POS">POS / Sales</option>
          <option value="INVENTORY">Inventory</option>
          <option value="USERS">Users & Auth</option>
          <option value="EXPENSES">Expenses</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b font-bold uppercase">
              <tr>
                <th className="p-3.5">{t("colTime")}</th>
                <th className="p-3.5">{t("colUser")}</th>
                <th className="p-3.5">{t("colModule")}</th>
                <th className="p-3.5">{t("colAction")}</th>
                <th className="p-3.5">{t("colIp")}</th>
                <th className="p-3.5">{t("colDetails")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <TableLoader colSpan={6} text="Loading audit trail..." />
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <FileSearch className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {t("noLogs")}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="p-3.5 font-bold text-slate-900">{log.user?.name || "System"}</td>
                    <td className="p-3.5">
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {log.module}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <Badge variant={log.action === "DELETE" ? "danger" : "secondary"} className="text-[10px] font-mono">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">{log.ipAddress || "127.0.0.1"}</td>
                    <td className="p-3.5 text-slate-600 max-w-sm truncate">{log.details || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
