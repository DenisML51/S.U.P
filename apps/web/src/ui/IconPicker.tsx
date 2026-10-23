import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GameIcon, ICON_COLORS, ICON_GROUPS, resolveIcon, type IconKind } from './GameIcon';
import { cx } from './primitives';

/**
 * An entry's name with its icon beside it, as the combat bar shows it. A click on the icon opens
 * the picker under the row: colour, search and the pictures by group.
 */
export const IconNameField: React.FC<{
  kind: IconKind;
  iconName?: string;
  color?: string;
  onChange: (patch: { iconName?: string; color?: string }) => void;
  /** The name field itself. */
  children: React.ReactNode;
}> = ({ kind, iconName, color, onChange, children }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const current = resolveIcon(iconName, kind);
  const needle = query.trim().toLowerCase();
  const groups = ICON_GROUPS.map((group) => ({
    ...group,
    icons: needle ? group.icons.filter((icon) => icon.label.toLowerCase().includes(needle)) : group.icons,
  })).filter((group) => group.icons.length > 0);

  return (
    <div>
      <div className="flex items-end gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          title="Иконка и цвет"
          className="ui-hud-slot ui-hud-slot--large shrink-0"
          data-active={open || undefined}
        >
          <GameIcon name={iconName} kind={kind} size={34} color={color} className="ui-hud-slot__icon" />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="ui-icon-picker mt-3">
              <div className="flex flex-wrap items-center gap-3">
                <div role="radiogroup" aria-label="Цвет" className="flex items-center gap-1.5">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!color}
                    title="Цвет сеттинга"
                    onClick={() => onChange({ iconName, color: undefined })}
                    className={cx('ui-swatch ui-swatch--auto', !color && 'ui-swatch--selected')}
                  />
                  {ICON_COLORS.map((swatch) => (
                    <button
                      key={swatch.value}
                      type="button"
                      role="radio"
                      aria-checked={color === swatch.value}
                      title={swatch.label}
                      onClick={() => onChange({ iconName, color: swatch.value })}
                      className={cx('ui-swatch', color === swatch.value && 'ui-swatch--selected')}
                      style={{ background: swatch.value }}
                    />
                  ))}
                </div>
                <input
                  className="ui-input ml-auto h-8 w-48 py-0 text-sm"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  // Enter would submit the whole entry form.
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  placeholder="Найти: меч, огонь…"
                  aria-label="Найти иконку"
                />
              </div>
              <div className="ui-scroll mt-3 max-h-[15rem] space-y-3 overflow-y-auto pr-1">
                {groups.map((group) => (
                  <section key={group.label}>
                    <h4 className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                      {group.label}
                    </h4>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(2.6rem,1fr))] gap-1.5">
                      {group.icons.map((icon) => (
                        <button
                          key={icon.id}
                          type="button"
                          title={icon.label}
                          aria-label={icon.label}
                          aria-pressed={current === icon.id}
                          onClick={() => onChange({ iconName: icon.id, color })}
                          className="ui-hud-slot ui-hud-slot--small"
                          data-active={current === icon.id || undefined}
                        >
                          <GameIcon
                            name={icon.id}
                            kind={kind}
                            size={22}
                            color={color}
                            className="ui-hud-slot__icon"
                          />
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
                {groups.length === 0 && (
                  <p className="py-4 text-center text-sm text-ink-faint">Ничего не нашлось</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
