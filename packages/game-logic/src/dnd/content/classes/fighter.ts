import { byClassLevel, modifierOf } from '../../helpers';
import type { BuildContext, ChoiceDef, ClassDef, FeatureDef, OptionDef, SubclassDef } from '../../types';
import { ARTISAN_TOOL_NAMES, FIGHTER_KITS } from '../equipment';
import {
  THIRD_CASTER_SLOTS,
  abilityScoreImprovement,
  epicBoon,
  weaponMasteryChoice,
} from './shared';

/** Fighter of the 2024 Player's Handbook (Воин). Descriptions are our own summaries of the rules. */

const SECOND_WIND = 'fighter.second-wind';
const SUPERIORITY_DICE = 'fighter.superiority-dice';
const PSIONIC_ENERGY = 'fighter.psionic-energy';


const extraAttack = (level: number, attacks: number, name: string): FeatureDef => ({
  id: `fighter.extra-attack-${level}`,
  name,
  description: `Совершая действие «Атака» в свой ход, вы атакуете ${attacks === 2 ? 'дважды' : attacks === 3 ? 'трижды' : 'четырежды'} вместо одного раза.`,
  action: 'passive',
  iconName: 'crossed-swords',
});

// ------------------------------------------------------------------------------------------------
// Subclasses
// ------------------------------------------------------------------------------------------------

const battleMaster: SubclassDef = {
  id: 'battle-master',
  name: 'Мастер боя',
  description: 'Тактик, превращающий бой в науку: кости превосходства питают приёмы, которые сбивают, обезоруживают и направляют союзников.',
  levels: {
    3: [
      {
        id: 'battle-master.combat-superiority',
        name: 'Превосходство в бою',
        description:
          'Вы владеете приёмами, которые питаются костями превосходства (к8; к10 с 10-го уровня, к12 с 18-го). Костей 4, с 7-го уровня 5, с 15-го 6; потраченная кость возвращается после короткого или продолжительного отдыха. За раз — один приём на атаку. СЛ спасбросков от приёмов = 8 + бонус мастерства + модификатор Силы или Ловкости (на ваш выбор).',
        action: 'passive',
        resource: {
          id: SUPERIORITY_DICE,
          name: 'Кости превосходства',
          max: byClassLevel({ 3: 4, 7: 5, 15: 6 }),
          recharge: 'shortOrLong',
          description: 'Кость превосходства: к8, с 10-го уровня к10, с 18-го к12.',
          iconName: 'rolling-dices',
        },
        choices: [{ id: 'maneuvers', label: 'Приёмы (3)', count: 3, pool: 'maneuvers', options: { from: 'maneuvers' } }],
        iconName: 'rolling-dices',
      },
      {
        id: 'battle-master.student-of-war',
        name: 'Ученик войны',
        description: 'Вы получаете владение одним видом инструментов ремесленника и одним навыком из списка навыков воина.',
        choices: [
          {
            id: 'skill',
            label: 'Навык',
            count: 1,
            options: { from: 'skills', list: ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'persuasion', 'perception', 'survival'] },
          },
          { id: 'tool', label: 'Инструменты ремесленника', count: 1, options: { from: 'tools', list: ARTISAN_TOOL_NAMES } },
        ],
      },
    ],
    7: [
      {
        id: 'battle-master.know-your-enemy',
        name: 'Познай врага',
        description:
          'Бонусным действием вы узнаёте об одном существе в пределах 30 футов, которое видите, его иммунитеты, сопротивления и уязвимости. Раз в продолжительный отдых бесплатно, далее — за кость превосходства.',
        action: 'bonus',
        resource: { id: 'battle-master.know-your-enemy', name: 'Познай врага', max: 1, recharge: 'long' },
        iconName: 'all-seeing-eye',
      },
      {
        id: 'battle-master.maneuvers-7',
        name: 'Новые приёмы',
        description: 'Вы изучаете ещё два приёма и получаете ещё одну кость превосходства.',
        hidden: true,
        choices: [{ id: 'maneuvers', label: 'Приёмы (2)', count: 2, pool: 'maneuvers', options: { from: 'maneuvers' } }],
      },
    ],
    10: [
      {
        id: 'battle-master.improved-superiority',
        name: 'Улучшенное превосходство в бою',
        description: 'Ваши кости превосходства становятся к10. Вы изучаете ещё два приёма.',
        hidden: true,
        choices: [{ id: 'maneuvers', label: 'Приёмы (2)', count: 2, pool: 'maneuvers', options: { from: 'maneuvers' } }],
      },
    ],
    15: [
      {
        id: 'battle-master.relentless',
        name: 'Неутомимый',
        description:
          'Раз в ход, используя приём, вы можете бросить к8 вместо траты кости превосходства. Вы получаете ещё одну кость превосходства и изучаете ещё два приёма.',
        action: 'passive',
        choices: [{ id: 'maneuvers', label: 'Приёмы (2)', count: 2, pool: 'maneuvers', options: { from: 'maneuvers' } }],
      },
    ],
    18: [
      {
        id: 'battle-master.ultimate-superiority',
        name: 'Абсолютное превосходство в бою',
        description: 'Ваши кости превосходства становятся к12.',
        hidden: true,
      },
    ],
  },
};

const champion: SubclassDef = {
  id: 'champion',
  name: 'Чемпион',
  description: 'Воплощение чистой физической мощи: чаще наносит критические удары и выстаивает там, где другие падают.',
  levels: {
    3: [
      {
        id: 'champion.improved-critical',
        name: 'Улучшенный критический удар',
        description: 'Ваши атаки оружием и безоружные удары совершают критическое попадание при результате 19–20 на к20.',
        action: 'passive',
        iconName: 'crossed-swords',
      },
      {
        id: 'champion.remarkable-athlete',
        name: 'Выдающийся атлет',
        description:
          'Вы совершаете с преимуществом броски инициативы и проверки Силы (Атлетика). Сразу после критического попадания вы можете переместиться на половину скорости, не провоцируя атак.',
        action: 'passive',
      },
    ],
    7: [
      {
        id: 'champion.additional-fighting-style',
        name: 'Дополнительный боевой стиль',
        description: 'Вы получаете ещё одну черту боевого стиля.',
        choices: [{ id: 'style', label: 'Боевой стиль', count: 1, options: { from: 'feats', categories: ['fightingStyle'] } }],
      },
    ],
    10: [
      {
        id: 'champion.heroic-warrior',
        name: 'Героический воин',
        description: 'В бою, если в начале вашего хода у вас нет Героического вдохновения, вы его получаете.',
        action: 'passive',
      },
    ],
    15: [
      {
        id: 'champion.superior-critical',
        name: 'Превосходный критический удар',
        description: 'Критическое попадание происходит при результате 18–20 на к20.',
        action: 'passive',
      },
    ],
    18: [
      {
        id: 'champion.survivor',
        name: 'Уцелевший',
        description:
          '**Отказ смерти.** Спасброски от смерти вы совершаете с преимуществом, а результат 18–20 считается выпавшей «20».\n\n**Героическое сплочение.** В начале своего хода, если у вас осталось не больше половины хитов (но больше 0), вы восстанавливаете 5 + модификатор Телосложения хитов.',
        action: 'passive',
      },
    ],
  },
};

const eldritchKnight: SubclassDef = {
  id: 'eldritch-knight',
  name: 'Мистический рыцарь',
  description: 'Воин, изучивший магию волшебников: ограждение и воплощение в одной руке, клинок в другой.',
  spellcasting: {
    ability: 'intelligence',
    list: 'wizard',
    slots: THIRD_CASTER_SLOTS,
    mode: 'known',
    prepared: byClassLevel({ 3: 3, 4: 4, 7: 5, 8: 6, 10: 7, 11: 8, 13: 9, 14: 10, 16: 11, 19: 12, 20: 13 }),
    cantrips: byClassLevel({ 3: 2, 10: 3 }),
  },
  levels: {
    3: [
      {
        id: 'eldritch-knight.spellcasting',
        name: 'Использование заклинаний',
        description:
          'Вы колдуете заклинания волшебника, используя Интеллект (СЛ = 8 + бонус мастерства + модификатор Интеллекта). Вы знаете 2 заговора (3 с 10-го уровня) и готовите заклинания из списка волшебника; при повышении уровня можно заменить одно из них.',
        action: 'passive',
        iconName: 'spell-book',
      },
      {
        id: 'eldritch-knight.war-bond',
        name: 'Боевая связь',
        description:
          'Ритуалом длиной в час вы связываете себя максимум с двумя видами оружия. Вас нельзя обезоружить связанным оружием, а бонусным действием вы призываете его в руку, если оно на том же плане.',
        action: 'bonus',
      },
    ],
    7: [
      {
        id: 'eldritch-knight.war-magic',
        name: 'Боевая магия',
        description: 'Совершая действие «Атака», вы можете заменить одну из атак сотворением заговора со временем накладывания «действие».',
        action: 'passive',
      },
    ],
    10: [
      {
        id: 'eldritch-knight.eldritch-strike',
        name: 'Мистический удар',
        description: 'Попав по существу атакой оружием, вы даёте ему помеху на следующий спасбросок от вашего заклинания до конца вашего следующего хода.',
        action: 'passive',
      },
    ],
    15: [
      {
        id: 'eldritch-knight.arcane-charge',
        name: 'Мистический рывок',
        description: 'Используя «Всплеск действий», вы можете телепортироваться на 30 футов в видимое свободное пространство.',
        action: 'passive',
      },
    ],
    18: [
      {
        id: 'eldritch-knight.improved-war-magic',
        name: 'Улучшенная боевая магия',
        description: 'Совершая действие «Атака», вы можете заменить две атаки сотворением заклинания 1-го или 2-го круга со временем накладывания «действие».',
        action: 'passive',
      },
    ],
  },
};

const psiWarrior: SubclassDef = {
  id: 'psi-warrior',
  name: 'Пси-воин',
  description: 'Боец, чей разум усиливает удары: псионическая энергия гасит урон, толкает врагов и поднимает в воздух.',
  levels: {
    3: [
      {
        id: 'psi-warrior.psionic-power',
        name: 'Псионическая сила',
        description:
          'У вас есть кости псионической энергии: к6 (к8 с 5-го уровня, к10 с 11-го, к12 с 17-го). Их 4 на 3-м уровне, 6 с 5-го, 8 с 9-го, 10 с 13-го, 12 с 17-го. Короткий отдых возвращает одну кость, продолжительный — все.',
        action: 'passive',
        resource: {
          id: PSIONIC_ENERGY,
          name: 'Псионическая энергия',
          max: byClassLevel({ 3: 4, 5: 6, 9: 8, 13: 10, 17: 12 }),
          recharge: 'long',
          shortRestRegain: 1,
          description: 'Кость псионической энергии: к6, с 5-го уровня к8, с 11-го к10, с 17-го к12. Короткий отдых возвращает одну кость.',
          iconName: 'psychic-waves',
        },
        iconName: 'psychic-waves',
      },
      {
        id: 'psi-warrior.protective-field',
        name: 'Защитное поле',
        description:
          'Реакцией, когда вы или видимое существо в пределах 30 футов получаете урон, вы тратите кость псионической энергии и уменьшаете урон на выпавшее значение + модификатор Интеллекта (минимум 1).',
        action: 'reaction',
        usesResource: { id: PSIONIC_ENERGY },
        iconName: 'magic-shield',
      },
      {
        id: 'psi-warrior.psionic-strike',
        name: 'Псионический удар',
        description:
          'Раз в ход, попав атакой оружием по существу в пределах 30 футов, вы можете потратить кость псионической энергии: цель получает дополнительный урон силовым полем, равный выпавшему значению + модификатор Интеллекта.',
        action: 'passive',
        usesResource: { id: PSIONIC_ENERGY },
        damage: (ctx) => `1d${byClassLevel({ 3: 6, 5: 8, 11: 10, 17: 12 })(ctx)}+${Math.max(1, ctx.modifier('intelligence'))}`,
        damageType: 'Силовой',
        iconName: 'psychic-waves',
      },
      {
        id: 'psi-warrior.telekinetic-movement',
        name: 'Телекинетическое перемещение',
        description:
          'Действием «Магия» вы перемещаете большой или меньший предмет либо согласное существо в пределах 30 футов на расстояние до 30 футов. Раз в короткий или продолжительный отдых бесплатно, далее — за кость псионической энергии.',
        action: 'action',
        resource: { id: 'psi-warrior.telekinetic-movement', name: 'Телекинетическое перемещение', max: 1, recharge: 'shortOrLong' },
      },
    ],
    7: [
      {
        id: 'psi-warrior.psi-powered-leap',
        name: 'Псионический прыжок',
        description:
          'Бонусным действием вы получаете скорость полёта, равную удвоенной скорости ходьбы, до конца хода. Раз в короткий или продолжительный отдых бесплатно, далее — за кость псионической энергии.',
        action: 'bonus',
        resource: { id: 'psi-warrior.psi-powered-leap', name: 'Псионический прыжок', max: 1, recharge: 'shortOrLong' },
      },
      {
        id: 'psi-warrior.telekinetic-thrust',
        name: 'Телекинетический толчок',
        description:
          'Нанося урон Псионическим ударом, вы можете заставить цель совершить спасбросок Силы (СЛ = 8 + бонус мастерства + модификатор Интеллекта). При провале она падает ничком или отталкивается на 10 футов.',
        action: 'passive',
      },
    ],
    10: [
      {
        id: 'psi-warrior.guarded-mind',
        name: 'Защищённый разум',
        description:
          'Вы получаете сопротивление урону психической энергией. Если в начале хода вы очарованы или испуганы, можете потратить кость псионической энергии, чтобы закончить все такие эффекты на себе.',
        action: 'passive',
        effects: [{ type: 'resistance', damageType: 'Психический' }],
      },
    ],
    15: [
      {
        id: 'psi-warrior.bulwark-of-force',
        name: 'Бастион силы',
        description:
          'Бонусным действием вы окружаете до (модификатор Интеллекта, минимум 1) существ в пределах 30 футов, включая себя, силовым полем: на 1 минуту они получают укрытие на половину. Раз в продолжительный отдых бесплатно, далее — за кость псионической энергии.',
        action: 'bonus',
        resource: { id: 'psi-warrior.bulwark-of-force', name: 'Бастион силы', max: 1, recharge: 'long' },
      },
    ],
    18: [
      {
        id: 'psi-warrior.telekinetic-master',
        name: 'Мастер телекинеза',
        description:
          'Вы всегда можете сотворить «Телекинез» без компонентов, используя Интеллект. Раз в продолжительный отдых бесплатно, далее — за кость псионической энергии. Пока вы концентрируетесь на нём, бонусным действием можете совершить одну атаку оружием.',
        action: 'action',
        resource: { id: 'psi-warrior.telekinetic-master', name: 'Мастер телекинеза', max: 1, recharge: 'long' },
        effects: [{ type: 'spell', spell: 'telekinesis', alwaysPrepared: true, ability: 'intelligence' }],
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// Supplement subclasses
// ------------------------------------------------------------------------------------------------

/** "Up to Charisma modifier allies (at least one) in a 30-foot Emanation (60 feet from level 18)". */
const BANNERET_ALLIES = 'до (модификатор Харизмы, минимум 1) союзников в эманации 30 футов (60 футов с 18-го уровня)';

const banneret: SubclassDef = {
  id: 'banneret',
  name: 'Баннерет',
  source: 'Forgotten Realms: Heroes of Faerûn',
  description: 'Рыцарь-предводитель: его Второе дыхание и Всплеск действий поднимают в бой и лечат весь отряд.',
  levels: {
    3: [
      {
        id: 'banneret.knightly-envoy',
        name: 'Посланник рыцарства',
        description:
          '**Понимание.** Вы можете сотворять «Понимание языков», но только как ритуал; заклинательная характеристика — Харизма.\n\n**Полиглот.** Вы изучаете один язык. После продолжительного отдыха его можно заменить другим, который вы слышали, читали или видели на языке жестов за последние 24 часа.\n\n**Поставленная речь.** Вы получаете владение одним навыком: Выступление, Запугивание, Проницательность или Убеждение.',
        effects: [{ type: 'spell', spell: 'comprehend-languages', alwaysPrepared: true, ability: 'charisma', note: 'Только как ритуал' }],
        choices: [
          { id: 'language', label: 'Язык', count: 1, options: { from: 'languages' } },
          { id: 'skill', label: 'Навык', count: 1, options: { from: 'skills', list: ['performance', 'intimidation', 'insight', 'persuasion'] } },
        ],
        iconName: 'scroll-quill',
      },
      {
        id: 'banneret.group-recovery',
        name: 'Групповое оздоровление',
        description: `Восстанавливая хиты Вторым дыханием, вы можете выбрать ${BANNERET_ALLIES}: каждый восстанавливает 1к4 + уровень воина хитов. Раз в короткий или продолжительный отдых.`,
        action: 'passive',
        damage: (ctx) => `1d4+${ctx.classLevel}`,
        damageType: 'Лечение',
        resource: { id: 'banneret.group-recovery', name: 'Групповое оздоровление', max: 1, recharge: 'shortOrLong', iconName: 'rally-the-troops' },
        iconName: 'rally-the-troops',
        color: '#7fb069',
      },
    ],
    7: [
      {
        id: 'banneret.team-tactics',
        name: 'Групповая тактика',
        description: 'Союзники, выбранные для Группового оздоровления, совершают с преимуществом все тесты к20 до начала вашего следующего хода.',
        action: 'passive',
        iconName: 'knight-banner',
      },
    ],
    10: [
      {
        id: 'banneret.rallying-surge',
        name: 'Воодушевляющий всплеск',
        description: `Используя Всплеск действий, вы можете выбрать ${BANNERET_ALLIES}. Каждый может сразу реакцией либо совершить одну атаку оружием или безоружный удар, либо переместиться на половину своей скорости, не провоцируя атак.`,
        action: 'passive',
        iconName: 'sword-brandish',
      },
    ],
    15: [
      {
        id: 'banneret.team-resilience',
        name: 'Устойчивость команды',
        description:
          'Когда союзник, которого вы видите в пределах 60 футов, проваливает спасбросок, вы можете реакцией потратить использование Неукротимого: союзник перебрасывает спасбросок с бонусом, равным вашему уровню воина, и обязан взять новый результат.',
        action: 'reaction',
        usesResource: { id: 'fighter.indomitable' },
        iconName: 'shield-reflect',
      },
    ],
    18: [
      {
        id: 'banneret.inspiring-commander',
        name: 'Вдохновляющий командир',
        description:
          '**Усиленное воодушевление.** Групповое оздоровление и Воодушевляющий всплеск действуют в эманации 60 футов.\n\n**Непоколебимая храбрость.** У вас иммунитет к состояниям «Испуганный» и «Очарованный».',
        action: 'passive',
        iconName: 'crowned-heart',
      },
    ],
  },
};

const ARCANE_SHOT = 'arcane-archer.arcane-shot';
const ARCANE_SHOTS_POOL = 'arcane-shots';
/** Arcane Shot die by fighter level: d6, d8 from 10, d10 from 15, d12 from 18. */
const arcaneDie = byClassLevel({ 3: 6, 10: 8, 15: 10, 18: 12 });
const arcaneDice = (n: number) => (ctx: BuildContext) => `${n}d${arcaneDie(ctx)}`;
const arcaneDC = (ctx: BuildContext) => 8 + ctx.proficiencyBonus + ctx.modifier('intelligence');

/** One Arcane Shot option: a pick of the shared pool that puts its shot onto the sheet. */
const arcaneShot = (
  id: string,
  name: string,
  description: string,
  extra: Pick<FeatureDef, 'damage' | 'damageType' | 'saveAttribute' | 'iconName' | 'color'>,
): OptionDef => ({
  id,
  name,
  description,
  features: [
    {
      id: `arcane-archer.${id}`,
      name,
      description: `${description}\n\nТратит использование Чародейного выстрела; раз в ход, при дальнобойной атаке оружием со свойством «Боеприпас».`,
      action: 'passive',
      usesResource: { id: ARCANE_SHOT },
      ...(extra.saveAttribute ? { saveDC: arcaneDC } : {}),
      ...extra,
    },
  ],
});

const ARCANE_SHOT_OPTIONS: OptionDef[] = [
  arcaneShot(
    'bursting-arrow',
    'Взрывной выстрел',
    'Сразу после того, как атака нанесла урон существу, оно и все существа в эманации 10 футов от него получают силовой урон в 2 Кости чародейного выстрела.',
    { damage: arcaneDice(2), damageType: 'Силовой', iconName: 'spiky-explosion', color: '#b36bd6' },
  ),
  arcaneShot(
    'banishing-arrow',
    'Изгоняющий выстрел',
    'Цель попадания получает дополнительно 1 Кость чародейного выстрела психического урона и совершает спасбросок Харизмы. При провале она изгнана в демиплан: недееспособна, скорость 0; в конце своего следующего хода возвращается на прежнее место (или в ближайшее свободное).',
    { damage: arcaneDice(1), damageType: 'Психический', saveAttribute: 'charisma', iconName: 'magic-portal' },
  ),
  arcaneShot(
    'seeking-arrow',
    'Ищущий выстрел',
    'Без броска атаки: выберите существо, которое вы видели за последнюю минуту. Снаряд летит к нему, огибая углы и игнорируя укрытие на половину и на три четверти. Если цель в пределах максимальной дистанции оружия, она совершает спасбросок Ловкости: при провале вы узнаёте, где она, и она получает урон как от попадания плюс 2 Кости чародейного выстрела силового урона, при успехе — половину.',
    { damage: arcaneDice(2), damageType: 'Силовой', saveAttribute: 'dexterity', iconName: 'crosshair' },
  ),
  arcaneShot(
    'enfeebling-arrow',
    'Ослабляющий выстрел',
    'Цель попадания получает дополнительно 1 Кость чародейного выстрела некротического урона и совершает спасбросок Телосложения. При провале она отравлена до конца своего следующего хода, и урон каждой её попавшей атаки уменьшается на бросок 1 Кости чародейного выстрела.',
    { damage: arcaneDice(1), damageType: 'Некротический', saveAttribute: 'constitution', iconName: 'death-skull' },
  ),
  arcaneShot(
    'piercing-arrow',
    'Пронзающий выстрел',
    'Без броска атаки: снаряд становится нематериальным и пролетает линию длиной 30 футов и шириной 1 фут, игнорируя укрытие. Каждое существо на линии совершает спасбросок Ловкости: при провале получает урон как от попадания плюс 2 Кости чародейного выстрела колющего урона, при успехе — половину.',
    { damage: arcaneDice(2), damageType: 'Колющий', saveAttribute: 'dexterity', iconName: 'arrow-cluster' },
  ),
  arcaneShot(
    'shadow-arrow',
    'Тьмяной выстрел',
    'Цель попадания получает дополнительно 1 Кость чародейного выстрела психического урона и совершает спасбросок Мудрости, иначе ослеплена до конца своего следующего хода.',
    { damage: arcaneDice(1), damageType: 'Психический', saveAttribute: 'wisdom', iconName: 'blindfold' },
  ),
  arcaneShot(
    'grasping-arrow',
    'Удерживающий выстрел',
    'Цель попадания получает дополнительно 1 Кость чародейного выстрела рубящего урона и совершает спасбросок Силы, иначе опутана колючими ветвями на 1 минуту или до вашего следующего Удерживающего выстрела. Действием цель или существо рядом с ней может совершить проверку Силы (Атлетика) против СЛ выстрела и при успехе освободить её.',
    { damage: arcaneDice(1), damageType: 'Рубящий', saveAttribute: 'strength', iconName: 'thorny-vine' },
  ),
  arcaneShot(
    'beguiling-arrow',
    'Чарующий выстрел',
    'Цель попадания получает дополнительно 2 Кости чародейного выстрела психического урона и совершает спасбросок Мудрости, иначе очарована вами или союзником в пределах 30 футов от неё (на ваш выбор) до конца своего следующего хода. Очарование кончается, если источник атакует цель, наносит ей урон или вынуждает её совершить спасбросок.',
    { damage: arcaneDice(2), damageType: 'Психический', saveAttribute: 'wisdom', iconName: 'charm' },
  ),
];

const arcaneShotChoice = (count: number): ChoiceDef => ({
  id: 'arcane-shots',
  label: count > 1 ? `Чародейные выстрелы (${count})` : 'Чародейный выстрел',
  count,
  pool: ARCANE_SHOTS_POOL,
  options: { from: 'options', options: ARCANE_SHOT_OPTIONS },
});

const newArcaneShot = (level: number): FeatureDef => ({
  id: `arcane-archer.arcane-shot-${level}`,
  name: 'Новый чародейный выстрел',
  description: 'Вы изучаете ещё один вариант Чародейного выстрела и можете заменить один известный вариант другим.',
  hidden: true,
  choices: [arcaneShotChoice(1)],
});

const arcaneArcher: SubclassDef = {
  id: 'arcane-archer',
  name: 'Чародейный стрелок',
  source: 'Arcana Unleashed',
  description: 'Стрелок эльфийской школы, вплетающий магию в каждый выстрел: снаряды изгоняют, ослепляют, взрываются и находят цель за углом.',
  levels: {
    3: [
      {
        id: 'arcane-archer.lore',
        name: 'Знания чародейных стрелков',
        description:
          '**Заговор.** Вы изучаете «Искусство друидов» или «Фокусы»; заклинательная характеристика — Интеллект.\n\n**Навыки.** Вы получаете владение навыками Природа и Тайная магия. Если вы уже владели одним из них (или обоими), возьмите взамен другой навык из списка воина 1-го уровня.',
        effects: [
          { type: 'skill', skill: 'nature' },
          { type: 'skill', skill: 'arcana' },
        ],
        choices: [
          {
            id: 'cantrip',
            label: 'Заговор',
            count: 1,
            options: {
              from: 'options',
              options: [
                {
                  id: 'druidcraft',
                  name: 'Искусство друидов',
                  description: 'Заговор друида, творится Интеллектом.',
                  effects: [{ type: 'spell', spell: 'druidcraft', alwaysPrepared: true, ability: 'intelligence' }],
                },
                {
                  id: 'prestidigitation',
                  name: 'Фокусы',
                  description: 'Заговор волшебника, творится Интеллектом.',
                  effects: [{ type: 'spell', spell: 'prestidigitation', alwaysPrepared: true, ability: 'intelligence' }],
                },
              ],
            },
          },
        ],
        iconName: 'book-aura',
      },
      {
        id: ARCANE_SHOT,
        name: 'Чародейный выстрел',
        description:
          'Раз в ход, совершая дальнобойную атаку оружием со свойством «Боеприпас», вы можете применить к ней известный вам вариант Чародейного выстрела (если вариант без броска атаки — решаете при попадании и уроне). Вы знаете 2 варианта, ещё по одному на 7, 10, 15 и 18-м уровнях; изучая новый, можно заменить известный. Использований — модификатор Интеллекта (минимум 1), восстанавливаются после короткого или продолжительного отдыха. Кость чародейного выстрела: к6, к8 с 10-го уровня, к10 с 15-го, к12 с 18-го. СЛ = 8 + бонус мастерства + модификатор Интеллекта.',
        action: 'passive',
        saveDC: arcaneDC,
        resource: {
          id: ARCANE_SHOT,
          name: 'Чародейный выстрел',
          max: modifierOf('intelligence'),
          recharge: 'shortOrLong',
          description: 'Кость чародейного выстрела: к6, к8 с 10-го уровня, к10 с 15-го, к12 с 18-го.',
          iconName: 'high-shot',
        },
        choices: [arcaneShotChoice(2)],
        iconName: 'high-shot',
        color: '#8a7cf0',
      },
    ],
    7: [
      {
        id: 'arcane-archer.curving-shot',
        name: 'Странствующая стрела',
        description:
          'Промахнувшись дальнобойной атакой оружием со свойством «Боеприпас», вы можете сразу бонусным действием перенаправить снаряд в другое видимое существо в пределах дистанции оружия и не далее 60 футов от первой цели.',
        action: 'bonus',
        iconName: 'target-arrows',
      },
      {
        id: 'arcane-archer.magic-ammunition',
        name: 'Магические боеприпасы',
        description:
          'Действием «Магия» вы заряжаете немагический снаряд одним из свойств и стреляете им в видимую твёрдую поверхность в пределах дистанции оружия; снаряд крепится к ней, пока действует эффект, затем разрушается (действием «Магия» его можно открепить и закончить эффект раньше).\n\n- **Затемняющий:** тени заполняют эманацию 15 футов на 1 минуту, гасят немагический огонь; существа в ней получают −5 к проверкам Мудрости (Восприятие) и пассивному Восприятию.\n- **Открывающий:** громкий щелчок (слышен за 300 футов); в эманации 15 футов размыкается по одному немагическому замку на каждом объекте, заклинившее расклинивается, засовы снимаются.\n- **Лозовой:** вырастает лоза длиной 120 футов, по которой можно лазать; усыхает через 10 минут.\n\nРаз в короткий или продолжительный отдых; использование можно вернуть, потратив использование Второго дыхания.',
        action: 'action',
        resource: { id: 'arcane-archer.magic-ammunition', name: 'Магические боеприпасы', max: 1, recharge: 'shortOrLong', iconName: 'vine-whip' },
        iconName: 'vine-whip',
      },
      newArcaneShot(7),
    ],
    10: [
      {
        id: 'arcane-archer.ready-shot',
        name: 'Заготовленный выстрел',
        description: 'Совершая бросок инициативы, вы восстанавливаете одно потраченное использование Чародейного выстрела.',
        action: 'passive',
        iconName: 'hourglass',
      },
      newArcaneShot(10),
    ],
    15: [
      {
        id: 'arcane-archer.indomitable-teleport',
        name: 'Неукротимая телепортация',
        description: 'Когда благодаря Неукротимому вы преуспеваете в спасброске, вы можете телепортироваться в видимое свободное пространство в пределах 60 футов.',
        action: 'passive',
        iconName: 'teleport',
      },
      newArcaneShot(15),
    ],
    18: [
      {
        id: 'arcane-archer.masterful-archery',
        name: 'Мастерская стрельба',
        description:
          'Когда видимое вами существо промахивается по вам атакой, вы можете реакцией переместиться на половину скорости, не провоцируя атак, а затем в рамках той же реакции совершить дальнобойную атаку по нему, если оно в пределах дистанции оружия.',
        action: 'reaction',
        iconName: 'archer',
      },
      newArcaneShot(18),
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// The class
// ------------------------------------------------------------------------------------------------

export const FIGHTER: ClassDef = {
  id: 'fighter',
  name: 'Воин',
  description: 'Мастер оружия и доспехов. Сражается дольше и надёжнее всех, а подкласс решает, чем он берёт: силой, тактикой, магией или разумом.',
  hitDie: 10,
  primary: ['strength', 'dexterity'],
  saves: ['strength', 'constitution'],
  skillChoices: {
    count: 2,
    list: ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'persuasion', 'perception', 'survival'],
  },
  proficiencies: [
    { type: 'proficiency', category: 'armor', value: 'Лёгкие доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Средние доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Тяжёлые доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Щиты' },
    { type: 'proficiency', category: 'weapon', value: 'Простое оружие' },
    { type: 'proficiency', category: 'weapon', value: 'Воинское оружие' },
  ],
  mentalStrength: 55,
  subclassLevel: 3,
  subclasses: [battleMaster, champion, eldritchKnight, psiWarrior, banneret, arcaneArcher],
  replaceable: [
    { pool: 'maneuvers', label: 'Замена приёма' },
    { pool: ARCANE_SHOTS_POOL, label: 'Замена чародейного выстрела' },
  ],
  startingEquipment: FIGHTER_KITS,
  levels: {
    1: [
      {
        id: 'fighter.fighting-style',
        name: 'Боевой стиль',
        iconName: 'crossed-swords',
        description: 'Вы получаете черту боевого стиля на свой выбор. Повышая уровень воина, можно заменить её другой.',
        choices: [{ id: 'style', label: 'Боевой стиль', count: 1, options: { from: 'feats', categories: ['fightingStyle'] } }],
      },
      {
        id: 'fighter.second-wind',
        name: 'Второе дыхание',
        description:
          'Бонусным действием вы восстанавливаете 1к10 + уровень воина хитов. Использований 2 (3 с 4-го уровня, 4 с 10-го); короткий отдых возвращает одно, продолжительный — все.',
        action: 'bonus',
        damage: (ctx) => `1d10+${ctx.classLevel}`,
        damageType: 'Лечение',
        resource: { id: SECOND_WIND, name: 'Второе дыхание', max: byClassLevel({ 1: 2, 4: 3, 10: 4 }), recharge: 'long', shortRestRegain: 1, iconName: 'heart-plus' },
        iconName: 'heart-plus',
        color: '#7fb069',
      },
      {
        id: 'fighter.weapon-mastery',
        name: 'Оружейное мастерство',
        iconName: 'broadsword',
        description:
          'Вы используете свойства мастерства трёх видов простого или воинского оружия (4 с 4-го уровня, 5 с 10-го, 6 с 16-го). После продолжительного отдыха один вид можно заменить.',
        choices: [weaponMasteryChoice(3, 'Оружейное мастерство (3)')],
      },
    ],
    2: [
      {
        id: 'fighter.action-surge',
        name: 'Всплеск действий',
        description:
          'В свой ход вы совершаете одно дополнительное действие (кроме действия «Магия»). Раз в короткий или продолжительный отдых; с 17-го уровня — дважды, но не больше раза за ход.',
        action: 'passive',
        resource: { id: 'fighter.action-surge', name: 'Всплеск действий', max: byClassLevel({ 2: 1, 17: 2 }), recharge: 'shortOrLong', iconName: 'lightning-helix' },
        iconName: 'lightning-helix',
      },
      {
        id: 'fighter.tactical-mind',
        name: 'Тактический ум',
        iconName: 'brain',
        description:
          'Провалив проверку характеристики, вы можете потратить использование Второго дыхания и добавить к результату 1к10. Если проверка всё равно провалена, использование не тратится.',
        action: 'passive',
        usesResource: { id: SECOND_WIND },
      },
    ],
    3: [
      {
        id: 'fighter.subclass',
        name: 'Подкласс воина',
        description: 'Вы выбираете подкласс: Мастер боя, Чемпион, Мистический рыцарь, Пси-воин, Баннерет или Чародейный стрелок.',
        hidden: true,
      },
    ],
    4: [
      abilityScoreImprovement('fighter', 4),
      { id: 'fighter.weapon-mastery-4', name: 'Оружейное мастерство', description: 'Вы осваиваете ещё один вид оружия.', hidden: true, choices: [weaponMasteryChoice(1)] },
    ],
    5: [
      extraAttack(5, 2, 'Дополнительная атака'),
      {
        id: 'fighter.tactical-shift',
        name: 'Тактический сдвиг',
        iconName: 'dodge',
        description: 'Активируя Второе дыхание бонусным действием, вы можете переместиться на половину скорости, не провоцируя атак.',
        action: 'passive',
      },
    ],
    6: [abilityScoreImprovement('fighter', 6)],
    8: [abilityScoreImprovement('fighter', 8)],
    9: [
      {
        id: 'fighter.indomitable',
        name: 'Неукротимый',
        description:
          'Провалив спасбросок, вы можете перебросить его с бонусом, равным уровню воина, и должны использовать новый результат. Раз в продолжительный отдых (дважды с 13-го уровня, трижды с 17-го).',
        action: 'passive',
        resource: { id: 'fighter.indomitable', name: 'Неукротимый', max: byClassLevel({ 9: 1, 13: 2, 17: 3 }), recharge: 'long', iconName: 'checked-shield' },
        iconName: 'checked-shield',
      },
      {
        id: 'fighter.tactical-master',
        name: 'Мастер тактики',
        iconName: 'all-seeing-eye',
        description: 'Атакуя оружием, свойство мастерства которого вы используете, вы можете заменить его на Толчок, Ослабление или Замедление.',
        action: 'passive',
      },
    ],
    10: [{ id: 'fighter.weapon-mastery-10', name: 'Оружейное мастерство', description: 'Вы осваиваете ещё один вид оружия.', hidden: true, choices: [weaponMasteryChoice(1)] }],
    11: [extraAttack(11, 3, 'Две дополнительные атаки')],
    12: [abilityScoreImprovement('fighter', 12)],
    13: [
      {
        id: 'fighter.studied-attacks',
        name: 'Изученные атаки',
        iconName: 'arrow-scope',
        description: 'Промахнувшись атакой по существу, вы совершаете с преимуществом следующий бросок атаки по нему до конца своего следующего хода.',
        action: 'passive',
      },
    ],
    14: [abilityScoreImprovement('fighter', 14)],
    16: [
      abilityScoreImprovement('fighter', 16),
      { id: 'fighter.weapon-mastery-16', name: 'Оружейное мастерство', description: 'Вы осваиваете ещё один вид оружия.', hidden: true, choices: [weaponMasteryChoice(1)] },
    ],
    19: [epicBoon('fighter')],
    20: [extraAttack(20, 4, 'Три дополнительные атаки')],
  },
};

