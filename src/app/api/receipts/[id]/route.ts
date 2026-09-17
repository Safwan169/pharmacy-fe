import { NextResponse } from "next/server";
import { apiFetchBlob, ApiError } from "@/lib/api/client";

/**
 * Proxies the thermal receipt PDF, served inline so a popup can print it.
 * Same reason as the invoice proxy: the browser never holds the API token.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const saleId = Number(id);
  if (!Number.isInteger(saleId) || saleId < 1) {
    return NextResponse.json({ message: "That receipt reference isn't valid." }, { status: 400 });
  }
  const width = new URL(request.url).searchParams.get("width");
  const query = width === "58" || width === "80" ? `?width=${width}` : "";

  try {
    const { blob, filename } = await apiFetchBlob(`/sales/${saleId}/receipt/pdf${query}`);
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status || 500 });
    }
    throw error;
  }
}
