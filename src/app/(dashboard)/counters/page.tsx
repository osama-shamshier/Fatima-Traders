"use client";

import { useEffect, useState } from "react";
import { CounterFormModal } from "@/components/counters/CounterFormModal";
import { OpenSessionModal } from "@/components/counters/OpenSessionModal";
import { CloseSessionModal } from "@/components/counters/CloseSessionModal";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, KeyRound, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TableLoader } from "@/components/ui/loader";

export default function CountersPage() {
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Cash Counters</h1>
        <Button onClick={() => { setEditingCounter(null); setIsFormModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Counter
        </Button>
      </div>

      <div className="border rounded-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Counter Name</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Session Status</th>
              <th className="px-4 py-3 font-medium">Active Cashier</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoader colSpan={6} text="Loading counters..." />
            ) : counters.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-4 text-center">No counters found.</td></tr>
            ) : (
              counters.map((counter) => {
                const openSession = counter.sessions && counter.sessions.length > 0 ? counter.sessions[0] : null;
                
                return (
                  <tr key={counter.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{counter.name}</td>
                    <td className="px-4 py-3">{counter.branch?.name || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={counter.isActive ? "success" : "muted"}>
                        {counter.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {openSession ? (
                        <Badge variant="success">OPEN</Badge>
                      ) : (
                        <Badge variant="muted">CLOSED</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">{openSession?.user?.name || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {openSession ? (
                          <Button variant="outline" size="sm" className="text-red-600" onClick={() => { setSessionCounter({ ...counter, sessionId: openSession.id }); setIsCloseSessionModalOpen(true); }}>
                            <LockKeyhole className="h-4 w-4 mr-1" /> Close Session
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="text-green-600" onClick={() => { setSessionCounter(counter); setIsOpenSessionModalOpen(true); }}>
                            <KeyRound className="h-4 w-4 mr-1" /> Open Session
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => { setEditingCounter(counter); setIsFormModalOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(counter.id)}>
                          <Trash2 className="h-4 w-4" />
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
