export const density = {
  compact: { cell: 'px-3 py-1.5', head: 'h-9' },
  comfortable: { cell: 'px-3.5 py-3', head: 'h-11' },
} as const;

export const alignClass = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
} as const;

export const justifyClass = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
} as const;

export const INTERACTIVE =
  'button,a,input,select,textarea,label,[role="checkbox"],[role="menuitem"],[role="option"]';
