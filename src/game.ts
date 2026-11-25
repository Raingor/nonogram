export const EMPTY = 0;
export const FILLED = 1;
export const CROSSED = 2;
export type Cell = 0 | 1 | 2;

export interface Level {
  id: string;
  name: string;
  size: number;
  art: readonly string[];
  note: string;
}

const LEVELS: readonly Level[] = [
  {
    id: 'heart',
    name: '心形软糖',
    size: 5,
    art: ['01110', '11111', '11111', '01110', '00100'],
    note: '第一块甜头，先看横竖提示，再稳稳下笔。',
  },
  {
    id: 'star',
    name: '星星糖',
    size: 5,
    art: ['00100', '00100', '11111', '01110', '01010'],
    note: '试着先推出中间那一行，星角会慢慢浮出来。',
  },
  {
    id: 'house',
    name: '森林小屋',
    size: 5,
    art: ['00100', '01110', '11111', '10101', '10101'],
    note: '数屋檐和墙脚，别漏掉断开的小块。',
  },
  {
    id: 'mushroom',
    name: '蘑菇小屋',
    size: 10,
    art: [
      '0001110000',
      '0011111000',
      '0111111100',
      '1111111110',
      '1111111111',
      '0111111110',
      '0011111100',
      '0011011000',
      '0011011000',
      '0111011100',
    ],
    note: '大图别慌，先定左右最满的列，再慢慢收。',
  },
  {
    id: 'cat',
    name: '小猫面包',
    size: 10,
    art: [
      '1100000011',
      '1110000111',
      '1111111111',
      '1111111111',
      '1110110111',
      '1111111111',
      '1101111011',
      '1110000111',
      '0111111110',
      '0011111100',
    ],
    note: '耳朵和胡须都藏在提示里，慢慢对齐。',
  },
  {
    id: 'tulip',
    name: '郁金香与花盆',
    size: 10,
    art: [
      '0000100000',
      '0001110000',
      '0011111000',
      '0111111100',
      '1111111111',
      '0111111110',
      '0011111100',
      '0001110000',
      '0111111100',
      '1111111111',
    ],
    note: '对称的线索能帮你省下不少试笔的时间。',
  },
];

export const STORAGE_KEY = 'bear-nonogram-save-v1';

export function levels(): readonly Level[] {
  return LEVELS;
}

export function findLevel(id: string): Level | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function parseGrid(art: readonly string[], size: number): Cell[][] {
  if (art.length !== size) {
    throw new Error(`关卡图案需要 ${size} 行，实际收到 ${art.length} 行`);
  }
  const grid: Cell[][] = [];
  for (let row = 0; row < size; row += 1) {
    const line = art[row];
    if (typeof line !== 'string' || line.length !== size) {
      throw new Error(`关卡第 ${row + 1} 行需要 ${size} 个字符`);
    }
    const parsed: Cell[] = [];
    for (let col = 0; col < size; col += 1) {
      const value = line[col];
      if (value !== '0' && value !== '1') {
        throw new Error(`关卡第 ${row + 1} 行第 ${col + 1} 列只能是 0 或 1`);
      }
      parsed.push(value === '1' ? FILLED : EMPTY);
    }
    grid.push(parsed);
  }
  return grid;
}

export function solutionFor(level: Level): Cell[][] {
  return parseGrid(level.art, level.size);
}

export function cluesFor(line: readonly Cell[]): number[] {
  const runs: number[] = [];
  let count = 0;
  for (const value of line) {
    if (value === FILLED) {
      count += 1;
    } else if (count > 0) {
      runs.push(count);
      count = 0;
    }
  }
  if (count > 0) runs.push(count);
  return runs;
}

export function rowClues(grid: readonly Cell[][]): number[][] {
  return grid.map((row) => cluesFor(row));
}

export function columnClues(grid: readonly Cell[][]): number[][] {
  if (grid.length === 0) return [];
  const size = grid[0].length;
  const result: number[][] = [];
  for (let col = 0; col < size; col += 1) {
    result.push(cluesFor(grid.map((row) => row[col])));
  }
  return result;
}

export function createBoard(size: number): Cell[][] {
  return Array.from({ length: size }, () => Array<Cell>(size).fill(EMPTY));
}

export function setCell(board: readonly Cell[][], row: number, col: number, value: Cell): Cell[][] {
  const next = board.map((line) => line.slice());
  next[row][col] = value;
  return next;
}

export function toggleFill(board: readonly Cell[][], row: number, col: number): Cell[][] {
  const value = board[row][col];
  return setCell(board, row, col, value === FILLED ? EMPTY : FILLED);
}

export function toggleCross(board: readonly Cell[][], row: number, col: number): Cell[][] {
  const value = board[row][col];
  return setCell(board, row, col, value === CROSSED ? EMPTY : CROSSED);
}

export function applyAction(board: readonly Cell[][], row: number, col: number, action: 'fill' | 'cross'): Cell[][] {
  return action === 'fill' ? toggleFill(board, row, col) : toggleCross(board, row, col);
}

export function filledCount(board: readonly Cell[][]): number {
  let count = 0;
  for (const row of board) {
    for (const value of row) {
      if (value === FILLED) count += 1;
    }
  }
  return count;
}

export function isSolved(board: readonly Cell[][], solution: readonly Cell[][]): boolean {
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const value = board[row][col];
      if (value === FILLED) {
        if (solution[row][col] !== FILLED) return false;
      } else if (solution[row][col] === FILLED) {
        return false;
      }
    }
  }
  return true;
}

export function mistakeMask(board: readonly Cell[][], solution: readonly Cell[][]): Cell[][] {
  return board.map((row, rowIndex) =>
    row.map((value, colIndex) => (value === FILLED && solution[rowIndex][colIndex] === EMPTY ? FILLED : EMPTY)),
  );
}

export function mistakeCount(board: readonly Cell[][], solution: readonly Cell[][]): number {
  return mistakeMask(board, solution).flat().filter((value) => value === FILLED).length;
}

export function formatDuration(ms: number): string {
  const safe = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function updateBest(best: Record<string, number>, levelId: string, ms: number): Record<string, number> {
  const next: Record<string, number> = { ...best };
  const value = Math.max(0, Math.floor(ms));
  if (next[levelId] === undefined || value < next[levelId]) {
    next[levelId] = value;
  }
  return next;
}

export interface SaveData {
  version: 1;
  completed: Record<string, number>;
  lastLevel: string;
}

export function defaultSave(): SaveData {
  return { version: 1, completed: {}, lastLevel: LEVELS[0].id };
}

export function parseSave(raw: string | null): SaveData {
  if (!raw) return defaultSave();
  try {
    const data = JSON.parse(raw) as Partial<SaveData> | null;
    if (!data || data.version !== 1 || typeof data !== 'object') return defaultSave();
    const completed: Record<string, number> = {};
    if (data.completed && typeof data.completed === 'object') {
      for (const [id, value] of Object.entries(data.completed)) {
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
          completed[id] = Math.floor(value);
        }
      }
    }
    const lastLevel =
      typeof data.lastLevel === 'string' && LEVELS.some((level) => level.id === data.lastLevel)
        ? data.lastLevel
        : LEVELS[0].id;
    return { version: 1, completed, lastLevel };
  } catch {
    return defaultSave();
  }
}

export function persistSave(storage: Storage, data: SaveData): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function linePatterns(clue: readonly number[], size: number): string[] {
  if (clue.length === 0) return ['0'.repeat(size)];
  const total = clue.reduce((sum, value) => sum + value, 0);
  const minimum = total + (clue.length - 1);
  if (minimum > size) return [];
  const extra = size - minimum;
  const patterns: string[] = [];
  const slots = clue.length + 1;
  const distribution: number[] = new Array(slots).fill(0);

  const emit = (): void => {
    let pattern = '0'.repeat(distribution[0]);
    for (let index = 0; index < clue.length; index += 1) {
      pattern += '1'.repeat(clue[index]);
      const gap = index < clue.length - 1 ? 1 + distribution[index + 1] : distribution[index + 1];
      pattern += '0'.repeat(gap);
    }
    patterns.push(pattern);
  };

  const distribute = (slot: number, remaining: number): void => {
    if (slot === slots - 1) {
      distribution[slot] = remaining;
      emit();
      return;
    }
    for (let value = 0; value <= remaining; value += 1) {
      distribution[slot] = value;
      distribute(slot + 1, remaining - value);
    }
  };

  distribute(0, extra);
  return patterns;
}

function patternCompatible(pattern: string, partial: string): boolean {
  for (let index = 0; index < pattern.length; index += 1) {
    if (partial[index] === '1' && pattern[index] !== '1') return false;
  }
  return true;
}

export function solveNonogram(rowCluesInput: number[][], columnCluesInput: number[][], size: number): Cell[][] | null {
  const rowPatterns = rowCluesInput.map((clue) => linePatterns(clue, size));
  const columnPatterns = columnCluesInput.map((clue) => linePatterns(clue, size));
  if (rowPatterns.some((patterns) => patterns.length === 0) || columnPatterns.some((patterns) => patterns.length === 0)) {
    return null;
  }
  const rows: string[] = [];

  const search = (row: number): boolean => {
    if (row === size) return true;
    for (const pattern of rowPatterns[row]) {
      rows.push(pattern);
      let feasible = true;
      for (let col = 0; col < size; col += 1) {
        const partial = rows.map((line) => line[col]).join('');
        if (!columnPatterns[col].some((candidate) => patternCompatible(candidate, partial))) {
          feasible = false;
          break;
        }
      }
      if (feasible && search(row + 1)) return true;
      rows.pop();
    }
    return false;
  };

  if (!search(0)) {
    rows.length = 0;
    return null;
  }
  return rows.slice(0, size).map((line) => line.split('').map((value) => (value === '1' ? FILLED : EMPTY)));
}

export function countSolutions(
  rowCluesInput: number[][],
  columnCluesInput: number[][],
  size: number,
  maxCount = 2,
): Cell[][][] {
  const rowPatterns = rowCluesInput.map((clue) => linePatterns(clue, size));
  const columnPatterns = columnCluesInput.map((clue) => linePatterns(clue, size));
  if (rowPatterns.some((patterns) => patterns.length === 0) || columnPatterns.some((patterns) => patterns.length === 0)) {
    return [];
  }
  const rows: string[] = [];
  const solutions: Cell[][][] = [];

  const search = (row: number): boolean => {
    if (solutions.length >= maxCount) return true;
    if (row === size) {
      solutions.push(rows.map((line) => line.split('').map((value) => (value === '1' ? FILLED : EMPTY))));
      return solutions.length >= maxCount;
    }
    for (const pattern of rowPatterns[row]) {
      rows.push(pattern);
      let feasible = true;
      for (let col = 0; col < size; col += 1) {
        const partial = rows.map((line) => line[col]).join('');
        if (!columnPatterns[col].some((candidate) => patternCompatible(candidate, partial))) {
          feasible = false;
          break;
        }
      }
      if (feasible && search(row + 1)) return true;
      rows.pop();
    }
    return false;
  };

  try {
    search(0);
  } finally {
    rows.length = 0;
  }
  return solutions;
}
