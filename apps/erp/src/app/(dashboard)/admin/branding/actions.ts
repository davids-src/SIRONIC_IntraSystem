"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@erp/auth";
import { getBranding, updateBranding } from "@erp/db-core";
import { brandingUpdateSchema } from "@erp/admin/validation";
import { THEME_ROLES, validateTheme, type ThemeColors } from "@erp/core/theme";

export type BrandingFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string };

export async function getBrandingForAdmin() {
  await requirePermission("admin:access");
  return getBranding();
}

export async function updateBrandingAction(
  _prev: BrandingFormState,
  formData: FormData,
): Promise<BrandingFormState> {
  await requirePermission("admin:access");

  const parsed = brandingUpdateSchema.safeParse({
    appName: formData.get("appName"),
    companyName: formData.get("companyName"),
    loginTitle: formData.get("loginTitle"),
    loginSubtitle: formData.get("loginSubtitle"),
    footerText: formData.get("footerText") ?? "",
    faviconId: formData.get("faviconId") ?? undefined,
    pwaIconId: formData.get("pwaIconId") ?? undefined,
    logoId: formData.get("logoId") ?? undefined,
    loginBackgroundId: formData.get("loginBackgroundId") ?? undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      message: "Ellenőrizze a mezőket.",
    };
  }

  // Theme (role colours): every role is checked against its colour rule — see the theme engine.
  const resetTheme = formData.get("themeReset") === "1";
  let theme: ThemeColors | null | undefined;
  if (resetTheme) {
    theme = null;
  } else if (formData.get("theme_primary")) {
    theme = Object.fromEntries(
      THEME_ROLES.map((r) => [
        r,
        String(formData.get(`theme_${r}`) ?? "")
          .trim()
          .toLowerCase(),
      ]),
    ) as ThemeColors;
    const themeErrors = validateTheme(theme);
    if (Object.keys(themeErrors).length > 0) {
      return {
        success: false,
        fieldErrors: Object.fromEntries(
          Object.entries(themeErrors).map(([k, v]) => [`theme_${k}`, [v]]),
        ),
        message: "A színek között hibás van — nézd meg a Színek szakaszt.",
      };
    }
  }

  const data = parsed.data;
  await updateBranding({
    ...(theme !== undefined && { theme }),
    appName: data.appName,
    companyName: data.companyName,
    loginTitle: data.loginTitle,
    loginSubtitle: data.loginSubtitle,
    footerText: data.footerText || "© 2026 SIRONIC. Minden jog fenntartva.",
    faviconId: data.faviconId ?? null,
    pwaIconId: data.pwaIconId ?? null,
    logoId: data.logoId ?? null,
    loginBackgroundId: data.loginBackgroundId ?? null,
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/branding");
  revalidatePath("/manifest.webmanifest");

  return { success: true, message: "Arculat mentve." };
}
