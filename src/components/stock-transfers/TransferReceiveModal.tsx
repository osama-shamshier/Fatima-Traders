"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

export default function TransferReceiveModal({ transfer, isOpen, onClose, onSuccess }: { transfer: any, isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const t = useTranslations("stockTransfers");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);

  const handleReceive = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stock-transfers/${transfer.id}/receive`, {
        method: "POST",
      });
      if (res.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] bg-white rounded-2xl p-6">
        <DialogHeader className="border-b pb-3 mb-2">
          <DialogTitle className="text-lg font-bold text-slate-900">{t("modalReceiveTitle")}</DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            Are you sure you want to receive and restock transfer #{transfer?.transferNumber || transfer?.id?.slice(0, 8)}?
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleReceive} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            {loading ? tc("saving") : t("confirmReceive")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
