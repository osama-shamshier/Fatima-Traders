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
