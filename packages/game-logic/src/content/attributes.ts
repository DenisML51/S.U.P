export type AttributeId = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

export interface AttributeDefinition {
  id: AttributeId;
  name: string;
  shortName: string;
  description: string;
}

export const ATTRIBUTES_LIST: AttributeDefinition[] = [
  { id: 'strength', name: 'Сила', shortName: 'СИЛ', description: 'Физическая мощь и ближний бой' },
  { id: 'dexterity', name: 'Ловкость', shortName: 'ЛВК', description: 'Проворство и точность' },
  { id: 'constitution', name: 'Телосложение', shortName: 'ТЕЛ', description: 'Здоровье и стойкость' },
  { id: 'intelligence', name: 'Интеллект', shortName: 'ИНТ', description: 'Знания и анализ' },
  { id: 'wisdom', name: 'Мудрость', shortName: 'МДР', description: 'Интуиция и восприятие' },
  { id: 'charisma', name: 'Харизма', shortName: 'ХАР', description: 'Влияние и убеждение' },
];

export interface SkillDefinition {
  id: string;
  name: string;
  attribute: AttributeId;
}

export const SKILLS_LIST: SkillDefinition[] = [
  { id: 'athletics', name: 'Атлетика', attribute: 'strength' },
  { id: 'acrobatics', name: 'Акробатика', attribute: 'dexterity' },
  { id: 'sleightOfHand', name: 'Ловкость рук', attribute: 'dexterity' },
  { id: 'stealth', name: 'Скрытность', attribute: 'dexterity' },
  { id: 'arcana', name: 'Магия', attribute: 'intelligence' },
  { id: 'history', name: 'История', attribute: 'intelligence' },
  { id: 'investigation', name: 'Анализ', attribute: 'intelligence' },
  { id: 'nature', name: 'Природа', attribute: 'intelligence' },
  { id: 'religion', name: 'Религия', attribute: 'intelligence' },
  { id: 'animalHandling', name: 'Уход за животными', attribute: 'wisdom' },
  { id: 'insight', name: 'Внимательность', attribute: 'wisdom' },
  { id: 'medicine', name: 'Медицина', attribute: 'wisdom' },
  { id: 'perception', name: 'Восприятие', attribute: 'wisdom' },
  { id: 'survival', name: 'Выживание', attribute: 'wisdom' },
  { id: 'deception', name: 'Обман', attribute: 'charisma' },
  { id: 'intimidation', name: 'Запугивание', attribute: 'charisma' },
  { id: 'performance', name: 'Выступление', attribute: 'charisma' },
  { id: 'persuasion', name: 'Убеждение', attribute: 'charisma' },
];
