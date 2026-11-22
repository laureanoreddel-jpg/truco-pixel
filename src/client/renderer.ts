import type { Difficulty } from '../core/ai';
import { cardLabel, cardStrength, envidoScore, strengthTier, trucoPoints } from '../core/hand';
import { other, type Card, type GameAction, type GameState, type PlayerIndex } from '../core/types';
import {
  CARD_H,
  CARD_W,
  COLORS,
  drawBadge,
  drawButton,
  drawCard,
  drawCardBack,
  drawPanel,
  drawSparkle,
  drawText,
  drawTextCentered,
  drawTextCenteredShadow,
  drawTextShadow,
  makeGameTable,
  makeTable,
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
  mode: 'local' | 'online';
  legal: GameAction[];
  notice: string;
  /** id del elemento bajo el cursor, o null. */
  hover: string | null;
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
      'EMPATE = NADIE SUMA ESA RONDA',
      'DESPUES DE UN EMPATE,',
      'LA SIGUIENTE RONDA VALE DOBLE',
      'Y ESO DEFINE LA MANO',
      '',
      'EL TRACKER R1/R2/R3 MUESTRA',
      'QUIEN GANO CADA RONDA',
    ],
    right: [
      'VALOR DE LA MANO',
      'TRUCO x1 / RETRUCO x2 / VALE 4 x3',
      'MANO DOBLE DUPLICA EL VALOR',
      'IRSE AL MAZO RINDE LA MANO',
      'EL RIVAL SUMA EL TRUCO VIGENTE',
      '',
      'AL TERMINAR LA MANO,',
      'TOCÁ SIGUIENTE MANO O APRETÁ ENTER',
      'NO PUEDE AVANZAR LA IA SOLA',
    ],
  },
  {
    title: 'ENVIDIO',
    left: [
      '20 + LAS 2 CARTAS DEL MISMO PALO',
      'LOS 10, 11 Y 12 VALEN 0',
      'EJEMPLO: 7 ORO + 6 ORO = 33',
      'SIN PAREJA VALE LA CARTA MAYOR',
      '',
      'CADENA DE CANTOS',
      'ENVIDO +2',
      'REAL ENVIDO +3',
      'FALTA = LO QUE TE FALTA PARA 15',
    ],
    right: [
      'RECHAZAR ENVIDO: DA 1 PUNTO',
      'RECHAZAR REAL: DA 2 PUNTOS',
      'RECHAZAR FALTA: DA LO CANTADO',
      '',
      'LA BOLSA SE PAGA AL CERRAR LA MANO',
      'NO CORTA EL JUEGO',
      'SI EMPATAN, GANA QUIEN ES MANO',
      'NO SE VE EL ENVIDIO DEL RIVAL',
      'MIRÁ EL TUYO EN EL PANEL IZQUIERDO',
    ],
  },
  {
    title: 'TRUCO Y ATAJOS',
    left: [
      'TRUCO -> RETRUCO -> VALE 4',
      'VALE 1, 2 O 3 PUNTOS',
      'QUIERO = ACEPTO ESE VALOR',
      'NO QUIERO = EL OTRO SUMA',
      '',
      'PODES CANTAR EN TU TURNO,',
      'ANTES DE TIRAR UNA CARTA',
      'IR AL MAZO = TE RENDIS',
    ],
    right: [
      'TECLAS RAPIDAS',
      '1 / 2 / 3  JUGAR CARTA',
      'E ENVIDIO - R REAL - F FALTA',
      'T TRUCO - S SUBIR - N NO QUIERO',
      'M MAZO - ENTER SIGUIENTE MANO',
      '',
      'H ABRE ESTA AYUDA',
      'ESC VOLVER AL MENU',
      'LAS FLECHAS CAMBIAN DE PAGINA',
    ],
  },
];

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}.` : text;
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
  const bid = p?.kind === 'envido' ? p.bid : Math.max(1, state.targetScore - state.scores[human]);
  const rejectEnvido = p?.kind === 'envido' ? (p.level === 3 ? p.bid : p.level) : 1;
  const foldValue = trucoPoints(state.trucoLevel);

  return {
    callTruco: {
      type: 'callTruco', label: 'TRUCO x1', color: COLORS.red, text: COLORS.white,
      hint: 'Truco por 1 punto. Si lo rechazan, ganás 1.',
    },
    raiseTruco: {
      type: 'raiseTruco',
      label: nextTruco === 2 ? 'RETRUCO x2' : 'VALE 4 x3',
      color: COLORS.redDark, text: COLORS.white,
      hint: nextTruco === 2 ? 'Subí a 2 puntos. Rechazo = 2 para vos.' : 'Subí a 3 puntos. Rechazo = 3 para vos.',
    },
    acceptTruco: {
      type: 'acceptTruco', label: `QUIERO x${p?.kind === 'truco' ? p.level : state.trucoLevel}`,
      color: '#277a4c', text: COLORS.white, hint: 'Aceptás el valor y seguís jugando.',
    },
    declineTruco: {
      type: 'declineTruco', label: `NO (DA ${p?.kind === 'truco' ? p.level : 1})`,
      color: '#6d2b31', text: COLORS.white, hint: 'No aceptás: el rival se lleva esos puntos y cierra la mano.',
    },
    callEnvido: {
      type: 'callEnvido', label: 'ENVIDO +2', color: '#8b6b1f', text: COLORS.white,
      hint: 'Sumás 2 a la bolsa. Se paga al cerrar la mano.',
    },
    callRealEnvido: {
      type: 'callRealEnvido', label: 'REAL +3', color: '#9a6a1d', text: COLORS.white,
      hint: 'Sumás 3 a la bolsa. No se puede cantar envido después.',
    },
    callFalta: {
      type: 'callFalta', label: `FALTA +${bid}`, color: '#7d4a12', text: COLORS.white,
      hint: `Cantás ${bid}, lo que te falta para 15. Rechazo = ${bid} para vos.`,
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
      type: 'fold', label: `MAZO +${foldValue}`, color: '#464652', text: COLORS.white,
      hint: 'Te rendís. El rival se lleva el truco vigente y cierra la mano.',
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
  private readonly gameTable: HTMLCanvasElement;

  constructor(private readonly ctx: CanvasRenderingContext2D, private readonly width: number, private readonly height: number) {
    this.table = makeTable(width, height);
    this.gameTable = makeGameTable(width, height);
  }

  private get time(): number {
    return performance.now() / 1000;
  }

  clear(): void {
    this.ctx.drawImage(this.table, 0, 0);
  }

  private clearGame(): void {
    this.ctx.drawImage(this.gameTable, 0, 0);
  }

  private scaledCard(card: Card, x: number, y: number, scale: number, highlight = false, lift = 0, keyHint?: number, tier?: number): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);
    drawCard(this.ctx, card, 0, 0, highlight, lift, keyHint, tier);
    this.ctx.restore();
  }

  private scaledBack(x: number, y: number, scale: number): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);
    drawCardBack(this.ctx, 0, 0);
    this.ctx.restore();
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

  drawMenu(difficulty: Difficulty, hover: string | null = null): HitBox[] {
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
    hits.push(this.button('menu:local', '1 JUGADOR - VS IA', 70, 106, W - 140, 32, COLORS.red, COLORS.white, 2, hover === 'menu:local'));
    hits.push(this.button('menu:online', 'MULTIJUGADOR ONLINE', 70, 146, W - 140, 32, '#277a4c', COLORS.white, 2, hover === 'menu:online'));

    drawTextCentered(ctx, 'DIFICULTAD DE LA IA', W / 2, 190, COLORS.gold);
    const labels: Record<Difficulty, string> = { facil: 'FACIL', medio: 'MEDIO', dificil: 'DIFICIL' };
    DIFFICULTIES.forEach((level, i) => {
      const id = `diff:${level}`;
      const selected = level === difficulty;
      hits.push(
        this.button(
          id,
          labels[level],
          62 + i * 122,
          204,
          112,
          22,
          selected ? COLORS.gold : COLORS.panelLight,
          selected ? COLORS.ink : COLORS.cream,
          1,
          hover === id,
        ),
      );
    });
    hits.push(this.button('menu:help', 'COMO JUGAR  [H]', 180, 238, 120, 20, COLORS.navy, COLORS.gold, 1, hover === 'menu:help'));
    drawTextCentered(ctx, 'CARTAS GRANDES + AYUDA EN PANTALLA', W / 2, 262, COLORS.gray);
    return hits;
  }

  drawOnline(info: { code: string; status: string; connected: boolean }, hover: string | null = null): HitBox[] {
    this.clear();
    const ctx = this.ctx;
    const W = this.width;
    this.dim(0.82);
    this.panel(26, 18, W - 52, 234, COLORS.panel, COLORS.gold, true);

    drawTextCenteredShadow(ctx, 'MULTIJUGADOR', W / 2, 28, COLORS.gold, 2);
    const hits: HitBox[] = [];
    if (!info.code) {
      drawTextCentered(ctx, 'CREÁ UNA SALA Y PASALE EL CODIGO', W / 2, 56, COLORS.cream);
      hits.push(this.button('online:create', 'CREAR SALA', 50, 82, 180, 34, '#277a4c', COLORS.white, 2, hover === 'online:create'));
      hits.push(this.button('online:join', 'UNIRME', 250, 82, 180, 34, COLORS.red, COLORS.white, 2, hover === 'online:join'));
      drawTextCentered(ctx, 'DOS JUGADORES - UNA SOLA PARTIDA', W / 2, 142, COLORS.gray);
      drawTextCentered(ctx, 'EL CODIGO TIENE 4 LETRAS', W / 2, 158, COLORS.gray);
      drawTextCentered(ctx, 'EL SERVIDOR ES AUTORITATIVO', W / 2, 174, COLORS.gray);
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
      hits.push(this.button('online:copy', 'COPIAR CODIGO', 50, 146, 180, 28, COLORS.panelLight, COLORS.cream, 1, hover === 'online:copy'));
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
    this.clearGame();
    const ctx = this.ctx;
    const W = this.width;
    const human = view.human;
    const rival = other(human);
    const rivalLabel = view.mode === 'local' ? 'IA' : 'RIVAL';
    const hits: HitBox[] = [];
    const hover = view.hover;
    const defs = actionDefs(state, human);

    // ---------- Marcadores mínimos ----------
    const humanTurn = state.phase === 'playing' && !state.pending && state.turn === human;
    this.panel(8, 6, 88, 20, 'rgba(10,20,16,0.9)', humanTurn ? COLORS.green : COLORS.gold);
    drawText(ctx, `VOS ${String(state.scores[human]).padStart(2, '0')}`, 14, 11, COLORS.green, 2);

    this.panel(W - 108, 6, 100, 20, 'rgba(24,12,16,0.9)', state.turn === rival ? COLORS.red : COLORS.gold);
    drawText(ctx, `${rivalLabel} ${String(state.scores[rival]).padStart(2, '0')}`, W - 102, 11, COLORS.red, 2);

    drawTextCentered(ctx, `MANO ${String(state.handNumber).padStart(2, '0')}`, W / 2, 6, COLORS.cream);
    drawTextCentered(ctx, `A ${state.targetScore}`, W / 2, 17, COLORS.gray);

    let bx = 184;
    if (state.trucoLevel > 0) bx += drawBadge(ctx, `TRUCO ${state.trucoLevel}`, bx, 30, COLORS.redDark) + 5;
    if (state.envidoPot > 0) bx += drawBadge(ctx, `BOLSA ${state.envidoPot}`, bx, 30, COLORS.pink) + 5;
    if (state.envidoResult) drawBadge(ctx, `ENV ${state.envidoResult.prize}`, bx, 30, COLORS.goldDark);

    // Tres puntos: verde ganaste, rojo perdió, dorado empató, gris sin jugar.
    for (let r = 0; r < 3; r++) {
      const round = state.played[r];
      let color = COLORS.panelLight;
      if (round[0] && round[1]) {
        const w = this.roundWinnerForDisplay(round[0], round[1]);
        color = w === 'EMP' ? COLORS.goldDark : (w === 'P1') === (human === 0) ? COLORS.green : COLORS.red;
      }
      ctx.fillStyle = color;
      ctx.fillRect(230 + r * 9, 46, 6, 6);
    }

    hits.push({ id: 'game:help', x: 8, y: 32, w: 16, h: 16 });
    this.panel(8, 32, 16, 16, hover === 'game:help' ? COLORS.red : COLORS.panel, COLORS.gold);
    drawTextCentered(ctx, '?', 16, 36, COLORS.gold);
    hits.push({ id: 'game:menu', x: W - 24, y: 32, w: 16, h: 16 });
    this.panel(W - 24, 32, 16, 16, hover === 'game:menu' ? COLORS.redDark : COLORS.panel, COLORS.gold);
    drawTextCentered(ctx, 'X', W - 16, 36, COLORS.cream);

    // ---------- Cartas sobre el fieltro, en profundidad ----------
    const shownRound = Math.min(state.round, 2);
    const shownPlayed = state.played[shownRound];
    const rivalPlayed = shownPlayed[rival];
    const humanPlayed = shownPlayed[human];
    if (rivalPlayed) this.scaledCard(rivalPlayed, 222, 74, 0.8);
    else if (humanPlayed) this.scaledBack(222, 74, 0.8);
    if (humanPlayed) this.scaledCard(humanPlayed, 218, 124, 1);
    else if (rivalPlayed) this.scaledBack(218, 124, 1);

    if (state.pending) {
      const p = state.pending;
      const label = p.kind === 'truco'
        ? p.level === 1 ? '¿TRUCO?' : p.level === 2 ? '¿RETRUCO?' : '¿VALE 4?'
        : p.level === 3 ? '¿FALTA?' : p.level === 2 ? '¿REAL?' : '¿ENVIDO?';
      this.panel(166, 58, 148, 18, 'rgba(10,7,14,0.94)', COLORS.gold);
      drawTextCenteredShadow(ctx, label, W / 2, 62, COLORS.gold, 2);
    } else if (view.notice) {
      drawTextCentered(ctx, clip(view.notice, 34), W / 2, 62, COLORS.pink);
    }

    // Tu envido siempre a la vista, el del rival nunca.
    this.panel(8, 240, 86, 18, 'rgba(12,24,20,0.85)', COLORS.pink);
    drawText(ctx, `ENV ${envidoScore(state.hands[human]).points}`, 14, 245, COLORS.pink);

    // ---------- Botones: centro si son pocos, laterales si son muchos ----------
    const labels: ActionDef[] = [];
    for (const action of view.legal) {
      if (action.type === 'playCard') continue;
      const def = defs[action.type];
      if (def && !labels.some((l) => l.type === def.type)) labels.push(def);
    }
    if (labels.length > 0) {
      if (labels.length <= 3) {
        const w = 126;
        const gap = 8;
        const total = labels.length * w + (labels.length - 1) * gap;
        const start = Math.round((W - total) / 2);
        labels.forEach((def, i) => {
          const id = `action:${def.type}`;
          hits.push(this.button(id, def.label, start + i * (w + gap), 188, w, 22, def.color, def.text, 1, hover === id));
        });
      } else {
        const per = Math.ceil(labels.length / 2);
        labels.forEach((def, i) => {
          const col = i < per ? 0 : 1;
          const row = col === 0 ? i : i - per;
          const x = col === 0 ? 10 : W - 110;
          const y = 100 + row * 30;
          const id = `action:${def.type}`;
          hits.push(this.button(id, def.label, x, y, 100, 24, def.color, def.text, 1, hover === id));
        });
      }
    }

    // ---------- Tus cartas, al borde de la mesa ----------
    const hand = state.hands[human];
    const spacing = 56;
    const startX = Math.round((W - ((hand.length - 1) * spacing + CARD_W)) / 2);
    const hoveredIndex = hand.findIndex((card) => hover === `card:${card.id}`);
    hand.forEach((card, i) => {
      const x = startX + i * spacing;
      const canPlay = view.legal.some((a) => a.type === 'playCard' && a.cardId === card.id);
      const isHover = i === hoveredIndex;
      const y = 210 + (i === 1 ? -6 : 0) - (isHover && canPlay ? 8 : 0);
      this.scaledCard(card, x, y, 1, canPlay || isHover, 0, i, strengthTier(card));
      if (canPlay) hits.push({ id: `card:${card.id}`, x, y: y - 8, w: CARD_W, h: CARD_H + 8 });
    });

    // Tooltip breve: solo cuando señalás una carta.
    if (hoveredIndex >= 0) {
      const card = hand[hoveredIndex];
      const tier = strengthTier(card);
      const x = Math.max(8, Math.min(W - 188, startX + hoveredIndex * spacing - 40));
      this.panel(x, 166, 180, 38, COLORS.woodDark, COLORS.gold, true);
      drawText(ctx, cardLabel(card).toUpperCase(), x + 7, 171, tierColor(tier));
      rightText(ctx, `PUESTO ${tier}/14`, x + 173, 171, COLORS.gray);
      const rivalCard = shownPlayed[rival];
      const comparison = !rivalCard
        ? 'SIN RIVAL'
        : cardStrength(card) > cardStrength(rivalCard)
          ? 'GANA'
          : cardStrength(card) < cardStrength(rivalCard)
            ? 'PIERDE'
            : 'EMPATA';
      drawText(ctx, `${tierShort(tier)} | ENV +${card.rank <= 7 ? card.rank : 0} | ${comparison}`, x + 7, 188, COLORS.cream);
    }

    // ---------- Cierres ----------
    if (state.phase === 'handEnd') {
      this.dim(0.72, 40);
      this.panel(120, 96, W - 240, 76, COLORS.woodDark, COLORS.gold, true);
      const won = state.lastHand?.winner === human;
      drawTextCenteredShadow(ctx, won ? 'MANO PARA VOS' : `MANO PARA ${rivalLabel}`, W / 2, 104, won ? COLORS.green : COLORS.red, 2);
      if (state.lastHand) drawTextCentered(ctx, `+${state.lastHand.points}`, W / 2, 130, COLORS.cream, 2);
      hits.push(this.button('action:nextHand', 'SIGUIENTE', 170, 146, 140, 20, '#277a4c', COLORS.white, 1, hover === 'action:nextHand'));
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
