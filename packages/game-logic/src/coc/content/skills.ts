import type { SkillDef } from '../types';

/**
 * Skills of the investigator sheet, 7th edition, with their base values. Families that need a
 * speciality list the usual ones; a player may add their own (`art-craft:<anything>`).
 */
export const SKILLS: SkillDef[] = [
  {
    id: 'accounting',
    name: 'Бухгалтерия',
    base: 5,
    description: 'Учёт, счета, финансовые отчёты; найти растрату или подделку в книгах.',
  },
  {
    id: 'anthropology',
    name: 'Антропология',
    base: 1,
    description: 'Обычаи и уклад других народов; понять незнакомую культуру по наблюдениям.',
  },
  {
    id: 'appraise',
    name: 'Оценка',
    base: 5,
    description: 'Определить стоимость, возраст и подлинность вещи.',
  },
  {
    id: 'archaeology',
    name: 'Археология',
    base: 1,
    description: 'Датировать находки, распознать подделку, вести раскопки; древние письмена.',
  },
  {
    id: 'art-craft',
    name: 'Искусство/ремесло',
    base: 5,
    description: 'Создавать и оценивать произведения: живопись, музыка, литература, ремесло.',
    specialities: [
      { id: 'acting', name: 'Актёрская игра' },
      { id: 'fine-art', name: 'Живопись' },
      { id: 'photography', name: 'Фотография' },
      { id: 'literature', name: 'Литература' },
      { id: 'music', name: 'Музыка' },
      { id: 'forgery', name: 'Подделка' },
      { id: 'carpentry', name: 'Плотницкое дело' },
      { id: 'cooking', name: 'Кулинария' },
      { id: 'technical-drawing', name: 'Черчение' },
      { id: 'farming', name: 'Земледелие' },
      { id: 'welding', name: 'Сварка' },
      { id: 'plumbing', name: 'Сантехника' },
      { id: 'typing', name: 'Машинопись' },
      { id: 'shorthand', name: 'Стенография' },
    ],
  },
  { id: 'charm', name: 'Обаяние', base: 15, description: 'Расположить к себе: лесть, флирт, дружелюбие.' },
  {
    id: 'climb',
    name: 'Лазание',
    base: 20,
    description: 'Взбираться по стенам, деревьям, скалам и верёвкам.',
  },
  {
    id: 'computer-use',
    name: 'Компьютеры',
    base: 5,
    era: 'modern',
    description: 'Работа с программами и сетями, поиск данных, взлом простой защиты.',
  },
  {
    id: 'credit-rating',
    name: 'Средства',
    base: 0,
    noImprovement: true,
    description: 'Богатство и положение в обществе; определяет образ жизни и деньги.',
  },
  {
    id: 'cthulhu-mythos',
    name: 'Мифы Ктулху',
    base: 0,
    noPoints: true,
    noImprovement: true,
    description:
      'Знание о том, чего человек знать не должен. Растёт от столкновений и книг; снижает предел рассудка.',
  },
  {
    id: 'disguise',
    name: 'Маскировка',
    base: 5,
    description: 'Изменить внешность, голос и манеры, чтобы сойти за другого.',
  },
  {
    id: 'dodge',
    name: 'Уклонение',
    base: { half: 'dex' },
    description: 'Увернуться от удара или броска. Начальное значение — половина ЛВК.',
  },
  {
    id: 'drive-auto',
    name: 'Вождение',
    base: 20,
    description: 'Управлять автомобилем или грузовиком, в том числе в погоне.',
  },
  {
    id: 'electrical-repair',
    name: 'Электрика',
    base: 10,
    description: 'Чинить и собирать электрические устройства и проводку.',
  },
  {
    id: 'electronics',
    name: 'Электроника',
    base: 1,
    era: 'modern',
    description: 'Схемы, микросхемы, современная техника.',
  },
  {
    id: 'fast-talk',
    name: 'Красноречие',
    base: 5,
    description: 'Заговорить зубы: обмануть или сбить с толку быстрым потоком слов.',
  },
  {
    id: 'fighting',
    name: 'Ближний бой',
    base: 0,
    combat: 'fighting',
    description: 'Драться врукопашную или оружием ближнего боя.',
    specialities: [
      { id: 'brawl', name: 'Драка', base: 25 },
      { id: 'axe', name: 'Топор', base: 15 },
      { id: 'chainsaw', name: 'Бензопила', base: 10 },
      { id: 'flail', name: 'Цеп', base: 10 },
      { id: 'garrote', name: 'Удавка', base: 15 },
      { id: 'spear', name: 'Копьё', base: 20 },
      { id: 'sword', name: 'Меч', base: 20 },
      { id: 'whip', name: 'Кнут', base: 5 },
    ],
  },
  {
    id: 'firearms',
    name: 'Стрельба',
    base: 0,
    combat: 'firearms',
    description: 'Стрелять из огнестрельного оружия и луков.',
    specialities: [
      { id: 'handgun', name: 'Пистолет', base: 20 },
      { id: 'rifle-shotgun', name: 'Винтовка/дробовик', base: 25 },
      { id: 'bow', name: 'Лук', base: 15 },
      { id: 'flamethrower', name: 'Огнемёт', base: 10 },
      { id: 'heavy-weapons', name: 'Тяжёлое оружие', base: 10 },
      { id: 'machine-gun', name: 'Пулемёт', base: 10 },
      { id: 'submachine-gun', name: 'Пистолет-пулемёт', base: 15 },
    ],
  },
  {
    id: 'first-aid',
    name: 'Первая помощь',
    base: 30,
    description: 'Остановить кровь, перевязать, привести в чувство; спасти умирающего.',
  },
  {
    id: 'history',
    name: 'История',
    base: 5,
    description: 'События, люди и места прошлого; вспомнить, что здесь было раньше.',
  },
  {
    id: 'intimidate',
    name: 'Запугивание',
    base: 15,
    description: 'Заставить подчиниться угрозой, силой или видом.',
  },
  {
    id: 'jump',
    name: 'Прыжки',
    base: 20,
    description: 'Перепрыгнуть яму, спрыгнуть без вреда, прыгнуть в высоту.',
  },
  {
    id: 'language-other',
    name: 'Иностранный язык',
    base: 1,
    description: 'Читать и говорить на чужом языке.',
    specialities: [
      { id: 'latin', name: 'Латынь' },
      { id: 'french', name: 'Французский' },
      { id: 'german', name: 'Немецкий' },
      { id: 'english', name: 'Английский' },
      { id: 'greek', name: 'Древнегреческий' },
      { id: 'arabic', name: 'Арабский' },
      { id: 'chinese', name: 'Китайский' },
    ],
  },
  {
    id: 'language-own',
    name: 'Родной язык',
    base: { of: 'edu' },
    description: 'Грамотность и красноречие на родном языке. Начальное значение — ОБР.',
  },
  {
    id: 'law',
    name: 'Юриспруденция',
    base: 5,
    description: 'Законы, суды, лазейки и связи в системе правосудия.',
  },
  {
    id: 'library-use',
    name: 'Работа в библиотеке',
    base: 20,
    description: 'Найти нужное в архивах, газетах и каталогах.',
  },
  {
    id: 'listen',
    name: 'Слух',
    base: 20,
    description: 'Расслышать шаги за дверью, разговор, шорох в темноте.',
  },
  {
    id: 'locksmith',
    name: 'Взлом',
    base: 1,
    description: 'Открыть замок, сейф, наручники; изготовить ключ.',
  },
  {
    id: 'mechanical-repair',
    name: 'Механика',
    base: 10,
    description: 'Чинить механизмы и двигатели, мастерить приспособления.',
  },
  {
    id: 'medicine',
    name: 'Медицина',
    base: 1,
    description: 'Лечить болезни и раны, ставить диагноз, проводить вскрытие.',
  },
  {
    id: 'natural-world',
    name: 'Естествознание',
    base: 10,
    description: 'Растения, животные, погода и приметы природы.',
  },
  {
    id: 'navigate',
    name: 'Ориентирование',
    base: 10,
    description: 'Найти дорогу по карте, звёздам и местности.',
  },
  {
    id: 'occult',
    name: 'Оккультизм',
    base: 5,
    description: 'Магия, тайные общества, гримуары — то, во что верят люди (не Мифы).',
  },
  {
    id: 'operate-heavy-machinery',
    name: 'Тяжёлая техника',
    base: 1,
    description: 'Управлять краном, трактором, паровым котлом.',
  },
  {
    id: 'persuade',
    name: 'Убеждение',
    base: 10,
    description: 'Доводами убедить в своей правоте; требует времени.',
  },
  {
    id: 'pilot',
    name: 'Пилотирование',
    base: 1,
    description: 'Управлять самолётом, судном или дирижаблем.',
    specialities: [
      { id: 'aircraft', name: 'Самолёт' },
      { id: 'boat', name: 'Судно' },
    ],
  },
  {
    id: 'psychoanalysis',
    name: 'Психоанализ',
    base: 1,
    description: 'Лечить расстройства разума; вернуть рассудок после срыва.',
  },
  {
    id: 'psychology',
    name: 'Психология',
    base: 10,
    description: 'Понять человека: распознать ложь, мотивы и настроение.',
  },
  { id: 'ride', name: 'Верховая езда', base: 5, description: 'Ездить верхом и править упряжкой.' },
  {
    id: 'science',
    name: 'Наука',
    base: 1,
    description: 'Знания и методы одной из наук.',
    specialities: [
      { id: 'astronomy', name: 'Астрономия' },
      { id: 'biology', name: 'Биология' },
      { id: 'botany', name: 'Ботаника' },
      { id: 'chemistry', name: 'Химия' },
      { id: 'cryptography', name: 'Криптография' },
      { id: 'engineering', name: 'Инженерия' },
      { id: 'forensics', name: 'Криминалистика' },
      { id: 'geology', name: 'Геология' },
      { id: 'mathematics', name: 'Математика' },
      { id: 'meteorology', name: 'Метеорология' },
      { id: 'pharmacy', name: 'Фармацевтика' },
      { id: 'physics', name: 'Физика' },
      { id: 'zoology', name: 'Зоология' },
    ],
  },
  {
    id: 'sleight-of-hand',
    name: 'Ловкость рук',
    base: 10,
    description: 'Стащить, подбросить, спрятать в рукаве; фокусы.',
  },
  {
    id: 'spot-hidden',
    name: 'Внимание',
    base: 25,
    description: 'Заметить спрятанное: тайник, улику, засаду.',
  },
  { id: 'stealth', name: 'Скрытность', base: 20, description: 'Двигаться бесшумно и прятаться.' },
  {
    id: 'survival',
    name: 'Выживание',
    base: 10,
    description: 'Найти воду, еду и укрытие в дикой местности.',
    specialities: [
      { id: 'desert', name: 'Пустыня' },
      { id: 'sea', name: 'Море' },
      { id: 'arctic', name: 'Арктика' },
      { id: 'forest', name: 'Лес' },
    ],
  },
  { id: 'swim', name: 'Плавание', base: 20, description: 'Плыть, нырять, держаться на воде в одежде.' },
  { id: 'throw', name: 'Метание', base: 20, description: 'Бросить точно: камень, нож, динамитную шашку.' },
  { id: 'track', name: 'Выслеживание', base: 10, description: 'Идти по следу человека или зверя.' },

  // Not on the standard sheet.
  {
    id: 'animal-handling',
    name: 'Обращение с животными',
    base: 5,
    uncommon: true,
    description: 'Дрессировать и успокаивать животных.',
  },
  {
    id: 'artillery',
    name: 'Артиллерия',
    base: 1,
    uncommon: true,
    description: 'Наводить и обслуживать пушки и миномёты.',
  },
  {
    id: 'demolitions',
    name: 'Подрывное дело',
    base: 1,
    uncommon: true,
    description: 'Закладывать и обезвреживать взрывчатку.',
  },
  {
    id: 'diving',
    name: 'Водолазное дело',
    base: 1,
    uncommon: true,
    description: 'Работать под водой в снаряжении.',
  },
  {
    id: 'hypnosis',
    name: 'Гипноз',
    base: 1,
    uncommon: true,
    description: 'Ввести в транс, внушить, помочь вспомнить.',
  },
  {
    id: 'lore',
    name: 'Знание',
    base: 1,
    uncommon: true,
    description: 'Узкая область знаний (Знание снов, Знание НЛО…).',
    specialities: [{ id: 'dreams', name: 'Сны' }],
  },
  {
    id: 'read-lips',
    name: 'Чтение по губам',
    base: 1,
    uncommon: true,
    description: 'Понять речь по движению губ.',
  },
];

/** The interpersonal skills an occupation's "one social skill" can be. */
export const SOCIAL_SKILLS = ['charm', 'fast-talk', 'intimidate', 'persuade'];

/** A skill or a speciality by its id (`spot-hidden`, `science:biology`). */
export function skillDef(
  id: string,
): { skill: SkillDef; speciality?: { id: string; name: string; base?: number } } | undefined {
  const [family, speciality] = id.split(':');
  const skill = SKILLS.find((s) => s.id === family);
  if (!skill) return undefined;
  if (!speciality) return { skill };
  return {
    skill,
    speciality: skill.specialities?.find((s) => s.id === speciality) ?? { id: speciality, name: speciality },
  };
}

/** Name for people: "Наука (Биология)", "Стрельба (Пистолет)". */
export function skillName(id: string): string {
  const found = skillDef(id);
  if (!found) return id;
  return found.speciality ? `${found.skill.name} (${found.speciality.name})` : found.skill.name;
}
