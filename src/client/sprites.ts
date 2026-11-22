import type { Card, Suit } from '../core/types';

export const COLORS = {
  wood: '#3b2618',
  woodLight: '#6b4426',
  woodDark: '#24170f',
  felt: '#1f6b4f',
  feltDark: '#14513c',
  feltLight: '#2c8462',
  cream: '#fff3d6',
  paper: '#fffdf2',
  ink: '#1b1520',
  red: '#e45756',
  redDark: '#8e2f31',
  gold: '#ffd166',
  blue: '#4ea8de',
  green: '#57cc99',
  gray: '#a6a0b0',
  white: '#ffffff',
  shadow: '#0d0a12',
  panel: '#241b30',
  panelLight: '#3a2c4a',
  pink: '#f497b8',
};

/** Tipografía bitmap 5x7: mucho más legible que la de 3x5. */
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

const SUIT_GLYPHS: Record<Suit, string[]> = {
  espada: ['..#...', '..#...', '..#...', '.###..', '..#...', '.###..', '..#...'],
  basto: ['..##..', '.##...', '##....', '.#....', '.#....', '.#....', '.#....'],
  oro: ['.####.', '#....#', '#.##.#', '#.##.#', '#....#', '.####.', '......'],
  copa: ['#....#', '#....#', '.####.', '..##..', '..##..', '.####.', '......'],
};

const SUIT_COLORS: Record<Suit, string> = {
  espada: '#5c6f82',
  basto: '#8a9a4b',
  oro: '#e2ad2b',
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

export const CARD_W = 30;
export const CARD_H = 42;

/** Panel con esquinas recortadas, estilo pixel. */
export function pixelRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y, w - 4, h);
  ctx.fillRect(x, y + 2, w, h - 4);
}

export function drawCard(ctx: CanvasRenderingContext2D, card: Card, x: number, y: number, highlight = false): void {
  const suitColor = SUIT_COLORS[card.suit];
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  pixelRect(ctx, x + 3, y + 3, CARD_W, CARD_H, 'rgba(0,0,0,0.45)');
  pixelRect(ctx, x, y, CARD_W, CARD_H, COLORS.ink);
  pixelRect(ctx, x + 1, y + 1, CARD_W - 2, CARD_H - 2, highlight ? COLORS.white : COLORS.paper);
  ctx.fillStyle = suitColor;
  ctx.fillRect(x + 3, y + 2, CARD_W - 6, 1);
  ctx.fillRect(x + 3, y + CARD_H - 3, CARD_W - 6, 1);

  drawText(ctx, String(card.rank), x + 3, y + 4, suitColor, 2, 0);
  drawSuit(ctx, card.suit, x + CARD_W - 9, y + 5, 1);
  drawSuit(ctx, card.suit, x + (CARD_W - 12) / 2, y + 18, 2);
  drawSuit(ctx, card.suit, x + 3, y + CARD_H - 9, 1);
  drawText(ctx, String(card.rank), x + CARD_W - 10, y + CARD_H - 9, suitColor, 1, 0);
  if (highlight) {
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x + 1, y + 1, 2, 2);
    ctx.fillRect(x + CARD_W - 3, y + 1, 2, 2);
    ctx.fillRect(x + 1, y + CARD_H - 3, 2, 2);
    ctx.fillRect(x + CARD_W - 3, y + CARD_H - 3, 2, 2);
  }
}

export function drawCardBack(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  pixelRect(ctx, x + 3, y + 3, CARD_W, CARD_H, 'rgba(0,0,0,0.45)');
  pixelRect(ctx, x, y, CARD_W, CARD_H, COLORS.ink);
  pixelRect(ctx, x + 1, y + 1, CARD_W - 2, CARD_H - 2, COLORS.redDark);
  pixelRect(ctx, x + 3, y + 3, CARD_W - 6, CARD_H - 6, COLORS.cream);
  ctx.fillStyle = COLORS.red;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      const size = (row + col) % 2 === 0 ? 3 : 2;
      ctx.fillRect(x + 5 + col * 5, y + 6 + row * 5, size, size);
    }
  }
}

const RIVAL_SPRITE = [
  '............',
  '...222222...',
  '..22222222..',
  '..21111112..',
  '..11311311..',
  '..11111111..',
  '..11444411..',
  '...111111...',
  '..55555555..',
  '.5555555555.',
  '.5555555555.',
  '............',
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
  '.6666666666.',
  '............',
];

const AVATAR_COLORS: Record<string, string> = {
  '1': '#e8b884',
  '2': '#332b3a',
  '3': '#16131b',
  '4': '#8a4632',
  '5': '#e45756',
  '6': '#ffd166',
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

/** Mesa de fieltro dibujada una sola vez en un canvas offscreen. */
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

  const inset = 10;
  ctx.fillStyle = COLORS.feltDark;
  ctx.fillRect(inset - 2, inset - 2, width - inset * 2 + 4, height - inset * 2 + 4);
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

  // Viñeta escalonada y costura interior.
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = `rgba(6, 24, 16, ${0.05 + i * 0.015})`;
    ctx.fillRect(inset + i * 2, inset + i * 2, width - (inset + i * 2) * 2, 1);
    ctx.fillRect(inset + i * 2, height - inset - i * 2 - 1, width - (inset + i * 2) * 2, 1);
  }
  ctx.fillStyle = '#3d9a72';
  for (let x = inset + 8; x < width - inset - 8; x += 8) {
    ctx.fillRect(x, inset + 5, 3, 1);
    ctx.fillRect(x, height - inset - 6, 3, 1);
  }

  // Escudo central tenue.
  ctx.globalAlpha = 0.12;
  drawSuit(ctx, 'espada', width / 2 - 9, height / 2 - 12, 3);
  drawSuit(ctx, 'copa', width / 2 - 9, height / 2 + 2, 3);
  ctx.globalAlpha = 1;

  ctx.fillStyle = COLORS.gold;
  for (const [x, y] of [[6, 6], [width - 10, 6], [6, height - 10], [width - 10, height - 10]]) {
    ctx.fillRect(x, y, 4, 4);
    ctx.fillStyle = COLORS.woodLight;
    ctx.fillRect(x + 1, y + 1, 2, 2);
    ctx.fillStyle = COLORS.gold;
  }
  return canvas;
}
