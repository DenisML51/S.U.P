import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { ATTRIBUTES_LIST } from '../../../types';
import { useI18n } from '../../../i18n/I18nProvider';
import { getAttributeLabel } from '../../../i18n/domainLabels';

interface CoreStatsStepProps {
  pointsUsed: number;
  pointsRemaining: number;
  attributes: Record<string, number>;
  savingThrows: string[];
  speed: number;
  setSpeed: (value: number) => void;
  toggleSavingThrow: (attrId: string) => void;
  decrementAttribute: (attrId: string) => void;
  canDecrement: (attrId: string) => boolean;
  incrementAttribute: (attrId: string) => void;
  canIncrement: (attrId: string) => boolean;
  getModifier: (value: number) => string;
  getCost: (value: number) => number;
}

export const CoreStatsStep: React.FC<CoreStatsStepProps> = ({
  pointsUsed,
  pointsRemaining,
  attributes,
  savingThrows,
  speed,
  setSpeed,
  toggleSavingThrow,
  decrementAttribute,
  canDecrement,
  incrementAttribute,
  canIncrement,
  getModifier,
  getCost,
}) => {
  const { t } = useI18n();

  return (
    <motion.section
      key="coreStats"
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 14 }}
      className="space-y-4"
    >
      <div className="rounded-2xl bg-gradient-to-br from-blue-500/[0.08] via-violet-500/[0.03] to-transparent p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-400">{t('creation.attributePoints')}</div>
          <div className="text-lg font-semibold mt-1">
            {pointsUsed} / 27
          </div>
        </div>
        <div
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            pointsRemaining === 0
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-amber-500/15 text-amber-300'
          }`}
        >
          {pointsRemaining === 0 ? t('creation.ready') : `${t('creation.remaining')}: ${pointsRemaining}`}
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-violet-500/[0.08] via-blue-500/[0.03] to-transparent p-5 space-y-2">
        {ATTRIBUTES_LIST.map((attr) => (
          <div
            key={attr.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-black/35 p-3"
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleSavingThrow(attr.id)}
                className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors ${
                  savingThrows.includes(attr.id)
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'border-white/20 text-gray-500 hover:border-blue-500'
                }`}
              >
                <Shield className="w-4 h-4" />
              </button>
              <div>
                <div className="font-semibold text-sm">{getAttributeLabel(attr.id, t)}</div>
                <div className="text-xs text-gray-400">
                  {t('creation.cost')}: {getCost(attributes[attr.id])}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => decrementAttribute(attr.id)}
                disabled={!canDecrement(attr.id)}
                className="w-8 h-8 rounded-lg bg-black/40 disabled:opacity-40"
              >
                -
              </button>
              <div className="min-w-[78px] text-center">
                <div className="text-xl font-bold">{attributes[attr.id]}</div>
                <div className="text-xs text-gray-400">{getModifier(attributes[attr.id])}</div>
              </div>
              <button
                type="button"
                onClick={() => incrementAttribute(attr.id)}
                disabled={!canIncrement(attr.id)}
                className="w-8 h-8 rounded-lg bg-black/40 disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-blue-500/[0.08] via-violet-500/[0.03] to-transparent p-5">
        <label className="block text-sm font-semibold mb-3 text-gray-300">{t('creation.speed')}</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSpeed(Math.max(0, speed - 5))}
            className="w-10 h-10 rounded-xl bg-black/45"
          >
            -
          </button>
          <input
            value={speed}
            onChange={(e) => setSpeed(Number.parseInt(e.target.value, 10) || 0)}
            type="number"
            className="flex-1 rounded-xl bg-black/50 px-4 py-2 text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setSpeed(speed + 5)}
            className="w-10 h-10 rounded-xl bg-black/45"
          >
            +
          </button>
        </div>
      </div>
    </motion.section>
  );
};
