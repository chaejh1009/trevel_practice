/** Read-only validation of the generated atlas. The source PNG is never rewritten. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const root = fileURLToPath(new URL("../", import.meta.url));
const assetPath = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(root, "public/avatars/traveler-atlas-v2.png");
const metadataPath = resolve(root, "public/avatars/traveler-atlas-v2.json");
const reviewPath = resolve(root, "docs/assets/avatar-atlas-review.svg");
const directions = ["down", "left", "right", "up"];
const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++)
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes)
    value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
function paeth(a, b, c) {
  const p = a + b - c,
    da = Math.abs(p - a),
    db = Math.abs(p - b),
    dc = Math.abs(p - c);
  return da <= db && da <= dc ? a : db <= dc ? b : c;
}
function decodePng(buffer) {
  assert.deepEqual(
    buffer.subarray(0, 8),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    "Valid PNG signature",
  );
  let width,
    height,
    colorType,
    bitDepth,
    interlace,
    offset = 8,
    ended = false;
  const data = [];
  while (offset < buffer.length) {
    assert.ok(offset + 12 <= buffer.length, "PNG chunk header is complete");
    const size = buffer.readUInt32BE(offset),
      type = buffer.toString("ascii", offset + 4, offset + 8),
      end = offset + 8 + size;
    assert.ok(end + 4 <= buffer.length, `${type} chunk fits inside the file`);
    assert.equal(
      crc32(buffer.subarray(offset + 4, end)),
      buffer.readUInt32BE(end),
      `${type} CRC is valid`,
    );
    const chunk = buffer.subarray(offset + 8, end);
    if (type === "IHDR") {
      assert.equal(size, 13, "IHDR has its standard length");
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      bitDepth = chunk[8];
      colorType = chunk[9];
      interlace = chunk[12];
      assert.equal(chunk[10], 0, "Standard PNG compression");
      assert.equal(chunk[11], 0, "Standard PNG filtering");
    } else if (type === "IDAT") data.push(chunk);
    else if (type === "IEND") {
      ended = true;
      break;
    }
    offset = end + 4;
  }
  assert.ok(
    ended && width && height && data.length,
    "PNG includes IHDR, image data and IEND",
  );
  assert.equal(bitDepth, 8, "Atlas uses 8-bit channels");
  assert.equal(colorType, 6, "Atlas contains RGBA channels");
  assert.equal(interlace, 0, "Decoder supports a non-interlaced atlas");
  const stride = width * 4,
    raw = inflateSync(Buffer.concat(data)),
    rgba = Buffer.alloc(width * height * 4),
    filters = new Set();
  assert.equal(
    raw.length,
    (stride + 1) * height,
    "Decompressed pixel data has the expected size",
  );
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)],
      base = y * stride;
    assert.ok(filter >= 0 && filter <= 4, "PNG row uses a supported filter");
    filters.add(filter);
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? rgba[base + x - 4] : 0,
        up = y > 0 ? rgba[base + x - stride] : 0,
        upperLeft = x >= 4 && y > 0 ? rgba[base + x - stride - 4] : 0;
      const prediction =
        filter === 0
          ? 0
          : filter === 1
            ? left
            : filter === 2
              ? up
              : filter === 3
                ? Math.floor((left + up) / 2)
                : paeth(left, up, upperLeft);
      rgba[base + x] = (raw[y * (stride + 1) + 1 + x] + prediction) & 255;
    }
  }
  return { width, height, rgba, filters: [...filters].sort() };
}
function components(pixels, width, x0, y0, cellW, cellH, threshold = 32) {
  const mask = new Uint8Array(cellW * cellH),
    queue = new Int32Array(cellW * cellH),
    result = [];
  for (let y = 0; y < cellH; y++)
    for (let x = 0; x < cellW; x++)
      mask[y * cellW + x] =
        pixels[((y + y0) * width + x + x0) * 4 + 3] >= threshold ? 1 : 0;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start]) continue;
    let head = 0,
      tail = 1,
      minX = cellW,
      minY = cellH,
      maxX = -1,
      maxY = -1;
    queue[0] = start;
    mask[start] = 0;
    while (head < tail) {
      const index = queue[head++],
        x = index % cellW,
        y = Math.floor(index / cellW);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= cellW || ny >= cellH) continue;
          const neighbor = ny * cellW + nx;
          if (mask[neighbor]) {
            mask[neighbor] = 0;
            queue[tail++] = neighbor;
          }
        }
    }
    result.push({
      pixels: tail,
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    });
  }
  return result.sort((a, b) => b.pixels - a.pixels);
}
const source = await readFile(assetPath),
  sourceSha256 = createHash("sha256").update(source).digest("hex");
const { width, height, rgba, filters } = decodePng(source),
  columns = 4,
  rows = 4,
  cellWidth = width / columns,
  cellHeight = height / rows;
let transparentPixels = 0,
  opaquePixels = 0,
  partialPixels = 0;
for (let offset = 3; offset < rgba.length; offset += 4) {
  if (rgba[offset] === 0) transparentPixels++;
  else if (rgba[offset] === 255) opaquePixels++;
  else partialPixels++;
}
assert.ok(
  transparentPixels > width * height * 0.2,
  "Atlas contains a substantial fully transparent background",
);
const corners = [
  [0, 0],
  [width - 1, 0],
  [0, height - 1],
  [width - 1, height - 1],
].map(([x, y]) => rgba[(y * width + x) * 4 + 3]);
const frames = [],
  warnings = [];
if (!corners.every((alpha) => alpha === 0))
  warnings.push(
    `Image corner alpha values are ${corners.join(",")}; exact alpha-zero corners are not guaranteed by the generated source.`,
  );
for (let row = 0; row < rows; row++)
  for (let column = 0; column < columns; column++) {
    // Equal SVG cells may have fractional edges. Integer partitions are only for inspecting source pixels.
    const x0 = Math.floor(column * cellWidth),
      y0 = Math.floor(row * cellHeight),
      x1 = Math.floor((column + 1) * cellWidth),
      y1 = Math.floor((row + 1) * cellHeight);
    let minX = width,
      minY = height,
      maxX = -1,
      maxY = -1,
      visible = 0,
      solid = 0,
      partial = 0;
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const alpha = rgba[(y * width + x) * 4 + 3];
        if (alpha > 0) visible++;
        if (alpha === 255) solid++;
        else if (alpha > 0) partial++;
        if (alpha >= 32) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    assert.ok(
      visible > (x1 - x0) * (y1 - y0) * 0.05,
      `${directions[row]}/${column}: frame contains a character`,
    );
    assert.ok(
      maxX >= minX && maxY >= minY,
      `${directions[row]}/${column}: character has visible-alpha content`,
    );
    const parts = components(rgba, width, x0, y0, x1 - x0, y1 - y0),
      small = parts.filter((part) => part.pixels <= 5);
    const touchesCellBoundary =
      minX <= x0 || minY <= y0 || maxX >= x1 - 1 || maxY >= y1 - 1;
    if (touchesCellBoundary)
      warnings.push(
        `${directions[row]}/${column}: visible alpha touches a cell edge; inspect clipping.`,
      );
    if (small.length)
      warnings.push(
        `${directions[row]}/${column}: ${small.length} isolated components of at most 5 pixels (alpha>=32).`,
      );
    frames.push({
      direction: directions[row],
      row,
      column,
      x: column * cellWidth,
      y: row * cellHeight,
      width: cellWidth,
      height: cellHeight,
      pixelPartition: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 },
      contentBounds: {
        x: minX - column * cellWidth,
        y: minY - row * cellHeight,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      },
      absoluteContentBounds: {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      },
      visiblePixels: visible,
      opaquePixels: solid,
      partialPixels: partial,
      componentCount: parts.length,
      largestComponentPixels: parts[0]?.pixels ?? 0,
      smallComponentCount: small.length,
      smallComponentPixels: small.reduce(
        (total, part) => total + part.pixels,
        0,
      ),
      touchesCellBoundary,
    });
  }
const commonContentBounds = {
  x: Math.min(...frames.map((frame) => frame.contentBounds.x)),
  y: Math.min(...frames.map((frame) => frame.contentBounds.y)),
};
commonContentBounds.width =
  Math.max(
    ...frames.map((frame) => frame.contentBounds.x + frame.contentBounds.width),
  ) - commonContentBounds.x;
commonContentBounds.height =
  Math.max(
    ...frames.map(
      (frame) => frame.contentBounds.y + frame.contentBounds.height,
    ),
  ) - commonContentBounds.y;
const metadata = {
  asset: "traveler-atlas-v2.png",
  sourceSha256,
  width,
  height,
  columns,
  rows,
  cellWidth,
  cellHeight,
  directions,
  boundsAlphaThreshold: 32,
  commonContentBounds,
  alpha: {
    transparentPixels,
    opaquePixels,
    partialPixels,
    cornerAlpha: corners,
  },
  filters,
  frames,
  warnings,
};
await mkdir(dirname(metadataPath), { recursive: true });
await writeFile(metadataPath, JSON.stringify(metadata, null, 2) + "\n");

const titles = ["IDLE / 0", "STEP / 1", "PASSING / 2", "STEP / 3"];
const tileWidth = 224,
  tileHeight = 256,
  boardWidth = 1024,
  boardHeight = 1204,
  board = [];
board.push(
  `<rect width="${boardWidth}" height="${boardHeight}" fill="#f7f5ec"/>`,
);
board.push(
  '<g fill="#355c4c" font-family="ui-monospace,monospace"><text x="44" y="44" font-size="25" font-weight="700">CHINA PASSPORT / GENERATED TRAVELER</text><text x="44" y="72" font-size="13" fill="#7f897b">ORIGINAL ATLAS UNCHANGED / 4 DIRECTIONS / 4 FRAMES</text></g>',
);
board.push(
  `<defs><image id="atlas" href="data:image/png;base64,${source.toString("base64")}" width="${width}" height="${height}"/></defs>`,
);
for (let column = 0; column < columns; column++)
  board.push(
    `<text x="${96 + column * tileWidth + tileWidth / 2}" y="108" text-anchor="middle" fill="#677a67" font-family="ui-monospace,monospace" font-size="13">${titles[column]}</text>`,
  );
for (const frame of frames) {
  const x = 96 + frame.column * tileWidth,
    y = 126 + frame.row * tileHeight;
  board.push(
    `<rect x="${x}" y="${y}" width="${tileWidth - 12}" height="${tileHeight - 16}" rx="9" fill="#e8ddc5"/>`,
  );
  if (frame.column === 0)
    board.push(
      `<text x="20" y="${y + 118}" fill="#7e8877" font-family="ui-monospace,monospace" font-size="12">${frame.direction.toUpperCase()}</text>`,
    );
  board.push(
    `<svg x="${x + 8}" y="${y + 8}" width="${tileWidth - 28}" height="${tileHeight - 40}" viewBox="${frame.x} ${frame.y} ${frame.width} ${frame.height}" preserveAspectRatio="xMidYMax meet" overflow="hidden"><use href="#atlas"/></svg>`,
  );
  board.push(
    `<text x="${x + 12}" y="${y + tileHeight - 25}" fill="#8d927e" font-family="ui-monospace,monospace" font-size="10">${frame.contentBounds.width}X${frame.contentBounds.height} CONTENT</text>`,
  );
}
board.push(
  `<text x="44" y="1182" fill="#8a927f" font-family="ui-monospace,monospace" font-size="12">SOURCE ${width}X${height} RGBA / SVG CELL ${cellWidth}X${cellHeight} / ALPHA BACKGROUND VERIFIED</text>`,
);
await mkdir(dirname(reviewPath), { recursive: true });
await writeFile(
  reviewPath,
  `<svg xmlns="http://www.w3.org/2000/svg" width="${boardWidth}" height="${boardHeight}" viewBox="0 0 ${boardWidth} ${boardHeight}" role="img" aria-label="Generated traveler atlas, four directions and four walking frames"><title>Generated traveler atlas review</title>${board.join("")}</svg>\n`,
);
assert.equal(
  createHash("sha256")
    .update(await readFile(assetPath))
    .digest("hex"),
  sourceSha256,
  "Source PNG remains unchanged",
);
console.log(
  JSON.stringify(
    {
      status: "passed",
      sourceSha256,
      width,
      height,
      cellWidth,
      cellHeight,
      frames: frames.length,
      transparentPixels,
      partialPixels,
      commonContentBounds,
      totalSmallComponents: frames.reduce(
        (sum, frame) => sum + frame.smallComponentCount,
        0,
      ),
      framesTouchingBoundary: frames
        .filter((frame) => frame.touchesCellBoundary)
        .map((frame) => `${frame.direction}/${frame.column}`),
      metadata: "public/avatars/traveler-atlas-v2.json",
      review: "docs/assets/avatar-atlas-review.svg",
      warnings,
    },
    null,
    2,
  ),
);
