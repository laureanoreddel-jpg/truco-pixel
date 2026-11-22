import type { Difficulty } from '../core/ai';
import { cardLabel, envidoScore } from '../core/hand';
import { other, type GameAction, type GameState, type PlayerIndex } from '../core/types';
import { CARD_H, CARD_W, COLORS, drawAvatar, drawCard, drawCardBack, drawSuit, drawText, drawTextCentered, makeTable, pixelRect, textWidth } from './sprites';

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
  hover: string | null;
}

const DIFFICULTIES: Difficulty[] = ['facil', 'medio', 'dificil'];

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}.` : text;
}

export class Renderer {
  private readonly table: HTMLCanvasElement;

  constructor(private readonly ctx: CanvasRenderingContext2D, private readonly width: number, private readonly height: number) {
    this.table = makeTable(width, height);
  }

  clear(): void {
    this.ctx.drawImage(this.table, 0, 0);
  }

  private panel(x: number, y: number, w: number, h: number, fill = COLORS.panel, border = COLORS.woodLight): void {
    pixelRect(this.ctx, x + 2, y + 2, w - 4, h - 4, 'rgba(0,0,0,0.45)');
    pixelRect(this.ctx, x, y, w, h, border);
    pixelRect(this.ctx, x + 1, y + 1, w - 2, h - 2, fill);
    this.ctx.fillStyle = 'rgba(255,255,255,0.10)';
    this.ctx.fillRect(x + 3, y + 2, w - 6, 1);
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
  ): HitBox {
    this.panel(x, y, w, h, color, COLORS.ink);
    drawTextCentered(this.ctx, label, x + w / 2, y + Math.floor((h - 7 * scale) / 2), textColor, scale);
    return { id, x, y, w, h };
  }

  drawMenu(difficulty: Difficulty): HitBox[] {
    this.clear();
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(9, 7, 14, 0.78)';
    ctx.fillRect(0, 0, this.width, this.height);

    drawTextCentered(ctx, 'TRUCO PIXEL', this.width / 2, 26, COLORS.gold, 4);
    drawTextCentered(ctx, 'TRUCO ARGENTINO SIMPLIFICADO', this.width / 2, 66, COLORS.cream);
    drawTextCentered(ctx, 'A 15 PUNTOS  -  ELIGE TU MODO', this.width / 2, 80, COLORS.gray);

    const hits: HitBox[] = [];
    hits.push(this.button('menu:local', '1 JUGADOR', 110, 96, 180, 26, COLORS.red, COLORS.white, 2));
    hits.push(this.button('menu:online', 'MULTIJUGADOR', 110, 130, 180, 26, '#2b8a5c', COLORS.white, 2));

    drawTextCentered(ctx, 'DIFICULTAD', this.width / 2, 170, COLORS.gray);
    const labels: Record<Difficulty, string> = { facil: 'FACIL', medio: 'MEDIO', dificil: 'DIFICIL' };
    DIFFICULTIES.forEach((level, i) => {
      const selected = level === difficulty;
      hits.push(
        this.button(
          `diff:${level}`,
          labels[level],
          86 + i * 78,
          184,
          72,
          17,
          selected ? COLORS.gold : COLORS.panelLight,
          selected ? COLORS.ink : COLORS.cream,
        ),
      );
    });
    hits.push(this.button('menu:help', 'COMO JUGAR', 140, 204, 120, 15, COLORS.panel, COLORS.pink));
    return hits;
  }

  drawOnline(info: { code: string; status: string; connected: boolean }): HitBox[] {
    this.clear();
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(9, 7, 14, 0.84)';
    ctx.fillRect(0, 0, this.width, this.height);
    this.panel(38, 24, 324, 176, COLORS.panel, COLORS.gold);

    drawTextCentered(ctx, 'MULTIJUGADOR', this.width / 2, 36, COLORS.gold, 2);
    const hits: HitBox[] = [];
    if (!info.code) {
      drawTextCentered(ctx, 'CREA UNA SALA O INGRESA UN CODIGO', this.width / 2, 66, COLORS.cream);
      hits.push(this.button('online:create', 'CREAR SALA', 74, 92, 116, 22, '#2b8a5c', COLORS.white));
      hits.push(this.button('online:join', 'UNIRSE', 210, 92, 116, 22, COLORS.red, COLORS.white));
      drawTextCentered(ctx, 'COMPARTI EL CODIGO CON TU AMIGO', this.width / 2, 136, COLORS.gray);
    } else {
      drawTextCentered(ctx, 'CODIGO DE SALA', this.width / 2, 64, COLORS.gray);
      this.panel(130, 78, 140, 32, COLORS.woodDark, COLORS.gold);
      drawTextCentered(ctx, info.code, this.width / 2, 85, COLORS.gold, 3);
      drawTextCentered(
        ctx,
        info.connected ? 'RIVAL CONECTADO - A JUGAR' : 'ESPERANDO AL RIVAL...',
        this.width / 2,
        124,
        info.connected ? COLORS.green : COLORS.cream,
      );
      hits.push(this.button('online:copy', 'COPIAR', 74, 146, 116, 18));
      hits.push(this.button('online:back', 'VOLVER', 210, 146, 116, 18, COLORS.redDark, COLORS.white));
    }
    drawTextCentered(ctx, clip(info.status, 62), this.width / 2, 182, COLORS.pink);
    return hits;
  }

  drawHelp(): HitBox[] {
    this.clear();
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(9, 7, 14, 0.88)';
    ctx.fillRect(0, 0, this.width, this.height);
    this.panel(10, 10, this.width - 20, this.height - 20, COLORS.panel, COLORS.gold);
    drawTextCentered(ctx, 'COMO JUGAR', this.width / 2, 20, COLORS.gold, 2);

    const lines = [
      'CARTAS: 1 ESPADA > 1 BASTO > 7 ESPADA',
      '7 ORO > 1 ORO > 7 COPA > 7 BASTO',
      'LUEGO 6 > 5 > 4 > 3 > 2 > 1 COPA',
      'Y POR ULTIMO 12 > 11 > 10',
      '',
      'RONDAS: GANÁ 2 DE 3. EMPATE = DOBLE',
      'ENVIDIO: 20 + 2 CARTAS DEL MISMO PALO',
      'REAL SUMA 3. FALTA APUESTA LO QUE',
      'TE FALTA PARA LLEGAR A 15 PUNTOS',
      'TRUCO 1 - RETRUCO 2 - VALE CUATRO 3',
      'IR AL MAZO: TE RENDIS, GANA EL RIVAL',
      'H: AYUDA   ESC: MENU',
    ];
    lines.forEach((line, i) => {
      if (line) drawText(ctx, line, 24, 44 + i * 12, i % 2 === 0 ? COLORS.cream : COLORS.pink);
    });
    return [this.button('help:back', 'VOLVER', 140, 196, 120, 17, COLORS.redDark, COLORS.white)];
  }

  drawGame(state: GameState, view: GameView): HitBox[] {
    this.clear();
    const ctx = this.ctx;
    const human = view.human;
    const rival = other(human);
    const rivalLabel = view.mode === 'local' ? 'IA' : 'RIVAL';
    const W = this.width;
    const hits: HitBox[] = [];

    // Barra superior
    ctx.fillStyle = COLORS.woodDark;
    ctx.fillRect(0, 0, W, 16);
    ctx.fillStyle = COLORS.woodLight;
    ctx.fillRect(0, 15, W, 1);
    drawText(ctx, 'TRUCO PIXEL', 8, 4, COLORS.gold, 2);
    drawText(ctx, `VOS ${String(state.scores[human]).padStart(2, '0')}`, 180, 4, COLORS.green, 2);
    drawText(ctx, `${rivalLabel} ${String(state.scores[rival]).padStart(2, '0')}`, 268, 4, COLORS.red, 2);
    drawText(ctx, `/${state.targetScore}`, 364, 4, COLORS.gray);
    hits.push({ id: 'game:help', x: 116, y: 0, w: 58, h: 16 });
    hits.push({ id: 'game:menu', x: 352, y: 0, w: 48, h: 16 });

    // Panel del rival
    this.panel(4, 20, 118, 44, 'rgba(24, 18, 30, 0.92)', COLORS.woodLight);
    drawAvatar(ctx, view.mode === 'local' ? 'rival' : 'player', 10, 24, 3);
    drawText(ctx, rivalLabel, 54, 25, COLORS.cream, 2);
    drawText(ctx, `CARTAS ${state.hands[rival].length}`, 54, 44, COLORS.gray);
    if (state.turn === rival && state.phase === 'playing' && !state.pending) {
      drawText(ctx, 'TURNO', 54, 55, COLORS.gold);
    }

    // Cartas jugadas (la ronda 3 ya avanzó a índice 3 al cerrar la mano).
    const shownRound = Math.min(state.round, 2);
    const shownPlayed = state.played[shownRound];
    const rivalPlayed = shownPlayed[rival];
    if (rivalPlayed) drawCard(ctx, rivalPlayed, 130, 22);
    else if (shownPlayed[human]) drawCardBack(ctx, 130, 22);
    const humanPlayed = shownPlayed[human];
    if (humanPlayed) drawCard(ctx, humanPlayed, 130, 92);
    else if (shownPlayed[rival]) drawCardBack(ctx, 130, 92);

    // Información lateral izquierda
    const envidoHuman = envidoScore(state.hands[human]).points;
    const envidoRival = envidoScore(state.hands[rival]).points;
    this.panel(4, 70, 114, 40, 'rgba(16, 32, 24, 0.88)', COLORS.feltLight);
    drawText(ctx, `TU ENVIDIO ${envidoHuman}`, 10, 75, COLORS.pink);
    drawText(ctx, `${rivalLabel} ${envidoRival}`, 10, 87, COLORS.gray);
    drawText(ctx, `RONDAS ${state.roundWins[human]}-${state.roundWins[rival]}`, 10, 99, COLORS.cream);

    // Información central derecha
    if (state.trucoLevel > 0) drawText(ctx, `TRUCO ${state.trucoLevel}`, 172, 24, COLORS.gold, 2);
    if (state.envidoPot > 0) drawText(ctx, `BOLSA ENVIDIO ${state.envidoPot}`, 172, 42, COLORS.pink);
    if (state.envidoResult) {
      const who = state.envidoResult.winner === human ? 'VOS' : rivalLabel;
      drawText(ctx, `ENVIDIO ${state.envidoResult.score} - ${who}`, 172, 54, COLORS.gold);
    }
    if (!state.pending) {
      drawText(ctx, clip(state.lastEvent, 54), 172, 68, COLORS.cream);
      if (view.notice) drawText(ctx, clip(view.notice, 54), 172, 80, COLORS.gold);
    }

    if (state.pending) {
      const p = state.pending;
      const label = p.kind === 'truco'
        ? p.level === 1 ? '¿TRUCO?' : p.level === 2 ? '¿RETRUCO?' : '¿VALE CUATRO?'
        : p.level === 3 ? '¿FALTA ENVIDO?' : p.level === 2 ? '¿REAL ENVIDO?' : '¿ENVIDO?';
      const detail = p.kind === 'envido' ? `BOLSA ${p.potAfter}  -  TUS PUNTOS ${envidoHuman}` : `VALE ${p.level}`;
      this.panel(148, 62, 232, 38, COLORS.redDark, COLORS.gold);
      drawTextCentered(ctx, label, W / 2, 68, COLORS.white, 2);
      drawTextCentered(ctx, detail, W / 2, 87, COLORS.cream);
    }

    if (state.phase === 'gameEnd') {
      this.panel(60, 52, W - 120, 68, COLORS.woodDark, COLORS.gold);
      drawTextCentered(ctx, state.winner === human ? 'GANASTE!' : 'PERDISTE', W / 2, 62, state.winner === human ? COLORS.green : COLORS.red, 3);
      drawTextCentered(ctx, `${state.scores[0]} - ${state.scores[1]}`, W / 2, 94, COLORS.cream, 2);
    }

    // Mano del jugador
    const hand = state.hands[human];
    const spacing = 36;
    const startX = Math.round((W - ((hand.length - 1) * spacing + CARD_W)) / 2);
    let hovered: string | null = null;
    hand.forEach((card, i) => {
      const x = startX + i * spacing;
      const canPlay = view.legal.some((a) => a.type === 'playCard' && a.cardId === card.id);
      const isHover = view.hover === card.id;
      if (isHover) hovered = card.id;
      drawCard(ctx, card, x, 132, canPlay || isHover);
      if (canPlay) hits.push({ id: `card:${card.id}`, x, y: 132, w: CARD_W, h: CARD_H });
    });

    if (hovered) {
      const card = hand.find((c) => c.id === hovered)!;
      const label = cardLabel(card);
      this.panel(W / 2 - textWidth(label) / 2 - 5, 120, textWidth(label) + 10, 12, COLORS.panel, COLORS.gold);
      drawTextCentered(ctx, label, W / 2, 122, COLORS.gold);
    } else if (state.turn === human && state.phase === 'playing' && !state.pending) {
      drawTextCentered(ctx, 'TU TURNO - ELEGÍ UNA CARTA', W / 2, 122, COLORS.green);
    }

    if (state.phase === 'handEnd') {
      ctx.fillStyle = 'rgba(9, 7, 14, 0.78)';
      ctx.fillRect(0, 16, W, this.height - 16);
      this.panel(58, 56, W - 116, 100, COLORS.woodDark, COLORS.gold);
      drawTextCentered(ctx, 'MANO TERMINADA', W / 2, 66, COLORS.gold, 2);
      drawTextCentered(ctx, clip(state.lastEvent, 48), W / 2, 92, COLORS.cream);
      hits.push(this.button('action:nextHand', 'SIGUIENTE MANO', 120, 114, 160, 24, '#2b8a5c', COLORS.white));
      drawTextCentered(ctx, 'TOCÁ PARA SEGUIR', W / 2, 145, COLORS.gray);
    }

    // Botones de acción
    const actions = view.legal.filter((a) => a.type !== 'playCard' && !(state.phase === 'handEnd' && a.type === 'nextHand'));
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
      nextHand: { label: 'SIGUIENTE', color: '#2b8a5c', text: COLORS.white },
      restart: { label: 'NUEVA PARTIDA', color: '#2b8a5c', text: COLORS.white },
    };
    const labels: Array<{ type: GameAction['type']; label: string; color: string; text: string }> = [];
    for (const action of actions) {
      const def = defs[action.type];
      if (def?.label && !labels.some((l) => l.label === def.label)) labels.push({ type: action.type, ...def });
    }
    if (labels.length > 0) {
      const perRow = Math.min(5, labels.length);
      const rows = Math.ceil(labels.length / perRow);
      const w = Math.min(108, Math.floor((W - 16 - (perRow - 1) * 5) / perRow));
      labels.forEach((def, i) => {
        const row = Math.floor(i / perRow);
        const col = i % perRow;
        const count = Math.min(perRow, labels.length - row * perRow);
        const total = count * w + (count - 1) * 5;
        const x = Math.round((W - total) / 2) + col * (w + 5);
        const y = 184 - (rows - 1) * 22 + row * 22;
        hits.push(this.button(`action:${def.type}`, def.label, x, y, w, 18, def.color, def.text));
      });
    }

    // Pequeño escudo decorativo en la mesa.
    ctx.globalAlpha = 0.25;
    drawSuit(ctx, 'oro', 184, 100, 1);
    ctx.globalAlpha = 1;
    return hits;
  }

  static measure(text: string, scale = 1): number {
    return textWidth(text, scale);
  }
}
