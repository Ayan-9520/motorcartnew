import { NextRequest, NextResponse } from "next/server";
import { inventoryTemplateCsv, inventoryTemplateXlsx } from "@/lib/dealer-inventory/parse-spreadsheet";

export async function GET(req: NextRequest) {
  const format = (req.nextUrl.searchParams.get("format") ?? "xlsx").toLowerCase();

  if (format === "csv") {
    const csv = inventoryTemplateCsv();
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="motorcart-new-car-inventory-demo.csv"',
        "Cache-Control": "no-store",
      },
    });
  }

  const xlsx = inventoryTemplateXlsx();
  return new NextResponse(new Uint8Array(xlsx), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="motorcart-new-car-inventory-demo.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
