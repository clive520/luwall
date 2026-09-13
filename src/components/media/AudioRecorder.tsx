'use client';

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Mic, Square, RotateCcw, Check, Play, Pause } from 'lucide-react';

export interface AudioRecorderHandle {
  /** 檢查是否有錄製中或尚未上傳的語音 */
  hasPendingAudio: () => boolean;
  /** 檢查目前是否正在錄製中 */
  isRecording: () => boolean;
  /** 上傳當前錄音（若正在錄音會自動終止並取得音訊），回傳 URL 與秒數 */
  uploadCurrentAudio: () => Promise<{ url: string; duration: number } | null>;
}

interface AudioRecorderProps {
  onAudioReady: (audioUrl: string, durationSeconds: number) => void;
  onCancel: () => void;
  onReset?: () => void;
}

export const AudioRecorder = forwardRef<AudioRecorderHandle, AudioRecorderProps>(
  function AudioRecorder({ onAudioReady, onCancel, onReset }, ref) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isUploaded, setIsUploaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // 同步狀態 Refs，避免在非同步閉包中抓到舊狀態
    const audioBlobRef = useRef<Blob | null>(null);
    const durationRef = useRef<number>(0);
    const isRecordingRef = useRef<boolean>(false);
    const hasUploadedRef = useRef<boolean>(false);
    const uploadedResultRef = useRef<{ url: string; duration: number } | null>(null);

    const MAX_SECONDS = 180; // 3 分鐘上限

    useEffect(() => {
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      };
    }, [previewUrl]);

    const performUpload = async (): Promise<{ url: string; duration: number } | null> => {
      // 1. 若已經成功上傳過，直接回傳結果
      if (hasUploadedRef.current && uploadedResultRef.current) {
        return uploadedResultRef.current;
      }

      let blobToUpload = audioBlobRef.current;
      let finalDuration = durationRef.current;

      // 2. 若使用者還在錄音中便直接按了送出，先停止錄音並等待產生音訊 Blob
      if (isRecordingRef.current && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          const finished = await new Promise<{ blob: Blob; duration: number }>((resolve) => {
            if (!mediaRecorderRef.current) {
              resolve({ blob: audioBlobRef.current || new Blob(), duration: durationRef.current });
              return;
            }
            const rec = mediaRecorderRef.current;
            rec.onstop = () => {
              const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
              setAudioBlob(blob);
              audioBlobRef.current = blob;
              const url = URL.createObjectURL(blob);
              setPreviewUrl(url);
              if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
              }
              resolve({ blob, duration: durationRef.current });
            };
            rec.stop();
            setIsRecording(false);
            isRecordingRef.current = false;
            if (timerRef.current) clearInterval(timerRef.current);
          });
          blobToUpload = finished.blob;
          finalDuration = finished.duration;
        } catch (err) {
          console.error('停止錄音並上傳時出錯:', err);
        }
      }

      if (!blobToUpload || blobToUpload.size === 0) {
        return null;
      }

      setIsUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        const audioFile = new File([blobToUpload], `recording-${Date.now()}.webm`, {
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

        const result = { url: data.url, duration: finalDuration };
        uploadedResultRef.current = result;
        hasUploadedRef.current = true;
        setIsUploaded(true);
        onAudioReady(data.url, finalDuration);
        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '上傳失敗';
        setError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    };

    useImperativeHandle(ref, () => ({
      hasPendingAudio: () => {
        // 正在錄音中，或已有錄音 Blob 但尚未完成上傳
        return isRecordingRef.current || (audioBlobRef.current !== null && !hasUploadedRef.current);
      },
      isRecording: () => isRecordingRef.current,
      uploadCurrentAudio: async () => {
        return await performUpload();
      },
    }));

    const startRecording = async () => {
      try {
        setError(null);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];
        hasUploadedRef.current = false;
        uploadedResultRef.current = null;
        setIsUploaded(false);

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          setAudioBlob(blob);
          audioBlobRef.current = blob;
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
          }
        };

        mediaRecorder.start(200);
        setIsRecording(true);
        isRecordingRef.current = true;
        setDuration(0);
        durationRef.current = 0;

        timerRef.current = setInterval(() => {
          setDuration((prev) => {
            const next = prev >= MAX_SECONDS - 1 ? MAX_SECONDS : prev + 1;
            durationRef.current = next;
            if (next >= MAX_SECONDS) {
              stopRecording();
            }
            return next;
          });
        }, 1000);
      } catch {
        setError('無法存取麥克風，請檢查瀏覽器麥克風權限設定');
      }
    };

    const stopRecording = () => {
      if (mediaRecorderRef.current && isRecordingRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        isRecordingRef.current = false;
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };

    const handleReset = () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setAudioBlob(null);
      audioBlobRef.current = null;
      setPreviewUrl(null);
      setDuration(0);
      durationRef.current = 0;
      setIsPlaying(false);
      setError(null);
      hasUploadedRef.current = false;
      uploadedResultRef.current = null;
      setIsUploaded(false);
      onReset?.();
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
      try {
        await performUpload();
      } catch {
        // 錯誤訊息已在 performUpload 中設定至 setError
      }
    };

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div className="bg-amber-50/75 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-4 my-2 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-bold text-amber-900 dark:text-amber-200">語音錄音備忘</span>
            <span className="text-xs text-amber-800 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-900/60 px-2 py-0.5 rounded-md font-semibold">
              上限 3 分鐘
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 font-semibold"
          >
            取消
          </button>
        </div>

        {error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mb-2 font-bold">{error}</div>}

        <div className="flex flex-col items-center justify-center py-2">
          {/* 計時器 */}
          <div className="text-2xl font-mono font-extrabold text-amber-950 dark:text-amber-100 mb-3 tracking-wider">
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
                  title={isPlaying ? '暫停試聽' : '試聽錄音'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  title="重新錄音"
                  className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={isUploading || isUploaded}
                  onClick={handleConfirm}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full font-semibold text-sm shadow transition disabled:opacity-85 ${
                    isUploaded
                      ? 'bg-emerald-700 text-white cursor-default'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isUploading
                      ? '上傳中...'
                      : isUploaded
                      ? '✓ 錄音已就緒'
                      : '使用這段錄音'}
                  </span>
                </button>
              </div>

              <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 font-medium text-center mt-1">
                💡 貼心提示：您可以點擊「使用這段錄音」，或直接點選下方發布按鈕，系統皆會自動上傳這段語音！
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
);
