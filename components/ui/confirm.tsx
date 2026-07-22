"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";
import { useT } from "@/lib/i18n/client";

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
};

type Request = ConfirmOptions & { resolve: (result: boolean) => void };

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Styled replacement for the native window.confirm(). Returns a promise
 *  that resolves true when confirmed, false when cancelled or dismissed. */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const t = useT();

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => setRequest({ ...options, resolve }));
  }, []);

  const settle = useCallback((result: boolean) => {
    setRequest((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  const tone = request?.tone ?? "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!request}
        onClose={() => settle(false)}
        title={request?.title ?? ""}
        widthClass="max-w-sm"
      >
        <div className="flex gap-3.5">
          <div
            className={
              tone === "danger"
                ? "w-9 h-9 flex-none rounded-full bg-red/10 text-red flex items-center justify-center"
                : "w-9 h-9 flex-none rounded-full bg-blue-soft text-blue flex items-center justify-center"
            }
          >
            <AlertTriangle size={18} />
          </div>
          <p className="text-[13.5px] leading-relaxed text-text-2 pt-1">
            {request?.message ?? t("common.cannotUndo")}
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-5">
          <Button variant="secondary" onClick={() => settle(false)}>
            {request?.cancelLabel ?? t("common.cancel")}
          </Button>
          <Button
            onClick={() => settle(true)}
            className={tone === "danger" ? "bg-red text-white hover:bg-red/90" : undefined}
          >
            {request?.confirmLabel ?? t("common.confirm")}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
