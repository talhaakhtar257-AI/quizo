"use client";

import { forwardRef, useEffect, useState, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { buttonVariants, type ButtonVariant, type ButtonSize } from "./button-variants";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      type,
      children,
      ...props
    },
    ref
  ) => {
    // Every form in this app is <form onSubmit={handler}> with
    // preventDefault() inside the handler. Before React hydrates there IS no
    // handler, so a tap falls through to the browser's native submit — a GET
    // to the same URL that reloads the page, silently discarding whatever was
    // typed, with no error. On a phone or a slow connection that window is
    // wide enough to hit by accident, and it's exactly the bug reported in
    // docs/BUILD-PLAN.md Phase I and again in Phase N.
    //
    // Fixing it here fixes it for all 11 forms at once: a submit button stays
    // disabled until this component has actually mounted on the client.
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);
    const isSubmit = type === undefined || type === "submit";
    const notReady = isSubmit && !hydrated;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading || notReady}
        className={buttonVariants({ variant, size, className })}
        {...props}
      >
        {loading && (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
