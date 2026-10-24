import type { ManeuverDef } from '../types';

/**
 * Battle Master maneuvers of the Player's Handbook 2024. Each one spends one Superiority Die
 * (d8, d10 from Fighter level 10, d12 from level 18). Only one maneuver per attack.
 * Save DC of a maneuver: 8 + proficiency bonus + Strength or Dexterity modifier (your choice).
 */

const DIE = { id: 'fighter.superiority-dice', cost: 1 } as const;
const DC = 'Сл 8 + бонус мастерства + мод. Силы или Ловкости';

export const MANEUVERS: ManeuverDef[] = [
  {
    id: 'maneuver.ambush',
    name: 'Засада',
    action: 'passive',
    usesResource: DIE,
    trigger: 'проверка Скрытности или бросок Инициативы',
    description:
      'Совершая проверку Ловкости (Скрытность) или бросок Инициативы, тратите кость превосходства и добавляете её к результату. Нельзя, если вы Недееспособны.',
    iconName: 'hooded-assassin',
  },
  {
    id: 'maneuver.bait-and-switch',
    name: 'Подмена',
    action: 'passive',
    usesResource: DIE,
    trigger: 'в свой ход, рядом с согласным существом',
    description:
      'В свой ход, находясь в 5 фт. от согласного существа, тратите кость и не менее 5 фт. перемещения, чтобы поменяться с ним местами; это не провоцирует атак. Бросьте кость: до начала вашего следующего хода вы или это существо (на выбор) прибавляете результат к КД.',
    iconName: 'swap-bag',
  },
  {
    id: 'maneuver.commanders-strike',
    name: 'Удар командующего',
    action: 'bonus',
    usesResource: DIE,
    trigger: 'отказ от одной атаки действия Атака',
    description:
      'Отказываетесь от одной атаки действия Атака и бонусным действием направляете союзника, который видит или слышит вас. Он может реакцией совершить одну атаку оружием или безоружный удар и при попадании добавляет к урону вашу кость превосходства.',
    iconName: 'eagle-emblem',
  },
  {
    id: 'maneuver.commanding-presence',
    name: 'Командирский напор',
    action: 'passive',
    usesResource: DIE,
    trigger: 'проверка Выступления, Запугивания или Убеждения',
    description:
      'Совершая проверку Харизмы (Выступление, Запугивание или Убеждение), тратите кость превосходства и добавляете её к результату.',
    iconName: 'crown',
  },
  {
    id: 'maneuver.disarming-attack',
    name: 'Обезоруживающая атака',
    action: 'passive',
    usesResource: DIE,
    trigger: 'при попадании атакой',
    description: `Попав по существу, добавляете кость к урону. Цель проходит спасбросок Силы (${DC}); при провале роняет выбранный вами предмет, который держит, — он падает в её пространство.`,
    iconName: 'grab',
  },
  {
    id: 'maneuver.distracting-strike',
    name: 'Отвлекающий удар',
    action: 'passive',
    usesResource: DIE,
    trigger: 'при попадании атакой',
    description:
      'Попав по существу, добавляете кость к урону. Следующий бросок атаки по этой цели, совершённый кем-то кроме вас до начала вашего следующего хода, получает преимущество.',
    iconName: 'evil-eyes',
  },
  {
    id: 'maneuver.evasive-footwork',
    name: 'Активное уклонение',
    action: 'bonus',
    usesResource: DIE,
    trigger: 'бонусное действие',
    description:
      'Бонусным действием тратите кость и совершаете действие Отход. Бросьте кость: до начала вашего следующего хода результат прибавляется к вашему КД.',
    iconName: 'dodge',
  },
  {
    id: 'maneuver.feinting-attack',
    name: 'Атака с финтом',
    action: 'bonus',
    usesResource: DIE,
    trigger: 'бонусное действие',
    description:
      'Бонусным действием тратите кость и делаете финт против существа в пределах 5 фт. Ваш следующий бросок атаки по нему в этом ходу получает преимущество; при попадании добавьте кость к урону.',
    iconName: 'backstab',
  },
  {
    id: 'maneuver.goading-attack',
    name: 'Провоцирующая атака',
    action: 'passive',
    usesResource: DIE,
    trigger: 'при попадании атакой',
    description: `Попав по существу, добавляете кость к урону. Цель проходит спасбросок Мудрости (${DC}); при провале до конца вашего следующего хода совершает с помехой броски атаки по всем целям, кроме вас.`,
    iconName: 'screaming',
  },
  {
    id: 'maneuver.lunging-attack',
    name: 'Атака с выпадом',
    action: 'bonus',
    usesResource: DIE,
    trigger: 'бонусное действие',
    description:
      'Бонусным действием тратите кость и совершаете действие Рывок. Если сразу перед попаданием рукопашной атакой действия Атака в этом ходу вы прошли по прямой не менее 5 фт., добавьте кость к урону этой атаки.',
    iconName: 'sprint',
  },
  {
    id: 'maneuver.maneuvering-attack',
    name: 'Атака с манёвром',
    action: 'passive',
    usesResource: DIE,
    trigger: 'при попадании атакой',
    description:
      'Попав по существу, добавляете кость к урону. Выберите согласное существо, которое видит или слышит вас: оно может реакцией переместиться на расстояние до половины своей скорости, не провоцируя атак от цели.',
    iconName: 'boot-stomp',
  },
  {
    id: 'maneuver.menacing-attack',
    name: 'Атака с угрозой',
    action: 'passive',
    usesResource: DIE,
    trigger: 'при попадании атакой',
    description: `Попав по существу, добавляете кость к урону. Цель проходит спасбросок Мудрости (${DC}); при провале Испугана до конца вашего следующего хода.`,
    iconName: 'terror',
  },
  {
    id: 'maneuver.parry',
    name: 'Парирование',
    action: 'reaction',
    usesResource: DIE,
    trigger: 'реакция: вам наносят урон рукопашной атакой',
    description:
      'Когда другое существо наносит вам урон рукопашным броском атаки, реакцией тратите кость и уменьшаете урон на результат кости + модификатор Силы или Ловкости (на выбор).',
    iconName: 'crossed-swords',
  },
  {
    id: 'maneuver.precision-attack',
    name: 'Точная атака',
    action: 'passive',
    usesResource: DIE,
    trigger: 'при промахе броском атаки',
    description:
      'Промахнувшись броском атаки, тратите кость и прибавляете её к броску — атака может стать попаданием.',
    iconName: 'arrow-scope',
  },
  {
    id: 'maneuver.pushing-attack',
    name: 'Толкающая атака',
    action: 'passive',
    usesResource: DIE,
    trigger: 'при попадании атакой',
    description: `Попав по существу, добавляете кость к урону. Если цель Большая или меньше, она проходит спасбросок Силы (${DC}); при провале вы отталкиваете её по прямой от себя на расстояние до 15 фт.`,
    iconName: 'shield-bash',
  },
  {
    id: 'maneuver.rally',
    name: 'Сплочение',
    action: 'bonus',
    usesResource: DIE,
    trigger: 'бонусное действие',
    description:
      'Бонусным действием тратите кость и ободряете союзника в пределах 30 фт., который видит или слышит вас: он получает временные хиты, равные результату кости + половина вашего уровня воина (округление вниз).',
    iconName: 'hunting-horn',
  },
  {
    id: 'maneuver.riposte',
    name: 'Ответный удар',
    action: 'reaction',
    usesResource: DIE,
    trigger: 'реакция: по вам промахнулись рукопашной атакой',
    description:
      'Когда существо промахивается по вам рукопашным броском атаки, реакцией тратите кость и совершаете по нему рукопашную атаку оружием или безоружный удар. При попадании добавьте кость к урону.',
    iconName: 'saber-slash',
  },
  {
    id: 'maneuver.sweeping-attack',
    name: 'Рассекающая атака',
    action: 'passive',
    usesResource: DIE,
    trigger: 'при попадании рукопашной атакой',
    description:
      'Попав рукопашной атакой оружием или безоружным ударом, тратите кость и выбираете другое существо в пределах 5 фт. от цели и в пределах вашей досягаемости. Если исходный бросок атаки попал бы по нему, оно получает урон, равный результату кости, того же типа, что и исходная атака.',
    iconName: 'battle-axe',
  },
  {
    id: 'maneuver.tactical-assessment',
    name: 'Тактическая оценка',
    action: 'passive',
    usesResource: DIE,
    trigger: 'проверка Истории, Расследования или Проницательности',
    description:
      'Совершая проверку Интеллекта (История или Расследование) или Мудрости (Проницательность), тратите кость превосходства и добавляете её к результату.',
    iconName: 'all-seeing-eye',
  },
  {
    id: 'maneuver.trip-attack',
    name: 'Опрокидывающая атака',
    action: 'passive',
    usesResource: DIE,
    trigger: 'при попадании атакой',
    description: `Попав по существу, добавляете кость к урону. Если цель Большая или меньше, она проходит спасбросок Силы (${DC}); при провале получает состояние Опрокинутый.`,
    iconName: 'falling',
  },
];
