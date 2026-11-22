import type { Card, Suit } from '../core/types';

export const COLORS = {
  wood: '#241712',
  woodLight: '#5a3520',
  woodDark: '#080607',
  felt: '#123d32',
  feltDark: '#0a251f',
  feltLight: '#1d5a45',
  cream: '#fff7e6',
  paper: '#fffaf0',
  ink: '#100c12',
  red: '#ff3b30',
  redDark: '#a01820',
  gold: '#ffc93c',
  goldDark: '#a35f18',
  blue: '#3d8bd8',
  green: '#28c76f',
  gray: '#9c94a0',
  /** Gris oscuro para texto sobre papel claro: cumple contraste sin romper la paleta. */
  mutedInk: '#5f5866',
  white: '#ffffff',
  shadow: '#000000',
  panel: '#160f14',
  panelLight: '#2b1d24',
  pink: '#ff7aa8',
  navy: '#101a2e',
};

/** Aclara (amount > 0) u oscurece (amount < 0) un color hexadecimal. */
export function shadeColor(hex: string, amount: number): string {
  const value = hex.replace('#', '');
  if (value.length !== 6) return hex;
  const channels = [0, 2, 4].map((offset) => {
    const base = parseInt(value.slice(offset, offset + 2), 16);
    const adjusted = amount >= 0 ? base + (255 - base) * amount : base * (1 + amount);
    return Math.max(0, Math.min(255, Math.round(adjusted))).toString(16).padStart(2, '0');
  });
  return `#${channels.join('')}`;
}

/** Tipografía bitmap 5x7. */
const FONT: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '#....', '####.', '....#', '....#', '####.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  ':': ['.....', '..#..', '..#..', '.....', '..#..', '..#..', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '/': ['....#', '...#.', '..#..', '.#...', '#....', '.....', '.....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['..#..', '...#.', '....#', '....#', '....#', '...#.', '..#..'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  '>': ['#....', '.#...', '..#..', '...#.', '..#..', '.#...', '#....'],
  '<': ['...#.', '..#..', '.#...', '#....', '.#...', '..#..', '...#.'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  _: ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
  '[': ['.###.', '.#...', '.#...', '.#...', '.#...', '.#...', '.###.'],
  ']': ['.###.', '...#.', '...#.', '...#.', '...#.', '...#.', '.###.'],
  '"': ['#.#.#', '#.#.#', '.....', '.....', '.....', '.....', '.....'],
  '¿': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '¡': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
  '→': ['.....', '....#', '..###', '#####', '..###', '....#', '.....'],
  '·': ['.....', '.....', '.....', '..#..', '.....', '.....', '.....'],
  '…': ['.....', '.....', '.....', '.....', '.....', '.....', '.#.#.'],
};

/** Las mayúsculas acentuadas conservan su marca en la fila superior del glifo. */
const ACCENTED_BASE: Record<string, string> = {
  Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ñ: 'N', Ü: 'U',
};

for (const [accented, base] of Object.entries(ACCENTED_BASE)) {
  const mark = accented === 'Ñ' ? '.#.#.' : accented === 'Ü' ? '#.#.#' : '..#..';
  FONT[accented] = [mark, ...(FONT[base] ?? FONT['?']).slice(1)];
}

export function normalizeText(text: string): string {
  return text.toUpperCase();
}

export function textWidth(text: string, scale = 1, spacing = 1): number {
  const chars = normalizeText(text).length;
  return chars === 0 ? 0 : (chars * (5 + spacing) - spacing) * scale;
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color = COLORS.cream,
  scale = 1,
  spacing = 1,
): void {
  ctx.fillStyle = color;
  let cursor = Math.round(x);
  for (const char of normalizeText(text)) {
    const glyph = FONT[char] ?? FONT['?'];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === '#') ctx.fillRect(cursor + col * scale, Math.round(y) + row * scale, scale, scale);
      }
    }
    cursor += (5 + spacing) * scale;
  }
}

export function drawTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  color = COLORS.cream,
  scale = 1,
): void {
  drawText(ctx, text, Math.round(centerX - textWidth(text, scale) / 2), y, color, scale);
}

/** Texto con contorno oscuro: se lee sobre cualquier fondo. */
export function drawTextShadow(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color = COLORS.cream,
  scale = 1,
): void {
  drawText(ctx, text, x + scale, y + scale, COLORS.shadow, scale);
  drawText(ctx, text, x, y, color, scale);
}

export function drawTextCenteredShadow(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  color = COLORS.cream,
  scale = 1,
): void {
  const x = Math.round(centerX - textWidth(text, scale) / 2);
  drawTextShadow(ctx, text, x, y, color, scale);
}

const SUIT_GLYPHS: Record<Suit, string[]> = {
  espada: ['..#...', '..#...', '..#...', '.###..', '..#...', '.###..', '..#...'],
  basto: ['..##..', '.##...', '##....', '.#....', '.#....', '.#....', '.#....'],
  oro: ['.####.', '#....#', '#.##.#', '#.##.#', '#....#', '.####.', '......'],
  copa: ['#....#', '#....#', '.####.', '..##..', '..##..', '.####.', '......'],
};

const SUIT_COLORS: Record<Suit, string> = {
  espada: '#54697e',
  basto: '#93a24f',
  oro: '#f0bc35',
  copa: '#4ea8de',
};

export function drawSuit(ctx: CanvasRenderingContext2D, suit: Suit, x: number, y: number, scale = 1, color?: string): void {
  const glyph = SUIT_GLYPHS[suit];
  ctx.fillStyle = color ?? SUIT_COLORS[suit];
  for (let row = 0; row < glyph.length; row++) {
    for (let col = 0; col < 6; col++) {
      if (glyph[row][col] === '#') ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}

export const CARD_W = 44;
export const CARD_H = 60;

export const SUIT_NAMES: Record<Suit, string> = {
  espada: 'ESPADA',
  basto: 'BASTO',
  oro: 'ORO',
  copa: 'COPA',
};

/** Verde para las cartas fuertes, dorado para las medianas, rojo para las débiles. */
export function tierColor(tier: number): string {
  if (tier <= 4) return COLORS.green;
  if (tier <= 8) return COLORS.gold;
  return COLORS.red;
}

/** Rectángulo con esquinas recortadas, estilo pixel. */
export function pixelRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y, w - 4, h);
  ctx.fillRect(x, y + 2, w, h - 4);
}

/** Panel con sombra, doble borde y brillo interior. */
export function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill = COLORS.panel,
  border = COLORS.gold,
  studs = false,
): void {
  pixelRect(ctx, x + 2, y + 3, w, h, 'rgba(0,0,0,0.55)');
  pixelRect(ctx, x, y, w, h, COLORS.shadow);
  pixelRect(ctx, x + 1, y + 1, w - 2, h - 2, border);
  pixelRect(ctx, x + 2, y + 2, w - 4, h - 4, fill);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(x + 4, y + 3, w - 8, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(x + 4, y + h - 4, w - 8, 1);
  if (studs) {
    ctx.fillStyle = border;
    for (const [sx, sy] of [[x + 4, y + 4], [x + w - 6, y + 4], [x + 4, y + h - 6], [x + w - 6, y + h - 6]]) {
      ctx.fillRect(sx, sy, 2, 2);
    }
  }
}

/** Trazo redondeado reutilizable para paneles y botonesModernos del HUD. */
export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 5,
): void {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Panel con sombra suave y borde fino; se usa para menús flotantes. */
export function drawSoftPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill = 'rgba(16, 11, 18, 0.96)',
  border = 'rgba(255, 201, 60, 0.45)',
  radius = 7,
): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 9;
  ctx.shadowOffsetY = 4;
  roundedRectPath(ctx, x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1;
  ctx.strokeStyle = border;
  ctx.stroke();
  ctx.restore();
}

export interface ModernButtonStyle {
  color: string;
  textColor?: string;
  hover?: boolean;
  disabled?: boolean;
  scale?: number;
  radius?: number;
  icon?: Suit;
}

/** Botón del dock: degradado sutil, brillo superior y borde que responde al hover. */
export function drawModernButton(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  style: ModernButtonStyle,
): void {
  const disabled = style.disabled ?? false;
  const color = disabled ? '#2a2630' : style.color;
  const gradient = ctx.createLinearGradient(0, y, 0, y + h);
  gradient.addColorStop(0, shadeColor(color, disabled ? -0.05 : 0.2));
  gradient.addColorStop(0.55, color);
  gradient.addColorStop(1, shadeColor(color, disabled ? -0.28 : -0.3));
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, style.radius ?? 5);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.lineWidth = style.hover && !disabled ? 2 : 1;
  ctx.strokeStyle = style.hover && !disabled ? COLORS.cream : shadeColor(color, -0.62);
  ctx.stroke();
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fillRect(x + 1, y + 1, w - 2, Math.max(2, Math.floor(h / 3)));
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.fillRect(x + 1, y + h - 3, w - 2, 2);
  ctx.restore();

  const scale = style.scale ?? 1;
  const text = label;
  const iconW = style.icon ? 9 : 0;
  const textW = textWidth(text, scale);
  const startX = Math.round(x + (w - textW - iconW) / 2);
  if (style.icon) {
    drawSuit(ctx, style.icon, startX, y + Math.floor((h - 7) / 2), 1, disabled ? COLORS.gray : COLORS.ink);
  }
  drawTextShadow(
    ctx,
    text,
    startX + iconW,
    y + Math.floor((h - 7 * scale) / 2),
    disabled ? COLORS.gray : style.textColor ?? COLORS.cream,
    scale,
  );
}

export interface ButtonStyle {
  color?: string;
  textColor?: string;
  scale?: number;
  hover?: boolean;
  disabled?: boolean;
}

export function drawButton(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  style: ButtonStyle = {},
): void {
  const disabled = style.disabled ?? false;
  const hover = style.hover ?? false;
  const color = disabled ? '#2a2630' : style.color ?? COLORS.panelLight;
  const border = hover ? COLORS.cream : COLORS.shadow;
  // Botón arcade: sombra dura, borde negro de 2 px, brillo arriba y bisel abajo.
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(x + 3, y + 4, w, h);
  ctx.fillStyle = border;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fillRect(x + 2, y + 2, w - 4, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.fillRect(x + 2, y + h - 5, w - 4, 3);
  if (hover && !disabled) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x + 4, y + 5, w - 8, h - 10);
  }
  drawTextCenteredShadow(
    ctx,
    label,
    x + w / 2,
    y + Math.floor((h - 7 * (style.scale ?? 1)) / 2),
    disabled ? COLORS.gray : style.textColor ?? COLORS.cream,
    style.scale ?? 1,
  );
}

/** Etiqueta pequeña tipo credencial. */
export function drawBadge(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, color: string): number {
  const w = textWidth(label) + 8;
  drawPanel(ctx, x, y, w, 11, color, COLORS.shadow);
  drawText(ctx, label, x + 4, y + 2, COLORS.cream);
  return w;
}

export function drawScoreBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  value: number,
  target: number,
  color: string,
): void {
  ctx.fillStyle = COLORS.shadow;
  ctx.fillRect(x, y, w, 4);
  const filled = Math.round(Math.min(1, value / target) * w);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, filled, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 7; i < w; i += 8) ctx.fillRect(x + i, y, 1, 4);
}

export function drawCard(
  ctx: CanvasRenderingContext2D,
  card: Card,
  x: number,
  y: number,
  highlight = false,
  lift = 0,
  keyHint?: number,
  strengthTier?: number,
): void {
  const suitColor = SUIT_COLORS[card.suit];
  const top = y - lift;
  pixelRect(ctx, x + 4, top + 5, CARD_W, CARD_H, 'rgba(0,0,0,0.5)');
  pixelRect(ctx, x, top, CARD_W, CARD_H, COLORS.shadow);
  pixelRect(ctx, x + 1, top + 1, CARD_W - 2, CARD_H - 2, highlight ? COLORS.white : COLORS.paper);

  // Filete doble del palo y brillo en el borde superior.
  ctx.fillStyle = suitColor;
  ctx.fillRect(x + 3, top + 2, CARD_W - 6, 2);
  ctx.fillRect(x + 3, top + CARD_H - 4, CARD_W - 6, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(x + 2, top + 4, 1, CARD_H - 8);
  ctx.fillRect(x + CARD_W - 3, top + 4, 1, CARD_H - 8);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillRect(x + 4, top + 4, CARD_W - 8, 1);

  // Reflejo diagonal suave.
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 12; i++) ctx.fillRect(x + 4 + i, top + 8 + i, CARD_W - 8 - i * 2, 1);

  const rankText = String(card.rank);
  const rankScale = rankText.length > 1 ? 2 : 3;
  const inkColor = shadeColor(suitColor, -0.32);
  drawText(ctx, rankText, x + 5, top + 6, 'rgba(0,0,0,0.12)', rankScale, 0);
  drawText(ctx, rankText, x + 4, top + 5, inkColor, rankScale, 0);

  const suitX = x + (CARD_W - 18) / 2;
  drawSuit(ctx, card.suit, suitX + 1, top + 23, 3, 'rgba(0,0,0,0.25)');
  drawSuit(ctx, card.suit, suitX, top + 22, 3);
  // Palitos secundarios y brillo: la carta se siente dibujada, no solo tipeada.
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  for (const [dx, dy] of [[9, 34], [32, 34], [9, 43], [32, 43]]) ctx.fillRect(x + dx, top + dy, 3, 3);
  ctx.fillStyle = suitColor;
  for (const [dx, dy] of [[9, 33], [32, 33], [9, 42], [32, 42]]) ctx.fillRect(x + dx, top + dy, 3, 3);
  drawSuit(ctx, card.suit, x + CARD_W - 12, top + CARD_H - 15, 1, inkColor);
  if (highlight) {
    const shimmer = Math.floor(performance.now() / 220) % 5;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(x + 6 + shimmer * 6, top + 5, 2, CARD_H - 10);
  }
  drawText(ctx, SUIT_NAMES[card.suit], x + 4, top + 47, 'rgba(0,0,0,0.12)', 1, 0);
  drawText(ctx, SUIT_NAMES[card.suit], x + 3, top + 46, inkColor, 1, 0);

  // Barra de fuerza segmentada.
  const tier = strengthTier ?? 14;
  const segments = Math.max(1, Math.round((14 - tier) / 13 * 10));
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x + 4, top + 55, CARD_W - 8, 3);
  ctx.fillStyle = tierColor(tier);
  const segW = (CARD_W - 10) / 10;
  for (let s = 0; s < segments; s++) ctx.fillRect(x + 5 + s * segW, top + 55, segW - 1, 3);

  if (keyHint !== undefined) {
    drawPanel(ctx, x + CARD_W - 11, top + 2, 9, 11, COLORS.goldDark, COLORS.shadow);
    drawText(ctx, String(keyHint + 1), x + CARD_W - 9, top + 4, COLORS.gold);
  }

  if (highlight) {
    ctx.fillStyle = COLORS.gold;
    for (const [dx, dy] of [[1, 1], [CARD_W - 3, 1], [1, CARD_H - 3], [CARD_W - 3, CARD_H - 3]]) {
      ctx.fillRect(x + dx, top + dy, 2, 2);
    }
    ctx.fillStyle = 'rgba(255,209,102,0.35)';
    ctx.fillRect(x + 2, top + 2, CARD_W - 4, 1);
    ctx.fillRect(x + 2, top + CARD_H - 3, CARD_W - 4, 1);
  }
}

export function drawCardBack(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  pixelRect(ctx, x + 4, y + 5, CARD_W, CARD_H, 'rgba(0,0,0,0.5)');
  pixelRect(ctx, x, y, CARD_W, CARD_H, COLORS.shadow);
  pixelRect(ctx, x + 1, y + 1, CARD_W - 2, CARD_H - 2, COLORS.goldDark);
  pixelRect(ctx, x + 2, y + 2, CARD_W - 4, CARD_H - 4, COLORS.redDark);
  pixelRect(ctx, x + 5, y + 5, CARD_W - 10, CARD_H - 10, COLORS.cream);
  ctx.fillStyle = COLORS.red;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 5; col++) {
      const size = (row + col) % 2 === 0 ? 3 : 2;
      ctx.fillRect(x + 8 + col * 6, y + 8 + row * 5, size, size);
    }
  }
  ctx.fillStyle = COLORS.goldDark;
  ctx.fillRect(x + 15, y + 24, 14, 12);
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(x + 16, y + 25, 12, 10);
  drawSuit(ctx, 'espada', x + 19, y + 27, 1, COLORS.redDark);
}

const RIVAL_SPRITE = [
  '............',
  '...222222...',
  '..22222222..',
  '..21111112..',
  '..11311311..',
  '..11111111..',
  '..11777711..',
  '...111111...',
  '..55555555..',
  '.5555555555.',
  '.5533333355.',
  '...4..4.....',
];

const PLAYER_SPRITE = [
  '............',
  '...111111...',
  '..11111111..',
  '..11111111..',
  '..13111311..',
  '..11111111..',
  '..11111111..',
  '...111111...',
  '..66666666..',
  '.6666666666.',
  '.6677777766.',
  '...4..4.....',
];

const AVATAR_COLORS: Record<string, string> = {
  '1': '#e8b884',
  '2': '#332b3a',
  '3': '#17131c',
  '4': '#6b4a2c',
  '5': '#e8504f',
  '6': '#ffd166',
  '7': '#f497b8',
};

export function drawAvatar(ctx: CanvasRenderingContext2D, kind: 'rival' | 'player', x: number, y: number, scale = 3): void {
  const sprite = kind === 'rival' ? RIVAL_SPRITE : PLAYER_SPRITE;
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const key = sprite[row][col];
      if (key === '.') continue;
      ctx.fillStyle = AVATAR_COLORS[key] ?? COLORS.ink;
      ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}

const RIVAL_BUST = [
  '............................',
  '..........11111111..........',
  '........111111111111........',
  '.......11111111111111.......',
  '......1111111111111111......',
  '......1122222222222211......',
  '......1222222222222221......',
  '......124422222244221.......',
  '......125522222255221.......',
  '......1222222222222221......',
  '......1222333333222221......',
  '.......1222222222221........',
  '........1222222221..........',
  '.........1222221............',
  '........8888888888..........',
  '.......866666666688.........',
  '......86666666666668........',
  '.....8666666666666668.......',
  '....866666666666666668......',
  '....866776666666777668......',
  '....866666699666666668......',
  '...86666666666666666668.....',
  '...87777776666667777778.....',
  '...87777777777777777778.....',
];

const BUST_COLORS: Record<string, string> = {
  '1': '#2b2230',
  '2': '#d9a066',
  '3': '#aa6a3c',
  '4': '#fff4d6',
  '5': '#17131c',
  '6': '#c84348',
  '7': '#8f2a32',
  '8': '#f0d9b0',
  '9': '#ffd166',
};

/** Retrato del rival sentado al otro lado de la mesa. */
export function drawRivalPortrait(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 3, shirtColor = BUST_COLORS['6']): void {
  const palette: Record<string, string> = {
    ...BUST_COLORS,
    '6': shirtColor,
    '7': shadeColor(shirtColor, -0.3),
  };
  RIVAL_BUST.forEach((row, rowIndex) => {
    for (let col = 0; col < row.length; col++) {
      const color = palette[row[col]];
      if (color) ctx.fillRect(x + col * scale, y + rowIndex * scale, scale, scale);
    }
  });
}

function fillPolygon(ctx: CanvasRenderingContext2D, points: Array<[number, number]>, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

export interface RivalMood {
  thinking?: boolean;
  celebrating?: boolean;
  annoyed?: boolean;
  talking?: boolean;
}

/**
 * Rival animado y sentado al fondo: se lo ve durante toda la mano, parpadea,
 * mueve los brazos cuando canta y cambia de expresión según cómo le va.
 * Todo es pixel art procedural, sin assets externos.
 */
export function drawRivalAction(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  shirtColor = BUST_COLORS['6'],
  mood: RivalMood = {},
  variant = '',
): void {
  const s = 2;
  const px = (col: number, row: number, w: number, h: number, color: string): void => {
    ctx.fillStyle = color;
    ctx.fillRect(x + col * s, y + row * s, w * s, h * s);
  };
  const blink = Math.floor(performance.now() / 3200) % 7 === 0;
  const bob = mood.thinking ? (Math.floor(performance.now() / 400) % 2) : 0;
  const top = y + bob * s;
  const id = variant.toLowerCase();
  const skin = id.includes('bruja') ? '#b7d39b' : id.includes('pepe') ? '#e7b98d' : '#d9a066';
  const hair = id.includes('nena') ? '#5a2d1c' : id.includes('campeon') ? '#c8902f' : id.includes('bruja') ? '#6b3fa0' : id.includes('pepe') ? '#d8d2c4' : '#2b2230';
  const dark = shadeColor(shirtColor, -0.3);
  const light = shadeColor(shirtColor, 0.18);

  // Sombra y respaldo de la silla.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x + 2 * s, top + 46 * s, 36 * s, 3 * s);
  px(4, 8, 32, 34, '#3a2231');
  px(5, 9, 30, 32, '#4d2d3d');

  // Cuerpo y hombros (la camisa cambia por rival de campaña).
  px(8, 22, 24, 26, shirtColor);
  px(5, 27, 6, 19, dark);
  px(29, 27, 6, 19, dark);
  px(9, 23, 22, 3, light);
  px(18, 23, 4, 20, dark);
  px(17, 30, 6, 2, '#f0d9b0');

  // Brazos: arriba si está cantando, cruzados si piensa, apoyados si pierde.
  const armUp = mood.talking || mood.celebrating;
  px(3, armUp ? 14 : mood.annoyed ? 33 : 30, 7, 8, shirtColor);
  px(30, armUp ? 12 : mood.annoyed ? 33 : 30, 7, 8, shirtColor);
  px(2, armUp ? 10 : mood.thinking ? 29 : 37, 6, 5, skin);
  px(32, armUp ? 8 : mood.thinking ? 30 : 37, 6, 5, skin);
  if (mood.thinking) {
    px(6, 25, 5, 5, skin); // mano a la barba
    px(30, 25, 5, 5, skin);
  }

  // Cabeza, pelo y orejas.
  px(12, 3, 16, 19, hair);
  px(13, 6, 14, 14, skin);
  px(11, 9, 2, 5, skin);
  px(27, 9, 2, 5, skin);
  px(12, 3, 16, 4, hair);
  px(10, 5, 4, 7, hair);
  px(26, 5, 4, 7, hair);

  // Cejas y ojos: cambios mínimos de expresión se leen muy bien en pixel art.
  const brow = mood.annoyed ? 1 : 0;
  px(15, 10 + brow, 4, 1, hair);
  px(21, 10 - brow, 4, 1, hair);
  if (blink) {
    px(16, 12, 2, 1, hair);
    px(22, 12, 2, 1, hair);
  } else {
    px(16, 12, 2, 2, '#17131c');
    px(22, 12, 2, 2, '#17131c');
    px(16, 12, 1, 1, '#fff4d6');
    px(22, 12, 1, 1, '#fff4d6');
  }
  // Rasgos propios de cada rival de campaña.
  if (id.includes('nena')) {
    px(10, 2, 20, 3, '#e8504f'); // moño / vincha
    px(8, 4, 4, 6, '#e8504f');
    px(28, 4, 4, 6, '#e8504f');
    px(15, 15, 2, 1, '#f497b8');
    px(23, 15, 2, 1, '#f497b8');
  } else if (id.includes('pepe')) {
    px(14, 16, 12, 2, '#d8d2c4'); // bigote
    px(17, 15, 6, 1, '#d8d2c4');
    px(11, 1, 18, 2, '#6b4a2c'); // gorra
    px(10, 3, 20, 2, '#6b4a2c');
  } else if (id.includes('bruja')) {
    px(8, 2, 24, 3, '#4a2a63'); // ala del sombrero
    px(12, -3, 16, 6, '#4a2a63');
    px(15, -6, 10, 4, '#4a2a63');
    px(24, -4, 2, 2, '#ffd166');
    px(16, 15, 2, 1, '#b7d39b');
    px(22, 15, 2, 1, '#b7d39b');
  } else if (id.includes('campeon')) {
    px(12, 1, 16, 3, '#f0d9b0'); // corona
    px(12, 0, 2, 3, '#ffd166');
    px(19, -2, 2, 4, '#ffd166');
    px(26, 0, 2, 3, '#ffd166');
    px(15, 12, 4, 1, '#17131c'); // anteojos
    px(21, 12, 4, 1, '#17131c');
    px(19, 12, 2, 1, '#17131c');
  } else if (id.includes('carlos')) {
    px(14, 16, 12, 2, '#332b3a'); // bigote oscuro
    px(11, 2, 18, 2, '#332b3a');
  }

  // Nariz y boca.
  px(19, 13, 2, 3, '#aa6a3c');
  if (mood.celebrating) {
    px(17, 17, 6, 1, '#5c1e24');
    px(18, 18, 4, 2, '#fff4d6');
  } else if (mood.annoyed) {
    px(17, 18, 6, 1, '#5c1e24');
    px(18, 17, 4, 1, '#5c1e24');
  } else if (mood.talking) {
    px(18, 17, 4, 3, '#5c1e24');
    px(19, 18, 2, 1, '#fff4d6');
  } else {
    px(18, 17, 5, 1, '#8f4a3c');
  }
  if (mood.thinking) px(24, 15, 2, 4, '#aa6a3c'); // mechón al pensar

  // Cartelito con el nombre del rival en la misma tipografía bitmap del juego.
  const label = name.toUpperCase().slice(0, 12);
  const tw = textWidth(label);
  ctx.fillStyle = 'rgba(10,7,14,0.9)';
  ctx.fillRect(x + 18 * s - tw / 2 - 3, top - 13, tw + 6, 10);
  drawTextShadow(ctx, label, x + 18 * s - tw / 2, top - 12, '#ffd166');
}

/**
 * Fondo en primera persona: pared cálida, rival al fondo, mesa en perspectiva
 * con fieltro texturizado, moldura de madera y brazos apoyados. Se dibuja una sola vez.
 */
export function makeGameTable(width: number, height: number, shirtColor = BUST_COLORS['6']): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Pared con paneles y foco sobre el rival.
  ctx.fillStyle = '#050405';
  ctx.fillRect(0, 0, width, height);
  for (let x = 0; x < width; x += 32) {
    ctx.fillStyle = '#100b0d';
    ctx.fillRect(x + 1, 0, 30, 62);
    ctx.fillStyle = 'rgba(255, 209, 102, 0.05)';
    ctx.fillRect(x, 0, 1, 62);
  }
  const lamp = ctx.createRadialGradient(width / 2, 18, 4, width / 2, 18, 150);
  lamp.addColorStop(0, 'rgba(255, 205, 130, 0.26)');
  lamp.addColorStop(0.6, 'rgba(255, 180, 105, 0.06)');
  lamp.addColorStop(1, 'rgba(255, 180, 105, 0)');
  ctx.fillStyle = lamp;
  ctx.fillRect(0, 0, width, 90);

  // Sombra del rival proyectada en la pared.
  fillPolygon(ctx, [[198, 8], [282, 8], [300, 70], [180, 70]], 'rgba(0,0,0,0.28)');
  drawRivalPortrait(ctx, Math.round((width - 84) / 2), 0, 3, shirtColor);

  const topY = 56;
  const feltPath = (): void => {
    ctx.beginPath();
    ctx.moveTo(164, topY + 8);
    ctx.lineTo(316, topY + 8);
    ctx.lineTo(width - 42, height - 16);
    ctx.lineTo(42, height - 16);
    ctx.closePath();
  };

  // Estructura de la mesa: borde, madera, fieltro.
  fillPolygon(ctx, [[146, topY - 2], [334, topY - 2], [width - 2, height], [2, height]], '#000000');
  fillPolygon(ctx, [[150, topY], [330, topY], [width - 8, height - 4], [8, height - 4]], '#3a1e12');
  fillPolygon(ctx, [[154, topY + 3], [326, topY + 3], [width - 18, height - 10], [18, height - 10]], '#5a3520');
  fillPolygon(ctx, [[158, topY + 5], [322, topY + 5], [width - 32, height - 13], [32, height - 13]], '#0a251f');

  ctx.save();
  feltPath();
  ctx.clip();
  const felt = ctx.createLinearGradient(0, topY, 0, height);
  felt.addColorStop(0, '#0f4234');
  felt.addColorStop(0.45, '#185c45');
  felt.addColorStop(1, '#082a20');
  ctx.fillStyle = felt;
  ctx.fillRect(0, topY, width, height - topY);
  const sheen = ctx.createRadialGradient(width / 2, 150, 8, width / 2, 150, 210);
  sheen.addColorStop(0, 'rgba(255,255,255,0.07)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, topY, width, height - topY);

  // Textura fina de fieltro.
  for (let y = topY + 8; y < height - 14; y += 3) {
    for (let x = 40; x < width - 40; x += 3) {
      const noise = (x * 13 + y * 29 + ((x * y) % 17)) % 19;
      if (noise === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.055)';
        ctx.fillRect(x, y, 1, 1);
      } else if (noise === 9) {
        ctx.fillStyle = 'rgba(0,0,0,0.055)';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Escudo central muy tenue.
  ctx.globalAlpha = 0.08;
  drawSuit(ctx, 'espada', width / 2 - 18, 128, 6, '#ffd166');
  drawSuit(ctx, 'copa', width / 2 - 18, 164, 6, '#ffd166');
  ctx.globalAlpha = 1;
  ctx.restore();

  // Costuras en las cuatro orillas del fieltro.
  ctx.fillStyle = '#79cfa2';
  for (let i = 1; i < 24; i++) {
    const t = i / 24;
    const y = Math.round(topY + 8 + (height - 16 - topY - 8) * t);
    const left = Math.round(164 + (42 - 164) * t);
    const right = Math.round(316 + (width - 42 - 316) * t);
    ctx.fillRect(left + 1, y, 5, 1);
    ctx.fillRect(right - 6, y, 5, 1);
  }
  ctx.fillStyle = '#a8e5c1';
  for (let x = 172; x < 310; x += 8) ctx.fillRect(x, topY + 9, 4, 1);
  for (let x = 60; x < width - 60; x += 10) ctx.fillRect(x, height - 18, 5, 1);

  // Brazos del rival sobre el fieltro, con puños y dedos.
  fillPolygon(ctx, [[206, 48], [184, 55], [126, 92], [140, 101], [212, 63]], shirtColor);
  fillPolygon(ctx, [[206, 50], [186, 58], [134, 94], [141, 98], [207, 62]], shadeColor(shirtColor, -0.3));
  fillPolygon(ctx, [[274, 48], [296, 55], [354, 92], [340, 101], [268, 63]], shirtColor);
  fillPolygon(ctx, [[274, 50], [294, 58], [346, 94], [339, 98], [273, 62]], shadeColor(shirtColor, -0.3));
  for (const hx of [120, 340]) {
    ctx.fillStyle = '#aa6a3c';
    ctx.fillRect(hx, 88, 20, 12);
    ctx.fillStyle = '#d9a066';
    ctx.fillRect(hx + 2, 86, 16, 10);
    ctx.fillStyle = '#b87a45';
    for (let f = 0; f < 3; f++) ctx.fillRect(hx + 4 + f * 5, 94, 3, 4);
  }

  // Moldura cercana de madera con tachuelas doradas.
  ctx.fillStyle = '#1a0f0a';
  ctx.fillRect(0, height - 13, width, 13);
  ctx.fillStyle = '#6b4227';
  ctx.fillRect(0, height - 12, width, 8);
  ctx.fillStyle = '#a06a3a';
  ctx.fillRect(0, height - 12, width, 2);
  ctx.fillStyle = '#3b2414';
  for (let x = 12; x < width - 12; x += 20) ctx.fillRect(x, height - 7, 10, 1);
  for (let x = 16; x < width; x += 56) {
    ctx.fillStyle = COLORS.goldDark;
    ctx.fillRect(x, height - 10, 4, 4);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x + 1, height - 9, 2, 2);
  }

  // Viñeta suave con degradado en vez de franjas.
  const vignette = ctx.createRadialGradient(width / 2, 150, 90, width / 2, 150, 300);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(4,3,8,0.42)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, topY, width, height - topY);
  return canvas;
}

/** Mesa de fieltro dibujada una sola vez en un canvas offscreen (menús). */
export function makeTable(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = COLORS.woodDark;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = COLORS.wood;
  ctx.fillRect(2, 2, width - 4, height - 4);
  ctx.fillStyle = COLORS.woodLight;
  ctx.fillRect(3, 3, width - 6, 2);
  ctx.fillRect(3, height - 5, width - 6, 2);
  ctx.fillStyle = '#241609';
  for (let x = 8; x < width - 8; x += 12) {
    ctx.fillRect(x, 5, 5, 1);
    ctx.fillRect(x + 3, height - 6, 5, 1);
  }

  const inset = 9;
  ctx.fillStyle = '#071e16';
  ctx.fillRect(inset - 3, inset - 3, width - inset * 2 + 6, height - inset * 2 + 6);
  ctx.fillStyle = COLORS.feltDark;
  ctx.fillRect(inset - 1, inset - 1, width - inset * 2 + 2, height - inset * 2 + 2);
  ctx.fillStyle = COLORS.felt;
  ctx.fillRect(inset, inset, width - inset * 2, height - inset * 2);

  // Textura de fieltro con ruido determinístico.
  for (let y = inset; y < height - inset; y += 2) {
    for (let x = inset; x < width - inset; x += 2) {
      const noise = (x * 17 + y * 31 + ((x * y) % 13)) % 13;
      if (noise === 0) {
        ctx.fillStyle = COLORS.feltLight;
        ctx.fillRect(x, y, 2, 1);
      } else if (noise === 7) {
        ctx.fillStyle = COLORS.feltDark;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Costura interior y viñeta escalonada.
  ctx.fillStyle = '#5bbf91';
  for (let x = inset + 8; x < width - inset - 8; x += 8) {
    ctx.fillRect(x, inset + 4, 3, 1);
    ctx.fillRect(x, height - inset - 5, 3, 1);
  }
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = `rgba(4, 20, 13, ${0.04 + i * 0.012})`;
    ctx.fillRect(inset + i * 2, inset + i * 2, width - (inset + i * 2) * 2, 1);
    ctx.fillRect(inset + i * 2, height - inset - i * 2 - 1, width - (inset + i * 2) * 2, 1);
  }

  // Escudo central tenue con los cuatro palos.
  ctx.globalAlpha = 0.08;
  drawSuit(ctx, 'espada', width / 2 - 21, height / 2 - 26, 7);
  drawSuit(ctx, 'copa', width / 2 - 21, height / 2 + 9, 7);
  ctx.globalAlpha = 1;

  // Tachuelas doradas en las esquinas.
  for (const [x, y] of [[6, 6], [width - 10, 6], [6, height - 10], [width - 10, height - 10]]) {
    ctx.fillStyle = COLORS.goldDark;
    ctx.fillRect(x, y, 4, 4);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x + 1, y + 1, 2, 2);
  }
  return canvas;
}

/** Destello de 4 puntas para pantallas de victoria. */
export function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, scale = 1): void {
  ctx.fillStyle = color;
  ctx.fillRect(x - 1 * scale, y - 4 * scale, 2 * scale, 8 * scale);
  ctx.fillRect(x - 4 * scale, y - 1 * scale, 8 * scale, 2 * scale);
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(x - scale, y - scale, 2 * scale, 2 * scale);
}
