import { NextResponse } from "next/server";
import { apiFetchBlob, ApiError } from "@/lib/api/client";

/** Thermal receipt for a due payment, served inline for printing. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const paymentId = Number(id);
  if (!Number.isInteger(paymentId) || paymentId < 1) {
    return NextResponse.json({ message: "That receipt reference isn't valid." }, { status: 400 });
  }
  try {
    const { blob, filename } = await apiFetchBlob(`/customers/payments/${paymentId}/receipt/pdf`);
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
