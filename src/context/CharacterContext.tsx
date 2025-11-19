import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Character } from '../types';

interface CharacterContextType {
  character: Character | null;
  updateCharacter: (character: Character) => void;
  clearCharacter: () => void;
  exportToJSON: () => void;
  importFromJSON: (file: File) => Promise<void>;
}

const CharacterContext = createContext<CharacterContextType | undefined>(undefined);

const STORAGE_KEY = 'trpg_character';

export const CharacterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [character, setCharacter] = useState<Character | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Проверяем, что структура соответствует новой версии
        if (parsed && typeof parsed === 'object' && 
            parsed.name && parsed.attributes && 
            parsed.skills && Array.isArray(parsed.skills)) {
          // Добавляем значения по умолчанию для новых полей
          const character = {
            ...parsed,
            level: parsed.level || 1,
            experience: parsed.experience || 0,
            speed: parsed.speed || 30,
            armorClass: parsed.armorClass || 10,
            sanity: parsed.sanity !== undefined ? parsed.sanity : 50,
            currentHP: parsed.currentHP !== undefined ? parsed.currentHP : 10,
            maxHP: parsed.maxHP || 10,
            tempHP: parsed.tempHP || 0,
            maxHPBonus: parsed.maxHPBonus || 0,
            limbs: parsed.limbs || [],
            inventory: parsed.inventory || [],
            inventoryNotes: parsed.inventoryNotes || '',
            attacksNotes: parsed.attacksNotes || '',
            equipmentNotes: parsed.equipmentNotes || '',
            abilitiesNotes: parsed.abilitiesNotes || '',
            attacks: (parsed.attacks || []).map((a: any) => ({ ...a, actionType: a.actionType || 'action' })),
            abilities: (parsed.abilities || []).map((a: any) => ({ ...a, actionType: a.actionType || 'action' })),
            attributeBonuses: parsed.attributeBonuses || {},
            savingThrowProficiencies: parsed.savingThrowProficiencies || [],
            resources: parsed.resources || [],
            currency: parsed.currency || { copper: 0, silver: 0, gold: 0 },
            languagesAndProficiencies: parsed.languagesAndProficiencies || '',
            appearance: parsed.appearance || '',
            backstory: parsed.backstory || '',
            alignment: parsed.alignment || '',
            alliesAndOrganizations: parsed.alliesAndOrganizations || '',
            personalityTraits: parsed.personalityTraits || '',
            ideals: parsed.ideals || '',
            bonds: parsed.bonds || '',
            flaws: parsed.flaws || '',
          };
          setCharacter(character);
        } else {
          // Старая версия данных - очищаем
          console.log('Old character data format detected, clearing...');
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.error('Failed to parse saved character:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const updateCharacter = (newCharacter: Character) => {
    setCharacter(newCharacter);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCharacter));
  };

  const clearCharacter = () => {
    setCharacter(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const exportToJSON = () => {
    if (!character) return;
    
    const dataStr = JSON.stringify(character, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${character.name || 'character'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFromJSON = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          
          // Validate basic structure
          if (!parsed || typeof parsed !== 'object' || !parsed.name || !parsed.attributes) {
            reject(new Error('Invalid character data'));
            return;
          }
          
          // Apply defaults to ensure all fields exist
          const character = {
            ...parsed,
            level: parsed.level || 1,
            experience: parsed.experience || 0,
            speed: parsed.speed || 30,
            armorClass: parsed.armorClass || 10,
            sanity: parsed.sanity !== undefined ? parsed.sanity : 50,
            currentHP: parsed.currentHP !== undefined ? parsed.currentHP : 10,
            maxHP: parsed.maxHP || 10,
            tempHP: parsed.tempHP || 0,
            maxHPBonus: parsed.maxHPBonus || 0,
            limbs: parsed.limbs || [],
            inventory: parsed.inventory || [],
            inventoryNotes: parsed.inventoryNotes || '',
            attacksNotes: parsed.attacksNotes || '',
            equipmentNotes: parsed.equipmentNotes || '',
            abilitiesNotes: parsed.abilitiesNotes || '',
            attacks: (parsed.attacks || []).map((a: any) => ({ ...a, actionType: a.actionType || 'action' })),
            abilities: (parsed.abilities || []).map((a: any) => ({ ...a, actionType: a.actionType || 'action' })),
            attributeBonuses: parsed.attributeBonuses || {},
            savingThrowProficiencies: parsed.savingThrowProficiencies || [],
            resources: parsed.resources || [],
            currency: parsed.currency || { copper: 0, silver: 0, gold: 0 },
            skills: parsed.skills || [],
            proficiencyBonus: parsed.proficiencyBonus || 2,
            languagesAndProficiencies: parsed.languagesAndProficiencies || '',
            appearance: parsed.appearance || '',
            backstory: parsed.backstory || '',
            alignment: parsed.alignment || '',
            alliesAndOrganizations: parsed.alliesAndOrganizations || '',
            personalityTraits: parsed.personalityTraits || '',
            ideals: parsed.ideals || '',
            bonds: parsed.bonds || '',
            flaws: parsed.flaws || '',
          };
          
          updateCharacter(character);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  return (
    <CharacterContext.Provider
      value={{
        character,
        updateCharacter,
        clearCharacter,
        exportToJSON,
        importFromJSON,
      }}
    >
      {children}
    </CharacterContext.Provider>
  );
};

export const useCharacter = () => {
  const context = useContext(CharacterContext);
  if (context === undefined) {
    throw new Error('useCharacter must be used within CharacterProvider');
  }
  return context;
};

