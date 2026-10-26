import React, { useState } from 'react';
import type { PartyDto } from '@itd/schema';
import { usePartyStore } from '../../store/usePartyStore';
import { Dialog } from '../../ui/Dialog';
import { MarkdownField } from '../../ui/forms';
import { Button } from '../../ui/primitives';

/**
 * The master's own notes for the table: the plot, who is who, what is behind the door. Unlike the
 * chronicle, the players never get them — the server sends them to the master alone.
 */
export const MasterNotesDialog: React.FC<{ open: boolean; party: PartyDto; onClose: () => void }> = ({
  open,
  party,
  onClose,
}) => {
  const update = usePartyStore((s) => s.update);
  const [text, setText] = useState(party.masterNotes ?? '');
  const [busy, setBusy] = useState(false);
  const changed = text.trim() !== (party.masterNotes ?? '').trim();

  const save = async () => {
    setBusy(true);
    const saved = await update(party.id, { masterNotes: text });
    setBusy(false);
    if (saved) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      setting={party.setting}
      variant="paper"
      width="xl"
      eyebrow="Заметки мастера · видите только вы"
      title={party.name}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {changed ? 'Отмена' : 'Закрыть'}
          </Button>
          <Button variant="primary" disabled={!changed || busy} onClick={() => void save()}>
            Сохранить
          </Button>
        </>
      }
    >
      {/* Room above for the field's own "Текст / Просмотр" switch. */}
      <div className="pt-7">
        <MarkdownField
          value={text}
          onChange={setText}
          rows={16}
          placeholder="Сюжет, тайны, кто есть кто, что за дверью — игрокам это не уходит"
        />
      </div>
    </Dialog>
  );
};
