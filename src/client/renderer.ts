import type { Difficulty } from '../core/ai';
import { cardLabel, cardStrength, envidoScore } from '../core/hand';
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

const DIFFICULTIES: Difficulty[] = ['facil', 'medio', 'dificil'];

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}.` : text;
}

function rightText(ctx: CanvasRenderingContext2D, text: string, right: number, y: number, color: string, scale = 1): void {
  drawText(ctx, text, right - textWidth(text, scale), y, color, scale);
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
    this.dim(0.72);

    // Cartas decorativas a los costados.
    drawCard(ctx, { id: 'deco-1', rank: 1, suit: 'espada' }, 12, 92, false);
    drawCard(ctx, { id: 'deco-2', rank: 7, suit: 'oro' }, 358, 92, false);

    drawTextCenteredShadow(ctx, 'FALTA ENVIDO', this.width / 2, 16, COLORS.gold, 3);
    drawTextCenteredShadow(ctx, 'Y TRUCOOO', this.width / 2, 42, COLORS.cream, 3);
    drawTextCentered(ctx, 'TRUCO ARGENTINO - A 15 PUNTOS', this.width / 2, 70, COLORS.gray);

    const hits: HitBox[] = [];
    hits.push(this.button('menu:local', '1 JUGADOR', 64, 84, 272, 26, COLORS.red, COLORS.white, 2, hover === 'menu:local'));
    hits.push(this.button('menu:online', 'MULTIJUGADOR', 64, 116, 272, 26, '#277a4c', COLORS.white, 2, hover === 'menu:online'));

    drawTextCentered(ctx, 'DIFICULTAD', this.width / 2, 152, COLORS.gray);
    const labels: Record<Difficulty, string> = { facil: 'FACIL', medio: 'MEDIO', dificil: 'DIFICIL' };
    DIFFICULTIES.forEach((level, i) => {
      const id = `diff:${level}`;
      const selected = level === difficulty;
      hits.push(
        this.button(
          id,
          labels[level],
          38 + i * 112,
          166,
          104,
          20,
          selected ? COLORS.gold : COLORS.panelLight,
          selected ? COLORS.ink : COLORS.cream,
          1,
          hover === id,
        ),
      );
    });
    hits.push(this.button('menu:help', 'COMO JUGAR', 140, 194, 120, 18, COLORS.navy, COLORS.gold, 1, hover === 'menu:help'));
    return hits;
  }

  drawOnline(info: { code: string; status: string; connected: boolean }, hover: string | null = null): HitBox[] {
    this.clear();
    const ctx = this.ctx;
    this.dim(0.8);
    this.panel(28, 18, 344, 190, COLORS.panel, COLORS.gold, true);

    drawTextCenteredShadow(ctx, 'MULTIJUGADOR', this.width / 2, 28, COLORS.gold, 2);
    const hits: HitBox[] = [];
    if (!info.code) {
      drawTextCentered(ctx, 'CREA UNA SALA Y PASALE EL CODIGO', this.width / 2, 58, COLORS.cream);
      hits.push(this.button('online:create', 'CREAR SALA', 46, 86, 144, 28, '#277a4c', COLORS.white, 2, hover === 'online:create'));
      hits.push(this.button('online:join', 'UNIRSE', 210, 86, 144, 28, COLORS.red, COLORS.white, 2, hover === 'online:join'));
      drawTextCentered(ctx, 'DOS JUGADORES - UNA SOLA PARTIDA', this.width / 2, 134, COLORS.gray);
      drawTextCentered(ctx, 'EL CODIGO TIENE 4 LETRAS', this.width / 2, 148, COLORS.gray);
    } else {
      drawTextCentered(ctx, 'CODIGO DE SALA', this.width / 2, 52, COLORS.gray);
      this.panel(120, 66, 160, 34, COLORS.woodDark, COLORS.gold, true);
      drawTextCenteredShadow(ctx, info.code, this.width / 2, 73, COLORS.gold, 3);
      drawTextCentered(
        ctx,
        info.connected ? 'RIVAL CONECTADO - A JUGAR' : 'ESPERANDO AL RIVAL...',
        this.width / 2,
        112,
        info.connected ? COLORS.green : COLORS.cream,
      );
      hits.push(this.button('online:copy', 'COPIAR', 46, 134, 144, 24, COLORS.panelLight, COLORS.cream, 1, hover === 'online:copy'));
      hits.push(this.button('online:back', 'VOLVER', 210, 134, 144, 24, COLORS.redDark, COLORS.white, 1, hover === 'online:back'));
    }
    drawTextCentered(ctx, clip(info.status, 54), this.width / 2, 180, COLORS.pink);
    return hits;
  }

  drawHelp(hover: string | null = null): HitBox[] {
    this.clear();
    const ctx = this.ctx;
    this.dim(0.86);
    this.panel(8, 7, 384, 211, COLORS.panel, COLORS.gold, true);
    drawTextCenteredShadow(ctx, 'COMO JUGAR', this.width / 2, 15, COLORS.gold, 2);

    const left = [
      'JERARQUIA (MAYOR A MENOR)',
      '1 ESPADA - 1 BASTO',
      '7 ESPADA - 7 ORO',
      '3 - 2 - 1 ORO Y COPA',
      '12 - 11 - 10',
      '7 COPA Y BASTO - 6 - 5 - 4',
      '',
      'ENVIDIO',
      '20 + 2 CARTAS DEL MISMO PALO',
      'REAL SUMA 3 PUNTOS',
      'FALTA = LO QUE TE FALTA',
    ];
    const right = [
      'RONDAS',
      'GANÁ 2 DE 3 CARTAS',
      'EMPATE = RONDA DOBLE',
      '',
      'TRUCO Y ESCALADA',
      'TRUCO 1 - RETRUCO 2 - VALE 4',
      'IR AL MAZO ES RENDIRSE',
      '',
      'TECLAS',
      '1/2/3 CARTAS - E ENVIDIO',
      'T TRUCO - F FALTA - N NO',
      'H AYUDA - ENTER MANO',
    ];

    left.forEach((line, i) => {
      if (line) drawText(ctx, line, 18, 40 + i * 12, i === 0 || line === 'ENVIDIO' ? COLORS.gold : COLORS.cream);
    });
    right.forEach((line, i) => {
      if (line) drawText(ctx, line, 204, 40 + i * 12, ['RONDAS', 'TRUCO Y ESCALADA', 'TECLAS'].includes(line) ? COLORS.gold : COLORS.cream);
    });

    return [this.button('help:back', 'VOLVER', 140, 192, 120, 18, COLORS.redDark, COLORS.white, 1, hover === 'help:back')];
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

    // ---------- HUD superior ----------
    ctx.fillStyle = COLORS.woodDark;
    ctx.fillRect(0, 0, W, 30);
    ctx.fillStyle = COLORS.woodLight;
    ctx.fillRect(0, 29, W, 1);

    hits.push({ id: 'game:help', x: 5, y: 4, w: 20, h: 20 });
    this.panel(5, 4, 20, 20, hover === 'game:help' ? COLORS.red : COLORS.redDark, COLORS.gold);
    drawTextCentered(ctx, 'FET', 15, 10, COLORS.gold, 1);

    drawText(ctx, 'VOS', 31, 2, COLORS.gray);
    drawTextShadow(ctx, String(state.scores[human]).padStart(2, '0'), 31, 10, COLORS.green, 2);
    drawScoreBar(ctx, 31, 26, 68, state.scores[human], state.targetScore, COLORS.green);

    drawTextCentered(ctx, `MANO ${String(state.handNumber).padStart(2, '0')}`, W / 2, 3, COLORS.cream);
    drawTextCentered(ctx, `A ${state.targetScore} PUNTOS`, W / 2, 16, COLORS.gray);

    rightText(ctx, `${rivalLabel} ${String(state.scores[rival]).padStart(2, '0')}`, W - 30, 4, COLORS.red, 2);
    drawScoreBar(ctx, W - 102, 26, 72, state.scores[rival], state.targetScore, COLORS.red);
    hits.push({ id: 'game:menu', x: W - 24, y: 4, w: 20, h: 20 });
    this.panel(W - 24, 4, 20, 20, hover === 'game:menu' ? COLORS.redDark : COLORS.panel, COLORS.gold);
    drawTextCentered(ctx, 'X', W - 14, 9, COLORS.cream, 2);

    // ---------- Panel del rival ----------
    this.panel(6, 34, 112, 44, 'rgba(26, 19, 34, 0.94)', COLORS.woodLight);
    drawAvatar(ctx, view.mode === 'local' ? 'rival' : 'player', 12, 38, 3);
    drawText(ctx, rivalLabel, 54, 38, COLORS.cream, 2);
    drawText(ctx, `CARTAS ${state.hands[rival].length}`, 54, 56, COLORS.gray);
    if (state.turn === rival && state.phase === 'playing' && !state.pending) {
      drawBadge(ctx, 'TURNO', 54, 66, COLORS.goldDark);
    }

    // ---------- Cartas jugadas ----------
    this.panel(124, 32, 36, 48, 'rgba(8, 32, 23, 0.55)', COLORS.goldDark);
    this.panel(124, 82, 36, 48, 'rgba(8, 32, 23, 0.55)', COLORS.goldDark);
    const shownRound = Math.min(state.round, 2);
    const shownPlayed = state.played[shownRound];
    const rivalPlayed = shownPlayed[rival];
    if (rivalPlayed) drawCard(ctx, rivalPlayed, 127, 35);
    else if (shownPlayed[human]) drawCardBack(ctx, 127, 35);
    const humanPlayed = shownPlayed[human];
    if (humanPlayed) drawCard(ctx, humanPlayed, 127, 85);
    else if (shownPlayed[rival]) drawCardBack(ctx, 127, 85);

    // ---------- Estado de la mano ----------
    this.panel(168, 32, 226, 48, 'rgba(16, 12, 24, 0.88)', COLORS.woodLight);
    if (state.pending) {
      const p = state.pending;
      const label = p.kind === 'truco'
        ? p.level === 1 ? '¿TRUCO?' : p.level === 2 ? '¿RETRUCO?' : '¿VALE CUATRO?'
        : p.level === 3 ? '¿FALTA ENVIDO?' : p.level === 2 ? '¿REAL ENVIDO?' : '¿ENVIDO?';
      const detail = p.kind === 'envido' ? `BOLSA ${p.potAfter} - TU ENVIDIO ${envidoScore(state.hands[human]).points}` : `EL RIVAL TE DESAFIA`;
      drawTextCenteredShadow(ctx, label, 281, 38, COLORS.gold, 2);
      drawTextCentered(ctx, detail, 281, 62, COLORS.cream);
    } else {
      let bx = 174;
      if (state.trucoLevel > 0) bx += drawBadge(ctx, `TRUCO ${state.trucoLevel}`, bx, 37, COLORS.redDark) + 4;
      if (state.envidoPot > 0) bx += drawBadge(ctx, `BOLSA ${state.envidoPot}`, bx, 37, COLORS.pink) + 4;
      if (state.mano === human) bx += drawBadge(ctx, 'MANO', bx, 37, COLORS.goldDark) + 4;
      drawText(ctx, clip(state.lastEvent, 36), 174, 56, COLORS.cream);
      if (state.envidoResult) {
        const who = state.envidoResult.winner === human ? 'VOS' : rivalLabel;
        drawText(ctx, `ENVIDIO ${state.envidoResult.score}: ${who} +${state.envidoResult.prize}`, 174, 69, COLORS.gold);
      } else if (view.notice) {
        drawText(ctx, clip(view.notice, 36), 174, 69, COLORS.pink);
      }
    }

    // ---------- Info del jugador + tracker de rondas ----------
    this.panel(6, 82, 112, 46, 'rgba(14, 30, 23, 0.9)', COLORS.feltLight);
    drawText(ctx, `TU ENVIDIO ${envidoScore(state.hands[human]).points}`, 11, 87, COLORS.pink);
    drawText(ctx, `${rivalLabel} ${envidoScore(state.hands[rival]).points}`, 11, 99, COLORS.gray);
    drawText(ctx, `RONDAS ${state.roundWins[human]}-${state.roundWins[rival]}`, 11, 111, COLORS.cream);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(11, 123, 3, 3);

    this.panel(168, 82, 226, 46, 'rgba(16, 12, 24, 0.82)', COLORS.woodLight);
    drawText(ctx, 'RONDAS', 174, 86, COLORS.gray);
    for (let r = 0; r < 3; r++) {
      const round = state.played[r];
      let label = `R${r + 1} `;
      let color = COLORS.panelLight;
      if (round[0] && round[1]) {
        const w = this.roundWinnerForDisplay(round[0], round[1]);
        label += w === 'EMP' ? 'EMP' : (w === 'P1') === (human === 0) ? 'VOS' : rivalLabel;
        color = w === 'EMP' ? COLORS.goldDark : (w === 'P1') === (human === 0) ? '#277a4c' : COLORS.redDark;
      } else {
        label += '-';
      }
      drawBadge(ctx, label, 174 + r * 72, 97, color);
    }
    const pulse = 0.6 + 0.4 * Math.sin(this.time * 5);
    if (state.phase === 'playing' && !state.pending) {
      if (state.turn === human) {
        ctx.globalAlpha = pulse;
        drawText(ctx, '> TU TURNO', 174, 114, COLORS.green);
        ctx.globalAlpha = 1;
      } else {
        drawText(ctx, `${rivalLabel} PENSANDO${'.'.repeat(1 + Math.floor(this.time * 2) % 3)}`, 174, 114, COLORS.gray);
      }
    } else if (state.phase === 'playing') {
      drawText(ctx, 'RESPONDÉ ABAJO', 174, 114, COLORS.gold);
    }

    // ---------- Mano del jugador ----------
    const hand = state.hands[human];
    const spacing = 38;
    const startX = Math.round((W - ((hand.length - 1) * spacing + CARD_W)) / 2);
    let hoveredCard: Card | null = null;
    hand.forEach((card, i) => {
      const x = startX + i * spacing;
      const id = `card:${card.id}`;
      const canPlay = view.legal.some((a) => a.type === 'playCard' && a.cardId === card.id);
      const isHover = hover === id;
      if (isHover && canPlay) hoveredCard = card;
      drawCard(ctx, card, x, 140, canPlay || isHover, isHover && canPlay ? 5 : 0);
      if (canPlay) hits.push({ id, x, y: 132, w: CARD_W, h: CARD_H + 8 });
    });

    if (hoveredCard && view.legal.some((a) => a.type === 'playCard' && a.cardId === hoveredCard!.id)) {
      const label = cardLabel(hoveredCard);
      const w = textWidth(label) + 10;
      const tx = Math.max(6, Math.min(W - w - 6, Math.round(W / 2 - w / 2)));
      drawPanel(ctx, tx, 122, w, 12, COLORS.woodDark, COLORS.gold);
      drawTextCentered(ctx, label, W / 2, 124, COLORS.gold);
    }

    // ---------- Botones de acción ----------
    const actions = view.legal.filter((a) => a.type !== 'playCard' && a.type !== 'nextHand' && a.type !== 'restart');
    const defs: Record<GameAction['type'], { label: string; color: string; text: string }> = {
      callEnvido: { label: 'ENVIDO +2', color: '#8b6b1f', text: COLORS.white },
      callRealEnvido: { label: 'REAL +3', color: '#9a6a1d', text: COLORS.white },
      callFalta: { label: 'FALTA', color: '#7d4a12', text: COLORS.white },
      callTruco: { label: 'TRUCO', color: COLORS.red, text: COLORS.white },
      raiseTruco: { label: state.trucoLevel > 0 ? 'SUBIR' : 'RETRUCO', color: COLORS.redDark, text: COLORS.white },
      fold: { label: 'IR AL MAZO', color: '#464652', text: COLORS.white },
      acceptTruco: { label: 'QUIERO', color: '#277a4c', text: COLORS.white },
      acceptEnvido: { label: 'QUIERO', color: '#277a4c', text: COLORS.white },
      declineTruco: { label: 'NO QUIERO', color: '#6d2b31', text: COLORS.white },
      declineEnvido: { label: 'NO QUIERO', color: '#6d2b31', text: COLORS.white },
      playCard: { label: '', color: COLORS.panelLight, text: COLORS.cream },
      nextHand: { label: 'SIGUIENTE', color: '#277a4c', text: COLORS.white },
      restart: { label: 'NUEVA PARTIDA', color: '#277a4c', text: COLORS.white },
    };
    const labels: Array<{ type: GameAction['type']; label: string; color: string; text: string }> = [];
    for (const action of actions) {
      const def = defs[action.type];
      if (def?.label && !labels.some((l) => l.label === def.label)) labels.push({ type: action.type, ...def });
    }
    if (labels.length > 0) {
      const perRow = Math.min(5, labels.length);
      const rows = Math.ceil(labels.length / perRow);
      const w = Math.min(104, Math.floor((W - 16 - (perRow - 1) * 5) / perRow));
      labels.forEach((def, i) => {
        const row = Math.floor(i / perRow);
        const col = i % perRow;
        const count = Math.min(perRow, labels.length - row * perRow);
        const total = count * w + (count - 1) * 5;
        const x = Math.round((W - total) / 2) + col * (w + 5);
        const y = 186 - (rows - 1) * 22 + row * 22;
        const id = `action:${def.type}`;
        hits.push(this.button(id, def.label, x, y, w, 19, def.color, def.text, 1, hover === id));
      });
    }

    // ---------- Cierre de mano / partida ----------
    if (state.phase === 'handEnd') {
      this.dim(0.72, 30);
      this.panel(48, 60, 304, 106, COLORS.woodDark, COLORS.gold, true);
      drawTextCenteredShadow(ctx, 'MANO TERMINADA', W / 2, 70, COLORS.gold, 2);
      const won = state.lastHand?.winner === human;
      drawTextCentered(ctx, won ? 'GANASTE LA MANO' : `GANA ${rivalLabel.toUpperCase()}`, W / 2, 95, won ? COLORS.green : COLORS.red, 2);
      if (state.lastHand) {
        drawTextCentered(ctx, `+${state.lastHand.points}  ${state.lastHand.reason.toUpperCase()}`, W / 2, 117, COLORS.cream);
      }
      hits.push(this.button('action:nextHand', 'SIGUIENTE MANO', 110, 131, 180, 24, '#277a4c', COLORS.white, 2, hover === 'action:nextHand'));
    }

    if (state.phase === 'gameEnd') {
      this.dim(0.78, 30);
      const won = state.winner === human;
      for (let i = 0; i < 7; i++) {
        const sx = 60 + ((i * 61 + Math.floor(this.time * 17)) % 280);
        const sy = 44 + ((i * 37 + Math.floor(this.time * 11)) % 120);
        drawSparkle(ctx, sx, sy, i % 2 ? COLORS.gold : COLORS.pink);
      }
      this.panel(42, 50, 316, 120, COLORS.woodDark, COLORS.gold, true);
      drawTextCenteredShadow(ctx, won ? '¡GANASTE!' : 'PERDISTE', W / 2, 62, won ? COLORS.green : COLORS.red, 3);
      drawTextCentered(ctx, `${state.scores[0]} - ${state.scores[1]}`, W / 2, 96, COLORS.cream, 2);
      drawTextCentered(ctx, won ? 'SOS EL CAMPEON DEL TRUCO' : 'SUERTE LA PROXIMA', W / 2, 118, COLORS.gray);
      hits.push(this.button('action:restart', 'NUEVA PARTIDA', 110, 137, 180, 24, '#277a4c', COLORS.white, 2, hover === 'action:restart'));
    }

    return hits;
  }

  static measure(text: string, scale = 1): number {
    return textWidth(text, scale);
  }
}
