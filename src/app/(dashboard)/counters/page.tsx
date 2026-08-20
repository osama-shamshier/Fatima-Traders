"use client";

import { useEffect, useState } from "react";
import { CounterFormModal } from "@/components/counters/CounterFormModal";
import { OpenSessionModal } from "@/components/counters/OpenSessionModal";
import { CloseSessionModal } from "@/components/counters/CloseSessionModal";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, KeyRound, LockKeyhole, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TableLoader } from "@/components/ui/loader";
import { useTranslations } from "next-intl";

export default function CountersPage() {
  const t = useTranslations("counters");
  const tc = useTranslations("common");

  const [counters, setCounters] = useState<any[]>([]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isOpenSessionModalOpen, setIsOpenSessionModalOpen] = useState(false);
  const [isCloseSessionModalOpen, setIsCloseSessionModalOpen] = useState(false);
  const [editingCounter, setEditingCounter] = useState<any>(null);
  const [sessionCounter, setSessionCounter] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCounters = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/counters");
      if (res.ok) {
        const data = await res.json();
        setCounters(data);
      }
    } catch (error) {
      console.error("Failed to fetch counters", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCounters();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this counter?")) return;
    try {
      const res = await fetch(`/api/counters/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchCounters();
      }
    } catch (error) {
      console.error("Failed to delete counter", error);
    }
  };

  return (
    <div className="p-4 md:p-8 pt-6 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Monitor className="w-7 h-7 text-blue-600" /> {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        <Button onClick={() => { setEditingCounter(null); setIsFormModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 font-bold gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" /> {t("addCounter")}
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50/80 text-slate-600 border-b font-bold uppercase">
            <tr>
              <th className="px-4 py-3.5">{t("colCounterName")}</th>
              <th className="px-4 py-3.5">{t("colBranch")}</th>
              <th className="px-4 py-3.5">{t("colStatus")}</th>
              <th className="px-4 py-3.5">{t("colCashier")}</th>
              <th className="px-4 py-3.5 text-right">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {isLoading ? (
              <TableLoader colSpan={5} text="Loading counters..." />
            ) : counters.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">{t("noCounters")}</td></tr>
            ) : (
              counters.map((counter) => {
                const openSession = counter.sessions && counter.sessions.length > 0 ? counter.sessions[0] : null;
                
                return (
                  <tr key={counter.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900">{counter.name}</td>
                    <td className="px-4 py-3.5 text-slate-600">{counter.branch?.name || "-"}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={counter.isActive ? "success" : "outline"}>
                        {counter.isActive ? tc("active") : tc("inactive")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 font-bold">{openSession?.user?.name || "-"}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {openSession ? (
                          <Button variant="outline" size="sm" className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => { setSessionCounter({ ...counter, sessionId: openSession.id }); setIsCloseSessionModalOpen(true); }}>
                            <LockKeyhole className="h-3.5 w-3.5 mr-1" /> {t("closeSession")}
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => { setSessionCounter(counter); setIsOpenSessionModalOpen(true); }}>
                            <KeyRound className="h-3.5 w-3.5 mr-1" /> {t("openSession")}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => { setEditingCounter(counter); setIsFormModalOpen(true); }} className="h-7 w-7 p-0">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600" onClick={() => handleDelete(counter.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <CounterFormModal 
        isOpen={isFormModalOpen} 
        onClose={() => setIsFormModalOpen(false)} 
        counter={editingCounter}
        onSuccess={fetchCounters}
      />
      
      {sessionCounter && (
        <OpenSessionModal
          isOpen={isOpenSessionModalOpen}
          onClose={() => { setIsOpenSessionModalOpen(false); setSessionCounter(null); }}
          counter={sessionCounter}
          onSuccess={fetchCounters}
        />
      )}

      {sessionCounter?.sessionId && (
        <CloseSessionModal
          isOpen={isCloseSessionModalOpen}
          onClose={() => { setIsCloseSessionModalOpen(false); setSessionCounter(null); }}
          counter={sessionCounter}
          onSuccess={fetchCounters}
        />
      )}
    </div>
  );
}
