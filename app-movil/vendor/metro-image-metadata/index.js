"use strict";

const fs = require("node:fs");
const path = require("node:path");

const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_DIMENSION = 65_535;
const MAX_PIXELS = 268_435_456;
const MAX_SVG_HEADER_BYTES = 64 * 1024;
const MAX_TIFF_ENTRIES = 4_096;

function fail(message) {
  throw new TypeError(`Unsupported or unsafe image: ${message}`);
}

function hasBytes(data, offset, length) {
  return Number.isSafeInteger(offset) && offset >= 0 && length >= 0 && offset + length <= data.length;
}

function assertDimensions(width, height, type) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    fail(`${type} has invalid dimensions`);
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
    fail(`${type} dimensions exceed the mobile asset limits`);
  }
  return { width, height, type };
}

function ascii(data, start, end) {
  if (!hasBytes(data, start, end - start)) return "";
  return data.toString("ascii", start, end);
}

function png(data) {
  const signature = "89504e470d0a1a0a";
  if (!hasBytes(data, 0, 24) || data.subarray(0, 8).toString("hex") !== signature) return null;
  if (ascii(data, 12, 16) !== "IHDR" || data.readUInt32BE(8) !== 13) fail("invalid PNG header");
  return assertDimensions(data.readUInt32BE(16), data.readUInt32BE(20), "png");
}

function gif(data) {
  const signature = ascii(data, 0, 6);
  if (signature !== "GIF87a" && signature !== "GIF89a") return null;
  if (!hasBytes(data, 0, 10)) fail("truncated GIF header");
  return assertDimensions(data.readUInt16LE(6), data.readUInt16LE(8), "gif");
}

function bmp(data) {
  if (ascii(data, 0, 2) !== "BM") return null;
  if (!hasBytes(data, 0, 26)) fail("truncated BMP header");
  const dibSize = data.readUInt32LE(14);
  let width;
  let height;
  if (dibSize === 12) {
    width = data.readUInt16LE(18);
    height = data.readUInt16LE(20);
  } else if (dibSize >= 40) {
    width = Math.abs(data.readInt32LE(18));
    height = Math.abs(data.readInt32LE(22));
  } else {
    fail("unknown BMP header");
  }
  return assertDimensions(width, height, "bmp");
}

const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function jpeg(data) {
  if (!hasBytes(data, 0, 2) || data[0] !== 0xff || data[1] !== 0xd8) return null;
  let offset = 2;
  let iterations = 0;
  while (offset < data.length && iterations++ < data.length) {
    while (offset < data.length && data[offset] === 0xff) offset++;
    if (offset >= data.length) break;
    const marker = data[offset++];
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (!hasBytes(data, offset, 2)) fail("truncated JPEG segment");
    const segmentLength = data.readUInt16BE(offset);
    if (segmentLength < 2 || !hasBytes(data, offset, segmentLength)) fail("invalid JPEG segment length");
    if (JPEG_SOF_MARKERS.has(marker)) {
      if (segmentLength < 7) fail("truncated JPEG size segment");
      return assertDimensions(data.readUInt16BE(offset + 5), data.readUInt16BE(offset + 3), "jpg");
    }
    if (marker === 0xda) break;
    offset += segmentLength;
  }
  fail("JPEG dimensions were not found");
}

function webp(data) {
  if (ascii(data, 0, 4) !== "RIFF" || ascii(data, 8, 12) !== "WEBP") return null;
  if (!hasBytes(data, 0, 30)) fail("truncated WebP header");
  const chunk = ascii(data, 12, 16);
  if (chunk === "VP8X") {
    const width = 1 + data.readUIntLE(24, 3);
    const height = 1 + data.readUIntLE(27, 3);
    return assertDimensions(width, height, "webp");
  }
  if (chunk === "VP8L") {
    if (data[20] !== 0x2f || !hasBytes(data, 21, 4)) fail("invalid lossless WebP header");
    const bits = data.readUInt32LE(21);
    const width = 1 + (bits & 0x3fff);
    const height = 1 + ((bits >>> 14) & 0x3fff);
    return assertDimensions(width, height, "webp");
  }
  if (chunk === "VP8 ") {
    if (data[23] !== 0x9d || data[24] !== 0x01 || data[25] !== 0x2a) fail("invalid lossy WebP header");
    return assertDimensions(data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff, "webp");
  }
  fail("unknown WebP encoding");
}

function psd(data) {
  if (ascii(data, 0, 4) !== "8BPS") return null;
  if (!hasBytes(data, 0, 26) || data.readUInt16BE(4) !== 1) fail("invalid PSD header");
  return assertDimensions(data.readUInt32BE(18), data.readUInt32BE(14), "psd");
}

function svg(data) {
  const prefix = data.subarray(0, Math.min(data.length, MAX_SVG_HEADER_BYTES)).toString("utf8");
  const svgStart = prefix.search(/<svg\b/i);
  if (svgStart < 0) return null;
  const preamble = prefix.slice(0, svgStart);
  if (/<!DOCTYPE|<!ENTITY/i.test(preamble)) fail("SVG declarations are not allowed");
  const tagEnd = prefix.indexOf(">", svgStart);
  if (tagEnd < 0) fail("truncated SVG root element");
  const tag = prefix.slice(svgStart, tagEnd + 1);
  const readLength = (name) => {
    const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']\\s*([0-9]+(?:\\.[0-9]+)?)(?:px)?\\s*["']`, "i"));
    return match ? Number(match[1]) : null;
  };
  let width = readLength("width");
  let height = readLength("height");
  if (width === null || height === null) {
    const viewBox = tag.match(/\bviewBox\s*=\s*["']\s*[-+]?(?:\d+\.?\d*|\.\d+)\s+[-+]?(?:\d+\.?\d*|\.\d+)\s+([0-9]+(?:\.\d+)?)\s+([0-9]+(?:\.\d+)?)\s*["']/i);
    if (!viewBox) fail("SVG requires numeric width/height or viewBox");
    width = width ?? Number(viewBox[1]);
    height = height ?? Number(viewBox[2]);
  }
  return assertDimensions(width, height, "svg");
}

function tiff(data) {
  const byteOrder = ascii(data, 0, 2);
  if (byteOrder !== "II" && byteOrder !== "MM") return null;
  if (!hasBytes(data, 0, 8)) fail("truncated TIFF header");
  const little = byteOrder === "II";
  const u16 = (offset) => {
    if (!hasBytes(data, offset, 2)) fail("truncated TIFF field");
    return little ? data.readUInt16LE(offset) : data.readUInt16BE(offset);
  };
  const u32 = (offset) => {
    if (!hasBytes(data, offset, 4)) fail("truncated TIFF field");
    return little ? data.readUInt32LE(offset) : data.readUInt32BE(offset);
  };
  if (u16(2) !== 42) return null;
  const ifdOffset = u32(4);
  const count = u16(ifdOffset);
  if (count > MAX_TIFF_ENTRIES || !hasBytes(data, ifdOffset + 2, count * 12)) fail("invalid TIFF directory");
  let width;
  let height;
  for (let index = 0; index < count; index++) {
    const entry = ifdOffset + 2 + index * 12;
    const tag = u16(entry);
    if (tag !== 256 && tag !== 257) continue;
    const fieldType = u16(entry + 2);
    const values = u32(entry + 4);
    if (values !== 1 || (fieldType !== 3 && fieldType !== 4)) fail("unsupported TIFF dimension field");
    const value = fieldType === 3 ? u16(entry + 8) : u32(entry + 8);
    if (tag === 256) width = value;
    if (tag === 257) height = value;
    if (width !== undefined && height !== undefined) break;
  }
  if (width === undefined || height === undefined) fail("TIFF dimensions were not found");
  return assertDimensions(width, height, "tiff");
}

const KTX1 = Buffer.from([0xab, 0x4b, 0x54, 0x58, 0x20, 0x31, 0x31, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a]);
const KTX2 = Buffer.from([0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a]);

function ktx(data) {
  if (hasBytes(data, 0, 12) && data.subarray(0, 12).equals(KTX1)) {
    if (!hasBytes(data, 0, 44)) fail("truncated KTX1 header");
    const marker = data.readUInt32LE(12);
    if (marker === 0x04030201) return assertDimensions(data.readUInt32LE(36), data.readUInt32LE(40), "ktx");
    if (marker === 0x01020304) return assertDimensions(data.readUInt32BE(36), data.readUInt32BE(40), "ktx");
    fail("invalid KTX1 byte order");
  }
  if (hasBytes(data, 0, 12) && data.subarray(0, 12).equals(KTX2)) {
    if (!hasBytes(data, 0, 28)) fail("truncated KTX2 header");
    return assertDimensions(data.readUInt32LE(20), data.readUInt32LE(24), "ktx");
  }
  return null;
}

const parsers = [png, jpeg, bmp, gif, webp, psd, svg, tiff, ktx];

function readInput(input) {
  if (input instanceof Uint8Array) return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  if (typeof input !== "string") fail("input must be a file path or Uint8Array");
  const filePath = path.resolve(input);
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_FILE_BYTES) fail("file size is outside the accepted limits");
  return fs.readFileSync(filePath);
}

function imageSize(input) {
  const data = readInput(input);
  if (data.length === 0 || data.length > MAX_FILE_BYTES) fail("buffer size is outside the accepted limits");
  for (const parser of parsers) {
    const result = parser(data);
    if (result) return result;
  }
  fail("format is not supported by Metro's safe allowlist");
}

module.exports = imageSize;
module.exports.default = imageSize;
module.exports.imageSize = imageSize;
module.exports.types = Object.freeze(["png", "jpg", "jpeg", "bmp", "gif", "webp", "psd", "svg", "tiff", "ktx"]);
