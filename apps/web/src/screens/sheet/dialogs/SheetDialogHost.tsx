import React, { useState } from 'react';
import { AbilityDialog } from './AbilityDialog';
import { AttackDialog } from './AttackDialog';
import { ItemDialog } from './ItemDialog';
import { ProfileDialog } from './ProfileDialog';
import { ResourceDialog } from './ResourceDialog';
import { SpellDialog } from './SpellDialog';
import { ArmorDialog, AttributeDialog } from './StatDialogs';
import { TraitDialog } from './TraitDialog';
import { CurrencyDialog, ExperienceDialog, HealthDialog, SanityDialog } from './VitalDialogs';
import { useSheetDialogs, type SheetDialog } from './context';

/**
 * Renders the open sheet dialog. The last dialog stays mounted while it plays its closing
 * animation; every opening gets a fresh instance, so a reopened card starts in its initial state.
 */
export const SheetDialogHost: React.FC = () => {
  const { dialog, close } = useSheetDialogs();
  const [shown, setShown] = useState<{ dialog: SheetDialog; serial: number } | null>(null);
  if (dialog && dialog !== shown?.dialog) setShown({ dialog, serial: (shown?.serial ?? 0) + 1 });
  if (!shown) return null;

  const open = dialog !== null;
  const current = shown.dialog;
  const key = String(shown.serial);
  switch (current.kind) {
    case 'attack':
      return <AttackDialog key={key} open={open} id={current.id} edit={current.edit} onClose={close} />;
    case 'ability':
      return <AbilityDialog key={key} open={open} id={current.id} edit={current.edit} onClose={close} />;
    case 'spell':
      return <SpellDialog key={key} open={open} id={current.id} edit={current.edit} onClose={close} />;
    case 'resource':
      return <ResourceDialog key={key} open={open} id={current.id} edit={current.edit} onClose={close} />;
    case 'trait':
      return <TraitDialog key={key} open={open} id={current.id} edit={current.edit} onClose={close} />;
    case 'item':
      return <ItemDialog key={key} open={open} id={current.id} edit={current.edit} onClose={close} />;
    case 'health':
      return <HealthDialog key={key} open={open} onClose={close} />;
    case 'sanity':
      return <SanityDialog key={key} open={open} onClose={close} />;
    case 'experience':
      return <ExperienceDialog key={key} open={open} onClose={close} />;
    case 'currency':
      return <CurrencyDialog key={key} open={open} onClose={close} />;
    case 'attribute':
      return <AttributeDialog key={key} open={open} id={current.id} onClose={close} />;
    case 'armor':
      return <ArmorDialog key={key} open={open} onClose={close} />;
    case 'profile':
      return <ProfileDialog key={key} open={open} onClose={close} />;
    default:
      return null;
  }
};
