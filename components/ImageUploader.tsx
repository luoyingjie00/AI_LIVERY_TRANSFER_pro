import React, { useRef } from 'react';
import { UploadCloudIcon, ImageIcon } from './Icons';

interface ImageUploaderProps {
  label: string;
  subLabel: string;
  description: string;
  previewUrl: string | null;
  onImageSelect: (file: File) => void;
  id: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ label, subLabel, description, previewUrl, onImageSelect, id }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  const handleBoxClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-full font-mono">
      <div className="flex justify-between items-baseline mb-2 px-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{subLabel}</label>
        <span className="font-bold text-sm text-white">{label}</span>
      </div>
      
      <div 
        onClick={handleBoxClick}
        className={`
          relative flex-1 flex flex-col items-center justify-center w-full rounded-xl border 
          transition-all duration-300 cursor-pointer overflow-hidden group min-h-[140px]
          ${previewUrl 
            ? 'border-neutral-600 bg-black/40' 
            : 'border-dashed border-neutral-700 bg-black/20 hover:border-white hover:bg-neutral-900'
          }
        `}
      >
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange}
          id={id}
        />
        
        {previewUrl ? (
          <div className="relative w-full h-full">
            <img 
              src={previewUrl} 
              alt={`${label} preview`} 
              className="w-full h-full object-contain p-2"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
               <div className="opacity-0 group-hover:opacity-100 bg-white text-black px-4 py-2 rounded text-[10px] font-mono flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all font-bold uppercase">
                 <UploadCloudIcon className="w-3 h-3" />
                 替换 / REPLACE
               </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-4 flex flex-col items-center">
            <div className="w-10 h-10 mb-2 rounded-full bg-neutral-800 flex items-center justify-center group-hover:bg-neutral-700 group-hover:scale-110 transition-all">
              <ImageIcon className="w-4 h-4 text-neutral-400 group-hover:text-white" />
            </div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wide max-w-[140px] leading-tight font-bold">{description}</p>
          </div>
        )}
        
        {/* Tiny tech markers */}
        <div className="absolute top-2 left-2 w-1 h-1 bg-neutral-600 rounded-full opacity-50"></div>
        <div className="absolute top-2 right-2 w-1 h-1 bg-neutral-600 rounded-full opacity-50"></div>
        <div className="absolute bottom-2 left-2 w-1 h-1 bg-neutral-600 rounded-full opacity-50"></div>
        <div className="absolute bottom-2 right-2 w-1 h-1 bg-neutral-600 rounded-full opacity-50"></div>
      </div>
    </div>
  );
};

export default ImageUploader;