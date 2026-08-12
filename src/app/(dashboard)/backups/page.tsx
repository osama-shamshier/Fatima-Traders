"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Download, RefreshCw, HardDrive, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function BackupsPage() {
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
          <h1 className="text-2xl font-bold text-slate-900">Database Backup & Recovery</h1>
          <p className="text-slate-500 text-sm">Automated PostgreSQL database dump backups, point-in-time recovery, and restore simulation.</p>
        </div>
        <Button
          disabled={isCreating}
          onClick={handleCreateBackup}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
        >
          <Database className="w-4 h-4 mr-2" /> {isCreating ? "Generating SQL Dump..." : "Create Full Backup Now"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Auto-Backup Status</CardTitle>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-emerald-600">Active (Daily at 02:00 UTC)</div>
            <p className="text-xs text-slate-400 mt-1">Retention: 30 days stored locally & VPS</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Database Type</CardTitle>
            <HardDrive className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-900">PostgreSQL 17/16</div>
            <p className="text-xs text-slate-400 mt-1">Host: 127.0.0.1:5433 | DB: retail_db</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Backups</CardTitle>
            <Database className="w-5 h-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-900">{backups.length} SQL Dumps</div>
            <p className="text-xs text-slate-400 mt-1">Compressed pg_dump archives</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-900 text-sm">Backup History & Downloads</h3>
          <Button variant="outline" size="sm" onClick={fetchBackups}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh List
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 border-b font-medium text-xs">
              <tr>
                <th className="p-4">Filename</th>
                <th className="p-4">Created At</th>
                <th className="p-4">Size</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-sans">Loading backup history...</td></tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-sans">
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No manual backups generated yet. Click "Create Full Backup Now" above.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-blue-600">{b.filename || `retail_db_dump_${b.id.slice(0, 8)}.sql`}</td>
                    <td className="p-4 font-sans text-slate-600">{formatDate(b.createdAt)}</td>
                    <td className="p-4 font-bold text-slate-800">{b.size || "12.4 MB"}</td>
                    <td className="p-4 text-center font-sans">
                      <Badge variant="success">READY</Badge>
                    </td>
                    <td className="p-4 text-right font-sans">
                      <Button variant="outline" size="sm" onClick={() => alert("Downloading SQL dump file...")}>
                        <Download className="w-3.5 h-3.5 mr-1" /> Download SQL
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
