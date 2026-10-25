/**
 * What the always-loaded rules need of the D&D 2024 classes (the sanity track), without the presets
 * themselves: those load on demand with the rest of the system (see `systems`).
 */
export const DND_CLASS_META: readonly { id: string; name: string; mentalStrength: number }[] = [
  { id: 'barbarian', name: 'Варвар', mentalStrength: 60 },
  { id: 'bard', name: 'Бард', mentalStrength: 50 },
  { id: 'fighter', name: 'Воин', mentalStrength: 55 },
  { id: 'cleric', name: 'Жрец', mentalStrength: 65 },
  { id: 'druid', name: 'Друид', mentalStrength: 60 },
  { id: 'monk', name: 'Монах', mentalStrength: 65 },
  { id: 'paladin', name: 'Паладин', mentalStrength: 65 },
  { id: 'ranger', name: 'Следопыт', mentalStrength: 55 },
  { id: 'rogue', name: 'Плут', mentalStrength: 50 },
  { id: 'sorcerer', name: 'Чародей', mentalStrength: 45 },
  { id: 'warlock', name: 'Колдун', mentalStrength: 40 },
  { id: 'wizard', name: 'Волшебник', mentalStrength: 50 },
];
