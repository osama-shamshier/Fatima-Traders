"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function TransferReceiveModal({ transfer, isOpen, onClose, onSuccess }: { transfer: any, isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
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
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Receive Transfer</DialogTitle>
          <DialogDescription>
            Are you sure you want to receive transfer {transfer?.referenceNo}? This will update inventory in both branches.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleReceive} disabled={loading}>{loading ? "Processing..." : "Confirm Receive"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
