"use client";

import * as React from "react";

import { cn } from "../lib/utils";
import { InputControl } from "./ui/input-control";
import { Label } from "./ui/label";

export interface InputProps extends React.ComponentProps<typeof InputControl> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className, ...props }: InputProps) {
  const genId = React.useId();
  const inputId = id ?? genId;

  return (
    <div className={cn("flex flex-col gap-1.5")}>
      {label ? <Label htmlFor={inputId}>{label}</Label> : null}
      <InputControl
        id={inputId}
        className={cn(error && "border-destructive", className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
