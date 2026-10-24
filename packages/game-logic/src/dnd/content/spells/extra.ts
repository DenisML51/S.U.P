import type { SpellDef } from '../../types';

/** Spells outside the class lists we carry, granted by a feature (Psi Warrior's Telekinetic Master). */
export const EXTRA_SPELLS: SpellDef[] = [
  {
    id: 'telekinesis',
    name: 'Телекинез',
    level: 5,
    school: 'Преобразование',
    castingTime: '1 действие',
    action: 'action',
    range: '60 футов',
    components: 'В, С',
    duration: 'до 1 минуты',
    concentration: true,
    description:
      'Пока заклинание действует, каждым действием «Магия» вы можете переместить существо (Огромное или меньше) или предмет весом до 1000 фунтов в пределах дистанции. Существо совершает спасбросок Силы против вашей СЛ заклинаний; при провале вы перемещаете его на 30 футов в любую сторону (включая вверх) и оно опутано до конца вашего следующего хода. Не несомый предмет перемещается на 30 футов; несомый можно отнять, если владелец провалит спасбросок Силы.',
    lists: ['wizard'],
    iconName: 'psychic-waves',
  },
];
