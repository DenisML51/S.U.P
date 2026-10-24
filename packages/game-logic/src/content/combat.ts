export const DAMAGE_TYPES = [
  'Физический',
  'Колющий',
  'Рубящий',
  'Дробящий',
  'Огонь',
  'Холод',
  'Электричество',
  'Звук',
  'Яд',
  'Кислота',
  'Психический',
  'Некротический',
  'Лучистый',
  'Силовой',
  'Лечение',
];

export const DEFAULT_DAMAGE_TYPE = 'Физический';

export interface Condition {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export const CONDITIONS: Condition[] = [
  { id: 'blinded', name: 'Ослеплён', description: 'Существо не видит и автоматически проваливает проверки характеристик, полагающиеся на зрение.' },
  { id: 'charmed', name: 'Очарован', description: 'Очаровавший имеет преимущество на проверки характеристик при взаимодействии с существом.' },
  { id: 'deafened', name: 'Оглохший', description: 'Существо ничего не слышит и автоматически проваливает проверки характеристик, полагающиеся на слух.' },
  { id: 'frightened', name: 'Испуган', description: 'Существо совершает с помехой проверки характеристик и броски атаки, пока источник страха находится в пределах видимости.' },
  { id: 'grappled', name: 'Схвачен', description: 'Скорость существа становится 0, и оно не может пользоваться бонусами к скорости.' },
  { id: 'incapacitated', name: 'Недееспособен', description: 'Существо не может совершать действия и реакции.' },
  { id: 'invisible', name: 'Невидимый', description: 'Существо невозможно увидеть без помощи магии или особых чувств.' },
  { id: 'paralyzed', name: 'Парализован', description: 'Существо недееспособно и не может двигаться или говорить.' },
  { id: 'petrified', name: 'Окаменевший', description: 'Существо превращено в неодушевлённое вещество (обычно камень).' },
  { id: 'poisoned', name: 'Отравлен', description: 'Существо совершает с помехой броски атаки и проверки характеристик.' },
  { id: 'prone', name: 'Сбит с ног', description: 'Единственный вид перемещения — ползание, если существо не встанет.' },
  { id: 'restrained', name: 'Опутаный', description: 'Скорость существа становится 0, и оно не может пользоваться бонусами к скорости.' },
  { id: 'stunned', name: 'Ошеломлён', description: 'Существо недееспособно, не может двигаться и говорит только невнятно.' },
  { id: 'unconscious', name: 'Без сознания', description: 'Существо недееспособно, не может двигаться или говорить и не осознаёт окружение.' },
  { id: 'exhaustion', name: 'Истощение', description: 'Особое состояние, имеющее 6 уровней эффектов.' },
];

export type LimbType = 'head' | 'torso' | 'arm' | 'leg';
export type InjuryLevel = 'none' | 'light' | 'severe' | 'destroyed';

export const INJURY_DESCRIPTIONS: Record<LimbType, Record<Exclude<InjuryLevel, 'none'>, string>> = {
  head: {
    light: 'Сотрясение. Помеха на броски концентрации и Внимательность',
    severe: 'Контузия. Оглушены на 1к4 раунда',
    destroyed: 'ЧМТ. Без сознания, спасброски от смерти',
  },
  arm: {
    light: 'Вывих. Помеха на проверки ловкости рук',
    severe: 'Перелом. Помеха на все атаки из-за боли',
    destroyed: 'Рука отсечена или раздроблена',
  },
  leg: {
    light: 'Растяжение. Скорость -10 футов',
    severe: 'Перелом. Падаете ничком, скорость 5 футов',
    destroyed: 'Нога отсечена. Ползете со скоростью 5 футов',
  },
  torso: {
    light: 'Ушиб внутренних органов',
    severe: 'Тяжелое ранение торса',
    destroyed: 'Критическое повреждение внутренних органов',
  },
};

/**
 * Colour of a spell's icon by the base damage type it deals; custom types have none, so the icon
 * keeps the default look. A colour the player chose always wins.
 */
export const DAMAGE_COLORS: Record<string, string> = {
  Огонь: '#e07b39',
  Холод: '#4fa3c7',
  Электричество: '#d9c24a',
  Звук: '#8fa6c9',
  Яд: '#7fb069',
  Кислота: '#a8c23a',
  Психический: '#c665a8',
  Некротический: '#7a5f9e',
  Лучистый: '#e6cf7a',
  Силовой: '#8a7be0',
  Физический: '#a3aab3',
  Колющий: '#a3aab3',
  Рубящий: '#a3aab3',
  Дробящий: '#a3aab3',
  Лечение: '#7fb069',
};

export const spellColor = (spell: {
  color?: string;
  damageType?: string;
  damageComponents?: { type: string }[];
}): string | undefined =>
  spell.color ?? DAMAGE_COLORS[spell.damageComponents?.[0]?.type || spell.damageType || ''];
