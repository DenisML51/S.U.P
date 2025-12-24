import React, { useState, useRef } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, Crop, PixelCrop, type Size } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Check, Image as ImageIcon } from 'lucide-react';

interface AvatarUploadProps {
  currentAvatar?: string;
  onAvatarChange: (base64: string) => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({ currentAvatar, onAvatarChange }) => {
  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [showCropper, setShowCropper] = useState(false);

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); // Makes crop preview update correctly
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setShowCropper(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }

  async function createCroppedImage() {
    if (completedCrop && imgRef.current) {
      const base64 = await getCroppedImg(imgRef.current, completedCrop);
      onAvatarChange(base64);
      setShowCropper(false);
      setImgSrc('');
    }
  }

  return (
    <div className="relative group/avatar-container">
      <div className="w-24 h-24 rounded-2xl bg-dark-bg border border-dark-border flex items-center justify-center shadow-inner overflow-hidden relative">
        {currentAvatar ? (
          <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover group-hover/avatar-container:scale-110 transition-transform" />
        ) : (
          <ImageIcon className="w-12 h-12 text-blue-400 opacity-50 group-hover/avatar-container:scale-110 transition-transform" />
        )}
        
        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar-container:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer z-10">
          <Upload className="w-6 h-6 text-white mb-1" />
          <span className="text-[8px] font-black uppercase tracking-widest text-white">Изменить</span>
          <input type="file" accept="image/*" className="hidden" onChange={onSelectFile} />
        </label>
      </div>

      <AnimatePresence>
        {showCropper && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowCropper(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-card border border-dark-border rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-dark-border flex justify-between items-center bg-dark-card/50">
                <h3 className="text-lg font-bold text-white">Редактор фото</h3>
                <button onClick={() => setShowCropper(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="relative bg-black flex justify-center items-center overflow-auto max-h-[60vh] p-4">
                {!!imgSrc && (
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={1}
                    className="max-w-full"
                  >
                    <img
                      ref={imgRef}
                      alt="Crop me"
                      src={imgSrc}
                      style={{ maxHeight: '50vh' }}
                      onLoad={onImageLoad}
                    />
                  </ReactCrop>
                )}
              </div>

              <div className="p-6 space-y-4">
                <p className="text-[10px] text-center text-gray-500 uppercase font-bold tracking-widest leading-relaxed">
                  Тяните за углы рамки для изменения размера • Перемещайте рамку мышкой
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCropper(false)}
                    className="flex-1 py-3 bg-dark-bg border border-dark-border rounded-xl font-bold text-gray-400 hover:text-white transition-all text-sm"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={createCroppedImage}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:shadow-lg hover:shadow-blue-500/20 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Check className="w-4 h-4" />
                    Применить
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper function to crop image
async function getCroppedImg(image: HTMLImageElement, crop: PixelCrop): Promise<string> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return canvas.toDataURL('image/jpeg');
}
