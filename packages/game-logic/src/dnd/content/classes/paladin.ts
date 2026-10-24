import { byClassLevel, modifierOf } from '../../helpers';
import type { ClassDef, FeatureDef, SubclassDef } from '../../types';
import { PALADIN_KITS } from '../equipment';
import { HALF_CASTER_SLOTS, abilityScoreImprovement, epicBoon, weaponMasteryChoice } from './shared';

/** Paladin of the 2024 Player's Handbook (Паладин). Descriptions are our own summaries of the rules. */

const CHANNEL_DIVINITY = 'paladin.channel-divinity';

/** A capstone transformation: once per long rest, or again by spending a 5th-level slot. */
const capstone = (id: string, name: string, description: string): FeatureDef => ({
  id,
  name,
  description: `${description}\n\nРаз в продолжительный отдых; повторно — потратив ячейку 5-го круга.`,
  action: 'bonus',
  resource: { id, name, max: 1, recharge: 'long' },
  iconName: 'sun-radiations',
});

const channelOption = (id: string, name: string, description: string, action: FeatureDef['action'] = 'action'): FeatureDef => ({
  id,
  name,
  description,
  action,
  usesResource: { id: CHANNEL_DIVINITY },
  iconName: 'sunbeams',
});

// ------------------------------------------------------------------------------------------------
// Oaths
// ------------------------------------------------------------------------------------------------

const devotion: SubclassDef = {
  id: 'oath-of-devotion',
  name: 'Клятва преданности',
  description: 'Идеал рыцаря-защитника: честность, отвага и милосердие. Свет клинка и аура, которую не сломить чарами.',
  alwaysPrepared: {
    3: ['protection-from-evil-and-good', 'shield-of-faith'],
    5: ['aid', 'zone-of-truth'],
    9: ['beacon-of-hope', 'dispel-magic'],
    13: ['freedom-of-movement', 'guardian-of-faith'],
    17: ['commune', 'flame-strike'],
  },
  levels: {
    3: [
      channelOption(
        'devotion.sacred-weapon',
        'Священное оружие',
        'Совершая действие «Атака», вы тратите Проведение божественности и наполняете оружие в руке светом на 10 минут: к броскам атаки им прибавляется модификатор Харизмы (минимум +1), урон может быть лучистым, оружие излучает яркий свет на 20 футов.',
        'passive',
      ),
    ],
    7: [
      {
        id: 'devotion.aura-of-devotion',
        name: 'Аура преданности',
        description: 'Вы и союзники в вашей Ауре защиты не можете быть очарованы. Если очарованное существо входит в ауру, состояние на нём не действует, пока оно там.',
        action: 'passive',
      },
    ],
    15: [
      {
        id: 'devotion.smite-of-protection',
        name: 'Защищающая кара',
        description: 'Когда вы творите «Божественную кару», вы и союзники в вашей Ауре защиты получаете укрытие на половину до начала вашего следующего хода.',
        action: 'passive',
      },
    ],
    20: [
      capstone(
        'devotion.holy-nimbus',
        'Святой нимб',
        'Бонусным действием вы на 10 минут излучаете солнечный свет: враг, начинающий ход в вашей Ауре защиты, получает лучистый урон, равный модификатору Харизмы + бонус мастерства; вы совершаете с преимуществом спасброски от заклинаний исчадий и нежити.',
      ),
    ],
  },
};

const glory: SubclassDef = {
  id: 'oath-of-glory',
  name: 'Клятва славы',
  description: 'Путь героя легенд: атлет и вдохновитель, чьи подвиги поднимают союзников в бой.',
  alwaysPrepared: {
    3: ['guiding-bolt', 'heroism'],
    5: ['enhance-ability', 'magic-weapon'],
    9: ['haste', 'protection-from-energy'],
    13: ['compulsion', 'freedom-of-movement'],
    17: ['legend-lore', 'yolandes-regal-presence'],
  },
  levels: {
    3: [
      channelOption(
        'glory.inspiring-smite',
        'Вдохновляющая кара',
        'Сразу после сотворения «Божественной кары» вы можете потратить Проведение божественности и распределить временные хиты 2к8 + уровень паладина между существами в пределах 30 футов (включая себя).',
        'passive',
      ),
      channelOption(
        'glory.peerless-athlete',
        'Непревзойдённый атлет',
        'Бонусным действием вы тратите Проведение божественности: на 1 час проверки Силы (Атлетика) и Ловкости (Акробатика) совершаются с преимуществом, а прыжки дальше на 10 футов.',
        'bonus',
      ),
    ],
    7: [
      {
        id: 'glory.aura-of-alacrity',
        name: 'Аура стремительности',
        description: 'Ваша скорость увеличивается на 10 футов. Союзник, начинающий ход в вашей Ауре защиты или входящий в неё, получает +10 футов скорости до конца хода.',
        action: 'passive',
        effects: [{ type: 'speed', amount: 10 }],
      },
    ],
    15: [
      {
        id: 'glory.glorious-defense',
        name: 'Славная защита',
        description:
          'Реакцией, когда по вам или существу в пределах 10 футов попадает атака, вы прибавляете модификатор Харизмы к КД цели против неё. Если атака промахивается, можете атаковать атакующего оружием, если он в досягаемости. Использований — модификатор Харизмы (минимум 1) за продолжительный отдых.',
        action: 'reaction',
        resource: { id: 'glory.glorious-defense', name: 'Славная защита', max: modifierOf('charisma'), recharge: 'long' },
        iconName: 'checked-shield',
      },
    ],
    20: [
      capstone(
        'glory.living-legend',
        'Живая легенда',
        'Бонусным действием вы на 10 минут становитесь легендой: проверки Харизмы с преимуществом; раз в ход промах оружием можно превратить в попадание; проваленный спасбросок можно перебросить реакцией.',
      ),
    ],
  },
};

const ancients: SubclassDef = {
  id: 'oath-of-the-ancients',
  name: 'Клятва древних',
  description: 'Защитник света, жизни и красоты мира, чья сила растёт из самой природы.',
  alwaysPrepared: {
    3: ['ensnaring-strike', 'speak-with-animals'],
    5: ['misty-step', 'moonbeam'],
    9: ['plant-growth', 'protection-from-energy'],
    13: ['ice-storm', 'stoneskin'],
    17: ['commune-with-nature', 'tree-stride'],
  },
  levels: {
    3: [
      channelOption(
        'ancients.natures-wrath',
        'Гнев природы',
        'Действием «Магия» вы тратите Проведение божественности: призрачные лозы оплетают выбранных существ в пределах 15 футов. Каждое совершает спасбросок Силы или становится опутанным на 1 минуту, повторяя спасбросок в конце каждого своего хода.',
      ),
    ],
    7: [
      {
        id: 'ancients.aura-of-warding',
        name: 'Аура опеки',
        description: 'Вы и союзники в вашей Ауре защиты получаете сопротивление урону некротической энергией, психической энергией и излучением.',
        action: 'passive',
        effects: [
          { type: 'resistance', damageType: 'Некротический' },
          { type: 'resistance', damageType: 'Психический' },
          { type: 'resistance', damageType: 'Лучистый' },
        ],
      },
    ],
    15: [
      {
        id: 'ancients.undying-sentinel',
        name: 'Бессмертный страж',
        description:
          'Когда ваши хиты опускаются до 0, но вы не убиты сразу, они становятся равны 1, и вы восстанавливаете хиты, равные утроенному уровню паладина. Раз в продолжительный отдых. Вы не страдаете от старения.',
        action: 'passive',
        resource: { id: 'ancients.undying-sentinel', name: 'Бессмертный страж', max: 1, recharge: 'long' },
      },
    ],
    20: [
      capstone(
        'ancients.elder-champion',
        'Древний защитник',
        'Бонусным действием вы на 1 минуту принимаете облик силы природы: в начале хода восстанавливаете 10 хитов; заклинания паладина со временем «действие» творите бонусным действием; враги в пределах 10 футов совершают с помехой спасброски от ваших заклинаний и Проведения божественности.',
      ),
    ],
  },
};

const vengeance: SubclassDef = {
  id: 'oath-of-vengeance',
  name: 'Клятва мести',
  description: 'Карающий меч против великого зла: неотступный охотник, который не отпускает добычу.',
  alwaysPrepared: {
    3: ['bane', 'hunters-mark'],
    5: ['hold-person', 'misty-step'],
    9: ['haste', 'protection-from-energy'],
    13: ['banishment', 'dimension-door'],
    17: ['hold-monster', 'scrying'],
  },
  levels: {
    3: [
      channelOption(
        'vengeance.vow-of-enmity',
        'Клятва вражды',
        'Совершая действие «Атака», вы тратите Проведение божественности и на 1 минуту получаете преимущество на броски атаки по существу в пределах 30 футов. Если его хиты опускаются до 0, клятву можно перенести на другое существо в пределах 30 футов.',
        'passive',
      ),
    ],
    7: [
      {
        id: 'vengeance.relentless-avenger',
        name: 'Неустанный мститель',
        description: 'Попав атакой по возможности, вы уменьшаете скорость цели до 0 до конца текущего хода и можете частью той же реакции переместиться на половину скорости, не провоцируя атак.',
        action: 'passive',
      },
    ],
    15: [
      {
        id: 'vengeance.soul-of-vengeance',
        name: 'Душа мести',
        description: 'Когда существо под вашей Клятвой вражды совершает атаку, вы можете реакцией атаковать его в ближнем бою, если оно в досягаемости.',
        action: 'reaction',
      },
    ],
    20: [
      capstone(
        'vengeance.avenging-angel',
        'Ангел мести',
        'Бонусным действием вы на 10 минут обретаете крылья (скорость полёта 60 футов, можно парить) и ауру угрозы 30 футов: враг, впервые за ход входящий в неё или начинающий там ход, совершает спасбросок Мудрости или пугается на 1 минуту; атаки по испуганному совершаются с преимуществом.',
      ),
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// The class
// ------------------------------------------------------------------------------------------------

/** The paladin's level-2 Fighting Style: a Fighting Style feat or Blessed Warrior (two cleric cantrips). */
const fightingStyle: FeatureDef = {
  id: 'paladin.fighting-style',
  name: 'Боевой стиль',
  description: 'Вы получаете черту боевого стиля на свой выбор или становитесь Благословлённым воином: изучаете два заговора жреца, которые творите Харизмой.',
  choices: [
    {
      id: 'style',
      label: 'Боевой стиль',
      count: 1,
      options: {
        from: 'options',
        options: [
          {
            id: 'feat',
            name: 'Черта боевого стиля',
            description: 'Черта из категории «Боевой стиль».',
            features: [
              {
                id: 'paladin.fighting-style-feat',
                name: 'Черта боевого стиля',
                description: '',
                hidden: true,
                choices: [{ id: 'feat', label: 'Черта боевого стиля', count: 1, options: { from: 'feats', categories: ['fightingStyle'] } }],
              },
            ],
          },
          {
            id: 'blessed-warrior',
            name: 'Благословлённый воин',
            description: 'Два заговора из списка жреца; заклинательная характеристика — Харизма.',
            features: [
              {
                id: 'paladin.blessed-warrior',
                name: 'Благословлённый воин',
                description: 'Вы знаете два заговора жреца и творите их Харизмой. Повышая уровень паладина, можно заменить один из них.',
                choices: [
                  { id: 'cantrips', label: 'Заговоры жреца (2)', count: 2, spellAbility: 'charisma', options: { from: 'spells', lists: ['cleric'], maxLevel: 0 } },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
};

export const PALADIN: ClassDef = {
  id: 'paladin',
  name: 'Паладин',
  description: 'Воин, связанный священной клятвой. Божественная сила лечит касанием, карает ударом и защищает союзников аурой.',
  hitDie: 10,
  primary: ['strength', 'charisma'],
  saves: ['wisdom', 'charisma'],
  skillChoices: { count: 2, list: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'] },
  proficiencies: [
    { type: 'proficiency', category: 'armor', value: 'Лёгкие доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Средние доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Тяжёлые доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Щиты' },
    { type: 'proficiency', category: 'weapon', value: 'Простое оружие' },
    { type: 'proficiency', category: 'weapon', value: 'Воинское оружие' },
  ],
  mentalStrength: 65,
  subclassLevel: 3,
  subclasses: [devotion, glory, ancients, vengeance],
  startingEquipment: PALADIN_KITS,
  spellcasting: {
    ability: 'charisma',
    list: 'paladin',
    slots: HALF_CASTER_SLOTS,
    mode: 'prepared',
    prepared: byClassLevel({ 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 7: 7, 9: 9, 11: 10, 13: 11, 15: 12, 17: 14, 19: 15 }),
  },
  levels: {
    1: [
      {
        id: 'paladin.lay-on-hands',
        name: 'Наложение рук',
        description:
          'У вас есть запас целительной силы: 5 × уровень паладина хитов, восполняется после продолжительного отдыха. Бонусным действием, касаясь существа, вы восстанавливаете ему хиты из запаса или тратите 5 единиц, чтобы снять состояние «Отравлен».',
        action: 'bonus',
        resource: { id: 'paladin.lay-on-hands', name: 'Наложение рук', max: (ctx) => 5 * ctx.classLevel, recharge: 'long', iconName: 'healing' },
        iconName: 'healing',
        color: '#d4a94e',
      },
      {
        id: 'paladin.spellcasting',
        name: 'Использование заклинаний',
        description:
          'Вы творите заклинания паладина Харизмой (СЛ = 8 + бонус мастерства + модификатор Харизмы; бонус атаки = бонус мастерства + модификатор Харизмы). После продолжительного отдыха вы меняете список подготовленных заклинаний; их число растёт с уровнем.',
        action: 'passive',
        iconName: 'spell-book',
      },
      {
        id: 'paladin.weapon-mastery',
        name: 'Оружейное мастерство',
        description: 'Вы используете свойства мастерства двух видов оружия. После продолжительного отдыха один вид можно заменить.',
        choices: [weaponMasteryChoice(2, 'Оружейное мастерство (2)')],
      },
    ],
    2: [
      fightingStyle,
      {
        id: 'paladin.smite',
        name: 'Кара паладина',
        description: 'Заклинание «Божественная кара» у вас всегда подготовлено. Раз в продолжительный отдых вы можете сотворить его без траты ячейки.',
        action: 'passive',
        resource: { id: 'paladin.free-smite', name: 'Кара без ячейки', max: 1, recharge: 'long', iconName: 'sunbeams' },
        effects: [{ type: 'spell', spell: 'divine-smite', alwaysPrepared: true }],
        iconName: 'sunbeams',
      },
    ],
    3: [
      {
        id: 'paladin.channel-divinity',
        name: 'Проведение божественности',
        description:
          'Вы направляете божественную силу в эффекты своей клятвы и в «Божественное чувство». Использований 2 (3 с 11-го уровня); короткий отдых возвращает одно, продолжительный — все. СЛ = СЛ ваших заклинаний паладина.',
        action: 'passive',
        resource: { id: CHANNEL_DIVINITY, name: 'Проведение божественности', max: byClassLevel({ 3: 2, 11: 3 }), recharge: 'long', iconName: 'sunbeams' },
        iconName: 'sunbeams',
      },
      channelOption(
        'paladin.divine-sense',
        'Божественное чувство',
        'Бонусным действием на 10 минут вы чувствуете в пределах 60 футов исчадий, небожителей и нежить (их вид, но не личность), а также освящённые и осквернённые места и предметы.',
        'bonus',
      ),
      { id: 'paladin.subclass', name: 'Священная клятва', description: 'Вы приносите клятву, определяющую ваш путь.', hidden: true },
    ],
    4: [abilityScoreImprovement('paladin', 4)],
    5: [
      {
        id: 'paladin.extra-attack',
        name: 'Дополнительная атака',
        description: 'Совершая действие «Атака» в свой ход, вы атакуете дважды вместо одного раза.',
        action: 'passive',
        iconName: 'crossed-swords',
      },
      {
        id: 'paladin.faithful-steed',
        name: 'Верный скакун',
        description: 'Заклинание «Поиск скакуна» у вас всегда подготовлено. Раз в продолжительный отдых вы можете сотворить его без ячейки.',
        action: 'passive',
        resource: { id: 'paladin.faithful-steed', name: 'Скакун без ячейки', max: 1, recharge: 'long' },
        effects: [{ type: 'spell', spell: 'find-steed', alwaysPrepared: true }],
      },
    ],
    6: [
      {
        id: 'paladin.aura-of-protection',
        name: 'Аура защиты',
        description:
          'Вы излучаете ауру радиусом 10 футов (30 футов с 18-го уровня). Пока вы дееспособны, вы и союзники в ауре добавляете к спасброскам ваш модификатор Харизмы (минимум +1).',
        action: 'passive',
        iconName: 'magic-shield',
      },
    ],
    8: [abilityScoreImprovement('paladin', 8)],
    9: [
      channelOption(
        'paladin.abjure-foes',
        'Отвержение врагов',
        'Действием «Магия» вы тратите Проведение божественности: до (модификатор Харизмы, минимум 1) существ в пределах 60 футов совершают спасбросок Мудрости или пугаются на 1 минуту (до получения урона). Испуганное так существо в свой ход может либо перемещаться, либо совершить действие или бонусное действие.',
      ),
    ],
    10: [
      {
        id: 'paladin.aura-of-courage',
        name: 'Аура отваги',
        description: 'Вы и союзники в вашей Ауре защиты не можете быть испуганы. Если испуганное существо входит в ауру, состояние на нём не действует, пока оно там.',
        action: 'passive',
      },
    ],
    11: [
      {
        id: 'paladin.radiant-strikes',
        name: 'Сияющие удары',
        description: 'Ваши попадания рукопашным оружием или безоружным ударом наносят дополнительно 1к8 урона излучением.',
        action: 'passive',
        damage: '1d8',
        damageType: 'Лучистый',
        iconName: 'sunbeams',
      },
    ],
    12: [abilityScoreImprovement('paladin', 12)],
    14: [
      {
        id: 'paladin.restoring-touch',
        name: 'Восстанавливающее касание',
        description: 'Используя Наложение рук, вы также можете снять с цели состояния «Ослеплён», «Очарован», «Оглохший», «Испуган», «Парализован» или «Ошеломлён» — по 5 единиц запаса за каждое.',
        action: 'passive',
      },
    ],
    16: [abilityScoreImprovement('paladin', 16)],
    18: [
      {
        id: 'paladin.aura-expansion',
        name: 'Расширение ауры',
        description: 'Радиус вашей Ауры защиты увеличивается до 30 футов.',
        action: 'passive',
      },
    ],
    19: [epicBoon('paladin')],
  },
};

