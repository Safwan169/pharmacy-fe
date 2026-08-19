"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { ImportResult } from "@/types";

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
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a CSV file to upload first." };
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return {
      status: "error",
      message: "That file isn't a CSV. Export your catalogue as a .csv file and try again.",
    };
  }

  if (file.size > MAX_BYTES) {
    return {
      status: "error",
      message: "That file is larger than 25 MB. For a catalogue this big, ask your developer to run the import from the server instead.",
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
      message: summarise(result),
      result,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
}

function summarise(result: ImportResult): string {
  const added = result.variantsCreated;
  const updated = result.variantsUpdated;
  const parts: string[] = [];

  if (added > 0) parts.push(`${added.toLocaleString()} new item${added === 1 ? "" : "s"} added`);
  if (updated > 0) {
    parts.push(`${updated.toLocaleString()} existing item${updated === 1 ? "" : "s"} refreshed`);
  }
  if (parts.length === 0) parts.push("nothing changed");

  return `Import finished — ${parts.join(" and ")}. Prices and stock were left exactly as they were.`;
}
