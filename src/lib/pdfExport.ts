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
  doc.text(`Sales Summary Report • Filter: ${periodLabel}`, 14, 17);

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
      sale.buyerName || "Walk-in Customer",
      sale.branchName || "Main Branch",
      sale.cashierName || "Admin",
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
