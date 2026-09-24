// Génère build/icon.png (512) + build/icon.ico (16→256) — logo chapeau de diplômé,
// dégradé bleu, coins arrondis. Sans dépendance : encodage PNG/ICO fait à la main.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'build')

const S = 1024 // master supersamplé
const px = new Uint8Array(S * S * 4)

// ---- Dessin (coordonnées master, i.e. design 512 ×2) ----
const mix = (a, b, t) => Math.round(a + (b - a) * t)
const TOP = [59, 130, 246]   // #3b82f6
const BOTTOM = [29, 78, 216] // #1d4ed8

function insideRoundedRect(x, y) {
  const r = 224
  const cx = Math.min(Math.max(x, r), S - r)
  const cy = Math.min(Math.max(y, r), S - r)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}
function insideDiamond(x, y) {
  const P = [[512, 300], [800, 430], [512, 560], [224, 430]]
  let inside = false
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i]
    const [xj, yj] = P[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
function insideBase(x, y) {
  const P = [[380, 500], [644, 500], [612, 636], [412, 636]]
  let inside = false
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i]
    const [xj, yj] = P[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
function distToSeg(px_, py_, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const t = Math.max(0, Math.min(1, ((px_ - x1) * dx + (py_ - y1) * dy) / (dx * dx + dy * dy)))
  const qx = x1 + t * dx
  const qy = y1 + t * dy
  return Math.hypot(px_ - qx, py_ - qy)
}
function isWhite(x, y) {
  if (insideDiamond(x, y) || insideBase(x, y)) return true
  if (distToSeg(x, y, 800, 430, 800, 600) <= 11) return true // fil du mauve
  if (Math.hypot(x - 800, y - 618) <= 26) return true // pompon
  return false
}

for (let y = 0; y < S; y++) {
  const g = y / (S - 1)
  const grad = [mix(TOP[0], BOTTOM[0], g), mix(TOP[1], BOTTOM[1], g), mix(TOP[2], BOTTOM[2], g)]
  for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4
    if (!insideRoundedRect(x, y)) continue
    const c = isWhite(x, y) ? [255, 255, 255] : grad
    px[i] = c[0]
    px[i + 1] = c[1]
    px[i + 2] = c[2]
    px[i + 3] = 255
  }
}

// ---- Redimensionnement (box filter si diviseur entier, sinon nearest) ----
function resize(size) {
  const out = new Uint8Array(size * size * 4)
  const f = S / size
  const integer = Number.isInteger(f)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const oi = (y * size + x) * 4
      if (integer) {
        let r = 0, g = 0, b = 0, a = 0
        for (let dy = 0; dy < f; dy++) {
          for (let dx = 0; dx < f; dx++) {
            const si = ((y * f + dy) * S + x * f + dx) * 4
            r += px[si]; g += px[si + 1]; b += px[si + 2]; a += px[si + 3]
          }
        }
        const n = f * f
        out[oi] = r / n; out[oi + 1] = g / n; out[oi + 2] = b / n; out[oi + 3] = a / n
      } else {
        const sx = Math.min(S - 1, Math.round((x + 0.5) * f - 0.5))
        const sy = Math.min(S - 1, Math.round((y + 0.5) * f - 0.5))
        const si = (sy * S + sx) * 4
        out[oi] = px[si]; out[oi + 1] = px[si + 1]; out[oi + 2] = px[si + 2]; out[oi + 3] = px[si + 3]
      }
    }
  }
  return out
}

// ---- Encodage PNG ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc(h * (w * 4 + 1))
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ---- Encodage ICO (entrées BMP 32 bits + masque AND) ----
function encodeICO(sizes, getRgba) {
  const entries = sizes.map((s) => {
    const rgba = getRgba(s)
    const xorBytes = s * s * 4
    const andRow = Math.ceil(s / 32) * 4
    const andBytes = andRow * s
    const header = Buffer.alloc(40)
    header.writeUInt32LE(40, 0)
    header.writeUInt32LE(s, 4)
    header.writeUInt32LE(s * 2, 8)
    header.writeUInt16LE(1, 12)
    header.writeUInt16LE(32, 14)
    header.writeUInt32LE(0, 16)
    header.writeUInt32LE(xorBytes + andBytes, 20)
    const xor = Buffer.alloc(xorBytes)
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const si = ((s - 1 - y) * s + x) * 4 // bottom-up
        const di = (y * s + x) * 4
        xor[di] = rgba[si + 2]
        xor[di + 1] = rgba[si + 1]
        xor[di + 2] = rgba[si]
        xor[di + 3] = rgba[si + 3]
      }
    }
    const and = Buffer.alloc(andBytes) // 0 = opaque (la transparence vient du canal alpha)
    return { size: s, data: Buffer.concat([header, xor, and]) }
  })
  const head = Buffer.alloc(6)
  head.writeUInt16LE(0, 0)
  head.writeUInt16LE(1, 2)
  head.writeUInt16LE(entries.length, 4)
  let offset = 6 + entries.length * 16
  const dirs = entries.map((e) => {
    const d = Buffer.alloc(16)
    d[0] = e.size >= 256 ? 0 : e.size
    d[1] = e.size >= 256 ? 0 : e.size
    d.writeUInt16LE(1, 4)
    d.writeUInt16LE(32, 6)
    d.writeUInt32LE(e.data.length, 8)
    d.writeUInt32LE(offset, 12)
    offset += e.data.length
    return d
  })
  return Buffer.concat([head, ...dirs, ...entries.map((e) => e.data)])
}

mkdirSync(OUT_DIR, { recursive: true })
const master512 = resize(512)
writeFileSync(join(OUT_DIR, 'icon.png'), encodePNG(512, 512, master512))
writeFileSync(join(OUT_DIR, 'icon.ico'), encodeICO([256, 128, 64, 48, 32, 16], resize))
console.log('build/icon.png (512) + build/icon.ico (16..256) générés')
