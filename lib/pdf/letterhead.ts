import type jsPDF from "jspdf";

export function drawLetterhead(doc: jsPDF, title: string, schoolName: string) {
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName, 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(title, 14, 25);
  doc.setDrawColor(220);
  doc.line(14, 29, 196, 29);
  doc.setTextColor(0);
}

// Neutral footer for every generated document — no hard-coded school
// name, so each tenant's paperwork reads as its own.
export function drawDocumentFooter(doc: jsPDF, y = 285) {
  doc.setFontSize(9);
  doc.setTextColor(140);
  doc.text("This is a system-generated document.", 14, y);
  doc.setTextColor(0);
}
