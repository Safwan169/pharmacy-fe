import { NextResponse } from "next/server";
import { apiFetchBlob, ApiError } from "@/lib/api/client";

/**
 * Proxies the invoice PDF from the API.
 *
 * The browser can't call the API directly — the JWT is in an httpOnly cookie
 * it can't read — so the download goes through the Next.js server, which
 * attaches the token. This also keeps the API's own URL off the client.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const saleId = Number(id);

  if (!Number.isInteger(saleId) || saleId < 1) {
    return NextResponse.json(
      { message: "That invoice reference isn't valid." },
      { status: 400 },
    );
  }

  try {
    const { blob, filename } = await apiFetchBlob(`/sales/${saleId}/invoice/pdf`);

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status || 500 });
    }
    throw error;
  }
}
