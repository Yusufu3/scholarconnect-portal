export type ExportRow = Record<string, string>;
export type Layout = "grid" | "striped" | "minimal";

export async function downloadPdf(title: string, columns: string[], rows: string[][], layout: Layout) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("IZF Scholarship", 40, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, 40, 60);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}   Records: ${rows.length}`, w - 40, 60, { align: "right" });
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 74,
    theme: layout === "grid" ? "grid" : layout === "striped" ? "striped" : "plain",
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: layout === "minimal" ? { fontStyle: "bold", textColor: 20, fillColor: false as unknown as number } : { fillColor: [31, 94, 70], textColor: 255 },
    alternateRowStyles: layout === "striped" ? { fillColor: [242, 246, 243] } : {},
    didDrawPage: () => {
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.text(`Page ${doc.getNumberOfPages()}`, w - 40, h - 20, { align: "right" });
    },
  });
  doc.save(`izf-${slug(title)}.pdf`);
}

export async function downloadExcel(title: string, columns: string[], rows: string[][]) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([["IZF Scholarship — " + title], [`Generated: ${new Date().toLocaleString()}`], [], columns, ...rows]);
  ws["!cols"] = columns.map((c, i) => ({ wch: Math.min(45, Math.max(c.length, ...rows.map((r) => (r[i] ?? "").length)) + 2) }));
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, columns.length - 1) } }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  XLSX.writeFile(wb, `izf-${slug(title)}.xlsx`);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
