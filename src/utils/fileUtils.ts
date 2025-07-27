export type FileType = 'pdf' | 'docx';

export function getFileType(file: File): FileType | null {
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.split('.').pop();
  
  switch (fileExtension) {
    case 'pdf':
      return 'pdf';
    case 'docx':
      return 'docx';
    default:
      return null;
  }
}

export function isSupportedFileType(file: File): boolean {
  return getFileType(file) !== null;
}

export function getFileTypeDisplayName(fileType: FileType): string {
  switch (fileType) {
    case 'pdf':
      return 'PDF';
    case 'docx':
      return 'DOCX';
    default:
      return 'Unknown';
  }
}

export function validateFileSize(file: File, maxSizeMB: number = 20): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

export function getFileSizeDisplay(file: File): string {
  const bytes = file.size;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
} 