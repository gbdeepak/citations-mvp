import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Citation, MultiLineCitation, createHighlightURL, createMultiLineHighlightURL } from '../utils/pdfUtils';
import { DOCXCitation, DOCXMultiLineCitation, createDOCXHighlightURL, createDOCXMultiLineHighlightURL } from '../utils/docxUtils';
import PDFPreviewTooltip from './PDFPreviewTooltip';
import DOCXPreviewTooltip from './DOCXPreviewTooltip';

interface CitationDisplayProps {
  citations: Citation[] | DOCXCitation[] | MultiLineCitation[] | DOCXMultiLineCitation[];
  pdfFile?: File;
  docxFile?: File;
  fileType?: 'pdf' | 'docx';
  isMultiLine?: boolean;
}

const CitationDisplay: React.FC<CitationDisplayProps> = ({ 
  citations, 
  pdfFile, 
  docxFile, 
  fileType = 'pdf',
  isMultiLine = false
}) => {
  const navigate = useNavigate();
  const [hoveredCitation, setHoveredCitation] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipAbove, setTooltipAbove] = useState(true);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const file = pdfFile || docxFile;
  const fileUrl = file ? URL.createObjectURL(file) : '';

  // Debug mode: always show tooltip for the first citation
  const DEBUG_ALWAYS_SHOW_TOOLTIP = false; // Disabled debug mode
  const debugCitationId = citations.length > 0 ? citations[0].id : null;

  // Add debug logging
  useEffect(() => {
    if (DEBUG_ALWAYS_SHOW_TOOLTIP && debugCitationId) {
      console.log('[CitationDisplay] Debug mode enabled for citation:', debugCitationId);
      console.log('[CitationDisplay] File URL:', fileUrl);
      console.log('[CitationDisplay] Citations count:', citations.length);
      console.log('[CitationDisplay] File type:', fileType);
      console.log('[CitationDisplay] Is multi-line:', isMultiLine);
    }
  }, [DEBUG_ALWAYS_SHOW_TOOLTIP, debugCitationId, fileUrl, citations.length, fileType, isMultiLine]);

  const handleReferenceClick = (citation: Citation | DOCXCitation | MultiLineCitation | DOCXMultiLineCitation) => {
    if (fileType === 'pdf') {
      if (isMultiLine && 'snippet' in citation && 'lines' in citation.snippet) {
        // Multi-line PDF citation
        const multiLineUrl = createMultiLineHighlightURL(fileUrl, citation.snippet as any);
        window.open(multiLineUrl, '_blank');
      } else if ('snippet' in citation && 'page' in citation.snippet) {
        // Single-line PDF citation
        const params = new URLSearchParams({
          pdf: fileUrl,
          page: citation.snippet.page.toString(),
          x: citation.snippet.x.toString(),
          y: citation.snippet.y.toString(),
          width: citation.snippet.width.toString(),
          height: citation.snippet.height.toString(),
        });
        window.open(`/viewer?${params.toString()}`, '_blank');
      }
    } else if (fileType === 'docx') {
      if (isMultiLine && 'snippet' in citation && 'lines' in citation.snippet) {
        // Multi-line DOCX citation
        const multiLineUrl = createDOCXMultiLineHighlightURL(fileUrl, citation.snippet as any);
        window.open(multiLineUrl, '_blank');
      } else if ('snippet' in citation && 'paragraphIndex' in citation.snippet) {
        // Single-line DOCX citation
        const docxUrl = createDOCXHighlightURL(fileUrl, citation.snippet as any);
        window.open(docxUrl, '_blank');
      }
    }
  };

  const handleMouseEnter = (citationId: string, e: React.MouseEvent) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      const button = buttonRefs.current[citationId];
      if (button) {
        const rect = button.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Calculate position for tooltip
        const tooltipHeight = 200; // Approximate tooltip height
        const spaceAbove = rect.top;
        const spaceBelow = viewportHeight - rect.bottom;
        
        let x = rect.left + rect.width / 2;
        let y: number;
        
        if (spaceBelow >= tooltipHeight || spaceBelow > spaceAbove) {
          // Position below button
          y = rect.bottom + 10;
          setTooltipAbove(false);
        } else {
          // Position above button
          y = rect.top - tooltipHeight - 10;
          setTooltipAbove(true);
        }
        
        setTooltipPosition({ x, y });
        setHoveredCitation(citationId);
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredCitation(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const getCitationText = (citation: Citation | DOCXCitation | MultiLineCitation | DOCXMultiLineCitation) => {
    if (isMultiLine && 'snippet' in citation && 'lines' in citation.snippet) {
      // Multi-line citation - format the text nicely
      const multiLineSnippet = citation.snippet as any;
      return multiLineSnippet.text.replace(/\n/g, '\n  '); // Add indentation for better readability
    } else {
      // Single-line citation
      return 'text' in citation ? citation.text : citation.snippet.text;
    }
  };

  const getCitationLocation = (citation: Citation | DOCXCitation | MultiLineCitation | DOCXMultiLineCitation) => {
    if (isMultiLine && 'snippet' in citation && 'lines' in citation.snippet) {
      const multiLineSnippet = citation.snippet as any;
      const lineCount = multiLineSnippet.lines.length;
      const type = multiLineSnippet.type || 'content';
      
      if (fileType === 'pdf' && 'page' in multiLineSnippet) {
        return `Page ${multiLineSnippet.page} - ${lineCount} line${lineCount > 1 ? 's' : ''} (${type})`;
      } else if (fileType === 'docx' && 'paragraphIndices' in multiLineSnippet) {
        const startPara = Math.min(...multiLineSnippet.paragraphIndices) + 1;
        const endPara = Math.max(...multiLineSnippet.paragraphIndices) + 1;
        return `Paragraphs ${startPara}-${endPara} - ${lineCount} line${lineCount > 1 ? 's' : ''} (${type})`;
      }
    } else if ('snippet' in citation) {
      if (fileType === 'pdf' && 'page' in citation.snippet) {
        return `Page ${citation.snippet.page}`;
      } else if (fileType === 'docx' && 'paragraphIndex' in citation.snippet) {
        return `Paragraph ${citation.snippet.paragraphIndex + 1}`;
      }
    }
    return 'Unknown location';
  };

  const getCitationType = (citation: Citation | DOCXCitation | MultiLineCitation | DOCXMultiLineCitation) => {
    if (isMultiLine && 'snippet' in citation && 'lines' in citation.snippet) {
      const multiLineSnippet = citation.snippet as any;
      return multiLineSnippet.type || 'content';
    }
    return 'text';
  };

  return (
    <div className="space-y-4">
      {citations.map((citation, idx) => (
        <div key={citation.id} className="relative">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Citation Type Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500">
                    {getCitationType(citation).toUpperCase()}
                  </span>
                  {isMultiLine && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Multi-line
                    </span>
                  )}
                </div>
                
                {/* Citation Text */}
                <div className="mb-2">
                  {isMultiLine ? (
                    <pre className="text-gray-800 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      "{getCitationText(citation)}"
                    </pre>
                  ) : (
                    <p className="text-gray-800">
                      "{getCitationText(citation)}"
                    </p>
                  )}
                </div>
                
                {/* Location Info */}
                <p className="text-sm text-gray-500">
                  {getCitationLocation(citation)}
                </p>
              </div>
              
              <button
                ref={(el) => { buttonRefs.current[citation.id] = el; }}
                onClick={() => handleReferenceClick(citation)}
                onMouseEnter={(e) => handleMouseEnter(citation.id, e)}
                onMouseLeave={handleMouseLeave}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Reference
              </button>
            </div>
          </div>
          
          {/* PDF Preview Tooltip - Only for PDF files */}
          {fileType === 'pdf' && 'snippet' in citation && 'page' in citation.snippet && (
            (DEBUG_ALWAYS_SHOW_TOOLTIP && citation.id === debugCitationId) || (hoveredCitation === citation.id) ? (
              <div 
                className="fixed z-50"
                style={{
                  left: `${tooltipPosition.x}px`,
                  top: `${tooltipPosition.y}px`,
                  transform: tooltipAbove ? 
                    'translateX(-50%) translateY(-100%)' : // Above button
                    'translateX(-50%)', // Below button
                }}
              >
                <PDFPreviewTooltip
                  pdfUrl={fileUrl}
                  page={citation.snippet.page}
                  x={citation.snippet.x}
                  y={citation.snippet.y}
                  width={citation.snippet.width}
                  height={citation.snippet.height}
                  isVisible={true}
                />
              </div>
            ) : null
          )}

          {/* DOCX Preview Tooltip - Only for DOCX files */}
          {fileType === 'docx' && 'snippet' in citation && 'paragraphIndex' in citation.snippet && (
            (DEBUG_ALWAYS_SHOW_TOOLTIP && citation.id === debugCitationId) || (hoveredCitation === citation.id) ? (
              <div 
                className="fixed z-50"
                style={{
                  left: `${tooltipPosition.x}px`,
                  top: `${tooltipPosition.y}px`,
                  transform: tooltipAbove ? 
                    'translateX(-50%) translateY(-100%)' : // Above button
                    'translateX(-50%)', // Below button
                }}
              >
                <DOCXPreviewTooltip
                  docxUrl={fileUrl}
                  paragraphIndex={citation.snippet.paragraphIndex}
                  startIndex={citation.snippet.startIndex}
                  endIndex={citation.snippet.endIndex}
                  isVisible={true}
                />
              </div>
            ) : null
          )}
        </div>
      ))}
    </div>
  );
};

export default CitationDisplay; 