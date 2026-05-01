import type { Accept } from "react-dropzone";

export interface DragAndDropInputProps {
  onChange: (files: FileWithPreview[]) => void;
  initialFiles?: FileWithPreview[];
  maxFiles?: number;
  maxSize?: number;
  minSize?: number;
  accept?: Accept;
  multiple?: boolean;

  dragActiveText?: string;
  dragInactiveText?: string;
  showPreview?: boolean;
  previewType?: "grid" | "list";
  disabled?: boolean;
  className?: string;

  onError?: (error: string) => void;
  onDropRejected?: (rejections: any[]) => void;
  validateFile?: (file: File) => string | boolean;

  onFileRemove?: (file: FileWithPreview) => void;
  onFileClick?: (file: FileWithPreview) => void;
  showFileSize?: boolean;
  showFileName?: boolean;
  showRemoveButton?: boolean;
  allowReorder?: boolean;

  renderPreview?: (file: FileWithPreview, index: number) => React.ReactNode;
  renderEmptyState?: () => React.ReactNode;
}

export interface FileWithPreview extends File {
  preview: string;
  id: string;
}
