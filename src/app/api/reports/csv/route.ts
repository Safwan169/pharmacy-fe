import { NextResponse } from "next/server";
import { apiFetchBlob, ApiError } from "@/lib/api/client";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Proxies the CSV export of a report so the browser never needs the API token. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const report = url.searchParams.get("report");
  const date = url.searchParams.get("date") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";

  let path: string;
  if (report === "daily-closing" && DATE.test(date)) {
    path = `/reports/daily-closing?date=${date}&format=csv`;
  } else if (report === "profit" && DATE.test(from) && DATE.test(to)) {
    path = `/reports/profit?from=${from}&to=${to}&format=csv`;
  } else {
    return NextResponse.json({ message: "Unknown report." }, { status: 400 });
  }

  try {
    const { blob, filename } = await apiFetchBlob(path);
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
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
