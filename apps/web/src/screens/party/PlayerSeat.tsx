import React from 'react';
import { motion } from 'framer-motion';
import type { PartyDto, PartyHeroDto } from '@itd/schema';
import { CharacterArt } from '../../ui/CharacterArt';
import { describeOrigin } from '../../ui/characterLabels';
import { IconArmor, IconCombat, IconCreate, IconInitiative } from '../../ui/icons';
import { Button, Meter, Panel, SectionTitle } from '../../ui/primitives';
import { formatBonus } from './partyView';

const art = (hero: PartyHeroDto) => ({ name: hero.name, images: hero.portrait ? { portrait: hero.portrait } : undefined });

/** The others at the table, as a player sees them: faces and names, nothing of their sheets. */
export const Companions: React.FC<{ party: PartyDto; userId: string | undefined }> = ({ party, userId }) => {
  const others = party.heroes.filter((hero) => hero.ownerId !== userId);
  const names = new Map(party.members.map((member) => [member.userId, member.displayName]));
  return (
    <section className="flex min-h-0 flex-col">
      <SectionTitle>Отряд</SectionTitle>
      {others.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">Пока за столом только вы — остальные герои появятся здесь.</p>
      ) : (
        <ul className="mt-5 flex flex-wrap gap-8">
          {others.map((hero, index) => (
            <motion.li
              key={hero.id}
              className="flex w-40 flex-col items-center gap-2 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.05 * index } }}
            >
              <span className="ui-companion relative block h-40 w-40 overflow-hidden">
                <CharacterArt source={art(hero)} kind="portrait" className="h-full w-full" />
              </span>
              <span className="ui-display block w-full truncate text-lg leading-tight text-ink">{hero.name}</span>
              <span className="-mt-1.5 block w-full truncate text-[11px] text-ink-faint">
                {hero.ownerId === party.masterId ? 'мастер' : names.get(hero.ownerId)}
              </span>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
};

/**
 * The player's own hero at the table: everything they may see of it, and the way into its sheet or
 * its combat screen. Leaving those returns here.
 */
export const MyHero: React.FC<{
  hero: PartyHeroDto | undefined;
  inCombat: boolean;
  onOpen: (view: 'sheet' | 'combat') => void;
  onBring: () => void;
}> = ({ hero, inCombat, onOpen, onBring }) => {
  if (!hero) {
    return (
      <Panel as="button" interactive onClick={onBring} className="flex min-h-[14rem] flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full border border-frame/50 text-frame-bright">
          <IconCreate width={26} height={26} />
        </span>
        <span className="ui-display ui-title text-lg text-ink">Привести героя</span>
        <span className="text-xs text-ink-muted">Без героя вы смотрите на стол со стороны</span>
      </Panel>
    );
  }
  const origin = describeOrigin(hero);
  const vitals = hero.vitals;
  return (
    <Panel className="relative flex min-h-[16rem] flex-1 flex-col overflow-hidden p-0">
      <CharacterArt source={art(hero)} kind="portrait" className="absolute inset-0 h-full w-full" position="50% 20%" />
      <span className="absolute inset-0 bg-gradient-to-t from-bg-deep from-25% via-bg-deep/70 via-50% to-transparent" />
      <div className="relative mt-auto space-y-3 p-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-frame-bright/80">Ваш герой</div>
          <div className="ui-display mt-1 truncate text-[1.6rem] leading-tight text-ink">{hero.name}</div>
          <div className="truncate text-xs text-ink-muted">{[origin.calling || origin.race, `${hero.level} ур.`].filter(Boolean).join(' · ')}</div>
        </div>
        {vitals && (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <Meter value={vitals.currentHP} max={vitals.maxHP} extra={vitals.tempHP} tone="hp" height={6} label="Хиты" />
            </div>
            <span className="ui-numeric text-sm text-ink">
              {vitals.currentHP}
              <span className="text-ink-faint">/{vitals.maxHP}</span>
            </span>
            <span className="flex items-center gap-1 text-sm text-ink" title="Класс брони">
              <IconArmor width={14} height={14} className="text-armor" />
              <span className="ui-numeric">{vitals.armorClass}</span>
            </span>
            <span className="flex items-center gap-1 text-sm text-ink" title="Инициатива">
              <IconInitiative width={13} height={13} />
              <span className="ui-numeric">{formatBonus(vitals.initiative)}</span>
            </span>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant={inCombat ? 'secondary' : 'primary'} size="sm" className="flex-1" onClick={() => onOpen('sheet')}>
            Лист героя
          </Button>
          <Button
            variant={inCombat ? 'primary' : 'secondary'}
            size="sm"
            className="flex-1"
            icon={<IconCombat width={15} height={15} />}
            onClick={() => onOpen('combat')}
          >
            {inCombat ? 'В бой' : 'Боевой режим'}
          </Button>
        </div>
      </div>
    </Panel>
  );
};
