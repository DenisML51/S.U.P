import React, { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { api, assetUrl } from '../data/api/client';
import { ImageCropDialog, type CropFrame } from './ImageCropDialog';
import { cx } from './primitives';

/** Shape each picture is cut to: a full-length art stands, a portrait is square. */
const FRAMES: Record<'full' | 'portrait', CropFrame> = {
  full: { aspect: 2 / 3, maxSide: 1600 },
  portrait: { aspect: 1, maxSide: 640 },
};

/** An image slot: the current picture, a click to pick another and frame it, a link to remove it. */
export const ImageSlot: React.FC<{
  label: string;
  hint: string;
  kind: 'full' | 'portrait';
  /** Uploaded asset shown in the slot; the slot shows only its own picture, never a fallback. */
  asset?: string;
  onUploaded: (id: string | undefined) => void;
  className?: string;
}> = ({ label, hint, kind, asset, onUploaded, className }) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const dropPicked = () => {
    if (picked) URL.revokeObjectURL(picked);
    setPicked(null);
  };
  const upload = async (image: Blob) => {
    dropPicked();
    setBusy(true);
    try {
      const asset = await api.assets.upload(image);
      onUploaded(asset.id);
    } catch {
      toast.error('Не удалось загрузить изображение');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between">
        <span className="ui-label !mb-0">{label}</span>
        {asset && (
          <button
            type="button"
            className="text-xs text-ink-faint hover:text-danger"
            onClick={() => onUploaded(undefined)}
          >
            убрать
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="ui-image-slot group relative min-h-0 flex-1 overflow-hidden"
        title={hint}
        disabled={busy}
      >
        {asset ? (
          <img
            src={assetUrl(asset)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: '50% 20%' }}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center p-3 text-center text-xs text-ink-faint">
            {hint}
          </span>
        )}
        <span className="ui-image-slot__veil">{busy ? 'Загрузка…' : asset ? 'Заменить' : 'Загрузить'}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) setPicked(URL.createObjectURL(file));
        }}
      />
      <ImageCropDialog
        key={picked ?? ''}
        source={picked}
        title={label}
        frame={FRAMES[kind]}
        onCancel={dropPicked}
        onCropped={(image) => void upload(image)}
      />
    </div>
  );
};
