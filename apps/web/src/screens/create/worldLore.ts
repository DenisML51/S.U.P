import type { Setting } from '@itd/schema';

/** What a world is about, told when choosing it: a line in its voice and a few words more. */
export interface WorldLore {
  tagline: string;
  description: string;
}

export const WORLD_LORE: Record<Setting, WorldLore> = {
  'sci-fi': {
    tagline: 'Звёзды, флоты и чужие миры',
    description: 'Корабли между системами, древние расы и войны за галактику. Экипаж, приказ и неизвестность за следующим прыжком.',
  },
  lovecraft: {
    tagline: 'Туман, старые книги и то, чего лучше не знать',
    description: 'Новая Англия двадцатых: архивы, экспедиции и тайные культы. Знание здесь опаснее пули, а рассудок хрупок.',
  },
  'elden-ring': {
    tagline: 'Древо Эрд, руны и Золотой порядок',
    description: 'Междуземье после Раскола: полубоги делят осколки Кольца, а Погасшие возвращаются на зов благодати. Стань Повелителем Элдена — или сожги Древо.',
  },
  fable: {
    tagline: 'Альбион, где каждый поступок запомнят',
    description: 'Сказочное королевство лесов, ярмарок и старых замков. Феи, разбойники и бургомистры, а впереди героя бежит молва. Будь добр или коварен — Альбион запомнит всё.',
  },
};
