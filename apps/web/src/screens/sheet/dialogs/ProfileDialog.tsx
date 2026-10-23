import React, { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { CLASSES, RACES } from '@itd/game-logic';
import { SETTINGS, type Character, type CharacterImages, type Setting } from '@itd/schema';
import { api, assetUrl } from '../../../data/api/client';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { SettingEmblem } from '../../../ui/art/emblems';
import { Dialog } from '../../../ui/Dialog';
import { NumberField, Suggest } from '../../../ui/forms';
import { Button, Field, Input, cx } from '../../../ui/primitives';
import { SettingScope } from '../../../ui/theme/SettingScope';
import { SETTING_INFO, settingOf } from '../../../ui/theme/settings';

interface Named {
  id: string;
  name: string;
}

/** Content ids are shown by name and stored back as ids, so rules keyed by them keep working. */
const nameOf = (list: Named[] | undefined, id?: string) => list?.find((e) => e.id === id)?.name ?? id ?? '';
const idOf = (list: Named[] | undefined, name: string) => {
  const trimmed = name.trim();
  return list?.find((e) => e.name.toLowerCase() === trimmed.toLowerCase())?.id ?? trimmed;
};

interface Draft {
  name: string;
  setting: Setting;
  race: string;
  subrace: string;
  class: string;
  subclass: string;
  speed: number;
  initiativeBonus: number;
  images: CharacterImages;
}

const toDraft = (character: Character): Draft => {
  const race = RACES.find((r) => r.id === character.race);
  const characterClass = CLASSES.find((c) => c.id === character.class);
  return {
    name: character.name,
    setting: settingOf(character),
    race: nameOf(RACES, character.race),
    subrace: nameOf(race?.subraces, character.subrace),
    class: nameOf(CLASSES, character.class),
    subclass: nameOf(characterClass?.subclasses, character.subclass),
    speed: character.speed,
    initiativeBonus: character.initiativeBonus ?? 0,
    images: { ...character.images },
  };
};

/** An image slot: the current picture, a click to upload another, a link to remove it. */
const ImageSlot: React.FC<{
  label: string;
  hint: string;
  /** Uploaded asset shown in the slot; the slot shows only its own picture, never a fallback. */
  asset?: string;
  onUploaded: (id: string | undefined) => void;
  className?: string;
}> = ({ label, hint, asset, onUploaded, className }) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    setBusy(true);
    try {
      const asset = await api.assets.upload(file);
      onUploaded(asset.id);
    } catch {
      toast.error('Не удалось загрузить изображение');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between">
        <span className="ui-label !mb-0">{label}</span>
        {asset && (
          <button
            type="button"
            className="text-xs text-ink-faint hover:text-danger"
            onClick={() => onUploaded(undefined)}
          >
            убрать
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="ui-image-slot group relative min-h-0 flex-1 overflow-hidden"
        title={hint}
        disabled={busy}
      >
        {asset ? (
          <img
            src={assetUrl(asset)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: '50% 20%' }}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center p-3 text-center text-xs text-ink-faint">
            {hint}
          </span>
        )}
        <span className="ui-image-slot__veil">{busy ? 'Загрузка…' : asset ? 'Заменить' : 'Загрузить'}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void upload(file);
        }}
      />
    </div>
  );
};

/** The setting as a choice shown in its own look: its face, its emblem, its colours. */
const SettingOption: React.FC<{ setting: Setting; selected: boolean; onSelect: () => void }> = ({
  setting,
  selected,
  onSelect,
}) => (
  <SettingScope setting={setting}>
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cx('ui-setting-option ui-morph', selected && 'ui-setting-option--selected')}
    >
      <SettingEmblem size={26} className="shrink-0 text-frame-bright" />
      <span className="min-w-0 text-left">
        <span className="ui-display ui-title block truncate text-[1.05rem] leading-tight text-ink">
          {SETTING_INFO[setting].label}
        </span>
        <span className="block truncate text-xs text-ink-muted">{SETTING_INFO[setting].hint}</span>
      </span>
    </button>
  </SettingScope>
);

/**
 * Who the hero is: name, origin, their universe and their pictures. Picking a setting re-themes the
 * dialog at once, so the choice is seen before it is saved.
 */
export const ProfileDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const [draft, setDraft] = useState(() => toDraft(character));
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const race = RACES.find((r) => r.id === idOf(RACES, draft.race));
  const characterClass = CLASSES.find((c) => c.id === idOf(CLASSES, draft.class));

  const save = () => {
    const raceId = idOf(RACES, draft.race);
    const classId = idOf(CLASSES, draft.class);
    updateCharacter((doc) => ({
      ...doc,
      name: draft.name.trim() || doc.name,
      setting: draft.setting,
      race: raceId,
      subrace: draft.subrace.trim()
        ? idOf(RACES.find((r) => r.id === raceId)?.subraces, draft.subrace)
        : undefined,
      class: classId,
      subclass: idOf(CLASSES.find((c) => c.id === classId)?.subclasses, draft.subclass),
      speed: draft.speed,
      initiativeBonus: draft.initiativeBonus || undefined,
      images: draft.images.full || draft.images.portrait ? draft.images : undefined,
    }));
    onClose();
  };

  return (
    <SettingScope setting={draft.setting} className="contents">
      <Dialog
        open={open}
        onClose={onClose}
        eyebrow="Профиль героя"
        title={draft.name.trim() || 'Без имени'}
        width="xl"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button variant="primary" disabled={!draft.name.trim()} onClick={save}>
              Сохранить
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-[minmax(0,15rem)_minmax(0,1fr)] gap-8">
          <div className="grid grid-rows-[minmax(0,1fr)_auto] gap-4">
            <ImageSlot
              label="Полный арт"
              hint="Вертикальная картинка во весь рост: карточка героя и лист"
              asset={draft.images.full}
              onUploaded={(full) => set({ images: { ...draft.images, full } })}
              className="min-h-[15rem]"
            />
            <ImageSlot
              label="Портрет"
              hint="Лицо крупным планом: списки и бой"
              asset={draft.images.portrait}
              onUploaded={(portrait) => set({ images: { ...draft.images, portrait } })}
              className="h-[8.5rem] w-[8.5rem]"
            />
          </div>

          <div className="space-y-4">
            <Field label="Имя">
              {(props) => (
                <Input {...props} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Раса">
                {({ id }) => (
                  <Suggest
                    id={id}
                    value={draft.race}
                    onChange={(v) => set({ race: v })}
                    suggestions={RACES.map((r) => r.name)}
                  />
                )}
              </Field>
              <Field label="Подраса">
                {({ id }) => (
                  <Suggest
                    id={id}
                    value={draft.subrace}
                    onChange={(v) => set({ subrace: v })}
                    suggestions={race?.subraces?.map((s) => s.name) ?? []}
                  />
                )}
              </Field>
              <Field label="Класс">
                {({ id }) => (
                  <Suggest
                    id={id}
                    value={draft.class}
                    onChange={(v) => set({ class: v })}
                    suggestions={CLASSES.map((c) => c.name)}
                  />
                )}
              </Field>
              <Field label="Подкласс">
                {({ id }) => (
                  <Suggest
                    id={id}
                    value={draft.subclass}
                    onChange={(v) => set({ subclass: v })}
                    suggestions={characterClass?.subclasses.map((s) => s.name) ?? []}
                  />
                )}
              </Field>
              <Field label="Скорость, фт">
                {({ id }) => (
                  <NumberField
                    id={id}
                    min={0}
                    step={5}
                    value={draft.speed}
                    onChange={(speed) => set({ speed })}
                    className="w-full"
                  />
                )}
              </Field>
              <Field label="Бонус к инициативе">
                {({ id }) => (
                  <NumberField
                    id={id}
                    signed
                    value={draft.initiativeBonus}
                    onChange={(initiativeBonus) => set({ initiativeBonus })}
                    className="w-full"
                  />
                )}
              </Field>
            </div>
            <div role="radiogroup" aria-label="Сеттинг" className="space-y-1.5">
              <span className="ui-label">Сеттинг</span>
              <div className="grid grid-cols-2 gap-2">
                {SETTINGS.map((setting) => (
                  <SettingOption
                    key={setting}
                    setting={setting}
                    selected={draft.setting === setting}
                    onSelect={() => set({ setting })}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </SettingScope>
  );
};
