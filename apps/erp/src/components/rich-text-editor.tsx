"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Heading2,
  Heading3,
  Code,
  Type,
} from "lucide-react";
import { Button } from "@erp/ui";
import { Label } from "@erp/ui";
import { Textarea } from "@erp/ui";
import { cn } from "@erp/lib";

type VariableGroup = { cim: string; valtozok: Array<{ key: string; label: string }> };

type RichTextEditorProps = {
  name: string;
  defaultValue?: string;
  variables?: string[];
  /** Labelled variables in named groups — rendered as a picker instead of the flat list. */
  variableGroups?: VariableGroup[];
  label?: string;
  /** Called with the current HTML on every edit (e.g. to check the variables live). */
  onChange?: (html: string) => void;
  /** Taller editing area for long documents. */
  tall?: boolean;
};

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  name,
  defaultValue = "",
  variables = [],
  variableGroups,
  label,
  onChange,
  tall = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"visual" | "source">("visual");
  const [html, setHtml] = useState(defaultValue);
  const [csoport, setCsoport] = useState(0);

  useEffect(() => {
    onChange?.(html);
  }, [html, onChange]);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (editorRef.current) {
      setHtml(editorRef.current.innerHTML);
    }
  }, []);

  const insertVariable = useCallback(
    (varName: string) => {
      const token = `{{${varName}}}`;
      if (mode === "source") {
        setHtml((prev) => prev + token);
        return;
      }
      editorRef.current?.focus();
      document.execCommand("insertText", false, token);
      if (editorRef.current) {
        setHtml(editorRef.current.innerHTML);
      }
    },
    [mode],
  );

  const syncFromEditor = () => {
    if (editorRef.current) {
      setHtml(editorRef.current.innerHTML);
    }
  };

  const switchToSource = () => {
    syncFromEditor();
    setMode("source");
  };

  const switchToVisual = () => {
    setMode("visual");
    requestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <Label>{label}</Label>}
      <input type="hidden" name={name} value={html} />

      <div className="border-border bg-muted/40 flex flex-wrap items-center gap-0.5 rounded-t-md border border-b-0 p-1">
        <ToolbarButton onClick={() => exec("bold")} title="Félkövér">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("italic")} title="Dőlt">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("underline")} title="Aláhúzás">
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <span className="bg-border mx-1 h-5 w-px" />
        <ToolbarButton onClick={() => exec("formatBlock", "h2")} title="Címsor 2">
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("formatBlock", "h3")} title="Címsor 3">
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("formatBlock", "p")} title="Bekezdés">
          <Type className="h-4 w-4" />
        </ToolbarButton>
        <span className="bg-border mx-1 h-5 w-px" />
        <ToolbarButton onClick={() => exec("insertUnorderedList")} title="Lista">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("insertOrderedList")} title="Számozott lista">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            const url = window.prompt("URL");
            if (url) exec("createLink", url);
          }}
          title="Link"
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <span className="bg-border mx-1 h-5 w-px" />
        <Button
          type="button"
          variant={mode === "visual" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 text-xs"
          onMouseDown={(e) => {
            e.preventDefault();
            if (mode === "source") switchToVisual();
          }}
        >
          Szerkesztő
        </Button>
        <Button
          type="button"
          variant={mode === "source" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 text-xs"
          onMouseDown={(e) => {
            e.preventDefault();
            if (mode === "visual") switchToSource();
          }}
        >
          <Code className="mr-1 h-3 w-3" />
          Forráskód
        </Button>
      </div>

      {mode === "visual" ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            "border-input bg-background rounded-b-md border px-3 py-2 text-sm",
            tall ? "min-h-[480px]" : "min-h-[200px]",
            "prose prose-sm dark:prose-invert focus-visible:ring-ring max-w-none focus:outline-none focus-visible:ring-2",
          )}
          dangerouslySetInnerHTML={{ __html: defaultValue }}
          onInput={syncFromEditor}
          onBlur={syncFromEditor}
        />
      ) : (
        <Textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          className={cn(
            "rounded-t-none font-mono text-xs",
            tall ? "min-h-[480px]" : "min-h-[200px]",
          )}
          rows={12}
        />
      )}

      {variableGroups && variableGroups.length > 0 && (
        <div className="flex flex-col gap-2 rounded-md border p-2">
          <span className="text-muted-foreground text-xs">
            Változók — kattints rá, és a kurzor helyére kerül. Generáláskor a munkavállaló
            adatával helyettesítődik.
          </span>
          <div className="flex flex-wrap gap-1">
            {variableGroups.map((g, i) => (
              <Button
                key={g.cim}
                type="button"
                size="sm"
                variant={i === csoport ? "secondary" : "ghost"}
                className="h-7 text-xs"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setCsoport(i);
                }}
              >
                {g.cim} ({g.valtozok.length})
              </Button>
            ))}
          </div>
          <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
            {(variableGroups[csoport]?.valtozok ?? []).map((v) => (
              <Button
                key={v.key}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto py-1 text-left text-xs"
                title={`{{${v.key}}}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertVariable(v.key);
                }}
              >
                {v.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {variables.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-muted-foreground w-full text-xs">
            Változók (kattintás beszúráshoz):
          </span>
          {variables.map((v) => (
            <Button
              key={v}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 font-mono text-xs"
              onClick={() => insertVariable(v)}
            >
              {`{{${v}}}`}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
