import { describe, expect, it } from 'vitest';
import {
  applyAction,
  cluesFor,
  columnClues,
  createBoard,
  defaultSave,
  EMPTY,
  FILLED,
  formatDuration,
  isSolved,
  levels,
  mistakeCount,
  mistakeMask,
  parseGrid,
  parseSave,
  rowClues,
  solveNonogram,
  countSolutions,
  solutionFor,
  updateBest,
} from './game';

describe('关卡生成与提示', () => {
  it('内置至少 6 个关卡，尺寸都在合法范围', () => {
    expect(levels().length).toBeGreaterThanOrEqual(6);
    for (const level of levels()) {
      expect([5, 10]).toContain(level.size);
    }
  });

  it('行列数字提示与图案一致', () => {
    const art = ['01110', '11111', '00100', '01110', '00100'];
    const grid = parseGrid(art, 5);
    expect(rowClues(grid)).toEqual([[3], [5], [1], [3], [1]]);
    expect(columnClues(grid)).toEqual([[1], [2, 1], [5], [2, 1], [1]]);
  });

  it('生成器能解出全部关卡并且唯一', () => {
    for (const level of levels()) {
      const grid = solutionFor(level);
      const rows = rowClues(grid);
      const columns = columnClues(grid);
      const solved = solveNonogram(rows, columns, level.size);
      expect(solved).not.toBeNull();
      expect(JSON.stringify(solved)).toBe(JSON.stringify(grid));
      const solutions = countSolutions(rows, columns, level.size, 2);
      expect(solutions).toHaveLength(1);
    }
  });
});

describe('胜负与填充', () => {
  it('正确填充全部目标时判定通关', () => {
    const solution = parseGrid(['110', '100', '000'], 3);
    const board = createBoard(3);
    board[0][0] = FILLED;
    board[0][1] = FILLED;
    board[1][0] = FILLED;
    expect(isSolved(board, solution)).toBe(true);
    board[1][1] = FILLED;
    expect(isSolved(board, solution)).toBe(false);
  });

  it('空的棋盘未通关，错误填涂会被识别', () => {
    const solution = parseGrid(['10', '01'], 2);
    const board = createBoard(2);
    expect(isSolved(board, solution)).toBe(false);
    board[0][0] = FILLED;
    board[0][1] = FILLED;
    expect(mistakeCount(board, solution)).toBe(1);
    const mask = mistakeMask(board, solution);
    expect(mask[0][1]).toBe(FILLED);
    expect(mask[0][0]).toBe(EMPTY);
  });

  it('错误提示开启时仍可通关，关闭时不影响判定', () => {
    const solution = parseGrid(['10', '01'], 2);
    const board = createBoard(2);
    board[0][0] = FILLED;
    board[1][1] = FILLED;
    expect(isSolved(board, solution)).toBe(true);
  });
});

describe('操作与撤销', () => {
  it('填充和标记动作独立且可撤销', () => {
    let board = createBoard(2);
    board = applyAction(board, 0, 0, 'fill');
    expect(board[0][0]).toBe(FILLED);
    const before = board.map((row) => row.slice());
    board = applyAction(board, 0, 0, 'fill');
    expect(board[0][0]).toBe(EMPTY);
    board = applyAction(before, 0, 1, 'cross');
    expect(board[0][1]).toBe(2);
    board = applyAction(board, 0, 1, 'cross');
    expect(board[0][1]).toBe(EMPTY);
  });

  it('计时格式化正确', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65_000)).toBe('01:05');
    expect(formatDuration(3_600_000)).toBe('60:00');
  });

  it('最佳成绩只升不降', () => {
    let best: Record<string, number> = {};
    best = updateBest(best, 'heart', 12_000);
    expect(best.heart).toBe(12_000);
    best = updateBest(best, 'heart', 20_000);
    expect(best.heart).toBe(12_000);
    best = updateBest(best, 'heart', 9_000);
    expect(best.heart).toBe(9_000);
  });
});

describe('存档', () => {
  it('空存档、损坏 JSON 与未知版本都会安全回退', () => {
    expect(parseSave(null)).toEqual(defaultSave());
    expect(parseSave('{broken')).toEqual(defaultSave());
    expect(parseSave(JSON.stringify({ version: 42, completed: { heart: 1 } }))).toEqual(defaultSave());
  });

  it('真实存档能保留通关耗时与最近关卡', () => {
    const raw = JSON.stringify({
      version: 1,
      completed: { heart: 12_345, star: 56_789, bad: 'skip' },
      lastLevel: 'star',
    });
    expect(parseSave(raw)).toEqual({
      version: 1,
      completed: { heart: 12_345, star: 56_789 },
      lastLevel: 'star',
    });
  });

  it('线提示生成器处理空行与满行', () => {
    expect(cluesFor([EMPTY, EMPTY, EMPTY])).toEqual([]);
    expect(cluesFor([FILLED, FILLED, FILLED])).toEqual([3]);
    expect(cluesFor([FILLED, EMPTY, FILLED, EMPTY])).toEqual([1, 1]);
  });
});
