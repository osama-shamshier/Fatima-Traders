"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableLoader } from "@/components/ui/loader";
import { Database, Download, RefreshCw, HardDrive, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function BackupsPage() {
  const t = useTranslations("backups");
  const tc = useTranslations("common");

  const [backups, setBackups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/backups");
      if (res.ok) setBackups(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/backups", { method: "POST" });
      if (res.ok) {
        fetchBackups();
      } else {
        alert("Failed to generate database dump");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-emerald-600" /> {t("title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("subtitle")}</p>
        </div>
        <Button
          disabled={isCreating}
          onClick={handleCreateBackup}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
        >
          <Database className="w-4 h-4 me-1.5" /> {isCreating ? t("generating") : t("createBackup")}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-2xs rounded-2xl bg-white border border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500">{t("autoStatus")}</CardTitle>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold text-emerald-600">{t("autoStatusVal")}</div>
            <p className="text-xs text-slate-400 mt-1">{t("retention")}</p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs rounded-2xl bg-white border border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500">{t("dbEngine")}</CardTitle>
            <HardDrive className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold text-slate-900">PostgreSQL (Railway Managed)</div>
            <p className="text-xs text-slate-400 mt-1">Automatic WAL logs & snapshot support</p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs rounded-2xl bg-white border border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500">{t("totalBackups")}</CardTitle>
            <Database className="w-5 h-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-slate-900">{backups.length} Dumps</div>
            <p className="text-xs text-slate-400 mt-1">Compressed archives available</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">{t("historyTitle")}</h3>
          <Button variant="outline" size="sm" onClick={fetchBackups} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 me-1.5" /> {tc("refresh")}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b font-bold uppercase">
              <tr>
                <th className="p-3.5">{t("colFileName")}</th>
                <th className="p-3.5">{t("colDate")}</th>
                <th className="p-3.5">{t("colSize")}</th>
                <th className="p-3.5 text-center">{t("colType")}</th>
                <th className="p-3.5 text-right">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <TableLoader colSpan={5} text="Loading backups..." />
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    {t("noBackups")}
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-blue-600">{b.filename}</td>
                    <td className="p-3.5 font-mono text-slate-500">{formatDate(b.createdAt)}</td>
                    <td className="p-3.5 font-mono text-slate-700">{b.size ? `${(b.size / 1024).toFixed(1)} KB` : "1.2 MB"}</td>
                    <td className="p-3.5 text-center">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {b.type || "AUTOMATED"}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-emerald-600 hover:bg-emerald-50 gap-1"
                        onClick={() => alert(`Simulating download of ${b.filename}`)}
                      >
                        <Download className="w-3.5 h-3.5" /> {t("downloadSql")}
                      </Button>
                    </td>
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
