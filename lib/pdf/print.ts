import type jsPDF from "jspdf";

/** Prints a generated PDF straight away — no visible preview. Loads it into
 *  a hidden iframe and opens the browser's print dialog. The iframe and its
 *  object URL are cleaned up once printing finishes (or after a fallback
 *  delay, since onafterprint isn't fired by every browser). */
export function printPdf(doc: jsPDF) {
  const url = URL.createObjectURL(doc.output("blob"));
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.src = url;

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    URL.revokeObjectURL(url);
    iframe.remove();
  };

  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) {
      cleanup();
      return;
    }
    win.addEventListener("afterprint", cleanup);
    win.focus();
    win.print();
    // Fallback cleanup in case afterprint never fires.
    window.setTimeout(cleanup, 60000);
  };

  document.body.appendChild(iframe);
}
