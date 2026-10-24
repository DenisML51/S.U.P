import React, { useMemo, useState } from 'react';
import type { Setting } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { usePartyStore } from '../../store/usePartyStore';
import { CharacterArt } from '../../ui/CharacterArt';
import { describeOrigin } from '../../ui/characterLabels';
import { Dialog } from '../../ui/Dialog';
import { IconCreate } from '../../ui/icons';
import { Button, Panel, cx } from '../../ui/primitives';
import { SettingScope } from '../../ui/theme/SettingScope';
import { SETTING_INFO, settingOf } from '../../ui/theme/settings';

/**
 * Which of the user's heroes comes to the table. Heroes of the party's world come first; each card
 * wears its own world. Heroes already sitting at a table are not offered.
 */
export const HeroPickDialog: React.FC<{
  open: boolean;
  partyId: string;
  setting: Setting;
  onClose: () => void;
  /** Start creating a hero of the party's world instead. */
  onCreate: () => void;
  onPicked?: () => void;
}> = ({ open, partyId, setting, onClose, onCreate, onPicked }) => {
  const heroes = useCharacterStore((s) => s.charactersList);
  const parties = usePartyStore((s) => s.list);
  const addHero = usePartyStore((s) => s.addHero);
  const [busy, setBusy] = useState<string | null>(null);

  const free = useMemo(() => {
    const seated = new Set(parties?.flatMap((party) => party.myCharacterIds) ?? []);
    return heroes
      .filter((hero) => !seated.has(hero.id))
      .sort((a, b) => Number(settingOf(b) === setting) - Number(settingOf(a) === setting));
  }, [heroes, parties, setting]);

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
          <span className="text-xs text-ink-muted">Создать в мире {SETTING_INFO[setting].label}</span>
        </Panel>
        {free.map((hero) => {
          const own = settingOf(hero);
          const origin = describeOrigin(hero);
          return (
            <SettingScope key={hero.id} setting={own} className="min-w-0">
              <Panel
                as="button"
                interactive
                onClick={() => void pick(hero.id)}
                className={cx('relative flex aspect-[2/3] w-full flex-col overflow-hidden p-0 text-left', busy === hero.id && 'animate-pulse')}
              >
                <CharacterArt source={hero} kind="full" className="absolute inset-0 h-full w-full" />
                <span className="absolute inset-0 bg-gradient-to-t from-bg-deep via-bg-deep/50 via-35% to-transparent to-60%" />
                <span className="relative mt-auto block space-y-1 p-3">
                  {own !== setting && (
                    <span className="block text-[10px] uppercase tracking-[0.2em] text-frame-bright/80">{SETTING_INFO[own].label}</span>
                  )}
                  <span className="ui-display block truncate text-lg leading-tight text-ink">{hero.name}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    {[origin.calling, `${hero.level} ур.`].filter(Boolean).join(' · ')}
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
