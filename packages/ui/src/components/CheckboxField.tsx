"use client";

import * as React from "react";

import { cn } from "../lib/utils";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";

export interface CheckboxFieldProps extends Omit<
  React.ComponentProps<typeof Checkbox>,
  "id"
> {
  label: React.ReactNode;
  id?: string;
  containerClassName?: string;
}

export function CheckboxField({
  label,
  id,
  className,
  containerClassName,
  ...props
}: CheckboxFieldProps) {
  const genId = React.useId();
  const boxId = id ?? genId;

  return (
    <div className={cn("flex flex-row items-center gap-2", containerClassName)}>
      <Checkbox id={boxId} className={className} {...props} />
      <Label htmlFor={boxId} className="cursor-pointer font-normal">
        {label}
      </Label>
    </div>
  );
}
