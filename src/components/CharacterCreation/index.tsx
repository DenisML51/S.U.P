import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, TrendingUp, Zap, X, CheckCircle2 } from 'lucide-react';
import { useCharacterCreationLogic, Step } from './CharacterCreationLogic';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { AttributesStep } from './steps/AttributesStep';
import { SkillsStep } from './steps/SkillsStep';
import { INITIAL_POINTS } from '../../types';

interface CharacterCreationProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export const CharacterCreation: React.FC<CharacterCreationProps> = ({ onComplete, onCancel }) => {
  const logic = useCharacterCreationLogic(onComplete);
  const { currentStep, setCurrentStep, isBasicValid, isAttributesValid } = logic;

  const steps = [
    { id: 'basic', label: 'Основное', icon: User },
    { id: 'attributes', label: 'Характеристики', icon: TrendingUp },
    { id: 'skills', label: 'Навыки', icon: Zap },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Создание Персонажа
              </h1>
              <p className="text-gray-400">Создайте нового персонажа для вашего приключения</p>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-dark-card border border-dark-border rounded-xl hover:bg-dark-hover transition-all flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Отмена
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 mb-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = 
                (step.id === 'basic' && isBasicValid) ||
                (step.id === 'attributes' && isAttributesValid) ||
                (step.id === 'skills');
              const canAccess = 
                step.id === 'basic' ||
                (step.id === 'attributes' && isBasicValid) ||
                (step.id === 'skills' && isBasicValid && isAttributesValid);

              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => canAccess && setCurrentStep(step.id as Step)}
                    disabled={!canAccess}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        : isCompleted
                        ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                        : canAccess
                        ? 'bg-dark-card border border-dark-border hover:bg-dark-hover text-gray-300'
                        : 'bg-dark-bg border border-dark-border opacity-50 cursor-not-allowed text-gray-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-semibold text-sm">{step.label}</span>
                    {isCompleted && !isActive && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 ${
                      isCompleted ? 'bg-green-500/30' : 'bg-dark-border'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {currentStep === 'basic' && (
            <BasicInfoStep 
              name={logic.name}
              setName={logic.setName}
              race={logic.race}
              setRace={logic.setRace}
              subrace={logic.subrace}
              setSubrace={logic.setSubrace}
              charClass={logic.charClass}
              setCharClass={logic.setCharClass}
              subclass={logic.subclass}
              setSubclass={logic.setSubclass}
              isCustomRace={logic.isCustomRace}
              setIsCustomRace={logic.setIsCustomRace}
              isCustomSubrace={logic.isCustomSubrace}
              setIsCustomSubrace={logic.setIsCustomSubrace}
              isCustomClass={logic.isCustomClass}
              setIsCustomClass={logic.setIsCustomClass}
              isCustomSubclass={logic.isCustomSubclass}
              setIsCustomSubclass={logic.setIsCustomSubclass}
              speed={logic.speed}
              setSpeed={logic.setSpeed}
              selectedRace={logic.selectedRace}
              selectedClass={logic.selectedClass}
              isBasicValid={logic.isBasicValid}
              setCurrentStep={logic.setCurrentStep}
            />
          )}

          {currentStep === 'attributes' && (
            <AttributesStep 
              pointsUsed={logic.pointsUsed}
              INITIAL_POINTS={INITIAL_POINTS}
              pointsRemaining={logic.pointsRemaining}
              savingThrows={logic.savingThrows}
              toggleSavingThrow={logic.toggleSavingThrow}
              attributes={logic.attributes}
              decrementAttribute={logic.decrementAttribute}
              canDecrement={logic.canDecrement}
              incrementAttribute={logic.incrementAttribute}
              canIncrement={logic.canIncrement}
              getModifier={logic.getModifier}
              getCost={logic.getCost}
              isAttributesValid={logic.isAttributesValid}
              setCurrentStep={logic.setCurrentStep}
            />
          )}

          {currentStep === 'skills' && (
            <SkillsStep 
              skills={logic.skills}
              attributes={logic.attributes}
              proficiencyBonus={logic.proficiencyBonus}
              toggleSkillProficiency={logic.toggleSkillProficiency}
              toggleSkillExpertise={logic.toggleSkillExpertise}
              languagesAndProficiencies={logic.languagesAndProficiencies}
              setLanguagesAndProficiencies={logic.setLanguagesAndProficiencies}
              name={logic.name}
              race={logic.race}
              subrace={logic.subrace}
              charClass={logic.charClass}
              selectedRace={logic.selectedRace}
              selectedSubrace={logic.selectedSubrace}
              selectedClass={logic.selectedClass}
              subclass={logic.subclass}
              setCurrentStep={logic.setCurrentStep}
              isFormValid={logic.isFormValid}
              handleSave={logic.handleSave}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

