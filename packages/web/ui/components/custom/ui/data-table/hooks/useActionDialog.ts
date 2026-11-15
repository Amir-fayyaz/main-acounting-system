import * as React from 'react';

import type { ActionDialogState } from '../actions/ActionDialog';

export interface ActionDialogApi {
  dialog: ActionDialogState | null;
  openDialog: (state: Omit<ActionDialogState, 'key'>) => void;
  closeDialog: () => void;
  notice: string | null;
  setNotice: React.Dispatch<React.SetStateAction<string | null>>;
  reportError: (error: unknown, fallback: string) => void;
}

/** One confirm/reason dialog plus the inline error notice shown above the table. */
export function useActionDialog(): ActionDialogApi {
  const [dialog, setDialog] = React.useState<ActionDialogState | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const dialogKey = React.useRef(0);

  const openDialog = React.useCallback((state: Omit<ActionDialogState, 'key'>) => {
    setDialog({ key: ++dialogKey.current, ...state });
  }, []);

  const closeDialog = React.useCallback(() => setDialog(null), []);

  const reportError = React.useCallback((error: unknown, fallback: string) => {
    setNotice(error instanceof Error && error.message ? error.message : fallback);
  }, []);

  return { dialog, openDialog, closeDialog, notice, setNotice, reportError };
}
