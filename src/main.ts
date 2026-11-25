import {
  applyAction,
  columnClues,
  createBoard,
  CROSSED,
  EMPTY,
  FILLED,
  formatDuration,
  isSolved,
  levels,
  mistakeMask,
  mistakeCount,
  rowClues,
  solutionFor,
  updateBest,
  type Cell,
  type Level,
  type SaveData,
} from './game';
import { defaultSave, parseSave, safeLoad, safePersist, STORAGE_KEY } from './storage';
import {
  bearIcon,
  brushIcon,
  clockIcon,
  crossIcon,
  gridIcon,
  hintIcon,
  keyboardIcon,
  leafIcon,
  resetIcon,
  sparkleIcon,
  trophyIcon,
  undoIcon,
} from './icons';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;

type Action = 'fill' | 'cross';

interface GameState {
  level: Level;
  board: Cell[][];
  solution: Cell[][];
  undoStack: Cell[][][];
  solved: boolean;
  elapsedMs: number;
  timer: number | null;
  showErrors: boolean;
  save: SaveData;
}

let state: GameState;

function loadSave(): SaveData {
  try {
    return safeLoad(localStorage);
  } catch {
    return defaultSave();
  }
}

function persist(data: SaveData): void {
  state.save = data;
  try {
    safePersist(localStorage, data);
  } catch {
    // Storage may be unavailable; gameplay should continue without interruption.
  }
}

function stopTimer(): void {
  if (state.timer !== null) {
    window.clearInterval(state.timer);
    state.timer = null;
  }
}

function startTimer(): void {
  stopTimer();
  state.timer = window.setInterval(() => {
    state.elapsedMs += 1_000;
    renderHud();
  }, 1_000);
}

function selectLevel(id: string): void {
  const level = levels().find((item) => item.id === id) ?? levels()[0];
  const save = { ...state.save, lastLevel: level.id };
  persist(save);
  stopTimer();
  state.level = level;
  state.board = createBoard(level.size);
  state.solution = solutionFor(level);
  state.undoStack = [];
  state.solved = false;
  state.elapsedMs = 0;
  state.showErrors = true;
  startTimer();
  render();
}

function announce(message: string): void {
  const live = document.querySelector<HTMLElement>('#live');
  if (live) live.textContent = message;
}

function cellLabel(row: number, col: number): string {
  return `第 ${row + 1} 行，第 ${col + 1} 列`;
}

function boardMarkup(): string {
  const size = state.level.size;
  const rowHints = rowClues(state.solution);
  const colHints = columnClues(state.solution);
  const colHintMax = Math.max(...colHints.map((list) => list.length), 0);
  const colClueRows: string[] = [];
  for (let depth = colHintMax - 1; depth >= 0; depth -= 1) {
    const cells: string[] = [];
    for (let col = 0; col < size; col += 1) {
      const value = colHints[col][depth];
      cells.push(
        `<span class="clue-cell col-clue${value === undefined ? ' empty' : ''}" aria-hidden="true">${value ?? ''}</span>`,
      );
    }
    colClueRows.push(`<div class="col-clue-row">${cells.join('')}</div>`);
  }
  const rows: string[] = [];
  const mask = mistakeMask(state.board, state.solution);
  for (let row = 0; row < size; row += 1) {
    const clue = rowHints[row];
    const clueText = clue.length ? clue.join(' ') : '0';
    const rowClue = `<div class="row-clue" aria-label="第 ${row + 1} 行提示">${clue.length
      ? clue.map((value) => `<span class="clue-cell">${value}</span>`).join('')
      : '<span class="clue-cell">0</span>'}</div>`;
    const cells: string[] = [];
    for (let col = 0; col < size; col += 1) {
      const value = state.board[row][col];
      const isMistake = state.showErrors && value === FILLED && mask[row][col] === FILLED;
      const status = value === FILLED ? 'filled' : value === CROSSED ? 'crossed' : 'empty';
      const title = `${cellLabel(row, col)}，${status === 'filled' ? '已填色' : status === 'crossed' ? '已标记 X' : '未填'}`;
      const classes = [
        'cell',
        status,
        isMistake ? 'mistake' : '',
        state.solved && value === FILLED ? 'solved' : '',
      ]
        .filter(Boolean)
        .join(' ');
      cells.push(
        `<button type="button" class="${classes}" data-row="${row}" data-col="${col}" aria-label="${title}，${clueText}">${value === FILLED ? '' : value === CROSSED ? '×' : ''}</button>`,
      );
    }
    rows.push(`<div class="board-row" role="row">${rowClue}<div class="cells-row">${cells.join('')}</div></div>`);
  }
  const rowClueMax = Math.max(...rowHints.map((list) => list.length), 1);
  return `
    <div class="board-wrap" style="--size:${size};--row-clue-w:${rowClueMax}">
      <div class="col-clues" aria-hidden="true">
        <div class="corner"></div>
        <div class="col-clues-list">${colClueRows.join('')}</div>
      </div>
      <div class="board" role="grid" aria-label="数织棋盘">${rows.join('')}</div>
    </div>`;
}

function levelListMarkup(): string {
  return levels()
    .map((level) => {
      const active = level.id === state.level.id;
      const completed = state.save.completed[level.id] !== undefined;
      const best = state.save.completed[level.id];
      return `<button type="button" class="level-item${active ? ' active' : ''}${completed ? ' completed' : ''}" data-level="${level.id}" aria-label="${level.name}${completed ? '，已通关' : ''}">
        <span class="level-name">${level.name}</span>
        <span class="level-meta">${level.size}×${level.size}${completed ? ` · ${formatDuration(best!)}` : ''}</span>
      </button>`;
    })
    .join('');
}

function statsMarkup(): string {
  const mistakes = mistakeCount(state.board, state.solution);
  const best = state.save.completed[state.level.id];
  return `
    <div class="stats">
      <div class="stat"><span class="stat-icon" aria-hidden="true">${clockIcon}</span><div><b>${formatDuration(state.elapsedMs)}</b><span>本局用时</span></div></div>
      <div class="stat"><span class="stat-icon" aria-hidden="true">${trophyIcon}</span><div><b>${best !== undefined ? formatDuration(best) : '— —'}</b><span>本关最佳</span></div></div>
      <div class="stat"><span class="stat-icon" aria-hidden="true">${bearIcon}</span><div><b>${Object.keys(state.save.completed).length}/${levels().length}</b><span>已通关</span></div></div>
      <div class="stat"><span class="stat-icon" aria-hidden="true">${gridIcon}</span><div><b>${mistakes}</b><span>错误填涂</span></div></div>
    </div>`;
}

function render(): void {
  app.innerHTML = `
    <a class="skip-link" href="#board">跳到棋盘</a>
    <header class="topbar">
      <div class="brand"><span class="brand-icon" aria-hidden="true">${bearIcon}</span><div><strong>数织</strong><span>小熊的格纸</span></div></div>
      <div class="top-actions">
        <button type="button" class="pill" id="toggle-errors" aria-pressed="${state.showErrors}"><span aria-hidden="true">${sparkleIcon}</span>错误提示：${state.showErrors ? '开' : '关'}</button>
      </div>
    </header>
    <main class="layout">
      <section class="left" aria-labelledby="levels-heading">
        <div class="panel">
          <div class="panel-head">
            <h2 id="levels-heading">关卡</h2>
            <span class="panel-note">${levels().length} 张</span>
          </div>
          <p class="hint-text">${state.level.note}</p>
          <div class="levels" role="list">${levelListMarkup()}</div>
        </div>
        <div class="panel companion">
          <img src="./characters/classic.webp" alt="自嘲熊" width="120" height="120" />
          <div>
            <p class="companion-title">小熊的碎碎念</p>
            <p class="companion-copy">别急，先把最满的列填出来，空格会自己告诉你答案。</p>
            <div class="companion-badges">
              <span><i aria-hidden="true">${leafIcon}</i>奶油纸感</span>
              <span><i aria-hidden="true">${keyboardIcon}</i>键盘可玩</span>
            </div>
          </div>
        </div>
      </section>
      <section class="center" id="board" aria-labelledby="board-heading">
        <div class="board-header">
          <div>
            <p class="eyebrow"><span aria-hidden="true">${brushIcon}</span> 按提示涂格，错笔会提醒</p>
            <h1 id="board-heading">${state.level.name}</h1>
          </div>
          <div class="size-badge">${state.level.size} × ${state.level.size}</div>
        </div>
        ${statsMarkup()}
        <div class="toolbar" role="toolbar" aria-label="棋盘工具">
          <div class="mode" role="group" aria-label="操作模式">
            <button type="button" class="mode-btn active" id="mode-fill" aria-pressed="true"><span aria-hidden="true">${brushIcon}</span>填格</button>
            <button type="button" class="mode-btn" id="mode-cross" aria-pressed="false"><span aria-hidden="true">${crossIcon}</span>标记 X</button>
          </div>
          <button type="button" class="tool" id="undo" ${state.undoStack.length ? '' : 'disabled'}><span aria-hidden="true">${undoIcon}</span>撤销</button>
          <button type="button" class="tool" id="reset"><span aria-hidden="true">${resetIcon}</span>重开</button>
          <button type="button" class="tool" id="hint"><span aria-hidden="true">${hintIcon}</span>提示</button>
        </div>
        <div class="board-frame">${boardMarkup()}</div>
        <div class="below">
          <div class="howto">
            <h3>玩法</h3>
            <ul>
              <li>左键 / 回车：填格</li>
              <li>右键 / 长按：标记 X</li>
              <li>按 F 切换填格，按 X 切换标记</li>
              <li>方向键移动焦点，撤销可回退一步</li>
            </ul>
          </div>
          <div class="result" id="result" hidden>
            <div class="result-card">
              <span class="result-icon" aria-hidden="true">${trophyIcon}</span>
              <h3>拼图完成</h3>
              <p id="result-copy"></p>
              <div class="result-actions">
                <button type="button" id="next-level">下一关</button>
                <button type="button" id="replay" class="ghost">重玩本关</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
    <div class="live sr-only" id="live" aria-live="polite" aria-atomic="true"></div>`;
  bindEvents();
  renderHud();
}

function renderHud(): void {
  const timerEl = document.querySelector<HTMLElement>('.stat b');
  if (timerEl) timerEl.textContent = formatDuration(state.elapsedMs);
}

function activeMode(): Action {
  const cross = document.querySelector<HTMLButtonElement>('#mode-cross');
  return cross?.getAttribute('aria-pressed') === 'true' ? 'cross' : 'fill';
}

function setMode(mode: Action): void {
  const fill = document.querySelector<HTMLButtonElement>('#mode-fill');
  const cross = document.querySelector<HTMLButtonElement>('#mode-cross');
  if (!fill || !cross) return;
  const isFill = mode === 'fill';
  fill.setAttribute('aria-pressed', String(isFill));
  cross.setAttribute('aria-pressed', String(!isFill));
  fill.classList.toggle('active', isFill);
  cross.classList.toggle('active', !isFill);
  announce(isFill ? '已切换为填格模式' : '已切换为标记 X 模式');
}

function snapshot(): Cell[][] {
  return state.board.map((row) => row.slice());
}

function apply(row: number, col: number, action: Action): void {
  if (state.solved) return;
  const before = snapshot();
  const next = applyAction(state.board, row, col, action);
  if (JSON.stringify(before) === JSON.stringify(next)) return;
  state.undoStack.push(before);
  if (state.undoStack.length > 80) state.undoStack.shift();
  state.board = next;
  if (isSolved(state.board, state.solution)) {
    state.solved = true;
    stopTimer();
    const best = updateBest(state.save.completed, state.level.id, state.elapsedMs);
    const save = { ...state.save, completed: best, lastLevel: state.level.id };
    persist(save);
    render();
    const result = document.querySelector<HTMLElement>('#result');
    const copy = document.querySelector<HTMLElement>('#result-copy');
    if (copy) {
      copy.textContent = `用时 ${formatDuration(state.elapsedMs)}，已记录到本地最佳成绩。`;
    }
    if (result) result.hidden = false;
    announce('拼图完成，已记录成绩');
  } else {
    const result = document.querySelector<HTMLElement>('#result');
    if (result) result.hidden = true;
    refreshBoard();
  }
}

function refreshBoard(): void {
  const frame = document.querySelector<HTMLElement>('.board-frame');
  if (frame) frame.innerHTML = boardMarkup();
  const undoButton = document.querySelector<HTMLButtonElement>('#undo');
  if (undoButton) undoButton.disabled = state.undoStack.length === 0;
  renderHud();
  bindBoardEvents();
}

function undo(): void {
  const previous = state.undoStack.pop();
  if (!previous) return;
  state.board = previous.map((row) => row.slice());
  state.solved = false;
  stopTimer();
  startTimer();
  const result = document.querySelector<HTMLElement>('#result');
  if (result) result.hidden = true;
  refreshBoard();
  announce('已撤销一步');
}

function reset(): void {
  state.board = createBoard(state.level.size);
  state.undoStack = [];
  state.solved = false;
  state.elapsedMs = 0;
  stopTimer();
  startTimer();
  const result = document.querySelector<HTMLElement>('#result');
  if (result) result.hidden = true;
  refreshBoard();
  announce('已重置棋盘');
}

function hint(): void {
  if (state.solved) return;
  for (let row = 0; row < state.level.size; row += 1) {
    for (let col = 0; col < state.level.size; col += 1) {
      if (state.board[row][col] === EMPTY && state.solution[row][col] === FILLED) {
        const before = snapshot();
        state.board = applyAction(state.board, row, col, 'fill');
        state.undoStack.push(before);
        refreshBoard();
        announce(`提示：${cellLabel(row, col)} 已填色`);
        if (isSolved(state.board, state.solution)) {
          state.solved = true;
          stopTimer();
          const best = updateBest(state.save.completed, state.level.id, state.elapsedMs);
          persist({ ...state.save, completed: best, lastLevel: state.level.id });
          render();
          const result = document.querySelector<HTMLElement>('#result');
          const copy = document.querySelector<HTMLElement>('#result-copy');
          if (copy) copy.textContent = `用时 ${formatDuration(state.elapsedMs)}，已记录到本地最佳成绩。`;
          if (result) result.hidden = false;
        }
        return;
      }
    }
  }
  announce('当前没有可提示的空格');
}

function bindBoardEvents(): void {
  document.querySelectorAll<HTMLButtonElement>('.cell').forEach((button) => {
    const row = Number(button.dataset.row);
    const col = Number(button.dataset.col);
    let pressTimer: number | undefined;
    let longPressFired = false;

    const fire = (action: Action): void => {
      apply(row, col, action);
    };

    button.addEventListener('click', () => {
      if (longPressFired) {
        longPressFired = false;
        return;
      }
      fire(activeMode());
    });

    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      fire('cross');
    });

    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        fire(activeMode());
      } else if (event.key.toLowerCase() === 'f') {
        setMode('fill');
      } else if (event.key.toLowerCase() === 'x') {
        setMode('cross');
      } else if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        const size = state.level.size;
        let nextRow = row;
        let nextCol = col;
        if (event.key === 'ArrowRight') nextCol = Math.min(size - 1, col + 1);
        if (event.key === 'ArrowLeft') nextCol = Math.max(0, col - 1);
        if (event.key === 'ArrowDown') nextRow = Math.min(size - 1, row + 1);
        if (event.key === 'ArrowUp') nextRow = Math.max(0, row - 1);
        const target = document.querySelector<HTMLButtonElement>(`[data-row="${nextRow}"][data-col="${nextCol}"]`);
        target?.focus();
      }
    });

    button.addEventListener('touchstart', () => {
      longPressFired = false;
      pressTimer = window.setTimeout(() => {
        longPressFired = true;
        fire('cross');
      }, 450);
    }, { passive: true });
    button.addEventListener('touchend', () => {
      if (pressTimer) window.clearTimeout(pressTimer);
    });
    button.addEventListener('touchmove', () => {
      if (pressTimer) window.clearTimeout(pressTimer);
    });
  });
}

function bindEvents(): void {
  document.querySelectorAll<HTMLButtonElement>('.level-item').forEach((button) => {
    button.addEventListener('click', () => selectLevel(button.dataset.level!));
  });
  document.querySelector<HTMLButtonElement>('#mode-fill')?.addEventListener('click', () => setMode('fill'));
  document.querySelector<HTMLButtonElement>('#mode-cross')?.addEventListener('click', () => setMode('cross'));
  document.querySelector<HTMLButtonElement>('#undo')?.addEventListener('click', undo);
  document.querySelector<HTMLButtonElement>('#reset')?.addEventListener('click', reset);
  document.querySelector<HTMLButtonElement>('#hint')?.addEventListener('click', hint);
  document.querySelector<HTMLButtonElement>('#toggle-errors')?.addEventListener('click', () => {
    state.showErrors = !state.showErrors;
    const toggle = document.querySelector<HTMLButtonElement>('#toggle-errors');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(state.showErrors));
      toggle.innerHTML = `<span aria-hidden="true">${sparkleIcon}</span>错误提示：${state.showErrors ? '开' : '关'}`;
    }
    refreshBoard();
    announce(state.showErrors ? '已开启错误提示' : '已关闭错误提示');
  });
  document.querySelector<HTMLButtonElement>('#next-level')?.addEventListener('click', () => {
    const index = levels().findIndex((level) => level.id === state.level.id);
    const next = levels()[(index + 1) % levels().length];
    selectLevel(next.id);
  });
  document.querySelector<HTMLButtonElement>('#replay')?.addEventListener('click', () => {
    selectLevel(state.level.id);
  });
  bindBoardEvents();
}

function boot(): void {
  const saved = loadSave();
  const level = levels().find((item) => item.id === saved.lastLevel) ?? levels()[0];
  state = {
    level,
    board: createBoard(level.size),
    solution: solutionFor(level),
    undoStack: [],
    solved: false,
    elapsedMs: 0,
    timer: null,
    showErrors: true,
    save: saved,
  };
  startTimer();
  render();
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && typeof event.newValue === 'string') {
      state.save = parseSave(event.newValue);
    }
  });
}

boot();
