// Ler e criar arquivos .zip no navegador, sem bibliotecas externas.
// Leitura: métodos "stored" (0) e "deflate" (8), via DecompressionStream.
// Escrita: método "stored" (sem compressão) — suficiente para lições em texto.

const dec = new TextDecoder('utf-8');
const enc = new TextEncoder();

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('Este navegador não abre .zip compactado. Atualize o navegador ou importe os .txt.');
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Lê um .zip e devolve [{name, bytes, text()}] (ignora pastas e arquivos de sistema). */
export async function readZip(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const dv = new DataView(buf.buffer);
  // procura o "End of central directory" (assinatura 0x06054b50) do fim para o começo
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Arquivo .zip inválido.');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out = [];
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const flags = dv.getUint16(p + 8, true);
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const nameBytes = buf.subarray(p + 46, p + 46 + nlen);
    const name = (flags & 0x800) ? dec.decode(nameBytes) : decodeName(nameBytes);
    p += 46 + nlen + xlen + clen;
    if (name.endsWith('/') || /(^|\/)(__MACOSX|\.DS_Store)/.test(name)) continue;
    const lnlen = dv.getUint16(local + 26, true), lxlen = dv.getUint16(local + 28, true);
    const start = local + 30 + lnlen + lxlen;
    const raw = buf.subarray(start, start + csize);
    let bytes;
    if (method === 0) bytes = raw;
    else if (method === 8) bytes = await inflateRaw(raw);
    else throw new Error(`"${name}" usa uma compressão não suportada.`);
    out.push({ name: name.split('/').pop(), path: name, bytes, text: () => dec.decode(bytes).replace(/^﻿/, '') });
  }
  return out;
}
function decodeName(b) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (e) { return [...b].map((c) => String.fromCharCode(c)).join(''); }
}

// ---------- escrita ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

/** files: [{name, text}] → Blob .zip */
export function writeZip(files) {
  const parts = [], central = [];
  let offset = 0;
  const now = new Date();
  const dtime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const ddate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = enc.encode(f.text);
    const crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, dtime, true); lh.setUint16(12, ddate, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, dtime, true); ch.setUint16(14, ddate, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const csize = central.reduce((a, b) => a + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, csize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

/** Separa um texto colado com várias lições ("===== ARQUIVO: nome.txt =====") em arquivos. */
export function splitPasted(text) {
  const t = String(text || '').replace(/\r\n?/g, '\n');
  const re = /^[ \t]*={3,}\s*ARQUIVO\s*:\s*(.+?)\s*=*[ \t]*$/gim;
  const marks = [...t.matchAll(re)];
  const strip = (s) => s.replace(/^\s*```[a-z]*\s*\n/i, '').replace(/\n\s*```\s*$/i, '').trim();
  if (!marks.length) return t.trim() ? [{ name: 'colada.txt', text: strip(t) }] : [];
  return marks.map((m, i) => ({ name: m[1].trim(), text: strip(t.slice(m.index + m[0].length, i + 1 < marks.length ? marks[i + 1].index : t.length)) })).filter((f) => f.text);
}
