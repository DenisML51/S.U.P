import React, { useState } from 'react';
import type { InvitePreviewDto } from '@itd/schema';
import { plural } from '../../i18n';
import { usePartyStore } from '../../store/usePartyStore';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/primitives';
import { SETTING_INFO } from '../../ui/theme/settings';
import { PartyCover } from './PartyCover';

const seats = (count: number) => `${count} ${plural(count, 'участник', 'участника', 'участников')}`;

/** An invitation read from a code: the table's world, its cover and who runs it, before taking a seat. */
export const InviteDialog: React.FC<{
  invite: { code: string; preview: InvitePreviewDto } | null;
  onClose: () => void;
  onEntered: (partyId: string) => void;
}> = ({ invite, onClose, onEntered }) => {
  const join = usePartyStore((s) => s.join);
  const [busy, setBusy] = useState(false);
  const preview = invite?.preview;

  const enter = async () => {
    if (!invite) return;
    if (invite.preview.member) return onEntered(invite.preview.partyId);
    setBusy(true);
    const partyId = await join(invite.code);
    setBusy(false);
    if (partyId) onEntered(partyId);
  };

  return (
    <Dialog
      open={!!invite}
      onClose={onClose}
      setting={preview?.setting}
      width="lg"
      eyebrow={preview ? `Приглашение · ${SETTING_INFO[preview.setting].label}` : 'Приглашение'}
      title={preview?.name ?? ''}
      subtitle={preview && `Мастер ${preview.masterName} · ${seats(preview.memberCount)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Не сейчас
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => void enter()} data-autofocus>
            {preview?.member ? 'Открыть партию' : 'Войти в мир'}
          </Button>
        </>
      }
    >
      {preview && (
        <div className="space-y-4 pt-1">
          <PartyCover assetId={preview.coverAssetId} setting={preview.setting} className="aspect-[21/9] w-full" />
          {preview.description ? (
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-muted">{preview.description}</p>
          ) : (
            <p className="text-[15px] text-ink-faint">Мастер ещё не рассказал, что ждёт за этим столом.</p>
          )}
          {preview.member && <p className="text-sm text-frame-bright">Вы уже за этим столом.</p>}
        </div>
      )}
    </Dialog>
  );
};
