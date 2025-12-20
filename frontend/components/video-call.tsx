"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Camera, CameraOff } from "lucide-react";
import Image from "next/image";
import { useInterviewStore } from "@/lib/store/interviewStore";

export function VideoCall() {
  const { isAISpeaking } = useInterviewStore();
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (userVideoRef.current) {
          userVideoRef.current.srcObject = mediaStream;
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setCameraEnabled(true);
        setMicEnabled(true);
      } catch (error) {
        console.error("Error accessing camera:", error);
      }
    };

    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  const toggleCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !cameraEnabled;
        setCameraEnabled(!cameraEnabled);
      }
    }
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micEnabled;
        setMicEnabled(!micEnabled);

        // if (!micEnabled) {
        //   onStartRecording()
        // } else {
        //   onStopRecording()
        // }
      }
    }
  };

  return (
    <div className="flex flex-col-reverse gap-4 p-4 glass-card rounded-2xl">
      <div className="relative w-full aspect-video bg-black/50 rounded-xl overflow-hidden border border-white/10 shadow-inner">
        <video
          ref={userVideoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-300 ${!cameraEnabled ? "opacity-0" : "opacity-100"
            }`}
        />

        <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
          <span className="text-xs font-medium text-white flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${cameraEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
            You
          </span>
        </div>

        {!cameraEnabled && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm">
            <div className="p-4 rounded-full bg-white/5 border border-white/10 mb-4 text-gray-400">
              <CameraOff className="w-8 h-8" />
            </div>
            <p className="text-gray-400 text-sm font-medium">Camera is off</p>
          </div>
        )}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-black/60 backdrop-blur-lg rounded-full border border-white/10 hover:border-white/20 transition-colors">
          <button
            onClick={toggleCamera}
            className={`p-3 rounded-full transition-all duration-300 ${cameraEnabled
              ? "bg-white/10 hover:bg-white/20 text-white"
              : "bg-red-500/80 hover:bg-red-500 text-white shadow-lg shadow-red-500/20"
              }`}
          >
            {cameraEnabled ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleMic}
            className={`p-3 rounded-full transition-all duration-300 ${micEnabled
              ? "bg-white/10 hover:bg-white/20 text-white"
              : "bg-red-500/80 hover:bg-red-500 text-white shadow-lg shadow-red-500/20"
              }`}
          >
            {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-lg shadow-purple-500/10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 animate-gradient-xy" />

        {/* Abstract background elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/30 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/30 rounded-full blur-[100px]" />
        </div>

        <div className="absolute inset-0 flex flex-col gap-6 items-center justify-center z-10">
          <div className="relative">
            <div className={`absolute inset-0 rounded-full bg-blue-500/20 blur-xl transition-all duration-300 ${isAISpeaking ? "scale-150 opacity-100" : "scale-100 opacity-50"}`} />
            <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
              <Image
                src="/AI-Interviewer.png"
                alt="AI Avatar"
                width={64}
                height={64}
                className="w-16 h-16 object-contain drop-shadow-lg"
              />
            </div>

            {isAISpeaking && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            )}
          </div>

          <div className="text-center space-y-1">
            <p className="text-white font-semibold tracking-wide">Nexus AI</p>
            <p className="text-xs text-blue-200/60 font-medium uppercase tracking-wider">
              {isAISpeaking ? "Speaking..." : "Listening..."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
