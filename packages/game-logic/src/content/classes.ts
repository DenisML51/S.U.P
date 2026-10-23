/** Classes, their subclasses and base mental strength (the starting point of maximum sanity). */
export interface Subclass {
  id: string;
  name: string;
  icon?: string;
}

export interface Class {
  id: string;
  name: string;
  description: string;
  mentalStrength?: number;
  subclasses: Subclass[];
}

export const CLASSES: Class[] = [
  { 
    id: 'alchemist', 
    name: 'Алхимик', 
    description: 'Мастер зелий и трансмутации',
    mentalStrength: 60,
    subclasses: [
      { id: 'amorist', name: 'Аморист', icon: 'alchemist_amorist.png' },
      { id: 'apothecary', name: 'Аптекарь', icon: 'alchemist_apothecary.png' },
      { id: 'madbomber', name: 'Безумный бомбометальщик', icon: 'alchemist_madbomber.png' },
      { id: 'dynamoengineer', name: 'Динамо-инженер', icon: 'alchemist_dynamo.png' },
      { id: 'researcher', name: 'Исследователь', icon: 'alchemist_researcher.png' },
      { id: 'xenochemist', name: 'Ксенохимик', icon: 'alchemist_xenochemist.png' },
      { id: 'poisonmaster', name: 'Мастер ядов', icon: 'alchemist_poisonmaster.png' },
      { id: 'mixologist', name: 'Миксолог', icon: 'alchemist_mixologist.png' },
      { id: 'mutageneticist', name: 'Мутагенетик', icon: 'alchemist_mutagen.png' },
      { id: 'slimebreeder', name: 'Разводчик слизи', icon: 'alchemist_slime.png' },
      { id: 'shooter', name: 'Стрелок', icon: 'alchemist_shooter.png' },
    ]
  },
  { 
    id: 'fighter', 
    name: 'Боец', 
    description: 'Универсальный мастер боя',
    mentalStrength: 55,
    subclasses: [
      { id: 'royalarena', name: 'Королевская арена', icon: 'fighter_royal.png' },
      { id: 'streetchild', name: 'Дитя улиц', icon: 'fighter_street.png' },
      { id: 'hounds', name: 'Псы и гончие', icon: 'fighter_hounds.png' },
      { id: 'rageandbile', name: 'Злость и желчь', icon: 'fighter_rage.png' },
      { id: 'ringsquare', name: 'Квадрат ринга', icon: 'fighter_ring.png' },
      { id: 'sweetscience', name: 'Сладкая наука', icon: 'fighter_science.png' },
    ]
  },
  { 
    id: 'warrior', 
    name: 'Воин', 
    description: 'Закаленный в битвах ветеран',
    mentalStrength: 55,
    subclasses: [
      { id: 'battlemaster', name: 'Мастер боевых искусств', icon: 'warrior_battlemaster.png' },
      { id: 'champion', name: 'Чемпион', icon: 'warrior_champion.png' },
      { id: 'gunslinger', name: 'Ганслингер', icon: 'warrior_gunslinger.png' },
    ]
  },
  { 
    id: 'warlord', 
    name: 'Военачальник', 
    description: 'Тактик и вдохновитель союзников',
    mentalStrength: 55,
    subclasses: [
      { id: 'academyferocity', name: 'Академия свирепости', icon: 'warlord_ferocity.png' },
      { id: 'academymachinations', name: 'Академия махинаций', icon: 'warlord_machinations.png' },
      { id: 'academytactics', name: 'Академия тактики', icon: 'warlord_tactics.png' },
    ]
  },
  { 
    id: 'ranger', 
    name: 'Егерь', 
    description: 'Следопыт и охотник',
    mentalStrength: 70,
    subclasses: [
      { id: 'orderabsolute', name: 'Орден абсолюта', icon: 'ranger_absolute.png' },
      { id: 'ordermarauders', name: 'Орден мародеров', icon: 'ranger_marauders.png' },
      { id: 'ordersalvation', name: 'Орден спасения', icon: 'ranger_salvation.png' },
    ]
  },
  { 
    id: 'inquisitor', 
    name: 'Инквизитор', 
    description: 'Искоренитель ереси и тьмы',
    mentalStrength: 80,
    subclasses: [
      { id: 'pathcreaturehunter', name: 'Путь охотника на тварей', icon: 'inquisitor_creature.png' },
      { id: 'pathviciousranger', name: 'Путь порочного следопыта', icon: 'inquisitor_ranger.png' },
      { id: 'pathvivisector', name: 'Путь вивисектора', icon: 'inquisitor_vivisector.png' },
      { id: 'pathfanatic', name: 'Путь фанатика', icon: 'inquisitor_fanatic.png' },
    ]
  },
  { 
    id: 'weaponsmith', 
    name: 'Оружейник', 
    description: 'Создатель и мастер оружия',
    mentalStrength: 55,
    subclasses: [
      { id: 'craftduelist', name: 'Ремесло дуэлянта', icon: 'weaponsmith_duelist.png' },
      { id: 'craftweaponsmaster', name: 'Ремесло мастера оружейника', icon: 'weaponsmith_master.png' },
      { id: 'craftsniper', name: 'Ремесло снайпера', icon: 'weaponsmith_sniper.png' },
    ]
  },
  { 
    id: 'rogue', 
    name: 'Плут', 
    description: 'Мастер скрытности и обмана',
    mentalStrength: 60,
    subclasses: [
      { id: 'thief', name: 'Вор', icon: 'rogue_thief.png' },
      { id: 'assassin', name: 'Убийца', icon: 'rogue_assassin.png' },
      { id: 'duelist', name: 'Дуэлянт', icon: 'rogue_duelist.png' },
      { id: 'combinator', name: 'Комбинатор', icon: 'rogue_combinator.png' },
      { id: 'scout', name: 'Скаут', icon: 'rogue_scout.png' },
      { id: 'investigator', name: 'Сыщик', icon: 'rogue_investigator.png' },
    ]
  },
  { 
    id: 'savant', 
    name: 'Савант', 
    description: 'Гений и исследователь',
    mentalStrength: 50,
    subclasses: [
      { id: 'archaeologist', name: 'Археолог', icon: 'savant_archaeologist.png' },
      { id: 'doctor', name: 'Врач', icon: 'savant_doctor.png' },
      { id: 'naturalist', name: 'Натуралист', icon: 'savant_naturalist.png' },
      { id: 'investigator', name: 'Следователь', icon: 'savant_investigator.png' },
      { id: 'tactician', name: 'Тактик', icon: 'savant_tactician.png' },
      { id: 'chef', name: 'Кулинар', icon: 'savant_chef.png' },
      { id: 'orator', name: 'Оратор', icon: 'savant_orator.png' },
      { id: 'philosopher', name: 'Философ', icon: 'savant_philosopher.png' },
      { id: 'runewriter', name: 'Рунописец', icon: 'savant_runes.png' },
    ]
  },
];
