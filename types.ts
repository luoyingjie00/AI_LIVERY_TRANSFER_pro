
export interface ImageState {
  file: File | null;
  previewUrl: string | null;
  base64: string | null;
  mimeType: string;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type LogType = 'info' | 'success' | 'warning' | 'error';

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: LogType;
  message: string;
}

export interface ResultHistoryItem {
  id: string;
  timestamp: Date;
  resultImage: string;       // The generated output
  targetImagePreview: string; // The original target used for comparison
}
