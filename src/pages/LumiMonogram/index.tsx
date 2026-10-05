import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled, { createGlobalStyle, css } from 'styled-components'
import { Check, Copy, Download, Shuffle } from 'react-feather'

/**
 * Lumi Monogram Studio
 *
 * A brand-led monogram generator modelled on lumidental.au: warm bone and
 * terracotta palette, editorial serif typography, unhurried spacing and the
 * seven-point "lumi" sparkle as its only ornament.
 *
 * Everything renders as SVG, so output is resolution independent and
 * exports to crisp SVG or 2400px PNG. Layout is "letter-aware": each pair is
 * measured with real font metrics and classified by glyph shape (open,
 * round, wide, narrow) so the two initials interlock, tuck or breathe the
 * way a type designer would set them, rather than sitting on a fixed grid.
 */

// ---------------------------------------------------------------------------
// Brand tokens (lifted from lumidental.au's stylesheet)
// ---------------------------------------------------------------------------

const LUMI = {
  bone: '#F6F1EA',
  blush: '#FAEDE3',
  peach: '#F3D9C4',
  border: '#D9D1C4',
  ink: '#1E1E1E',
  charcoal: '#2E2A27',
  cocoa: '#7A4F36',
  muted: '#6B6B6B',
  terracotta: '#B5693C',
  terracottaDark: '#9C5A34',
  clay: '#C8836F',
  tan: '#C49A7C',
  sienna: '#993C1D',
  gold: '#D2A24C',
}

type PaletteKey = 'boneInk' | 'terracotta' | 'blushCocoa' | 'inkGold' | 'clayCream' | 'charcoalClay'

interface Palette {
  label: string
  bg: string
  primary: string
  secondary: string
  rule: string
  caption: string
}

const PALETTES: Record<PaletteKey, Palette> = {
  boneInk: { label: 'Bone & Ink', bg: LUMI.bone, primary: LUMI.ink, secondary: LUMI.terracotta, rule: LUMI.border, caption: LUMI.muted },
  terracotta: { label: 'Terracotta', bg: LUMI.terracotta, primary: LUMI.bone, secondary: LUMI.blush, rule: LUMI.clay, caption: LUMI.peach },
  blushCocoa: { label: 'Blush & Cocoa', bg: LUMI.blush, primary: LUMI.cocoa, secondary: LUMI.clay, rule: LUMI.peach, caption: LUMI.tan },
  inkGold: { label: 'Ink & Gold', bg: LUMI.ink, primary: LUMI.bone, secondary: LUMI.gold, rule: '#3A3531', caption: '#9A928A' },
  clayCream: { label: 'Clay & Cream', bg: LUMI.peach, primary: LUMI.sienna, secondary: LUMI.charcoal, rule: '#E0AE92', caption: LUMI.cocoa },
  charcoalClay: { label: 'Charcoal & Clay', bg: LUMI.charcoal, primary: LUMI.clay, secondary: LUMI.bone, rule: '#5F5651', caption: LUMI.tan },
}

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

interface Face {
  family: string
  weight: number
  style: 'normal' | 'italic'
}

type PairKey = 'dmSerif' | 'cormorant' | 'playfair' | 'instrument' | 'josefin'

interface Pair {
  label: string
  primary: Face
  secondary: Face
  caption: Face
}

const PAIRS: Record<PairKey, Pair> = {
  dmSerif: {
    label: 'DM Serif',
    primary: { family: 'DM Serif Display', weight: 400, style: 'normal' },
    secondary: { family: 'Instrument Serif', weight: 400, style: 'italic' },
    caption: { family: 'DM Sans', weight: 400, style: 'normal' },
  },
  cormorant: {
    label: 'Cormorant',
    primary: { family: 'Cormorant Garamond', weight: 500, style: 'normal' },
    secondary: { family: 'Cormorant Garamond', weight: 300, style: 'italic' },
    caption: { family: 'Josefin Sans', weight: 300, style: 'normal' },
  },
  playfair: {
    label: 'Playfair',
    primary: { family: 'Playfair Display', weight: 700, style: 'normal' },
    secondary: { family: 'Playfair Display', weight: 400, style: 'italic' },
    caption: { family: 'DM Sans', weight: 300, style: 'normal' },
  },
  instrument: {
    label: 'Instrument',
    primary: { family: 'Instrument Serif', weight: 400, style: 'normal' },
    secondary: { family: 'Instrument Serif', weight: 400, style: 'italic' },
    caption: { family: 'DM Sans', weight: 400, style: 'normal' },
  },
  josefin: {
    label: 'Josefin',
    primary: { family: 'Josefin Sans', weight: 300, style: 'normal' },
    secondary: { family: 'DM Serif Display', weight: 400, style: 'italic' },
    caption: { family: 'Josefin Sans', weight: 400, style: 'normal' },
  },
}

const GOOGLE_FONT_FAMILIES = [
  'DM+Serif+Display:ital@0;1',
  'Instrument+Serif:ital@0;1',
  'Cormorant+Garamond:ital,wght@0,300;0,500;0,600;1,300;1,400',
  'Playfair+Display:ital,wght@0,400;0,700;1,400',
  'DM+Sans:wght@300;400;500',
  'Josefin+Sans:wght@300;400',
]

const FONT_CSS_URL = `https://fonts.googleapis.com/css2?${GOOGLE_FONT_FAMILIES.map((f) => `family=${f}`).join(
  '&'
)}&display=swap`

const faceCss = (f: Face, size: number) => `${f.style} ${f.weight} ${size}px "${f.family}"`

let fontLinkInjected = false
function injectFontLink() {
  if (fontLinkInjected || typeof document === 'undefined') return
  fontLinkInjected = true
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = FONT_CSS_URL
  document.head.appendChild(link)
}

/** Resolves true once every face we draw with is available to the canvas and SVG renderers. */
function useFontsReady(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    injectFontLink()
    let cancelled = false
    const fonts = (document as any).fonts
    if (!fonts || !fonts.load) {
      setReady(true)
      return () => undefined
    }
    const faces: Face[] = []
    Object.values(PAIRS).forEach((p) => faces.push(p.primary, p.secondary, p.caption))
    Promise.all(faces.map((f) => fonts.load(faceCss(f, 40), 'ABC').catch(() => null)))
      .then(() => fonts.ready)
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])
  return ready
}

// ---------------------------------------------------------------------------
// Glyph measurement and shape intelligence
// ---------------------------------------------------------------------------

interface GlyphBox {
  advance: number
  left: number // ink extends this far left of the origin
  right: number // ink extends this far right of the origin
  ascent: number
  descent: number
}

const MEASURE_SIZE = 100
let measureCtx: CanvasRenderingContext2D | null = null
const glyphCache = new Map<string, GlyphBox>()

function measureGlyph(ch: string, face: Face, fontsReady: boolean): GlyphBox {
  const key = `${fontsReady ? 1 : 0}|${faceCss(face, MEASURE_SIZE)}|${ch}`
  const cached = glyphCache.get(key)
  if (cached) return cached
  if (!measureCtx && typeof document !== 'undefined') {
    measureCtx = document.createElement('canvas').getContext('2d')
  }
  let box: GlyphBox = { advance: 65, left: 0, right: 65, ascent: 70, descent: 2 }
  if (measureCtx) {
    measureCtx.font = faceCss(face, MEASURE_SIZE)
    const m: any = measureCtx.measureText(ch)
    const hasInk = typeof m.actualBoundingBoxLeft === 'number'
    box = {
      advance: m.width,
      left: hasInk ? m.actualBoundingBoxLeft : 0,
      right: hasInk ? m.actualBoundingBoxRight : m.width,
      ascent: hasInk ? m.actualBoundingBoxAscent : MEASURE_SIZE * 0.7,
      descent: hasInk ? m.actualBoundingBoxDescent : MEASURE_SIZE * 0.02,
    }
  }
  if (fontsReady) glyphCache.set(key, box)
  return box
}

const scaleBox = (b: GlyphBox, size: number): GlyphBox => {
  const k = size / MEASURE_SIZE
  return { advance: b.advance * k, left: b.left * k, right: b.right * k, ascent: b.ascent * k, descent: b.descent * k }
}

const inkWidth = (b: GlyphBox) => b.right + b.left

// Shape classes drive how tightly two letters may sit together.
const OPEN_RIGHT = 'CEFKLTY' // empty counter on the right: the next letter can tuck in
const OPEN_LEFT = 'AJTVWY' // empty space on the left: can tuck under the previous letter
const ROUND = 'CGOQS'
const WIDE = 'MWOQGD'
const NARROW = 'IJLTF'

/**
 * How far (as a fraction of the narrower glyph) the second letter should
 * overlap the first. Open shapes invite more overlap, two round or wide
 * shapes need more air, narrow shapes can sit closer.
 */
function overlapFactor(a: string, b: string, base: number): number {
  let k = base
  if (OPEN_RIGHT.includes(a)) k += 0.12
  if (OPEN_LEFT.includes(b)) k += 0.1
  if (ROUND.includes(a) && ROUND.includes(b)) k -= 0.08
  if (WIDE.includes(a) || WIDE.includes(b)) k -= 0.05
  if (NARROW.includes(a) || NARROW.includes(b)) k += 0.04
  return Math.min(0.6, Math.max(0.04, k))
}

interface PlacedLetter {
  ch: string
  x: number // baseline origin x
  y: number // baseline y
  size: number
  face: Face
  box: GlyphBox
}

/**
 * Lays out two letters relative to one another, then centres the pair's ink
 * on (cx, cy). Returns baseline origins ready to drop into <text>.
 */
function layoutPair(
  a: PlacedLetter,
  b: PlacedLetter,
  cx: number,
  cy: number,
  overlap: number,
  drop: number
): [PlacedLetter, PlacedLetter] {
  const aw = inkWidth(a.box)
  const bw = inkWidth(b.box)
  const bx = a.box.right - overlap * Math.min(aw, bw) + b.box.left
  const by = drop
  const minX = Math.min(-a.box.left, bx - b.box.left)
  const maxX = Math.max(a.box.right, bx + b.box.right)
  const minY = Math.min(-a.box.ascent, by - b.box.ascent)
  const maxY = Math.max(a.box.descent, by + b.box.descent)
  const dx = cx - (minX + maxX) / 2
  const dy = cy - (minY + maxY) / 2
  return [
    { ...a, x: dx, y: dy },
    { ...b, x: bx + dx, y: by + dy },
  ]
}

// ---------------------------------------------------------------------------
// Spec, variation and seeded randomness
// ---------------------------------------------------------------------------

type Composition = 'interlock' | 'editorial' | 'seal' | 'stacked' | 'lumi' | 'outline'
type Ornament = 'none' | 'sparkle' | 'frame' | 'dots'

const COMPOSITIONS: Record<Composition, string> = {
  interlock: 'Interlock',
  editorial: 'Editorial',
  seal: 'Seal',
  stacked: 'Stacked',
  lumi: 'Lumi',
  outline: 'Outline',
}

const ORNAMENTS: Record<Ornament, string> = {
  none: 'None',
  sparkle: 'Sparkle',
  frame: 'Frame',
  dots: 'Dots',
}

interface Spec {
  a: string
  b: string
  composition: Composition
  palette: PaletteKey
  pair: PairKey
  ornament: Ornament
  name: string
  tagline: string
}

const DEFAULT_SPEC: Spec = {
  a: 'L',
  b: 'D',
  composition: 'interlock',
  palette: 'boneInk',
  pair: 'dmSerif',
  ornament: 'sparkle',
  name: 'lumi dental',
  tagline: 'Thoughtful dentistry',
}

/* eslint-disable no-bitwise */
function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
/* eslint-enable no-bitwise */

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Six distinct compositions, each with its own palette, type pairing and ornament. */
function generateVariants(base: Spec, seed: number): Spec[] {
  const rnd = mulberry32(seed)
  const comps = shuffle(Object.keys(COMPOSITIONS) as Composition[], rnd)
  const palettes = shuffle(Object.keys(PALETTES) as PaletteKey[], rnd)
  const pairs = Object.keys(PAIRS) as PairKey[]
  const ornaments = Object.keys(ORNAMENTS) as Ornament[]
  return comps.map((composition, i) => ({
    ...base,
    composition,
    palette: palettes[i % palettes.length],
    pair: pairs[Math.floor(rnd() * pairs.length)],
    ornament: ornaments[Math.floor(rnd() * ornaments.length)],
  }))
}

// ---------------------------------------------------------------------------
// SVG rendering
// ---------------------------------------------------------------------------

const S = 800 // viewBox size
const C = S / 2

const Sparkle: React.FC<{ cx: number; cy: number; r: number; fill: string }> = ({ cx, cy, r, fill }) => {
  // Seven tapered spokes, after the lumidental.au favicon.
  const spokes: string[] = []
  for (let i = 0; i < 7; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI * 2) / 7
    const tipX = cx + Math.cos(ang) * r
    const tipY = cy + Math.sin(ang) * r
    const w = r * 0.19
    const px = Math.cos(ang + Math.PI / 2) * w
    const py = Math.sin(ang + Math.PI / 2) * w
    const inner = r * 0.08
    const ix = cx + Math.cos(ang) * inner
    const iy = cy + Math.sin(ang) * inner
    spokes.push(`M${ix + px},${iy + py} L${tipX},${tipY} L${ix - px},${iy - py} Z`)
  }
  return (
    <g fill={fill}>
      <circle cx={cx} cy={cy} r={r * 0.2} />
      {spokes.map((d) => (
        <path key={d} d={d} strokeLinejoin="round" stroke={fill} strokeWidth={r * 0.1} />
      ))}
    </g>
  )
}

const Letter: React.FC<{ p: PlacedLetter; fill: string; stroke?: string; strokeWidth?: number; opacity?: number }> = ({
  p,
  fill,
  stroke,
  strokeWidth,
  opacity,
}) => (
  <text
    x={p.x}
    y={p.y}
    fontFamily={`"${p.face.family}", Georgia, serif`}
    fontWeight={p.face.weight}
    fontStyle={p.face.style}
    fontSize={p.size}
    fill={fill}
    stroke={stroke}
    strokeWidth={strokeWidth}
    opacity={opacity}
    paintOrder="stroke"
  >
    {p.ch}
  </text>
)

interface CaptionProps {
  text: string
  x: number
  y: number
  size: number
  face: Face
  fill: string
  anchor?: 'start' | 'middle' | 'end'
  tracking?: number
  upper?: boolean
  italic?: boolean
}

const Caption: React.FC<CaptionProps> = ({ text, x, y, size, face, fill, anchor = 'middle', tracking = 0, upper, italic }) =>
  text ? (
    <text
      x={x}
      y={y}
      fontFamily={`"${face.family}", sans-serif`}
      fontWeight={face.weight}
      fontStyle={italic ? 'italic' : face.style}
      fontSize={size}
      fill={fill}
      textAnchor={anchor}
      letterSpacing={tracking}
    >
      {upper ? text.toUpperCase() : text}
    </text>
  ) : null

interface RenderCtx {
  spec: Spec
  pal: Palette
  pair: Pair
  fontsReady: boolean
}

const place = (ch: string, face: Face, size: number, fontsReady: boolean): PlacedLetter => ({
  ch,
  x: 0,
  y: 0,
  size,
  face,
  box: scaleBox(measureGlyph(ch, face, fontsReady), size),
})

/** Centres a single letter's ink on (cx, cy). */
const centreOne = (p: PlacedLetter, cx: number, cy: number): PlacedLetter => ({
  ...p,
  x: cx - (p.box.right - p.box.left) / 2,
  y: cy + (p.box.ascent - p.box.descent) / 2,
})

function renderOrnament({ spec, pal }: RenderCtx) {
  switch (spec.ornament) {
    case 'sparkle':
      return (
        <>
          <Sparkle cx={96} cy={96} r={20} fill={pal.secondary} />
          <Sparkle cx={S - 96} cy={S - 96} r={20} fill={pal.secondary} />
        </>
      )
    case 'frame':
      return (
        <>
          <rect x={44} y={44} width={S - 88} height={S - 88} fill="none" stroke={pal.rule} strokeWidth={1.5} />
          <rect x={56} y={56} width={S - 112} height={S - 112} fill="none" stroke={pal.rule} strokeWidth={0.75} />
        </>
      )
    case 'dots':
      return (
        <g fill={pal.secondary}>
          <circle cx={C} cy={60} r={4} />
          <circle cx={C} cy={S - 60} r={4} />
          <circle cx={60} cy={C} r={4} />
          <circle cx={S - 60} cy={C} r={4} />
        </g>
      )
    default:
      return null
  }
}

function renderComposition(ctx: RenderCtx) {
  const { spec, pal, pair, fontsReady } = ctx
  const { a, b, name, tagline } = spec
  const cap = pair.caption

  switch (spec.composition) {
    case 'interlock': {
      const A = place(a, pair.primary, 420, fontsReady)
      const B = place(b, pair.secondary, 330, fontsReady)
      const [pa, pb] = layoutPair(A, B, C, 372, overlapFactor(a, b, 0.2), 78)
      return (
        <>
          <Letter p={pa} fill={pal.primary} />
          <Letter p={pb} fill={pal.secondary} opacity={0.94} />
          <Caption text={name} x={C} y={656} size={21} face={cap} fill={pal.caption} tracking={7} upper />
          <Caption text={tagline} x={C} y={698} size={22} face={pair.secondary} fill={pal.secondary} italic />
        </>
      )
    }
    case 'editorial': {
      const A = place(a, pair.primary, 460, fontsReady)
      const B = place(b, pair.primary, 460, fontsReady)
      const [pa, pb] = layoutPair(A, B, C, 350, overlapFactor(a, b, 0.02), 0)
      return (
        <>
          <Letter p={pa} fill={pal.primary} />
          <Letter p={pb} fill={pal.secondary} />
          <line x1={110} y1={586} x2={S - 110} y2={586} stroke={pal.rule} strokeWidth={1.5} />
          <Caption text={name} x={110} y={626} size={19} face={cap} fill={pal.primary} anchor="start" tracking={5} upper />
          <Caption text={tagline} x={S - 110} y={626} size={21} face={pair.secondary} fill={pal.caption} anchor="end" italic />
          <Caption text="N° 01" x={110} y={666} size={14} face={cap} fill={pal.caption} anchor="start" tracking={3} />
        </>
      )
    }
    case 'seal': {
      const A = place(a, pair.primary, 250, fontsReady)
      const B = place(b, pair.secondary, 250, fontsReady)
      const [pa, pb] = layoutPair(A, B, C, C, overlapFactor(a, b, 0.08), 0)
      const r = 292
      return (
        <>
          <defs>
            <path id="seal-top" d={`M ${C - r} ${C} A ${r} ${r} 0 0 1 ${C + r} ${C}`} />
            <path id="seal-bottom" d={`M ${C - r} ${C} A ${r} ${r} 0 0 0 ${C + r} ${C}`} />
          </defs>
          <circle cx={C} cy={C} r={330} fill="none" stroke={pal.primary} strokeWidth={2} />
          <circle cx={C} cy={C} r={258} fill="none" stroke={pal.rule} strokeWidth={1} />
          <Letter p={pa} fill={pal.primary} />
          <Letter p={pb} fill={pal.secondary} />
          <text
            fontFamily={`"${cap.family}", sans-serif`}
            fontWeight={cap.weight}
            fontSize={22}
            fill={pal.primary}
            letterSpacing={8}
          >
            <textPath href="#seal-top" startOffset="50%" textAnchor="middle">
              {name.toUpperCase()}
            </textPath>
          </text>
          <text
            fontFamily={`"${pair.secondary.family}", Georgia, serif`}
            fontStyle="italic"
            fontSize={24}
            fill={pal.caption}
            letterSpacing={2}
          >
            <textPath href="#seal-bottom" startOffset="50%" textAnchor="middle">
              {tagline}
            </textPath>
          </text>
          <Sparkle cx={C - r} cy={C} r={11} fill={pal.secondary} />
          <Sparkle cx={C + r} cy={C} r={11} fill={pal.secondary} />
        </>
      )
    }
    case 'stacked': {
      const pa = centreOne(place(a, pair.primary, 300, fontsReady), C, 232)
      const pb = centreOne(place(b, pair.secondary, 300, fontsReady), C, 520)
      return (
        <>
          <Letter p={pa} fill={pal.primary} />
          <line x1={C - 70} y1={376} x2={C + 70} y2={376} stroke={pal.secondary} strokeWidth={1.5} />
          <Letter p={pb} fill={pal.secondary} />
          <Caption text={name} x={C} y={700} size={20} face={cap} fill={pal.caption} tracking={7} upper />
          <Caption text={tagline} x={C} y={736} size={20} face={pair.secondary} fill={pal.secondary} italic />
        </>
      )
    }
    case 'lumi': {
      const A = place(a, pair.primary, 380, fontsReady)
      const B = place(b, pair.primary, 380, fontsReady)
      const [pa, pb] = layoutPair(A, B, C, 392, -0.32, 0)
      const gap = (pa.x + pa.box.right + (pb.x - pb.box.left)) / 2
      return (
        <>
          <defs>
            <radialGradient id="lumi-bloom" cx="50%" cy="46%" r="52%">
              <stop offset="0%" stopColor={pal.secondary} stopOpacity={0.42} />
              <stop offset="55%" stopColor={pal.secondary} stopOpacity={0.1} />
              <stop offset="100%" stopColor={pal.secondary} stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect x={0} y={0} width={S} height={S} fill="url(#lumi-bloom)" />
          <Letter p={pa} fill={pal.primary} />
          <Letter p={pb} fill={pal.primary} />
          <Sparkle cx={gap} cy={236} r={26} fill={pal.secondary} />
          <Caption text={name} x={C} y={640} size={21} face={cap} fill={pal.caption} tracking={7} upper />
          <Caption text={tagline} x={C} y={684} size={22} face={pair.secondary} fill={pal.secondary} italic />
        </>
      )
    }
    case 'outline': {
      const A = place(a, pair.primary, 430, fontsReady)
      const B = place(b, pair.primary, 430, fontsReady)
      const [pa, pb] = layoutPair(A, B, C, 372, overlapFactor(a, b, 0.42), 0)
      return (
        <>
          <Letter p={pa} fill={pal.primary} />
          <Letter p={pb} fill={pal.bg} stroke={pal.secondary} strokeWidth={3} opacity={0.96} />
          <Caption text={name} x={C} y={656} size={21} face={cap} fill={pal.caption} tracking={7} upper />
          <Caption text={tagline} x={C} y={698} size={22} face={pair.secondary} fill={pal.secondary} italic />
        </>
      )
    }
    default:
      return null
  }
}

const MonogramSVG = React.forwardRef<SVGSVGElement, { spec: Spec; fontsReady: boolean; embeddedCss?: string }>(
  ({ spec, fontsReady, embeddedCss }, ref) => {
    const pal = PALETTES[spec.palette]
    const pair = PAIRS[spec.pair]
    const ctx: RenderCtx = { spec, pal, pair, fontsReady }
    return (
      <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${S} ${S}`} width="100%" height="100%">
        {embeddedCss ? <style>{embeddedCss}</style> : null}
        <rect width={S} height={S} fill={pal.bg} />
        {renderOrnament(ctx)}
        {renderComposition(ctx)}
      </svg>
    )
  }
)
MonogramSVG.displayName = 'MonogramSVG'

// ---------------------------------------------------------------------------
// Export: embed subsetted fonts so SVG and PNG look right anywhere
// ---------------------------------------------------------------------------

const embeddedCssCache = new Map<string, Promise<string>>()

function fontQueryFor(face: Face): string {
  const fam = face.family.replace(/ /g, '+')
  const ital = face.style === 'italic' ? 1 : 0
  return `family=${fam}:ital,wght@${ital},${face.weight}`
}

async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  const buf = await res.arrayBuffer()
  let bin = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  const type = res.headers.get('content-type') || 'font/woff2'
  return `data:${type};base64,${btoa(bin)}`
}

/** Fetches Google Fonts CSS subsetted to the characters in use and inlines each font file as base64. */
function getEmbeddedCss(spec: Spec): Promise<string> {
  const pair = PAIRS[spec.pair]
  const faces = [pair.primary, pair.secondary, pair.caption]
  const chars = Array.from(new Set(`${spec.a}${spec.b}${spec.name}${spec.name.toUpperCase()}${spec.tagline}N° 01`))
    .sort()
    .join('')
  const key = `${faces.map((f) => faceCss(f, 1)).join('|')}|${chars}`
  const cached = embeddedCssCache.get(key)
  if (cached) return cached
  const url = `https://fonts.googleapis.com/css2?${faces.map(fontQueryFor).join('&')}&text=${encodeURIComponent(chars)}`
  const job = (async () => {
    const css = await (await fetch(url)).text()
    const urls = Array.from(new Set(Array.from(css.matchAll(/url\((https:[^)]+)\)/g)).map((m) => m[1])))
    const dataUrls = await Promise.all(urls.map(toDataUrl))
    let out = css
    urls.forEach((u, i) => {
      out = out.split(u).join(dataUrls[i])
    })
    return out
  })()
  embeddedCssCache.set(key, job)
  job.catch(() => embeddedCssCache.delete(key))
  return job
}

function serializeSvg(el: SVGSVGElement, css: string): string {
  const clone = el.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', String(S))
  clone.setAttribute('height', String(S))
  const existing = clone.querySelector('style')
  if (existing) existing.remove()
  if (css) {
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
    style.textContent = css
    clone.insertBefore(style, clone.firstChild)
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function svgToPng(svgText: string, px: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = px
      canvas.height = px
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('no 2d context'))
        return
      }
      ctx.drawImage(img, 0, 0, px, px)
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png')
    }
    img.onerror = () => reject(new Error('svg failed to rasterise'))
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`
  })
}

// ---------------------------------------------------------------------------
// Styles (page chrome in the Lumi look, independent of the app theme)
// ---------------------------------------------------------------------------

const StudioFonts = createGlobalStyle`
  @import url('${FONT_CSS_URL}');
`

const Studio = styled.div`
  --bone: ${LUMI.bone};
  --ink: ${LUMI.ink};
  --muted: ${LUMI.muted};
  --rule: ${LUMI.border};
  --accent: ${LUMI.terracotta};
  --accent-dark: ${LUMI.terracottaDark};
  --blush: ${LUMI.blush};

  width: 100%;
  max-width: 1080px;
  background: var(--bone);
  color: var(--ink);
  border: 1px solid var(--rule);
  border-radius: 28px;
  padding: 36px 32px 40px;
  font-family: 'DM Sans', system-ui, sans-serif;
  box-shadow: 0 30px 80px -40px rgba(46, 42, 39, 0.35);

  @media (max-width: 640px) {
    padding: 24px 18px 28px;
    border-radius: 20px;
  }
`

const Eyebrow = styled.div`
  font-family: 'Josefin Sans', sans-serif;
  font-size: 11px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
`

const Title = styled.h1`
  font-family: 'DM Serif Display', Georgia, serif;
  font-weight: 400;
  font-size: clamp(30px, 4.2vw, 44px);
  line-height: 1.05;
  margin: 0 0 10px;
  letter-spacing: -0.01em;
`

const Sub = styled.p`
  margin: 0 0 30px;
  color: var(--muted);
  font-size: 15px;
  max-width: 56ch;
  line-height: 1.55;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 32px;
  align-items: start;

  @media (max-width: 880px) {
    grid-template-columns: 1fr;
  }
`

const Controls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 22px;
`

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--muted);
`

const inputBase = css`
  font-family: 'DM Sans', system-ui, sans-serif;
  background: #fff;
  color: var(--ink);
  border: 1px solid var(--rule);
  border-radius: 12px;
  transition: border-color 0.15s, box-shadow 0.15s;
  &:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(181, 105, 60, 0.18);
  }
`

const TextInput = styled.input`
  ${inputBase};
  padding: 11px 14px;
  font-size: 15px;
  letter-spacing: normal;
  text-transform: none;
`

const LetterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`

const LetterInput = styled.input`
  ${inputBase};
  width: 92px;
  height: 92px;
  text-align: center;
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 50px;
  text-transform: uppercase;
  letter-spacing: normal;
`

const Amp = styled.span`
  font-family: 'Instrument Serif', Georgia, serif;
  font-style: italic;
  font-size: 30px;
  color: var(--accent);
  letter-spacing: normal;
  text-transform: none;
`

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const Chip = styled.button<{ active: boolean }>`
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 13px;
  padding: 8px 13px;
  border-radius: 999px;
  cursor: pointer;
  border: 1px solid ${({ active }) => (active ? 'var(--ink)' : 'var(--rule)')};
  background: ${({ active }) => (active ? 'var(--ink)' : 'transparent')};
  color: ${({ active }) => (active ? 'var(--bone)' : 'var(--ink)')};
  transition: all 0.15s;
  &:hover {
    border-color: var(--ink);
  }
`

const Swatch = styled.button<{ active: boolean; bg: string; fg: string; accent: string }>`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid ${({ active }) => (active ? 'var(--ink)' : 'transparent')};
  padding: 0;
  background: ${({ bg }) => bg};
  position: relative;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
  transition: transform 0.15s;
  &:hover {
    transform: translateY(-1px);
  }
  &::before {
    content: '';
    position: absolute;
    left: 11px;
    top: 11px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${({ fg }) => fg};
  }
  &::after {
    content: '';
    position: absolute;
    right: 10px;
    bottom: 10px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ accent }) => accent};
  }
`

const PrimaryButton = styled.button`
  font-family: 'DM Sans', system-ui, sans-serif;
  font-weight: 500;
  font-size: 14px;
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 18px;
  border-radius: 999px;
  border: 1px solid var(--accent);
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  &:hover {
    background: var(--accent-dark);
  }
  &:active {
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`

const GhostButton = styled(PrimaryButton)`
  background: transparent;
  color: var(--ink);
  border-color: var(--rule);
  &:hover {
    background: #fff;
    border-color: var(--ink);
  }
`

const Preview = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const Hero = styled.div`
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid var(--rule);
  aspect-ratio: 1 / 1;
  background: #fff;
  & svg {
    display: block;
  }
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
`

const Status = styled.span`
  font-size: 12px;
  color: var(--muted);
  margin-left: auto;
`

const VariantsHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 8px;
  h2 {
    font-family: 'DM Serif Display', Georgia, serif;
    font-weight: 400;
    font-size: 22px;
    margin: 0;
  }
  span {
    font-size: 12px;
    color: var(--muted);
  }
`

const VariantGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  @media (max-width: 520px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const VariantTile = styled.button<{ active: boolean }>`
  padding: 0;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  background: transparent;
  border: 2px solid ${({ active }) => (active ? 'var(--accent)' : 'var(--rule)')};
  aspect-ratio: 1 / 1;
  transition: transform 0.15s, border-color 0.15s;
  &:hover {
    transform: translateY(-2px);
    border-color: var(--accent);
  }
  & svg {
    display: block;
  }
`

const Footnote = styled.p`
  margin: 28px 0 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
`

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const cleanLetter = (v: string, fallback: string) => {
  const m = v.replace(/[^a-zA-Z]/g, '')
  return (m.slice(-1) || fallback).toUpperCase()
}

const LumiMonogram: React.FC = () => {
  const fontsReady = useFontsReady()
  const heroRef = useRef<SVGSVGElement>(null)
  const [spec, setSpec] = useState<Spec>(DEFAULT_SPEC)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9))
  const [busy, setBusy] = useState<'svg' | 'png' | 'copy' | null>(null)
  const [status, setStatus] = useState('')

  const variants = useMemo(() => generateVariants(spec, seed), [spec, seed])

  const update = useCallback((patch: Partial<Spec>) => setSpec((s) => ({ ...s, ...patch })), [])

  const flash = (msg: string) => {
    setStatus(msg)
    window.setTimeout(() => setStatus(''), 2600)
  }

  const exportWith = async (kind: 'svg' | 'png' | 'copy') => {
    const el = heroRef.current
    if (!el || busy) return
    setBusy(kind)
    let css = ''
    try {
      css = await getEmbeddedCss(spec)
    } catch (e) {
      console.warn('Font embedding failed, exporting with fallback fonts', e)
    }
    const svgText = serializeSvg(el, css)
    const base = `lumi-monogram-${spec.a}${spec.b}-${spec.composition}`
    try {
      if (kind === 'svg') {
        downloadBlob(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }), `${base}.svg`)
        flash(css ? 'SVG saved with embedded type' : 'SVG saved (fonts not embedded)')
      } else if (kind === 'png') {
        const blob = await svgToPng(svgText, 2400)
        downloadBlob(blob, `${base}.png`)
        flash('PNG saved at 2400 px')
      } else {
        await navigator.clipboard.writeText(svgText)
        flash('SVG copied to clipboard')
      }
    } catch (e) {
      console.error(e)
      flash('Export failed, please try again')
    } finally {
      setBusy(null)
    }
  }

  const sameAsSpec = (v: Spec) =>
    v.composition === spec.composition &&
    v.palette === spec.palette &&
    v.pair === spec.pair &&
    v.ornament === spec.ornament

  return (
    <Studio>
      <StudioFonts />
      <Eyebrow>
        <svg width="14" height="14" viewBox="0 0 40 40" aria-hidden="true">
          <Sparkle cx={20} cy={20} r={18} fill={LUMI.terracotta} />
        </svg>
        Lumi Monogram Studio
      </Eyebrow>
      <Title>Two letters, thoughtfully set.</Title>
      <Sub>
        Type a pair of initials and the studio measures each glyph, reads its shape and sets the two together the way a
        typographer would. Six compositions are drawn at once in the Lumi palette. Pick one, refine it, export it as
        crisp SVG or print-ready PNG.
      </Sub>

      <Grid>
        <Controls>
          <Field as="div">
            Initials
            <LetterRow>
              <LetterInput
                aria-label="First initial"
                maxLength={1}
                value={spec.a}
                onChange={(e) => update({ a: cleanLetter(e.target.value, spec.a) })}
              />
              <Amp>&amp;</Amp>
              <LetterInput
                aria-label="Second initial"
                maxLength={1}
                value={spec.b}
                onChange={(e) => update({ b: cleanLetter(e.target.value, spec.b) })}
              />
            </LetterRow>
          </Field>

          <Field>
            Name
            <TextInput value={spec.name} maxLength={28} onChange={(e) => update({ name: e.target.value })} />
          </Field>

          <Field>
            Tagline
            <TextInput value={spec.tagline} maxLength={36} onChange={(e) => update({ tagline: e.target.value })} />
          </Field>

          <Field as="div">
            Composition
            <Chips>
              {(Object.keys(COMPOSITIONS) as Composition[]).map((k) => (
                <Chip key={k} active={spec.composition === k} onClick={() => update({ composition: k })}>
                  {COMPOSITIONS[k]}
                </Chip>
              ))}
            </Chips>
          </Field>

          <Field as="div">
            Palette
            <Chips>
              {(Object.keys(PALETTES) as PaletteKey[]).map((k) => (
                <Swatch
                  key={k}
                  title={PALETTES[k].label}
                  aria-label={PALETTES[k].label}
                  active={spec.palette === k}
                  bg={PALETTES[k].bg}
                  fg={PALETTES[k].primary}
                  accent={PALETTES[k].secondary}
                  onClick={() => update({ palette: k })}
                />
              ))}
            </Chips>
          </Field>

          <Field as="div">
            Type pairing
            <Chips>
              {(Object.keys(PAIRS) as PairKey[]).map((k) => (
                <Chip key={k} active={spec.pair === k} onClick={() => update({ pair: k })}>
                  {PAIRS[k].label}
                </Chip>
              ))}
            </Chips>
          </Field>

          <Field as="div">
            Ornament
            <Chips>
              {(Object.keys(ORNAMENTS) as Ornament[]).map((k) => (
                <Chip key={k} active={spec.ornament === k} onClick={() => update({ ornament: k })}>
                  {ORNAMENTS[k]}
                </Chip>
              ))}
            </Chips>
          </Field>

          <PrimaryButton onClick={() => setSeed(Math.floor(Math.random() * 1e9))}>
            <Shuffle size={16} />
            Draw six new variations
          </PrimaryButton>
        </Controls>

        <Preview>
          <Hero>
            <MonogramSVG ref={heroRef} spec={spec} fontsReady={fontsReady} />
          </Hero>
          <Actions>
            <PrimaryButton onClick={() => exportWith('svg')} disabled={!!busy}>
              <Download size={16} />
              {busy === 'svg' ? 'Preparing…' : 'Download SVG'}
            </PrimaryButton>
            <GhostButton onClick={() => exportWith('png')} disabled={!!busy}>
              <Download size={16} />
              {busy === 'png' ? 'Rendering…' : 'Download PNG'}
            </GhostButton>
            <GhostButton onClick={() => exportWith('copy')} disabled={!!busy}>
              {status.startsWith('SVG copied') ? <Check size={16} /> : <Copy size={16} />}
              Copy SVG
            </GhostButton>
            <Status>{status || (fontsReady ? '' : 'Loading type…')}</Status>
          </Actions>

          <VariantsHead>
            <h2>Six takes on {`${spec.a}${spec.b}`}</h2>
            <span>Click one to make it the hero</span>
          </VariantsHead>
          <VariantGrid>
            {variants.map((v) => (
              <VariantTile
                key={`${v.composition}-${v.palette}-${v.pair}-${v.ornament}`}
                active={sameAsSpec(v)}
                title={`${COMPOSITIONS[v.composition]} · ${PALETTES[v.palette].label} · ${PAIRS[v.pair].label}`}
                onClick={() =>
                  update({ composition: v.composition, palette: v.palette, pair: v.pair, ornament: v.ornament })
                }
              >
                <MonogramSVG spec={v} fontsReady={fontsReady} />
              </VariantTile>
            ))}
          </VariantGrid>
        </Preview>
      </Grid>

      <Footnote>
        Palette and type are drawn from lumidental.au: bone, blush, terracotta and ink, set in DM Serif Display, Instrument
        Serif, Cormorant Garamond, Playfair Display, DM Sans and Josefin Sans. Exports embed only the glyphs you used, so
        files stay small and render identically anywhere.
      </Footnote>
    </Studio>
  )
}

export default LumiMonogram
