import { CLASSES, RACES } from '@itd/game-logic';

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

  const raceName = subrace?.name ?? race?.name ?? (origin.subrace || origin.race);
  const className = characterClass?.name ?? origin.class;
  const subclassName = subclass?.name ?? origin.subclass;

  return {
    race: raceName,
    calling: [className, subclassName].filter(Boolean).join(' · '),
  };
}
