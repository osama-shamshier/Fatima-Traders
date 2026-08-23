"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { InvoiceModal } from "./InvoiceModal";

interface InvoiceModalWrapperProps {
  saleId?: string;
  sale?: any;
}

export function InvoiceModalWrapper({ saleId, sale: initialSale }: InvoiceModalWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sale, setSale] = useState<any>(initialSale || null);
  const [loading, setLoading] = useState(false);

  const effectiveSaleId = saleId || initialSale?.id;

  const handleOpen = async () => {
    setIsOpen(true);
    if (!sale && effectiveSaleId) {
      setLoading(true);
      try {
        const res = await fetch(`/api/sales/${effectiveSaleId}`);
        if (res.ok) {
          const data = await res.json();
          setSale(data);
        }
      } catch (error) {
        console.error("Failed to load sale", error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={handleOpen}>
        <Eye className="h-4 w-4" />
      </Button>
      <InvoiceModal isOpen={isOpen} onClose={() => setIsOpen(false)} sale={sale || initialSale} loading={loading} />
    </>
  );
}
