import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  AlertTriangle,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  ScanLine,
  Smartphone,
  Key,
  Sparkles
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

import jsQR from 'jsqr';
import { voiceService } from '../services/voiceService';

interface CameraQRScannerProps {
  title?: string;
  subtitle?: string;
  onScanSuccess: (token: string) => { success: boolean; error?: string } | Promise<{ success: boolean; error?: string }>;
  onSwitchToNewCustomer: () => void;
  onClose?: () => void;
  isKioskMode?: boolean;
}

export const CameraQRScanner: React.FC<CameraQRScannerProps> = ({
  title = 'Scan your GrocerAI Customer QR',
  subtitle = 'Hold your Customer Identity QR received via email in front of the camera',
  onScanSuccess,
  onSwitchToNewCustomer,
  onClose,
  isKioskMode = false
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const isDecodingRef = useRef<boolean>(false);
  const scanTimerRef = useRef<any>(null);

  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [cameraLoading, setCameraLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [scanState, setScanState] = useState<'SCANNING' | 'VERIFYING' | 'ERROR' | 'SUCCESS'>('SCANNING');
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Initialize Camera Stream & Multi-Engine Optical Decoder
  useEffect(() => {
    let isMounted = true;
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    let nativeDetector: any = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        nativeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e']
        });
      } catch (e) {
        console.warn('[CameraQRScanner] Native BarcodeDetector note:', e);
      }
    }

    const offscreenCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    const offscreenCtx = offscreenCanvas?.getContext('2d', { willReadFrequently: true });

    async function initCameraAndScanner() {
      setCameraLoading(true);
      setCameraError(null);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (isMounted) {
            setHasCamera(false);
            setCameraLoading(false);
            setCameraError('Camera API not accessible in this browser. Use manual input or quick test presets below.');
          }
          return;
        }

        // Request camera stream (high resolution for sharp barcode & QR reading)
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
        } catch {
          // Fallback to default webcam
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

        // ACTIVE CONTINUOUS OPTICAL SCAN LOOP (Frame-by-Frame, Triple-Engine)
        const processFrame = async () => {
          if (!isMounted) return;
          const video = videoRef.current;

          if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
            scanTimerRef.current = setTimeout(processFrame, 80);
            return;
          }

          if (isDecodingRef.current) {
            scanTimerRef.current = setTimeout(processFrame, 200);
            return;
          }

          let detectedText: string | null = null;

          // Engine 1: Native Chromium BarcodeDetector (hardware GPU accelerated in Chrome)
          if (nativeDetector) {
            try {
              const detected = await nativeDetector.detect(video);
              if (detected && detected.length > 0) {
                const raw = detected[0].rawValue?.trim();
                if (raw) {
                  detectedText = raw;
                }
              }
            } catch {}
          }

          // Engine 2: jsQR with { inversionAttempts: 'attemptBoth' } (specialized for phone screens in dark mode / glare)
          if (!detectedText && offscreenCanvas && offscreenCtx) {
            try {
              offscreenCanvas.width = video.videoWidth;
              offscreenCanvas.height = video.videoHeight;
              offscreenCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
              const imgData = offscreenCtx.getImageData(0, 0, video.videoWidth, video.videoHeight);
              const qr = jsQR(imgData.data, video.videoWidth, video.videoHeight, {
                inversionAttempts: 'attemptBoth'
              });
              if (qr && qr.data && qr.data.trim()) {
                detectedText = qr.data.trim();
              }
            } catch {}
          }

          // Engine 3: ZXing frame decode fallback
          if (!detectedText) {
            try {
              const zxRes = codeReader.decode(video);
              if (zxRes && zxRes.getText()) {
                detectedText = zxRes.getText().trim();
              }
            } catch {}
          }

          if (detectedText && !isDecodingRef.current && isMounted) {
            console.log('[CameraQRScanner] Optical QR code captured:', detectedText);
            isDecodingRef.current = true;
            voiceService.playAudioChime(750, 150);
            handleProcessToken(detectedText);
            setTimeout(() => {
              if (isMounted) isDecodingRef.current = false;
            }, 3000);
          }

          if (isMounted) {
            scanTimerRef.current = setTimeout(processFrame, 80);
          }
        };

        scanTimerRef.current = setTimeout(processFrame, 250);
      } catch (err: any) {
        if (isMounted) {
          console.warn('[CameraQRScanner] Camera stream initialization note:', err);
          setHasCamera(false);
          setCameraLoading(false);
          setCameraError(
            err?.name === 'NotAllowedError'
              ? 'Webcam permission denied in browser settings. Use quick test presets or manual input below.'
              : 'Webcam device currently busy or inaccessible. Use quick test presets below.'
          );
        }
      }
    }

    initCameraAndScanner();

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
  }, []);

  const handleProcessToken = async (tokenToVerify: string) => {
    const cleanToken = tokenToVerify.trim();
    if (!cleanToken) return;

    setScanState('VERIFYING');
    setVerificationError(null);

    try {
      // 1. Direct verification
      const res = await Promise.resolve(onScanSuccess(cleanToken));
      if (res && res.success) {
        setScanState('SUCCESS');
        return;
      }

      // 2. If cleanToken is JSON payload (e.g. from email {"t":"CID","tok":"..."}), try inner token field
      if (cleanToken.startsWith('{') && cleanToken.endsWith('}')) {
        try {
          const parsed = JSON.parse(cleanToken);
          const innerTok = parsed.tok || parsed.token || parsed.cid || parsed.sessionId;
          if (innerTok && innerTok !== cleanToken) {
            const fallbackRes = await Promise.resolve(onScanSuccess(innerTok));
            if (fallbackRes && fallbackRes.success) {
              setScanState('SUCCESS');
              return;
            }
          }
        } catch {}
      }

      setScanState('ERROR');
      setVerificationError(res?.error || 'QR could not be verified.');
    } catch (e: any) {
      setScanState('ERROR');
      setVerificationError(e?.message || 'QR could not be verified.');
    }
  };

  const handleTryAgain = () => {
    setScanState('SCANNING');
    setVerificationError(null);
    setManualToken('');
    isDecodingRef.current = false;
  };

  return (
    <div
      className={`relative w-full ${
        isKioskMode ? 'max-w-2xl' : 'max-w-md'
      } mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6 animate-fade-in`}
    >
      {/* Close button if provided */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Customer Identity Scanner</span>
        </div>
        <h2 className={`${isKioskMode ? 'text-3xl' : 'text-2xl'} font-bold tracking-tight text-white`}>
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
          {subtitle}
        </p>
      </div>

      {/* ERROR STATE: "QR could not be verified" with TRY AGAIN & NEW CUSTOMER */}
      {scanState === 'ERROR' ? (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">QR could not be verified.</h3>
            <p className="text-xs text-rose-300/90 mt-1">
              {verificationError || 'The scanned QR code is either invalid, revoked, or belongs to another store service.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleTryAgain}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-slate-300" />
              <span>TRY AGAIN</span>
            </button>

            <button
              onClick={onSwitchToNewCustomer}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-slate-950" />
              <span>NEW CUSTOMER</span>
            </button>
          </div>
        </div>
      ) : scanState === 'SUCCESS' ? (
        <div className="p-8 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Identity Verified</h3>
          <p className="text-xs text-emerald-300">
            Starting a fresh shopping session with an empty cart...
          </p>
        </div>
      ) : (
        /* SCANNING STATE */
        <div className="space-y-4">
          {/* Camera Viewfinder Box (Video is ALWAYS in the DOM so srcObject connects reliably) */}
          <div className="relative aspect-video max-h-64 sm:max-h-72 w-full bg-slate-950 rounded-2xl overflow-hidden border-2 border-dashed border-emerald-500/40 flex items-center justify-center group">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Overlay if camera is loading or permission blocked */}
            {!hasCamera && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4 space-y-2 z-10">
                <Camera className="w-8 h-8 text-slate-500 mx-auto animate-pulse" />
                <p className="text-xs text-slate-300 font-medium max-w-xs mx-auto">
                  {cameraLoading
                    ? 'Connecting to optical camera feed...'
                    : cameraError || 'Camera unavailable. Use quick simulation presets below.'}
                </p>
                <span className="text-[10px] text-emerald-400/80 font-mono">
                  Optical AI Barcode Decoder Active
                </span>
              </div>
            )}

            {/* Viewfinder Target Overlay */}
            <div className="absolute inset-8 sm:inset-12 border-2 border-emerald-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-2 shadow-[0_0_15px_rgba(16,185,129,0.2)] z-20">
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse" />
              <div className="text-center text-[10px] text-emerald-400 font-mono tracking-widest uppercase">
                Align QR Within Frame
              </div>
            </div>
          </div>

          {/* Quick Manual Token Input & 1-Click Simulation Presets */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quick Scan Presets or Manual Token</span>
              </span>
              <span className="text-[10px] text-slate-500">Instant One-Click Pass</span>
            </div>

            {/* Quick Demo Scan Buttons for 100% Reliable Testing */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleProcessToken('CID_SEC_ISHWARYA_1001_VERIFIED')}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/60 text-left transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-white group-hover:text-emerald-400 flex items-center justify-between">
                  <span>Ishwarya Kota</span>
                  <span className="text-[10px] font-mono text-emerald-400">CUST-1001</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Customer Identity QR</div>
              </button>

              <button
                type="button"
                onClick={() => handleProcessToken('CID_SEC_RAHUL_1002_VERIFIED')}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/60 text-left transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-white group-hover:text-emerald-400 flex items-center justify-between">
                  <span>Rahul Sen</span>
                  <span className="text-[10px] font-mono text-emerald-400">CUST-1002</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Customer Identity QR</div>
              </button>
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleProcessToken(manualToken)}
                placeholder="Or paste QR token (CID_SEC_... / GROCERAI_...)"
                className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
              <button
                onClick={() => handleProcessToken(manualToken)}
                disabled={!manualToken.trim() || scanState === 'VERIFYING'}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              >
                {scanState === 'VERIFYING' ? 'Checking...' : 'Scan'}
              </button>
            </div>
          </div>

          {/* Switch to New Customer Option */}
          <div className="text-center pt-1">
            <button
              onClick={onSwitchToNewCustomer}
              className="text-xs text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span>First time here?</span>
              <span className="font-semibold text-emerald-400 underline underline-offset-2">Register as New Customer →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
