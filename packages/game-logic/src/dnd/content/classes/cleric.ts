import { byClassLevel, modifierOf } from '../../helpers';
import type { BuildContext, ClassDef, FeatureDef, KitOption, SkillId, SubclassDef } from '../../types';
import { ARTISAN_TOOL_NAMES } from '../equipment';
import { abilityScoreImprovement, byTable, epicBoon, subclassHeading, multiclassProficiencies } from './shared';

/** Жрец of the 2024 Player's Handbook. Descriptions are our own summaries of the rules. */

const CHANNEL_DIVINITY = 'cleric.channel-divinity';

/** Spell save DC of the cleric: Channel Divinity effects use it too. */
const spellDC = (ctx: BuildContext) => 8 + ctx.proficiencyBonus + ctx.modifier('wisdom');

/** "+N" / "-N" for a modifier added to dice ("1d8+3"). */
const plus = (modifier: number) => (modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : `${modifier}`);

const channelOption = (
  id: string,
  name: string,
  description: string,
  extra: Partial<FeatureDef> = {},
): FeatureDef => ({
  id,
  name,
  description,
  action: 'action',
  usesResource: { id: CHANNEL_DIVINITY },
  iconName: 'sunbeams',
  ...extra,
});

const CLERIC_KITS: KitOption[] = [
  {
    id: 'a',
    label: 'A',
    items: [{ ref: 'chain-shirt' }, { ref: 'shield' }, { ref: 'mace' }, { ref: 'holy-symbol' }, { ref: 'priests-pack' }],
    gold: 7,
  },
  { id: 'b', label: 'B', items: [], gold: 110 },
];

// ------------------------------------------------------------------------------------------------
// Domains
// ------------------------------------------------------------------------------------------------

const life: SubclassDef = {
  id: 'life-domain',
  name: 'Домен жизни',
  description: 'Служитель положительной энергии, питающей всё живое: мастер исцеления, чьи заклинания лечат сильнее и чаще.',
  alwaysPrepared: {
    3: ['aid', 'bless', 'cure-wounds', 'lesser-restoration'],
    5: ['mass-healing-word', 'revivify'],
    7: ['aura-of-life', 'death-ward'],
    9: ['greater-restoration', 'mass-cure-wounds'],
  },
  levels: {
    3: [
      {
        id: 'life.disciple-of-life',
        name: 'Поборник жизни',
        description: 'Когда заклинание, сотворённое с ячейкой, восстанавливает существу хиты, в этот ход оно восстанавливает дополнительно 2 + круг ячейки хитов.',
        action: 'passive',
        iconName: 'heart-plus',
      },
      channelOption(
        'life.preserve-life',
        'Сохранение жизни',
        'Действием «Магия» вы показываете священный символ и тратите Проведение божественности: распределите между Окровавленными существами в пределах 30 футов (можно и себе) хиты в количестве 5 × уровень жреца. Существо не может восстановить так больше половины своего максимума хитов.',
        { damage: (ctx) => String(5 * ctx.classLevel), damageType: 'Лечение', iconName: 'healing', color: '#7fc98a' },
      ),
    ],
    6: [
      {
        id: 'life.blessed-healer',
        name: 'Благословенный целитель',
        description: 'Сразу после того, как вы сотворили с ячейкой заклинание, восстановившее хиты хотя бы одному существу кроме вас, вы восстанавливаете себе 2 + круг ячейки хитов.',
        action: 'passive',
        iconName: 'healing-shield',
      },
    ],
    17: [
      {
        id: 'life.supreme-healing',
        name: 'Высшее исцеление',
        description: 'Когда заклинание или Проведение божественности восстанавливает хиты бросками костей, вы не бросаете их, а берёте максимальное значение каждой кости (2к6 → 12).',
        action: 'passive',
        iconName: 'regeneration',
      },
    ],
  },
};

const light: SubclassDef = {
  id: 'light-domain',
  name: 'Домен света',
  description: 'Носитель пылающего огня и истины: жрец, который выжигает тьму лучистым светом и слепит врагов вспышками.',
  alwaysPrepared: {
    3: ['burning-hands', 'faerie-fire', 'scorching-ray', 'see-invisibility'],
    5: ['daylight', 'fireball'],
    7: ['arcane-eye', 'wall-of-fire'],
    9: ['flame-strike', 'scrying'],
  },
  levels: {
    3: [
      {
        id: 'light.warding-flare',
        name: 'Ограждающая вспышка',
        description:
          'Реакцией, когда видимое вами существо в пределах 30 футов совершает бросок атаки, вы накладываете на него помеху вспышкой света (до того, как станет ясен результат). Использований — модификатор Мудрости (минимум 1); восполняются после продолжительного отдыха (с 6-го уровня — и после короткого).',
        action: 'reaction',
        resource: {
          id: 'light.warding-flare',
          name: 'Ограждающая вспышка',
          max: modifierOf('wisdom'),
          recharge: (ctx) => (ctx.classLevel >= 6 ? 'shortOrLong' : 'long'),
        },
        iconName: 'shield-reflect',
        color: '#f2d16b',
      },
      channelOption(
        'light.radiance-of-the-dawn',
        'Сияние рассвета',
        'Действием «Магия» вы показываете священный символ и тратите Проведение божественности: вспышка в эманации 30 футов рассеивает магическую тьму, а выбранные существа в ней совершают спасбросок Телосложения — 2к10 + уровень жреца урона излучением при провале, половина при успехе.',
        {
          damage: (ctx) => `2d10+${ctx.classLevel}`,
          damageType: 'Лучистый',
          saveAttribute: 'constitution',
          saveDC: spellDC,
          iconName: 'sunrise',
          color: '#f2d16b',
        },
      ),
    ],
    6: [
      {
        id: 'light.improved-warding-flare',
        name: 'Улучшенная ограждающая вспышка',
        description: 'Ограждающая вспышка восполняется и после короткого отдыха. Используя её, вы можете дать цели атаки временные хиты: 2к6 + модификатор Мудрости.',
        action: 'passive',
        iconName: 'energy-shield',
      },
    ],
    17: [
      {
        id: 'light.corona-of-light',
        name: 'Корона света',
        description:
          'Действием «Магия» вы на 1 минуту (или пока не прекратите, без действия) излучаете солнечный свет: яркий на 60 футов и тусклый ещё на 30. Враги в ярком свете совершают с помехой спасброски от Сияния рассвета и от заклинаний, наносящих урон огнём или излучением. Использований — модификатор Мудрости (минимум 1) за продолжительный отдых.',
        action: 'action',
        resource: { id: 'light.corona-of-light', name: 'Корона света', max: modifierOf('wisdom'), recharge: 'long' },
        iconName: 'sun',
        color: '#f2d16b',
      },
    ],
  },
};

const trickery: SubclassDef = {
  id: 'trickery-domain',
  name: 'Домен обмана',
  description: 'Пакостник и освободитель: иллюзии, скрытность и двойник, который отвлекает врагов и творит за вас заклинания.',
  alwaysPrepared: {
    3: ['charm-person', 'disguise-self', 'invisibility', 'pass-without-trace'],
    5: ['hypnotic-pattern', 'nondetection'],
    7: ['confusion', 'dimension-door'],
    9: ['dominate-person', 'modify-memory'],
  },
  levels: {
    3: [
      {
        id: 'trickery.blessing-of-the-trickster',
        name: 'Благословение обманщика',
        description: 'Действием «Магия» вы благословляете себя или согласное существо в пределах 30 футов: оно совершает с преимуществом проверки Ловкости (Скрытность), пока вы не закончите продолжительный отдых или не используете умение снова.',
        action: 'action',
        iconName: 'hood',
      },
      channelOption(
        'trickery.invoke-duplicity',
        'Двуличность',
        'Бонусным действием вы тратите Проведение божественности и создаёте неосязаемую иллюзию себя в незанятом пространстве в пределах 30 футов на 1 минуту (пока вы дееспособны; можно рассеять без действия). Пока она есть:\n\n- **Заклинания.** Вы можете творить их так, будто находитесь на месте иллюзии (пользуясь своими чувствами).\n- **Отвлечение.** Если вы и иллюзия в пределах 5 футов от существа, которое её видит, ваши атаки по нему совершаются с преимуществом.\n- **Перемещение.** Бонусным действием иллюзию можно переместить на 30 футов в видимое пространство в пределах 120 футов.',
        { action: 'bonus', iconName: 'mirror-mirror' },
      ),
    ],
    6: [
      {
        id: 'trickery.tricksters-transposition',
        name: 'Рокировка',
        description: 'Каждый раз, когда вы бонусным действием создаёте или перемещаете иллюзию Двуличности, вы можете телепортироваться, поменявшись с ней местами.',
        action: 'passive',
        iconName: 'teleport',
      },
    ],
    17: [
      {
        id: 'trickery.improved-duplicity',
        name: 'Улучшенная двуличность',
        description:
          '- **Усиленное отвлечение.** Вы и союзники совершаете с преимуществом атаки по существам в пределах 5 футов от иллюзии.\n- **Иллюзия исцеления.** Когда иллюзия исчезает, вы или существо в пределах 5 футов от неё восстанавливаете хиты, равные уровню жреца.',
        action: 'passive',
        damage: (ctx) => String(ctx.classLevel),
        damageType: 'Лечение',
        iconName: 'invisible',
      },
    ],
  },
};

const war: SubclassDef = {
  id: 'war-domain',
  name: 'Домен войны',
  description: 'Боевой священник, вдохновляющий на доблесть: лишние удары, божественная меткость и неуязвимость в гуще сражения.',
  alwaysPrepared: {
    3: ['guiding-bolt', 'magic-weapon', 'shield-of-faith', 'spiritual-weapon'],
    5: ['crusaders-mantle', 'spirit-guardians'],
    7: ['fire-shield', 'freedom-of-movement'],
    9: ['hold-monster', 'steel-wind-strike'],
  },
  levels: {
    3: [
      {
        id: 'war.war-priest',
        name: 'Боевой священник',
        description: 'Бонусным действием вы совершаете одну атаку оружием или безоружный удар. Использований — модификатор Мудрости (минимум 1); восполняются после короткого или продолжительного отдыха.',
        action: 'bonus',
        resource: { id: 'war.war-priest', name: 'Боевой священник', max: modifierOf('wisdom'), recharge: 'shortOrLong' },
        iconName: 'sword-brandish',
      },
      channelOption(
        'war.guided-strike',
        'Направленный удар',
        'Когда вы или существо в пределах 30 футов промахивается броском атаки, вы можете потратить Проведение божественности и дать броску +10, что может превратить промах в попадание. Для броска другого существа это требует реакции.',
        { action: 'reaction', iconName: 'eye-target' },
      ),
    ],
    6: [
      channelOption(
        'war.war-gods-blessing',
        'Благословение бога войны',
        'Вы можете сотворить «Щит веры» или «Духовное оружие», потратив вместо ячейки Проведение божественности. Тогда заклинание не требует концентрации, но длится 1 минуту и оканчивается раньше, если вы сотворите его снова, станете Недееспособным или умрёте.',
        { action: 'passive', iconName: 'rune-sword' },
      ),
    ],
    17: [
      {
        id: 'war.avatar-of-battle',
        name: 'Воплощение битвы',
        description: 'Вы получаете сопротивление дробящему, колющему и рубящему урону.',
        action: 'passive',
        effects: [
          { type: 'resistance', damageType: 'Дробящий' },
          { type: 'resistance', damageType: 'Колющий' },
          { type: 'resistance', damageType: 'Рубящий' },
        ],
        iconName: 'spartan-helmet',
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// Domains of the supplement books
// ------------------------------------------------------------------------------------------------

const KNOWLEDGE_SKILLS: { id: SkillId; name: string }[] = [
  { id: 'history', name: 'История' },
  { id: 'nature', name: 'Природа' },
  { id: 'religion', name: 'Религия' },
  { id: 'arcana', name: 'Тайная магия' },
];

const knowledge: SubclassDef = {
  id: 'knowledge-domain',
  name: 'Домен знаний',
  description: 'Служитель учения и понимания: эксперт в древних знаниях, читающий мысли и творящий прорицания силой своего бога.',
  source: 'Forgotten Realms: Heroes of Faerûn',
  alwaysPrepared: {
    3: ['command', 'comprehend-languages', 'detect-magic', 'detect-thoughts', 'identify', 'mind-spike'],
    5: ['dispel-magic', 'nondetection', 'tongues'],
    7: ['arcane-eye', 'banishment', 'confusion'],
    9: ['legend-lore', 'scrying', 'synaptic-static'],
  },
  levels: {
    3: [
      {
        id: 'knowledge.blessings-of-knowledge',
        name: 'Благословенные знания',
        description: 'Вы владеете одним видом инструментов ремесленника на выбор и двумя навыками из списка: История, Природа, Религия, Тайная магия. В выбранных навыках у вас Экспертность.',
        iconName: 'gift-of-knowledge',
        choices: [
          { id: 'tool', label: 'Инструменты ремесленника', count: 1, options: { from: 'tools', list: ARTISAN_TOOL_NAMES } },
          {
            id: 'skills',
            label: 'Навыки с Экспертностью (2)',
            count: 2,
            options: {
              from: 'options',
              options: KNOWLEDGE_SKILLS.map(({ id, name }) => ({
                id,
                name,
                description: `Владение и Экспертность: ${name}.`,
                effects: [
                  { type: 'skill', skill: id },
                  { type: 'expertise', skill: id },
                ],
              })),
            },
          },
        ],
      },
      channelOption(
        'knowledge.mind-magic',
        'Магия разума',
        'Действием «Магия» вы тратите Проведение божественности и сотворяете одно подготовленное заклинание Прорицания из списка заклинаний домена знаний — без ячейки и без материальных компонентов. Подходят: «Обнаружение магии», «Обнаружение мыслей», «Опознание», «Понимание языков», «Пронзание разума», «Языки», «Магический глаз», «Знание легенд», «Наблюдение».',
        { iconName: 'third-eye', color: '#8fb3e0' },
      ),
    ],
    6: [
      {
        id: 'knowledge.unfettered-mind',
        name: 'Разум освобождённый',
        description: 'Вы получаете телепатию на 60 футов и можете одновременно поддерживать связь с числом существ, равным модификатору Мудрости (минимум 1). Вы владеете спасбросками Интеллекта; если уже владели — выберите спасбросок другой характеристики (отметьте его на листе сами).',
        action: 'passive',
        effects: [{ type: 'save', attribute: 'intelligence' }],
        iconName: 'psychic-waves',
      },
    ],
    17: [
      {
        id: 'knowledge.divine-foresight',
        name: 'Божественное предзнание',
        description: 'Бонусным действием вы заглядываете в будущее: в течение часа все ваши тесты к20 совершаются с преимуществом. Раз в продолжительный отдых; использование можно вернуть, потратив ячейку 6-го круга или выше (без действия).',
        action: 'bonus',
        resource: { id: 'knowledge.divine-foresight', name: 'Божественное предзнание', max: 1, recharge: 'long', iconName: 'all-seeing-eye' },
        iconName: 'all-seeing-eye',
        color: '#8fb3e0',
      },
    ],
  },
};

const grave: SubclassDef = {
  id: 'grave-domain',
  name: 'Домен упокоения',
  description: 'Страж грани между жизнью и смертью: добивает раненых, проклинает врагов, не даёт союзникам умереть раньше срока и упокаивает нежить.',
  source: 'Ravenloft: The Horrors Within',
  alwaysPrepared: {
    3: ['detect-evil-and-good', 'false-life', 'gentle-repose', 'ray-of-enfeeblement', 'spare-the-dying'],
    5: ['revivify', 'vampiric-touch'],
    7: ['blight', 'death-ward'],
    9: ['dispel-evil-and-good', 'raise-dead'],
  },
  levels: {
    3: [
      {
        id: 'grave.circle-of-mortality',
        name: 'Круговорот жизни и смерти',
        description:
          '- **Толчок к смерти.** Раз в ход, нанося урон заклинанием или атакой существу, у которого хитов меньше максимума, вы добавляете 1к4 некротического урона (1к6 с 11-го уровня).\n- **Возвращение к жизни.** «Уход за умирающим» вы творите бонусным действием. Когда заклинание или Проведение божественности восстанавливает хиты существу с 0 хитов, вы не бросаете кости, а берёте максимум каждой (2к4 → 8).',
        action: 'passive',
        damage: (ctx) => (ctx.classLevel >= 11 ? '1d6' : '1d4'),
        damageType: 'Некротический',
        iconName: 'life-in-the-balance',
        color: '#8a7fb8',
      },
      channelOption(
        'grave.path-to-the-grave',
        'Путь к могиле',
        'Бонусным действием вы показываете священный символ и тратите Проведение божественности: видимое существо в пределах 30 футов проклято до начала вашего следующего хода и совершает броски атаки и спасброски с помехой. Когда вы или видимый вами союзник попадаете по нему атакой, вы можете снять проклятие (без действия), и эта атака наносит дополнительный некротический урон или урон излучением, равный уровню жреца.',
        { action: 'bonus', damage: (ctx) => String(ctx.classLevel), damageType: 'Некротический', iconName: 'cursed-star', color: '#8a7fb8' },
      ),
    ],
    6: [
      {
        id: 'grave.sentinel-at-deaths-door',
        name: 'Страж на пороге смерти',
        description: 'Когда атака попадает по вам или по Окровавленному существу, которое вы видите в пределах 60 футов, вы можете реакцией уменьшить её урон вдвое (с округлением вниз); критическое попадание при этом теряет все особые эффекты. Использований — модификатор Мудрости (минимум 1) за продолжительный отдых.',
        action: 'reaction',
        resource: { id: 'grave.sentinel-at-deaths-door', name: 'Страж на пороге смерти', max: modifierOf('wisdom'), recharge: 'long', iconName: 'checked-shield' },
        iconName: 'checked-shield',
      },
    ],
    17: [
      channelOption(
        'grave.improved-necromancy',
        'Усовершенствованная некромантия',
        'Творя заклинание Некромантии 5-го круга или ниже, нацеленное только на одно существо, или одно из заклинаний домена упокоения, вы можете потратить Проведение божественности и выбрать ещё одну цель в пределах дистанции. Расходуемые или имеющие цену материальные компоненты нужны на каждую цель.',
        { action: 'passive', iconName: 'skull-staff' },
      ),
      {
        id: 'grave.keeper-of-souls',
        name: 'Хранитель душ',
        description: 'Когда враг умирает в пределах 60 футов от вас, вы или другое существо в пределах 60 футов восстанавливаете хиты, равные удвоенному уровню жреца. Не работает, пока вы Недееспособны. Раз в короткий или продолжительный отдых; использование можно вернуть, потратив ячейку 6-го круга или выше (без действия).',
        action: 'passive',
        resource: { id: 'grave.keeper-of-souls', name: 'Хранитель душ', max: 1, recharge: 'shortOrLong', iconName: 'spectre' },
        damage: (ctx) => String(2 * ctx.classLevel),
        damageType: 'Лечение',
        iconName: 'spectre',
        color: '#7fc98a',
      },
    ],
  },
};

const arcana: SubclassDef = {
  id: 'arcana-domain',
  name: 'Домен магии',
  description: 'Хранитель тайн магии, который несёт её как дар: усиливает свои заклинания Проведением божественности, знает заговоры волшебника и под конец — его величайшие заклинания.',
  source: 'Arcana Unleashed',
  alwaysPrepared: {
    3: ['detect-magic', 'magic-missile', 'magic-weapon', 'nystuls-magic-aura'],
    5: ['counterspell', 'dispel-magic'],
    7: ['arcane-eye', 'leomunds-secret-chest'],
    9: ['bigbys-hand', 'teleportation-circle'],
  },
  levels: {
    3: [
      channelOption(
        'arcana.empowering-spell',
        'Изменение магии: укрепляющее заклинание',
        'Сотворяя заклинание, вы можете потратить Проведение божественности (без действия): одна из целей заклинания получает временные хиты — 2к8 + уровень жреца.',
        { action: 'passive', damage: (ctx) => `2d8+${ctx.classLevel}`, iconName: 'magic-shield', color: '#9b8fe0' },
      ),
      channelOption(
        'arcana.persisting-spell',
        'Изменение магии: упорное заклинание',
        'Сотворяя заклинание, требующее спасброска, вы можете потратить Проведение божественности (без действия): если видимое вами существо преуспевает в спасброске, бросьте 1к6 и вычтите результат из этого спасброска.',
        { action: 'passive', damage: '1d6', iconName: 'divided-spiral', color: '#9b8fe0' },
      ),
      {
        id: 'arcana.arcane-initiate',
        name: 'Изучающий магию',
        description: 'Вы владеете навыком Тайная магия или другим навыком из списка жреца 1-го уровня. Вы узнаёте два заговора волшебника; они считаются для вас заклинаниями жреца. Повышая уровень жреца, один из них можно заменить другим заговором волшебника.',
        iconName: 'crystal-wand',
        choices: [
          { id: 'skill', label: 'Навык', count: 1, options: { from: 'skills', list: ['arcana', 'history', 'insight', 'medicine', 'persuasion', 'religion'] } },
          {
            id: 'cantrips',
            label: 'Заговоры волшебника (2)',
            count: 2,
            pool: 'arcana-cantrips',
            spellAbility: 'wisdom',
            options: { from: 'spells', lists: ['wizard'], maxLevel: 0 },
          },
        ],
      },
    ],
    6: [
      {
        id: 'arcana.dispelling-recovery',
        name: 'Рассеивающее восстановление',
        description: 'Сразу после того, как вы сотворили заклинание, восстанавливающее хиты или снимающее состояние, вы можете тем же действием, бонусным действием или реакцией сотворить «Рассеивание магии» без ячейки. Раз в короткий или продолжительный отдых; использование можно вернуть, потратив Проведение божественности (без действия).',
        action: 'passive',
        resource: { id: 'arcana.dispelling-recovery', name: 'Рассеивающее восстановление', max: 1, recharge: 'shortOrLong', iconName: 'prism' },
        iconName: 'prism',
      },
    ],
    17: [
      {
        id: 'arcana.arcane-mastery',
        name: 'Магическая искусность',
        description: 'Вы узнаёте по одному заклинанию волшебника 6, 7, 8 и 9-го кругов; они всегда подготовлены. Повышая уровень жреца, одно из них можно заменить другим заклинанием волшебника того же круга (замену отметьте на листе).',
        iconName: 'book-aura',
        choices: [6, 7, 8, 9].map((circle) => ({
          id: `spell-${circle}`,
          label: `Заклинание волшебника ${circle}-го круга`,
          count: 1,
          spellAbility: 'wisdom' as const,
          options: { from: 'spells' as const, lists: ['wizard' as const], minLevel: circle, maxLevel: circle },
        })),
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// The class
// ------------------------------------------------------------------------------------------------

const divineOrder: FeatureDef = {
  id: 'cleric.divine-order',
  name: 'Божественный орден',
  description: 'Вы посвящаете себя одной из священных ролей: Защитник или Чудотворец.',
  iconName: 'prayer',
  choices: [
    {
      id: 'order',
      label: 'Божественный орден',
      count: 1,
      options: {
        from: 'options',
        options: [
          {
            id: 'protector',
            name: 'Защитник',
            description: 'Владение воинским оружием и тренированность с тяжёлыми доспехами.',
            effects: [
              { type: 'proficiency', category: 'armor', value: 'Тяжёлые доспехи' },
              { type: 'proficiency', category: 'weapon', value: 'Воинское оружие' },
            ],
          },
          {
            id: 'thaumaturge',
            name: 'Чудотворец',
            description: 'Ещё один заговор жреца и бонус модификатора Мудрости к проверкам Тайной магии и Религии.',
            features: [
              {
                id: 'cleric.thaumaturge',
                name: 'Чудотворец',
                description: 'Вы знаете один дополнительный заговор жреца. К проверкам Интеллекта (Тайная магия и Религия) вы прибавляете модификатор Мудрости (минимум +1).',
                iconName: 'sparkles',
                effects: [{ type: 'skillBonus', skills: ['arcana', 'religion'], amount: modifierOf('wisdom') }],
                choices: [
                  {
                    id: 'cantrip',
                    label: 'Заговор жреца (1)',
                    count: 1,
                    pool: 'known-cantrips',
                    spellAbility: 'wisdom',
                    options: { from: 'spells', lists: ['cleric'], maxLevel: 0 },
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
};

/** Blessed Strikes of level 7, with what Improved Blessed Strikes adds on level 14. */
const blessedStrikes: FeatureDef = {
  id: 'cleric.blessed-strikes',
  name: 'Благословлённые удары',
  description: 'Божественная сила наполняет вас в бою: вы выбираете Божественный удар или Могущественные заклинания. С 14-го уровня выбранный вариант усиливается.',
  iconName: 'sword-clash',
  choices: [
    {
      id: 'strikes',
      label: 'Благословлённые удары',
      count: 1,
      options: {
        from: 'options',
        options: [
          {
            id: 'divine-strike',
            name: 'Божественный удар',
            description: 'Раз в ход при попадании оружием — дополнительно 1к8 некротического урона или урона излучением (2к8 с 14-го уровня).',
            features: [
              {
                id: 'cleric.divine-strike',
                name: 'Божественный удар',
                description: 'Раз в свой ход, попав броском атаки оружием, вы можете нанести цели дополнительно 1к8 некротического урона или урона излучением (на выбор). С 14-го уровня — 2к8.',
                action: 'passive',
                damage: (ctx) => (ctx.classLevel >= 14 ? '2d8' : '1d8'),
                damageType: 'Лучистый',
                iconName: 'sun-spear',
                color: '#f2d16b',
              },
              {
                id: 'cleric.improved-divine-strike',
                name: 'Улучшенные благословлённые удары',
                description: 'Дополнительный урон Божественного удара возрастает до 2к8.',
                minLevel: 14,
                iconName: 'sun-spear',
              },
            ],
          },
          {
            id: 'potent-spellcasting',
            name: 'Могущественные заклинания',
            description: 'К урону заговоров жреца прибавляется модификатор Мудрости; с 14-го уровня такой урон ещё и даёт временные хиты.',
            features: [
              {
                id: 'cleric.potent-spellcasting',
                name: 'Могущественные заклинания',
                description: 'Нанося урон заговором жреца, вы прибавляете к нему модификатор Мудрости.',
                action: 'passive',
                effects: [{ type: 'spellDamage', list: 'cleric', cantrips: true, amount: (ctx) => ctx.modifier('wisdom') }],
                iconName: 'bolt-spell-cast',
              },
              {
                id: 'cleric.improved-potent-spellcasting',
                name: 'Улучшенные благословлённые удары',
                description: 'Когда вы наносите урон существу заговором жреца, вы можете дать себе или другому существу в пределах 60 футов временные хиты, равные удвоенному модификатору Мудрости.',
                action: 'passive',
                minLevel: 14,
                iconName: 'healing-shield',
              },
            ],
          },
        ],
      },
    },
  ],
};

export const CLERIC: ClassDef = {
  id: 'cleric',
  name: 'Жрец',
  description: 'Проводник божественной силы Внешних планов. Лечит, защищает и карает молитвой, а Проведение божественности даёт чудеса его домена.',
  hitDie: 8,
  primary: ['wisdom'],
  saves: ['wisdom', 'charisma'],
  skillChoices: { count: 2, list: ['history', 'insight', 'medicine', 'persuasion', 'religion'] },
  proficiencies: [
    { type: 'proficiency', category: 'armor', value: 'Лёгкие доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Средние доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Щиты' },
    { type: 'proficiency', category: 'weapon', value: 'Простое оружие' },
  ],
  multiclass: {
    requires: [['wisdom']],
    proficiencies: multiclassProficiencies('lightArmor', 'mediumArmor', 'shields'),
  },
  subclassLevel: 3,
  subclasses: [life, light, trickery, war, knowledge, grave, arcana],
  startingEquipment: CLERIC_KITS,
  replaceable: [{ pool: 'arcana-cantrips', label: 'Замена заговора волшебника' }],
  spellcasting: {
    ability: 'wisdom',
    list: 'cleric',
    progression: 'full',
    mode: 'prepared',
    prepared: byTable([4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22]),
    cantrips: byClassLevel({ 1: 3, 4: 4, 10: 5 }),
  },
  levels: {
    1: [
      {
        id: 'cleric.spellcasting',
        name: 'Сотворение заклинаний',
        description:
          'Вы творите заклинания жреца Мудростью (СЛ = 8 + бонус мастерства + модификатор Мудрости; бонус атаки = бонус мастерства + модификатор Мудрости), фокусировка — священный символ. Заговоры: 3, с 4-го уровня 4, с 10-го 5; на каждом уровне один можно заменить. После продолжительного отдыха вы меняете список подготовленных заклинаний; их число растёт с уровнем.',
        action: 'passive',
        iconName: 'spell-book',
      },
      divineOrder,
    ],
    2: [
      {
        id: 'cleric.channel-divinity',
        name: 'Проведение божественности',
        description:
          'Вы направляете божественную энергию в магические эффекты: Божественную искру, Изгнание нежити и эффекты домена. Использований 2 (3 с 6-го уровня, 4 с 18-го); короткий отдых возвращает одно, продолжительный — все. СЛ спасбросков = СЛ ваших заклинаний жреца.',
        action: 'passive',
        resource: {
          id: CHANNEL_DIVINITY,
          name: 'Проведение божественности',
          max: byClassLevel({ 2: 2, 6: 3, 18: 4 }),
          recharge: 'long',
          shortRestRegain: 1,
          iconName: 'sunbeams',
        },
        iconName: 'sunbeams',
      },
      channelOption(
        'cleric.divine-spark',
        'Божественная искра',
        'Действием «Магия» вы направляете священный символ на видимое существо в пределах 30 футов и бросаете 1к8 + модификатор Мудрости (2к8 с 7-го уровня, 3к8 с 13-го, 4к8 с 18-го). Либо существо восстанавливает столько хитов, либо совершает спасбросок Телосложения: при провале получает столько некротического урона или урона излучением (на выбор), при успехе — половину.',
        {
          damage: (ctx) => `${ctx.classLevel >= 18 ? 4 : ctx.classLevel >= 13 ? 3 : ctx.classLevel >= 7 ? 2 : 1}d8${plus(ctx.modifier('wisdom'))}`,
          damageType: 'Лучистый',
          saveAttribute: 'constitution',
          saveDC: spellDC,
          iconName: 'sparkling-sabre',
          color: '#f2d16b',
        },
      ),
      channelOption(
        'cleric.turn-undead',
        'Изгнание нежити',
        'Действием «Магия» вы показываете священный символ: выбранная нежить в пределах 30 футов совершает спасбросок Мудрости. При провале она Испугана и Недееспособна на 1 минуту и старается уйти от вас как можно дальше; эффект кончается, если она получает урон или если вы Недееспособны или умираете.',
        { saveAttribute: 'wisdom', saveDC: spellDC, iconName: 'death-skull' },
      ),
    ],
    3: [subclassHeading('cleric', 'Подкласс жреца', 'Вы выбираете божественный домен, который даёт умения на 3, 6 и 17-м уровнях.')],
    4: [abilityScoreImprovement('cleric', 4)],
    5: [
      {
        id: 'cleric.sear-undead',
        name: 'Испепеление нежити',
        description: 'Используя Изгнание нежити, вы можете бросить к8 в количестве, равном модификатору Мудрости (минимум 1к8): каждая нежить, провалившая спасбросок, получает столько урона излучением. Эффект изгнания при этом не кончается.',
        action: 'passive',
        damage: (ctx) => `${Math.max(1, ctx.modifier('wisdom'))}d8`,
        damageType: 'Лучистый',
        iconName: 'sun-radiations',
        color: '#f2d16b',
      },
    ],
    7: [blessedStrikes],
    8: [abilityScoreImprovement('cleric', 8)],
    10: [
      {
        id: 'cleric.divine-intervention',
        name: 'Божественное вмешательство',
        description:
          'Действием «Магия» вы взываете к божеству: выберите любое заклинание жреца 5-го круга или ниже, которое не творится реакцией, и сотворите его частью того же действия без ячейки и без материальных компонентов. Раз в продолжительный отдых.',
        action: 'action',
        resource: { id: 'cleric.divine-intervention', name: 'Божественное вмешательство', max: 1, recharge: 'long' },
        iconName: 'angel-wings',
        color: '#f2d16b',
      },
    ],
    12: [abilityScoreImprovement('cleric', 12)],
    16: [abilityScoreImprovement('cleric', 16)],
    19: [epicBoon('cleric')],
    20: [
      {
        id: 'cleric.greater-divine-intervention',
        name: 'Великое божественное вмешательство',
        description: 'Используя Божественное вмешательство, вы можете выбрать заклинание «Желание». После этого Божественное вмешательство недоступно, пока вы не закончите 2к4 продолжительных отдыха.',
        iconName: 'crowned-heart',
      },
    ],
  },
};

/** Pictures of the class and its subclasses on the creation screen. */
export const CLERIC_ICONS = {
  class: 'sun-priest',
  subclasses: {
    'life-domain': 'heart-plus',
    'light-domain': 'sun',
    'trickery-domain': 'mirror-mirror',
    'war-domain': 'spartan-helmet',
    'knowledge-domain': 'gift-of-knowledge',
    'grave-domain': 'grim-reaper',
    'arcana-domain': 'magic-swirl',
  } as Record<string, string>,
};
