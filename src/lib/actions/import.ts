"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { ImportResult } from "@/types";
import { getT } from "@/i18n/server";
import type { Translate } from "@/i18n";

export interface ImportState {
  status: "idle" | "success" | "error";
  message?: string;
  result?: ImportResult;
}

const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Uploads a catalogue CSV.
 *
 * Re-running is safe: the API matches rows on their original brand id and
 * refreshes the descriptive fields while leaving price and stock alone, so an
 * import never undoes pricing work.
 */
export async function importCatalogue(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const t = await getT();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: t("importAction.chooseFile") };
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return {
      status: "error",
      message: t("importAction.notCsv"),
    };
  }

  if (file.size > MAX_BYTES) {
    return {
      status: "error",
      message: t("importAction.tooLarge"),
    };
  }

  const upload = new FormData();
  upload.set("file", file);

  try {
    const result = await apiFetch<ImportResult>("/import/csv", {
      method: "POST",
      auth: true,
      body: upload,
    });

    revalidatePath("/catalogue");
    revalidatePath("/pricing");

    return {
      status: "success",
      message: summarise(result, t),
      result,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
}

function summarise(result: ImportResult, t: Translate): string {
  const added = result.variantsCreated;
  const updated = result.variantsUpdated;
  const parts: string[] = [];

  if (added > 0) parts.push(t("importAction.added", { count: added.toLocaleString() }));
  if (updated > 0) parts.push(t("importAction.refreshed", { count: updated.toLocaleString() }));
  if (parts.length === 0) parts.push(t("importAction.nothingChanged"));

  return t("importAction.summary", { parts: parts.join(", ") });
}
