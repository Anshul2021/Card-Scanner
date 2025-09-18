export interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export enum StatusType {
  Success = 'success',
  Error = 'error',
}

export interface AppStatus {
    type: StatusType;
    message: string;
}
