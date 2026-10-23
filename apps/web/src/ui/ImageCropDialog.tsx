import React, { useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Dialog } from './Dialog';
import { Button } from './primitives';

export interface CropFrame {
  /** Width to height of the result: 2 / 3 for a full-length art, 1 for a portrait. */
  aspect: number;
  /** Longest side of the saved picture, in pixels. */
  maxSide: number;
}

/** Cuts the chosen area out of the picture and scales it down to the frame's size. */
async function cropImage(source: string, area: Area, frame: CropFrame): Promise<Blob> {
  const image = new Image();
  image.src = source;
  await image.decode();
  const scale = Math.min(1, frame.maxSide / Math.max(area.width, area.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(area.width * scale);
  canvas.height = Math.round(area.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed'))), 'image/webp', 0.9),
  );
}

/**
 * Framing an uploaded picture before it is saved: drag to move, scroll or the slider to zoom. The
 * frame has the shape the picture is shown in, so what is seen here is what the sheet shows.
 */
export const ImageCropDialog: React.FC<{
  /** Object URL of the picked file; the dialog is open while it is set. */
  source: string | null;
  title: string;
  frame: CropFrame;
  onCancel: () => void;
  onCropped: (image: Blob) => void;
}> = ({ source, title, frame, onCancel, onCropped }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    if (!source || !area) return;
    setBusy(true);
    try {
      onCropped(await cropImage(source, area, frame));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={!!source}
      onClose={onCancel}
      eyebrow="Кадрирование"
      title={title}
      width="lg"
      footerStart={
        <span className="text-xs text-ink-faint">Перетащите, чтобы сдвинуть · колесо — масштаб</span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
          <Button variant="primary" disabled={!area || busy} onClick={() => void apply()} data-autofocus>
            {busy ? 'Сохраняю…' : 'Применить'}
          </Button>
        </>
      }
    >
      <div className="ui-crop relative h-[26rem] overflow-hidden">
        {source && (
          <Cropper
            image={source}
            crop={crop}
            zoom={zoom}
            minZoom={1}
            maxZoom={4}
            aspect={frame.aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)}
            showGrid={false}
            classes={{ cropAreaClassName: 'ui-crop__area' }}
          />
        )}
      </div>
      <label className="mt-4 flex items-center gap-4 text-sm text-ink-muted">
        Масштаб
        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="ui-range flex-1"
          aria-label="Масштаб"
        />
      </label>
    </Dialog>
  );
};
