export function toCsv(rows: Record<string, unknown>[], headers?: string[]) {
  if (rows.length === 0) return "";
  const cols = headers ?? Object.keys(rows[0]!);
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [cols.join(";"), ...rows.map((row) => cols.map((c) => escape(row[c])).join(";"))].join(
    "\r\n",
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const csv = toCsv(rows);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

const escapeXml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Ekspor ke berkas Excel (SpreadsheetML 2003) — dapat dibuka langsung oleh
 * Microsoft Excel, LibreOffice Calc, maupun Google Sheets.
 */
export function downloadExcel(
  filename: string,
  rows: Record<string, unknown>[],
  sheetName = "Hasil",
) {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]!);
  const cell = (value: unknown) => {
    const isNumber = typeof value === "number" && Number.isFinite(value);
    return `<Cell><Data ss:Type="${isNumber ? "Number" : "String"}">${escapeXml(value)}</Data></Cell>`;
  };
  const header = `<Row>${cols.map((c) => `<Cell ss:StyleID="head"><Data ss:Type="String">${escapeXml(c)}</Data></Cell>`).join("")}</Row>`;
  const body = rows.map((row) => `<Row>${cols.map((c) => cell(row[c])).join("")}</Row>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="head"><Font ss:Bold="1"/><Interior ss:Color="#D9EAD3" ss:Pattern="Solid"/></Style></Styles>
<Worksheet ss:Name="${escapeXml(sheetName).slice(0, 30)}"><Table>${header}${body}</Table></Worksheet>
</Workbook>`;
  const blob = new Blob(["\uFEFF" + xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".xls") ? filename : `${filename}.xls`);
}
