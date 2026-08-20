"use client";

import { useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { ButtonSpinner } from "@/components/ui/loader";
import { useTranslations } from "next-intl";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  loading = false,
}: DeleteConfirmModalProps) {
  const tc = useTranslations("common");

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm modal-overlay" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle size={20} />
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <p className="text-xs text-slate-600">{message}</p>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
          >
            {tc("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 flex items-center gap-1.5 shadow-xs"
          >
            {loading && <ButtonSpinner />}
            {tc("delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
