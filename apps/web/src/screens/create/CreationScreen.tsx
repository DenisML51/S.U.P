import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../ui/primitives';
import { IconPrev } from '../../ui/icons';
import { SettingScope, useDocumentSetting } from '../../ui/theme/SettingScope';
import { JourneyCreation } from './JourneyCreation';
import { useCreation } from './useCreation';

/** Creating a hero. The screen takes the look of the world chosen for them as soon as it is picked. */
export const CreationScreen: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const creation = useCreation(onDone);
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
      </motion.header>
      <motion.main
        className="min-h-0 flex-1 px-10 pb-8 pt-2"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <JourneyCreation creation={creation} />
      </motion.main>
    </SettingScope>
  );
};
