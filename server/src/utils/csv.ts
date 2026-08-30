/** RFC 4180: quote every field and double any inner quotes. */
export function toCsv(rows: Record<string, string | number>[]): string {
  const headers = Object.keys(rows[0] ?? {});
  const cell = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers, ...rows.map((r) => headers.map((h) => r[h]))]
    .map((cols) => cols.map(cell).join(','))
    .join('\r\n');
}
