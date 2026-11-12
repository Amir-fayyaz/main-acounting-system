'use client';

import * as React from 'react';

import type { ReasonConfig } from '../data-table.types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui';
import { cx } from '../lib/text';

export interface ActionDialogState {
  /** Changes on every open so the dialog's local state resets. */
  key: number;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  /** `null` → plain confirmation, otherwise a reason box is shown. */
  reason: ReasonConfig | null;
  onConfirm: (reason?: string) => void | Promise<void>;
}

export function resolveReason(reason: boolean | ReasonConfig | undefined): ReasonConfig | null {
  if (!reason) return null;
  return reason === true ? { required: true } : reason;
}

const DEFAULT_MIN = 3;

/**
 * One dialog for both "are you sure?" and "why?" (audit reason).
 * The confirm button stays disabled until a required reason is long enough; async errors are
 * shown inside the dialog and keep it open.
 */
export function ActionDialog({
  state,
  onClose,
}: {
  state: ActionDialogState | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      {state ? <ActionDialogBody key={state.key} state={state} onClose={onClose} /> : null}
    </Dialog>
  );
}

function ActionDialogBody({ state, onClose }: { state: ActionDialogState; onClose: () => void }) {
  const { reason: cfg } = state;
  const required = cfg ? cfg.required !== false : false;
  const minLength = cfg ? (cfg.minLength ?? (required ? DEFAULT_MIN : 0)) : 0;
  const [text, setText] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const valid = !cfg || !required || text.trim().length >= minLength;

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid || pending) return;
    setPending(true);
    setError(null);
    try {
      await state.onConfirm(text.trim() || undefined);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error && err.message ? err.message : 'عملیات انجام نشد. دوباره تلاش کنید.',
      );
      setPending(false);
    }
  }

  return (
    <DialogContent
      dir="rtl"
      className="sm:max-w-md"
      onInteractOutside={(e) => pending && e.preventDefault()}
    >
      <form onSubmit={submit} className="grid gap-4">
        <DialogHeader className="text-start">
          <DialogTitle>{state.title}</DialogTitle>
          {state.description ? (
            <DialogDescription asChild>
              <div>{state.description}</div>
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {cfg ? (
          <div className="grid gap-2">
            <label htmlFor="dt-reason" className="text-sm font-medium">
              {cfg.label ?? 'دلیل'}{' '}
              {required ? (
                <span className="text-destructive">*</span>
              ) : (
                <span className="text-muted-foreground">(اختیاری)</span>
              )}
            </label>
            {cfg.presets?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {cfg.presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setText(p)}
                    className={cx(
                      'rounded-full border px-2.5 py-0.5 text-xs hover:bg-accent',
                      text === p ? 'border-primary bg-accent' : 'border-border',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            ) : null}
            <textarea
              id="dt-reason"
              autoFocus
              rows={3}
              value={text}
              disabled={pending}
              placeholder={cfg.placeholder ?? 'دلیل را بنویسید…'}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void submit();
              }}
              className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {required && text.length > 0 && !valid ? (
              <p className="text-xs text-muted-foreground">
                حداقل {minLength.toLocaleString('fa-IR')} حرف بنویسید.
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-lg bg-destructive/10 p-2.5 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            type="submit"
            variant={state.destructive ? 'destructive' : 'default'}
            disabled={!valid || pending}
          >
            {pending ? 'در حال انجام…' : (state.confirmLabel ?? 'تأیید')}
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            انصراف
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
