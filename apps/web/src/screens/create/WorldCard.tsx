import React, { useMemo } from 'react';
import type { Setting } from '@itd/schema';
import { SETTING_ART } from '../../ui/art';
import { Corners, SettingEmblem } from '../../ui/ornaments';
import { SettingScope } from '../../ui/theme/SettingScope';
import { SETTING_INFO } from '../../ui/theme/settings';
import { useAtLeast } from '../../ui/useBreakpoint';

/**
 * A world to begin in, shown as a window into it: the setting's own atmosphere fills the card
 * (the star atlas, the instrument grid, the fog and the cathedral window), its emblem and name
 * stand over it. Hovering wakes the world in the setting's manner.
 *
 * In a carousel only the card in front is `awake` (its atmosphere moves; the hover marvel plays on
 * every card); one far at the side is `distant`: its atmosphere is not drawn at all, only its
 * emblem and name.
 */
/** Chosen by a click; the card passes its centre on the screen, where the setting's flourish starts. */
export const WorldCard = React.memo(function WorldCard({
  setting,
  selected,
  onSelect,
  awake = true,
  distant = false,
  shade = 0,
}: {
  setting: Setting;
  selected: boolean;
  onSelect: (origin: { x: number; y: number }) => void;
  awake?: boolean;
  distant?: boolean;
  /** How deep in the dark it stands, 0 to 1: a card at the side of a carousel. */
  shade?: number;
}) {
  const { Backdrop, WorldSigil } = SETTING_ART[setting];
  // A phone card is small: its frame and corners would crowd the emblem and the name.
  const ornate = useAtLeast('tablet');
  // The picture never changes with the card's place in the carousel: it is not rendered again.
  const scene = useMemo(() => <Backdrop frame={ornate} />, [Backdrop, ornate]);
  return (
    <SettingScope setting={setting} className="h-full">
      <button
        type="button"
        className="ui-world"
        aria-pressed={selected}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          onSelect({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        }}
      >
        <span className="ui-world__scene" data-dormant={awake ? undefined : ''} data-distant={distant ? '' : undefined} aria-hidden>
          {scene}
        </span>
        <span className="ui-world__veil" aria-hidden />
        {ornate && <Corners />}
        <span className="ui-world__emblem">
          {WorldSigil && (
            <span className="ui-world__sigil" aria-hidden>
              <WorldSigil />
            </span>
          )}
          <SettingEmblem size={76} />
        </span>
        <span className="ui-world__name ui-display ui-title">{SETTING_INFO[setting].label}</span>
        <span className="ui-world__shade" style={{ opacity: shade }} aria-hidden />
      </button>
    </SettingScope>
  );
});
