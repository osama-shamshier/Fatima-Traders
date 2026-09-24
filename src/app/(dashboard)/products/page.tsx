"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableLoader } from "@/components/ui/loader";
import { formatCurrency } from "@/lib/utils";
import { ProductFormModal } from "@/components/products/ProductFormModal";
import { useTranslations } from "next-intl";
import { cacheCatalogData, getOfflineProducts } from "@/lib/offline/cacheService";
import { getAllFromStore, putManyInStore } from "@/lib/offline/db";

export default function ProductsPage() {
  const t = useTranslations("products");
  const tc = useTranslations("common");

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState("");

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (categoryId) params.append("categoryId", categoryId);
      if (isActive) params.append("isActive", isActive);

      if (typeof navigator !== "undefined" && navigator.onLine) {
        const res = await fetch(`/api/products?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          setProducts(list);
          cacheCatalogData({ products: list });
          setLoading(false);
          return;
        }
      }
    } catch (error) {
      console.warn("Online fetch products failed, falling back to offline cache:", error);
    }

    // Offline fallback from IndexedDB
    try {
      const offlineProds = await getOfflineProducts({
        categoryId,
        search,
      });
      setProducts(Array.isArray(offlineProds) ? offlineProds : []);
    } catch (err) {
      console.error("Failed to load offline products:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          const localCats = await getAllFromStore<any>("categories");
          setCategories(Array.isArray(localCats) ? localCats : []);
          return;
        }
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          setCategories(list);
          putManyInStore("categories", list).catch(() => {});
        } else {
          const localCats = await getAllFromStore<any>("categories");
          setCategories(Array.isArray(localCats) ? localCats : []);
        }
      } catch {
        const localCats = await getAllFromStore<any>("categories").catch(() => []);
        setCategories(Array.isArray(localCats) ? localCats : []);
      }
    };

    loadCategories();

    const handleNetworkChange = () => {
      loadCategories();
      fetchProducts();
    };
    window.addEventListener("online", handleNetworkChange);
    window.addEventListener("offline", handleNetworkChange);
    return () => {
      window.removeEventListener("online", handleNetworkChange);
      window.removeEventListener("offline", handleNetworkChange);
    };
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, categoryId, isActive]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error("Failed to delete product", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-600" /> {t("title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("subtitle")}</p>
        </div>
        <Button
          onClick={() => {
            setEditingProduct(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm shrink-0"
        >
          <Plus className="me-2 h-4 w-4" /> {t("addProduct")}
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input text-xs ps-9 bg-slate-50 font-medium w-full"
          />
        </div>

        <div className="flex gap-3 sm:w-auto w-full">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input text-xs bg-slate-50 font-medium sm:w-48"
          >
            <option value="">{t("allCategories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={isActive}
            onChange={(e) => setIsActive(e.target.value)}
            className="input text-xs bg-slate-50 font-medium sm:w-40"
          >
            <option value="">{t("allStatuses")}</option>
            <option value="true">{t("activeOnly")}</option>
            <option value="false">{t("inactiveOnly")}</option>
          </select>

          <Button variant="outline" size="sm" onClick={fetchProducts} className="text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b font-semibold text-slate-600 uppercase">
              <tr>
                <th className="p-3.5">{t("colSku")}</th>
                <th className="p-3.5">{t("colProductName")}</th>
                <th className="p-3.5">{t("colCategory")}</th>
                <th className="p-3.5">{t("colUnit")}</th>
                <th className="p-3.5 text-right">{t("colSellingPrice")}</th>
                <th className="p-3.5 text-center">{t("colMinStock")}</th>
                <th className="p-3.5">{t("colStatus")}</th>
                <th className="p-3.5 text-right">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <TableLoader colSpan={8} text="Loading products..." />
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {t("noProducts")}
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-mono text-slate-500">{product.sku}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{product.name}</div>
                      {product.description && (
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{product.description}</div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <Badge variant="outline" className="text-[10px] font-medium bg-slate-50">
                        {product.category?.name || "-"}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-slate-600">{product.unit?.name || "-"}</td>
                    <td className="p-3.5 text-right font-extrabold font-mono text-blue-700">
                      {formatCurrency(product.sellingPrice)}
                    </td>
                    <td className="p-3.5 text-center font-mono text-slate-600">
                      {product.minStockLevel || 0}
                    </td>
                    <td className="p-3.5">
                      <Badge variant={product.isActive ? "success" : "muted"}>
                        {product.isActive ? t("active") : t("inactive")}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingProduct(product);
                            setIsModalOpen(true);
                          }}
                          className="text-xs py-1 px-2.5"
                          title="Edit Product"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                          className="text-xs py-1 px-2.5"
                          title="Delete Product"
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
        <ProductFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          product={editingProduct}
          onSuccess={() => {
            fetchProducts();
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
