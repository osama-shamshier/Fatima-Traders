"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  actualAmount: z.number().min(0, "Amount cannot be negative"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function CloseSessionModal({ isOpen, onClose, counter, onSuccess }: { isOpen: boolean, onClose: () => void, counter: any, onSuccess: () => void }) {
  // Mock expected amount for UI. In a real app, this should be fetched from an API
  // or calculated server-side, then requested here.
  const [expectedAmount, setExpectedAmount] = useState<number>(0);
  
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { actualAmount: 0 }
  });

  const actualAmount = watch("actualAmount") || 0;
  const difference = Number(actualAmount) - expectedAmount;

  useEffect(() => {
    if (isOpen && counter?.sessions?.[0]) {
      // Mocking the expected amount to be just the opening amount
      const session = counter.sessions[0];
      setExpectedAmount(Number(session.openingAmount || 0));
      reset({ actualAmount: 0, notes: "" });
    }
  }, [isOpen, counter, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch(`/api/counters/sessions/${counter.sessionId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        console.error("Error closing session");
      }
    } catch (error) {
      console.error("Failed to close session", error);
    }
  };

  if (!counter || !counter.sessionId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close Counter: {counter.name}</DialogTitle>
        </DialogHeader>
        
        <div className="bg-muted p-4 rounded-md mb-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Expected Cash:</span>
            <span className="font-bold font-mono">PKR {expectedAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Actual Cash Entered:</span>
            <span className="font-bold font-mono">PKR {Number(actualAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 mt-2">
            <span className="text-sm font-medium">Difference:</span>
            <span className={`font-bold font-mono ${difference > 0 ? "text-green-600" : difference < 0 ? "text-red-600" : ""}`}>
              {difference > 0 ? "+" : ""}PKR {difference.toFixed(2)}
            </span>
          </div>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="actualAmount">Actual Counted Cash (PKR) *</Label>
            <Input id="actualAmount" type="number" step="0.01" {...register("actualAmount", { valueAsNumber: true })} />
            {errors.actualAmount && <p className="text-red-500 text-sm">{errors.actualAmount.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Explain discrepancies)</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} variant="danger">
              {isSubmitting ? "Closing..." : "Close & Reconcile"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
