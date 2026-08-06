import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Volume2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { maintenanceService } from '../../services/api';
import { useOfflineSync } from '../../hooks/useOfflineSync';

/**
 * VoiceNoteRecorder Component
 * Features:
 *   - Audio recorder (MediaRecorder API) with real-time waveform animation
 *   - Integrated Speech-to-Text (window.SpeechRecognition or webkitSpeechRecognition) producing live transcript
 *   - Editable transcript text input
 *   - Posts audio file + transcript + duration to /api/maintenance/:id/voice-notes
 */
export default function VoiceNoteRecorder({
  ticketId,
  ticket,
  onUploadSuccess,
  onClose,
}) {
  const activeTicketId = ticketId || ticket?._id;
  const { networkStatus, addOfflineAction } = useOfflineSync();

  // Recorder states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  // Transcript states
  const [transcript, setTranscript] = useState('');
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  // Submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const speechRecognitionRef = useRef(null);

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentTranscript.trim());
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition notice:', event.error);
      };

      speechRecognitionRef.current = recognition;
    } catch (err) {
      console.warn('Speech recognition setup error:', err);
      setIsSpeechSupported(false);
    }
  }, []);

  // Timer helper
  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Start Recording
  const startRecording = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(200); // chunk every 200ms

      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      startTimer();

      // Start Speech Recognition if supported
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.start();
        } catch (e) {
          console.warn('Speech recognition start error:', e);
        }
      }
    } catch (err) {
      console.error('Microphone access denied:', err);
      setErrorMsg('Microphone access denied. Please allow microphone permissions.');
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      stopTimer();

      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {
          console.warn('Speech recognition stop error:', e);
        }
      }
    }
  };

  // Reset / Clear recording
  const resetRecording = () => {
    stopRecording();
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setTranscript('');
    setRecordingTime(0);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Format Duration string
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Submit Voice Note
  const handleSubmit = async () => {
    if (!audioBlob && !transcript.trim()) {
      setErrorMsg('Please record an audio note or type a transcript.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (networkStatus === 'offline') {
        // Convert blob to base64 for offline storage
        let base64 = null;
        if (audioBlob) {
          const reader = new FileReader();
          base64 = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(audioBlob);
          });
        }

        await addOfflineAction({
          type: 'VOICE_NOTE',
          ticketId: activeTicketId,
          payload: {
            audioBase64: base64,
            transcript: transcript.trim(),
            duration: recordingTime,
          },
        });

        setSuccessMsg('Voice note queued offline! It will sync automatically when online.');
      } else {
        const formData = new FormData();
        if (audioBlob) {
          formData.append('audio', audioBlob, `voice_note_${Date.now()}.webm`);
        }
        formData.append('transcript', transcript.trim());
        formData.append('duration', String(recordingTime));

        await maintenanceService.uploadVoiceNote(activeTicketId, formData);
        setSuccessMsg('Voice note and transcript saved successfully!');
      }

      if (onUploadSuccess) {
        onUploadSuccess({ transcript, duration: recordingTime, audioUrl });
      }

      setTimeout(() => {
        if (onClose) onClose();
      }, 1200);
    } catch (err) {
      console.error('Voice note upload error:', err);
      setErrorMsg(err?.response?.data?.message || err.message || 'Failed to upload voice note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 md:p-6 shadow-2xl backdrop-blur-xl space-y-5 text-slate-100 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Voice Note & Speech Transcript</h3>
            <p className="text-[11px] text-slate-400">Record field notes with live AI transcription</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            ×
          </button>
        )}
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Audio Recorder Visualizer Box */}
      <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 text-center">
        {/* Timer Display */}
        <div className="flex items-center justify-center gap-2">
          <Clock className={`w-4 h-4 ${isRecording ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
          <span className="font-mono text-2xl font-black text-cyan-400 tracking-wider">
            {formatTime(recordingTime)}
          </span>
        </div>

        {/* Animated Waveform Indicator */}
        <div className="flex items-center justify-center gap-1.5 h-10">
          {[40, 70, 30, 90, 50, 80, 45, 65, 85, 35, 75, 50].map((height, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-150 ${
                isRecording
                  ? 'bg-gradient-to-t from-cyan-500 to-blue-400 animate-pulse'
                  : 'bg-slate-800'
              }`}
              style={{
                height: isRecording ? `${Math.max(12, (height * (i % 3 + 1)) % 38)}px` : '10px',
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 pt-1">
          {!isRecording && !audioUrl && (
            <button
              onClick={startRecording}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Mic className="w-4 h-4 animate-bounce" />
              Start Recording
            </button>
          )}

          {isRecording && (
            <button
              onClick={stopRecording}
              className="px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Square className="w-4 h-4" />
              Stop Recording
            </button>
          )}

          {audioUrl && !isRecording && (
            <div className="flex items-center gap-3">
              <button
                onClick={resetRecording}
                className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Discard audio"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Audio Captured ({formatTime(recordingTime)})
              </span>
            </div>
          )}
        </div>

        {/* Audio Player Preview */}
        {audioUrl && (
          <div className="pt-2">
            <audio src={audioUrl} controls className="w-full h-8 rounded-lg outline-none" />
          </div>
        )}
      </div>

      {/* Live Transcript Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Speech-to-Text Live Transcript
          </label>
          <span className="text-[11px] text-slate-500">
            {isSpeechSupported ? 'Live STT Enabled' : 'Manual Text Input'}
          </span>
        </div>

        <textarea
          rows={3}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={
            isRecording
              ? 'Speak into microphone... transcript will appear live...'
              : 'e.g. Replaced compressor capacitor and refilled refrigerant.'
          }
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all resize-none font-mono"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        {onClose && (
          <button
            onClick={onClose}
            className="w-1/3 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
          >
            Cancel
          </button>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || (!audioBlob && !transcript.trim())}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading Voice Note...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Save & Attach Voice Note
            </>
          )}
        </button>
      </div>
    </div>
  );
}
