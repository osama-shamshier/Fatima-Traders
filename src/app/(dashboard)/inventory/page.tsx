"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { StockAdjustmentModal } from "@/components/inventory/StockAdjustmentModal";
import { Search, AlertTriangle, RefreshCw, Warehouse, ArrowLeftRight, ClipboardEdit } from "lucide-react";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState("current");
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const [branches, setBranches] = useState([]);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (activeTab === "current") {
      fetchInventory();
    } else if (activeTab === "movements") {
      fetchMovements();
    } else if (activeTab === "adjustments") {
      fetchAdjustments();
    }
  }, [activeTab, searchQuery, branchFilter, lowStockOnly]);

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches");
      if (res.ok) {
        setBranches(await res.json());
      }
    } catch (e) {}
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (branchFilter) params.append("branchId", branchFilter);
      if (lowStockOnly) params.append("lowStock", "true");

      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (res.ok) {
        setInventory(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (branchFilter) params.append("branchId", branchFilter);

      const res = await fetch(`/api/inventory/movements?${params.toString()}`);
      if (res.ok) {
        setMovements(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (branchFilter) params.append("branchId", branchFilter);

      const res = await fetch(`/api/inventory/adjustments?${params.toString()}`);
      if (res.ok) {
        setAdjustments(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = (item: any) => {
    setSelectedProduct(item);
    setIsAdjustModalOpen(true);
  };

  const onAdjustmentComplete = () => {
    fetchInventory();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Real-Time Inventory & Stock Management</h1>
          <p className="text-slate-500 text-sm">Monitor available product stock across branches, audit movement logs, and perform adjustments.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchInventory}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Stock Data
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:w-[450px]">
          <TabsTrigger value="current" className="text-xs font-semibold">
            <Warehouse className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Current Stock
          </TabsTrigger>
          <TabsTrigger value="movements" className="text-xs font-semibold">
            <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Stock Movements
          </TabsTrigger>
          <TabsTrigger value="adjustments" className="text-xs font-semibold">
            <ClipboardEdit className="w-3.5 h-3.5 mr-1.5 text-amber-600" /> Adjustments
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col md:flex-row gap-4 mt-6 items-end bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          {activeTab === "current" && (
            <div className="flex-1 w-full max-w-sm">
              <Label className="text-xs font-semibold text-slate-700">Search Products</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search product by name or SKU..."
                  className="pl-9 text-xs bg-slate-50 font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="w-full max-w-xs">
            <Label className="text-xs font-semibold text-slate-700">Filter Branch</Label>
            <select
              className="input text-xs bg-slate-50 mt-1 font-medium"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="">All Operational Branches</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {activeTab === "current" && (
            <div className="flex items-center space-x-2 pb-1.5">
              <Checkbox
                id="lowStock"
                checked={lowStockOnly}
                onCheckedChange={(c) => setLowStockOnly(!!c)}
              />
              <Label htmlFor="lowStock" className="flex items-center gap-1 cursor-pointer text-xs font-bold text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Low / Out of Stock Only
              </Label>
            </div>
          )}
        </div>

        <TabsContent value="current" className="mt-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-3.5 border-b bg-slate-50 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-900">Total Products in Stock ({inventory.length})</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b font-semibold uppercase">
                  <tr>
                    <th className="p-3.5">SKU</th>
                    <th className="p-3.5">Product Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Branch</th>
                    <th className="p-3.5 text-right">Available Stock</th>
                    <th className="p-3.5 text-right">Min Alert Level</th>
                    <th className="p-3.5 text-center">Stock Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        Loading real-time stock levels...
                      </td>
                    </tr>
                  ) : inventory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        No inventory matching filters found.
                      </td>
                    </tr>
                  ) : (
                    inventory.map((item: any) => {
                      const minStock = Number(item.minStockLevel || item.product?.minStockLevel || 0);
                      const qty = Number(item.quantity || 0);
                      const unitAbbr = item.product?.unit?.abbreviation || "";
                      const isOutOfStock = qty <= 0;
                      const isLowStock = !isOutOfStock && qty <= minStock;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-slate-600">{item.product?.sku}</td>
                          <td className="p-3.5 font-bold text-slate-900">{item.product?.name}</td>
                          <td className="p-3.5">
                            <Badge variant="outline" className="text-[11px]">
                              {item.product?.category?.name || "General"}
                            </Badge>
                          </td>
                          <td className="p-3.5 text-slate-700 font-semibold">{item.branch?.name || "Main Branch"}</td>
                          <td className="p-3.5 text-right font-mono font-extrabold text-sm text-slate-900">
                            {qty} {unitAbbr}
                          </td>
                          <td className="p-3.5 text-right font-mono text-slate-500">
                            {minStock} {unitAbbr}
                          </td>
                          <td className="p-3.5 text-center">
                            {isOutOfStock ? (
                              <Badge variant="danger" className="text-[10px] font-bold">
                                🚫 OUT OF STOCK
                              </Badge>
                            ) : isLowStock ? (
                              <Badge variant="warning" className="text-[10px] font-bold">
                                ⚠️ LOW STOCK
                              </Badge>
                            ) : (
                              <Badge variant="success" className="text-[10px] font-bold">
                                ✓ IN STOCK
                              </Badge>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAdjustStock(item)}
                              className="text-xs py-1 px-3 bg-slate-50 hover:bg-slate-100"
                            >
                              Adjust Stock
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b font-semibold uppercase">
                  <tr>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Product</th>
                    <th className="p-3.5">Branch</th>
                    <th className="p-3.5">Movement Type</th>
                    <th className="p-3.5 text-right">Quantity Change</th>
                    <th className="p-3.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        Loading movement logs...
                      </td>
                    </tr>
                  ) : movements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No stock movement history found.
                      </td>
                    </tr>
                  ) : (
                    movements.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-mono text-slate-500">{formatDate(item.createdAt)}</td>
                        <td className="p-3.5 font-bold text-slate-900">{item.product?.name}</td>
                        <td className="p-3.5 text-slate-700 font-semibold">{item.branch?.name}</td>
                        <td className="p-3.5">
                          <Badge variant="outline" className="text-[11px]">
                            {item.movementType}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-sm">
                          <span
                            className={
                              Number(item.quantity) > 0
                                ? "text-emerald-600"
                                : Number(item.quantity) < 0
                                ? "text-rose-600"
                                : "text-slate-900"
                            }
                          >
                            {Number(item.quantity) > 0 ? "+" : ""}
                            {Number(item.quantity)}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 truncate max-w-xs">{item.notes || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="adjustments" className="mt-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b font-semibold uppercase">
                  <tr>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Product</th>
                    <th className="p-3.5">Branch</th>
                    <th className="p-3.5">Adjustment Type</th>
                    <th className="p-3.5 text-right">Quantity Diff</th>
                    <th className="p-3.5">Reason</th>
                    <th className="p-3.5">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        Loading adjustments...
                      </td>
                    </tr>
                  ) : adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        No manual stock adjustments recorded.
                      </td>
                    </tr>
                  ) : (
                    adjustments.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-mono text-slate-500">{formatDate(item.createdAt)}</td>
                        <td className="p-3.5 font-bold text-slate-900">{item.product?.name}</td>
                        <td className="p-3.5 text-slate-700 font-semibold">{item.branch?.name}</td>
                        <td className="p-3.5">
                          <Badge variant="outline" className="text-[11px]">
                            {item.adjustmentType}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-sm text-slate-900">
                          {Number(item.previousQty)} → {Number(item.newQty)}
                        </td>
                        <td className="p-3.5 text-slate-600 truncate max-w-xs">{item.reason || "-"}</td>
                        <td className="p-3.5 text-slate-700 font-semibold">{item.createdBy?.name || "System"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {isAdjustModalOpen && selectedProduct && (
        <StockAdjustmentModal
          isOpen={isAdjustModalOpen}
          onClose={() => {
            setIsAdjustModalOpen(false);
            setSelectedProduct(null);
          }}
          inventory={selectedProduct}
          onComplete={onAdjustmentComplete}
        />
      )}
    </div>
  );
}
