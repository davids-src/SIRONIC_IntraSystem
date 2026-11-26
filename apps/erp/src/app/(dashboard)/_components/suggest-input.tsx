"use client";

import { useState } from "react";
import { Combobox } from "@erp/ui";

/**
 * Free-text form field that offers the values already in use while you type — the same pattern
 * as the Gépdokumentum típus picker. Anything can be typed; a new value becomes a suggestion
 * once it is saved. Posts under `name` in a plain `<form>`.
 */
export function SuggestInput({
  id,
  name,
  defaultValue,
  suggestions,
  placeholder,
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  suggestions: string[];
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <>
      <Combobox
        id={id}
        value={value}
        onChange={setValue}
        options={suggestions.map((s) => ({ value: s, label: s }))}
        placeholder={placeholder}
        emptyMessage="Új érték — mentés után bekerül a javaslatok közé"
      />
      <input type="hidden" name={name} value={value} />
    </>
  );
}
