import React, { useState, useCallback, ChangeEvent } from 'react';
import { CameraModal } from './components/CameraModal';
import {
  IconUpload,
  IconCamera,
  IconX,
  IconCheckCircle,
  IconAlertTriangle,
  IconLoader,
  IconScanLine
} from './components/Icons';
import type { AppStatus } from './types';
import { StatusType } from './types';


const WEBHOOK_URL = 'https://pimaj.app.n8n.cloud/webhook/business-card';

const App: React.FC = () => {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const clearState = () => {
    setImageFiles([]);
    setImagePreviews([]);
    setStatus(null);
  };

  const handleFilesChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setStatus(null); // Clear previous status messages

    const newFiles: File[] = [];
    const filePromises: Promise<string>[] = [];
    let hasInvalidFile = false;

    for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
            newFiles.push(file);
            filePromises.push(new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            }));
        } else {
            hasInvalidFile = true;
        }
    }

    if (hasInvalidFile) {
        setStatus({ type: StatusType.Error, message: 'Some files were not valid images and were ignored.' });
    }

    Promise.all(filePromises).then(newPreviews => {
        setImageFiles(prev => [...prev, ...newFiles]);
        setImagePreviews(prev => [...prev, ...newPreviews]);
    }).catch(error => {
        console.error("Error reading files:", error);
        setStatus({ type: StatusType.Error, message: 'There was an error reading the files.' });
    });
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFilesChange(e.target.files);
     // Reset the input value to allow selecting the same file again
    e.target.value = '';
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFilesChange(e.dataTransfer.files);
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
        setIsDragging(true);
    } else if (e.type === 'dragleave') {
        setIsDragging(false);
    }
  };

  const handleCameraCapture = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreviews(prev => [...prev, reader.result as string]);
    };
    reader.readAsDataURL(file);
    setImageFiles(prev => [...prev, file]);
    setIsCameraOpen(false);
  }, []);

  const handleRemoveImage = (indexToRemove: number) => {
    setImageFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async () => {
    if (imageFiles.length === 0) {
      setStatus({ type: StatusType.Error, message: 'No images selected to submit.' });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    const formData = new FormData();
    imageFiles.forEach(file => {
      formData.append('file', file);
    });

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Webhook success:', result);

      setStatus({ type: StatusType.Success, message: `${imageFiles.length} card(s) submitted successfully!` });

      setTimeout(() => {
        clearState();
      }, 3000);

    } catch (error) {
      console.error('Webhook error:', error);
      setStatus({ type: StatusType.Error, message: 'Failed to submit cards. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const StatusAlert: React.FC<{ status: AppStatus }> = ({ status }) => {
    const isSuccess = status.type === StatusType.Success;
    const bgColor = isSuccess ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20';
    const textColor = isSuccess ? 'text-green-300' : 'text-red-300';
    const Icon = isSuccess ? IconCheckCircle : IconAlertTriangle;

    return (
        <div className={`p-4 rounded-lg border ${bgColor} ${textColor} flex items-center space-x-3 transition-all duration-300`}>
            <Icon className="h-5 w-5" />
            <span className="text-sm font-medium">{status.message}</span>
        </div>
    );
  };
  
  const ImagePreviewGallery: React.FC<{ previews: string[]; onRemove: (index: number) => void }> = ({ previews, onRemove }) => (
    <div className="w-full h-full p-2 bg-gray-900/50 rounded-lg overflow-x-auto overflow-y-hidden">
        <div className="flex h-full space-x-4">
            {previews.map((src, index) => (
                <div key={index} className="relative h-full aspect-[10/16] flex-shrink-0 group">
                    <img src={src} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded-md"/>
                    <button
                        onClick={() => onRemove(index)}
                        className="absolute -top-2 -right-2 bg-gray-700 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500"
                        aria-label={`Remove image ${index + 1}`}
                    >
                        <IconX size={14} />
                    </button>
                </div>
            ))}
        </div>
    </div>
  );

  const UploadPlaceholder: React.FC = () => (
      <div 
        onDrop={handleDrop}
        onDragEnter={handleDragEvents}
        onDragOver={handleDragEvents}
        onDragLeave={handleDragEvents}
        className={`w-full h-full flex flex-col items-center justify-center p-6 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 ${isDragging ? 'border-blue-400 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'}`}>
        <input id="file-upload" type="file" accept="image/*" className="sr-only" onChange={onFileInputChange} multiple />
        <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
            <IconUpload className="w-12 h-12 text-gray-500 mb-4" />
            <p className="text-lg font-semibold text-gray-300">
                <span className="text-blue-400">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF, WEBP</p>
        </label>
    </div>
  );

  const getSubmitButtonText = () => {
    if (isLoading) return 'Submitting...';
    if (imageFiles.length === 0) return 'Submit Card';
    return `Submit ${imageFiles.length} Card${imageFiles.length > 1 ? 's' : ''}`;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4 selection:bg-blue-500/30">
      <div className="w-full max-w-md md:max-w-lg mx-auto bg-gray-800/50 rounded-2xl shadow-2xl backdrop-blur-lg border border-gray-700 overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center bg-blue-500/10 text-blue-400 rounded-full p-3 mb-4">
              <IconScanLine size={32} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Business Card Scanner</h1>
            <p className="text-gray-400 mt-2">Upload or scan your cards to get started.</p>
          </div>

          <div className="mt-8 space-y-6">
            <div className="w-full h-48 md:h-56 rounded-lg bg-gray-800 transition-all duration-300">
              {imagePreviews.length > 0 ? <ImagePreviewGallery previews={imagePreviews} onRemove={handleRemoveImage} /> : <UploadPlaceholder />}
            </div>

            <div className="flex items-center text-gray-500">
              <div className="flex-grow border-t border-gray-700"></div>
              <span className="flex-shrink mx-4 text-xs font-medium uppercase">Or</span>
              <div className="flex-grow border-t border-gray-700"></div>
            </div>

            <button
              onClick={() => setIsCameraOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-700 hover:bg-gray-600/80 rounded-lg text-white font-semibold transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-gray-600/50 disabled:opacity-50"
            >
              <IconCamera size={20} />
              Scan with Camera
            </button>
            
            {status && <StatusAlert status={status} />}

            <button
              onClick={handleSubmit}
              disabled={imageFiles.length === 0 || isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && <IconLoader size={20} className="animate-spin" />}
              {getSubmitButtonText()}
            </button>
          </div>
        </div>
      </div>
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
};

export default App;
