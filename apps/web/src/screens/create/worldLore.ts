import type { Setting } from '@itd/schema';

/** What a world is about, told when choosing it: a line in its voice, a few words more, what it grew from. */
export interface WorldLore {
  tagline: string;
  description: string;
  inspirations: string[];
}

export const WORLD_LORE: Record<Setting, WorldLore> = {
  'high-fantasy': {
    tagline: 'Короны, драконы и древние клятвы',
    description: 'Светлые королевства и забытые руины, гильдии магов и рыцарские ордена. Мир, где подвиг ещё что-то значит.',
    inspirations: ['D&D', 'Властелин колец', 'The Elder Scrolls'],
  },
  'sci-fi': {
    tagline: 'Звёзды, флоты и чужие миры',
    description: 'Корабли между системами, древние расы и войны за галактику. Экипаж, приказ и неизвестность за следующим прыжком.',
    inspirations: ['Star Wars', 'Mass Effect', 'Halo'],
  },
  'dark-fantasy': {
    tagline: 'Готика, кровь и молитвы без ответа',
    description: 'Города под вечной луной, охотники на чудовищ и вера, ставшая оружием. Каждая победа здесь чего-то стоит.',
    inspirations: ['Bloodborne', 'Warhammer', 'Dragon Age'],
  },
  cyberpunk: {
    tagline: 'Хром, неон и долги корпорациям',
    description: 'Мегаполис, где тело — апгрейд, а жизнь — контракт. Наёмники, нетраннеры и улицы, которые никогда не спят.',
    inspirations: ['Cyberpunk 2077', 'Бегущий по лезвию', 'Призрак в доспехах'],
  },
  lovecraft: {
    tagline: 'Туман, старые книги и то, чего лучше не знать',
    description: 'Новая Англия двадцатых: архивы, экспедиции и тайные культы. Знание здесь опаснее пули, а рассудок хрупок.',
    inspirations: ['Г. Ф. Лавкрафт', 'Зов Ктулху', 'Bloodborne'],
  },
};
