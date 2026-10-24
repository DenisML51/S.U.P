import React from 'react';
import type { PartyDto } from '@itd/schema';
import { Dialog } from '../../ui/Dialog';
import { IconEdit } from '../../ui/icons';
import { Button } from '../../ui/primitives';
import { Prose } from '../../ui/Prose';

/** The party's chronicle, as the master wrote it: read on paper by everyone at the table. */
export const LoreDialog: React.FC<{
  open: boolean;
  party: PartyDto;
  onClose: () => void;
  /** The master goes to write or amend it. */
  onEdit?: () => void;
}> = ({ open, party, onClose, onEdit }) => (
  <Dialog
    open={open}
    onClose={onClose}
    setting={party.setting}
    variant="paper"
    width="xl"
    eyebrow="Летопись"
    title={party.name}
    footerStart={
      onEdit && (
        <Button variant="secondary" icon={<IconEdit width={15} height={15} />} onClick={onEdit}>
          Править
        </Button>
      )
    }
    footer={
      <Button variant="primary" onClick={onClose}>
        Закрыть
      </Button>
    }
  >
    <div className="pt-1">
      {party.lore ? (
        <Prose className="text-[15px]">{party.lore}</Prose>
      ) : (
        <p className="py-6 text-center text-[15px] opacity-70">
          {onEdit ? 'Летопись ещё пуста — расскажите игрокам, куда они попали.' : 'Мастер ещё не записал летопись этого стола.'}
        </p>
      )}
    </div>
  </Dialog>
);
