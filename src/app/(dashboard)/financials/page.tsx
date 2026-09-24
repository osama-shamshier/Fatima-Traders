"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableLoader } from "@/components/ui/loader";
import { ArrowDownRight, ArrowUpRight, DollarSign, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { calculateOfflineCashFlow, calculateOfflineGeneralLedger } from "@/lib/offline/cacheService";

export default function FinancialsPage() {
  const t = useTranslations("financials");
  const tc = useTranslations("common");

  const [ledger, setLedger] = useState<any[]>([]);
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [loadingCashFlow, setLoadingCashFlow] = useState(true);

  const loadFinancials = async () => {
    setLoadingLedger(true);
    setLoadingCashFlow(true);

    try {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        const [lRes, cfRes] = await Promise.all([
          fetch("/api/financials/ledger").catch(() => null),
          fetch("/api/financials/cash-flow").catch(() => null),
        ]);

        if (lRes && lRes.ok) {
          const lData = await lRes.json();
          setLedger(lData);
        } else {
          const offlineLedger = await calculateOfflineGeneralLedger();
          setLedger(offlineLedger);
        }

        if (cfRes && cfRes.ok) {
          const cfData = await cfRes.json();
          setCashFlow(cfData);
        } else {
          const offlineCF = await calculateOfflineCashFlow();
          setCashFlow(offlineCF);
        }

        setLoadingLedger(false);
        setLoadingCashFlow(false);
        return;
      }
    } catch (e) {
      console.warn("Online fetch financials failed, falling back to offline calculations:", e);
    }

    // Offline calculations fallback
    try {
      const [offlineLedger, offlineCF] = await Promise.all([
        calculateOfflineGeneralLedger(),
        calculateOfflineCashFlow(),
      ]);
      setLedger(offlineLedger);
      setCashFlow(offlineCF);
    } catch (err) {
      console.error("Failed to calculate offline financials:", err);
    } finally {
      setLoadingLedger(false);
      setLoadingCashFlow(false);
    }
  };

  useEffect(() => {
    loadFinancials();
    const handleOnline = () => loadFinancials();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-600" /> {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
      </div>

      <Tabs defaultValue="ledger" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl mb-4">
          <TabsTrigger value="ledger" className="rounded-lg text-xs font-semibold">
            {t("tabLedger")}
          </TabsTrigger>
          <TabsTrigger value="cash-flow" className="rounded-lg text-xs font-semibold">
            {t("tabCashFlow")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="relative w-full overflow-auto max-h-[600px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b font-bold uppercase sticky top-0 z-10">
                  <tr>
                    <th className="p-3.5">{t("colDate")}</th>
                    <th className="p-3.5">{t("colType")}</th>
                    <th className="p-3.5">{t("colDescription")}</th>
                    <th className="p-3.5 text-right">{t("colDebit")}</th>
                    <th className="p-3.5 text-right">{t("colCredit")}</th>
                    <th className="p-3.5 text-right">{t("colBalance")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loadingLedger ? (
                    <TableLoader colSpan={6} text="Loading general ledger..." />
                  ) : (
                    ledger.map((entry, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">{formatDate(new Date(entry.date))}</td>
                        <td className="p-3.5">
                          <Badge variant={entry.credit > 0 ? "success" : "outline"} className="text-[10px] font-bold">
                            {entry.type}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-slate-700">{entry.description}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-rose-600">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-600">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                        </td>
                        <td
                          className={cn(
                            "p-3.5 text-right font-mono font-black text-sm",
                            entry.balance >= 0 ? "text-emerald-700" : "text-rose-600"
                          )}
                        >
                          {formatCurrency(entry.balance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cash-flow" className="space-y-4">
          {loadingCashFlow ? (
            <TableLoader colSpan={3} text="Loading cash flow..." />
          ) : (
            cashFlow && (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="shadow-2xs">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-bold uppercase text-slate-500">{t("totalCashIn")}</CardTitle>
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-black font-mono text-emerald-600">
                        {formatCurrency(cashFlow.totalCashIn)}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{t("totalCashInDesc")}</p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-2xs">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-bold uppercase text-slate-500">{t("totalCashOut")}</CardTitle>
                      <ArrowDownRight className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-black font-mono text-rose-600">
                        {formatCurrency(cashFlow.totalCashOut)}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{t("totalCashOutDesc")}</p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-2xs bg-slate-900 text-white border-slate-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-bold uppercase text-slate-300">{t("netCashFlow")}</CardTitle>
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                      <div
                        className={cn(
                          "text-2xl font-black font-mono",
                          cashFlow.netCashFlow >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}
                      >
                        {formatCurrency(cashFlow.netCashFlow)}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{t("netCashFlowDesc")}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <Card className="shadow-2xs">
                    <CardHeader>
                      <CardTitle className="text-xs font-bold uppercase text-slate-700">{t("cashInBreakdown")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-slate-600">{t("cashSales")}</span>
                        <span className="font-mono font-bold text-emerald-600">{formatCurrency(cashFlow.cashSales || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-slate-600">{t("buyerReceipts")}</span>
                        <span className="font-mono font-bold text-emerald-600">{formatCurrency(cashFlow.buyerPayments || 0)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-2xs">
                    <CardHeader>
                      <CardTitle className="text-xs font-bold uppercase text-slate-700">{t("cashOutBreakdown")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-slate-600">{t("supplierPayments")}</span>
                        <span className="font-mono font-bold text-rose-600">{formatCurrency(cashFlow.supplierPayments || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-slate-600">{t("operatingExpenses")}</span>
                        <span className="font-mono font-bold text-rose-600">{formatCurrency(cashFlow.expenses || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-slate-600">{t("salesReturnsCash")}</span>
                        <span className="font-mono font-bold text-rose-600">{formatCurrency(cashFlow.cashRefunds || 0)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
