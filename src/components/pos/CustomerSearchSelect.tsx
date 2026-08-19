"use client";

import { useState, useRef, useEffect } from "react";
import { Search, User, ChevronDown, Check, Phone, Building2, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Buyer {
  id: string;
  name: string;
  companyName?: string;
  contactNumber?: string;
  address?: string;
  totalOutstanding?: number;
}

interface CustomerSearchSelectProps {
  buyers: Buyer[];
  selectedBuyerId: string;
  onSelectBuyer: (buyerId: string) => void;
}

export function CustomerSearchSelect({
  buyers,
  selectedBuyerId,
  onSelectBuyer,
}: CustomerSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedBuyer = buyers.find((b) => b.id === selectedBuyerId);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  const filteredBuyers = buyers.filter((b) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = b.name.toLowerCase().includes(q);
    const phoneMatch = b.contactNumber ? b.contactNumber.toLowerCase().includes(q) : false;
    const companyMatch = b.companyName ? b.companyName.toLowerCase().includes(q) : false;
    return nameMatch || phoneMatch || companyMatch;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 transition-all min-w-[220px] max-w-[280px]"
      >
        <div className="flex items-center gap-2 truncate">
          <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          {selectedBuyer ? (
            <div className="truncate text-left">
              <span className="font-bold text-slate-900">{selectedBuyer.name}</span>
              {selectedBuyer.contactNumber && (
                <span className="text-[10px] text-slate-500 block font-mono">
                  {selectedBuyer.contactNumber}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-700">👤 Walk-in Customer</span>
          )}
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-80 max-h-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95">
          {/* Search Bar */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone #, company..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Customers List */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {/* Walk-in Customer Option */}
            <button
              type="button"
              onClick={() => {
                onSelectBuyer("");
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                !selectedBuyerId
                  ? "bg-blue-50/80 text-blue-900 font-bold"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-[11px] font-bold">
                  👤
                </div>
                <div>
                  <span className="font-bold block">Walk-in Customer</span>
                  <span className="text-[10px] text-slate-400 font-normal">Cash sale, no credit account</span>
                </div>
              </div>
              {!selectedBuyerId && <Check className="w-4 h-4 text-blue-600" />}
            </button>

            {/* Registered Buyers */}
            {filteredBuyers.map((buyer) => {
              const isSelected = selectedBuyerId === buyer.id;
              const outstanding = Number(buyer.totalOutstanding || 0);

              return (
                <button
                  key={buyer.id}
                  type="button"
                  onClick={() => {
                    onSelectBuyer(buyer.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-blue-50 text-blue-900"
                      : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 truncate">{buyer.name}</span>
                      {buyer.companyName && (
                        <span className="text-[10px] text-slate-400 truncate">({buyer.companyName})</span>
                      )}
                    </div>

                    {buyer.contactNumber && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 font-mono">
                        <Phone className="w-2.5 h-2.5 text-slate-400" />
                        <span>{buyer.contactNumber}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    {outstanding > 0 ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-mono block">
                        Due: {formatCurrency(outstanding)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-emerald-600 block">
                        Clear
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {filteredBuyers.length === 0 && search && (
              <div className="p-4 text-center text-xs text-slate-400">
                No customer found matching "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
