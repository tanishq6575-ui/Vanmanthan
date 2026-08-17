import React, { useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2, Cpu } from 'lucide-react';

export default function UploadPanel({ selectedFiles, setSelectedFiles, onStartProcessing, isProcessing }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-emerald-400" />
            Camera-Trap Image Upload
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload single or bulk camera trap photos (.jpg, .webp, .png, .tiff, .bmp)
          </p>
        </div>
        {selectedFiles.length > 0 && (
          <span className="text-xs px-3 py-1 font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Selected images: {selectedFiles.length}
          </span>
        )}
      </div>

      {/* Drag & Drop Box */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-950/50 hover:bg-emerald-950/10 rounded-xl p-8 text-center cursor-pointer transition-all duration-200 group"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="image/jpeg,image/webp,image/png,image/tiff,image/bmp"
          className="hidden"
        />
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <ImageIcon className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-slate-200">
          Drag and drop camera-trap images here, or <span className="text-emerald-400 font-semibold underline underline-offset-4">browse files</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Supports multi-image batch upload for reserve field monitoring
        </p>
      </div>

      {/* Controls */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={() => setSelectedFiles([])}
            disabled={isProcessing}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium px-3 py-2 rounded-lg hover:bg-rose-950/30 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Clear selection
          </button>
          
          <button
            onClick={onStartProcessing}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Cpu className="w-4 h-4" />
            {isProcessing ? 'Analyzing Species...' : `Run Species Identification (${selectedFiles.length})`}
          </button>
        </div>
      )}
    </div>
  );
}
