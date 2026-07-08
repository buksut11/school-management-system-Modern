import type jsPDF from "jspdf";

export function drawLetterhead(doc: jsPDF, title: string) {
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Sh.Asharow Primary & Secondary School", 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(title, 14, 25);
  doc.setDrawColor(220);
  doc.line(14, 29, 196, 29);
  doc.setTextColor(0);
}
