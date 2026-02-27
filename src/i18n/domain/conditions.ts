import { TranslateFn } from './shared';

export const getConditionName = (conditionId: string, fallback: string, t: TranslateFn): string => {
  const localized = t(`condition.${conditionId}.name`);
  return localized === `condition.${conditionId}.name` ? fallback : localized;
};

export const getConditionDescription = (conditionId: string, fallback: string, t: TranslateFn): string => {
  const localized = t(`condition.${conditionId}.description`);
  return localized === `condition.${conditionId}.description` ? fallback : localized;
};
