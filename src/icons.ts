const svg = (content: string, stroke = true): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ${
    stroke ? 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' : ''
  } aria-hidden="true" focusable="false">${content}</svg>`;

export const bearIcon = svg(
  '<circle cx="8" cy="7" r="2.6"/><circle cx="16" cy="7" r="2.6"/><path d="M5.2 12c0-4 3-7 6.8-7s6.8 3 6.8 7c0 4.4-3.2 7.6-6.8 7.6S5.2 16.4 5.2 12Z"/><circle cx="9.6" cy="11.4" r=".8" fill="currentColor"/><circle cx="14.4" cy="11.4" r=".8" fill="currentColor"/><path d="M12 13.2c.9 0 1.5.5 1.5 1.2 0 .9-1 1.5-1.5 1.5s-1.5-.6-1.5-1.5c0-.7.6-1.2 1.5-1.2Z"/>',
);

export const gridIcon = svg(
  '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9.3 4v16M14.6 4v16M4 9.3h16M4 14.6h16"/>',
);

export const brushIcon = svg(
  '<path d="M14.5 4.5l5 5L9 20H4v-5l10.5-10.5Z"/><path d="M12 7l5 5"/>',
);

export const crossIcon = svg(
  '<path d="M6 6l12 12M18 6L6 18"/>',
);

export const undoIcon = svg(
  '<path d="M9 7 4 12l5 5"/><path d="M4 12h10a5 5 0 0 1 5 5v0a3 3 0 0 1-3 3h-2"/>',
);

export const resetIcon = svg(
  '<path d="M5 4v6h6"/><path d="M5 10a7.5 7.5 0 1 1-1 5"/>',
);

export const hintIcon = svg(
  '<path d="M12 3a6 6 0 0 0-4 10.4c.8.8 1.4 1.8 1.6 2.9.1.4.4.7.8.7h3.2c.4 0 .7-.3.8-.7.2-1.1.8-2.1 1.6-2.9A6 6 0 0 0 12 3Z"/><path d="M10 20h4"/>',
);

export const trophyIcon = svg(
  '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 5H4.8a.8.8 0 0 0-.8.9A4.6 4.6 0 0 0 8 10M16 5h3.2a.8.8 0 0 1 .8.9A4.6 4.6 0 0 1 16 10"/><path d="M12 13v3"/><path d="M9 19.5h6"/><path d="M10.5 16h3"/>',
);

export const clockIcon = svg(
  '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.4 2"/>',
);

export const keyboardIcon = svg(
  '<rect x="3" y="6.5" width="18" height="11" rx="2"/><path d="M7 10.5h.01M11 10.5h.01M15 10.5h.01M17.5 14h.01M6.5 14h.01M9 14h6"/>',
);

export const sparkleIcon = svg(
  '<path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.2 10.2 12.6 4.5 10.8 10.2 9Z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z"/>',
);

export const leafIcon = svg(
  '<path d="M5 19C5 9 12 4.5 20 4c.5 8-3 15-13 15"/><path d="M5 19c3-5 7-8.5 11-10.5"/>',
);
