import type { GameAction, GameState, PlayerIndex } from '../core/types';

export type ServerMessage =
  | { type: 'welcome'; player: PlayerIndex; token: string; code: string; state: GameState | null }
  | { type: 'state'; state: GameState }
  | { type: 'opponent'; connected: boolean }
  | { type: 'error'; message: string };

export type ClientMessage =
  | { type: 'create' }
  | { type: 'join'; code: string }
  | { type: 'action'; action: GameAction };

export class NetClient {
  private ws: WebSocket | null = null;
  onMessage?: (message: ServerMessage) => void;
  onClose?: () => void;

  connect(token?: string): void {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as ServerMessage;
        this.onMessage?.(message);
      } catch {
        // Ignora mensajes mal formados.
      }
    };
    ws.onclose = () => this.onClose?.();
    ws.onerror = () => this.onClose?.();
  }

  private send(message: ClientMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(message));
    return true;
  }

  create(): boolean {
    return this.send({ type: 'create' });
  }

  join(code: string): boolean {
    return this.send({ type: 'join', code });
  }

  action(action: GameAction): boolean {
    return this.send({ type: 'action', action });
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }
}
