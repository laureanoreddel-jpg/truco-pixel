import type { Difficulty } from '../core/ai';
import { cardLabel, cardStrength, envidoScore, strengthTier, trucoPoints } from '../core/hand';
import { other, type Card, type GameAction, type GameState, type PlayerIndex } from '../core/types';
import {
  CARD_H,
  CARD_W,
  COLORS,
  drawAvatar,
  drawBadge,
  drawButton,
  drawCard,
  drawCardBack,
  drawPanel,
  drawScoreBar,
  drawSparkle,
  drawText,
  drawTextCentered,
  drawTextCenteredShadow,
  drawTextShadow,
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

  constructor(private readonly ctx: CanvasRenderingContext2D, private readonly width: number, private readonly height: number) {
    this.table = makeTable(width, height);
  }

  private get time(): number {
    return performance.now() / 1000;
  }

  clear(): void {
    this.ctx.drawImage(this.table, 0, 0);
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
    this.clear();
    const ctx = this.ctx;
    const W = this.width;
    const human = view.human;
    const rival = other(human);
    const rivalLabel = view.mode === 'local' ? 'IA' : 'RIVAL';
    const hits: HitBox[] = [];
    const hover = view.hover;
    const defs = actionDefs(state, human);
    const pulse = 0.62 + 0.38 * Math.sin(this.time * 5);

    // ---------- HUD ----------
    ctx.fillStyle = COLORS.woodDark;
    ctx.fillRect(0, 0, W, 32);
    ctx.fillStyle = COLORS.woodLight;
    ctx.fillRect(0, 31, W, 1);

    hits.push({ id: 'game:help', x: 6, y: 5, w: 22, h: 22 });
    this.panel(6, 5, 22, 22, hover === 'game:help' ? COLORS.red : COLORS.redDark, COLORS.gold);
    drawTextCentered(ctx, '?', 17, 11, COLORS.gold, 2);

    drawText(ctx, 'VOS', 34, 3, COLORS.gray);
    drawTextShadow(ctx, String(state.scores[human]).padStart(2, '0'), 34, 11, COLORS.green, 2);
    drawScoreBar(ctx, 34, 27, 70, state.scores[human], state.targetScore, COLORS.green);

    drawTextCentered(ctx, `MANO ${String(state.handNumber).padStart(2, '0')}`, W / 2, 3, COLORS.cream);
    drawTextCentered(ctx, `A ${state.targetScore} PUNTOS`, W / 2, 17, COLORS.gray);

    rightText(ctx, `${rivalLabel} ${String(state.scores[rival]).padStart(2, '0')}`, W - 34, 3, COLORS.red, 2);
    drawScoreBar(ctx, W - 106, 27, 72, state.scores[rival], state.targetScore, COLORS.red);
    hits.push({ id: 'game:menu', x: W - 28, y: 5, w: 22, h: 22 });
    this.panel(W - 28, 5, 22, 22, hover === 'game:menu' ? COLORS.redDark : COLORS.panel, COLORS.gold);
    drawTextCentered(ctx, 'X', W - 17, 10, COLORS.cream, 2);

    // ---------- Rival ----------
    this.panel(8, 36, 120, 52, 'rgba(26, 19, 34, 0.94)', COLORS.woodLight);
    drawAvatar(ctx, view.mode === 'local' ? 'rival' : 'player', 13, 41, 2);
    drawText(ctx, rivalLabel, 44, 42, COLORS.cream, 2);
    drawText(ctx, `CARTAS ${state.hands[rival].length}`, 44, 62, COLORS.gray);
    if (state.turn === rival && state.phase === 'playing' && !state.pending) {
      drawBadge(ctx, 'TURNO', 44, 73, COLORS.goldDark);
    }

    // ---------- Cartas jugadas en la ronda actual ----------
    this.panel(134, 36, 48, 66, 'rgba(8, 32, 23, 0.55)', COLORS.goldDark);
    this.panel(134, 103, 48, 66, 'rgba(8, 32, 23, 0.55)', COLORS.goldDark);
    const shownRound = Math.min(state.round, 2);
    const shownPlayed = state.played[shownRound];
    const rivalPlayed = shownPlayed[rival];
    const humanPlayed = shownPlayed[human];
    if (rivalPlayed) drawCard(ctx, rivalPlayed, 136, 39);
    else if (humanPlayed) drawCardBack(ctx, 136, 39);
    if (humanPlayed) drawCard(ctx, humanPlayed, 136, 106);
    else if (rivalPlayed) drawCardBack(ctx, 136, 106);

    // ---------- Estado y canto actual ----------
    const hoveredAction = hover?.startsWith('action:') ? defs[hover.slice(7) as GameAction['type']] : undefined;
    this.panel(188, 36, 284, 66, 'rgba(16, 12, 24, 0.9)', COLORS.woodLight);
    if (state.pending) {
      const p = state.pending;
      const label = p.kind === 'truco'
        ? p.level === 1 ? '¿TRUCO?' : p.level === 2 ? '¿RETRUCO?' : '¿VALE CUATRO?'
        : p.level === 3 ? '¿FALTA ENVIDO?' : p.level === 2 ? '¿REAL ENVIDO?' : '¿ENVIDO?';
      const detail = p.kind === 'envido'
        ? `BOLSA ${p.potAfter} - TU ENVIDIO ${envidoScore(state.hands[human]).points}`
        : `VALE ${p.level} PUNTO${p.level > 1 ? 'S' : ''} - GANÁ 2 DE 3`;
      drawTextCenteredShadow(ctx, label, 330, 42, COLORS.gold, 2);
      drawTextCentered(ctx, detail, 330, 68, COLORS.cream);
    } else {
      let bx = 194;
      if (state.trucoLevel > 0) bx += drawBadge(ctx, `TRUCO ${state.trucoLevel}`, bx, 41, COLORS.redDark) + 5;
      if (state.envidoPot > 0) bx += drawBadge(ctx, `BOLSA ${state.envidoPot}`, bx, 41, COLORS.pink) + 5;
      if (state.mano === human) bx += drawBadge(ctx, 'MANO', bx, 41, COLORS.goldDark) + 5;
      if (state.round > 0 && state.round <= 2 && cardStrength(state.played[state.round - 1][0]!) === cardStrength(state.played[state.round - 1][1]!)) {
        drawBadge(ctx, 'SIGUIENTE x2', bx, 41, COLORS.goldDark);
      }
      drawText(ctx, clip(state.lastEvent, 46), 194, 59, COLORS.cream);
      if (state.envidoResult) {
        const who = state.envidoResult.winner === human ? 'VOS' : rivalLabel;
        drawText(ctx, `ENVIDIO ${state.envidoResult.score}: GANA ${who} +${state.envidoResult.prize}`, 194, 74, COLORS.gold);
      } else if (view.notice) {
        drawText(ctx, clip(view.notice, 46), 194, 74, COLORS.pink);
      }
    }
    if (hoveredAction) {
      drawTextCentered(ctx, clip(hoveredAction.hint, 54), 330, 89, COLORS.gold);
    } else if (state.phase === 'playing') {
      drawTextCentered(
        ctx,
        state.pending ? 'E = QUIERO   N = NO QUIERO   S = SUBIR' : '1/2/3 CARTA   E ENVIDIO   T TRUCO   M MAZO',
        330,
        89,
        COLORS.gray,
      );
    }

    // ---------- Info del jugador ----------
    this.panel(8, 104, 120, 56, 'rgba(14, 30, 23, 0.9)', COLORS.feltLight);
    drawText(ctx, `TU ENVIDIO ${envidoScore(state.hands[human]).points}`, 13, 110, COLORS.pink);
    drawText(ctx, `RIVAL ??`, 13, 124, COLORS.gray);
    drawText(ctx, `RONDAS ${state.roundWins[human]}-${state.roundWins[rival]}`, 13, 138, COLORS.cream);
    drawText(ctx, `PUNTOS ${state.roundPoints[human]}-${state.roundPoints[rival]}`, 13, 150, COLORS.gold);

    // ---------- Tracker de rondas ----------
    this.panel(188, 104, 284, 56, 'rgba(16, 12, 24, 0.82)', COLORS.woodLight);
    drawText(ctx, 'RONDAS', 194, 109, COLORS.gray);
    for (let r = 0; r < 3; r++) {
      const round = state.played[r];
      let label = `R${r + 1} `;
      let color = COLORS.panelLight;
      if (round[0] && round[1]) {
        const w = this.roundWinnerForDisplay(round[0], round[1]);
        const humanWon = (w === 'P1') === (human === 0);
        label += w === 'EMP' ? 'EMP' : humanWon ? 'VOS' : rivalLabel;
        color = w === 'EMP' ? COLORS.goldDark : humanWon ? '#277a4c' : COLORS.redDark;
      } else {
        label += '-';
      }
      drawBadge(ctx, label, 194 + r * 74, 120, color);
    }
    if (state.phase === 'playing' && !state.pending) {
      if (state.turn === human) {
        ctx.globalAlpha = pulse;
        drawText(ctx, '> TU TURNO - ELEGÍ CARTA', 194, 143, COLORS.green);
        ctx.globalAlpha = 1;
      } else {
        drawText(ctx, `${rivalLabel} PENSANDO${'.'.repeat(1 + Math.floor(this.time * 2) % 3)}`, 194, 143, COLORS.gray);
      }
    } else if (state.phase === 'playing') {
      drawText(ctx, 'RESPONDÉ CON LOS BOTONES DE ABAJO', 194, 143, COLORS.gold);
    } else {
      drawText(ctx, 'MANO CERRADA', 194, 143, COLORS.gold);
    }

    // ---------- Mano del jugador ----------
    this.panel(8, 164, 142, 62, 'rgba(10, 28, 21, 0.82)', COLORS.feltLight);
    drawAvatar(ctx, 'player', 14, 170, 2);
    drawText(ctx, 'VOS', 45, 170, COLORS.cream, 2);
    drawText(ctx, 'TECLAS 1 / 2 / 3', 45, 190, COLORS.gold);
    drawText(ctx, `CARTAS ${state.hands[human].length}`, 45, 204, COLORS.gray);

    this.panel(330, 164, 142, 62, 'rgba(16, 12, 24, 0.82)', COLORS.woodLight);
    drawText(ctx, 'EN JUEGO', 336, 170, COLORS.gold);
    drawText(ctx, `BOLSA ENVIDIO ${state.envidoPot}`, 336, 184, COLORS.pink);
    drawText(ctx, `TRUCO x${state.trucoLevel || 1}`, 336, 198, COLORS.red);
    drawText(ctx, `RONDAS ${state.roundWins[human]}-${state.roundWins[rival]}`, 336, 212, COLORS.cream);

    const hand = state.hands[human];
    const spacing = 50;
    const startX = Math.round((W - ((hand.length - 1) * spacing + CARD_W)) / 2);
    const hoveredIndex = hand.findIndex((card) => hover === `card:${card.id}`);
    const hoveredCard = hoveredIndex >= 0 ? hand[hoveredIndex] : null;
    hand.forEach((card, i) => {
      const x = startX + i * spacing;
      const id = `card:${card.id}`;
      const canPlay = view.legal.some((a) => a.type === 'playCard' && a.cardId === card.id);
      const isHover = i === hoveredIndex;
      drawCard(ctx, card, x, 166, canPlay || isHover, isHover && canPlay ? 6 : 0, i, strengthTier(card));
      if (canPlay) hits.push({ id, x, y: 158, w: CARD_W, h: CARD_H + 10 });
    });

    // ---------- Tooltip de carta ----------
    if (hoveredCard) {
      this.panel(8, 104, W - 16, 56, COLORS.woodDark, COLORS.gold, true);
      const tier = strengthTier(hoveredCard);
      drawTextShadow(ctx, cardLabel(hoveredCard).toUpperCase(), 16, 110, tierColor(tier), 2);
      rightText(ctx, `PUESTO ${tier}/14`, W - 16, 111, COLORS.gray);
      drawText(ctx, `FUERZA: ${tierName(tier)}`, 16, 132, tierColor(tier));
      const rivalCard = shownPlayed[rival];
      const comparison = !rivalCard
        ? 'RIVAL AUN NO TIRA'
        : cardStrength(hoveredCard) > cardStrength(rivalCard)
          ? 'GANÁ ESTA RONDA'
          : cardStrength(hoveredCard) < cardStrength(rivalCard)
            ? 'PERDÉ ESTA RONDA'
            : 'EMPATA ESTA RONDA';
      drawText(ctx, `ENVIDIO: +${hoveredCard.rank <= 7 ? hoveredCard.rank : 0}   |   ${comparison}`, 16, 146, COLORS.cream);
      drawText(ctx, `TECLA ${hoveredIndex + 1}`, W - 76, 146, COLORS.gold);
    }

    // ---------- Botones de acción ----------
    const actions = view.legal.filter((a) => a.type !== 'playCard');
    const labels: ActionDef[] = [];
    for (const action of actions) {
      const def = defs[action.type];
      if (def && !labels.some((l) => l.type === def.type)) labels.push(def);
    }
    if (labels.length > 0) {
      const w = 90;
      const gap = 6;
      const total = labels.length * w + (labels.length - 1) * gap;
      const start = Math.round((W - total) / 2);
      labels.forEach((def, i) => {
        const id = `action:${def.type}`;
        hits.push(this.button(id, def.label, start + i * (w + gap), 236, w, 26, def.color, def.text, 1, hover === id));
      });
    }

    // ---------- Cierre de mano ----------
    if (state.phase === 'handEnd') {
      this.dim(0.74, 32);
      this.panel(58, 68, W - 116, 128, COLORS.woodDark, COLORS.gold, true);
      drawTextCenteredShadow(ctx, 'MANO TERMINADA', W / 2, 78, COLORS.gold, 2);
      const won = state.lastHand?.winner === human;
      drawTextCentered(ctx, won ? 'GANASTE LA MANO' : `GANA ${rivalLabel}`, W / 2, 104, won ? COLORS.green : COLORS.red, 2);
      if (state.lastHand) {
        drawTextCentered(ctx, `+${state.lastHand.points} PUNTOS - ${state.lastHand.reason.toUpperCase()}`, W / 2, 130, COLORS.cream);
      }
      if (state.envidoResult) {
        const who = state.envidoResult.winner === human ? 'VOS' : rivalLabel;
        drawTextCentered(ctx, `ENVIDIO ${state.envidoResult.score}: ${who} +${state.envidoResult.prize}`, W / 2, 146, COLORS.pink);
      }
      hits.push(this.button('action:nextHand', 'SIGUIENTE MANO', 145, 158, 190, 26, '#277a4c', COLORS.white, 2, hover === 'action:nextHand'));
    }

    // ---------- Fin de partida ----------
    if (state.phase === 'gameEnd') {
      this.dim(0.8, 32);
      const won = state.winner === human;
      for (let i = 0; i < 11; i++) {
        const sx = 36 + ((i * 61 + Math.floor(this.time * 19)) % (W - 72));
        const sy = 44 + ((i * 37 + Math.floor(this.time * 13)) % 150);
        drawSparkle(ctx, sx, sy, i % 2 ? COLORS.gold : COLORS.pink);
      }
      this.panel(48, 54, W - 96, 156, COLORS.woodDark, COLORS.gold, true);
      drawTextCenteredShadow(ctx, won ? '¡GANASTE!' : 'PERDISTE', W / 2, 66, won ? COLORS.green : COLORS.red, 3);
      drawTextCentered(ctx, `${state.scores[0]} - ${state.scores[1]}`, W / 2, 106, COLORS.cream, 2);
      drawTextCentered(ctx, won ? 'SOS EL CAMPEON DEL TRUCO' : 'SUERTE EN LA PROXIMA', W / 2, 136, COLORS.gray);
      hits.push(this.button('action:restart', 'NUEVA PARTIDA', 145, 164, 190, 28, '#277a4c', COLORS.white, 2, hover === 'action:restart'));
    }

    return hits;
  }
}
