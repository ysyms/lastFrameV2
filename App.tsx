import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Download, RefreshCw, Moon, Sun, Monitor, AlertCircle, FileVideo, CheckCircle2, Globe } from 'lucide-react';
import { DICTIONARY, Language } from './types';

// --- Components ---

const Header = ({ 
  lang, 
  setLang, 
  theme, 
  setTheme 
}: { 
  lang: Language; 
  setLang: (l: Language) => void; 
  theme: 'light' | 'dark' | 'system'; 
  setTheme: (t: 'light' | 'dark' | 'system') => void;
}) => {
  const t = DICTIONARY[lang];
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-gray-200/50 dark:border-gray-800/50 px-6 py-4 flex items-center justify-between transition-all duration-300">
      <div className="flex items-center gap-2">
        <div className="bg-primary-600 p-2 rounded-lg shadow-lg shadow-primary-500/30">
          <FileVideo className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400 dark:from-primary-400 dark:to-primary-200">
          {t.title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-600 dark:text-gray-300"
          title="Switch Language"
        >
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Globe size={18} />
            <span>{lang === 'en' ? 'EN' : '中'}</span>
          </div>
        </button>
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-600 dark:text-gray-300"
        >
          {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
};

// --- Main App ---

export default function App() {
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  // Language State
  const [lang, setLang] = useState<Language>('en');

  // App State
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    dataUrl: string;
    fileName: string;
    width: number;
    height: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize System Settings
  useEffect(() => {
    // Detect Language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.includes('zh')) {
      setLang('zh');
    }

    // Detect Theme
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'system') {
      document.documentElement.classList.toggle('dark', isDark);
    }
  }, []);

  // Update Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', isDark);
    }
  }, [theme]);

  const t = DICTIONARY[lang];

  // Logic: Extract Frame
  const processVideo = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError(t.errorType);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const video = document.createElement('video');
      video.autoplay = false;
      video.muted = true;
      video.src = URL.createObjectURL(file);
      // Important for some browsers to load metadata
      video.load();

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject('Error loading video metadata');
        // Timeout safeguard
        setTimeout(() => reject('Timeout loading metadata'), 10000);
      });

      // Seek to near the end. 
      // Seeking to exactly duration sometimes fails or shows black.
      // We subtract a tiny amount (0.05s) to ensure we hit a valid frame.
      const seekTime = Math.max(0, video.duration - 0.05);
      video.currentTime = seekTime;

      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject('Error seeking video');
        setTimeout(() => reject('Timeout seeking'), 10000);
      });

      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/png');
      
      setResult({
        dataUrl,
        fileName: file.name.replace(/\.[^/.]+$/, "") + "_last_frame.png",
        width: video.videoWidth,
        height: video.videoHeight,
      });

      // Cleanup
      URL.revokeObjectURL(video.src);
      video.remove();
    } catch (err) {
      console.error(err);
      setError(t.errorGeneric);
    } finally {
      setIsProcessing(false);
    }
  }, [t]);

  // Event Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processVideo(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processVideo(e.target.files[0]);
    }
    // Reset value so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.dataUrl;
    link.download = result.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      <Header lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />

      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 pt-24 sm:pt-28">
        <div className="w-full max-w-2xl mx-auto space-y-8">
          
          {/* Intro Text */}
          <div className="text-center space-y-2 mb-8 animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-slate-900 via-primary-700 to-primary-500 dark:from-white dark:via-primary-200 dark:to-primary-400 pb-2">
              {t.title}
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 font-light max-w-md mx-auto">
              {t.subtitle}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
             <div className="glass-panel p-12 rounded-3xl text-center space-y-6 shadow-2xl shadow-primary-500/10 border-primary-100 dark:border-primary-900 animate-pulse">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 border-4 border-primary-100 dark:border-primary-900/30 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                  <FileVideo className="absolute inset-0 m-auto text-primary-600 dark:text-primary-400 w-8 h-8 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{t.processing}</h3>
                  <p className="text-slate-500 dark:text-slate-500 text-sm">Please wait while we parse the video stream...</p>
                </div>
             </div>
          )}

          {/* Success / Result State */}
          {!isProcessing && result && (
            <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl shadow-primary-900/20 dark:shadow-black/50 border-primary-100 dark:border-slate-800 animate-fade-in-up">
              <div className="relative group bg-slate-900 aspect-video flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMWgydjJIMUMxem00IDBoMnYySDV6bTQgMGgydjJIOXptNCAwaDJ2MmgxM3ptNCAwaDJ2MmgtMXoiIGZpbGw9IiMzMzMiIGZpbGwtb3BhY2l0eT0iLjEiLz48L3N2Zz4=')] opacity-20"></div>
                <img 
                  src={result.dataUrl} 
                  alt="Extracted Frame" 
                  className="max-w-full max-h-full object-contain shadow-lg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <p className="text-white font-medium">{t.imageSize}: {result.width} x {result.height}</p>
                </div>
              </div>
              
              <div className="p-6 md:p-8 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="font-semibold">{t.success}</span>
                </div>
                
                <div className="flex w-full sm:w-auto gap-3">
                  <button
                    onClick={() => setResult(null)}
                    className="flex-1 sm:flex-none py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>{t.reset}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex-1 sm:flex-none py-3 px-6 rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/30 transition-all transform active:scale-95 flex items-center justify-center gap-2 font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t.download}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Upload State (Default) */}
          {!isProcessing && !result && (
            <div 
              className={`
                relative group cursor-pointer
                glass-panel rounded-3xl p-10 md:p-16
                border-2 border-dashed transition-all duration-300
                flex flex-col items-center justify-center text-center space-y-6
                ${isDragging 
                  ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10 scale-[1.02]' 
                  : 'border-slate-300 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-white/40 dark:hover:bg-slate-800/40'
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="video/*"
                onChange={handleFileSelect}
              />
              
              <div className={`
                p-6 rounded-2xl transition-all duration-300
                ${isDragging ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-500 dark:group-hover:bg-slate-700 dark:group-hover:text-primary-400'}
              `}>
                <Upload className="w-10 h-10 md:w-12 md:h-12" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl md:text-2xl font-bold text-slate-700 dark:text-slate-200">
                  {t.dropText}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  {t.dropSubText}
                </p>
              </div>

              <button className="py-2.5 px-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:shadow-md transition-all">
                {t.browse}
              </button>
            </div>
          )}

        </div>
      </main>

      <footer className="py-8 text-center text-slate-400 dark:text-slate-600 text-sm">
        <p className="flex items-center justify-center gap-2">
          <Monitor className="w-4 h-4" />
          {t.footer}
        </p>
      </footer>
    </div>
  );
}