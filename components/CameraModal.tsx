import React, { useRef, useEffect, useCallback } from 'react';
import { IconCamera, IconX } from './Icons';
import type { CameraModalProps } from '../types';

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startStream = useCallback(async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access the camera. Please check permissions and try again.");
        onClose();
      }
    }
  }, [onClose]);

  const stopStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startStream();
    } else {
      stopStream();
    }
    return () => stopStream();
  }, [isOpen, startStream, stopStream]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        canvas.toBlob(blob => {
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
            onClose();
          }
        }, 'image/jpeg');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden border border-gray-700">
        <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors z-20">
          <IconX size={24} />
        </button>
        <div className="relative w-full aspect-[4/3] bg-black">
           <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
           <div className="absolute inset-0 border-4 border-dashed border-white/50 rounded-lg m-4"></div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="p-6 bg-gray-900/50 flex justify-center">
            <button
                onClick={handleCapture}
                className="group flex items-center justify-center w-20 h-20 bg-white/10 rounded-full border-2 border-white/30 hover:border-white transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                aria-label="Capture photo"
            >
                <div className="w-16 h-16 bg-white/20 rounded-full group-hover:bg-blue-500 transition-colors duration-300 flex items-center justify-center">
                    <IconCamera size={32} className="text-white" />
                </div>
            </button>
        </div>
      </div>
    </div>
  );
};
