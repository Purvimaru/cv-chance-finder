export async function extractResumeText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const c = await (await doc.getPage(i)).getTextContent();
      pages.push(c.items.map((it: any) => ("str" in it ? it.str : "")).join(" "));
    }
    return pages.join("\n");
  }
  if (name.endsWith(".docx")) {
    const mammoth: any = await import("mammoth");
    const r = await (mammoth.default ?? mammoth).extractRawText({ arrayBuffer: buf });
    return r.value as string;
  }
  return new TextDecoder().decode(buf);
}
