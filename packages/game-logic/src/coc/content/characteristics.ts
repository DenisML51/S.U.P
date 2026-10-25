import type { CharacteristicDef } from '../types';

export const CHARACTERISTICS: CharacteristicDef[] = [
  { id: 'str', name: 'Сила', short: 'СИЛ', roll: '3d6', description: 'Мышечная сила: поднять, толкнуть, удержать.' },
  { id: 'con', name: 'Выносливость', short: 'ВЫН', roll: '3d6', description: 'Здоровье, стойкость к ядам и болезням.' },
  { id: 'siz', name: 'Телосложение', short: 'ТЕЛ', roll: '2d6+6', description: 'Рост и вес: сколько места занимает и сколько выдержит.' },
  { id: 'dex', name: 'Ловкость', short: 'ЛВК', roll: '3d6', description: 'Проворство и скорость; порядок хода в бою.' },
  { id: 'app', name: 'Внешность', short: 'НАР', roll: '3d6', description: 'Привлекательность и обаяние при первой встрече.' },
  { id: 'int', name: 'Интеллект', short: 'ИНТ', roll: '2d6+6', description: 'Сообразительность, память, догадки.' },
  { id: 'pow', name: 'Мощь', short: 'МОЩ', roll: '3d6', description: 'Сила воли и духа; из неё — рассудок и магия.' },
  { id: 'edu', name: 'Образование', short: 'ОБР', roll: '2d6+6', description: 'Знания, полученные учёбой и опытом.' },
];

export const characteristicDef = (id: string): CharacteristicDef | undefined => CHARACTERISTICS.find((c) => c.id === id);
