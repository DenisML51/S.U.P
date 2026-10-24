import React, { useRef, useState } from 'react';
import { Dialog } from './Dialog';
import { Segmented } from './forms';
import { Button } from './primitives';

export type CropPreset = 'portrait' | 'full' | 'cover';

/** Frames to cut a picture to: the shape it is shown in and the largest side worth keeping. */
const PRESETS: Record<CropPreset, { label: string; aspect: number; maxSide: number }> = {
  portrait: { label: 'Портрет · 1:1', aspect: 1, maxSide: 640 },
  full: { label: 'Арт карточки · 2:3', aspect: 2 / 3, maxSide: 1600 },
  cover: { label: 'Обложка · 16:9', aspect: 16 / 9, maxSide: 1920 },
};

/** The frame as fractions of the picture, so it stays put whatever size the picture is drawn at. */
interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Corner = 'nw' | 'ne' | 'sw' | 'se';
const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];
/** Smallest frame side, in screen pixels. */
const MIN_SIDE = 48;

/** The largest frame of the given shape that fits the picture, centred, with a margin. */
function fitFrame(aspect: number, width: number, height: number): Frame {
  let w = width * 0.9;
  let h = w / aspect;
  if (h > height * 0.9) {
    h = height * 0.9;
    w = h * aspect;
  }
  return { x: (width - w) / 2 / width, y: (height - h) / 2 / height, w: w / width, h: h / height };
}

/** Cuts the frame out of the picture and scales it down to the preset's size. */
async function cropImage(image: HTMLImageElement, frame: Frame, maxSide: number): Promise<Blob> {
  const sx = frame.x * image.naturalWidth;
  const sy = frame.y * image.naturalHeight;
  const sw = frame.w * image.naturalWidth;
  const sh = frame.h * image.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed'))), 'image/webp', 0.9),
  );
}

/**
 * Framing an uploaded picture before it is saved. The frame is dragged by its middle and resized by
 * its corners, keeping the shape of the chosen preset: a square portrait or a standing card art.
 */
export const ImageCropDialog: React.FC<{
  /** Object URL of the picked file; the dialog is open while it is set. */
  source: string | null;
  title: string;
  /** Shape the frame starts in: the one of the slot the picture was picked for. */
  preset: CropPreset;
  onCancel: () => void;
  onCropped: (image: Blob) => void;
}> = ({ source, title, preset: initialPreset, onCancel, onCropped }) => {
  const image = useRef<HTMLImageElement>(null);
  const [preset, setPreset] = useState(initialPreset);
  // A cover is always wide; a hero's picture is either of the hero shapes.
  const shapes: CropPreset[] = initialPreset === 'cover' ? ['cover'] : ['portrait', 'full'];
  const [frame, setFrame] = useState<Frame | null>(null);
  const [busy, setBusy] = useState(false);

  /** Refits the frame to a shape; picture size is read on screen, the frame is kept in fractions. */
  const refit = (next: CropPreset) => {
    const box = image.current?.getBoundingClientRect();
    if (box && box.width > 0) setFrame(fitFrame(PRESETS[next].aspect, box.width, box.height));
  };

  /** Drags the frame (from its middle) or one of its corners, the opposite corner staying put. */
  const startDrag = (event: React.PointerEvent, corner?: Corner) => {
    const box = image.current?.getBoundingClientRect();
    if (!box || !frame) return;
    event.preventDefault();
    event.stopPropagation();
    const W = box.width;
    const H = box.height;
    const aspect = PRESETS[preset].aspect;
    const start = {
      px: event.clientX,
      py: event.clientY,
      x: frame.x * W,
      y: frame.y * H,
      w: frame.w * W,
      h: frame.h * H,
    };
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    const move = (e: PointerEvent) => {
      const dx = e.clientX - start.px;
      const dy = e.clientY - start.py;
      let { x, y, w, h } = start;
      if (!corner) {
        x = Math.max(0, Math.min(W - w, x + dx));
        y = Math.max(0, Math.min(H - h, y + dy));
      } else {
        const east = corner.endsWith('e');
        const south = corner.startsWith('s');
        // The fixed corner and the room left from it to the picture's edges.
        const ax = east ? start.x : start.x + start.w;
        const ay = south ? start.y : start.y + start.h;
        const roomW = east ? W - ax : ax;
        const roomH = south ? H - ay : ay;
        const wantW = Math.abs((east ? start.x + start.w + dx : start.x + dx) - ax);
        const wantH = Math.abs((south ? start.y + start.h + dy : start.y + dy) - ay);
        w = Math.max(wantW, wantH * aspect);
        w = Math.min(w, roomW, roomH * aspect);
        w = Math.max(w, Math.min(MIN_SIDE * Math.max(1, aspect), roomW));
        h = w / aspect;
        x = east ? ax : ax - w;
        y = south ? ay : ay - h;
      }
      setFrame({ x: x / W, y: y / H, w: w / W, h: h / H });
    };
    const stop = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', stop);
      target.removeEventListener('pointercancel', stop);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', stop);
    target.addEventListener('pointercancel', stop);
  };

  const apply = async () => {
    if (!image.current || !frame) return;
    setBusy(true);
    try {
      onCropped(await cropImage(image.current, frame, PRESETS[preset].maxSide));
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
        shapes.length > 1 ? (
          <Segmented
            label="Форма рамки"
            value={preset}
            onChange={(next) => {
              setPreset(next);
              refit(next);
            }}
            options={shapes.map((id) => ({
              value: id,
              label: PRESETS[id].label,
            }))}
          />
        ) : (
          <span className="text-sm text-ink-faint">{PRESETS[preset].label}</span>
        )
      }
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
          <Button variant="primary" disabled={!frame || busy} onClick={() => void apply()} data-autofocus>
            {busy ? 'Сохраняю…' : 'Применить'}
          </Button>
        </>
      }
    >
      <div className="ui-crop grid h-[28rem] place-items-center p-4">
        {source && (
          <div className="relative max-h-full max-w-full select-none overflow-hidden">
            <img
              ref={image}
              src={source}
              alt=""
              draggable={false}
              onLoad={() => refit(preset)}
              className="block max-h-[calc(28rem-2rem)] max-w-full"
            />
            {frame && (
              <div
                className="ui-crop__frame"
                style={{
                  left: `${frame.x * 100}%`,
                  top: `${frame.y * 100}%`,
                  width: `${frame.w * 100}%`,
                  height: `${frame.h * 100}%`,
                }}
                onPointerDown={(e) => startDrag(e)}
              >
                {CORNERS.map((corner) => (
                  <span
                    key={corner}
                    className={`ui-crop__corner ui-crop__corner--${corner}`}
                    onPointerDown={(e) => startDrag(e, corner)}
                    aria-hidden
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-ink-faint">
        Перетащите рамку, чтобы сдвинуть · тяните за уголки, чтобы изменить размер
      </p>
    </Dialog>
  );
};
