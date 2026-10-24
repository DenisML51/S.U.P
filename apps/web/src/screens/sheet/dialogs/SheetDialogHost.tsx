import React, { useState } from 'react';
import { LevelUpDialog } from '../../progression/LevelUpDialog';
import { AbilityDialog } from './AbilityDialog';
import { AttackDialog } from './AttackDialog';
import { DiceDialog } from './DiceDialog';
import { ItemDialog } from './ItemDialog';
import { ProfileDialog } from './ProfileDialog';
import { ResourceDialog } from './ResourceDialog';
import { SpellDialog } from './SpellDialog';
import { ArmorDialog, AttributeDialog, LimbDialog } from './StatDialogs';
import { TraitDialog } from './TraitDialog';
import { CurrencyDialog, ExperienceDialog, HealthDialog, SanityDialog } from './VitalDialogs';
import { useSheetDialogs, type EntryKind, type SheetDialog } from './context';

/** The card of one entry, by its kind: shown as a dialog or, inside a pane scope, as the pane. */
export const EntryCard: React.FC<{ kind: EntryKind; open: boolean; id?: string; edit?: boolean; onClose: () => void }> = ({
  kind,
  ...props
}) => {
  switch (kind) {
    case 'attack':
      return <AttackDialog {...props} />;
    case 'ability':
      return <AbilityDialog {...props} />;
    case 'spell':
      return <SpellDialog {...props} />;
    case 'resource':
      return <ResourceDialog {...props} />;
    case 'trait':
      return <TraitDialog {...props} />;
    case 'item':
      return <ItemDialog {...props} />;
  }
};

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
    case 'ability':
    case 'spell':
    case 'resource':
    case 'trait':
    case 'item':
      return <EntryCard key={key} kind={current.kind} open={open} id={current.id} edit={current.edit} onClose={close} />;
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
    case 'limb':
      return <LimbDialog key={key} open={open} id={current.id} onClose={close} />;
    case 'levelUp':
      return <LevelUpDialog key={key} open={open} onClose={close} />;
    case 'dice':
      return <DiceDialog key={key} open={open} onClose={close} />;
    default:
      return null;
  }
};
