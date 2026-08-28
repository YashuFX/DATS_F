/**
 * Minimal xlsx reader — test-only.
 *
 * The geometry tests must verify against the actual workbook, not against a
 * fixture derived from it, or they would only prove the generator agrees with
 * itself. An xlsx is a zip of XML, and Node can inflate that with `zlib`, so
 * no dependency is needed for the few hundred lines of parsing involved.
 */

import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

const EOCD_SIG = 0x06054b50;
const LOCAL_SIG = 0x04034b50;

/** Extract one named entry from a zip archive. */
function unzipEntry(buf: Buffer, wanted: string): string {
  // The end-of-central-directory record sits within the last 64 KB.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip archive: no EOCD record");

  const entries = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);

  for (let n = 0; n < entries; n++) {
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);

    if (name === wanted) {
      if (buf.readUInt32LE(localOffset) !== LOCAL_SIG) {
        throw new Error(`corrupt local header for ${name}`);
      }
      const lNameLen = buf.readUInt16LE(localOffset + 26);
      const lExtraLen = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const raw = buf.subarray(start, start + compressedSize);
      if (method === 0) return raw.toString("utf8");
      if (method === 8) return inflateRawSync(raw).toString("utf8");
      throw new Error(`unsupported compression method ${method}`);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`entry not found: ${wanted}`);
}

export interface WorkbookPoint {
  x: number;
  y: number;
  z: number;
  fceNum: number;
}

/**
 * Read the `gdome_foot_top` sheet as X/Y/Z/FceNum rows.
 *
 * Row 1 holds the column headers as SHARED STRINGS (`t="s"`). Read as numbers
 * they become a phantom element at (0, 1, 2) on face 3, sitting 2 m off that
 * face's plane — so rows carrying any non-numeric cell are skipped rather than
 * trusting a row index.
 */
export function readWorkbook(path: string): WorkbookPoint[] {
  const buf = readFileSync(path);

  // Resolve the sheet by name rather than assuming sheet2.xml.
  const workbook = unzipEntry(buf, "xl/workbook.xml");
  const rels = unzipEntry(buf, "xl/_rels/workbook.xml.rels");

  const sheetMatch = workbook.match(/<sheet[^>]*name="gdome_foot_top"[^>]*\/>/);
  if (!sheetMatch) throw new Error("sheet gdome_foot_top not found");
  const ridMatch = sheetMatch[0].match(/r:id="([^"]+)"/);
  if (!ridMatch) throw new Error("sheet has no relationship id");

  const relMatch = rels.match(new RegExp(`Id="${ridMatch[1]}"[^>]*Target="([^"]+)"`));
  if (!relMatch) throw new Error("relationship target not found");
  const target = "xl/" + relMatch[1].replace(/^\/+/, "");

  const sheet = unzipEntry(buf, target);
  const out: WorkbookPoint[] = [];

  for (const rowMatch of sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: Record<string, number> = {};
    let numeric = true;
    for (const cell of rowMatch[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g)) {
      if (/\bt="s"/.test(cell[2])) {
        numeric = false;
        break;
      }
      const v = cell[3].match(/<v>([^<]*)<\/v>/);
      if (v) cells[cell[1]] = Number(v[1]);
    }
    if (!numeric) continue;
    if (cells.A === undefined || cells.D === undefined) continue;
    out.push({ x: cells.A, y: cells.B, z: cells.C, fceNum: Math.round(cells.D) });
  }
  return out;
}
