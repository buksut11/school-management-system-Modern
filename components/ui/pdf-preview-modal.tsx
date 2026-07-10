"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer, FileDown, Loader2 } from "lucide-react";
import type jsPDF from "jspdf";

/** Previews a generated PDF in an iframe so the user can look it over before
 *  printing or downloading. `load` is called lazily when the modal opens,
 *  which keeps the heavy jsPDF bundle out of the initial page load. */
export function PdfPreviewModal({
  open,
  onClose,
  title,
  load,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  load: () => Promise<{ doc: jsPDF; filename: string }>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const docRef = useRef<jsPDF | null>(null);
  const filenameRef = useRef("document.pdf");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!open) return;
    let objectUrl: string | null = null;
    let cancelled = false;

    load().then(({ doc, filename }) => {
      if (cancelled) return;
      docRef.current = doc;
      filenameRef.current = filename;
      objectUrl = URL.createObjectURL(doc.output("blob"));
      setUrl(objectUrl);
    });

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKey);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const print = () => {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  };
  const download = () => docRef.current?.save(filenameRef.current);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl rounded-[24px] bg-solid border border-line shadow-card-lg max-h-[92vh] flex flex-col animate-modal-in">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-line">
          <h2 className="text-[16px] font-semibold tracking-tight truncate">{title}</h2>
          <div className="flex items-center gap-1.5 flex-none">
            <button
              onClick={print}
              disabled={!url}
              className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-[13px] text-text-2 hover:bg-hover hover:text-blue transition-colors disabled:opacity-40"
              aria-label="Print"
            >
              <Printer size={15} /> Print
            </button>
            <button
              onClick={download}
              disabled={!url}
              className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-[13px] text-text-2 hover:bg-hover hover:text-blue transition-colors disabled:opacity-40"
              aria-label="Download PDF"
            >
              <FileDown size={15} /> Download
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-2 hover:bg-hover hover:text-text transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-4">
          {url ? (
            <iframe
              ref={iframeRef}
              src={url}
              title={title}
              className="w-full h-[70vh] rounded-xl border border-line bg-white"
            />
          ) : (
            <div className="flex items-center justify-center gap-2 h-[70vh] text-[13px] text-text-2">
              <Loader2 size={16} className="animate-spin" /> Generating preview…
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
