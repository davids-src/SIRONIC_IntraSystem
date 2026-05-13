"use client";

import * as React from "react";

import { cn } from "../lib/utils";
import { Label } from "./ui/label";
import { TextareaControl } from "./ui/textarea-control";

export interface TextareaProps extends React.ComponentProps<typeof TextareaControl> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, id, className, ...props }: TextareaProps) {
  const genId = React.useId();
  const fieldId = id ?? genId;

  return (
    <div className={cn("flex flex-col gap-1.5")}>
      {label ? <Label htmlFor={fieldId}>{label}</Label> : null}
      <TextareaControl
        id={fieldId}
        className={cn(error && "border-destructive", className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
