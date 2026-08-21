"use client";

import { useEffect, useState } from "react";
import { BranchFormModal } from "@/components/branches/BranchFormModal";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TableLoader } from "@/components/ui/loader";
import { useTranslations } from "next-intl";

export default function BranchesPage() {
  const t = useTranslations("branches");
  const tc = useTranslations("common");

  const [branches, setBranches] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/branches");
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
      }
    } catch (error) {
      console.error("Failed to fetch branches", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this branch?")) return;
    try {
      const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchBranches();
      }
    } catch (error) {
      console.error("Failed to delete branch", error);
    }
  };

  return (
    <div className="p-4 md:p-8 pt-6 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" /> {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        <Button onClick={() => { setEditingBranch(null); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 font-bold gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" /> {t("addBranch")}
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50/80 text-slate-600 border-b font-bold uppercase">
            <tr>
              <th className="px-4 py-3.5">{t("colBranchName")}</th>
              <th className="px-4 py-3.5">{t("colAddress")}</th>
              <th className="px-4 py-3.5">{t("colPhone")}</th>
              <th className="px-4 py-3.5">{t("colUsers")}</th>
              <th className="px-4 py-3.5">{t("colCounters")}</th>
              <th className="px-4 py-3.5">{t("colStatus")}</th>
              <th className="px-4 py-3.5 text-right">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {isLoading ? (
              <TableLoader colSpan={7} text="Loading branches..." />
            ) : branches.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-slate-400">{t("noBranches")}</td></tr>
            ) : (
              branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-900">{branch.name}</td>
                  <td className="px-4 py-3.5 text-slate-600">{branch.address || "-"}</td>
                  <td className="px-4 py-3.5 font-mono text-slate-600">{branch.phone || "-"}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-blue-600">{branch._count?.users || 0}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-purple-600">{branch._count?.cashCounters || 0}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant={branch.isActive ? "success" : "outline"}>
                      {branch.isActive ? t("active") : t("inactive")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingBranch(branch); setIsModalOpen(true); }} className="h-7 w-7 p-0">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600" onClick={() => handleDelete(branch.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <BranchFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        branch={editingBranch}
        onSuccess={fetchBranches}
      />
    </div>
  );
}
