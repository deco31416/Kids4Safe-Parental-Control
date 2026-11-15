"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const imageSize = require("./index");

function buffer(length, writes) {
  const data = Buffer.alloc(length);
  writes(data);
  return data;
}

const cases = [
  ["png", buffer(24, (data) => {
    Buffer.from("89504e470d0a1a0a", "hex").copy(data);
    data.writeUInt32BE(13, 8); data.write("IHDR", 12, "ascii");
    data.writeUInt32BE(320, 16); data.writeUInt32BE(240, 20);
  })],
  ["jpg", buffer(23, (data) => {
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0xf0, 0x01, 0x40, 0x01, 0x01, 0x11, 0x00, 0xff, 0xd9]).copy(data);
  })],
  ["bmp", buffer(54, (data) => {
    data.write("BM", 0, "ascii"); data.writeUInt32LE(40, 14);
    data.writeInt32LE(320, 18); data.writeInt32LE(240, 22);
  })],
  ["gif", buffer(10, (data) => {
    data.write("GIF89a", 0, "ascii"); data.writeUInt16LE(320, 6); data.writeUInt16LE(240, 8);
  })],
  ["webp", buffer(30, (data) => {
    data.write("RIFF", 0, "ascii"); data.write("WEBP", 8, "ascii"); data.write("VP8X", 12, "ascii");
    data.writeUIntLE(319, 24, 3); data.writeUIntLE(239, 27, 3);
  })],
  ["psd", buffer(26, (data) => {
    data.write("8BPS", 0, "ascii"); data.writeUInt16BE(1, 4);
    data.writeUInt32BE(240, 14); data.writeUInt32BE(320, 18);
  })],
  ["svg", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240"></svg>')],
  ["tiff", buffer(38, (data) => {
    data.write("II", 0, "ascii"); data.writeUInt16LE(42, 2); data.writeUInt32LE(8, 4); data.writeUInt16LE(2, 8);
    data.writeUInt16LE(256, 10); data.writeUInt16LE(4, 12); data.writeUInt32LE(1, 14); data.writeUInt32LE(320, 18);
    data.writeUInt16LE(257, 22); data.writeUInt16LE(4, 24); data.writeUInt32LE(1, 26); data.writeUInt32LE(240, 30);
  })],
  ["ktx", buffer(44, (data) => {
    Buffer.from([0xab, 0x4b, 0x54, 0x58, 0x20, 0x31, 0x31, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a]).copy(data);
    data.writeUInt32LE(0x04030201, 12); data.writeUInt32LE(320, 36); data.writeUInt32LE(240, 40);
  })],
];

for (const [type, data] of cases) {
  test(`reads bounded ${type} metadata`, () => {
    assert.deepEqual(imageSize(data), { width: 320, height: 240, type });
  });
}

test("reads an existing project asset by file path", () => {
  const result = imageSize(path.resolve(__dirname, "../../public/icon.png"));
  assert.equal(result.type, "png");
  assert.ok(result.width > 0 && result.height > 0);
});

for (const [name, data] of [
  ["ICNS", Buffer.from("icns00000000", "ascii")],
  ["JXL", Buffer.from([0xff, 0x0a, 0x00, 0x00])],
  ["HEIF", Buffer.from("0000ftypheic", "ascii")],
  ["empty", Buffer.alloc(0)],
  ["truncated PNG", Buffer.from("89504e470d0a1a0a", "hex")],
]) {
  test(`rejects ${name}`, () => {
    assert.throws(() => imageSize(data), /Unsupported or unsafe image/);
  });
}

test("rejects abusive dimensions", () => {
  const data = Buffer.alloc(24);
  Buffer.from("89504e470d0a1a0a", "hex").copy(data);
  data.writeUInt32BE(13, 8); data.write("IHDR", 12, "ascii");
  data.writeUInt32BE(1_000_000, 16); data.writeUInt32BE(1_000_000, 20);
  assert.throws(() => imageSize(data), /dimensions exceed/);
});
