import React, { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { Card, CardBody, Heading, Text, Button } from '@pancakeswap-libs/uikit'
import { Download, RefreshCw } from 'react-feather'

// --- Types ---

type MonogramStyle = 'classic' | 'artdeco' | 'royal' | 'modern' | 'script'
type ColorScheme = 'gold' | 'silver' | 'roseGold' | 'blackWhite' | 'navyGold'

interface ColorPalette {
  bg: string
  primary: string
  secondary: string
  accent: string
  text: string
}

// --- Constants ---

const COLOR_SCHEMES: Record<ColorScheme, ColorPalette> = {
  gold: { bg: '#1a1a0e', primary: '#d4af37', secondary: '#f5e6a3', accent: '#b8860b', text: '#f5e6a3' },
  silver: { bg: '#1a1a1f', primary: '#c0c0c0', secondary: '#e8e8e8', accent: '#808080', text: '#e8e8e8' },
  roseGold: { bg: '#1f1518', primary: '#b76e79', secondary: '#f0d0d5', accent: '#8b4557', text: '#f0d0d5' },
  blackWhite: { bg: '#0a0a0a', primary: '#ffffff', secondary: '#cccccc', accent: '#666666', text: '#ffffff' },
  navyGold: { bg: '#0a1628', primary: '#d4af37', secondary: '#f5e6a3', accent: '#1e3a5f', text: '#f5e6a3' },
}

const STYLE_LABELS: Record<MonogramStyle, string> = {
  classic: 'Classic Serif',
  artdeco: 'Art Deco',
  royal: 'Royal Crest',
  modern: 'Modern Luxe',
  script: 'Script Elegant',
}

const COLOR_LABELS: Record<ColorScheme, string> = {
  gold: 'Gold',
  silver: 'Silver',
  roseGold: 'Rose Gold',
  blackWhite: 'Noir',
  navyGold: 'Navy & Gold',
}

const CANVAS_SIZE = 600

// --- Drawing helpers ---

function drawBackground(ctx: CanvasRenderingContext2D, palette: ColorPalette) {
  const g = ctx.createRadialGradient(300, 300, 50, 300, 300, 420)
  g.addColorStop(0, palette.bg)
  g.addColorStop(1, darken(palette.bg, 0.3))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
}

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * amount))
  const gr = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount))
  const b = Math.max(0, (num & 0xff) - Math.round(255 * amount))
  return `#${((r << 16) | (gr << 8) | b).toString(16).padStart(6, '0')}`
}

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount))
  const gr = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount))
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount))
  return `#${((r << 16) | (gr << 8) | b).toString(16).padStart(6, '0')}`
}

function drawOrnamentLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number
) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.stroke()
}

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.beginPath()
  ctx.moveTo(cx, cy - size)
  ctx.lineTo(cx + size, cy)
  ctx.lineTo(cx, cy + size)
  ctx.lineTo(cx - size, cy)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function drawCircleOutline(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  width: number
) {
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.stroke()
}

function drawCornerFlourishes(ctx: CanvasRenderingContext2D, palette: ColorPalette) {
  const corners = [
    { x: 40, y: 40, sx: 1, sy: 1 },
    { x: 560, y: 40, sx: -1, sy: 1 },
    { x: 40, y: 560, sx: 1, sy: -1 },
    { x: 560, y: 560, sx: -1, sy: -1 },
  ]
  corners.forEach(({ x, y, sx, sy }) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(sx, sy)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(30, 0, 40, 20, 40, 40)
    ctx.strokeStyle = palette.primary
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(5, 0)
    ctx.bezierCurveTo(25, 5, 35, 25, 35, 40)
    ctx.strokeStyle = palette.accent
    ctx.lineWidth = 1.5
    ctx.stroke()
    drawDiamond(ctx, 0, 0, 3, palette.secondary)
    ctx.restore()
  })
}

// --- Style-specific renderers ---

function drawClassic(ctx: CanvasRenderingContext2D, l1: string, l2: string, palette: ColorPalette) {
  drawBackground(ctx, palette)

  // Outer border
  ctx.strokeStyle = palette.primary
  ctx.lineWidth = 3
  ctx.strokeRect(30, 30, 540, 540)
  ctx.strokeStyle = palette.accent
  ctx.lineWidth = 1
  ctx.strokeRect(38, 38, 524, 524)

  drawCornerFlourishes(ctx, palette)

  // Horizontal ornament lines
  drawOrnamentLine(ctx, 100, 150, 500, 150, palette.accent, 1)
  drawOrnamentLine(ctx, 100, 450, 500, 450, palette.accent, 1)
  drawDiamond(ctx, 300, 150, 5, palette.primary)
  drawDiamond(ctx, 300, 450, 5, palette.primary)

  // Letters
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const grad = ctx.createLinearGradient(150, 200, 450, 400)
  grad.addColorStop(0, palette.primary)
  grad.addColorStop(0.5, palette.secondary)
  grad.addColorStop(1, palette.primary)

  ctx.font = 'bold 180px "Georgia", "Times New Roman", serif'
  ctx.fillStyle = grad
  ctx.fillText(l1, 210, 310)
  ctx.fillText(l2, 400, 310)

  // Ampersand
  ctx.font = 'italic 40px "Georgia", serif'
  ctx.fillStyle = palette.accent
  ctx.fillText('&', 305, 270)

  // Subtitle line
  ctx.font = '14px "Georgia", serif'
  ctx.fillStyle = palette.accent
  ctx.letterSpacing = '8px'
  ctx.fillText('M  O  N  O  G  R  A  M', 300, 490)
  ctx.letterSpacing = '0px'
}

function drawArtDeco(ctx: CanvasRenderingContext2D, l1: string, l2: string, palette: ColorPalette) {
  drawBackground(ctx, palette)

  // Art deco geometric frame
  const cx = 300
  const cy = 300

  // Outer octagon
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i - Math.PI / 8
    const x = cx + 260 * Math.cos(angle)
    const y = cy + 260 * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.strokeStyle = palette.primary
  ctx.lineWidth = 3
  ctx.stroke()

  // Inner octagon
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i - Math.PI / 8
    const x = cx + 240 * Math.cos(angle)
    const y = cy + 240 * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.strokeStyle = palette.accent
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Radiating lines
  for (let i = 0; i < 16; i++) {
    const angle = (Math.PI / 8) * i
    const x1 = cx + 180 * Math.cos(angle)
    const y1 = cy + 180 * Math.sin(angle)
    const x2 = cx + 240 * Math.cos(angle)
    const y2 = cy + 240 * Math.sin(angle)
    drawOrnamentLine(ctx, x1, y1, x2, y2, palette.accent, 0.8)
  }

  // Sunburst behind letters
  for (let i = 0; i < 36; i++) {
    const angle = (Math.PI / 18) * i
    const x1 = cx + 80 * Math.cos(angle)
    const y1 = cy + 80 * Math.sin(angle)
    const x2 = cx + 160 * Math.cos(angle)
    const y2 = cy + 160 * Math.sin(angle)
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = `${palette.accent}30`
    ctx.lineWidth = 2
    ctx.stroke()
  }

  // Letters
  const grad = ctx.createLinearGradient(150, 250, 450, 350)
  grad.addColorStop(0, palette.primary)
  grad.addColorStop(0.5, palette.secondary)
  grad.addColorStop(1, palette.primary)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 160px "Copperplate", "Georgia", serif'
  ctx.fillStyle = grad
  ctx.fillText(l1, 220, 300)
  ctx.fillText(l2, 390, 300)

  // Separator
  drawOrnamentLine(ctx, 280, 230, 320, 230, palette.primary, 2)
  drawOrnamentLine(ctx, 285, 370, 315, 370, palette.primary, 2)
  drawDiamond(ctx, 300, 230, 4, palette.secondary)
  drawDiamond(ctx, 300, 370, 4, palette.secondary)

  // Top/bottom chevrons
  ctx.beginPath()
  ctx.moveTo(260, 130)
  ctx.lineTo(300, 110)
  ctx.lineTo(340, 130)
  ctx.strokeStyle = palette.primary
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(260, 470)
  ctx.lineTo(300, 490)
  ctx.lineTo(340, 470)
  ctx.strokeStyle = palette.primary
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawRoyal(ctx: CanvasRenderingContext2D, l1: string, l2: string, palette: ColorPalette) {
  drawBackground(ctx, palette)

  const cx = 300
  const cy = 310

  // Shield shape
  ctx.beginPath()
  ctx.moveTo(cx - 180, 100)
  ctx.lineTo(cx + 180, 100)
  ctx.lineTo(cx + 180, 350)
  ctx.quadraticCurveTo(cx + 180, 480, cx, 530)
  ctx.quadraticCurveTo(cx - 180, 480, cx - 180, 350)
  ctx.closePath()
  ctx.strokeStyle = palette.primary
  ctx.lineWidth = 4
  ctx.stroke()

  // Inner shield
  ctx.beginPath()
  ctx.moveTo(cx - 165, 112)
  ctx.lineTo(cx + 165, 112)
  ctx.lineTo(cx + 165, 345)
  ctx.quadraticCurveTo(cx + 165, 468, cx, 515)
  ctx.quadraticCurveTo(cx - 165, 468, cx - 165, 345)
  ctx.closePath()
  ctx.strokeStyle = palette.accent
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Crown at top
  const crownY = 70
  ctx.beginPath()
  ctx.moveTo(cx - 50, crownY + 30)
  ctx.lineTo(cx - 50, crownY + 10)
  ctx.lineTo(cx - 30, crownY + 20)
  ctx.lineTo(cx - 15, crownY)
  ctx.lineTo(cx, crownY + 15)
  ctx.lineTo(cx + 15, crownY)
  ctx.lineTo(cx + 30, crownY + 20)
  ctx.lineTo(cx + 50, crownY + 10)
  ctx.lineTo(cx + 50, crownY + 30)
  ctx.closePath()
  ctx.fillStyle = palette.primary
  ctx.fill()
  ctx.strokeStyle = palette.secondary
  ctx.lineWidth = 1
  ctx.stroke()

  // Crown gems
  drawDiamond(ctx, cx - 15, crownY + 5, 3, palette.secondary)
  drawDiamond(ctx, cx, crownY + 18, 3, palette.secondary)
  drawDiamond(ctx, cx + 15, crownY + 5, 3, palette.secondary)

  // Horizontal divider in shield
  drawOrnamentLine(ctx, cx - 140, 180, cx + 140, 180, palette.accent, 1)
  drawOrnamentLine(ctx, cx - 100, 430, cx + 100, 430, palette.accent, 1)

  // Letters
  const grad = ctx.createLinearGradient(160, 240, 440, 380)
  grad.addColorStop(0, palette.primary)
  grad.addColorStop(0.5, palette.secondary)
  grad.addColorStop(1, palette.primary)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 170px "Georgia", "Times New Roman", serif'
  ctx.fillStyle = grad
  ctx.fillText(l1, 220, cy)
  ctx.fillText(l2, 390, cy)

  // Dot separator
  ctx.beginPath()
  ctx.arc(cx, cy, 5, 0, Math.PI * 2)
  ctx.fillStyle = palette.secondary
  ctx.fill()

  // Motto area
  ctx.font = '12px "Georgia", serif'
  ctx.fillStyle = palette.accent
  ctx.fillText('E S T .   2 0 2 6', cx, 460)
}

function drawModern(ctx: CanvasRenderingContext2D, l1: string, l2: string, palette: ColorPalette) {
  drawBackground(ctx, palette)

  const cx = 300
  const cy = 300

  // Clean circles
  drawCircleOutline(ctx, cx, cy, 250, palette.primary, 2)
  drawCircleOutline(ctx, cx, cy, 243, palette.accent, 0.5)

  // Minimal cross lines
  drawOrnamentLine(ctx, cx - 250, cy, cx - 180, cy, palette.accent, 0.5)
  drawOrnamentLine(ctx, cx + 180, cy, cx + 250, cy, palette.accent, 0.5)
  drawOrnamentLine(ctx, cx, cy - 250, cx, cy - 180, palette.accent, 0.5)
  drawOrnamentLine(ctx, cx, cy + 180, cx, cy + 250, palette.accent, 0.5)

  // Letters - clean modern font
  const grad = ctx.createLinearGradient(150, 250, 450, 350)
  grad.addColorStop(0, palette.primary)
  grad.addColorStop(0.5, lighten(palette.primary, 0.2))
  grad.addColorStop(1, palette.primary)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '200 160px "Helvetica Neue", "Arial", sans-serif'
  ctx.fillStyle = grad
  ctx.fillText(l1, 215, cy - 5)
  ctx.fillText(l2, 395, cy - 5)

  // Thin vertical separator
  drawOrnamentLine(ctx, cx, cy - 60, cx, cy + 60, palette.accent, 1)

  // Dots at compass points
  const dotPositions = [0, 90, 180, 270]
  dotPositions.forEach((deg) => {
    const angle = (deg * Math.PI) / 180
    const x = cx + 246 * Math.cos(angle)
    const y = cy + 246 * Math.sin(angle)
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fillStyle = palette.primary
    ctx.fill()
  })

  // Bottom label
  ctx.font = '300 11px "Helvetica Neue", "Arial", sans-serif'
  ctx.fillStyle = palette.accent
  ctx.fillText('L U X U R Y   M O N O G R A M', cx, cy + 210)
}

function drawScript(ctx: CanvasRenderingContext2D, l1: string, l2: string, palette: ColorPalette) {
  drawBackground(ctx, palette)

  const cx = 300
  const cy = 300

  // Elegant oval frame
  ctx.beginPath()
  ctx.ellipse(cx, cy, 240, 260, 0, 0, Math.PI * 2)
  ctx.strokeStyle = palette.primary
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.beginPath()
  ctx.ellipse(cx, cy, 230, 250, 0, 0, Math.PI * 2)
  ctx.strokeStyle = palette.accent
  ctx.lineWidth = 0.8
  ctx.stroke()

  // Decorative swirl at top
  ctx.beginPath()
  ctx.moveTo(cx - 60, cy - 250)
  ctx.bezierCurveTo(cx - 60, cy - 280, cx + 60, cy - 280, cx + 60, cy - 250)
  ctx.strokeStyle = palette.primary
  ctx.lineWidth = 1.5
  ctx.stroke()
  drawDiamond(ctx, cx, cy - 270, 4, palette.secondary)

  // Decorative swirl at bottom
  ctx.beginPath()
  ctx.moveTo(cx - 60, cy + 250)
  ctx.bezierCurveTo(cx - 60, cy + 280, cx + 60, cy + 280, cx + 60, cy + 250)
  ctx.strokeStyle = palette.primary
  ctx.lineWidth = 1.5
  ctx.stroke()
  drawDiamond(ctx, cx, cy + 270, 4, palette.secondary)

  // Side flourishes
  const drawFlourish = (startX: number, dir: number) => {
    ctx.beginPath()
    ctx.moveTo(startX, cy - 30)
    ctx.bezierCurveTo(startX + dir * 30, cy - 50, startX + dir * 30, cy + 50, startX, cy + 30)
    ctx.strokeStyle = palette.accent
    ctx.lineWidth = 1
    ctx.stroke()
  }
  drawFlourish(cx - 110, -1)
  drawFlourish(cx + 110, 1)

  // Script letters with shadow
  const grad = ctx.createLinearGradient(160, 240, 440, 360)
  grad.addColorStop(0, palette.secondary)
  grad.addColorStop(0.5, palette.primary)
  grad.addColorStop(1, palette.secondary)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Shadow
  ctx.font = 'italic 190px "Georgia", "Palatino", serif'
  ctx.fillStyle = `${palette.accent}40`
  ctx.fillText(l1, 213, cy + 5)
  ctx.fillText(l2, 397, cy + 5)

  // Main letters
  ctx.fillStyle = grad
  ctx.fillText(l1, 210, cy)
  ctx.fillText(l2, 395, cy)

  // Connecting flourish between letters
  ctx.beginPath()
  ctx.moveTo(cx - 20, cy + 40)
  ctx.bezierCurveTo(cx - 10, cy + 60, cx + 10, cy + 60, cx + 20, cy + 40)
  ctx.strokeStyle = palette.primary
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Small decorative dots along oval
  for (let i = 0; i < 24; i++) {
    const angle = (Math.PI / 12) * i
    const x = cx + 235 * Math.cos(angle)
    const y = cy + 255 * Math.sin(angle)
    ctx.beginPath()
    ctx.arc(x, y, 1.5, 0, Math.PI * 2)
    ctx.fillStyle = palette.accent
    ctx.fill()
  }
}

const STYLE_RENDERERS: Record<MonogramStyle, typeof drawClassic> = {
  classic: drawClassic,
  artdeco: drawArtDeco,
  royal: drawRoyal,
  modern: drawModern,
  script: drawScript,
}

// --- Styled Components ---

const PageWrapper = styled.div`
  width: 100%;
  max-width: 620px;
`

const StyledCard = styled(Card)`
  overflow: visible;
`

const Header = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderColor};
  padding: 24px;
`

const Body = styled(CardBody)`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`

const LetterInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: center;
`

const LetterInput = styled.input`
  width: 80px;
  height: 80px;
  text-align: center;
  font-size: 40px;
  font-weight: bold;
  font-family: 'Georgia', serif;
  border: 2px solid ${({ theme }) => theme.colors.borderColor};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.input};
  color: ${({ theme }) => theme.colors.text};
  text-transform: uppercase;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary}33;
  }
`

const Ampersand = styled.span`
  font-size: 24px;
  font-family: 'Georgia', serif;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-style: italic;
`

const OptionsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const OptionLabel = styled(Text)`
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
`

const OptionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const StyleChip = styled.button<{ active: boolean }>`
  padding: 8px 14px;
  border-radius: 20px;
  border: 1.5px solid ${({ active, theme }) => (active ? theme.colors.primary : theme.colors.borderColor)};
  background: ${({ active, theme }) => (active ? `${theme.colors.primary}18` : 'transparent')};
  color: ${({ active, theme }) => (active ? theme.colors.primary : theme.colors.textSubtle)};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const ColorChip = styled.button<{ active: boolean; swatch: string }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2.5px solid ${({ active, theme }) => (active ? theme.colors.primary : 'transparent')};
  background: ${({ swatch }) => swatch};
  cursor: pointer;
  transition: all 0.15s;
  position: relative;

  &:hover {
    transform: scale(1.1);
  }

  &::after {
    content: '';
    position: absolute;
    inset: 2px;
    border-radius: 50%;
    border: 1.5px solid rgba(255, 255, 255, 0.15);
  }
`

const CanvasWrapper = styled.div`
  display: flex;
  justify-content: center;
  border-radius: 16px;
  overflow: hidden;
  background: #000;
`

const StyledCanvas = styled.canvas`
  width: 100%;
  max-width: 100%;
  height: auto;
  display: block;
`

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;

  & > button {
    flex: 1;
  }
`

// --- Component ---

const MonogramGenerator: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [letter1, setLetter1] = useState('A')
  const [letter2, setLetter2] = useState('B')
  const [style, setStyle] = useState<MonogramStyle>('classic')
  const [colorScheme, setColorScheme] = useState<ColorScheme>('gold')

  const renderMonogram = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = CANVAS_SIZE
    canvas.height = CANVAS_SIZE

    const palette = COLOR_SCHEMES[colorScheme]
    const renderer = STYLE_RENDERERS[style]
    const l1 = (letter1 || 'A').toUpperCase()
    const l2 = (letter2 || 'B').toUpperCase()

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    renderer(ctx, l1, l2, palette)
  }, [letter1, letter2, style, colorScheme])

  useEffect(() => {
    renderMonogram()
  }, [renderMonogram])

  const handleLetterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const val = e.target.value.replace(/[^a-zA-Z]/g, '').slice(-1)
    setter(val.toUpperCase())
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `monogram-${letter1}${letter2}-${style}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handleRandomize = () => {
    const styles = Object.keys(STYLE_LABELS) as MonogramStyle[]
    const colors = Object.keys(COLOR_LABELS) as ColorScheme[]
    setStyle(styles[Math.floor(Math.random() * styles.length)])
    setColorScheme(colors[Math.floor(Math.random() * colors.length)])
  }

  return (
    <PageWrapper>
      <StyledCard>
        <Header>
          <Heading mb="8px">Luxury Monogram Generator</Heading>
          <Text color="textSubtle" fontSize="14px">
            AI-powered monogram design for two initials
          </Text>
        </Header>
        <Body>
          <LetterInputRow>
            <LetterInput
              maxLength={1}
              value={letter1}
              onChange={handleLetterChange(setLetter1)}
              placeholder="A"
            />
            <Ampersand>&amp;</Ampersand>
            <LetterInput
              maxLength={1}
              value={letter2}
              onChange={handleLetterChange(setLetter2)}
              placeholder="B"
            />
          </LetterInputRow>

          <OptionsSection>
            <OptionLabel color="textSubtle">Style</OptionLabel>
            <OptionRow>
              {(Object.keys(STYLE_LABELS) as MonogramStyle[]).map((s) => (
                <StyleChip key={s} active={style === s} onClick={() => setStyle(s)}>
                  {STYLE_LABELS[s]}
                </StyleChip>
              ))}
            </OptionRow>
          </OptionsSection>

          <OptionsSection>
            <OptionLabel color="textSubtle">Color</OptionLabel>
            <OptionRow>
              {(Object.keys(COLOR_LABELS) as ColorScheme[]).map((c) => (
                <ColorChip
                  key={c}
                  active={colorScheme === c}
                  swatch={COLOR_SCHEMES[c].primary}
                  onClick={() => setColorScheme(c)}
                  title={COLOR_LABELS[c]}
                />
              ))}
            </OptionRow>
          </OptionsSection>

          <CanvasWrapper>
            <StyledCanvas ref={canvasRef} />
          </CanvasWrapper>

          <ButtonRow>
            <Button variant="secondary" onClick={handleRandomize}>
              <RefreshCw size={16} style={{ marginRight: 8 }} />
              Randomize
            </Button>
            <Button onClick={handleDownload}>
              <Download size={16} style={{ marginRight: 8 }} />
              Download PNG
            </Button>
          </ButtonRow>
        </Body>
      </StyledCard>
    </PageWrapper>
  )
}

export default MonogramGenerator
