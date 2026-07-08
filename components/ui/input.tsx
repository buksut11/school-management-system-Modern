"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full h-10 rounded-xl px-3.5 text-[14px] bg-input text-text placeholder:text-text-2 border border-transparent transition-all duration-200",
        "focus:bg-solid focus:border-blue/30 focus:ring-4 focus:ring-blue-soft",
        className
      )}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "w-full h-10 rounded-xl px-3.5 text-[14px] bg-input text-text border border-transparent transition-all duration-200",
        "focus:bg-solid focus:border-blue/30 focus:ring-4 focus:ring-blue-soft",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export const Label = forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(function Label({ className, ...props }, ref) {
  return (
    <label
      ref={ref}
      className={cn("text-[12.5px] font-medium text-text-2 mb-1.5 block", className)}
      {...props}
    />
  );
});
