import { CLASSES, RACES } from '@itd/game-logic';
import type { InventoryItem, ItemType } from '@itd/schema';

interface Origin {
  race: string;
  subrace?: string;
  class: string;
  subclass: string;
}

/**
 * Human-readable race and class. Sheets store content ids ("human", "inquisitor") or, for custom
 * content, free text; both read naturally here.
 */
export function describeOrigin(origin: Origin): { race: string; calling: string } {
  const race = RACES.find((r) => r.id === origin.race);
  const subrace = race?.subraces?.find((s) => s.id === origin.subrace);
  const characterClass = CLASSES.find((c) => c.id === origin.class);
  const subclass = characterClass?.subclasses.find((s) => s.id === origin.subclass);

  // Content subraces are self-explanatory ('Северянин'); custom text is shown next to the race.
  const raceName = subrace?.name ?? [race?.name ?? origin.race, origin.subrace].filter(Boolean).join(', ');
  const className = characterClass?.name ?? origin.class;
  const subclassName = subclass?.name ?? origin.subclass;

  return {
    race: raceName,
    calling: [className, subclassName].filter(Boolean).join(' · '),
  };
}

export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  item: 'предмет',
  weapon: 'оружие',
  armor: 'броня',
  ammunition: 'боеприпасы',
};

/** Item categories the desktop version stored as English ids. */
const LEGACY_ITEM_CLASSES: Record<string, string> = {
  gear: 'снаряжение',
  consumable: 'расходуемое',
  relic: 'реликвия',
  tool: 'инструмент',
  potion: 'зелье',
  book: 'книга',
  treasure: 'ценность',
  misc: 'разное',
};

/** An item category in Russian: legacy ids are translated, the player's own words shown as written. */
export const itemClassName = (itemClass: string | undefined): string => {
  const text = itemClass?.trim() ?? '';
  return LEGACY_ITEM_CLASSES[text.toLowerCase()] ?? text;
};

/** What kind of thing an item is: its category, or its type when no category is set. */
export const itemKindLabel = (item: Pick<InventoryItem, 'itemClass' | 'type'>): string =>
  itemClassName(item.itemClass) || ITEM_TYPE_LABEL[item.type];
