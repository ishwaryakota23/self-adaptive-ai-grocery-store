import React, { useEffect, useState } from 'react';

interface VoiceWaveformProps {
  isListening: boolean;
  isSpeaking?: boolean;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ isListening, isSpeaking }) => {
  const [heights, setHeights] = useState<number[]>([15, 25, 45, 70, 90, 60, 85, 40, 20, 50, 75, 95, 60, 30, 15]);

  useEffect(() => {
    if (!isListening && !isSpeaking) return;

    const interval = setInterval(() => {
      setHeights(prev =>
        prev.map(() => Math.floor(Math.random() * 75) + 20)
      );
    }, 120);

    return () => clearInterval(interval);
  }, [isListening, isSpeaking]);

  return (
    <div className="flex items-center justify-center gap-1.5 h-16 w-full max-w-md mx-auto my-4 px-4">
      {heights.map((h, index) => (
        <div
          key={index}
          className="w-1.5 rounded-full bg-gradient-to-t from-emerald-600 via-emerald-400 to-teal-300 transition-all duration-150 ease-out"
          style={{
            height: isListening || isSpeaking ? `${h}%` : '8%',
            opacity: isListening || isSpeaking ? 0.9 : 0.25,
          }}
        />
      ))}
    </div>
  );
};
