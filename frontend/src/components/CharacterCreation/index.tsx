import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Compass, Sparkles, Swords, User, X } from 'lucide-react';
import { useCharacterCreationLogic, Step } from './CharacterCreationLogic';
import { useI18n } from '../../i18n/I18nProvider';
import { IdentityStep } from './steps/IdentityStep';
import { OriginStep } from './steps/OriginStep';
import { CoreStatsStep } from './steps/CoreStatsStep';
import { ProficienciesStep } from './steps/ProficienciesStep';
import { FinalizeStep } from './steps/FinalizeStep';
import { CharacterCompleteStep } from './steps/CharacterCompleteStep';

interface CharacterCreationProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export const CharacterCreation: React.FC<CharacterCreationProps> = ({ onComplete, onCancel }) => {
  const { t } = useI18n();
  const logic = useCharacterCreationLogic(onComplete);
  const {
    currentStep,
    setCurrentStep,
    canAccessStep,
    getStepBlockingReason,
    saveStatus,
    isCompleted,
    goBack,
    goNext,
    isIdentityValid,
    isOriginValid,
    isCoreStatsValid,
  } = logic;

  const steps = [
    { id: 'identity', label: t('creation.steps.identity'), icon: User, done: isIdentityValid },
    { id: 'origin', label: t('creation.steps.origin'), icon: Compass, done: isOriginValid },
    { id: 'coreStats', label: t('creation.steps.coreStats'), icon: Swords, done: isCoreStatsValid },
    { id: 'proficiencies', label: t('creation.steps.proficiencies'), icon: Sparkles, done: true },
    { id: 'finalize', label: t('creation.steps.finalize'), icon: CheckCircle2, done: saveStatus === 'success' },
  ];

  const isLastStep = currentStep === 'finalize';
  const stepOrder: Step[] = ['identity', 'origin', 'coreStats', 'proficiencies', 'finalize'];
  const currentIndex = stepOrder.indexOf(currentStep);
  const nextStep = currentIndex >= 0 && currentIndex < stepOrder.length - 1 ? stepOrder[currentIndex + 1] : null;
  const isContinueDisabled = isLastStep || (nextStep ? !canAccessStep(nextStep) : true);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                {t('creation.title')}
              </h1>
              <p className="text-gray-400">{t('creation.subtitle')}</p>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                {t('common.cancel')}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[82px_minmax(0,1fr)] gap-5 items-start">
          <aside className="hidden lg:flex flex-col items-center py-5 px-2 sticky top-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompletedStep = step.done && !isActive;
              const canAccess = canAccessStep(step.id as Step);
              const blockedReason = getStepBlockingReason(step.id as Step);
              const reasonLabel = blockedReason ? t(blockedReason) : step.label;

              return (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    title={reasonLabel}
                    onClick={() => canAccess && setCurrentStep(step.id as Step)}
                    disabled={!canAccess}
                    className={`relative w-11 h-11 rounded-xl border transition-all flex items-center justify-center ${
                      isActive
                        ? 'border-blue-400/70 bg-blue-500/20 text-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                        : isCompletedStep
                        ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-300'
                        : canAccess
                        ? 'border-blue-400/30 bg-white/[0.03] text-gray-300 hover:border-violet-400/35 hover:bg-white/[0.07]'
                        : 'border-blue-400/15 bg-white/[0.02] text-gray-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {isCompletedStep ? <CheckCircle2 className="w-3.5 h-3.5 absolute -right-1 -top-1 text-emerald-400 bg-black rounded-full" /> : null}
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`my-3 h-8 w-px ${isCompletedStep ? 'bg-emerald-500/40' : 'bg-white/15'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </aside>

          <div className="space-y-4 p-2 md:p-4">
            {isCompleted ? (
              <CharacterCompleteStep
                name={logic.name}
                onOpenSheet={logic.finishCreation}
                onBackToRoster={logic.finishCreation}
              />
            ) : (
              <>
                <AnimatePresence mode="wait">
                  {currentStep === 'identity' && (
                    <IdentityStep
                      name={logic.name}
                      concept={logic.concept}
                      avatar={logic.avatar}
                      setName={logic.setName}
                      setConcept={logic.setConcept}
                      setAvatar={logic.setAvatar}
                    />
                  )}
                  {currentStep === 'origin' && (
                    <OriginStep
                      race={logic.race}
                      setRace={logic.setRace}
                      subrace={logic.subrace}
                      setSubrace={logic.setSubrace}
                      charClass={logic.charClass}
                      setCharClass={logic.setCharClass}
                      subclass={logic.subclass}
                      setSubclass={logic.setSubclass}
                      racePresets={logic.racePresets}
                      classPresets={logic.classPresets}
                    />
                  )}
                  {currentStep === 'coreStats' && (
                    <CoreStatsStep
                      pointsUsed={logic.pointsUsed}
                      pointsRemaining={logic.pointsRemaining}
                      attributes={logic.attributes}
                      savingThrows={logic.savingThrows}
                      speed={logic.speed}
                      setSpeed={logic.setSpeed}
                      toggleSavingThrow={logic.toggleSavingThrow}
                      decrementAttribute={logic.decrementAttribute}
                      canDecrement={logic.canDecrement}
                      incrementAttribute={logic.incrementAttribute}
                      canIncrement={logic.canIncrement}
                      getModifier={logic.getModifier}
                      getCost={logic.getCost}
                    />
                  )}
                  {currentStep === 'proficiencies' && (
                    <ProficienciesStep
                      skills={logic.skills}
                      attributes={logic.attributes}
                      proficiencyBonus={logic.proficiencyBonus}
                      recommendedSkills={logic.recommendedSkills}
                      languagesAndProficiencies={logic.languagesAndProficiencies}
                      setLanguagesAndProficiencies={logic.setLanguagesAndProficiencies}
                      toggleSkillProficiency={logic.toggleSkillProficiency}
                      toggleSkillExpertise={logic.toggleSkillExpertise}
                    />
                  )}
                  {currentStep === 'finalize' && (
                    <FinalizeStep
                      name={logic.name}
                      race={logic.race}
                      subrace={logic.subrace}
                      charClass={logic.charClass}
                      subclass={logic.subclass}
                      pointsRemaining={logic.pointsRemaining}
                      saveStatus={logic.saveStatus}
                      saveError={logic.saveError}
                      onCreate={() => void logic.handleSave()}
                    />
                  )}
                </AnimatePresence>

                <div className="rounded-2xl border border-blue-400/30 bg-gradient-to-r from-white/[0.04] to-white/[0.02] p-4 flex flex-wrap items-center justify-between gap-3 backdrop-blur-sm">
                  <div className="text-sm text-gray-400">
                    {logic.getStepBlockingReason(currentStep)
                      ? t(logic.getStepBlockingReason(currentStep) as string)
                      : t('creation.readyToContinue')}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={goBack}
                      disabled={currentStep === 'identity'}
                      className="px-4 py-2 rounded-xl bg-white/[0.06] text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {t('common.back')}
                    </button>
                    {isLastStep ? null : (
                      <button
                        type="button"
                        onClick={goNext}
                        disabled={isContinueDisabled}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {t('creation.continue')}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

