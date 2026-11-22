import type { Difficulty } from './ai';

export interface StoryOpponent {
  id: string;
  name: string;
  title: string;
  difficulty: Difficulty;
  /** Color de la camisa del rival en la mesa. */
  color: string;
  intro: string;
  win: string;
  lose: string;
}

/**
 * Campaña de un jugador: cinco duelos antes del campeón final.
 * Cada rival usa la IA con una dificultad distinta.
 */
export const STORY_OPPONENTS: StoryOpponent[] = [
  {
    id: 'carlos',
    name: 'CARLOS',
    title: 'EL QUE SIEMPRE CANTÁ PRIMERO',
    difficulty: 'facil',
    color: '#c84348',
    intro: '¿Vos jugás truco? Yo lo inventé. Sentate, nene.',
    win: 'Carlos se rinde el mate. "Tuviste suerte... esta vez."',
    lose: 'Carlos se ríe: "Aprendé a cantar, principiante."',
  },
  {
    id: 'nena',
    name: 'LA NENA',
    title: 'LA QUE NUNCA TE CREE EL ENVIDIO',
    difficulty: 'facil',
    color: '#d16b9c',
    intro: 'No te ilusiones, lindo. Yo también sé contar cartas.',
    win: 'La Nena te guiña un ojo. "Estás empezando a entender."',
    lose: 'La Nena sonríe: "Te comiste el envido, lindo."',
  },
  {
    id: 'pepe',
    name: 'TIO PEPE',
    title: 'EL DE LA BOLSA Y EL MATE',
    difficulty: 'medio',
    color: '#b8862b',
    intro: 'Traje el mate y la bolsa. Vamos a ver si aguantás el retruco.',
    win: 'Tío Pepe te alcanza el mate. "Bien ahí, sobrino."',
    lose: 'Tío Pepe dice: "La bolsa la gana quien no duda."',
  },
  {
    id: 'bruja',
    name: 'LA BRUJA',
    title: 'LA DEL ENVIDO IMPOSIBLE',
    difficulty: 'medio',
    color: '#7b4ea8',
    intro: 'Tengo 33 escondidos. ¿Te animás a cantar falta?',
    win: 'La Bruja guarda sus cartas. "Me ganaste... con truco."',
    lose: 'La Bruja susurra: "No debiste aceptar mi falta."',
  },
  {
    id: 'campeon',
    name: 'EL CAMPEON',
    title: 'EL QUE NUNCA PIERDE EN CASA',
    difficulty: 'dificil',
    color: '#8f2a32',
    intro: 'Acá se decide quién manda. Sentate derecho y jugá.',
    win: 'El Campeón se levanta. "El truco es tuyo, campeón."',
    lose: 'El Campeón dice: "Volvé cuando sepas ir al mazo."',
  },
];

const PROGRESS_KEY = 'truco-historia-progreso';

export function isStoryUnlocked(progress: number, index: number): boolean {
  return index <= progress && index < STORY_OPPONENTS.length;
}

/** Devuelve el máximo capítulo desbloqueado (0 = el primero). */
export function loadStoryProgress(): number {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const value = raw === null ? 0 : Number(raw);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(STORY_OPPONENTS.length, Math.floor(value)));
  } catch {
    return 0;
  }
}

export function saveStoryProgress(progress: number): void {
  try {
    localStorage.setItem(PROGRESS_KEY, String(progress));
  } catch {
    // Almacenamiento no disponible: la campaña sigue funcionando en memoria.
  }
}

/** Desbloquea el capítulo siguiente al ganar. */
export function markStoryWin(progress: number, index: number): number {
  return Math.min(STORY_OPPONENTS.length, Math.max(progress, index + 1));
}
