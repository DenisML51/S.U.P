import React, { useMemo, useState } from 'react';
import type { PartyRules, Setting } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { usePartyStore } from '../../store/usePartyStore';
import { CharacterArt } from '../../ui/CharacterArt';
import { describeOrigin } from '../../ui/characterLabels';
import { Dialog } from '../../ui/Dialog';
import { IconCreate } from '../../ui/icons';
import { Button, Panel, cx } from '../../ui/primitives';
import { SettingScope } from '../../ui/theme/SettingScope';
import { SETTING_INFO, settingOf } from '../../ui/theme/settings';
import { RULES_TITLE } from '../../systems';
import { heroRank } from '../home/homeParts';

/**
 * Which of the user's heroes comes to the table. Heroes of the party's world come first; each card
 * wears its own world. A hero sits at one table at a time: those seated elsewhere are shown, greyed,
 * with the table that holds them, so none of the user's heroes silently goes missing. A table with its
 * own rules takes only heroes made by them; the others are shown greyed with their rules.
 */
export const HeroPickDialog: React.FC<{
  open: boolean;
  partyId: string;
  setting: Setting;
  /** The table's rules; `null` or absent: any. */
  rules?: PartyRules | null;
  onClose: () => void;
  /** Start creating a hero of the party's world instead. */
  onCreate: () => void;
  onPicked?: () => void;
}> = ({ open, partyId, setting, rules, onClose, onCreate, onPicked }) => {
  const heroes = useCharacterStore((s) => s.charactersList);
  const parties = usePartyStore((s) => s.list);
  const addHero = usePartyStore((s) => s.addHero);
  const [busy, setBusy] = useState<string | null>(null);

  const { free, elsewhere } = useMemo(() => {
    const seatedAt = new Map<string, { partyId: string; name: string }>();
    for (const party of parties ?? []) for (const id of party.myCharacterIds) seatedAt.set(id, { partyId: party.id, name: party.name });
    const byWorld = [...heroes].sort((a, b) => Number(settingOf(b) === setting) - Number(settingOf(a) === setting));
    const fits = (hero: (typeof heroes)[number]) => !rules || (hero.ruleset ?? 'custom') === rules;
    return {
      free: byWorld.filter((hero) => !seatedAt.has(hero.id) && fits(hero)),
      // Heroes already at this table are on it, not in the choice; others are shown with why they can't come.
      elsewhere: byWorld.flatMap((hero) => {
        const seat = seatedAt.get(hero.id);
        if (seat && seat.partyId === partyId) return [];
        if (!fits(hero)) return [{ hero, table: `По правилам «${RULES_TITLE[hero.ruleset ?? 'custom']}»` }];
        return seat ? [{ hero, table: `За столом «${seat.name}»` }] : [];
      }),
    };
  }, [heroes, parties, partyId, setting, rules]);

  const pick = async (characterId: string) => {
    if (busy) return;
    setBusy(characterId);
    const added = await addHero(partyId, characterId);
    setBusy(null);
    if (added) {
      onPicked?.();
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      setting={setting}
      width="xl"
      eyebrow="За столом"
      title="Кого вы приведёте?"
      subtitle="Герой будет в этой партии, пока вы его не заберёте"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Позже
        </Button>
      }
    >
      <div className="grid grid-cols-6 gap-3 pb-1 pt-2">
        <Panel
          as="button"
          interactive
          onClick={onCreate}
          className="flex aspect-[2/3] flex-col items-center justify-center gap-3 p-4 text-center"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full border border-frame/50 text-frame-bright">
            <IconCreate width={26} height={26} />
          </span>
          <span className="ui-display ui-title text-lg leading-tight text-ink">Новый герой</span>
          <span className="text-xs text-ink-muted">
            Создать в мире {SETTING_INFO[setting].label}
            {rules && ` по правилам «${RULES_TITLE[rules]}»`}
          </span>
        </Panel>
        {[...free.map((hero) => ({ hero, table: null as string | null })), ...elsewhere].map(({ hero, table }) => {
          const own = settingOf(hero);
          const origin = describeOrigin(hero);
          return (
            <SettingScope key={hero.id} setting={own} className="min-w-0">
              <Panel
                as={table === null ? 'button' : 'div'}
                interactive={table === null}
                aria-disabled={table !== null || undefined}
                onClick={table === null ? () => void pick(hero.id) : undefined}
                title={table === null ? undefined : `${table} — этот герой не может сесть за этот стол`}
                className={cx(
                  'relative flex aspect-[2/3] w-full flex-col overflow-hidden p-0 text-left',
                  busy === hero.id && 'animate-pulse',
                  table !== null && 'cursor-not-allowed',
                )}
              >
                <CharacterArt
                  source={hero}
                  kind="full"
                  className={cx('absolute inset-0 h-full w-full', table !== null && 'opacity-40 grayscale')}
                />
                <span className="absolute inset-0 bg-gradient-to-t from-bg-deep via-bg-deep/50 via-35% to-transparent to-60%" />
                <span className="relative mt-auto block space-y-1 p-3">
                  {own !== setting && (
                    <span className="block text-[10px] uppercase tracking-[0.2em] text-frame-bright/80">{SETTING_INFO[own].label}</span>
                  )}
                  <span className="ui-display block truncate text-lg leading-tight text-ink">{hero.name}</span>
                  <span className={cx('block text-xs text-ink-muted', table === null ? 'truncate' : 'line-clamp-2')}>
                    {table === null
                      ? [origin.calling, `${heroRank(hero).value} ${hero.investigator ? 'лет' : 'ур.'}`].filter(Boolean).join(' · ')
                      : table}
                  </span>
                </span>
              </Panel>
            </SettingScope>
          );
        })}
      </div>
      {free.length === 0 && (
        <p className="pb-2 text-sm text-ink-muted">
          Все ваши герои уже сидят за другими столами — создайте нового или заберите кого-то из другой партии.
        </p>
      )}
    </Dialog>
  );
};
