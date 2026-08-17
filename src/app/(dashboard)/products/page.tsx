"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableLoader } from "@/components/ui/loader";
import { formatCurrency } from "@/lib/utils";
import { ProductFormModal } from "@/components/products/ProductFormModal";

export default function ProductsPage() {
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

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Failed to fetch products", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data));
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
          <h1 className="text-2xl font-bold text-slate-900">Product Catalog & Master Prices</h1>
          <p className="text-slate-500 text-sm">Manage products, SKUs, category assignments, and selling prices.</p>
        </div>
        <Button
          onClick={() => {
            setEditingProduct(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input text-xs pl-9 bg-slate-50 font-medium"
          />
        </div>

        <div className="flex gap-3 sm:w-auto w-full">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input text-xs bg-slate-50 font-medium sm:w-48"
          >
            <option value="">All Categories</option>
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
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
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
                <th className="p-3.5">SKU</th>
                <th className="p-3.5">Product Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Unit</th>
                <th className="p-3.5 text-right">Selling Price</th>
                <th className="p-3.5 text-right">Min Stock Alert</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <TableLoader colSpan={8} text="Loading product catalog..." />
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-600">{product.sku}</td>
                    <td className="p-3.5 font-bold text-slate-900">{product.name}</td>
                    <td className="p-3.5">
                      <Badge variant="outline" className="text-[11px]">
                        {product.category?.name || "General"}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-slate-600 font-semibold">{product.unit?.abbreviation || "-"}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-blue-700 text-sm">
                      {formatCurrency(product.sellingPrice)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-600">{product.minStockLevel}</td>
                    <td className="p-3.5 text-center">
                      <Badge variant={product.isActive ? "success" : "muted"}>
                        {product.isActive ? "Active" : "Inactive"}
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
