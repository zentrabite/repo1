// ─── CSV cells that are safe to open in Excel, Sheets or Numbers ─────────────
//
// Spreadsheet apps run a cell that starts with = + - @ (or a tab or carriage
// return) as a formula. A customer could type "=HYPERLINK(...)" as their name
// and it would run on the merchant's computer when they open the export. So
// any text starting with one of those gets a single quote in front, which
// makes the app show it as plain text.
//
// Plain numbers such as -12.50 are left alone, so amounts still import as
// numbers into Xero.
//
// Safe for both server routes and "use client" pages.

const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_NUMBER  = /^-?\d+(?:\.\d+)?$/;

export function csvCell(value: string | number | null | undefined, options: { quote?: boolean } = {}): string {
  if (value === null || value === undefined) return options.quote ? '""' : "";
  let str = String(value);
  if (typeof value !== "number" && FORMULA_START.test(str) && !PLAIN_NUMBER.test(str)) {
    str = `'${str}`;
  }
  // Quote fields containing a comma, quote or line break; double any quotes.
  if (options.quote || /[,"\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
