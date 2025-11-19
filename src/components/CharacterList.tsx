import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCharacter } from '../context/CharacterContext';
import { CharacterCard } from './CharacterCard';
import { CharacterCreation } from './CharacterCreation';
import { Plus, Upload, User } from 'lucide-react';

export const CharacterList: React.FC = () => {
  const { charactersList, loadCharacter, deleteCharacter, importFromJSON, goToCharacterList } = useCharacter();
  const [showCreation, setShowCreation] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleCardClick = (characterId: string) => {
    loadCharacter(characterId);
  };

  const handleDelete = (e: React.MouseEvent, characterId: string) => {
    e.stopPropagation();
    if (window.confirm('Вы уверены, что хотите удалить этого персонажа?')) {
      deleteCharacter(characterId);
      setDeletingId(characterId);
      setTimeout(() => setDeletingId(null), 300);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      await importFromJSON(file);
      setShowCreation(false);
    } catch (error) {
      alert('Ошибка при импорте файла');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (showCreation) {
    return (
      <CharacterCreation 
        onComplete={() => {
          setShowCreation(false);
          goToCharacterList();
        }}
        onCancel={() => setShowCreation(false)}
      />
    );
  }

  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Into The Dark
          </h1>
          <p className="text-gray-400">Управление персонажами</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreation(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all font-semibold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Создать персонажа
          </motion.button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            id="import-file"
          />
          <motion.label
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            htmlFor="import-file"
            className="px-6 py-3 bg-dark-card border border-dark-border rounded-xl hover:bg-dark-hover transition-all cursor-pointer flex items-center gap-2 font-semibold"
          >
            <Upload className="w-5 h-5" />
            Импорт персонажа
          </motion.label>
        </div>

        {/* Characters Grid */}
        {charactersList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {charactersList.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                onClick={() => handleCardClick(char.id)}
                onDelete={(e) => handleDelete(e, char.id)}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 bg-dark-card rounded-full flex items-center justify-center mx-auto mb-4 border border-dark-border">
              <User className="w-12 h-12 text-gray-500" />
            </div>
            <p className="text-xl text-gray-400 mb-2">Нет персонажей</p>
            <p className="text-sm text-gray-500 mb-6">Создайте нового персонажа или импортируйте существующего</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreation(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all font-semibold"
            >
              Создать первого персонажа
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

