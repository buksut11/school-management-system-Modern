import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoney } from "@/lib/utils";
import { drawLetterhead, drawDocumentFooter } from "./letterhead";

export type FeeReceiptData = {
  student_name: string;
  class_name: string | null;
  due: number;
  paid: number;
  balance: number;
  status: string;
};

export function feeReceiptFilename(fee: FeeReceiptData) {
  return `fee-receipt-${slug(fee.student_name)}.pdf`;
}

export function downloadFeeReceipt(fee: FeeReceiptData, schoolName: string) {
  buildFeeReceipt(fee, schoolName).save(feeReceiptFilename(fee));
}

export function buildFeeReceipt(fee: FeeReceiptData, schoolName: string) {
  const doc = new jsPDF();
  drawLetterhead(doc, "Fee Receipt", schoolName);

  doc.setFontSize(10);
  doc.text(`Student: ${fee.student_name}`, 14, 40);
  doc.text(`Class: ${fee.class_name ?? "—"}`, 14, 46);
  doc.text(`Issued: ${new Date().toLocaleDateString()}`, 14, 52);

  autoTable(doc, {
    startY: 60,
    head: [["Description", "Amount"]],
    body: [
      ["Term fees due", formatMoney(fee.due)],
      ["Amount paid", formatMoney(fee.paid)],
      ["Balance remaining", formatMoney(fee.balance)],
    ],
    theme: "grid",
    headStyles: { fillColor: [0, 122, 255] },
  });

  doc.setFontSize(11);
  doc.text(`Status: ${fee.status.toUpperCase()}`, 14, 105);

  drawDocumentFooter(doc);

  return doc;
}

function slug(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}
