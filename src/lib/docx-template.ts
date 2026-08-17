/**
 * Pembuat berkas .docx sederhana (ZIP tanpa kompresi) untuk template import soal.
 * Tidak memerlukan pustaka tambahan.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array<ArrayBuffer>) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

type Entry = { name: string; data: Uint8Array<ArrayBuffer> };

function zipStore(entries: Entry[]): Blob {
  const encoder = new TextEncoder();
  const locals: Uint8Array<ArrayBuffer>[] = [];
  const centrals: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name) as Uint8Array<ArrayBuffer>;
    const crc = crc32(entry.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0, true);
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, 0, true);
    local.setUint16(12, 0, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, entry.data.length, true);
    local.setUint32(22, entry.data.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    locals.push(new Uint8Array(local.buffer), nameBytes, entry.data);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0, true);
    central.setUint16(10, 0, true);
    central.setUint16(12, 0, true);
    central.setUint16(14, 0, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, entry.data.length, true);
    central.setUint32(24, entry.data.length, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint16(30, 0, true);
    central.setUint16(32, 0, true);
    central.setUint16(34, 0, true);
    central.setUint16(36, 0, true);
    central.setUint32(38, 0, true);
    central.setUint32(42, offset, true);
    centrals.push(new Uint8Array(central.buffer), nameBytes);

    offset += 30 + nameBytes.length + entry.data.length;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  return new Blob([...locals, ...centrals, new Uint8Array(end.buffer)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function para(text: string, opts: { bold?: boolean; indent?: number; size?: number } = {}) {
  const { bold = false, indent = 0, size } = opts;
  return (
    `<w:p><w:pPr>${indent ? `<w:ind w:left="${indent}"/>` : ""}<w:spacing w:after="60"/></w:pPr>` +
    `<w:r><w:rPr>${bold ? "<w:b/>" : ""}${size ? `<w:sz w:val="${size}"/>` : ""}</w:rPr>` +
    `<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
  );
}

export type TemplateQuestion = {
  content: string;
  options: string[];
  correct: string;
};

export function buildQuestionTemplateDocx(headline: string, questions: TemplateQuestion[]) {
  const letters = "abcdefghij";
  const body =
    para(headline, { bold: true, size: 28 }) +
    para(
      "Tulis soal dengan format di bawah ini: nomor soal, pilihan a sampai e, lalu baris Jawaban.",
    ) +
    para("") +
    questions
      .map((question, index) => {
        const lines = [
          para(`${index + 1}. ${question.content}`, { indent: 360 }),
          ...question.options.map((option, i) =>
            para(`${letters[i]}. ${option}`, { indent: 720 }),
          ),
          para(`Jawaban: ${question.correct.toUpperCase()}`, { indent: 360 }),
          para(""),
        ];
        return lines.join("");
      })
      .join("");

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
${body}
<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
</w:body></w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

  const encoder = new TextEncoder();
  const bytes = (text: string) => encoder.encode(text) as Uint8Array<ArrayBuffer>;
  return zipStore([
    { name: "[Content_Types].xml", data: bytes(contentTypes) },
    { name: "_rels/.rels", data: bytes(rels) },
    { name: "word/document.xml", data: bytes(document) },
  ]);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
