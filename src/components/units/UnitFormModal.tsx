"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit?: any;
  onSuccess: () => void;
}

export function UnitFormModal({ isOpen, onClose, unit, onSuccess }: UnitFormModalProps) {
  const [name, setName] = useState(unit?.name || "");
  const [abbreviation, setAbbreviation] = useState(unit?.abbreviation || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = unit ? `/api/units/${unit.id}` : "/api/units";
      const method = unit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, abbreviation }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-900">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <h2 className="text-lg font-bold text-slate-900">{unit ? "Edit Unit of Measure" : "Add New Unit"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input text-xs bg-white text-slate-900 font-medium border-slate-300"
              placeholder="e.g. Kilogram"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Abbreviation *</label>
            <input
              type="text"
              required
              value={abbreviation}
              onChange={(e) => setAbbreviation(e.target.value)}
              className="input text-xs bg-white text-slate-900 font-mono font-bold border-slate-300"
              placeholder="e.g. kg"
            />
          </div>

          <div className="flex justify-end gap-2 mt-6 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm">
              {loading ? "Saving..." : "Save Unit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
