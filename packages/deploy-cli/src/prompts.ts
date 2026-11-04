import { createInterface, type Interface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

// Lazy: creating a readline Interface puts stdin in a mode that keeps the event loop (and
// therefore the process) alive until it's closed. Commands that never prompt (login,
// status, redeploy, ...) must not pay for that — only `deploy`'s wizard does, and it
// closes it via closePrompts() when done.
let rl: Interface | null = null;
function getRl(): Interface {
  if (!rl) rl = createInterface({ input: stdin, output: stdout });
  return rl;
}

export async function askText(
  question: string,
  opts?: { default?: string; required?: boolean },
): Promise<string> {
  const suffix = opts?.default ? ` [${opts.default}]` : "";
  for (;;) {
    const answer = (await getRl().question(`${question}${suffix}: `)).trim();
    if (answer) return answer;
    if (opts?.default !== undefined) return opts.default;
    if (!opts?.required) return "";
    console.log("This field is required.");
  }
}

export async function askConfirm(
  question: string,
  defaultValue: boolean,
): Promise<boolean> {
  const hint = defaultValue ? "Y/n" : "y/N";
  const answer = (await getRl().question(`${question} (${hint}): `)).trim().toLowerCase();
  if (!answer) return defaultValue;
  return answer === "y" || answer === "yes";
}

export async function askNumber(
  question: string,
  opts?: { default?: number },
): Promise<number> {
  for (;;) {
    const raw = await askText(question, {
      default: opts?.default !== undefined ? String(opts.default) : undefined,
    });
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
    console.log("Please enter a number.");
  }
}

export interface SelectOption<T> {
  label: string;
  value: T;
}

/** Numbered list selection — no raw-mode/arrow-key UI, just type a number. Returns null
 * for the always-offered "skip" entry when `allowSkip` is set. */
export async function askSelect<T>(
  question: string,
  options: SelectOption<T>[],
  opts?: { allowSkip?: string },
): Promise<T | null> {
  console.log(question);
  options.forEach((opt, i) => console.log(`  ${i + 1}) ${opt.label}`));
  const skipIndex = options.length + 1;
  if (opts?.allowSkip) console.log(`  ${skipIndex}) ${opts.allowSkip}`);

  for (;;) {
    const raw = (await getRl().question("Choose a number: ")).trim();
    const n = Number(raw);
    if (opts?.allowSkip && n === skipIndex) return null;
    if (Number.isInteger(n) && n >= 1 && n <= options.length) {
      return options[n - 1]!.value;
    }
    console.log("Invalid choice.");
  }
}

export function closePrompts(): void {
  rl?.close();
}
