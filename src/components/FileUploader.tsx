import React, { useCallback, useState } from 'react';
import { getFileType, isSupportedFileType, validateFileSize, getFileTypeDisplayName, getFileSizeDisplay } from '../utils/fileUtils';

interface FileUploaderProps {
  onFileSelect: (file: File, fileType: 'pdf' | 'docx') => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateAndProcessFile = (file: File) => {
    setError(null);

    // Check if file type is supported
    if (!isSupportedFileType(file)) {
      setError('Unsupported file type. Please upload a PDF or DOCX file.');
      return;
    }

    // Check file size (20MB limit)
    if (!validateFileSize(file, 20)) {
      setError('File size too large. Please upload a file smaller than 20MB.');
      return;
    }

    const fileType = getFileType(file);
    if (fileType) {
      onFileSelect(file, fileType);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndProcessFile(file);
    }
  }, [onFileSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndProcessFile(file);
    }
  }, [onFileSelect]);

  const onButtonClick = () => {
    const input = document.getElementById('file-input') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          {/* File Icon */}
          <div className="mx-auto w-12 h-12 text-gray-400">
            <svg
              className="w-full h-full"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {/* Upload Text */}
          <div>
            <p className="text-lg font-medium text-gray-900">
              Upload your document
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Drag and drop a PDF or DOCX file, or click to browse
            </p>
          </div>

          {/* Supported Formats */}
          <div className="text-xs text-gray-400">
            Supported formats: PDF, DOCX (max 20MB)
          </div>

          {/* Upload Button */}
          <button
            type="button"
            onClick={onButtonClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Choose File
          </button>

          {/* Hidden File Input */}
          <input
            id="file-input"
            type="file"
            accept=".pdf,.docx"
            onChange={handleChange}
            className="hidden"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader; 