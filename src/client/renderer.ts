import type { Difficulty } from '../core/ai';
import { cardLabel, cardStrength, envidoCallValue, envidoDecline, envidoScore, envidoWordCount, strengthTier, trucoPoints } from '../core/hand';
import { isStoryUnlocked, STORY_OPPONENTS, type StoryOpponent } from '../core/story';
import { namesForViewer, other, type Card, type GameAction, type GameState, type PlayerIndex, type Suit } from '../core/types';
import {
  CARD_H,
  CARD_W,
  COLORS,
  drawAvatar,
  drawBadge,
  drawButton,
  drawCard,
  drawModernButton,
  drawPanel,
  drawSoftPanel,
  roundedRectPath,
  drawSparkle,
  drawSuit,
  drawText,
  drawRivalPortrait,
  drawRivalAction,
  drawTextCentered,
  drawTextCenteredShadow,
  drawTextShadow,
  makeGameTable,
  makeTable,
  shadeColor,
  textWidth,
  tierColor,
} from './sprites';

export interface HitBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GameView {
  human: PlayerIndex;
  mode: 'local' | 'online' | 'story';
  legal: GameAction[];
  notice: string;
  /** id del elemento bajo el cursor, o null. */
  hover: string | null;
  /** Rival de campaña, cuando la partida es del modo historia. */
  opponent?: StoryOpponent;
  /** Estado del sonido, para mostrar el interruptor en pantalla. */
  sound?: boolean;
  /** Frase temporaria del rival de campaña. */
  taunt?: string;
  /** Aviso persistente cuando el rival online se desconecta. */
  disconnected?: boolean;
  /** El submenú de cantos de envido está abierto. */
  envidoOpen?: boolean;
}

/** Entrada de código de sala dibujada en el canvas (sin prompt del navegador). */
export interface JoinInput {
  active: boolean;
  value: string;
}

interface ActionDef {
  type: GameAction['type'];
  label: string;
  color: string;
  text: string;
  hint: string;
}

interface DockSlot {
  id: string;
  label: string;
  color: string;
  text: string;
  icon?: Suit;
  width: number;
  action?: GameAction['type'];
  openEnvido?: boolean;
}

/** Sólo cantos: "quiero" y "no quiero" ya están en el dock, no van en el submenú. */
const ENVIDO_ORDER: GameAction['type'][] = [
  'callEnvido', 'callEnvidoEnvido', 'callRealEnvido', 'callFalta',
];

const DIFFICULTIES: Difficulty[] = ['facil', 'medio', 'dificil'];

const HELP_PAGES: Array<{ title: string; left: string[]; right: string[] }> = [
  {
    title: 'JERARQUIA DE CARTAS',
    left: [
      'DE LA MAS FUERTE A LA MAS DEBIL',
      '1 ESPADA',
      '1 BASTO',
      '7 ESPADA',
      '7 ORO',
      '3',
      '2',
      '1 ORO Y 1 COPA',
      '12 - 11 - 10',
    ],
    right: [
      '7 COPA Y 7 BASTO',
      '6 - 5 - 4',
      '',
      'LAS CARTAS DEL MISMO RENGLON EMPATAN',
      'LA BARRA DE LA CARTA INDICA FUERZA',
      'VERDE = FUERTE / DORADO = MEDIA',
      'ROJO = DEBIL',
      'EJEMPLO: 3 GANA A 2 Y A 1 DE ORO',
      'PERO PIERDE CON 7 DE ESPADA',
    ],
  },
  {
    title: 'RONDAS Y PUNTOS',
    left: [
      'GANA QUIEN TOMA 2 DE 3 RONDAS',
      'LA CARTA MAYOR GANA LA RONDA',
      'PARDAS: NADIE GANA ESA RONDA',
      'PARDA 1: DECIDE LA SEGUNDA',
      'PARDA 2: GANA QUIEN GANÓ LA 1',
      'PARDA 3: VUELVE A LA PRIMERA',
      'TRES PARDAS: GANA EL MANO',
      '',
      'EL TRACKER R1/R2/R3 MUESTRA',
      'QUIEN GANO CADA RONDA',
    ],
    right: [
      'VALOR DE LA MANO',
      'SIN CANTO: 1 PUNTO',
      'TRUCO 2 / RETRUCO 3 / VALE 4',
      'RECHAZO: 1 / 2 / 3 PUNTOS',
      'IRSE AL MAZO RINDE LA MANO',
      'ANTES DEL ENVIDO SUMA 1 MAS',
      '',
      'AL TERMINAR LA MANO,',
      'TOCÁ SIGUIENTE MANO O ENTER',
      'NO AVANZA LA IA SOLA',
    ],
  },
  {
    title: 'ENVIDO',
    left: [
      '20 + LAS 2 CARTAS DEL MISMO PALO',
      'LOS 10, 11 Y 12 VALEN 0',
      'EJEMPLO: 7 ORO + 6 ORO = 33',
      'SIN PAREJA VALE LA CARTA MAYOR',
      '',
      'CADA PALABRA ENVIDO SUMA 2',
      'ENVIDO +2  /  ENVIDO ENVIDO +4',
      'REAL ENVIDO +3  /  FALTA = SALDO',
      'TRAS ENVIDO ENVIDO: REAL O FALTA',
      'NO INICIES SI YA TIRASTE CARTA',
      'NI DESPUES DE QUERER EL TRUCO',
    ],
    right: [
      'NO QUIERO = LO YA ACEPTADO',
      'PRIMER CANTO RECHAZADO = 1',
      'REAL DIRECTO RECHAZADO = 1',
      'ENV + ENV RECHAZADO = 2',
      'REAL + ENV RECHAZADO = 3',
      'REAL: ENVIDO, REAL O FALTA',
      'FALTA: LO QUE LE FALTA AL LIDER',
      'EMPATADOS A 0: VALEN 15',
      'TE CANTAN ENVIDO Y YA TIRASTE?',
      'PODES CONTESTAR IGUAL',
      'EMPATE DE TANTOS: GANA EL MANO',
      'LOS TANTOS SE VEN AL FINAL',
    ],
  },
  {
    title: 'TRUCO Y ATAJOS',
    left: [
      'TRUCO 2 / RETRUCO 3 / VALE 4',
      'QUIERO = ACEPTO ESE VALOR',
      'NO QUIERO = EL OTRO SUMA',
      'RECHAZO: 1 / 2 / 3 PUNTOS',
      '',
      'QUIEN RECIBIÓ EL CANTO PUEDE',
      'SUBIR INCLUSO DESPUES DE QUIERO',
      'ENVIDO VA PRIMERO SI TE LO',
      'PIDEN ANTES DE TIRAR UNA CARTA',
    ],
    right: [
      'TECLAS RAPIDAS',
      '1 / 2 / 3  JUGAR CARTA',
      'E ENVIDO - D DOBLE - R REAL',
      'F FALTA - T TRUCO - S SUBIR',
      'Q QUIERO - N NO QUIERO - M MAZO',
      'ENTER SIGUIENTE MANO',
      '',
      'H AYUDA - ESC MENU',
      'FLECHAS CAMBIAN DE PAGINA',
      'ACÁ NO SE JUEGA CON FLOR',
    ],
  },
];

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…` : text;
}

function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function rightText(ctx: CanvasRenderingContext2D, text: string, right: number, y: number, color: string, scale = 1): void {
  drawText(ctx, text, right - textWidth(text, scale), y, color, scale);
}

const SUIT_LETTERS: Record<Card['suit'], string> = { espada: 'E', basto: 'B', oro: 'O', copa: 'C' };

/** "7 de espada" -> "7E": entra en el historial sin perder el palo. */
function shortCard(card: Card): string {
  return `${card.rank}${SUIT_LETTERS[card.suit]}`;
}

/** "Jugador 1 juega 7 de espada" -> "J1 → 7E": historial corto pero claro. */
function logEntry(line: string, human: PlayerIndex): string {
  const shown = namesForViewer(line, human);
  const play = shown.match(/^(.*?) juega (.+?) de (espada|basto|oro|copa)$/i);
  if (play) {
    const who = play[1].replace(/^Vos$/, 'VOS').replace(/^Rival$/, 'RIVAL').replace(/^Jugador [12]$/, 'RIVAL');
    return `${who} → ${play[2]}${SUIT_LETTERS[play[3].toLowerCase() as Card['suit']]}`;
  }
  return shown;
}

function tierName(tier: number): string {
  if (tier <= 1) return 'LA CARTA MAS ALTA';
  if (tier <= 4) return 'MUY FUERTE';
  if (tier <= 8) return 'FUERTE';
  if (tier <= 11) return 'MEDIA';
  if (tier <= 13) return 'DEBIL';
  return 'LA CARTA MAS BAJA';
}

function tierShort(tier: number): string {
  if (tier <= 1) return 'MAS ALTA';
  if (tier <= 4) return 'MUY FUERTE';
  if (tier <= 8) return 'FUERTE';
  if (tier <= 11) return 'MEDIA';
  if (tier <= 13) return 'DEBIL';
  return 'MAS BAJA';
}

function actionDefs(state: GameState, human: PlayerIndex): Partial<Record<GameAction['type'], ActionDef>> {
  const p = state.pending;
  const nextTruco = p?.kind === 'truco' ? Math.min(3, p.level + 1) : Math.min(3, (state.trucoLevel || 0) + 1);
  // La falta siempre se calcula desde el marcador; no hereda el valor del canto previo.
  const falta = envidoCallValue('falta', state.scores, state.targetScore);
  const rejectEnvido = p?.kind === 'envido' ? envidoDecline(p.bids) : 1;
  const mazoEnvido = state.played.flat().every((card) => card === null) && state.envidoStatus === 'open' ? 1 : 0;
  const foldValue = trucoPoints(state.trucoLevel) + mazoEnvido;

  return {
    callTruco: {
      type: 'callTruco', label: 'TRUCO x2', color: COLORS.red, text: COLORS.white,
      hint: 'Truco por 2 puntos. Si lo rechazan, ganás 1.',
    },
    raiseTruco: {
      type: 'raiseTruco',
      label: nextTruco === 2 ? `RETRUCO x${trucoPoints(2)}` : `VALE 4 x${trucoPoints(3)}`,
      color: COLORS.redDark, text: COLORS.white,
      hint: nextTruco === 2 ? 'Subí a 3 puntos. Rechazo = 2 para vos.' : 'Subí a 4 puntos. Rechazo = 3 para vos.',
    },
    acceptTruco: {
      type: 'acceptTruco', label: `QUIERO x${p?.kind === 'truco' ? trucoPoints(p.level) : trucoPoints(state.trucoLevel)}`,
      color: COLORS.green, text: COLORS.shadow, hint: 'Aceptás el valor y seguís jugando.',
    },
    declineTruco: {
      type: 'declineTruco', label: `NO (DA ${p?.kind === 'truco' ? p.level : 1})`,
      color: '#9e1f28', text: COLORS.white, hint: 'No aceptás: el rival se lleva esos puntos y cierra la mano.',
    },
    callEnvido: {
      type: 'callEnvido',
      label: p?.kind === 'envido' ? `ENVIDO +2 (VA ${p.potAfter + 2})` : 'ENVIDO +2',
      color: '#d99a15', text: COLORS.shadow,
      hint: p?.kind === 'envido'
        ? `Aceptás el canto anterior y subís 2: la bolsa queda en ${p.potAfter + 2}.`
        : 'Sumás 2 a los tantos en juego. Se paga al cerrar la mano.',
    },
    callRealEnvido: {
      type: 'callRealEnvido',
      label: p?.kind === 'envido' ? `REAL ENVIDO +3 (VA ${p.potAfter + 3})` : 'REAL ENVIDO +3',
      color: '#e0a91e', text: COLORS.shadow,
      hint: p?.kind === 'envido'
        ? `Aceptás lo cantado y subís 3: la bolsa queda en ${p.potAfter + 3}.`
        : 'Sumás 3 a los tantos en juego. Podés seguir con envido, real o falta.',
    },
    callEnvidoEnvido: {
      type: 'callEnvidoEnvido', label: `ENVIDO ENVIDO +${p?.kind === 'envido' ? p.potAfter + 2 : 4}`, color: '#ffc93c', text: COLORS.shadow,
      hint: 'Contestás "envido" al envido: sumás 2 y la bolsa queda en 4. Si no lo quieren, ganás 2.',
    },
    callFalta: {
      type: 'callFalta', label: `FALTA ENVIDO +${falta}`, color: '#d06a1a', text: COLORS.shadow,
      hint: `Cantás ${falta}: lo que le falta a quien va ganando para ${state.targetScore}. Reemplaza la bolsa; rechazo = ${rejectEnvido} para vos.`,
    },
    acceptEnvido: {
      type: 'acceptEnvido', label: `QUIERO x${p?.kind === 'envido' ? p.potAfter : 2}`,
      color: COLORS.green, text: COLORS.shadow,
      hint: p?.kind === 'envido'
        ? `Aceptás toda la cadena: se juega por ${p.potAfter} tantos. Se decide al cerrar la mano.`
        : 'Aceptás el envido por 2 tantos. Se decide al cerrar la mano.',
    },
    declineEnvido: {
      type: 'declineEnvido', label: `NO (DA ${rejectEnvido})`,
      color: '#9e1f28', text: COLORS.white,
      hint: `No aceptás el último canto: quien lo cantó suma ${rejectEnvido} y la mano sigue.`,
    },
    fold: {
      type: 'fold', label: `MAZO (RIVAL +${foldValue})`, color: '#3d8bd8', text: COLORS.white,
      hint: mazoEnvido
        ? 'Te rendís antes de cerrar el envido: rival suma truco + 1 y cierra la mano.'
        : 'Te rendís. El rival se lleva el truco vigente y cierra la mano.',
    },
    nextHand: {
      type: 'nextHand', label: 'SIGUIENTE MANO', color: COLORS.green, text: COLORS.shadow,
      hint: 'Reparten de nuevo. Alterna quien arranca.',
    },
    restart: {
      type: 'restart', label: 'NUEVA PARTIDA', color: COLORS.green, text: COLORS.shadow,
      hint: 'Volvés a 0 - 0.',
    },
  };
}

export class Renderer {
  private readonly table: HTMLCanvasElement;
  private readonly defaultGameTable: HTMLCanvasElement;
  private readonly storyTables = new Map<string, HTMLCanvasElement>();
  private lastRound = 0;
  private lastHandNumber = 0;
  private roundFlash: { text: string; until: number } | null = null;

  constructor(private readonly ctx: CanvasRenderingContext2D, private readonly width: number, private readonly height: number) {
    this.table = makeTable(width, height);
    this.defaultGameTable = makeGameTable(width, height);
  }

  private get time(): number {
    return performance.now() / 1000;
  }

  clear(): void {
    this.ctx.drawImage(this.table, 0, 0);
  }

  private clearGame(shirtColor?: string): void {
    let table = this.defaultGameTable;
    if (shirtColor) {
      const cached = this.storyTables.get(shirtColor);
      if (cached) table = cached;
      else {
        table = makeGameTable(this.width, this.height, shirtColor);
        this.storyTables.set(shirtColor, table);
      }
    }
    this.ctx.drawImage(table, 0, 0);
  }

  private scaledCard(card: Card, x: number, y: number, scale: number, highlight = false, lift = 0, keyHint?: number, tier?: number): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);
    drawCard(this.ctx, card, 0, 0, highlight, lift, keyHint, tier);
    this.ctx.restore();
  }

  private handCard(card: Card, x: number, y: number, angle: number, highlight: boolean, keyHint: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x + CARD_W / 2, y + CARD_H / 2);
    ctx.rotate(angle);
    drawCard(ctx, card, -CARD_W / 2, -CARD_H / 2, highlight, 0, keyHint, strengthTier(card));
    ctx.restore();
  }

  private dim(alpha: number, fromY = 0): void {
    this.ctx.fillStyle = `rgba(8, 5, 13, ${alpha})`;
    this.ctx.fillRect(0, fromY, this.width, this.height - fromY);
  }

  private panel(x: number, y: number, w: number, h: number, fill = COLORS.panel, border = COLORS.gold, studs = false): void {
    drawPanel(this.ctx, x, y, w, h, fill, border, studs);
  }

  private button(
    id: string,
    label: string,
    x: number,
    y: number,
    w: number,
    h: number,
    color = COLORS.panelLight,
    textColor = COLORS.cream,
    scale = 1,
    hovered = false,
  ): HitBox {
    drawButton(this.ctx, label, x, y, w, h, { color, textColor, scale, hover: hovered });
    return { id, x, y, w, h };
  }

  private drawDockSlot(slot: DockSlot, x: number, y: number, h: number, hovered: boolean): HitBox {
    const ctx = this.ctx;
    drawModernButton(ctx, slot.label, x, y, slot.width, h, {
      color: slot.color,
      textColor: slot.text,
      icon: slot.icon,
      hover: hovered,
      scale: 2,
    });
    if (slot.openEnvido) {
      ctx.fillStyle = hovered ? COLORS.cream : COLORS.gold;
      ctx.beginPath();
      ctx.moveTo(x + slot.width - 15, y + 6);
      ctx.lineTo(x + slot.width - 7, y + 6);
      ctx.lineTo(x + slot.width - 11, y + 10);
      ctx.closePath();
      ctx.fill();
    }
    return { id: slot.id, x, y, w: slot.width, h };
  }

  private drawActionDock(
    state: GameState,
    view: GameView,
    defs: Partial<Record<GameAction['type'], ActionDef>>,
    available: Set<GameAction['type']>,
  ): { hits: HitBox[]; slots: DockSlot[] } {
    const ctx = this.ctx;
    const W = this.width;
    const dockY = 160;
    const dockH = 40;
    const buttonY = dockY + 6;
    const buttonH = 28;
    const gaps = 6;

    drawSoftPanel(ctx, 8, dockY, W - 16, dockH, 'rgba(9, 7, 12, 0.94)', 'rgba(255, 201, 60, 0.28)', 8);
    ctx.fillStyle = 'rgba(255, 201, 60, 0.28)';
    ctx.fillRect(20, dockY + 1, W - 40, 1);

    const slots: DockSlot[] = [];
    const add = (
      type: GameAction['type'],
      label: string,
      width: number,
      icon?: Suit,
    ): void => {
      const def = defs[type];
      if (!def || !available.has(type)) return;
      slots.push({ id: `action:${type}`, label, color: def.color, text: def.text, width, icon, action: type });
    };

    if (state.phase === 'handEnd' || state.phase === 'gameEnd') {
      const type = state.phase === 'handEnd' ? 'nextHand' : 'restart';
      const def = defs[type];
      if (def) {
        slots.push({
          id: `action:${type}`, label: def.label, color: def.color, text: def.text, width: 224, action: type,
        });
      }
    } else if (state.pending?.kind === 'envido') {
      add('acceptEnvido', 'QUIERO', 110);
      add('declineEnvido', 'NO QUIERO', 118);
      if (ENVIDO_ORDER.some((type) => available.has(type))) {
        slots.push({
          id: 'ui:envido', label: 'ENVIDO', color: COLORS.gold, text: COLORS.ink,
          width: 124, icon: 'oro', openEnvido: true,
        });
      }
      add('fold', 'MAZO', 88, 'basto');
    } else if (state.pending?.kind === 'truco') {
      add('acceptTruco', 'QUIERO', 110);
      add('declineTruco', 'NO QUIERO', 118);
      if (available.has('raiseTruco')) add('raiseTruco', defs.raiseTruco?.label ?? 'SUBIR', 124, 'espada');
      else if (available.has('callTruco')) add('callTruco', defs.callTruco?.label ?? 'TRUCO', 124, 'espada');
      add('fold', 'MAZO', 88, 'basto');
    } else {
      if (available.has('callTruco')) add('callTruco', defs.callTruco?.label ?? 'TRUCO', 116, 'espada');
      else if (available.has('raiseTruco')) add('raiseTruco', defs.raiseTruco?.label ?? 'SUBIR', 116, 'espada');
      if (ENVIDO_ORDER.some((type) => available.has(type))) {
        slots.push({
          id: 'ui:envido', label: 'ENVIDO', color: COLORS.gold, text: COLORS.ink,
          width: 126, icon: 'oro', openEnvido: true,
        });
      }
      add('fold', 'MAZO', 88, 'basto');
    }

    if (slots.length === 0) {
      drawTextCentered(ctx, state.pending ? 'ESPERANDO RESPUESTA...' : 'TURNO DEL RIVAL...',
        W / 2, buttonY + 9, COLORS.gray);
    }

    const total = slots.reduce((sum, slot) => sum + slot.width, 0) + Math.max(0, slots.length - 1) * gaps;
    let x = Math.round((W - total) / 2);
    const hits: HitBox[] = [];
    slots.forEach((slot) => {
      hits.push(this.drawDockSlot(slot, x, buttonY, buttonH, view.hover === slot.id));
      x += slot.width + gaps;
    });
    return { hits, slots };
  }

  private drawEnvidoMenu(
    state: GameState,
    view: GameView,
    defs: Partial<Record<GameAction['type'], ActionDef>>,
    available: Set<GameAction['type']>,
    human: PlayerIndex,
  ): HitBox[] {
    const ctx = this.ctx;
    const rows = ENVIDO_ORDER.filter((type) => available.has(type) && defs[type]);
    if (rows.length === 0) return [];

    const x = 104;
    const w = this.width - 208;
    const y = 8;
    const titleH = 20;
    const rowH = 18;
    const footerH = 14;
    const h = titleH + rows.length * rowH + footerH;
    const hits: HitBox[] = [];

    drawSoftPanel(ctx, x, y, w, h, 'rgba(11, 8, 14, 0.98)', 'rgba(255, 201, 60, 0.62)', 8);
    ctx.fillStyle = 'rgba(255, 201, 60, 0.12)';
    ctx.fillRect(x + 1, y + 1, w - 2, titleH - 1);
    drawText(ctx, 'CANTOS DE ENVIDO', x + 12, y + 6, COLORS.gold);
    rightText(ctx, `TU ENV ${envidoScore(state.hands[human]).points}`, x + w - 36, y + 6, COLORS.pink);

    const closeId = 'ui:envido:close';
    drawSoftPanel(ctx, x + w - 25, y + 3, 16, 14, 'rgba(0, 0, 0, 0.35)', 'rgba(255, 247, 230, 0.35)', 4);
    drawTextCentered(ctx, 'X', x + w - 17, y + 6, COLORS.cream);
    hits.push({ id: closeId, x: x + w - 25, y: y + 3, w: 16, h: 14 });

    let hoveredType: GameAction['type'] | undefined;
    rows.forEach((type, i) => {
      const def = defs[type]!;
      const ry = y + titleH + 2 + i * rowH;
      const id = `action:${type}`;
      const isHovered = view.hover === id;
      if (isHovered) hoveredType = type;
      roundedRectPath(ctx, x + 8, ry, w - 16, rowH - 2, 4);
      ctx.fillStyle = isHovered ? 'rgba(255, 201, 60, 0.18)' : 'rgba(255, 255, 255, 0.04)';
      ctx.fill();
      ctx.fillStyle = def.color;
      ctx.fillRect(x + 8, ry + 1, 3, rowH - 4);
      drawSuit(ctx, 'oro', x + 18, ry + 5, 1, def.color);
      drawText(ctx, def.label, x + 32, ry + 5, COLORS.cream);
      hits.push({ id, x: x + 8, y: ry, w: w - 16, h: rowH - 2 });
    });

    const footerY = y + titleH + rows.length * rowH + 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(x + 8, footerY, w - 16, footerH - 2);
    const hint = hoveredType ? defs[hoveredType]?.hint ?? '' : 'TOCA UN CANTO O LA X PARA CERRAR';
    drawText(ctx, clip(hint, Math.floor((w - 32) / 6)), x + 16, footerY + 3, COLORS.gray);

    // Punta del globo, alineada con el botón ENVIDO del dock.
    ctx.fillStyle = 'rgba(11, 8, 14, 0.98)';
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 7, y + h - 1);
    ctx.lineTo(x + w / 2 + 7, y + h - 1);
    ctx.lineTo(x + w / 2, y + h + 7);
    ctx.closePath();
    ctx.fill();
    return hits;
  }

  drawMenu(difficulty: Difficulty, hover: string | null = null, sound = true): HitBox[] {
    this.clear();
    const ctx = this.ctx;
    const W = this.width;
    this.dim(0.74);

    drawCard(ctx, { id: 'deco-1', rank: 1, suit: 'espada' }, 12, 112, false, 0, undefined, 1);
    drawCard(ctx, { id: 'deco-2', rank: 7, suit: 'oro' }, W - CARD_W - 12, 112, false, 0, undefined, 4);

    drawTextCenteredShadow(ctx, 'FALTA ENVIDO', W / 2, 16, COLORS.gold, 4);
    drawTextCenteredShadow(ctx, 'Y TRUCOOO', W / 2, 52, COLORS.cream, 4);
    drawTextCentered(ctx, 'TRUCO ARGENTINO - PARTIDA A 15 PUNTOS', W / 2, 88, COLORS.gray);

    const hits: HitBox[] = [];
    hits.push(this.button('menu:story', 'MODO HISTORIA', 70, 100, W - 140, 30, COLORS.goldDark, COLORS.ink, 2, hover === 'menu:story'));
    hits.push(this.button('menu:local', '1 JUGADOR - VS IA', 70, 134, W - 140, 28, COLORS.red, COLORS.white, 2, hover === 'menu:local'));
    hits.push(this.button('menu:online', 'MULTIJUGADOR ONLINE', 70, 166, W - 140, 28, COLORS.green, COLORS.shadow, 2, hover === 'menu:online'));

    drawTextCentered(ctx, 'DIFICULTAD DE LA IA (PARTIDA RÁPIDA)', W / 2, 200, COLORS.gold);
    const labels: Record<Difficulty, string> = { facil: 'FACIL', medio: 'MEDIO', dificil: 'DIFICIL' };
    DIFFICULTIES.forEach((level, i) => {
      const id = `diff:${level}`;
      const selected = level === difficulty;
      hits.push(
        this.button(
          id,
          labels[level],
          62 + i * 122,
          212,
          112,
          20,
          selected ? COLORS.gold : COLORS.panelLight,
          selected ? COLORS.ink : COLORS.cream,
          1,
          hover === id,
        ),
      );
    });
    hits.push(this.button('menu:sound', sound ? 'SONIDO ON' : 'SONIDO OFF', 62, 240, 118, 18, sound ? '#245c45' : COLORS.panelLight, COLORS.cream, 1, hover === 'menu:sound'));
    hits.push(this.button('menu:help', 'COMO JUGAR  [H]', 180, 240, 120, 18, COLORS.navy, COLORS.gold, 1, hover === 'menu:help'));
    drawTextCentered(ctx, 'HISTORIA CON 5 RIVALES - AYUDA CON H', W / 2, 262, COLORS.gray);
    return hits;
  }

  drawStoryMap(progress: number, selected: number, hover: string | null): HitBox[] {
    this.clear();
    const ctx = this.ctx;
    const W = this.width;
    this.dim(0.84);
    this.panel(14, 6, W - 28, 258, COLORS.panel, COLORS.gold, true);

    drawTextCenteredShadow(ctx, 'MODO HISTORIA', W / 2, 14, COLORS.gold, 3);
    const complete = progress >= STORY_OPPONENTS.length;
    drawTextCentered(
      ctx,
      complete ? 'CAMPAÑA COMPLETA - GANASTE A TODOS' : 'GANÁ PARA DESBLOQUEAR AL SIGUIENTE',
      W / 2,
      36,
      complete ? COLORS.green : COLORS.gray,
    );

    const hits: HitBox[] = [];
    STORY_OPPONENTS.forEach((opponent, index) => {
      const y = 48 + index * 32;
      const unlocked = isStoryUnlocked(progress, index);
      const done = index < progress;
      const active = index === selected;
      const id = `story:select:${index}`;
      hits.push(this.button(id, '', 28, y, W - 56, 28, active ? COLORS.goldDark : COLORS.panelLight, COLORS.cream, 1, hover === id));

      drawText(ctx, String(index + 1), 36, y + 8, active ? COLORS.gold : COLORS.gray, 2);
      drawText(ctx, unlocked ? opponent.name : '?????', 62, y + 6, unlocked ? COLORS.cream : COLORS.gray);
      drawText(ctx, opponent.difficulty.toUpperCase(), 152, y + 6, unlocked ? COLORS.pink : COLORS.gray);
      drawText(ctx, unlocked ? clip(opponent.title, 24) : 'CAPITULO BLOQUEADO', 222, y + 6, unlocked ? COLORS.gray : COLORS.redDark);
      if (done) drawText(ctx, 'HECHO', W - 74, y + 6, COLORS.green);
      else if (!unlocked) drawText(ctx, 'BLOQ', W - 74, y + 6, COLORS.red);
    });

    drawTextCentered(ctx, `PROGRESO ${Math.min(progress, STORY_OPPONENTS.length)} / ${STORY_OPPONENTS.length}`, W / 2, 214, COLORS.gold);
    hits.push(this.button('story:play', 'JUGAR CAPITULO', 42, 228, 190, 26, COLORS.red, COLORS.white, 1, hover === 'story:play'));
    hits.push(this.button('story:back', 'VOLVER AL MENU', 248, 228, 190, 26, COLORS.navy, COLORS.gold, 1, hover === 'story:back'));
    return hits;
  }

  drawStoryIntro(opponent: StoryOpponent, index: number, hover: string | null): HitBox[] {
    this.clear();
    const ctx = this.ctx;
    const W = this.width;
    this.dim(0.88);
    this.panel(12, 6, W - 24, 258, COLORS.panel, COLORS.gold, true);

    drawText(ctx, `CAPITULO ${index + 1} / ${STORY_OPPONENTS.length}`, 26, 14, COLORS.gold);
    rightText(ctx, opponent.difficulty.toUpperCase(), W - 26, 14, COLORS.pink);

    drawRivalPortrait(ctx, Math.round((W - 112) / 2), 30, 4, opponent.color);
    drawTextCenteredShadow(ctx, opponent.name, W / 2, 132, COLORS.gold, 2);
    drawTextCentered(ctx, opponent.title, W / 2, 150, COLORS.cream);

    this.panel(24, 164, W - 48, 50, COLORS.woodDark, COLORS.goldDark);
    wrapText(`"${opponent.intro}"`, 66).slice(0, 3).forEach((line, i) => {
      drawText(ctx, line, 34, 171 + i * 12, COLORS.cream);
    });

    const hits: HitBox[] = [];
    hits.push(this.button('story:start', 'A JUGAR', 42, 222, 180, 30, COLORS.red, COLORS.white, 2, hover === 'story:start'));
    hits.push(this.button('story:map', 'ELEGIR OTRO', 258, 222, 180, 30, COLORS.navy, COLORS.gold, 1, hover === 'story:map'));
    return hits;
  }

  drawStoryResult(
    opponent: StoryOpponent,
    index: number,
    won: boolean,
    progress: number,
    hover: string | null,
  ): HitBox[] {
    this.clear();
    const ctx = this.ctx;
    const W = this.width;
    this.dim(0.9);
    this.panel(12, 6, W - 24, 258, COLORS.panel, COLORS.gold, true);

    const champion = won && index === STORY_OPPONENTS.length - 1;
    drawTextCenteredShadow(
      ctx,
      champion ? 'CAMPEON DEL TRUCO' : won ? 'VICTORIA' : 'DERROTA',
      W / 2,
      14,
      won ? COLORS.gold : COLORS.red,
      3,
    );
    drawTextCentered(ctx, `CAPITULO ${index + 1} - ${opponent.name}`, W / 2, 40, COLORS.cream);

    drawRivalPortrait(ctx, Math.round((W - 84) / 2), 56, 3, opponent.color);
    if (champion) {
      for (let i = 0; i < 12; i++) {
        drawSparkle(ctx, 60 + ((i * 73 + Math.floor(this.time * 21)) % 360), 56 + ((i * 41) % 60), i % 2 ? COLORS.gold : COLORS.pink);
      }
    }

    this.panel(24, 138, W - 48, 48, COLORS.woodDark, COLORS.goldDark);
    const dialogue = won ? opponent.win : opponent.lose;
    wrapText(dialogue, 64).slice(0, 3).forEach((line, i) => {
      drawText(ctx, line, 34, 145 + i * 12, COLORS.cream);
    });

    drawTextCentered(
      ctx,
      `PROGRESO ${Math.min(progress, STORY_OPPONENTS.length)} / ${STORY_OPPONENTS.length}`,
      W / 2,
      196,
      COLORS.gold,
    );

    const hits: HitBox[] = [];
    if (won && !champion) {
      hits.push(this.button('story:next', 'SIGUIENTE CAPITULO', 42, 216, 200, 30, COLORS.green, COLORS.shadow, 1, hover === 'story:next'));
      hits.push(this.button('story:map', 'VER MAPA', 254, 216, 184, 30, COLORS.navy, COLORS.gold, 1, hover === 'story:map'));
    } else if (!won) {
      hits.push(this.button('story:retry', 'REINTENTAR', 42, 216, 200, 30, COLORS.red, COLORS.white, 1, hover === 'story:retry'));
      hits.push(this.button('story:map', 'VER MAPA', 254, 216, 184, 30, COLORS.navy, COLORS.gold, 1, hover === 'story:map'));
    } else {
      hits.push(this.button('story:map', 'VOLVER AL MAPA', 140, 216, 200, 30, COLORS.gold, COLORS.ink, 1, hover === 'story:map'));
    }
    return hits;
  }

  drawOnline(
    info: { code: string; status: string; connected: boolean },
    hover: string | null = null,
    input: JoinInput = { active: false, value: '' },
  ): HitBox[] {
    this.clear();
    const ctx = this.ctx;
    const W = this.width;
    this.dim(0.82);
    this.panel(26, 18, W - 52, 234, COLORS.panel, COLORS.gold, true);

    drawTextCenteredShadow(ctx, 'MULTIJUGADOR', W / 2, 28, COLORS.gold, 2);
    const hits: HitBox[] = [];
    if (input.active) {
      drawTextCentered(ctx, 'ESCRIBÍ EL CODIGO DE LA SALA', W / 2, 52, COLORS.cream);
      this.panel(96, 64, W - 192, 54, COLORS.woodDark, COLORS.gold, true);
      const value = input.value.padEnd(6, '_').slice(0, 6);
      drawTextCenteredShadow(ctx, value, W / 2, 73, COLORS.gold, 4);
      drawTextCentered(ctx, 'ESCRIBÍ 6 LETRAS Y PULSÁ UNIRME', W / 2, 108, COLORS.gray);
      hits.push(this.button('online:joinConfirm', 'UNIRME', 62, 132, 170, 30, COLORS.red, COLORS.white, 2, hover === 'online:joinConfirm'));
      hits.push(this.button('online:joinCancel', 'CANCELAR', 248, 132, 170, 30, COLORS.navy, COLORS.gold, 1, hover === 'online:joinCancel'));
      drawTextCentered(ctx, 'SOLO LETRAS - 6 CARACTERES', W / 2, 184, COLORS.gray);
    } else if (!info.code) {
      drawTextCentered(ctx, 'CREÁ UNA SALA Y PASALE EL CODIGO', W / 2, 56, COLORS.cream);
      hits.push(this.button('online:create', 'CREAR SALA', 50, 82, 180, 34, COLORS.green, COLORS.shadow, 2, hover === 'online:create'));
      hits.push(this.button('online:join', 'UNIRME', 250, 82, 180, 34, COLORS.red, COLORS.white, 2, hover === 'online:join'));
      drawTextCentered(ctx, 'DOS JUGADORES - UNA SOLA PARTIDA', W / 2, 142, COLORS.gray);
      drawTextCentered(ctx, 'EL CODIGO TIENE 6 LETRAS', W / 2, 158, COLORS.gray);
      drawTextCentered(ctx, 'PARTIDA SEGURA: NADIE HACE TRAMPA', W / 2, 174, COLORS.gray);
    } else {
      drawTextCentered(ctx, 'CODIGO DE SALA', W / 2, 50, COLORS.gray);
      this.panel(150, 62, 180, 42, COLORS.woodDark, COLORS.gold, true);
      drawTextCenteredShadow(ctx, info.code, W / 2, 69, COLORS.gold, 4);
      drawTextCentered(
        ctx,
        info.connected ? 'RIVAL CONECTADO - A JUGAR' : 'ESPERANDO AL RIVAL...',
        W / 2,
        116,
        info.connected ? COLORS.green : COLORS.cream,
      );
      hits.push(this.button('online:copy', 'COPIAR INVITACION', 50, 146, 180, 28, COLORS.panelLight, COLORS.cream, 1, hover === 'online:copy'));
      hits.push(this.button('online:back', 'VOLVER AL MENU', 250, 146, 180, 28, COLORS.redDark, COLORS.white, 1, hover === 'online:back'));
    }
    drawTextCentered(ctx, clip(info.status, 58), W / 2, 224, COLORS.pink);
    return hits;
  }

  drawHelp(hover: string | null, page: number): HitBox[] {
    this.clear();
    const ctx = this.ctx;
    const W = this.width;
    const current = Math.max(0, Math.min(HELP_PAGES.length - 1, page));
    const content = HELP_PAGES[current];
    this.dim(0.9);
    this.panel(12, 10, W - 24, 250, COLORS.panel, COLORS.gold, true);
    drawTextCenteredShadow(ctx, content.title, W / 2, 18, COLORS.gold, 2);
    ctx.fillStyle = COLORS.goldDark;
    ctx.fillRect(24, 36, W - 48, 1);

    content.left.forEach((line, i) => {
      if (line) drawText(ctx, line, 22, 44 + i * 12, i === 0 ? COLORS.gold : COLORS.cream);
    });
    content.right.forEach((line, i) => {
      if (line) drawText(ctx, line, 248, 44 + i * 12, i === 0 ? COLORS.gold : COLORS.cream);
    });

    drawTextCentered(ctx, `PAGINA ${current + 1} / ${HELP_PAGES.length}`, W / 2, 216, COLORS.gray);
    const hits: HitBox[] = [];
    hits.push(this.button('help:prev', '< ANT', 28, 228, 62, 20, COLORS.panelLight, COLORS.cream, 1, hover === 'help:prev'));
    hits.push(this.button('help:back', 'VOLVER', 199, 228, 82, 20, COLORS.redDark, COLORS.white, 1, hover === 'help:back'));
    hits.push(this.button('help:next', 'SIG >', 390, 228, 62, 20, COLORS.panelLight, COLORS.cream, 1, hover === 'help:next'));
    return hits;
  }

  static pageCount(): number {
    return HELP_PAGES.length;
  }

  private roundWinnerForDisplay(cardA: Card, cardB: Card): string {
    const a = cardStrength(cardA);
    const b = cardStrength(cardB);
    return a === b ? 'EMP' : a > b ? 'P1' : 'P2';
  }

  drawGame(state: GameState, view: GameView): HitBox[] {
    this.clearGame(view.opponent?.color);
    const ctx = this.ctx;
    const W = this.width;
    const human = view.human;
    const rival = other(human);
    const rivalLabel = view.opponent ? view.opponent.name : view.mode === 'local' ? 'IA' : 'RIVAL';
    const hits: HitBox[] = [];
    const hover = view.hover;
    const defs = actionDefs(state, human);

    if (state.handNumber !== this.lastHandNumber) {
      this.lastHandNumber = state.handNumber;
      this.lastRound = state.round;
      this.roundFlash = null;
    } else if (state.round > this.lastRound && state.phase === 'playing') {
      const finished = state.played[this.lastRound];
      const mine = finished?.[human];
      const theirs = finished?.[rival];
      if (mine && theirs) {
        const diff = cardStrength(mine) - cardStrength(theirs);
        this.roundFlash = {
          text: diff === 0 ? 'PARDA' : diff > 0 ? 'GANASTE LA RONDA' : 'PERDISTE LA RONDA',
          until: performance.now() + 1200,
        };
      }
    }
    this.lastRound = state.round;

    // ---------- Placas de marcador ----------
    const humanTurn = state.phase === 'playing' && (state.pending ? other(state.pending.by) === human : state.turn === human);
    const rivalTurn = state.phase === 'playing' && (state.pending ? other(state.pending.by) === rival : state.turn === rival);
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 5);
    this.panel(6, 2, 104, 28, 'rgba(18,13,10,0.94)', humanTurn ? shadeColor(COLORS.green, pulse * 0.45) : COLORS.goldDark);
    drawAvatar(ctx, 'player', 10, 6, 1);
    drawText(ctx, 'TUS TANTOS', 28, 4, COLORS.gold);
    drawText(ctx, String(state.scores[human]).padStart(2, '0'), 28, 14, COLORS.green, 2);

    this.panel(W - 110, 2, 104, 28, 'rgba(18,13,10,0.94)', rivalTurn ? shadeColor(COLORS.red, pulse * 0.45) : COLORS.goldDark);
    drawAvatar(ctx, view.mode === 'online' ? 'player' : 'rival', W - 22, 6, 1);
    drawText(ctx, clip(rivalLabel, 12), W - 104, 4, COLORS.gold);
    rightText(ctx, String(state.scores[rival]).padStart(2, '0'), W - 30, 14, COLORS.red, 2);

    drawTextCentered(ctx, `MANO ${String(state.handNumber).padStart(2, '0')}`, W / 2, 5, COLORS.cream);
    drawTextCentered(ctx, `A ${state.targetScore} PUNTOS`, W / 2, 17, COLORS.gray);

    let bx = 184;
    if (state.trucoLevel > 0) bx += drawBadge(ctx, `TRUCO ${trucoPoints(state.trucoLevel)}`, bx, 30, COLORS.redDark) + 5;
    if (state.envidoPot > 0) bx += drawBadge(ctx, `ENV ${state.envidoPot}`, bx, 30, COLORS.gold) + 5;
    if (state.envidoResult) drawBadge(ctx, `ENV ${state.envidoResult.prize}`, bx, 30, COLORS.goldDark);

    // Tres puntos con borde: verde ganaste, rojo perdió, dorado empató.
    for (let r = 0; r < 3; r++) {
      const round = state.played[r];
      let color = COLORS.panelLight;
      const winner = round[0] && round[1] ? this.roundWinnerForDisplay(round[0], round[1]) : null;
      if (winner) {
        color = winner === 'EMP' ? COLORS.goldDark : (winner === 'P1') === (human === 0) ? COLORS.green : COLORS.red;
      }
      ctx.fillStyle = COLORS.shadow;
      ctx.fillRect(229 + r * 10, 44, 9, 9);
      ctx.fillStyle = color;
      ctx.fillRect(230 + r * 10, 45, 7, 7);
      if (winner) {
        const won = (winner === 'P1') === (human === 0);
        drawTextCentered(ctx, winner === 'EMP' ? '=' : won ? 'G' : 'P', 233.5 + r * 10, 46, COLORS.ink);
      }
    }
    hits.push({ id: 'game:rounds', x: 226, y: 41, w: 37, h: 15 });

    hits.push({ id: 'game:help', x: 8, y: 32, w: 16, h: 16 });
    this.panel(8, 32, 16, 16, hover === 'game:help' ? COLORS.red : COLORS.panel, COLORS.gold);
    drawTextCentered(ctx, '?', 16, 36, COLORS.gold);
    hits.push({ id: 'game:sound', x: 26, y: 32, w: 16, h: 16 });
    this.panel(26, 32, 16, 16, hover === 'game:sound' ? COLORS.red : COLORS.panel, COLORS.gold);
    drawTextCentered(ctx, view.sound === false ? 'x' : 'S', 34, 36, view.sound === false ? COLORS.gray : COLORS.green);
    hits.push({ id: 'game:menu', x: W - 24, y: 32, w: 16, h: 16 });
    this.panel(W - 24, 32, 16, 16, hover === 'game:menu' ? COLORS.redDark : COLORS.panel, COLORS.gold);
    drawTextCentered(ctx, 'X', W - 16, 36, COLORS.cream);

    // Aviso de ronda: se dibuja antes que las cartas para no taparlas.
    if (this.roundFlash && performance.now() < this.roundFlash.until && !state.pending) {
      this.panel(166, 106, 148, 16, 'rgba(10,7,14,0.94)', COLORS.green);
      drawTextCenteredShadow(ctx, this.roundFlash.text, W / 2, 110, COLORS.cream, 1);
    } else if (this.roundFlash && performance.now() >= this.roundFlash.until) {
      this.roundFlash = null;
    }

    // ---------- Cartas sobre el fieltro, en profundidad ----------
    const shownRound = Math.min(state.round, 2);
    const shownPlayed = state.played[shownRound];
    const rivalPlayed = shownPlayed[rival];
    const humanPlayed = shownPlayed[human];

    // Las rondas cerradas quedan apiladas a los costados con su número: se ve qué salió.
    for (let r = 0; r < Math.min(state.round, 3); r++) {
      const round = state.played[r];
      if (round[rival]) {
        this.scaledCard(round[rival]!, 14, 80 + r * 30, 0.65, false, 0, undefined, strengthTier(round[rival]!));
        drawText(ctx, `R${r + 1} ${shortCard(round[rival]!)}`, 14, 70 + r * 30, COLORS.red);
      }
      if (round[human]) {
        this.scaledCard(round[human]!, W - 43, 80 + r * 30, 0.65, false, 0, undefined, strengthTier(round[human]!));
        drawText(ctx, `R${r + 1} ${shortCard(round[human]!)}`, W - 43, 70 + r * 30, COLORS.green);
      }
    }
    // Nunca se dibuja un dorso que el rival no jugó. Las cartas en juego son grandes
    // y llevan etiqueta: así se entiende de un vistazo qué tiró cada uno.
    if (rivalPlayed) {
      this.scaledCard(rivalPlayed, 220, 62, 0.9, true, 0, undefined, strengthTier(rivalPlayed));
      const tag = `${rivalLabel.slice(0, 7)} R${Math.min(state.round, 2) + 1}`;
      const tagW = Math.max(46, textWidth(tag) + 8);
      this.panel(221 - tagW / 2, 52, tagW, 10, 'rgba(10,7,14,0.92)', COLORS.redDark);
      drawTextCentered(ctx, tag, 221, 53, COLORS.cream);
    }
    if (humanPlayed) {
      this.scaledCard(humanPlayed, 220, 104, 0.9, true, 0, undefined, strengthTier(humanPlayed));
      this.panel(198, 94, 46, 10, 'rgba(10,7,14,0.92)', COLORS.green);
      drawTextCentered(ctx, `VOS R${Math.min(state.round, 2) + 1}`, 221, 95, COLORS.cream);
    }
    // El rival sigue presente mientras se juega: gesto, nombre y color de campaña.
    if (state.phase === 'playing') {
      drawRivalAction(ctx, 56, 44, view.opponent?.name ?? rivalLabel, view.opponent?.color, {
        thinking: rivalTurn,
        celebrating: !!this.roundFlash && this.roundFlash.text === 'PERDISTE LA RONDA',
        annoyed: !!this.roundFlash && this.roundFlash.text === 'GANASTE LA RONDA',
        talking: !!view.taunt,
      }, view.opponent?.id ?? rivalLabel);
    }

    if (state.pending) {
      const p = state.pending;
      const lastCall = p.kind === 'envido' ? p.bids[p.bids.length - 1]?.call : undefined;
      const label = p.kind === 'truco'
        ? p.level === 1 ? '¿TRUCO?' : p.level === 2 ? '¿RETRUCO?' : '¿VALE 4?'
        : lastCall === 'falta'
          ? '¿FALTA?'
          : lastCall === 'real'
            ? '¿REAL ENVIDO?'
            : envidoWordCount(p.bids) >= 2
              ? '¿ENVIDO ENVIDO?'
              : '¿ENVIDO?';
      drawSoftPanel(ctx, 166, 136, 148, 18, 'rgba(10,7,14,0.96)', 'rgba(255, 201, 60, 0.7)', 5);
      drawTextCenteredShadow(ctx, label, W / 2, 140, COLORS.gold, 2);
    } else if (view.notice) {
      drawTextCentered(ctx, clip(view.notice, 34), W / 2, 140, COLORS.pink);
    }

    if (view.taunt) {
      const bx = 8;
      this.panel(bx, 52, 160, 30, COLORS.paper, COLORS.goldDark, true);
      ctx.fillStyle = COLORS.paper;
      ctx.fillRect(bx + 160, 58, 6, 7);
      ctx.fillStyle = COLORS.goldDark;
      ctx.fillRect(bx + 165, 60, 2, 3);
      wrapText(`"${view.taunt}"`, 24).slice(0, 2).forEach((line, i) => {
        drawText(ctx, line, bx + 6, 57 + i * 12, COLORS.ink);
      });
    }

    if (view.disconnected) rightText(ctx, 'DESCONECTADO', W - 30, 32, COLORS.red);

    // Ronda explícita bajo el marcador; el detalle R1/R2/R3 vive en el tooltip.
    drawTextCentered(ctx, `RONDA ${Math.min(state.round + 1, 3)}/3`, W / 2, 53, COLORS.cream);

    // Historial breve: dos líneas por encima del dock, sin chocar con el cartel de canto.
    const recent = state.log.slice(-2);
    if (recent.length > 0) {
      this.panel(8, 136, 150, 22, 'rgba(10,7,14,0.88)', COLORS.goldDark);
      recent.forEach((line, i) => {
        drawText(ctx, clip(logEntry(line, human), 22), 12, 138 + i * 10, i === recent.length - 1 ? COLORS.cream : COLORS.gray);
      });
    }

    // Tu envido siempre a la vista, el del rival nunca.
    this.panel(8, 238, 92, 20, COLORS.woodDark, COLORS.pink);
    drawSuit(ctx, 'oro', 13, 244, 1, COLORS.pink);
    drawText(ctx, `${envidoScore(state.hands[human]).points}`, 25, 243, COLORS.pink, 2);

    // ---------- Dock de acciones y submenú de envido ----------
    const available = new Set(view.legal.map((action) => action.type));
    if (view.envidoOpen) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.fillRect(0, 0, W, 158);
    }
    if (view.envidoOpen) {
      hits.push(...this.drawEnvidoMenu(state, view, defs, available, human));
    }
    const dock = this.drawActionDock(state, view, defs, available);
    hits.push(...dock.hits);

    // Ayuda breve bajo el cursor; el submenú ya muestra la suya propia.
    if (!view.envidoOpen) {
      const hoveredSlot = dock.slots.find((slot) => hover === slot.id);
      const hoveredType = hoveredSlot?.action;
      const hint = hoveredSlot?.openEnvido
        ? 'Desplegá todos los cantos de envido.'
        : hoveredType ? defs[hoveredType]?.hint : undefined;
      if (hint) {
        const tw = 204;
        const tx = Math.round((W - tw) / 2);
        drawSoftPanel(ctx, tx, 108, tw, 22, COLORS.paper, 'rgba(255, 201, 60, 0.8)', 5);
        drawText(ctx, clip(hint, 31), tx + 9, 114, COLORS.ink);
      }
    }

    if (hover === 'game:rounds') {
      const outcome = (r: number): string => {
        const round = state.played[r];
        if (!round[0] || !round[1]) return '--';
        const w = this.roundWinnerForDisplay(round[0], round[1]);
        return w === 'EMP' ? 'PARDA' : (w === 'P1') === (human === 0) ? 'VOS' : 'RIVAL';
      };
      this.panel(8, 58, 150, 40, COLORS.paper, COLORS.goldDark, true);
      drawText(ctx, `R1 ${outcome(0)}   R2 ${outcome(1)}`, 14, 63, COLORS.ink);
      drawText(ctx, `R3 ${outcome(2)}   MANO ${state.mano === human ? 'VOS' : 'RIVAL'}`, 14, 76, COLORS.ink);
      drawText(ctx, 'PARDA: NO SUMA NADIE', 14, 88, COLORS.mutedInk);
    }

    // ---------- Tus cartas, abanicadas sobre el borde de la mesa ----------
    const hand = state.hands[human];
    const spacing = 60;
    const startX = Math.round((W - ((hand.length - 1) * spacing + CARD_W)) / 2);
    const angles = [-0.11, 0, 0.11];
    const hoveredIndex = hand.findIndex((card) => hover === `card:${card.id}`);
    hand.forEach((card, i) => {
      const x = startX + i * spacing;
      const canPlay = view.legal.some((a) => a.type === 'playCard' && a.cardId === card.id);
      const isHover = i === hoveredIndex;
      const y = 206 + (i === 1 ? -8 : -2) - (isHover && canPlay ? 10 : 0);
      this.handCard(card, x, y, angles[i] ?? 0, canPlay || isHover, i);
      if (canPlay) hits.push({ id: `card:${card.id}`, x: x - 4, y: y - 10, w: CARD_W + 8, h: CARD_H + 12 });
    });

    // Tooltip tipo papelito: solo cuando señalás una carta.
    if (hoveredIndex >= 0) {
      const card = hand[hoveredIndex];
      const tier = strengthTier(card);
      const x = Math.max(8, Math.min(W - 198, startX + hoveredIndex * spacing - 70));
      this.panel(x, 100, 190, 40, COLORS.paper, COLORS.goldDark, true);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(x + 92, 98, 6, 4);
      drawText(ctx, clip(cardLabel(card).toUpperCase(), 25), x + 8, 105, COLORS.ink);
      ctx.fillStyle = tierColor(tier);
      ctx.fillRect(x + 174, 154, 8, 8);
      const rivalCard = shownPlayed[rival];
      const comparison = !rivalCard
        ? 'SIN RIVAL'
        : cardStrength(card) > cardStrength(rivalCard)
          ? 'GANA'
          : cardStrength(card) < cardStrength(rivalCard)
            ? 'PIERDE'
            : 'EMPATA';
      drawText(ctx, `${tierShort(tier)}  ENV +${card.rank <= 7 ? card.rank : 0}  ${comparison}`, x + 8, 122, COLORS.ink);
      rightText(ctx, `${tier}/14`, x + 182, 133, COLORS.mutedInk);
    }

    // ---------- Cierres ----------
    if (state.phase === 'handEnd') {
      const last = state.lastHand;
      const won = last?.winner === human;
      const who = (player: PlayerIndex): string => player === human ? 'VOS' : rivalLabel;
      // Resumen arriba: las cartas de la última ronda y tus cartas quedan a la vista.
      drawSoftPanel(ctx, 98, 70, W - 196, 82, 'rgba(9, 7, 12, 0.96)', 'rgba(255, 201, 60, 0.55)', 8);
      drawTextCenteredShadow(ctx, won ? 'MANO PARA VOS' : `MANO PARA ${rivalLabel}`, W / 2, 78, won ? COLORS.green : COLORS.red, 2);
      if (last?.envido) {
        drawTextCentered(ctx, `ENVIDO ${who(last.envido.winner)} +${last.envido.prize} (${last.envido.score})`, W / 2, 99, COLORS.gold);
        const cards = last.envido.cards.map((card) => cardLabel(card)).join(' y ');
        drawTextCentered(ctx, clip(cards.toUpperCase(), 42), W / 2, 112, COLORS.gray);
      }
      if (last?.truco) drawTextCentered(ctx, `TRUCO ${who(last.truco.winner)} +${last.truco.points}`, W / 2, 126, COLORS.cream);
    }

    if (state.phase === 'gameEnd') {
      const won = state.winner === human;
      for (let i = 0; i < 9; i++) {
        const sx = 90 + ((i * 61 + Math.floor(this.time * 19)) % 300);
        const sy = 70 + ((i * 37 + Math.floor(this.time * 13)) % 90);
        drawSparkle(ctx, sx, sy, i % 2 ? COLORS.gold : COLORS.pink);
      }
      drawSoftPanel(ctx, 96, 70, W - 192, 82, 'rgba(9, 7, 12, 0.96)', 'rgba(255, 201, 60, 0.55)', 8);
      drawTextCenteredShadow(ctx, won ? 'GANASTE' : 'PERDISTE', W / 2, 78, won ? COLORS.green : COLORS.red, 2);
      drawTextCentered(ctx, `${state.scores[0]} - ${state.scores[1]}`, W / 2, 104, COLORS.cream, 3);
      drawTextCentered(ctx, 'TOCÁ NUEVA PARTIDA PARA VOLVER', W / 2, 132, COLORS.gray);
    }

    return hits;
  }
}
