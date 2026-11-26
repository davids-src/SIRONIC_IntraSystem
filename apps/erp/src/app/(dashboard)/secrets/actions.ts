"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@erp/auth";
import { secretsApi, type RevealResult } from "@erp/secrets";
import { SECRETS_PERMISSIONS as P } from "@erp/secrets/client";
import {
  createSecretSchema,
  shareSchema,
  updateSecretSchema,
} from "@erp/secrets/validation";
import { toSecretViewer } from "@/lib/secrets-viewer";

export type SecretFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; id?: string };

type Eredmeny = { success: boolean; message?: string };

function zodToFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : undefined;
};

export async function createSecretAction(
  _prev: SecretFormState,
  fd: FormData,
): Promise<SecretFormState> {
  const user = await requirePermission(P.write);
  const parsed = createSecretSchema.safeParse({
    name: text(fd, "name"),
    value: text(fd, "value"),
    description: text(fd, "description"),
    partnerId: text(fd, "partnerId"),
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }
  const r = await secretsApi.create(await toSecretViewer(user), parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/secrets");
  return { success: true, id: r.id, message: "A titok elmentve." };
}

export async function updateSecretAction(
  id: string,
  _prev: SecretFormState,
  fd: FormData,
): Promise<SecretFormState> {
  const user = await requirePermission(P.write);
  const parsed = updateSecretSchema.safeParse({
    name: text(fd, "name"),
    value: text(fd, "value"),
    description: text(fd, "description"),
    partnerId: text(fd, "partnerId"),
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }
  const r = await secretsApi.update(await toSecretViewer(user), id, parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/secrets");
  revalidatePath(`/secrets/${id}`);
  return { success: true, id, message: "A titok módosítva." };
}

export async function deleteSecretAction(id: string): Promise<Eredmeny> {
  const user = await requirePermission(P.delete);
  const r = await secretsApi.delete(await toSecretViewer(user), id);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/secrets");
  return { success: true, message: "A titok törölve." };
}

/** One value for one secret per call; the result is never cached (Server Actions are POSTs). */
export async function revealSecretAction(id: string): Promise<RevealResult> {
  const user = await requirePermission(P.reveal);
  return secretsApi.reveal(await toSecretViewer(user), id);
}

export async function shareSecretAction(
  id: string,
  input: { kind: string; targetId: string; level: string },
): Promise<Eredmeny> {
  const user = await requirePermission(P.share);
  const parsed = shareSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Érvénytelen megosztás." };
  const r = await secretsApi.share(await toSecretViewer(user), id, parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath(`/secrets/${id}`);
  return { success: true, message: "Megosztva." };
}

export async function revokeSecretShareAction(
  id: string,
  shareId: string,
): Promise<Eredmeny> {
  const user = await requirePermission(P.share);
  const r = await secretsApi.revokeShare(await toSecretViewer(user), id, shareId);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath(`/secrets/${id}`);
  return { success: true, message: "A megosztás visszavonva." };
}
