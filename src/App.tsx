import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PDFUploader from './components/PDFUploader';
import FileUploader from './components/FileUploader';
import CitationDisplay from './components/CitationDisplay';
import PDFViewer from './components/PDFViewer';
import DOCXViewer from './components/DOCXViewer';
import { Citation } from './utils/pdfUtils';
import { DOCXCitation } from './utils/docxUtils';
import { FileType } from './utils/fileUtils';

const HomePage: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [pdfCitations, setPdfCitations] = useState<Citation[]>([]);
  const [docxCitations, setDocxCitations] = useState<DOCXCitation[]>([]);
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = async (file: File, type: FileType) => {
    setLoading(true);
    try {
      if (type === 'pdf') {
        setPdfFile(file);
        setDocxFile(null);
        setDocxCitations([]);
        
        // Import PDF utilities dynamically to avoid circular dependencies
        const { extractTextFromPDF, getRandomSnippets, createCitations } = await import('./utils/pdfUtils');
        const snippets = await extractTextFromPDF(file);
        const randomSnippets = getRandomSnippets(snippets, 3);
        const citations = createCitations(randomSnippets);
        setPdfCitations(citations);
      } else if (type === 'docx') {
        setDocxFile(file);
        setPdfFile(null);
        setPdfCitations([]);
        
        // Import DOCX utilities dynamically
        const { extractTextFromDOCX, getRandomDOCXSnippets, createDOCXCitations } = await import('./utils/docxUtils');
        const snippets = await extractTextFromDOCX(file);
        const randomSnippets = getRandomDOCXSnippets(snippets, 3);
        const citations = createDOCXCitations(randomSnippets);
        setDocxCitations(citations);
      }
      setFileType(type);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Citations MVP
          </h1>
          <p className="text-lg text-gray-600">
            Upload a PDF or DOCX file to extract random citations
          </p>
        </div>

        {!pdfFile && !docxFile ? (
          <FileUploader onFileSelect={handleFileSelect} />
        ) : (
          <div className="space-y-6">
            {/* File Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {fileType?.toUpperCase()} Document
                  </h2>
                  <p className="text-gray-600">
                    {pdfFile?.name || docxFile?.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPdfFile(null);
                    setDocxFile(null);
                    setPdfCitations([]);
                    setDocxCitations([]);
                    setFileType(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Processing document...</p>
              </div>
            )}

            {/* Citations Display */}
            {!loading && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Random Citations
                </h3>
                {fileType === 'pdf' && pdfFile && (
                  <CitationDisplay citations={pdfCitations} pdfFile={pdfFile} />
                )}
                {fileType === 'docx' && docxFile && (
                  <CitationDisplay 
                    citations={docxCitations} 
                    docxFile={docxFile}
                    fileType="docx"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/viewer" element={<PDFViewer />} />
        <Route path="/docx-viewer" element={<DOCXViewer />} />
      </Routes>
    </Router>
  );
};

export default App;
