import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSaleRecord, ProcessSalePayload } from "@/lib/saleService";

export interface SyncBatchResultItem {
  offlineId: string;
  offlineInvoiceNumber?: string | null;
  serverInvoiceNumber?: string;
  saleId?: string;
  status: "SUCCESS" | "FAILED" | "DUPLICATE";
  error?: string;
  discrepancies?: any[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sales: ProcessSalePayload[] = body.sales || [];

    if (!Array.isArray(sales) || sales.length === 0) {
      return NextResponse.json({ error: "No sales provided for sync" }, { status: 400 });
    }

    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "No authenticated user available for sync" }, { status: 401 });
    }
    const userId = user.id;

    // Sort sales chronologically by offlineCreatedAt to process in true sequential order
    sales.sort((a, b) => {
      const timeA = a.offlineCreatedAt ? new Date(a.offlineCreatedAt).getTime() : 0;
      const timeB = b.offlineCreatedAt ? new Date(b.offlineCreatedAt).getTime() : 0;
      return timeA - timeB;
    });

    const results: SyncBatchResultItem[] = [];

    // Process each sale in its own isolated transaction so one bad payload does not block the whole batch
    for (const salePayload of sales) {
      const offlineId = salePayload.offlineId || `unknown-${Date.now()}`;

      try {
        const syncResult = await prisma.$transaction(
          async (tx) => {
            return await createSaleRecord(tx, salePayload, {
              userId,
              isOfflineSync: true,
            });
          },
          {
            maxWait: 15000,
            timeout: 60000,
          }
        );

        results.push({
          offlineId,
          offlineInvoiceNumber: salePayload.offlineInvoiceNumber,
          serverInvoiceNumber: syncResult.sale.invoiceNumber,
          saleId: syncResult.sale.id,
          status: syncResult.isDuplicate ? "DUPLICATE" : "SUCCESS",
          discrepancies: syncResult.discrepancies,
        });
      } catch (err: any) {
        console.error(`Failed to sync offline sale ${offlineId}:`, err);
        results.push({
          offlineId,
          offlineInvoiceNumber: salePayload.offlineInvoiceNumber,
          status: "FAILED",
          error: err.message || "Failed to process sale on server",
        });
      }
    }

    const successCount = results.filter((r) => r.status === "SUCCESS" || r.status === "DUPLICATE").length;
    const failedCount = results.filter((r) => r.status === "FAILED").length;

    return NextResponse.json({
      success: true,
      totalReceived: sales.length,
      successCount,
      failedCount,
      results,
    });
  } catch (error: any) {
    console.error("Batch sync fatal error:", error);
    return NextResponse.json({ error: error.message || "Sync endpoint error" }, { status: 500 });
  }
}
