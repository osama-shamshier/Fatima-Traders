"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, User, Store, RefreshCw, AlertTriangle, CheckCircle, CreditCard, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { POSCheckoutModal } from "./components/POSCheckoutModal";
import { ReceiptModal } from "./components/ReceiptModal";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  availableStock: number;
  stock: number;
  category?: { id: string; name: string };
  unit?: { abbreviation: string };
}

interface CartItem extends Product {
  cartQuantity: number;
  itemDiscount: number;
}

export default function POSPage() {
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
  
  // Custom quantity modal / prompt state
  const [selectedProductForQty, setSelectedProductForQty] = useState<Product | null>(null);
  const [inputQty, setInputQty] = useState<string>("1");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Checkout & Receipt Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedBranchId, selectedCategoryId, search]);

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
        if (bData.length > 0) setSelectedBranchId(bData[0].id);
      }
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (buyersRes.ok) setBuyers(await buyersRes.json());
    } catch (error) {
      console.error("Failed to fetch POS initial data", error);
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
        setProducts(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch POS products", error);
    }
  };

  const openQtyModal = (product: Product) => {
    setErrorMessage(null);
    const available = Number(product.availableStock || 0);
    if (available <= 0) {
      setErrorMessage(`⚠️ Product "${product.name}" is OUT OF STOCK!`);
      return;
    }
    setSelectedProductForQty(product);
    setInputQty("1");
  };

  const handleAddWithQty = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedProductForQty) return;

    const qty = Number(inputQty);
    const available = Number(selectedProductForQty.availableStock || 0);

    if (isNaN(qty) || qty <= 0) {
      setErrorMessage("Please enter a valid positive quantity.");
      return;
    }

    // Check existing quantity in cart
    const existingIndex = cart.findIndex((item) => item.id === selectedProductForQty.id);
    const currentCartQty = existingIndex > -1 ? cart[existingIndex].cartQuantity : 0;
    const totalRequested = currentCartQty + qty;

    if (totalRequested > available) {
      setErrorMessage(
        `⚠️ Stock Limit Exceeded! Only ${available} ${selectedProductForQty.unit?.abbreviation || "units"} available in stock (Currently in cart: ${currentCartQty}).`
      );
      return;
    }

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].cartQuantity = totalRequested;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          ...selectedProductForQty,
          cartQuantity: qty,
          itemDiscount: 0,
        },
      ]);
    }

    setSelectedProductForQty(null);
    setInputQty("1");
    setErrorMessage(null);
  };

  const updateCartQuantity = (id: string, newQty: number) => {
    setErrorMessage(null);
    const targetItem = cart.find((item) => item.id === id);
    if (!targetItem) return;

    if (newQty <= 0) {
      removeFromCart(id);
      return;
    }

    const available = Number(targetItem.availableStock || 0);
    if (newQty > available) {
      setErrorMessage(
        `⚠️ Stock Limit Exceeded for "${targetItem.name}"! Only ${available} ${targetItem.unit?.abbreviation || "units"} available.`
      );
      return;
    }

    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, cartQuantity: newQty } : item))
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const [roundOff, setRoundOff] = useState<number>(0);

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.sellingPrice) * item.cartQuantity - item.itemDiscount,
    0
  );
  const rawGrandTotal = Math.max(0, subtotal - globalDiscount);
  const grandTotal = Math.max(0, rawGrandTotal + roundOff);

  const handleCheckoutSubmit = async (
    amountPaid: number,
    paymentMethod: string,
    bankName?: string,
    bankReference?: string,
    dueDate?: string,
    modalRoundOff?: number
  ) => {
    try {
      const finalRoundOff = modalRoundOff !== undefined ? modalRoundOff : roundOff;
      const payload = {
        branchId: selectedBranchId,
        buyerId: selectedBuyerId || undefined,
        discount: globalDiscount,
        roundOff: finalRoundOff,
        amountPaid,
        paymentMethod,
        bankName,
        bankReference,
        dueDate,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.cartQuantity,
          sellingPrice: item.sellingPrice,
          discount: item.itemDiscount,
        })),
      };

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
        fetchProducts(); // Instant stock refresh!
      } else {
        const err = await res.json();
        alert(`Checkout failed: ${err.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error during checkout:", error);
      alert("Checkout failed");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] gap-3 bg-slate-50 p-2 sm:p-4 rounded-xl">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <Store className="w-5 h-5 text-blue-600" />
          <h1 className="text-base font-bold text-slate-900">POS Sales Terminal</h1>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="input text-xs py-1 px-3.5 bg-slate-50 font-semibold"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            ref={searchInputRef}
            placeholder="Search products by Name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs py-1.5"
            autoFocus
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchProducts} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Stock
          </Button>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs font-bold text-rose-600 hover:underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Container: Product List View (2/3) + Cart Sidebar (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Product List View Panel (NO IMAGES, High Density Table format) */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 p-2 overflow-x-auto border-b border-slate-100 bg-slate-50/50">
            <button
              onClick={() => setSelectedCategoryId("")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                selectedCategoryId === ""
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "bg-white text-slate-600 border hover:bg-slate-100"
              }`}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategoryId(c.id)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                  selectedCategoryId === c.id
                    ? "bg-blue-600 text-white shadow-sm font-semibold"
                    : "bg-white text-slate-600 border hover:bg-slate-100"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Product List Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b font-semibold sticky top-0 uppercase">
                <tr>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Available Stock</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {products.map((p) => {
                  const available = Number(p.availableStock || 0);
                  const isOutOfStock = available <= 0;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-blue-50/50 transition-colors ${
                        isOutOfStock ? "bg-slate-50 text-slate-400" : "text-slate-800"
                      }`}
                    >
                      <td className="p-3 font-mono font-semibold text-slate-500">{p.sku}</td>
                      <td className="p-3 font-semibold text-slate-900">{p.name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[11px]">
                          {p.category?.name || "General"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        <span className={isOutOfStock ? "text-rose-600" : available < 10 ? "text-amber-600" : "text-emerald-700"}>
                          {available} {p.unit?.abbreviation || ""}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-blue-700 font-mono">
                        {formatCurrency(p.sellingPrice)}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          disabled={isOutOfStock}
                          size="sm"
                          onClick={() => openQtyModal(p)}
                          className={`text-xs py-1 px-3 ${
                            isOutOfStock
                              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                          }`}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add Qty
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                      No products found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cart & Checkout Panel */}
        <div className="flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Customer / Buyer Selection */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
              <User className="w-3.5 h-3.5 text-slate-400" /> Customer / Buyer
            </label>
            <select
              value={selectedBuyerId}
              onChange={(e) => setSelectedBuyerId(e.target.value)}
              className="input text-xs py-1.5 bg-white font-medium"
            >
              <option value="">Walk-in Customer (Cash Sale)</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.companyName || "Individual"})
                </option>
              ))}
            </select>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 p-3 overflow-y-auto divide-y divide-slate-100">
            {cart.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-bold text-slate-900 truncate">{item.name}</h5>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {formatCurrency(item.sellingPrice)} × {item.cartQuantity} {item.unit?.abbreviation || ""}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}
                    className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.cartQuantity}
                    onChange={(e) => updateCartQuantity(item.id, Number(e.target.value))}
                    className="w-12 text-center text-xs font-bold border rounded py-0.5"
                  />
                  <button
                    onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}
                    className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold"
                  >
                    +
                  </button>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="w-6 h-6 rounded bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center text-xs ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs font-medium">Cart is empty</p>
                <p className="text-[11px] text-slate-400">Click "Add Qty" on products to build order</p>
              </div>
            )}
          </div>

          {/* Cart Totals & Checkout Button */}
          <div className="p-3.5 border-t border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>Subtotal:</span>
              <span className="font-bold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Order Discount:</span>
              <Input
                type="number"
                min="0"
                value={globalDiscount}
                onChange={(e) => setGlobalDiscount(Math.max(0, Number(e.target.value)))}
                className="w-24 text-right text-xs py-1 h-7 font-bold"
              />
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total:</span>
              <span className="text-blue-700">{formatCurrency(grandTotal)}</span>
            </div>

            <Button
              disabled={cart.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full py-3 mt-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 uppercase tracking-wider"
            >
              <CreditCard className="w-4 h-4 mr-2" /> Pay {formatCurrency(grandTotal)}
            </Button>
          </div>
        </div>
      </div>

      {/* Quantity Entry Dialog */}
      {selectedProductForQty && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm p-5 bg-white rounded-2xl shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">Enter Sale Quantity</h3>
            <p className="text-xs text-slate-500 mb-3">
              {selectedProductForQty.name} ({selectedProductForQty.sku})
            </p>

            <form onSubmit={handleAddWithQty} className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">Available Stock:</span>
                <span className="font-bold text-blue-700">
                  {selectedProductForQty.availableStock} {selectedProductForQty.unit?.abbreviation || ""}
                </span>
              </div>

              <div>
                <Label className="text-xs font-semibold">Quantity to Sell *</Label>
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

              <div className="flex justify-between items-center text-xs font-bold text-slate-800 border-t pt-2">
                <span>Line Total:</span>
                <span className="text-emerald-700">
                  {formatCurrency(Number(inputQty || 0) * selectedProductForQty.sellingPrice)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedProductForQty(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-blue-600 text-white font-semibold">
                  Add to Cart
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
    </div>
  );
}
