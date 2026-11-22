import type { Card, Suit } from '../core/types';

export const COLORS = {
  wood: '#3b2618',
  woodLight: '#7a4f2c',
  woodDark: '#1e130d',
  felt: '#1c6b50',
  feltDark: '#104333',
  feltLight: '#2f8e69',
  cream: '#fff4d6',
  paper: '#fffdf4',
  ink: '#171220',
  red: '#e8504f',
  redDark: '#8f2a32',
  gold: '#ffd166',
  goldDark: '#a9782b',
  blue: '#4ea8de',
  green: '#5fd39b',
  gray: '#a6a0b0',
  white: '#ffffff',
  shadow: '#0a0710',
  panel: '#2a2038',
  panelLight: '#453354',
  pink: '#f497b8',
  navy: '#1b2a44',
};

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
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
};

const ACCENTS: Record<string, string> = {
  Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ñ: 'N',
  á: 'A', é: 'E', í: 'I', ó: 'O', ú: 'U', ñ: 'N',
  '¿': '?', '¡': '!',
};

export function normalizeText(text: string): string {
  return text.split('').map((ch) => ACCENTS[ch] ?? ch).join('').toUpperCase();
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

export function drawSuit(ctx: CanvasRenderingContext2D, suit: Suit, x: number, y: number, scale = 1): void {
  const glyph = SUIT_GLYPHS[suit];
  ctx.fillStyle = SUIT_COLORS[suit];
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
  const color = disabled ? '#3a3543' : style.color ?? COLORS.panelLight;
  drawPanel(ctx, x, y, w, h, color, hover ? COLORS.gold : COLORS.shadow);
  if (hover && !disabled) {
    ctx.fillStyle = 'rgba(255,209,102,0.12)';
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
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
  pixelRect(ctx, x + 3, top + 4, CARD_W, CARD_H, 'rgba(0,0,0,0.55)');
  pixelRect(ctx, x, top, CARD_W, CARD_H, COLORS.shadow);
  pixelRect(ctx, x + 1, top + 1, CARD_W - 2, CARD_H - 2, highlight ? COLORS.white : COLORS.paper);
  ctx.fillStyle = suitColor;
  ctx.fillRect(x + 3, top + 2, CARD_W - 6, 1);
  ctx.fillRect(x + 3, top + CARD_H - 3, CARD_W - 6, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(x + 2, top + 3, 1, CARD_H - 6);
  ctx.fillRect(x + CARD_W - 3, top + 3, 1, CARD_H - 6);

  // Número grande: 1 dígito a escala 3 y los dobles a escala 2.
  const rankText = String(card.rank);
  drawText(ctx, rankText, x + 4, top + 5, suitColor, rankText.length > 1 ? 2 : 3, 0);
  // Símbolo grande y nombre del palo: la carta se entiende sin tooltip.
  drawSuit(ctx, card.suit, x + (CARD_W - 18) / 2, top + 22, 3);
  drawText(ctx, SUIT_NAMES[card.suit], x + 3, top + 46, suitColor, 1, 0);

  // Barra de fuerza: cuantos más segmentos, más fuerte es la carta.
  const tier = strengthTier ?? 14;
  const segments = Math.max(1, Math.round((14 - tier) / 13 * 10));
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x + 4, top + 55, CARD_W - 8, 2);
  ctx.fillStyle = tierColor(tier);
  ctx.fillRect(x + 4, top + 55, segments * ((CARD_W - 8) / 10), 2);

  if (keyHint !== undefined) {
    drawPanel(ctx, x + CARD_W - 10, top + 2, 8, 10, COLORS.goldDark, COLORS.shadow);
    drawText(ctx, String(keyHint + 1), x + CARD_W - 8, top + 3, COLORS.gold);
  }

  if (highlight) {
    ctx.fillStyle = COLORS.gold;
    for (const [dx, dy] of [[1, 1], [CARD_W - 3, 1], [1, CARD_H - 3], [CARD_W - 3, CARD_H - 3]]) {
      ctx.fillRect(x + dx, top + dy, 2, 2);
    }
    ctx.fillStyle = 'rgba(255,209,102,0.28)';
    ctx.fillRect(x + 2, top + 2, CARD_W - 4, 1);
  }
}

export function drawCardBack(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  pixelRect(ctx, x + 3, y + 4, CARD_W, CARD_H, 'rgba(0,0,0,0.55)');
  pixelRect(ctx, x, y, CARD_W, CARD_H, COLORS.shadow);
  pixelRect(ctx, x + 1, y + 1, CARD_W - 2, CARD_H - 2, COLORS.redDark);
  pixelRect(ctx, x + 3, y + 3, CARD_W - 6, CARD_H - 6, COLORS.cream);
  ctx.fillStyle = COLORS.red;
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 6; col++) {
      const size = (row + col) % 2 === 0 ? 3 : 2;
      ctx.fillRect(x + 6 + col * 6, y + 6 + row * 5, size, size);
    }
  }
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(x + 17, y + 25, 10, 4);
  ctx.fillRect(x + 19, y + 23, 6, 1);
  ctx.fillRect(x + 19, y + 29, 6, 1);
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
  '........................',
  '........111111..........',
  '.......1111111111.......',
  '......111111111111......',
  '......122222222221......',
  '......122222222221......',
  '......12322222321.......',
  '......122222222221......',
  '......122222222221......',
  '.......122222221........',
  '........1222221.........',
  '.........12221..........',
  '........4444444444......',
  '.......444444444444.....',
  '......44444444444444....',
  '.....4444444444444444...',
  '....444444444444444444..',
  '....445544444444554444..',
  '....444444444444444444..',
  '...44444444444444444444.',
];

const BUST_COLORS: Record<string, string> = {
  '1': '#2b2230',
  '2': '#d9a066',
  '3': '#17131c',
  '4': '#b23a3f',
  '5': '#7d2a30',
};

/** Retrato del rival sentado al otro lado de la mesa. */
export function drawRivalPortrait(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 3): void {
  RIVAL_BUST.forEach((row, rowIndex) => {
    for (let col = 0; col < row.length; col++) {
      const color = BUST_COLORS[row[col]];
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

/**
 * Fondo en primera persona: pared, rival al fondo, mesa en perspectiva y brazos
 * apoyados sobre el fieltro. Se dibuja una sola vez.
 */
export function makeGameTable(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Pared oscura con foco cálido sobre el rival.
  ctx.fillStyle = '#171018';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#241922';
  ctx.fillRect(0, 0, width, 60);
  const glow = ctx.createRadialGradient(width / 2, 26, 6, width / 2, 26, 170);
  glow.addColorStop(0, 'rgba(255, 196, 120, 0.20)');
  glow.addColorStop(1, 'rgba(255, 196, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, 80);
  for (let x = 12; x < width; x += 24) {
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(x, 0, 1, 58);
  }

  // El rival queda detrás del borde alto de la mesa.
  drawRivalPortrait(ctx, Math.round((width - 72) / 2), 2, 3);

  // Mesa en perspectiva: borde lejano corto, borde cercano ancho.
  const topY = 56;
  fillPolygon(ctx, [[150, topY], [330, topY], [width - 6, height], [6, height]], '#0b2a20');
  fillPolygon(ctx, [[158, topY + 4], [322, topY + 4], [width - 26, height - 8], [26, height - 8]], COLORS.feltDark);
  fillPolygon(ctx, [[164, topY + 8], [316, topY + 8], [width - 40, height - 14], [40, height - 14]], COLORS.felt);

  // Costuras siguiendo la perspectiva.
  ctx.fillStyle = '#5bbf91';
  for (let i = 0; i <= 22; i++) {
    const t = i / 22;
    const leftX = Math.round(164 + (40 - 164) * t);
    const rightX = Math.round(316 + (width - 40 - 316) * t);
    const y = Math.round(topY + 8 + (height - 14 - topY - 8) * t);
    ctx.fillRect(leftX + 2, y, 4, 1);
    ctx.fillRect(rightX - 6, y, 4, 1);
  }

  // Escudo tenue en el centro del fieltro.
  ctx.globalAlpha = 0.07;
  drawSuit(ctx, 'espada', width / 2 - 21, 138, 7);
  drawSuit(ctx, 'copa', width / 2 - 21, 170, 7);
  ctx.globalAlpha = 1;

  // Brazos del rival apoyados sobre la mesa.
  fillPolygon(ctx, [[204, 46], [180, 54], [126, 94], [142, 102], [210, 62]], '#b23a3f');
  fillPolygon(ctx, [[276, 46], [300, 54], [354, 94], [338, 102], [270, 62]], '#b23a3f');
  ctx.fillStyle = '#d9a066';
  ctx.fillRect(126, 90, 16, 8);
  ctx.fillRect(338, 90, 16, 8);

  // Borde de madera del lado del jugador.
  ctx.fillStyle = COLORS.woodDark;
  ctx.fillRect(0, height - 8, width, 8);
  ctx.fillStyle = COLORS.woodLight;
  ctx.fillRect(0, height - 8, width, 2);
  for (let x = 10; x < width - 10; x += 18) {
    ctx.fillStyle = '#241609';
    ctx.fillRect(x, height - 5, 8, 1);
  }

  // Viñeta suave en las esquinas.
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = `rgba(6, 4, 10, ${0.03 + i * 0.012})`;
    ctx.fillRect(i * 3, topY + i * 3, width - i * 6, 1);
    ctx.fillRect(i * 3, height - 12 - i * 3, width - i * 6, 1);
  }
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
