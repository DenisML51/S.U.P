import type { CatalogEntryDef, ChoiceDef, OptionDef, SpellListId } from '../types';
import { PACT_SLOTS } from './classes/shared';

/**
 * Eldritch Invocations of the 2024 Warlock (Таинственные воззвания). `prerequisite.level` is the
 * warlock level. Descriptions are our own summaries of the rules.
 */

/** Pact Magic pool id (`PACT_SLOTS_ID` of the build engine). */
const PACT_POOL = 'pact-slots';

const ALL_LISTS: SpellListId[] = ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'];

/** Warlock cantrips that deal damage, for the invocations that improve one of them. */
const CANTRIPS: Record<string, string> = {
  'eldritch-blast': 'Мистический заряд',
  'chill-touch': 'Леденящее прикосновение',
  'mind-sliver': 'Расщепление разума',
  'poison-spray': 'Ядовитые брызги',
  thunderclap: 'Раскат грома',
  'toll-the-dead': 'Погребальный звон',
};

const cantripOptions = (ids: string[]): OptionDef[] => ids.map((id) => ({ id, name: CANTRIPS[id]!, description: '' }));

/** The cantrip a repeatable cantrip invocation improves; a new one each time it is taken. */
const cantripChoice = (invocation: string, ids: string[]): ChoiceDef => ({
  id: 'cantrip',
  label: 'Заговор',
  count: 1,
  pool: `${invocation}-cantrips`,
  hint: 'Известный вам заговор колдуна, наносящий урон.',
  options: { from: 'options', options: cantripOptions(ids) },
});

const DAMAGING = 'заговор колдуна, наносящий урон';
const REPEAT_CANTRIP = '\n\n**Повторяемость.** Можно взять несколько раз, каждый раз — для другого заговора.';

/** An invocation that lets the warlock cast a spell without a slot. */
const freeSpell = (id: string, name: string, spell: string, spellName: string, level: number | undefined, iconName: string, extra = ''): CatalogEntryDef => ({
  id,
  name,
  catalog: 'invocations',
  description: `Вы можете творить «${spellName}»${extra} без траты ячейки заклинаний — сколько угодно раз.`,
  action: 'passive',
  iconName,
  effects: [{ type: 'spell', spell, alwaysPrepared: true, note: 'Без ячейки' }],
  ...(level ? { prerequisite: { level } } : {}),
});

export const INVOCATIONS: CatalogEntryDef[] = [
  // Pacts.
  {
    id: 'pact-of-the-blade',
    name: 'Договор клинка',
    catalog: 'invocations',
    description:
      'Бонусным действием вы призываете в руку оружие договора — простое или воинское рукопашное оружие на выбор — либо связываетесь с магическим оружием, которого касаетесь (если на него не настроен другой и оно не связано с другим колдуном). Пока связь длится, вы владеете этим оружием, используете его как заклинательную фокусировку, атакуете им Харизмой вместо Силы или Ловкости и можете наносить им некротический, психический или лучистый урон вместо обычного. Связь кончается, если вы повторите бонусное действие, оружие дольше 1 минуты дальше 5 футов от вас или вы умираете; призванное оружие тогда исчезает.',
    action: 'bonus',
    iconName: 'rune-sword',
    effects: [{ type: 'weaponAbility', ability: 'charisma', weapons: 'any' }],
  },
  {
    id: 'pact-of-the-chain',
    name: 'Договор цепи',
    catalog: 'invocations',
    description:
      'Вы знаете «Обретение фамильяра» и творите его действием «Магия» без ячейки. Помимо обычных форм фамильяр может быть бесом, квазитом, псевдодраконом, скелетом, головастиком слаада, спрайтом, сфинксом любознательности или ядовитой змеёй. Совершая действие «Атака», вы можете отказаться от одной своей атаки, чтобы фамильяр реакцией совершил одну свою.',
    action: 'passive',
    iconName: 'chained-heart',
    effects: [{ type: 'spell', spell: 'find-familiar', alwaysPrepared: true, note: 'Без ячейки' }],
  },
  {
    id: 'pact-of-the-tome',
    name: 'Договор гримуара',
    catalog: 'invocations',
    description:
      'В конце короткого или продолжительного отдыха в вашей руке появляется Книга теней. Когда она появляется, вы выбираете три заговора и два заклинания 1-го круга с меткой «ритуал» из списка любого класса (не уже подготовленные). Пока книга у вас, эти заклинания подготовлены и считаются заклинаниями колдуна; книга служит заклинательной фокусировкой. Она исчезает, если вы умираете или призываете новую.',
    action: 'passive',
    iconName: 'evil-book',
    choices: [
      { id: 'cantrips', label: 'Заговоры Книги теней (3)', count: 3, spellAbility: 'charisma', options: { from: 'spells', lists: ALL_LISTS, maxLevel: 0 } },
      { id: 'rituals', label: 'Ритуалы Книги теней (2)', count: 2, spellAbility: 'charisma', options: { from: 'spells', lists: ALL_LISTS, minLevel: 1, maxLevel: 1, ritual: true } },
    ],
  },

  // Cantrip improvements.
  {
    id: 'agonizing-blast',
    name: 'Мучительный взрыв',
    catalog: 'invocations',
    description: `К урону выбранного заговора колдуна, наносящего урон, вы добавляете модификатор Харизмы.${REPEAT_CANTRIP}`,
    action: 'passive',
    iconName: 'fire-ray',
    prerequisite: { level: 2, text: DAMAGING },
    repeatable: true,
    choices: [cantripChoice('agonizing-blast', Object.keys(CANTRIPS))],
  },
  {
    id: 'eldritch-spear',
    name: 'Мистическое копьё',
    catalog: 'invocations',
    description: `Дистанция выбранного заговора колдуна, наносящего урон (с дистанцией от 10 футов), увеличивается на 30 × уровень колдуна футов.${REPEAT_CANTRIP}`,
    action: 'passive',
    iconName: 'bolt-spell-cast',
    prerequisite: { level: 2, text: DAMAGING },
    repeatable: true,
    choices: [cantripChoice('eldritch-spear', ['eldritch-blast', 'mind-sliver', 'poison-spray', 'toll-the-dead'])],
  },
  {
    id: 'repelling-blast',
    name: 'Отталкивающий заряд',
    catalog: 'invocations',
    description: `Попав выбранным заговором колдуна (наносящим урон броском атаки) по Большому или меньшему существу, вы можете оттолкнуть его от себя по прямой на расстояние до 10 футов.${REPEAT_CANTRIP}`,
    action: 'passive',
    iconName: 'shield-impact',
    prerequisite: { level: 2, text: 'заговор колдуна, наносящий урон броском атаки' },
    repeatable: true,
    choices: [cantripChoice('repelling-blast', ['eldritch-blast', 'chill-touch', 'poison-spray'])],
  },

  // Spells without slots.
  freeSpell('armor-of-shadows', 'Доспех теней', 'mage-armor', 'Доспех мага', undefined, 'shadow-follower', ' на себя'),
  freeSpell('otherworldly-leap', 'Потусторонний прыжок', 'jump', 'Прыжок', 2, 'sprint', ' на себя'),
  {
    ...freeSpell('fiendish-vigor', 'Мощь исчадия', 'false-life', 'Псевдожизнь', 2, 'heart-plus', ' на себя'),
    description: 'Вы можете творить «Псевдожизнь» на себя без траты ячейки — сколько угодно раз. Временные хиты не бросаются: вы получаете максимум костей.',
  },
  freeSpell('mask-of-many-faces', 'Маска многих лиц', 'disguise-self', 'Маскировка', 2, 'drama-masks'),
  freeSpell('misty-visions', 'Туманные видения', 'silent-image', 'Безмолвный образ', 2, 'smoking-orb'),
  freeSpell('ascendant-step', 'Восходящий шаг', 'levitate', 'Левитация', 5, 'feathered-wing', ' на себя'),
  freeSpell('master-of-myriad-forms', 'Мастер бесчисленных обликов', 'alter-self', 'Смена обличья', 5, 'mirror-mirror'),
  {
    ...freeSpell('one-with-shadows', 'Один среди теней', 'invisibility', 'Невидимость', 5, 'invisible', ' на себя'),
    description: 'Находясь в тусклом свете или темноте, вы можете творить «Невидимость» на себя без траты ячейки — сколько угодно раз.',
  },
  freeSpell('whispers-of-the-grave', 'Могильный шёпот', 'speak-with-dead', 'Разговор с мёртвыми', 7, 'death-skull'),
  freeSpell('visions-of-distant-realms', 'Видения дальних земель', 'arcane-eye', 'Магический глаз', 9, 'crystal-ball'),

  // Pact of the Blade.
  {
    id: 'thirsting-blade',
    name: 'Жаждущий клинок',
    catalog: 'invocations',
    description: 'Вы получаете Дополнительную атаку для оружия договора: совершая действие «Атака» с ним, вы атакуете дважды.',
    action: 'passive',
    iconName: 'crossed-swords',
    prerequisite: { level: 5, entry: 'pact-of-the-blade' },
    effects: [{ type: 'extraAttack', attacks: 2 }],
  },
  {
    id: 'eldritch-smite',
    name: 'Мистическая кара',
    catalog: 'invocations',
    description:
      'Раз в ход, попав оружием договора, вы можете потратить ячейку Магии договора: цель получает 1к8 силового урона плюс 1к8 за каждый круг ячейки и, если она Огромная или меньше, может быть сбита с ног.',
    action: 'passive',
    iconName: 'spiky-explosion',
    usesResource: { id: PACT_POOL },
    damage: (ctx) => `${1 + (PACT_SLOTS[Math.min(20, Math.max(1, ctx.classLevel)) - 1]?.level ?? 1)}d8`,
    damageType: 'Силовой',
    prerequisite: { level: 5, entry: 'pact-of-the-blade' },
  },
  {
    id: 'lifedrinker',
    name: 'Пьющий жизни',
    catalog: 'invocations',
    description:
      'Раз в ход, попав оружием договора, вы наносите дополнительно 1к6 некротического, психического или лучистого урона (на выбор) и можете потратить одну кость хитов, восстановив хиты, равные её броску + модификатор Телосложения (минимум 1).',
    action: 'passive',
    iconName: 'bleeding-wound',
    damage: '1d6',
    damageType: 'Некротический',
    prerequisite: { level: 9, entry: 'pact-of-the-blade' },
  },
  {
    id: 'devouring-blade',
    name: 'Пожирающий клинок',
    catalog: 'invocations',
    description: 'Жаждущий клинок даёт вам две дополнительные атаки вместо одной: с оружием договора вы атакуете трижды.',
    action: 'passive',
    iconName: 'sword-spin',
    prerequisite: { level: 12, entry: 'thirsting-blade' },
    effects: [{ type: 'extraAttack', attacks: 3 }],
  },

  // Pact of the Chain and Pact of the Tome.
  {
    id: 'investment-of-the-chain-master',
    name: 'Облачение хозяина цепи',
    catalog: 'invocations',
    description:
      'Фамильяр, призванный «Обретением фамильяра», получает:\n\n- скорость полёта или плавания 40 футов (на выбор);\n- бонусным действием вы приказываете ему совершить действие «Атака»;\n- его дробящий, колющий и рубящий урон может быть некротическим или лучистым;\n- его спасброски используют СЛ ваших заклинаний;\n- реакцией вы даёте ему сопротивление получаемому урону.',
    action: 'bonus',
    iconName: 'imp',
    prerequisite: { level: 5, entry: 'pact-of-the-chain' },
  },
  {
    id: 'gift-of-the-protectors',
    name: 'Дар защитников',
    catalog: 'invocations',
    description:
      'В Книге теней появляется страница, на которой существа с вашего разрешения могут действием вписать имя (до модификатора Харизмы имён, минимум 1). Когда хиты вписанного существа опускаются до 0, но оно не убито сразу, они становятся 1. Срабатывает раз в продолжительный отдых на всех. Действием «Магия» вы стираете имя.',
    action: 'passive',
    iconName: 'book-cover',
    resource: { id: 'gift-of-the-protectors', name: 'Дар защитников', max: 1, recharge: 'long' },
    prerequisite: { level: 9, entry: 'pact-of-the-tome' },
  },

  // Everything else.
  {
    id: 'eldritch-mind',
    name: 'Мистический разум',
    catalog: 'invocations',
    description: 'Вы совершаете с преимуществом спасброски Телосложения для поддержания концентрации.',
    action: 'passive',
    iconName: 'brain',
  },
  {
    id: 'devils-sight',
    name: 'Дьявольское зрение',
    catalog: 'invocations',
    description: 'Вы нормально видите в тусклом свете и темноте, в том числе магической, в пределах 120 футов.',
    action: 'passive',
    iconName: 'evil-eyes',
    prerequisite: { level: 2 },
  },
  {
    id: 'lessons-of-the-first-ones',
    name: 'Уроки древних',
    catalog: 'invocations',
    description: 'Вы получаете одну черту происхождения на выбор.\n\n**Повторяемость.** Можно взять несколько раз, каждый раз — с новой чертой.',
    action: 'passive',
    iconName: 'gift-of-knowledge',
    prerequisite: { level: 2 },
    repeatable: true,
    choices: [{ id: 'feat', label: 'Черта происхождения', count: 1, options: { from: 'feats', categories: ['origin'] } }],
  },
  {
    id: 'gaze-of-two-minds',
    name: 'Взор двух умов',
    catalog: 'invocations',
    description:
      'Бонусным действием вы касаетесь согласного существа и до конца своего следующего хода воспринимаете мир его чувствами (с его особыми чувствами); каждым следующим бонусным действием связь продлевается, пока вы на одном плане. Пока связь длится и вы в пределах 60 футов друг от друга, вы можете творить заклинания так, будто находитесь в его пространстве.',
    action: 'bonus',
    iconName: 'third-eye',
    prerequisite: { level: 5 },
  },
  {
    id: 'gift-of-the-depths',
    name: 'Дар глубин',
    catalog: 'invocations',
    description: 'Вы дышите под водой и получаете скорость плавания, равную вашей скорости. Раз в продолжительный отдых вы можете сотворить «Подводное дыхание» без ячейки.',
    action: 'passive',
    iconName: 'wave-crest',
    resource: { id: 'gift-of-the-depths', name: 'Подводное дыхание без ячейки', max: 1, recharge: 'long' },
    effects: [{ type: 'spell', spell: 'water-breathing', alwaysPrepared: true }],
    prerequisite: { level: 5 },
  },
  {
    id: 'witch-sight',
    name: 'Ведьмачий взор',
    catalog: 'invocations',
    description: 'Вы получаете истинное зрение на 30 футов.',
    action: 'passive',
    iconName: 'burning-eye',
    prerequisite: { level: 15 },
  },
];
