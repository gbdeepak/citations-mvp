import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PDFUploader from './components/PDFUploader';
import FileUploader from './components/FileUploader';
import CitationDisplay from './components/CitationDisplay';
import PDFViewer from './components/PDFViewer';
import DOCXViewer from './components/DOCXViewer';
import { Citation, MultiLineCitation } from './utils/pdfUtils';
import { DOCXCitation, DOCXMultiLineCitation } from './utils/docxUtils';
import { FileType } from './utils/fileUtils';

const HomePage: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [pdfCitations, setPdfCitations] = useState<Citation[]>([]);
  const [docxCitations, setDocxCitations] = useState<DOCXCitation[]>([]);
  const [pdfMultiLineCitations, setPdfMultiLineCitations] = useState<MultiLineCitation[]>([]);
  const [docxMultiLineCitations, setDocxMultiLineCitations] = useState<DOCXMultiLineCitation[]>([]);
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [loading, setLoading] = useState(false);
  const [useMultiLine, setUseMultiLine] = useState(true); // Default to multi-line extraction

  const handleFileSelect = async (file: File, type: FileType) => {
    setLoading(true);
    try {
      if (type === 'pdf') {
        setPdfFile(file);
        setDocxFile(null);
        setDocxCitations([]);
        setDocxMultiLineCitations([]);
        
        if (useMultiLine) {
          // Use multi-line extraction
          const { extractMultiLineTextFromPDF, getRandomMultiLineSnippets, createMultiLineCitations } = await import('./utils/pdfUtils');
          const snippets = await extractMultiLineTextFromPDF(file);
          const randomSnippets = getRandomMultiLineSnippets(snippets, 3);
          const citations = createMultiLineCitations(randomSnippets);
          setPdfMultiLineCitations(citations);
          setPdfCitations([]);
        } else {
          // Use single-line extraction (legacy)
          const { extractTextFromPDF, getRandomSnippets, createCitations } = await import('./utils/pdfUtils');
          const snippets = await extractTextFromPDF(file);
          const randomSnippets = getRandomSnippets(snippets, 3);
          const citations = createCitations(randomSnippets);
          setPdfCitations(citations);
          setPdfMultiLineCitations([]);
        }
      } else if (type === 'docx') {
        setDocxFile(file);
        setPdfFile(null);
        setPdfCitations([]);
        setPdfMultiLineCitations([]);
        
        if (useMultiLine) {
          // Use multi-line extraction
          const { extractMultiLineTextFromDOCX, getRandomDOCXMultiLineSnippets, createDOCXMultiLineCitations } = await import('./utils/docxUtils');
          const snippets = await extractMultiLineTextFromDOCX(file);
          const randomSnippets = getRandomDOCXMultiLineSnippets(snippets, 3);
          const citations = createDOCXMultiLineCitations(randomSnippets);
          setDocxMultiLineCitations(citations);
          setDocxCitations([]);
        } else {
          // Use single-line extraction (legacy)
          const { extractTextFromDOCX, getRandomDOCXSnippets, createDOCXCitations } = await import('./utils/docxUtils');
          const snippets = await extractTextFromDOCX(file);
          const randomSnippets = getRandomDOCXSnippets(snippets, 3);
          const citations = createDOCXCitations(randomSnippets);
          setDocxCitations(citations);
          setDocxMultiLineCitations([]);
        }
      }
      setFileType(type);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetFile = () => {
    setPdfFile(null);
    setDocxFile(null);
    setPdfCitations([]);
    setDocxCitations([]);
    setPdfMultiLineCitations([]);
    setDocxMultiLineCitations([]);
    setFileType(null);
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
          <div className="space-y-6">
            {/* Extraction Mode Toggle */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Extraction Mode:</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setUseMultiLine(false)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      !useMultiLine
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Single Line
                  </button>
                  <button
                    onClick={() => setUseMultiLine(true)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      useMultiLine
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Multi Line
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {useMultiLine 
                  ? 'Extract complex structures like bullet points, tables, and multi-line content'
                  : 'Extract simple single-line text snippets'
                }
              </p>
            </div>

            <FileUploader onFileSelect={handleFileSelect} />
          </div>
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
                  <p className="text-sm text-gray-500 mt-1">
                    Mode: {useMultiLine ? 'Multi-line' : 'Single-line'} extraction
                  </p>
                </div>
                <button
                  onClick={resetFile}
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
                  <>
                    {useMultiLine && pdfMultiLineCitations.length > 0 && (
                      <CitationDisplay 
                        citations={pdfMultiLineCitations} 
                        pdfFile={pdfFile}
                        fileType="pdf"
                        isMultiLine={true}
                      />
                    )}
                    {!useMultiLine && pdfCitations.length > 0 && (
                      <CitationDisplay 
                        citations={pdfCitations} 
                        pdfFile={pdfFile}
                        fileType="pdf"
                        isMultiLine={false}
                      />
                    )}
                  </>
                )}
                {fileType === 'docx' && docxFile && (
                  <>
                    {useMultiLine && docxMultiLineCitations.length > 0 && (
                      <CitationDisplay 
                        citations={docxMultiLineCitations} 
                        docxFile={docxFile}
                        fileType="docx"
                        isMultiLine={true}
                      />
                    )}
                    {!useMultiLine && docxCitations.length > 0 && (
                      <CitationDisplay 
                        citations={docxCitations} 
                        docxFile={docxFile}
                        fileType="docx"
                        isMultiLine={false}
                      />
                    )}
                  </>
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
