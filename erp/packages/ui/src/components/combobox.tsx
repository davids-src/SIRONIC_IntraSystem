"use client";

import { useId, useMemo, useState } from "react";
import { Input } from "./input";
import { AnchoredDropdown } from "./anchored-dropdown";
import { cn } from "@erp/lib";

export type ComboboxOption = { value: string; label: string };

export type ComboboxProps = {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
};

/**
 * Text input that can be typed into freely OR filled from a suggestion list — unlike a plain
 * `<select>`, the value isn't constrained to `options`. Selecting a suggestion just fills its
 * label into the input; callers decide whether the final text matches a known option.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  emptyMessage = "Nincs találat",
  className,
  disabled = false,
  id,
}: ComboboxProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, value]);

  const selectOption = (option: ComboboxOption) => {
    onChange(option.label);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const option = filtered[activeIndex];
      if (option) selectOption(option);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <AnchoredDropdown
      open={open && !disabled}
      onClose={() => setOpen(false)}
      id={listId}
      anchorClassName={className}
      anchor={
        <Input
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />
      }
    >
      <ul>
        {filtered.length === 0 && (
          <li className="text-muted-foreground px-3 py-2 text-sm">{emptyMessage}</li>
        )}
        {filtered.map((option, idx) => (
          <li key={option.value}>
            <button
              type="button"
              role="option"
              aria-selected={idx === activeIndex}
              className={cn(
                "hover:bg-accent flex w-full px-3 py-2 text-left text-sm",
                idx === activeIndex && "bg-accent",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(option);
              }}
            >
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    </AnchoredDropdown>
  );
}
