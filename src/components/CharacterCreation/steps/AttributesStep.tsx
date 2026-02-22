import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap } from 'lucide-react';
import { ATTRIBUTES_LIST } from '../../../types';

interface AttributesStepProps {
  pointsUsed: number;
  INITIAL_POINTS: number;
  pointsRemaining: number;
  savingThrows: string[];
  toggleSavingThrow: (attrId: string) => void;
  attributes: { [key: string]: number };
  decrementAttribute: (attrId: string) => void;
  canDecrement: (attrId: string) => boolean;
  incrementAttribute: (attrId: string) => void;
  canIncrement: (attrId: string) => boolean;
  getModifier: (value: number) => string;
  getCost: (value: number) => number;
  isAttributesValid: boolean;
  setCurrentStep: (step: any) => void;
}

export const AttributesStep: React.FC<AttributesStepProps> = ({
  pointsUsed,
  INITIAL_POINTS,
  pointsRemaining,
  savingThrows,
  toggleSavingThrow,
  attributes,
  decrementAttribute,
  canDecrement,
  incrementAttribute,
  canIncrement,
  getModifier,
  getCost,
  isAttributesValid,
  setCurrentStep,
}) => {
  return (
    <motion.div
      key="attributes"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400 mb-1">Очки характеристик</div>
            <div className="text-2xl font-bold">
              Использовано: <span className="text-blue-400">{pointsUsed}</span> / {INITIAL_POINTS}
            </div>
          </div>
          <div className={`px-6 py-3 rounded-xl border-2 ${
            pointsRemaining === 0
              ? 'bg-green-500/20 border-green-500/50 text-green-400'
              : pointsRemaining < 0
              ? 'bg-red-500/20 border-red-500/50 text-red-400'
              : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
          }`}>
            <div className="text-sm font-semibold mb-1">
              {pointsRemaining === 0 ? 'Готово!' : pointsRemaining < 0 ? 'Перерасход' : 'Осталось'}
            </div>
            <div className="text-2xl font-bold">{pointsRemaining}</div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg">
        <div className="space-y-3">
          {ATTRIBUTES_LIST.map((attr) => (
            <div
              key={attr.id}
              className="flex items-center justify-between p-4 bg-dark-bg rounded-xl border border-dark-border hover:border-blue-500/50 transition-all"
            >
              <div className="flex items-center gap-4 flex-1">
                <button
                  onClick={() => toggleSavingThrow(attr.id)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all flex-shrink-0 flex items-center justify-center ${
                    savingThrows.includes(attr.id) 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'border-dark-border hover:border-blue-500'
                  }`}
                >
                  {savingThrows.includes(attr.id) && (
                    <Shield className="w-4 h-4 text-white" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="font-semibold text-lg">{attr.name}</div>
                  <div className="text-xs text-gray-400">Стоимость: {getCost(attributes[attr.id])} очков</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => decrementAttribute(attr.id)}
                  disabled={!canDecrement(attr.id)}
                  className="w-10 h-10 rounded-lg bg-dark-card border border-dark-border hover:bg-dark-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-xl font-bold"
                >
                  −
                </button>
                
                <div className="text-center min-w-[100px]">
                  <div className="text-3xl font-bold">{attributes[attr.id]}</div>
                  <div className="text-sm text-gray-400">Мод: {getModifier(attributes[attr.id])}</div>
                </div>
                
                <button
                  onClick={() => incrementAttribute(attr.id)}
                  disabled={!canIncrement(attr.id)}
                  className="w-10 h-10 rounded-lg bg-dark-card border border-dark-border hover:bg-dark-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-xl font-bold"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep('basic')}
          className="px-6 py-3 bg-dark-card border border-dark-border rounded-xl font-semibold hover:bg-dark-hover transition-all"
        >
          Назад
        </button>
        <button
          onClick={() => isAttributesValid && setCurrentStep('skills')}
          disabled={!isAttributesValid}
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center gap-2"
        >
          Далее: Навыки
          <Zap className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
};

