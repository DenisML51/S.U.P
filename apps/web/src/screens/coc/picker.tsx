import React, { useEffect, useMemo, useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Button, Input, Panel, TextArea } from '../../ui/primitives';
import { NumberField } from '../../ui/forms';
import { t } from '../../i18n';

export interface PickOption {
  id: string;
  name: string;
  /** A short fact beside the name (a cost, a damage). */
  hint?: string;
  /** Group heading ("Ближний бой", "Наука"). */
  group?: string;
  description?: string;
}

/**
 * Adding from a list as a dialog: a search line, the options as cards with what they are, and the
 * chosen one's description before it is taken. Lists are short enough to read; the search narrows them.
 */
export const PickerDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: PickOption[];
  confirmLabel: string;
  onPick: (id: string) => void;
}> = ({ open, onClose, title, subtitle, options, confirmLabel, onPick }) => {
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return options.filter(
      (o) => !needle || `${t(o.name)} ${t(o.group ?? '')} ${t(o.hint ?? '')}`.toLowerCase().includes(needle),
    );
  }, [options, query]);
  const groups = useMemo(() => [...new Set(shown.map((o) => o.group ?? ''))], [shown]);
  const pick = options.find((o) => o.id === chosen);
  // Every opening starts clean: no choice left over from the last time, however it was closed.
  useEffect(() => {
    if (open) {
      setChosen(null);
      setQuery('');
    }
  }, [open]);
  const take = (id = chosen) => {
    if (!id || !options.some((o) => o.id === id)) return;
    onPick(id);
    setChosen(null);
    setQuery('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      width="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" disabled={!pick} onClick={() => take()}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск"
        aria-label="Поиск"
        className="mb-3 w-full"
        data-autofocus
      />
      {/* On a phone the description goes under the list, which keeps the larger share of the height. */}
      <div className="grid max-h-[52vh] grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-4 max-sm:max-h-[60dvh] max-sm:grid-cols-1 max-sm:grid-rows-[minmax(0,1fr)_auto] max-sm:gap-3">
        <div className="ui-scroll min-h-0 overflow-y-auto pr-1">
          {shown.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-faint">Ничего не нашлось.</p>
          )}
          {groups.map((group) => (
            <div key={group} className="mb-2">
              {group && (
                <div className="px-1 pb-1 pt-2 text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                  {group}
                </div>
              )}
              {shown
                .filter((o) => (o.group ?? '') === group)
                .map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setChosen(o.id)}
                    onDoubleClick={() => take(o.id)}
                    aria-pressed={o.id === chosen}
                    className="flex w-full items-baseline gap-3 border-b border-line/50 px-2 py-2 text-left hover:bg-surface-2/60 data-[on]:bg-accent/15 max-lg:py-2.5"
                    data-on={o.id === chosen || undefined}
                  >
                    <span className="min-w-0 flex-1 truncate">{o.name}</span>
                    {o.hint && <span className="shrink-0 text-xs text-ink-muted">{o.hint}</span>}
                  </button>
                ))}
            </div>
          ))}
        </div>
        <Panel
          variant="inset"
          ornate={false}
          className="ui-scroll min-h-0 overflow-y-auto px-4 py-3 text-sm max-sm:max-h-[22dvh]"
        >
          {pick ? (
            <>
              <div className="ui-display mb-1 text-lg">{pick.name}</div>
              {pick.hint && <div className="mb-2 text-xs text-ink-muted">{pick.hint}</div>}
              <p className="leading-relaxed text-ink-muted">{pick.description || 'Без описания.'}</p>
            </>
          ) : (
            <p className="text-ink-faint">Выберите, чтобы прочитать описание. Двойной клик — сразу взять.</p>
          )}
        </Panel>
      </div>
    </Dialog>
  );
};

/** A thing of the player's own: name, count and a note. */
export const ItemDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onAdd: (item: { name: string; quantity?: number; description: string }) => void;
}> = ({ open, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [counted, setCounted] = useState(false);
  const [description, setDescription] = useState('');
  const add = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), quantity: counted ? quantity : undefined, description });
    setName('');
    setDescription('');
    setCounted(false);
    setQuantity(1);
    onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Новая вещь"
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" disabled={!name.trim()} onClick={add}>
            Добавить
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Фонарь, отмычки, фляга виски…"
          aria-label="Название вещи"
          data-autofocus
        />
        <label className="flex items-center gap-3 text-sm text-ink-muted">
          <input type="checkbox" checked={counted} onChange={(e) => setCounted(e.target.checked)} />
          Считать штуки
          {counted && (
            <NumberField label="Сколько" value={quantity} min={0} onChange={setQuantity} className="w-20" />
          )}
        </label>
        <TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Заметка (необязательно)"
          aria-label="Заметка"
          rows={3}
        />
      </div>
    </Dialog>
  );
};
