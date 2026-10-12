// A small PNG reader and writer for the relief tool: 8-bit RGB, RGBA and greyscale, no interlace.
// Plain Node (zlib only), so the tool needs no image library.
import { crc32, deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CHANNELS = { 0: 1, 2: 3, 6: 4 };

/** Decodes a PNG to { width, height, channels, data } with `channels` bytes per pixel. */
export function decodePng(buffer) {
  let p = 8, header;
  const idat = [];
  while (p < buffer.length) {
    const length = buffer.readUInt32BE(p), type = buffer.toString('latin1', p + 4, p + 8), data = buffer.subarray(p + 8, p + 8 + length);
    if (type === 'IHDR') header = data;
    if (type === 'IDAT') idat.push(data);
    p += 12 + length;
  }
  const width = header.readUInt32BE(0), height = header.readUInt32BE(4), channels = CHANNELS[header[9]];
  if (header[8] !== 8 || !channels || header[12] !== 0) throw new Error(`unsupported PNG (depth ${header[8]}, colour type ${header[9]}, interlace ${header[12]})`);
  const stride = width * channels, raw = inflateSync(Buffer.concat(idat)), data = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = data.subarray(y * stride, (y + 1) * stride), up = y ? data.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[x - channels] : 0, b = up ? up[x] : 0, c = up && x >= channels ? up[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[x] = v & 255;
    }
  }
  return { width, height, channels, data };
}

const chunk = (type, data) => {
  const name = Buffer.from(type, 'latin1'), length = Buffer.alloc(4), crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])) >>> 0);
  return Buffer.concat([length, name, data, crc]);
};

/** Encodes pixels (1 = grey, 3 = RGB, 4 = RGBA bytes per pixel) as a PNG. */
export function encodePng({ width, height, channels, data }) {
  const colourType = { 1: 0, 3: 2, 4: 6 }[channels], stride = width * channels, raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const s = y * (stride + 1), row = data.subarray(y * stride, (y + 1) * stride);
    raw[s] = 1; // "Sub": each byte minus the one a pixel to its left, which suits terrain and flat masks alike
    for (let x = 0; x < stride; x++) raw[s + 1 + x] = (row[x] - (x >= channels ? row[x - channels] : 0)) & 255;
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = colourType;
  return Buffer.concat([SIGNATURE, chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
