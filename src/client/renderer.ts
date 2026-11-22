import type { Difficulty } from '../core/ai';
import { cardLabel, cardStrength, envidoDecline, envidoScore, envidoWordCount, strengthTier, trucoPoints } from '../core/hand';
import { isStoryUnlocked, STORY_OPPONENTS, type StoryOpponent } from '../core/story';
import { namesForViewer, other, type Card, type GameAction, type GameState, type PlayerIndex } from '../core/types';
import {
  CARD_H,
  CARD_W,
  COLORS,
  drawAvatar,
  drawBadge,
  drawButton,
  drawCard,
  drawPanel,
  drawSparkle,
  drawSuit,
  drawText,
  drawRivalPortrait,
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
      'ENVIDO +2   ENVIDO ENVIDO +4',
      'REAL ENVIDO +3   FALTA = SALDO',
      'LA FALTA REEMPLAZA LOS TANTOS',
      'NO CANTES ENVIDO TRAS QUERER',
      'NI CON TU CARTA YA TIRADA',
    ],
    right: [
      'NO QUIERO = LO QUE VALIA ANTES',
      'PRIMER CANTO RECHAZADO = 1',
      'REAL DIRECTO RECHAZADO = 1',
      'ENV + ENV RECHAZADO = 2',
      'DESPUES DEL REAL SOLO FALTA',
      'FALTA EMPATADOS: FALTAN 15',
      'TANTOS EN JUEGO SE PAGAN',
      'AL CERRAR LA MANO, NO CORTA',
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
      'E ENVIDO - R REAL - D DOBLE',
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
  return text.length > max ? `${text.slice(0, max - 1)}.` : text;
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
  const bid = p?.kind === 'envido' ? p.bid : Math.max(1, state.targetScore - state.scores[other(human)]);
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
      color: '#277a4c', text: COLORS.white, hint: 'Aceptás el valor y seguís jugando.',
    },
    declineTruco: {
      type: 'declineTruco', label: `NO (DA ${p?.kind === 'truco' ? p.level : 1})`,
      color: '#6d2b31', text: COLORS.white, hint: 'No aceptás: el rival se lleva esos puntos y cierra la mano.',
    },
    callEnvido: {
      type: 'callEnvido', label: 'ENVIDO +2', color: '#8b6b1f', text: COLORS.white,
      hint: 'Sumás 2 a los tantos en juego. Se paga al cerrar la mano.',
    },
    callRealEnvido: {
      type: 'callRealEnvido', label: 'REAL +3', color: '#9a6a1d', text: COLORS.white,
      hint: 'Sumás 3 a los tantos en juego. Sólo se puede subir a falta.',
    },
    callEnvidoEnvido: {
      type: 'callEnvidoEnvido', label: `ENVIDO ENVIDO +${p?.kind === 'envido' ? p.potAfter + 2 : 4}`, color: '#a57718', text: COLORS.white,
      hint: 'Segundo envido: sumás 2 (4 en total). El rechazo da 2 puntos.',
    },
    callFalta: {
      type: 'callFalta', label: `FALTA +${bid}`, color: '#7d4a12', text: COLORS.white,
      hint: `Cantás ${bid}: lo que le falta a quien va ganando para ${state.targetScore}. Rechazo = ${rejectEnvido} para vos.`,
    },
    acceptEnvido: {
      type: 'acceptEnvido', label: `QUIERO +${p?.kind === 'envido' ? p.bid : 2}`,
      color: '#277a4c', text: COLORS.white, hint: 'Aceptás la suba. El envido se decide al cerrar la mano.',
    },
    declineEnvido: {
      type: 'declineEnvido', label: `NO (DA ${rejectEnvido})`,
      color: '#6d2b31', text: COLORS.white, hint: 'No aceptás: el rival suma puntos, pero la mano sigue.',
    },
    fold: {
      type: 'fold', label: `MAZO (RIVAL +${foldValue})`, color: '#464652', text: COLORS.white,
      hint: mazoEnvido
        ? 'Te rendís antes de cerrar el envido: rival suma truco + 1 y cierra la mano.'
        : 'Te rendís. El rival se lleva el truco vigente y cierra la mano.',
    },
    nextHand: {
      type: 'nextHand', label: 'SIGUIENTE MANO', color: '#277a4c', text: COLORS.white,
      hint: 'Reparten de nuevo. Alterna quien arranca.',
    },
    restart: {
      type: 'restart', label: 'NUEVA PARTIDA', color: '#277a4c', text: COLORS.white,
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
    hits.push(this.button('menu:online', 'MULTIJUGADOR ONLINE', 70, 166, W - 140, 28, '#277a4c', COLORS.white, 2, hover === 'menu:online'));

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
      hits.push(this.button('story:next', 'SIGUIENTE CAPITULO', 42, 216, 200, 30, '#277a4c', COLORS.white, 1, hover === 'story:next'));
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
      hits.push(this.button('online:create', 'CREAR SALA', 50, 82, 180, 34, '#277a4c', COLORS.white, 2, hover === 'online:create'));
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

    drawTextCentered(ctx, `${current + 1} / ${HELP_PAGES.length}`, W / 2, 240, COLORS.gray);
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

    // ---------- Cartas sobre el fieltro, en profundidad ----------
    const shownRound = Math.min(state.round, 2);
    const shownPlayed = state.played[shownRound];
    const rivalPlayed = shownPlayed[rival];
    const humanPlayed = shownPlayed[human];

    // Las rondas cerradas quedan apiladas a los costados: se ve qué salió.
    for (let r = 0; r < Math.min(state.round, 3); r++) {
      const round = state.played[r];
      if (round[rival]) this.scaledCard(round[rival]!, 16, 80 + r * 28, 0.5);
      if (round[human]) this.scaledCard(round[human]!, W - 38, 80 + r * 28, 0.5);
    }
    // Nunca se dibuja un dorso que el rival no jugó.
    if (rivalPlayed) this.scaledCard(rivalPlayed, 222, 74, 0.8);
    if (humanPlayed) this.scaledCard(humanPlayed, 218, 124, 1);

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
      this.panel(166, 58, 148, 18, 'rgba(10,7,14,0.94)', COLORS.gold);
      drawTextCenteredShadow(ctx, label, W / 2, 62, COLORS.gold, 2);
    } else if (view.notice) {
      drawTextCentered(ctx, clip(view.notice, 34), W / 2, 62, COLORS.pink);
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

    if (view.disconnected) {
      this.panel(150, 84, 180, 20, COLORS.redDark, COLORS.gold);
      drawTextCentered(ctx, 'RIVAL DESCONECTADO', W / 2, 88, COLORS.white);
    }
    if (this.roundFlash && performance.now() < this.roundFlash.until) {
      this.panel(166, 58, 148, 18, 'rgba(10,7,14,0.94)', COLORS.green);
      drawTextCenteredShadow(ctx, this.roundFlash.text, W / 2, 62, COLORS.cream, 1);
    } else {
      this.roundFlash = null;
    }

    // Historial breve: lo cantado y jugado no se pierde al pasar de ronda.
    const recent = state.log.slice(-2);
    if (recent.length > 0) {
      this.panel(8, 134, 150, 24, 'rgba(10,7,14,0.88)', COLORS.goldDark);
      recent.forEach((line, i) => {
        drawText(ctx, clip(namesForViewer(line, human), 23), 12, 137 + i * 10, i === recent.length - 1 ? COLORS.cream : COLORS.gray);
      });
    }

    // Tu envido siempre a la vista, el del rival nunca.
    this.panel(8, 238, 92, 20, COLORS.woodDark, COLORS.pink);
    drawSuit(ctx, 'oro', 13, 244, 1, COLORS.pink);
    drawText(ctx, `${envidoScore(state.hands[human]).points}`, 25, 243, COLORS.pink, 2);

    // ---------- Botones: una barra agrupada, lejos de las cartas ----------
    const groupOrder: GameAction['type'][] = [
      'acceptEnvido', 'declineEnvido', 'callEnvido', 'callEnvidoEnvido', 'callRealEnvido', 'callFalta',
      'acceptTruco', 'declineTruco', 'callTruco', 'raiseTruco',
      'fold', 'nextHand', 'restart',
    ];
    const labels: ActionDef[] = [];
    for (const action of view.legal) {
      if (action.type === 'playCard') continue;
      // El cierre ya dibuja su propio botón dentro del resumen.
      if (state.phase === 'handEnd' && action.type === 'nextHand') continue;
      if (state.phase === 'gameEnd' && action.type === 'restart') continue;
      const def = defs[action.type];
      if (def && !labels.some((l) => l.type === def.type)) labels.push(def);
    }
    labels.sort((a, b) => groupOrder.indexOf(a.type) - groupOrder.indexOf(b.type));
    if (labels.length > 0) {
      const w = 112;
      const gap = 6;
      const rows = labels.length <= 4 ? 1 : 2;
      const perRow = Math.ceil(labels.length / rows);
      labels.forEach((def, i) => {
        const row = Math.floor(i / perRow);
        const inRow = Math.min(perRow, labels.length - row * perRow);
        const total = inRow * w + (inRow - 1) * gap;
        const x = Math.round((W - total) / 2) + (i % perRow) * (w + gap);
        const y = rows === 1 ? 182 : 160 + row * 22;
        const id = `action:${def.type}`;
        hits.push(this.button(id, def.label, x, y, w, 20, def.color, def.text, 1, hover === id));
      });
    }

    // ---------- Ayuda al señalar (o con pulsación larga en el celular) ----------
    const hoveredAction = labels.find((def) => hover === `action:${def.type}`);
    if (hoveredAction) {
      const button = hits.find((h) => h.id === `action:${hoveredAction.type}`);
      const tw = 196;
      const tx = button && button.x + button.w / 2 < W / 2 ? 8 : W - tw - 8;
      const ty = 108;
      this.panel(tx, ty, tw, 34, COLORS.paper, COLORS.goldDark, true);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(button && button.x + button.w / 2 < W / 2 ? tx + 94 : tx + 96, ty - 2, 6, 4);
      wrapText(hoveredAction.hint, 30).slice(0, 2).forEach((line, i) => {
        drawText(ctx, line, tx + 7, ty + 6 + i * 12, COLORS.ink);
      });
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
      drawText(ctx, 'PARDA: NO SUMA NADIE', 14, 88, COLORS.gray);
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
      const y = 208 + (i === 1 ? -8 : 2) - (isHover && canPlay ? 10 : 0);
      this.handCard(card, x, y, angles[i] ?? 0, canPlay || isHover, i);
      if (canPlay) hits.push({ id: `card:${card.id}`, x: x - 4, y: y - 10, w: CARD_W + 8, h: CARD_H + 12 });
    });

    // Tooltip tipo papelito: solo cuando señalás una carta.
    if (hoveredIndex >= 0) {
      const card = hand[hoveredIndex];
      const tier = strengthTier(card);
      const x = Math.max(8, Math.min(W - 198, startX + hoveredIndex * spacing - 70));
      this.panel(x, 148, 190, 40, COLORS.paper, COLORS.goldDark, true);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(x + 92, 146, 6, 4);
      drawText(ctx, clip(cardLabel(card).toUpperCase(), 25), x + 8, 153, COLORS.ink);
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
      drawText(ctx, `${tierShort(tier)}  ENV +${card.rank <= 7 ? card.rank : 0}  ${comparison}`, x + 8, 170, COLORS.ink);
      rightText(ctx, `${tier}/14`, x + 182, 181, COLORS.gray);
    }

    // ---------- Cierres ----------
    if (state.phase === 'handEnd') {
      this.dim(0.72, 40);
      this.panel(104, 82, W - 208, 100, COLORS.woodDark, COLORS.gold, true);
      const last = state.lastHand;
      const won = last?.winner === human;
      const who = (player: PlayerIndex): string => player === human ? 'VOS' : rivalLabel;
      drawTextCenteredShadow(ctx, won ? 'MANO PARA VOS' : `MANO PARA ${rivalLabel}`, W / 2, 88, won ? COLORS.green : COLORS.red, 2);
      if (last?.envido) {
        drawTextCentered(
          ctx,
          `ENVIDO ${who(last.envido.winner)} +${last.envido.prize} (${last.envido.score})`,
          W / 2,
          110,
          COLORS.gold,
        );
        const cards = last.envido.cards.map((card) => cardLabel(card)).join(' y ');
        drawTextCentered(ctx, clip(cards.toUpperCase(), 42), W / 2, 122, COLORS.gray);
      }
      if (last?.truco) {
        drawTextCentered(ctx, `TRUCO ${who(last.truco.winner)} +${last.truco.points}`, W / 2, 136, COLORS.cream);
      }
      hits.push(this.button('action:nextHand', 'SIGUIENTE MANO', 165, 153, 150, 21, '#277a4c', COLORS.white, 1, hover === 'action:nextHand'));
    }

    if (state.phase === 'gameEnd') {
      this.dim(0.8, 32);
      const won = state.winner === human;
      for (let i = 0; i < 9; i++) {
        const sx = 90 + ((i * 61 + Math.floor(this.time * 19)) % 300);
        const sy = 70 + ((i * 37 + Math.floor(this.time * 13)) % 90);
        drawSparkle(ctx, sx, sy, i % 2 ? COLORS.gold : COLORS.pink);
      }
      this.panel(110, 76, W - 220, 110, COLORS.woodDark, COLORS.gold, true);
      drawTextCenteredShadow(ctx, won ? 'GANASTE' : 'PERDISTE', W / 2, 86, won ? COLORS.green : COLORS.red, 3);
      drawTextCentered(ctx, `${state.scores[0]} - ${state.scores[1]}`, W / 2, 124, COLORS.cream, 2);
      hits.push(this.button('action:restart', 'NUEVA PARTIDA', 150, 156, 180, 22, '#277a4c', COLORS.white, 2, hover === 'action:restart'));
    }

    return hits;
  }
}
