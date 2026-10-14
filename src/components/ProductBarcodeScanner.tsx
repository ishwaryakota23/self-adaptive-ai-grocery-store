import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, AlertTriangle, Volume2, CheckCircle2, Scan, Sparkles } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';
import jsQR from 'jsqr';

interface ProductBarcodeScannerProps {
  onScan: (barcode: string) => void;
  isActive?: boolean;
  title?: string;
  subtitle?: string;
}

export const ProductBarcodeScanner: React.FC<ProductBarcodeScannerProps> = ({
  onScan,
  isActive = true,
  title = 'Optical Barcode & SKU Scanner',
  subtitle = 'Hold product barcode steadily within the scanner reticle'
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScannedTimeRef = useRef<{ barcode: string; time: number }>({ barcode: '', time: 0 });
  const scanTimerRef = useRef<any>(null);

  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [cameraLoading, setCameraLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastDetectedBarcode, setLastDetectedBarcode] = useState<string | null>(null);
  const [scanPulse, setScanPulse] = useState(false);

  // Optical scanner audio tone generator (Web Audio API)
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1850, ctx.currentTime); // Standard POS scanner beep frequency

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  const triggerScan = (barcode: string) => {
    const text = barcode.trim();
    if (!text) return;
    const now = Date.now();
    if (lastScannedTimeRef.current.barcode === text && now - lastScannedTimeRef.current.time < 1200) {
      return;
    }
    lastScannedTimeRef.current = { barcode: text, time: now };
    setLastDetectedBarcode(text);
    setScanPulse(true);
    playBeep();
    setTimeout(() => {
      setScanPulse(false);
    }, 600);
    onScan(text);
  };

  useEffect(() => {
    if (!isActive) return;

    let isMounted = true;
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    let nativeDetector: any = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        nativeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code']
        });
      } catch (e) {
        console.warn('[ProductBarcodeScanner] Native BarcodeDetector note:', e);
      }
    }

    const offscreenCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    const offscreenCtx = offscreenCanvas?.getContext('2d', { willReadFrequently: true });

    async function initCamera() {
      setCameraLoading(true);
      setCameraError(null);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (isMounted) {
            setHasCamera(false);
            setCameraLoading(false);
            setCameraError('Webcam API is not accessible in this environment. Use quick scan presets below.');
          }
          return;
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setHasCamera(true);
        setCameraLoading(false);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('autoplay', 'true');
          videoRef.current.muted = true;
          await videoRef.current.play().catch(() => {});
        }

        // Active Optical Scanning Loop
        const processBarcodeFrame = async () => {
          if (!isMounted) return;
          const video = videoRef.current;

          if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
            scanTimerRef.current = setTimeout(processBarcodeFrame, 80);
            return;
          }

          let detectedBarcode: string | null = null;

          // 1. Native Chromium BarcodeDetector (EAN-13, UPC, Code 128, QR)
          if (nativeDetector) {
            try {
              const barcodes = await nativeDetector.detect(video);
              if (barcodes && barcodes.length > 0) {
                const raw = barcodes[0].rawValue?.trim();
                if (raw) detectedBarcode = raw;
              }
            } catch {}
          }

          // 2. ZXing frame decode fallback
          if (!detectedBarcode) {
            try {
              const result = codeReader.decode(video);
              if (result && result.getText()) {
                detectedBarcode = result.getText().trim();
              }
            } catch {}
          }

          // 3. jsQR fallback (for QR session codes)
          if (!detectedBarcode && offscreenCanvas && offscreenCtx) {
            try {
              offscreenCanvas.width = video.videoWidth;
              offscreenCanvas.height = video.videoHeight;
              offscreenCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
              const imgData = offscreenCtx.getImageData(0, 0, video.videoWidth, video.videoHeight);
              const qr = jsQR(imgData.data, video.videoWidth, video.videoHeight, {
                inversionAttempts: 'attemptBoth'
              });
              if (qr && qr.data && qr.data.trim()) {
                detectedBarcode = qr.data.trim();
              }
            } catch {}
          }

          if (detectedBarcode && isMounted) {
            triggerScan(detectedBarcode);
          }

          if (isMounted) {
            scanTimerRef.current = setTimeout(processBarcodeFrame, 80);
          }
        };

        scanTimerRef.current = setTimeout(processBarcodeFrame, 250);
      } catch (err: any) {
        if (isMounted) {
          console.warn('[ProductBarcodeScanner] Camera stream initialization notice:', err);
          setHasCamera(false);
          setCameraLoading(false);
          setCameraError(
            err?.name === 'NotAllowedError'
              ? 'Webcam permission blocked in browser settings. You can use manual entry or quick-scan chips below.'
              : 'Webcam device currently busy or inaccessible. Use quick-scan chips below.'
          );
        }
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      try {
        codeReader.reset();
      } catch {}
    };
  }, [isActive]);

  return (
    <div className="relative w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl space-y-0">
      {/* Scanner Header bar */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${hasCamera ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
          <span className="font-bold text-white flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>{title}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <Volume2 className="w-3 h-3 text-emerald-400" />
          <span>Optical Audio Beeper Active</span>
        </div>
      </div>

      {/* Video Viewfinder Area (Video element is ALWAYS in DOM so srcObject connects reliably) */}
      <div className="relative aspect-video max-h-56 sm:max-h-64 w-full bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Overlay if camera is loading or permission blocked */}
        {!hasCamera && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-2 z-10">
            <Camera className="w-10 h-10 text-slate-500 mx-auto animate-pulse" />
            <p className="text-xs text-slate-300 font-medium max-w-xs mx-auto">
              {cameraLoading ? 'Initializing high-speed barcode sensor...' : cameraError}
            </p>
            <span className="text-[10px] text-emerald-400/80 font-mono">
              Live Edge Barcode Decoder Ready
            </span>
          </div>
        )}

        {/* Viewfinder Target Reticle */}
        <div
          className={`absolute inset-6 sm:inset-10 border-2 rounded-xl pointer-events-none transition-all flex flex-col justify-between p-2.5 z-20 ${
            scanPulse
              ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_30px_rgba(52,211,153,0.5)]'
              : 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
          }`}
        >
          {/* Animated Laser Scanning Beam */}
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#34d399] animate-pulse" />

          {/* Subtitle / HUD prompt */}
          <div className="text-center">
            <span className="px-2 py-0.5 rounded bg-black/70 text-[10px] text-emerald-300 font-mono uppercase tracking-wider backdrop-blur-sm">
              {scanPulse ? '✓ BARCODE DECODED' : subtitle}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Test Barcode Simulation Presets */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mr-1">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>Quick Scan Barcodes:</span>
        </span>
        <button
          type="button"
          onClick={() => triggerScan('8901030000001')}
          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-emerald-300 font-mono text-[11px] border border-slate-700 transition-colors cursor-pointer"
        >
          Tata Salt (8901030000001)
        </button>
        <button
          type="button"
          onClick={() => triggerScan('8906007280014')}
          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-emerald-300 font-mono text-[11px] border border-slate-700 transition-colors cursor-pointer"
        >
          Fortune Oil (8906007280014)
        </button>
        <button
          type="button"
          onClick={() => triggerScan('8901725181222')}
          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-emerald-300 font-mono text-[11px] border border-slate-700 transition-colors cursor-pointer"
        >
          Barilla Pasta (8901725181222)
        </button>
        <button
          type="button"
          onClick={() => triggerScan('8901262010014')}
          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-emerald-300 font-mono text-[11px] border border-slate-700 transition-colors cursor-pointer"
        >
          Amul Butter (8901262010014)
        </button>
      </div>

      {/* Last Detected Notification Strip */}
      {lastDetectedBarcode && (
        <div className="px-3.5 py-1.5 bg-emerald-950/80 border-t border-emerald-500/30 flex items-center justify-between text-xs font-mono text-emerald-300 animate-fade-in">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Last Scanned Barcode:</span>
            <strong className="text-white">{lastDetectedBarcode}</strong>
          </span>
          <span className="text-[10px] text-emerald-400/80">Optical Tone Dispatched</span>
        </div>
      )}
    </div>
  );
};
