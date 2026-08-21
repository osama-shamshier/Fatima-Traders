"use client";

import { useEffect, useState, useRef } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  CreditCard,
  Store,
  AlertCircle,
  RefreshCw,
  X,
  Wifi,
  WifiOff,
  Database,
  Cloud,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { POSCheckoutModal } from "./components/POSCheckoutModal";
import { ReceiptModal } from "./components/ReceiptModal";
import { OfflineSyncModal } from "@/components/pos/OfflineSyncModal";
import { CustomerSearchSelect } from "@/components/pos/CustomerSearchSelect";
import { useTranslations } from "next-intl";
import { useOfflineSync, saveOfflineSale } from "@/lib/offlineSync";
import { offlineDb } from "@/lib/offlineDb";

interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  availableStock: number;
  unit?: { abbreviation: string };
  category?: { name: string };
}

interface CartItem extends Product {
  cartQuantity: number;
  itemDiscount: number;
}

export default function POSPage() {
  const t = useTranslations("pos");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>("");
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [roundOff, setRoundOff] = useState<number>(0);

  // Custom quantity & item discount modal state
  const [selectedProductForQty, setSelectedProductForQty] = useState<Product | null>(null);
  const [inputQty, setInputQty] = useState<string>("1");
  const [inputItemDiscount, setInputItemDiscount] = useState<string>("0");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Checkout, Receipt & Sync Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Offline Hook
  const {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    outboxItems,
    triggerSync,
    clearSyncedSales,
    refreshCounts,
    cacheCatalog,
  } = useOfflineSync(selectedBranchId);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedBranchId, selectedCategoryId, search, isOnline]);

  const fetchInitialData = async () => {
    try {
      const [branchesRes, categoriesRes, buyersRes] = await Promise.all([
        fetch("/api/branches"),
        fetch("/api/categories"),
        fetch("/api/buyers"),
      ]);

      if (branchesRes.ok) {
        const bData = await branchesRes.json();
        setBranches(bData);
        if (bData.length > 0 && !selectedBranchId) setSelectedBranchId(bData[0].id);
      }
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (buyersRes.ok) setBuyers(await buyersRes.json());
    } catch (error) {
      console.warn("Offline fallback for initial POS data:", error);
      // Offline fallback from IndexedDB
      if (offlineDb) {
        try {
          const [cachedBranches, cachedBuyers] = await Promise.all([
            offlineDb.branches.toArray(),
            offlineDb.buyers.toArray(),
          ]);
          if (cachedBranches.length > 0) {
            setBranches(cachedBranches);
            if (!selectedBranchId) setSelectedBranchId(cachedBranches[0].id);
          }
          if (cachedBuyers.length > 0) {
            setBuyers(cachedBuyers);
          }
        } catch (dbErr) {
          console.error("Failed to read from offlineDb:", dbErr);
        }
      }
    }
  };

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBranchId) params.append("branchId", selectedBranchId);
      if (selectedCategoryId) params.append("categoryId", selectedCategoryId);
      if (search) params.append("search", search);

      const res = await fetch(`/api/pos/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
        return;
      }
    } catch (error) {
      console.warn("Failed to fetch online POS products, loading from local cache", error);
    }

    // Offline fallback from IndexedDB
    if (offlineDb) {
      try {
        let cached = await offlineDb.products.toArray();
        if (selectedBranchId) {
          cached = cached.filter((p: any) => !p.branchId || p.branchId === selectedBranchId);
        }
        if (selectedCategoryId) {
          cached = cached.filter((p: any) => p.categoryId === selectedCategoryId);
        }
        if (search) {
          const q = search.toLowerCase().trim();
          cached = cached.filter(
            (p: any) =>
              p.name.toLowerCase().includes(q) ||
              p.sku.toLowerCase().includes(q)
          );
        }

        setProducts(
          cached.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            sellingPrice: p.sellingPrice,
            availableStock: p.stock,
            unit: p.unit,
            category: p.category,
          }))
        );
      } catch (dbErr) {
        console.error("IndexedDB product lookup error:", dbErr);
      }
    }
  };

  const openQtyModal = (product: Product) => {
    setErrorMessage(null);
    const available = Number(product.availableStock || 0);
    if (available <= 0) {
      setErrorMessage(`⚠️ "${product.name}" ${t("outOfStock")}!`);
      return;
    }

    const existingInCart = cart.find((item) => item.id === product.id);
    const currentQtyInCart = existingInCart ? existingInCart.cartQuantity : 0;

    setSelectedProductForQty(product);
    setInputQty(currentQtyInCart > 0 ? currentQtyInCart.toString() : "1");
    setInputItemDiscount(existingInCart ? existingInCart.itemDiscount.toString() : "0");
  };

  const handleConfirmQtyAndDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForQty) return;

    const qty = parseFloat(inputQty);
    const discount = parseFloat(inputItemDiscount) || 0;

    if (isNaN(qty) || qty <= 0) {
      setErrorMessage(t("invalidQty"));
      return;
    }

    const available = Number(selectedProductForQty.availableStock || 0);
    if (qty > available) {
      setErrorMessage(`⚠️ ${t("requestedExceedsStock", { qty, available })}`);
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === selectedProductForQty.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          cartQuantity: qty,
          itemDiscount: discount,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            ...selectedProductForQty,
            cartQuantity: qty,
            itemDiscount: discount,
          },
        ];
      }
    });

    setSelectedProductForQty(null);
    setInputQty("1");
    setInputItemDiscount("0");
    setErrorMessage(null);
    searchInputRef.current?.focus();
  };

  const updateCartItemQty = (productId: string, newQty: number) => {
    setErrorMessage(null);
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > Number(product.availableStock || 0)) {
      setErrorMessage(`⚠️ ${t("onlyStockAvailable", { stock: product.availableStock, name: product.name })}`);
      return;
    }

    setCart((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, cartQuantity: newQty } : item))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setGlobalDiscount(0);
    setRoundOff(0);
    setErrorMessage(null);
    searchInputRef.current?.focus();
  };

  // Cart Calculations
  const itemsGrossTotal = cart.reduce(
    (sum, item) => sum + item.sellingPrice * item.cartQuantity,
    0
  );
  const itemsDiscountTotal = cart.reduce(
    (sum, item) => sum + (item.itemDiscount || 0),
    0
  );
  const subtotal = Math.max(0, itemsGrossTotal - itemsDiscountTotal);
  const rawTotal = Math.max(0, subtotal - globalDiscount);
  const grandTotal = Math.max(0, rawTotal + roundOff);

  const handleCheckoutSubmit = async (
    amountPaid: number,
    paymentMethod: string,
    bankName?: string,
    bankReference?: string,
    dueDate?: string,
    appliedRoundOff?: number
  ) => {
    if (cart.length === 0) return;

    const payload = {
      buyerId: selectedBuyerId || undefined,
      branchId: selectedBranchId,
      discount: globalDiscount,
      roundOff: appliedRoundOff || roundOff,
      items: cart.map((item) => ({
        productId: item.id,
        quantity: item.cartQuantity,
        sellingPrice: item.sellingPrice,
        discount: item.itemDiscount || 0,
      })),
      amountPaid,
      paymentMethod,
      bankName,
      bankReference,
      dueDate,
    };

    // If offline, save directly to IndexedDB outbox
    if (!isOnline) {
      try {
        const { receiptSaleData } = await saveOfflineSale(payload as any);
        setCompletedSale(receiptSaleData);
        setIsCheckoutOpen(false);
        setIsReceiptOpen(true);
        setCart([]);
        setGlobalDiscount(0);
        setRoundOff(0);
        await refreshCounts();
        await fetchProducts();
        return;
      } catch (offlineErr: any) {
        alert(`Offline checkout error: ${offlineErr.message}`);
        return;
      }
    }

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const sale = await res.json();
        setCompletedSale(sale);
        setIsCheckoutOpen(false);
        setIsReceiptOpen(true);
        setCart([]);
        setGlobalDiscount(0);
        setRoundOff(0);
        fetchProducts();
      } else {
        const err = await res.json();
        alert(`Checkout failed: ${err.error || "Server error"}`);
      }
    } catch (networkError) {
      console.warn("Network error during checkout, falling back to Offline Mode:", networkError);
      try {
        const { receiptSaleData } = await saveOfflineSale(payload as any);
        setCompletedSale(receiptSaleData);
        setIsCheckoutOpen(false);
        setIsReceiptOpen(true);
        setCart([]);
        setGlobalDiscount(0);
        setRoundOff(0);
        await refreshCounts();
        await fetchProducts();
      } catch (fallbackErr: any) {
        console.error("Offline fallback failed:", fallbackErr);
        alert("Checkout failed. Please check your device connection.");
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] gap-3 bg-slate-50 p-2 sm:p-4 rounded-xl">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl shadow-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <Store className="w-5 h-5 text-blue-600" />
          <h1 className="text-base font-bold text-slate-900">{t("title")}</h1>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="input text-xs py-1 px-2.5 bg-slate-50 border-slate-200 font-semibold rounded-lg"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Sync Status Badge / Button */}
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs border ${
              isOnline
                ? pendingCount > 0
                  ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                  : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                : "bg-amber-500 text-white border-amber-600 hover:bg-amber-600 animate-pulse"
            }`}
            title="Click to open Offline Sync Manager"
          >
            {isOnline ? (
              pendingCount > 0 ? (
                <>
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>{isSyncing ? "Syncing..." : `${pendingCount} Pending Sync`}</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cloud Connected</span>
                </>
              )
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-white" />
                <span>Offline Mode ({pendingCount} Queued)</span>
              </>
            )}
          </button>

          <CustomerSearchSelect
            buyers={buyers}
            selectedBuyerId={selectedBuyerId}
            onSelectBuyer={setSelectedBuyerId}
          />

          <Button variant="outline" size="sm" onClick={fetchProducts} className="h-8 text-xs bg-white">
            <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-500" /> Refresh Stock
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content: Left Catalog + Right Cart */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* Left Side: Product Catalog (7/12 width) */}
        <div className="lg:col-span-7 flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden min-h-0">
          {/* Search & Category Tabs */}
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="absolute start-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                ref={searchInputRef}
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9 text-xs bg-slate-50 border-slate-200"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategoryId("")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                  selectedCategoryId === ""
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t("allCategories")}
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategoryId(c.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                    selectedCategoryId === c.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 p-3 overflow-y-auto min-h-0">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <ShoppingCart className="w-12 h-12 mb-2 stroke-[1.5]" />
                <p className="text-sm font-medium">{t("noProductsFound")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {products.map((p) => {
                  const isLowStock = Number(p.availableStock || 0) <= 0;

                  return (
                    <button
                      key={p.id}
                      onClick={() => openQtyModal(p)}
                      disabled={isLowStock}
                      className={`flex flex-col text-left p-3 rounded-xl border transition-all text-xs relative ${
                        isLowStock
                          ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-200"
                          : "bg-white border-slate-200 hover:border-blue-500 hover:shadow-md cursor-pointer group"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1 w-full">
                        <span className="font-semibold text-slate-900 group-hover:text-blue-600 line-clamp-2">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">{p.sku}</span>

                      <div className="mt-auto pt-2 flex items-center justify-between w-full border-t border-slate-100">
                        <span className="font-bold text-blue-700 font-mono">
                          {formatCurrency(p.sellingPrice)}
                        </span>
                        <Badge
                          variant={isLowStock ? "danger" : "outline"}
                          className="text-[9px] px-1.5 py-0 h-4 font-mono"
                        >
                          {p.availableStock} {p.unit?.abbreviation || ""}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Interactive Cart (5/12 width) */}
        <div className="lg:col-span-5 flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden min-h-0">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">{t("cartTitle")}</h2>
              <Badge variant="outline" className="text-xs">
                {cart.length} {t("items")}
              </Badge>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" /> {t("clearCart")}
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 p-3 overflow-y-auto divide-y divide-slate-100 min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <ShoppingCart className="w-10 h-10 mb-2 stroke-[1.5]" />
                <p className="text-xs font-medium">{t("cartEmpty")}</p>
                <p className="text-[11px] text-slate-400 mt-1">{t("clickToAdd")}</p>
              </div>
            ) : (
              cart.map((item) => {
                const lineTotal = item.sellingPrice * item.cartQuantity - item.itemDiscount;

                return (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{item.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{formatCurrency(item.sellingPrice)}</span>
                        {item.itemDiscount > 0 && (
                          <span className="text-rose-600 font-medium">
                            -{formatCurrency(item.itemDiscount)} disc
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateCartItemQty(item.id, item.cartQuantity - 1)}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold font-mono">
                        {item.cartQuantity}
                      </span>
                      <button
                        onClick={() => updateCartItemQty(item.id, item.cartQuantity + 1)}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right shrink-0 min-w-[70px]">
                      <div className="font-bold text-slate-900 font-mono">
                        {formatCurrency(lineTotal)}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-[10px] text-rose-500 hover:text-rose-700"
                      >
                        {t("remove")}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Summary & Action */}
          <div className="p-3 bg-slate-50/80 border-t border-slate-200 space-y-2">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{t("subtotal")}:</span>
                <span className="font-mono font-semibold">{formatCurrency(subtotal)}</span>
              </div>

              {itemsDiscountTotal > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>{t("itemDiscounts")}:</span>
                  <span className="font-mono font-semibold">-{formatCurrency(itemsDiscountTotal)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-600">
                <span>{t("orderDiscount")}:</span>
                <div className="flex items-center gap-1 w-28">
                  <span className="text-[11px] text-slate-400">Rs.</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={globalDiscount === 0 ? "" : globalDiscount}
                    onChange={(e) => setGlobalDiscount(Math.max(0, Number(e.target.value)))}
                    className="h-6 text-xs text-right font-mono py-0 px-1 bg-white"
                  />
                </div>
              </div>

              {roundOff !== 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Round Off:</span>
                  <span className="font-mono font-semibold">
                    {roundOff > 0 ? `+${formatCurrency(roundOff)}` : `-${formatCurrency(Math.abs(roundOff))}`}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>{t("grandTotal")}:</span>
                <span className="text-base text-blue-700 font-mono font-black">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            <Button
              onClick={() => setIsCheckoutOpen(true)}
              disabled={cart.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 text-sm shadow-md gap-2 mt-2"
            >
              <CreditCard className="w-4 h-4" /> {t("checkout")} ({formatCurrency(grandTotal)})
            </Button>
          </div>
        </div>
      </div>

      {/* Quantity & Custom Discount Modal */}
      {selectedProductForQty && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{selectedProductForQty.name}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedProductForQty.sku}</p>
              </div>
              <button
                onClick={() => setSelectedProductForQty(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmQtyAndDiscount} className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">{t("availableStockLabel")}:</span>
                <span className="font-bold text-blue-700">
                  {selectedProductForQty.availableStock} {selectedProductForQty.unit?.abbreviation || ""}
                </span>
              </div>

              <div>
                <Label className="text-xs font-semibold">{t("enterQty")} *</Label>
                <Input
                  type="number"
                  min="0.001"
                  step="any"
                  value={inputQty}
                  onChange={(e) => setInputQty(e.target.value)}
                  className="text-lg font-bold py-2 mt-1"
                  autoFocus
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-rose-600">{t("itemDiscLabel")}</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={inputItemDiscount}
                  onChange={(e) => setInputItemDiscount(e.target.value)}
                  className="text-sm font-bold py-1.5 mt-1 border-rose-200 focus:border-rose-400 text-rose-700 bg-rose-50/30"
                />
              </div>

              <div className="flex justify-between items-center text-xs font-bold text-slate-800 border-t pt-2">
                <span>{t("calculatedTotal")}:</span>
                <span className="text-emerald-700 font-mono text-sm">
                  {formatCurrency(
                    Math.max(
                      0,
                      Number(inputQty || 0) * selectedProductForQty.sellingPrice -
                        Number(inputItemDiscount || 0)
                    )
                  )}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedProductForQty(null)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" size="sm" className="bg-blue-600 text-white font-semibold">
                  {t("confirmAdd")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <POSCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          subtotal={subtotal}
          discount={globalDiscount}
          itemsGrossTotal={itemsGrossTotal}
          itemsDiscountTotal={itemsDiscountTotal}
          initialRoundOff={roundOff}
          isWalkInCustomer={!selectedBuyerId}
          onCompleteSale={handleCheckoutSubmit}
        />
      )}

      {/* Printable Receipt Modal */}
      {isReceiptOpen && completedSale && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          sale={completedSale}
        />
      )}

      {/* Offline Sync & Cache Manager Modal */}
      <OfflineSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingCount={pendingCount}
        failedCount={failedCount}
        outboxItems={outboxItems}
        onTriggerSync={triggerSync}
        onClearSynced={clearSyncedSales}
        onCacheCatalog={cacheCatalog}
      />
    </div>
  );
}
