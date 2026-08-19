"use client";

import { useEffect, useState, useRef } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Search, ShoppingCart, Trash2, Plus, CreditCard, Store, AlertCircle, RefreshCw, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { POSCheckoutModal } from "./components/POSCheckoutModal";
import { ReceiptModal } from "./components/ReceiptModal";
import { CustomerSearchSelect } from "@/components/pos/CustomerSearchSelect";

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
        const data = await res.json();
        setProducts(data);
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
    setInputItemDiscount("0");
  };

  const handleAddWithQty = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedProductForQty) return;

    const qty = Number(inputQty);
    const available = Number(selectedProductForQty.availableStock || 0);
    const itemDisc = Math.max(0, Number(inputItemDiscount || 0));

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
      if (itemDisc > 0) {
        updated[existingIndex].itemDiscount = itemDisc;
      }
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          ...selectedProductForQty,
          cartQuantity: qty,
          itemDiscount: itemDisc,
        },
      ]);
    }

    setSelectedProductForQty(null);
    setInputQty("1");
    setInputItemDiscount("0");
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

  const updateCartItemDiscount = (id: string, discount: number) => {
    const val = isNaN(discount) ? 0 : Math.max(0, discount);
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, itemDiscount: val } : item))
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Accurate Multi-Level Discount Calculations
  const itemsGrossTotal = cart.reduce(
    (sum, item) => sum + Number(item.sellingPrice) * item.cartQuantity,
    0
  );
  const itemsDiscountTotal = cart.reduce(
    (sum, item) => sum + Number(item.itemDiscount || 0),
    0
  );
  const subtotal = Math.max(0, itemsGrossTotal - itemsDiscountTotal);
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
          discount: item.itemDiscount || 0,
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
            className="input text-xs py-1 px-2.5 bg-slate-50 border-slate-200 font-semibold"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <CustomerSearchSelect
            buyers={buyers}
            selectedBuyerId={selectedBuyerId}
            onSelectBuyer={setSelectedBuyerId}
          />

          <Button variant="outline" size="sm" onClick={fetchProducts} className="h-8 text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Stock
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
        <div className="lg:col-span-7 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
          {/* Search & Category Tabs */}
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                ref={searchInputRef}
                placeholder="Search products by Name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs bg-slate-50 border-slate-200"
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
                All Categories
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

          {/* Product Catalog Table Form */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3 text-center">Available Stock</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {products.map((p) => {
                  const inCart = cart.find((item) => item.id === p.id);
                  const isOutOfStock = Number(p.availableStock || 0) <= 0;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => !isOutOfStock && openQtyModal(p)}
                      className={`transition-colors cursor-pointer ${
                        isOutOfStock
                          ? "opacity-50 bg-slate-50 cursor-not-allowed"
                          : "hover:bg-blue-50/60"
                      }`}
                    >
                      <td className="p-3 font-bold text-slate-900">
                        {p.name}
                        {p.category?.name && (
                          <span className="text-[10px] text-slate-400 font-normal block">{p.category.name}</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-500">{p.sku}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isOutOfStock
                              ? "bg-rose-100 text-rose-700"
                              : p.availableStock <= 5
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {p.availableStock} {p.unit?.abbreviation || ""}
                        </span>
                      </td>
                      <td className="p-3 text-right font-extrabold font-mono text-blue-700 text-sm whitespace-nowrap">
                        {formatCurrency(p.sellingPrice)}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          disabled={isOutOfStock}
                          onClick={() => openQtyModal(p)}
                          className={`h-7 text-xs px-2.5 font-bold ${
                            inCart
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border-0"
                          }`}
                        >
                          {inCart ? `In Cart (${inCart.cartQuantity})` : "Add"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 text-xs">
                      No products found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Interactive Cart (5/12 width) */}
        <div className="lg:col-span-5 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
          <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                Cart Items ({cart.length})
              </h3>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 min-h-0">
            {cart.map((item) => {
              const lineGross = Number(item.sellingPrice) * Number(item.cartQuantity);
              const lineNet = Math.max(0, lineGross - Number(item.itemDiscount || 0));

              return (
                <div
                  key={item.id}
                  className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-bold text-slate-900 truncate">{item.name}</h5>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {formatCurrency(item.sellingPrice)} × {item.cartQuantity} {item.unit?.abbreviation || ""}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={item.cartQuantity}
                        onChange={(e) => updateCartQuantity(item.id, Number(e.target.value))}
                        className="w-14 text-center text-xs font-bold border rounded py-0.5"
                      />
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold"
                      >
                        +
                      </button>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="w-6 h-6 rounded bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center text-xs ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Discount Per Item & Net Line Total */}
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-rose-600 uppercase">Item Disc:</span>
                      <div className="flex items-center">
                        <span className="text-[10px] text-slate-400 mr-0.5">Rs.</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.itemDiscount === 0 ? "" : item.itemDiscount}
                          placeholder="0"
                          onChange={(e) => updateCartItemDiscount(item.id, Number(e.target.value))}
                          className="w-16 text-right text-xs font-bold font-mono border border-rose-200 bg-rose-50/50 rounded px-1.5 py-0.5 text-rose-700 focus:bg-white focus:border-rose-400"
                        />
                      </div>
                    </div>

                    <div className="text-right">
                      {Number(item.itemDiscount || 0) > 0 && (
                        <span className="text-[10px] text-slate-400 line-through mr-1.5 font-mono">
                          {formatCurrency(lineGross)}
                        </span>
                      )}
                      <span className="font-extrabold font-mono text-slate-900">
                        {formatCurrency(lineNet)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs font-medium">Cart is empty</p>
                <p className="text-[11px] text-slate-400">Click "Add" on products to build order</p>
              </div>
            )}
          </div>

          {/* Cart Totals & Checkout Button */}
          <div className="p-3.5 border-t border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>Items Gross Total:</span>
              <span className="font-bold font-mono">{formatCurrency(itemsGrossTotal)}</span>
            </div>

            {itemsDiscountTotal > 0 && (
              <div className="flex justify-between text-xs text-rose-600 font-medium">
                <span>Item-wise Discounts (-):</span>
                <span className="font-bold font-mono">-{formatCurrency(itemsDiscountTotal)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Order-level Discount (-):</span>
              <Input
                type="number"
                min="0"
                value={globalDiscount === 0 ? "" : globalDiscount}
                placeholder="0"
                onChange={(e) => setGlobalDiscount(Math.max(0, Number(e.target.value)))}
                className="w-24 text-right text-xs py-1 h-7 font-bold font-mono"
              />
            </div>

            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total:</span>
              <span className="text-blue-700 font-mono font-extrabold">{formatCurrency(grandTotal)}</span>
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

      {/* Quantity & Item Discount Entry Dialog */}
      {selectedProductForQty && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm p-5 bg-white rounded-2xl shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Product to Cart</h3>
            <p className="text-xs text-slate-500 mb-3">
              {selectedProductForQty.name} ({selectedProductForQty.sku})
            </p>

            <form onSubmit={handleAddWithQty} className="space-y-3.5">
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

              <div>
                <Label className="text-xs font-semibold text-rose-600">Discount on this Item (PKR)</Label>
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
                <span>Net Line Total:</span>
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
    </div>
  );
}
