"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Tag, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableLoader } from "@/components/ui/loader";
import { formatDate } from "@/lib/utils";
import { CategoryFormModal } from "@/components/categories/CategoryFormModal";
import { useTranslations } from "next-intl";
import { getAllFromStore, putManyInStore } from "@/lib/offline/db";

export default function CategoriesPage() {
  const t = useTranslations("categories");
  const tc = useTranslations("common");

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      if (typeof navigator !== "undefined" && navigator.onLine) {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
          putManyInStore("categories", data).catch(() => {});
          setLoading(false);
          return;
        }
      }
    } catch (error) {
      console.warn("Online fetch categories failed, falling back to offline cache:", error);
    }

    try {
      const cached = await getAllFromStore<any>("categories");
      if (cached && cached.length > 0) {
        setCategories(cached);
      }
    } catch (err) {
      console.error("Failed to load offline categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    const handleOnline = () => fetchCategories();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchCategories();
      }
    } catch (error) {
      console.error("Failed to delete category", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-7 h-7 text-blue-600" /> {t("title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("subtitle")}</p>
        </div>
        <Button
          onClick={() => {
            setEditingCategory(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm shrink-0"
        >
          <Plus className="me-2 h-4 w-4" /> {t("addCategory")}
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-900 text-sm">{t("listTitle")} ({categories.length})</h3>
          <Button variant="outline" size="sm" onClick={fetchCategories}>
            <RefreshCw className="h-3.5 w-3.5 me-1" /> {tc("refresh")}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b font-semibold uppercase">
              <tr>
                <th className="p-3.5">{t("colCategoryName")}</th>
                <th className="p-3.5">{t("colDescription")}</th>
                <th className="p-3.5 text-center">{t("colProducts")}</th>
                <th className="p-3.5">{t("colCreated")}</th>
                <th className="p-3.5 text-right">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <TableLoader colSpan={5} text="Loading categories..." />
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {t("noCategories")}
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">{category.name}</td>
                    <td className="p-3.5 text-slate-600 truncate max-w-xs">{category.description || "-"}</td>
                    <td className="p-3.5 text-center">
                      <Badge variant="outline" className="text-xs font-bold text-blue-700">
                        {category._count?.products || 0}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono">{formatDate(category.createdAt)}</td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingCategory(category);
                            setIsModalOpen(true);
                          }}
                          className="text-xs py-1 px-2.5"
                          title="Edit Category"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(category.id)}
                          className="text-xs py-1 px-2.5"
                          title="Delete Category"
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
        <CategoryFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          category={editingCategory}
          onSuccess={() => {
            fetchCategories();
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
