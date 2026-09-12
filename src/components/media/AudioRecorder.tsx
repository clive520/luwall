'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, RotateCcw, Check, Play, Pause } from 'lucide-react';

interface AudioRecorderProps {
  onAudioReady: (audioUrl: string, durationSeconds: number) => void;
  onCancel: () => void;
}

export function AudioRecorder({ onAudioReady, onCancel }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const MAX_SECONDS = 180; // 3 分鐘上限

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= MAX_SECONDS - 1) {
            stopRecording();
            return MAX_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setError('無法存取麥克風，請檢查瀏覽器麥克風權限設定');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setAudioBlob(null);
    setPreviewUrl(null);
    setDuration(0);
    setIsPlaying(false);
    setError(null);
  };

  const togglePlay = () => {
    if (!audioPreviewRef.current || !previewUrl) return;
    if (isPlaying) {
      audioPreviewRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleConfirm = async () => {
    if (!audioBlob) return;
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, {
        type: 'audio/webm',
      });
      formData.append('file', audioFile);
      formData.append('type', 'audio');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '錄音上傳失敗');
      }

      onAudioReady(data.url, duration);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '上傳失敗';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 my-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-bold text-amber-900">語音錄音備忘</span>
          <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
            上限 3 分鐘
          </span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-500 hover:text-gray-800"
        >
          取消
        </button>
      </div>

      {error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mb-2">{error}</div>}

      <div className="flex flex-col items-center justify-center py-3">
        {/* 計時器 */}
        <div className="text-2xl font-mono font-extrabold text-amber-950 mb-3 tracking-wider">
          {formatTime(duration)}
        </div>

        {/* 控制按鈕組 */}
        {!previewUrl ? (
          <div>
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md transition transform active:scale-95"
              >
                <Mic className="w-4 h-4" />
                <span>開始錄音</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 hover:bg-black text-white font-semibold text-sm shadow-md transition animate-bounce"
              >
                <Square className="w-4 h-4 text-red-400" />
                <span>結束錄音</span>
              </button>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-3">
            <audio
              ref={audioPreviewRef}
              src={previewUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="p-3 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow transition"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <button
                type="button"
                onClick={handleReset}
                title="重新錄音"
                className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={isUploading}
                onClick={handleConfirm}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isUploading ? '上傳中...' : '使用這段錄音'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
