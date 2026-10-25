import React, { useState } from 'react';
import {
  ATTRIBUTES_LIST,
  SKILLS_LIST,
  abilityModifier,
  armorClassOf,
  formatModifier,
  initiativeModifier,
  maxSanityOf,
} from '@itd/game-logic';
import {
  DND_ICONS,
  describeGrant,
  findClass,
} from '@itd/game-logic/dnd';
import type { CharacterDraft, CharacterImages, Setting } from '@itd/schema';
import { assetUrl } from '../../data/api/client';
import { SettingEmblem } from '../../ui/ornaments';
import { GameIcon, type IconKind } from '../../ui/GameIcon';
import { Prose } from '../../ui/Prose';
import { Panel, cx } from '../../ui/primitives';
import { IconArmor, IconHealth, IconInitiative, IconSanity, IconSpeed } from '../../ui/icons';
import { SETTING_INFO } from '../../ui/theme/settings';
import { EntryDetails, EntryTile, type EntryInfo } from '../progression/EntryDetails';

/** A block of the summary: the entries as hotbar tiles, named on hover, told about on click. */
const IconBlock: React.FC<{
  title: string;
  kind: IconKind;
  entries: EntryInfo[];
  onOpen: (entry: EntryInfo, kind: IconKind) => void;
}> = ({ title, kind, entries, onOpen }) =>
  entries.length === 0 ? null : (
    <section className="text-center">
      <h4 className="ui-summary__heading">
        {title} <span className="ui-numeric">{entries.length}</span>
      </h4>
      <div className="flex flex-wrap justify-center gap-1.5">
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="rounded-[inherit]"
            title={entry.name}
            aria-label={entry.name}
            onClick={() => onOpen(entry, kind)}
          >
            <EntryTile entry={entry} kind={kind} size="sm" />
          </button>
        ))}
      </div>
    </section>
  );

/** A round figure under the scores: initiative, hit points and hit die, armour, speed, sanity. */
const Badge: React.FC<{ icon: React.ReactNode; value: React.ReactNode; label: string }> = ({
  icon,
  value,
  label,
}) => (
  <div className="flex flex-col items-center gap-1" title={label}>
    <span className="ui-summary__badge">
      {icon}
      <span className="ui-numeric">{value}</span>
    </span>
    <span className="text-[10px] text-ink-faint">{label}</span>
  </div>
);

/**
 * The hero as they would be created right now, beside every step, after the summary panel of a
 * game's character creator: emblem, name and calling, the six scores, the round figures, then
 * everything the hero can do as icons by kind and the proficiencies in words.
 */
export const HeroSummary: React.FC<{
  sheet: CharacterDraft;
  setting: Setting;
  images: CharacterImages;
  /** Class of a preset hero, for its emblem. */
  classIcon?: string;
  className?: string;
}> = ({ sheet, setting, images, classIcon, className }) => {
  const portrait = images.portrait ?? images.full;
  const calling = [sheet.class, sheet.subclass].filter(Boolean).join(' · ');
  const skills = SKILLS_LIST.filter((s) => sheet.skills.find((k) => k.id === s.id)?.proficient).map(
    (s) => s.name,
  );
  const proficiencies = sheet.traits.find((t) => t.id === 'g-proficiencies')?.description;
  const mastery = sheet.traits.find((t) => t.id === 'g-weapon-mastery')?.description;
  const hitDie = findClass(sheet.build?.class)?.hitDie;
  const features = sheet.traits.filter((t) => t.id !== 'g-proficiencies' && t.id !== 'g-weapon-mastery');
  const [open, setOpen] = useState<{ entry: EntryInfo; kind: IconKind } | null>(null);
  const show = (entry: EntryInfo, kind: IconKind) => setOpen({ entry, kind });
  // An attack comes from a weapon of the kit; everything else names the feature that granted it.
  const source =
    open &&
    (open.kind === 'attack'
      ? 'Оружие из снаряжения'
      : sheet.build
        ? describeGrant(sheet.build, open.entry.grant)
        : undefined);

  return (
    <Panel className={cx('flex min-h-0 flex-col', className)}>
      {/* The frame stays whole; only what is inside it scrolls, quietly, if the hero runs long. */}
      <div className="ui-quiet-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-5 py-5">
        <header className="flex flex-col items-center text-center">
          {portrait ? (
            <img
              src={assetUrl(portrait)}
              alt=""
              className="ui-summary__portrait"
              style={{ objectPosition: '50% 20%' }}
            />
          ) : classIcon ? (
            <GameIcon
              name={DND_ICONS.classes[classIcon]}
              kind="ability"
              size={64}
              className="ui-origin__icon"
            />
          ) : (
            <SettingEmblem size={56} className="text-frame-bright" />
          )}
          <div className="ui-display mt-3 w-full truncate text-xl leading-tight text-ink">{sheet.name}</div>
          <div className="text-sm text-ink-muted">
            {sheet.class ? `Уровень ${sheet.level} · ${calling}` : SETTING_INFO[setting].label}
          </div>
          {(sheet.subrace || sheet.race) && (
            <div className="text-xs text-ink-faint">{sheet.subrace || sheet.race}</div>
          )}
        </header>

        <div className="grid grid-cols-6 text-center">
          {ATTRIBUTES_LIST.map((attribute) => {
            const score = sheet.attributes[attribute.id] ?? 10;
            return (
              <div key={attribute.id}>
                <div className="text-[10px] tracking-[0.08em] text-ink-faint">{attribute.shortName}</div>
                <div className="ui-display ui-numeric text-lg leading-tight text-ink">{score}</div>
                <div className="ui-numeric text-[11px] text-frame-bright">
                  {formatModifier(abilityModifier(score))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center gap-2.5">
          <Badge
            icon={<IconInitiative width={13} height={13} />}
            value={formatModifier(initiativeModifier(sheet))}
            label="Иниц."
          />
          <Badge
            icon={<IconHealth width={13} height={13} />}
            value={sheet.class ? sheet.maxHP : '—'}
            label={hitDie ? `Хиты к${hitDie}` : 'Хиты'}
          />
          <Badge icon={<IconArmor width={13} height={13} />} value={armorClassOf(sheet)} label="КБ" />
          <Badge icon={<IconSpeed width={13} height={13} />} value={sheet.speed} label="Скорость" />
          <Badge icon={<IconSanity width={13} height={13} />} value={maxSanityOf(sheet)} label="Рассудок" />
        </div>

        <IconBlock title="Атаки" kind="attack" entries={sheet.attacks} onOpen={show} />
        <IconBlock
          title="Действия"
          kind="ability"
          entries={sheet.abilities.filter((a) => a.actionType !== 'passive')}
          onOpen={show}
        />
        <IconBlock
          title="Пассивные умения"
          kind="ability"
          entries={sheet.abilities.filter((a) => a.actionType === 'passive')}
          onOpen={show}
        />
        <IconBlock
          title="Заговоры"
          kind="spell"
          entries={sheet.spells.filter((s) => s.level === 0)}
          onOpen={show}
        />
        <IconBlock
          title="Заклинания"
          kind="spell"
          entries={sheet.spells.filter((s) => s.level > 0 && s.prepared)}
          onOpen={show}
        />
        <IconBlock title="Особенности" kind="item" entries={features} onOpen={show} />

        {(proficiencies || skills.length > 0 || mastery) && (
          <section>
            <h4 className="ui-summary__heading">Владения</h4>
            {proficiencies && <Prose className="text-[13px] text-ink-muted">{proficiencies}</Prose>}
            {skills.length > 0 && (
              <p className="mt-2 text-[13px] text-ink-muted">
                <b className="font-semibold text-ink">Навыки:</b> {skills.join(', ')}
              </p>
            )}
            {mastery && (
              <Prose className="mt-2 text-[13px] text-ink-muted">{`**Мастерство:**\n\n${mastery}`}</Prose>
            )}
          </section>
        )}
      </div>
      <EntryDetails open={open} source={source ?? undefined} onClose={() => setOpen(null)} />
    </Panel>
  );
};
