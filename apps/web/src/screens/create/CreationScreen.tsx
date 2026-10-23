import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Segmented } from '../../ui/forms';
import { Button } from '../../ui/primitives';
import { IconPrev } from '../../ui/icons';
import { SettingScope, useDocumentSetting } from '../../ui/theme/SettingScope';
import { BlankSheetCreation } from './BlankSheetCreation';
import { ChronicleCreation } from './ChronicleCreation';
import { JourneyCreation } from './JourneyCreation';
import { useCreation } from './useCreation';

type Variant = 'chronicle' | 'sheet' | 'journey';

/**
 * Creating a hero. Three prototypes of the same flow share one state, so switching between them
 * keeps every choice made: compare them on the same hero and keep the one that feels right.
 */
export const CreationScreen: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const creation = useCreation(onDone);
  const [variant, setVariant] = useState<Variant>('chronicle');
  useDocumentSetting(creation.setting);

  return (
    <SettingScope
      setting={creation.setting}
      className="ui-morph flex h-screen flex-col overflow-hidden bg-bg"
    >
      <motion.header
        className="flex items-center gap-6 px-10 pb-4 pt-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Button variant="ghost" size="sm" icon={<IconPrev width={16} height={16} />} onClick={onDone}>
          Герои
        </Button>
        <h1 className="ui-display ui-title text-2xl text-frame-bright">Новый герой</h1>
        <Segmented
          className="ml-auto"
          label="Вариант создания"
          value={variant}
          onChange={setVariant}
          options={[
            { value: 'chronicle', label: 'А · Летопись' },
            { value: 'sheet', label: 'Б · Чистый лист' },
            { value: 'journey', label: 'В · Путь героя' },
          ]}
        />
      </motion.header>
      <motion.main
        key={variant}
        className="min-h-0 flex-1 px-10 pb-8 pt-2"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {variant === 'chronicle' && <ChronicleCreation creation={creation} />}
        {variant === 'sheet' && <BlankSheetCreation creation={creation} />}
        {variant === 'journey' && <JourneyCreation creation={creation} />}
      </motion.main>
    </SettingScope>
  );
};
