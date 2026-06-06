// Generates public/icon.png — a 256x256 orange square with "SAS" text
// Pure Node.js: no dependencies required
const fs   = require('fs')
const path = require('path')
const zlib = require('zlib')

const W = 256, H = 256

// ── CRC32 ──────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const t   = Buffer.from(type, 'ascii')
  const len = Buffer.allocUnsafe(4)
  len.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.concat([t, data])
  const crcOut = Buffer.allocUnsafe(4)
  crcOut.writeUInt32BE(crc32(crcBuf), 0)
  return Buffer.concat([len, t, data, crcOut])
}

// ── Draw ───────────────────────────────────────────────────────
// RGBA pixels
const pixels = new Uint8Array(W * H * 4)

// Background: #ff6b00
for (let i = 0; i < W * H; i++) {
  pixels[i * 4 + 0] = 0xff  // R
  pixels[i * 4 + 1] = 0x6b  // G
  pixels[i * 4 + 2] = 0x00  // B
  pixels[i * 4 + 3] = 0xff  // A
}

// Simple 5×7 pixel font: 0–9 A–Z
const FONT = {
  S: [[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[0,0,0,0,1],[1,1,1,1,0]],  // rough 5-row S
  A: [[0,1,1,1,0],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
}

function drawChar(char, startX, startY, scale, r, g, b) {
  const glyph = FONT[char]
  if (!glyph) return
  for (let row = 0; row < glyph.length; row++) {
    for (let col = 0; col < glyph[row].length; col++) {
      if (!glyph[row][col]) continue
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = startX + col * scale + dx
          const py = startY + row * scale + dy
          if (px < 0 || px >= W || py < 0 || py >= H) continue
          const idx = (py * W + px) * 4
          pixels[idx]     = r
          pixels[idx + 1] = g
          pixels[idx + 2] = b
          pixels[idx + 3] = 0xff
        }
      }
    }
  }
}

// Draw "SAS" centered, white, scale 12 (each cell = 12px)
const scale   = 12
const charW   = 5 * scale  // 60px per char
const spacing = 8           // gap between chars
const totalW  = charW * 3 + spacing * 2  // 196px
const startX  = Math.floor((W - totalW) / 2)
const startY  = Math.floor((H - 5 * scale) / 2)

drawChar('S', startX,              startY, scale, 255, 255, 255)
drawChar('A', startX + charW + spacing,     startY, scale, 255, 255, 255)
drawChar('S', startX + (charW + spacing)*2, startY, scale, 255, 255, 255)

// ── Encode PNG ────────────────────────────────────────────────
// Filter type 0 (None) + RGB (drop alpha for smaller file)
const raw = Buffer.allocUnsafe(H * (1 + W * 3))
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 3)] = 0  // filter byte
  for (let x = 0; x < W; x++) {
    const src = (y * W + x) * 4
    const dst = y * (1 + W * 3) + 1 + x * 3
    raw[dst]     = pixels[src]
    raw[dst + 1] = pixels[src + 1]
    raw[dst + 2] = pixels[src + 2]
  }
}

const compressed = zlib.deflateSync(raw, { level: 6 })

const ihdr = Buffer.allocUnsafe(13)
ihdr.writeUInt32BE(W, 0)
ihdr.writeUInt32BE(H, 4)
ihdr[8]  = 8  // bit depth
ihdr[9]  = 2  // color type: RGB
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),  // PNG signature
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
])

const out = path.join(__dirname, '../public/icon.png')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, png)
console.log(`✓ ${out} (${png.length} bytes)`)
