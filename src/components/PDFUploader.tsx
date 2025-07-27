import React, { useRef, useState } from 'react';
import { extractTextFromPDF, TextSnippet } from '../utils/pdfUtils';

interface PDFUploaderProps {
  onPDFProcessed: (snippets: TextSnippet[], pdfFile: File) => void;
}

const PDFUploader: React.FC<PDFUploaderProps> = ({ onPDFProcessed }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const snippets = await extractTextFromPDF(file);
      if (snippets.length === 0) {
        setError('No text content found in the PDF');
        return;
      }
      
      onPDFProcessed(snippets, file);
    } catch (err) {
      setError('Error processing PDF. Please try again.');
      console.error('PDF processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      const input = fileInputRef.current;
      if (input) {
        input.files = event.dataTransfer.files;
        await handleFileSelect({ target: { files: event.dataTransfer.files } } as any);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className="max-w-md mx-auto">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isProcessing 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {isProcessing ? (
          <div className="text-blue-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Processing PDF...
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-4">Upload a PDF to extract citations</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Select PDF
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        )}
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default PDFUploader; 