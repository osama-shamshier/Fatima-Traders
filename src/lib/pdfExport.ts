import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PartyReportItem {
  name: string;
  companyName?: string | null;
  contactNumber?: string | null;
  address?: string | null;
  outstandingAmount: number;
  isActive?: boolean;
}

export interface GeneratePartiesPDFOptions {
  partyType: "Customers" | "Suppliers";
  areaQuery?: string;
  filterType?: string;
  items: PartyReportItem[];
  totalOutstanding: number;
  storeName?: string;
}

export function generatePartiesPDF({
  partyType,
  areaQuery = "",
  filterType = "ALL",
  items,
  totalOutstanding,
  storeName = "FATIMA TRADERS",
}: GeneratePartiesPDFOptions) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const isCustomer = partyType === "Customers";
  const amountHeader = isCustomer ? "Remaining Due (PKR)" : "Payable Due (PKR)";
  const reportTitle = isCustomer
    ? "Customer Accounts & Balances Directory"
    : "Supplier Accounts & Payables Directory";

  // Document Title Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(storeName.toUpperCase(), 14, 10);

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(reportTitle, 14, 17);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });

  doc.setFontSize(8);
  doc.text(`Generated: ${dateStr} at ${timeStr}`, 196, 10, { align: "right" });
  doc.text(`Total Records: ${items.length}`, 196, 17, { align: "right" });

  // Table Data Preparation
  const tableRows = items.map((item, index) => {
    return [
      (index + 1).toString(),
      item.name || "-",
      item.companyName || "-",
      item.contactNumber || "-",
      item.address || "-",
      Number(item.outstandingAmount || 0).toLocaleString("en-PK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      item.isActive !== false ? "Active" : "Inactive",
    ];
  });

  // Generate Table directly below header without filter criteria box
  autoTable(doc, {
    startY: 29,
    head: [
      [
        "#",
        isCustomer ? "Customer Name" : "Supplier Name",
        "Company / Firm",
        "Contact",
        "Address / Area",
        amountHeader,
        "Status",
      ],
    ],
    body: tableRows,
    foot: [
      [
        "",
        "TOTAL",
        "",
        "",
        "",
        `Rs. ${Number(totalOutstanding || 0).toLocaleString("en-PK", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `${items.length} ${isCustomer ? "Customers" : "Suppliers"}`,
      ],
    ],
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "left",
    },
    footStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      overflow: "linebreak",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 38, fontStyle: "bold" },
      2: { cellWidth: 32 },
      3: { cellWidth: 26 },
      4: { cellWidth: 42 },
      5: { cellWidth: 26, halign: "right", fontStyle: "bold", textColor: [190, 18, 60] },
      6: { cellWidth: 14, halign: "center" },
    },
    didDrawPage: (data) => {
      // Page footer
      const pageNumber = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `Page ${data.pageNumber} of ${pageNumber} • ${storeName} Retail Management System`,
        105,
        290,
        { align: "center" }
      );
    },
  });

  // Filename formatting
  const sanitizedArea = areaQuery.trim()
    ? `_${areaQuery.trim().replace(/[^a-zA-Z0-9_-]/g, "_")}`
    : "";
  const dateStamp = now.toISOString().slice(0, 10);
  const filename = `${partyType}_Report${sanitizedArea}_${dateStamp}.pdf`;

  doc.save(filename);
}

export interface SalesSummaryItem {
  id: string;
  invoiceNumber: string;
  saleDate: string | Date;
  buyerName: string;
  branchName: string;
  cashierName: string;
  grandTotal: number;
  amountPaid: number;
  outstandingAmount: number;
  roundOff?: number;
  paymentMethod: string;
  paymentStatus: string;
}

export interface GenerateSalesSummaryPDFOptions {
  periodLabel: string;
  sales: SalesSummaryItem[];
  totalSales: number;
  totalPaid: number;
  totalOutstanding: number;
  totalRoundOff?: number;
  storeName?: string;
}

/**
 * Generates and downloads a clean, professional Sales Summary PDF report
 */
export function generateSalesSummaryPDF({
  periodLabel,
  sales,
  totalSales,
  totalPaid,
  totalOutstanding,
  totalRoundOff = 0,
  storeName = "FATIMA TRADERS",
}: GenerateSalesSummaryPDFOptions) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Top Dark Banner Header (297mm width for landscape A4)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 297, 24, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(storeName.toUpperCase(), 14, 10);

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225); // slate-300
  const safePeriod = cleanAscii(periodLabel, "All Time");
  doc.text(`Sales Summary Report • Filter: ${safePeriod}`, 14, 17);

  // Metadata right aligned
  doc.setFontSize(8);
  doc.text(`Generated: ${dateStr} at ${timeStr}`, 283, 10, { align: "right" });
  doc.text(`Total Invoices: ${sales.length}`, 283, 17, { align: "right" });

  // Summary Metrics Bar
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, 28, 269, 14, 2, 2, "FD");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85); // slate-700

  // Metrics items
  const formatPKR = (num: number) =>
    `Rs. ${Number(num || 0).toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  doc.text(`Total Sales: `, 18, 37);
  doc.setTextColor(30, 41, 59);
  doc.text(formatPKR(totalSales), 40, 37);

  doc.setTextColor(51, 65, 85);
  doc.text(`Total Paid (Cash/Bank): `, 90, 37);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(formatPKR(totalPaid), 130, 37);

  doc.setTextColor(51, 65, 85);
  doc.text(`Outstanding Due: `, 175, 37);
  doc.setTextColor(225, 29, 72); // rose-600
  doc.text(formatPKR(totalOutstanding), 205, 37);

  if (totalRoundOff !== 0) {
    doc.setTextColor(51, 65, 85);
    doc.text(`Round Off: `, 245, 37);
    doc.setTextColor(100, 116, 139);
    doc.text(`${totalRoundOff > 0 ? "+" : ""}${Number(totalRoundOff || 0).toFixed(2)}`, 265, 37);
  }

  // Table Data Preparation
  const tableRows = sales.map((sale, index) => {
    const saleDateStr = new Date(sale.saleDate).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    return [
      (index + 1).toString(),
      sale.invoiceNumber,
      saleDateStr,
      cleanAscii(sale.buyerName, "Walk-in Customer"),
      cleanAscii(sale.branchName, "Main Branch"),
      cleanAscii(sale.cashierName, "Admin"),
      Number(sale.grandTotal || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 }),
      Number(sale.amountPaid || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 }),
      Number(sale.outstandingAmount || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 }),
      sale.paymentMethod || "CASH",
      sale.paymentStatus || "PAID",
    ];
  });

  autoTable(doc, {
    startY: 46,
    head: [
      [
        "#",
        "Invoice #",
        "Date",
        "Customer / Buyer",
        "Branch",
        "Cashier",
        "Grand Total",
        "Amount Paid",
        "Outstanding",
        "Method",
        "Status",
      ],
    ],
    body: tableRows,
    foot: [
      [
        "",
        "TOTAL",
        `${sales.length} Bills`,
        "",
        "",
        "",
        formatPKR(totalSales),
        formatPKR(totalPaid),
        formatPKR(totalOutstanding),
        "",
        "",
      ],
    ],
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    footStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      overflow: "linebreak",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 26, fontStyle: "bold", textColor: [37, 99, 235] },
      2: { cellWidth: 24, fontStyle: "normal" },
      3: { cellWidth: 48, fontStyle: "bold" },
      4: { cellWidth: 26 },
      5: { cellWidth: 24 },
      6: { cellWidth: 28, halign: "right", fontStyle: "bold" },
      7: { cellWidth: 28, halign: "right", fontStyle: "bold", textColor: [5, 150, 105] },
      8: { cellWidth: 28, halign: "right", fontStyle: "bold", textColor: [225, 29, 72] },
      9: { cellWidth: 16, halign: "center" },
      10: { cellWidth: 16, halign: "center" },
    },
    didDrawPage: (data) => {
      const pageNumber = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `Page ${data.pageNumber} of ${pageNumber} • ${storeName} Retail Management System`,
        148,
        202,
        { align: "center" }
      );
    },
  });

  const sanitizedPeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dateStamp = now.toISOString().slice(0, 10);
  const filename = `Sales_Summary_${sanitizedPeriod}_${dateStamp}.pdf`;

  doc.save(filename);
}

/**
 * Exports sales data to CSV
 */
export function exportSalesSummaryCSV({
  periodLabel,
  sales,
  totalSales,
  totalPaid,
  totalOutstanding,
}: {
  periodLabel: string;
  sales: SalesSummaryItem[];
  totalSales: number;
  totalPaid: number;
  totalOutstanding: number;
}) {
  const headers = [
    "Invoice #",
    "Date",
    "Customer / Buyer",
    "Branch",
    "Cashier",
    "Grand Total (PKR)",
    "Amount Paid (PKR)",
    "Outstanding (PKR)",
    "Round Off",
    "Payment Method",
    "Payment Status",
  ];

  const rows = sales.map((s) => [
    `"${s.invoiceNumber}"`,
    `"${new Date(s.saleDate).toLocaleDateString("en-PK")}"`,
    `"${(s.buyerName || "Walk-in Customer").replace(/"/g, '""')}"`,
    `"${(s.branchName || "Main Branch").replace(/"/g, '""')}"`,
    `"${(s.cashierName || "Admin").replace(/"/g, '""')}"`,
    s.grandTotal,
    s.amountPaid,
    s.outstandingAmount,
    s.roundOff || 0,
    `"${s.paymentMethod}"`,
    `"${s.paymentStatus}"`,
  ]);

  // Add Summary Footer Row
  rows.push([
    `"TOTAL (${sales.length} Invoices)"`,
    `""`,
    `""`,
    `""`,
    `""`,
    totalSales,
    totalPaid,
    totalOutstanding,
    `""`,
    `""`,
    `""`,
  ]);

  const csvContent =
    "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const sanitizedPeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
  link.download = `Sales_Summary_${sanitizedPeriod}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ProfitLossPDFOptions {
  periodLabel: string;
  branchName?: string;
  productName?: string;
  plData: {
    totalSalesRevenue?: number;
    grossRevenue?: number;
    totalSalesReturns?: number;
    totalReturns?: number;
    netRevenue?: number;
    revenue?: number;
    totalCOGS?: number;
    cogs?: number;
    grossProfit: number;
    grossProfitMargin?: number;
    grossMarginPercent?: number;
    operatingExpenses: number;
    netProfit: number;
    netProfitMargin?: number;
    netMarginPercent?: number;
    itemizedBreakdown?: Array<{
      id: string;
      name: string;
      sku: string;
      categoryName?: string;
      totalQty: number;
      revenue: number;
      fifoCost: number;
      profit: number;
      profitMargin: number;
      isLoss?: boolean;
    }>;
    expenseBreakdown?: Array<{
      categoryName: string;
      amount: number;
    }>;
  };
  storeName?: string;
}

function cleanAscii(str: string | null | undefined, fallback: string = ""): string {
  if (!str) return fallback;
  const s = str.trim();
  const dict: Record<string, string> = {
    "شروع سے اب تک": "All Time",
    "آج": "Today",
    "اس ہفتے": "This Week",
    "اس مہینے": "This Month",
    "پچھلے مہینے": "Last Month",
    "مخصوص مدت": "Custom Range",
    "تمام برانچز": "All Branches",
    "تمام پروڈکٹس": "All Products",
    "مین برانچ": "Main Branch",
  };
  if (dict[s]) return dict[s];
  const ascii = s.replace(/[^\x20-\x7E]/g, "").trim();
  return ascii.length > 0 ? ascii : fallback || s;
}

/**
 * Generates and downloads a clean, formatted Profit & Loss Statement PDF
 */
export function generateProfitLossPDF({
  periodLabel,
  branchName = "All Branches",
  productName = "All Products",
  plData,
  storeName = "FATIMA TRADERS",
}: ProfitLossPDFOptions) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const safePeriodLabel = cleanAscii(periodLabel, "All Time");
  const safeBranchName = cleanAscii(branchName, "All Branches");
  const safeProductName = cleanAscii(productName, "All Products");

  // Top Dark Banner Header (297mm width)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 297, 24, "F");

  // Store & Statement Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(storeName.toUpperCase(), 14, 10);

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(
    `Profit & Loss Statement (P&L) • Period: ${safePeriodLabel} • Branch: ${safeBranchName}`,
    14,
    17
  );

  // Metadata right aligned
  doc.setFontSize(8);
  doc.text(`Generated: ${dateStr} at ${timeStr}`, 283, 10, { align: "right" });
  doc.text(`Product Filter: ${safeProductName}`, 283, 17, { align: "right" });

  const formatPKR = (num: number) =>
    `Rs. ${Number(num || 0).toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const grossSales = plData.totalSalesRevenue ?? plData.grossRevenue ?? 0;
  const salesReturns = plData.totalSalesReturns ?? plData.totalReturns ?? 0;
  const netRevenue = plData.netRevenue ?? plData.revenue ?? 0;
  const cogs = plData.totalCOGS ?? plData.cogs ?? 0;
  const grossProfit = plData.grossProfit ?? 0;
  const grossMargin = plData.grossProfitMargin ?? plData.grossMarginPercent ?? 0;
  const expenses = plData.operatingExpenses ?? 0;
  const netProfit = plData.netProfit ?? 0;
  const netMargin = plData.netProfitMargin ?? plData.netMarginPercent ?? 0;

  // Key Financial Metric Cards Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, 28, 269, 15, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");

  // Net Revenue
  doc.setTextColor(71, 85, 105);
  doc.text("Net Revenue:", 18, 35);
  doc.setTextColor(15, 23, 42);
  doc.text(formatPKR(netRevenue), 18, 40);

  // FIFO COGS
  doc.setTextColor(71, 85, 105);
  doc.text("Cost of Goods (COGS):", 75, 35);
  doc.setTextColor(234, 88, 12); // orange-600
  doc.text(formatPKR(cogs), 75, 40);

  // Gross Profit
  doc.setTextColor(71, 85, 105);
  doc.text(`Gross Profit (${Number(grossMargin).toFixed(1)}%):`, 140, 35);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(formatPKR(grossProfit), 140, 40);

  // Operating Expenses
  doc.setTextColor(71, 85, 105);
  doc.text("Operating Expenses:", 200, 35);
  doc.setTextColor(225, 29, 72); // rose-600
  doc.text(formatPKR(expenses), 200, 40);

  // Net Profit
  doc.setTextColor(71, 85, 105);
  doc.text(`Net Profit (${Number(netMargin).toFixed(1)}%):`, 250, 35);
  doc.setTextColor(netProfit >= 0 ? 5 : 225, netProfit >= 0 ? 150 : 29, netProfit >= 0 ? 105 : 72);
  doc.text(formatPKR(netProfit), 250, 40);

  // Itemized Product Breakdown Table
  const items = plData.itemizedBreakdown || [];
  const tableRows = items.map((item: any, index: number) => {
    const name = cleanAscii(item.productName || item.name, "Product");
    const rawQty = Number(item.totalQuantitySold ?? item.netQuantitySold ?? item.quantitySold ?? item.totalQty ?? 0);
    const qtyFormatted = Number.isInteger(rawQty)
      ? rawQty.toString()
      : Number(rawQty.toFixed(2)).toString();
    const rev = Number(item.netRevenue ?? item.totalRevenue ?? item.grossRevenue ?? item.revenue ?? 0);
    const cost = Number(item.netCogs ?? item.totalFifoCost ?? item.grossCogs ?? item.fifoCost ?? 0);
    const profit = Number(item.grossProfit ?? item.profit ?? 0);
    const margin = Number(item.marginPercent ?? item.profitMargin ?? 0);

    return [
      (index + 1).toString(),
      name,
      cleanAscii(item.sku, "-"),
      cleanAscii(item.categoryName, "General"),
      qtyFormatted,
      rev.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      cost.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      profit.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      `${margin.toFixed(1)}%`,
      item.isLoss ? "LOSS" : "PROFIT",
    ];
  });

  const totalQtySold = items.reduce(
    (sum: number, i: any) =>
      sum + Number(i.totalQuantitySold ?? i.netQuantitySold ?? i.quantitySold ?? i.totalQty ?? 0),
    0
  );
  const totalQtyFormatted = Number.isInteger(totalQtySold)
    ? totalQtySold.toString()
    : Number(totalQtySold.toFixed(2)).toString();

  autoTable(doc, {
    startY: 48,
    head: [
      [
        "#",
        "Product Name",
        "SKU",
        "Category",
        "Qty Sold",
        "Revenue (PKR)",
        "FIFO Cost (PKR)",
        "Gross Profit (PKR)",
        "Margin (%)",
        "Status",
      ],
    ],
    body: tableRows,
    foot: [
      [
        "",
        "TOTAL / NET SUMMARY",
        "",
        `${items.length} Products`,
        totalQtyFormatted,
        formatPKR(netRevenue),
        formatPKR(cogs),
        formatPKR(grossProfit),
        `${Number(grossMargin).toFixed(1)}%`,
        grossProfit >= 0 ? "PROFIT" : "LOSS",
      ],
    ],
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    footStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      overflow: "linebreak",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 54, fontStyle: "bold" },
      2: { cellWidth: 26, fontStyle: "normal" },
      3: { cellWidth: 28 },
      4: { cellWidth: 16, halign: "center" },
      5: { cellWidth: 30, halign: "right", fontStyle: "bold" },
      6: { cellWidth: 30, halign: "right", textColor: [234, 88, 12] },
      7: { cellWidth: 32, halign: "right", fontStyle: "bold", textColor: [5, 150, 105] },
      8: { cellWidth: 20, halign: "center", fontStyle: "bold" },
      9: { cellWidth: 18, halign: "center" },
    },
    didDrawPage: (data) => {
      const pageNumber = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `Page ${data.pageNumber} of ${pageNumber} • ${storeName} Retail Management System`,
        148,
        202,
        { align: "center" }
      );
    },
  });

  const sanitizedPeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dateStamp = now.toISOString().slice(0, 10);
  const filename = `Profit_Loss_Statement_${sanitizedPeriod}_${dateStamp}.pdf`;

  doc.save(filename);
}

/**
 * Exports Profit & Loss Statement & Item Profitability to CSV
 */
export function exportProfitLossCSV({
  periodLabel,
  branchName = "All Branches",
  productName = "All Products",
  plData,
}: {
  periodLabel: string;
  branchName?: string;
  productName?: string;
  plData: any;
}) {
  const grossSales = plData.totalSalesRevenue ?? plData.grossRevenue ?? 0;
  const salesReturns = plData.totalSalesReturns ?? plData.totalReturns ?? 0;
  const netRevenue = plData.netRevenue ?? plData.revenue ?? 0;
  const cogs = plData.totalCOGS ?? plData.cogs ?? 0;
  const grossProfit = plData.grossProfit ?? 0;
  const grossMargin = plData.grossProfitMargin ?? plData.grossMarginPercent ?? 0;
  const expenses = plData.operatingExpenses ?? 0;
  const netProfit = plData.netProfit ?? 0;
  const netMargin = plData.netProfitMargin ?? plData.netMarginPercent ?? 0;

  const rows: any[] = [
    [`"PROFIT & LOSS STATEMENT"`],
    [`"Period: ${periodLabel}"`, `"Branch: ${branchName}"`, `"Product Filter: ${productName}"`],
    [],
    [`"FINANCIAL OVERVIEW"`],
    [`"Metric"`, `"Amount (PKR)"`, `"Margin %"`],
    [`"Gross Sales Revenue"`, grossSales, `""`],
    [`"Sales Returns & Refunds"`, -salesReturns, `""`],
    [`"Net Billed Revenue"`, netRevenue, `""`],
    [`"Cost of Goods Sold (FIFO COGS)"`, -cogs, `""`],
    [`"Gross Profit"`, grossProfit, `"${Number(grossMargin).toFixed(1)}%"`],
    [`"Operating Expenses"`, -expenses, `""`],
    [`"Net Operating Profit"`, netProfit, `"${Number(netMargin).toFixed(1)}%"`],
    [],
    [`"ITEM-WISE PRODUCT PROFITABILITY"`],
    [
      `"Product Name"`,
      `"SKU"`,
      `"Category"`,
      `"Quantity Sold"`,
      `"Revenue (PKR)"`,
      `"FIFO Cost (PKR)"`,
      `"Gross Profit (PKR)"`,
      `"Margin %"`,
      `"Status"`,
    ],
  ];

  const items = plData.itemizedBreakdown || [];
  for (const item of items) {
    const name = item.productName || item.name || "Product";
    const qty = Number(item.totalQuantitySold ?? item.netQuantitySold ?? item.quantitySold ?? item.totalQty ?? 0);
    const rev = Number(item.netRevenue ?? item.totalRevenue ?? item.grossRevenue ?? item.revenue ?? 0);
    const cost = Number(item.netCogs ?? item.totalFifoCost ?? item.grossCogs ?? item.fifoCost ?? 0);
    const profit = Number(item.grossProfit ?? item.profit ?? 0);
    const margin = Number(item.marginPercent ?? item.profitMargin ?? 0);

    rows.push([
      `"${name.replace(/"/g, '""')}"`,
      `"${item.sku || ""}"`,
      `"${(item.categoryName || "General").replace(/"/g, '""')}"`,
      qty,
      rev,
      cost,
      profit,
      `"${margin.toFixed(1)}%"`,
      `"${item.isLoss ? "LOSS" : "PROFIT"}"`,
    ]);
  }

  const csvContent =
    "\uFEFF" + rows.map((r) => r.join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const sanitizedPeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
  const link = document.createElement("a");
  link.href = url;
  link.download = `Profit_Loss_${sanitizedPeriod}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface LedgerEntryPDFItem {
  date: string | Date;
  type: string;
  reference?: string;
  description?: string;
  debit: number;
  credit: number;
  calculatedBalance: number;
}

export interface GenerateLedgerPDFOptions {
  partyType: "Customer" | "Supplier";
  partyName: string;
  partyPhone?: string;
  partyAddress?: string;
  startDate?: string;
  endDate?: string;
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  closingBalance: number;
  entries: LedgerEntryPDFItem[];
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
}

/**
 * Generates and downloads a clean, multi-page vector PDF Statement for Customer or Supplier Ledgers
 */
export function generateLedgerPDF({
  partyType,
  partyName,
  partyPhone,
  partyAddress,
  startDate,
  endDate,
  openingBalance,
  periodDebit,
  periodCredit,
  closingBalance,
  entries,
  storeName = "FATIMA TRADERS",
  storeAddress = "Purani Ghalla Mandi, Ahmad Pur East",
  storePhone = "0334-7776934",
}: GenerateLedgerPDFOptions) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const isCustomer = partyType === "Customer";
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Top Dark Banner Header (210mm width for portrait A4)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 26, "F");

  // Store Brand Name & Address
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(storeName.toUpperCase(), 14, 11);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`${storeAddress} | Tel: ${storePhone}`, 14, 18);

  // Statement Title (Right Aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(
    isCustomer ? "CUSTOMER ACCOUNT STATEMENT" : "SUPPLIER ACCOUNT STATEMENT",
    196,
    11,
    { align: "right" }
  );

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${dateStr} at ${timeStr}`, 196, 18, { align: "right" });

  // Party Details & Date Range Subheader Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, 30, 182, 16, 2, 2, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`${isCustomer ? "Customer" : "Supplier"}: ${cleanAscii(partyName, isCustomer ? "Customer" : "Supplier")}`, 18, 36);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  const contactText = [partyPhone, partyAddress].filter(Boolean).join(" • ");
  if (contactText) {
    doc.text(cleanAscii(contactText), 18, 42);
  }

  // Period label
  const periodText = startDate
    ? `${new Date(startDate).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })} to ${
        endDate
          ? new Date(endDate).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })
          : "Today"
      }`
    : "All Time (Beginning to Today)";

  doc.setFont("helvetica", "bold");
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text(`Period: ${cleanAscii(periodText)}`, 192, 36, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Entries: ${entries.length + (startDate ? 1 : 0)}`, 192, 42, { align: "right" });

  // Summary Metrics Bar (4 Cards)
  const formatPKR = (num: number) =>
    `Rs. ${Number(num || 0).toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const kpiY = 49;
  const kpiW = 43.5;
  const kpiH = 13;
  const kpiGap = 2.6;

  // Box 1: Opening Balance
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, kpiY, kpiW, kpiH, 1.5, 1.5, "FD");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("OPENING BALANCE", 16, kpiY + 4.5);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(formatPKR(openingBalance), 16, kpiY + 10);

  // Box 2: Period Debit
  const box2X = 14 + kpiW + kpiGap;
  doc.roundedRect(box2X, kpiY, kpiW, kpiH, 1.5, 1.5, "FD");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(isCustomer ? "PERIOD INVOICED (+)" : "PERIOD PURCHASES (+)", box2X + 2, kpiY + 4.5);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(190, 18, 60); // rose-700
  doc.text(formatPKR(periodDebit), box2X + 2, kpiY + 10);

  // Box 3: Period Credit
  const box3X = box2X + kpiW + kpiGap;
  doc.roundedRect(box3X, kpiY, kpiW, kpiH, 1.5, 1.5, "FD");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(isCustomer ? "PERIOD RECEIVED (-)" : "PERIOD PAYMENTS (-)", box3X + 2, kpiY + 4.5);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 150, 105); // emerald-700
  doc.text(formatPKR(periodCredit), box3X + 2, kpiY + 10);

  // Box 4: Closing Balance
  const box4X = box3X + kpiW + kpiGap;
  doc.setFillColor(closingBalance > 0 ? 255 : 240, closingBalance > 0 ? 241 : 253, closingBalance > 0 ? 242 : 244);
  doc.setDrawColor(closingBalance > 0 ? 254 : 167, closingBalance > 0 ? 205 : 243, closingBalance > 0 ? 211 : 208);
  doc.roundedRect(box4X, kpiY, kpiW, kpiH, 1.5, 1.5, "FD");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(closingBalance > 0 ? 190 : 5, closingBalance > 0 ? 18 : 150, closingBalance > 0 ? 60 : 105);
  doc.text(isCustomer ? "NET RECEIVABLE DUE" : "NET PAYABLE DUE", box4X + 2, kpiY + 4.5);
  doc.setFontSize(9);
  doc.text(formatPKR(closingBalance), box4X + 2, kpiY + 10);

  // Prepare Table Rows
  const tableRows: any[] = [];

  // Opening Balance row if starting date
  if (startDate) {
    const openDateStr = new Date(startDate).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    tableRows.push([
      "-",
      openDateStr,
      "OPENING",
      "-",
      "Opening Balance Brought Forward",
      "-",
      "-",
      Number(openingBalance || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 }),
    ]);
  }

  entries.forEach((item, index) => {
    const itemDateStr = item.date
      ? new Date(item.date).toLocaleDateString("en-PK", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "-";

    tableRows.push([
      (index + 1).toString(),
      itemDateStr,
      item.type || "-",
      cleanAscii(item.reference, "-"),
      cleanAscii(item.description, "-"),
      item.debit > 0
        ? Number(item.debit).toLocaleString("en-PK", { minimumFractionDigits: 2 })
        : "-",
      item.credit > 0
        ? Number(item.credit).toLocaleString("en-PK", { minimumFractionDigits: 2 })
        : "-",
      Number(item.calculatedBalance || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 }),
    ]);
  });

  if (tableRows.length === 0) {
    tableRows.push(["-", "-", "-", "-", "No ledger entries found for this period", "-", "-", "0.00"]);
  }

  autoTable(doc, {
    startY: 66,
    head: [
      [
        "#",
        "Date",
        "Type",
        "Ref / Invoice #",
        "Description / Notes",
        "Debit (+)",
        "Credit (-)",
        "Balance (PKR)",
      ],
    ],
    body: tableRows,
    foot: [
      [
        "",
        "TOTAL",
        "",
        "",
        `${entries.length} Transactions`,
        formatPKR(periodDebit),
        formatPKR(periodCredit),
        formatPKR(closingBalance),
      ],
    ],
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    footStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      overflow: "linebreak",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 7, halign: "center" },
      1: { cellWidth: 22 },
      2: { cellWidth: 18, fontStyle: "bold" },
      3: { cellWidth: 26, fontStyle: "bold", textColor: [37, 99, 235] },
      4: { cellWidth: 41 },
      5: { cellWidth: 22, halign: "right", fontStyle: "bold", textColor: [190, 18, 60] },
      6: { cellWidth: 22, halign: "right", fontStyle: "bold", textColor: [5, 150, 105] },
      7: { cellWidth: 24, halign: "right", fontStyle: "bold", textColor: [15, 23, 42] },
    },
    didDrawPage: (data) => {
      const pageNumber = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `Page ${data.pageNumber} of ${pageNumber} • ${storeName} Retail Management System`,
        105,
        290,
        { align: "center" }
      );
    },
  });

  // Check if we need a new page for signature block or attach to bottom
  const finalY = (doc as any).lastAutoTable?.finalY || 200;
  let sigY = finalY + 14;
  if (sigY > 265) {
    doc.addPage();
    sigY = 30;
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);

  doc.line(16, sigY + 10, 60, sigY + 10);
  doc.text("Prepared By", 38, sigY + 15, { align: "center" });

  doc.line(83, sigY + 10, 127, sigY + 10);
  doc.text(isCustomer ? "Customer Signature" : "Vendor Signature", 105, sigY + 15, { align: "center" });

  doc.line(150, sigY + 10, 194, sigY + 10);
  doc.text("Authorized Signatory", 172, sigY + 15, { align: "center" });

  const sanitizedName = partyName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dateStamp = now.toISOString().slice(0, 10);
  const filename = `${partyType}_Ledger_${sanitizedName}_${dateStamp}.pdf`;

  doc.save(filename);
}

