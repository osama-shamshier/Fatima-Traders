"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Ruler, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { UnitFormModal } from "@/components/units/UnitFormModal";

export default function UnitsPage() {
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/units");
      if (res.ok) {
        const data = await res.json();
        setUnits(data);
      }
    } catch (error) {
      console.error("Failed to fetch units", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this unit?")) return;

    try {
      const res = await fetch(`/api/units/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchUnits();
      }
    } catch (error) {
      console.error("Failed to delete unit", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Units of Measure</h1>
          <p className="text-slate-500 text-sm">Define measurement units (kg, gram, liter, piece, packet) for inventory tracking.</p>
        </div>
        <Button
          onClick={() => {
            setEditingUnit(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Unit
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-900 text-sm">Units List ({units.length})</h3>
          <Button variant="outline" size="sm" onClick={fetchUnits}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b font-semibold uppercase">
              <tr>
                <th className="p-3.5">Unit Name</th>
                <th className="p-3.5">Abbreviation</th>
                <th className="p-3.5 text-center">Assigned Products</th>
                <th className="p-3.5">Created Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Loading units...
                  </td>
                </tr>
              ) : units.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <Ruler className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No measurement units found.
                  </td>
                </tr>
              ) : (
                units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">{unit.name}</td>
                    <td className="p-3.5">
                      <span className="font-mono font-extrabold px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-900 rounded-md">
                        {unit.abbreviation}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge variant="outline" className="text-xs font-bold text-blue-700">
                        {unit._count?.products || 0} Products
                      </Badge>
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono">{formatDate(unit.createdAt)}</td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingUnit(unit);
                            setIsModalOpen(true);
                          }}
                          className="text-xs py-1 px-2.5"
                          title="Edit Unit"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(unit.id)}
                          className="text-xs py-1 px-2.5"
                          title="Delete Unit"
                        >
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
      </div>

      {isModalOpen && (
        <UnitFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          unit={editingUnit}
          onSuccess={() => {
            fetchUnits();
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
