import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

interface PDFPreviewTooltipProps {
  pdfUrl: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isVisible: boolean;
}

interface TextLine {
  text: string;
  y: number;
  x: number;
  width: number;
  height: number;
}

const PDFPreviewTooltip: React.FC<PDFPreviewTooltipProps> = ({
  pdfUrl,
  page,
  x,
  y,
  width,
  height,
  isVisible
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextLines, setContextLines] = useState<string[]>([]);
  const [highlightedLineIndex, setHighlightedLineIndex] = useState<number>(1); // Middle line (0=before, 1=highlighted, 2=after)

  // Cache for extracted text
  const textCache = useRef<Map<string, TextLine[]>>(new Map());
  // Flag to prevent multiple extractions
  const isExtracting = useRef(false);

  // Debug logging for component props
  useEffect(() => {
    console.log('[PDFPreviewTooltip] Component props:', {
      pdfUrl,
      page,
      x,
      y,
      width,
      height,
      isVisible,
      loading,
      error,
      contextLines: contextLines.length
    });
  }, [pdfUrl, page, x, y, width, height, isVisible, loading, error, contextLines]);

  useEffect(() => {
    console.log('[PDFPreviewTooltip] useEffect triggered:', {
      isVisible,
      pdfUrl: !!pdfUrl,
      isExtracting: isExtracting.current,
      contextLines: contextLines.length
    });

    if (!isVisible || !pdfUrl || isExtracting.current) {
      console.log('[PDFPreviewTooltip] Early return:', {
        reason: !isVisible ? 'not visible' : !pdfUrl ? 'no pdfUrl' : 'already extracting'
      });
      return;
    }

    const extractContext = async () => {
      if (isExtracting.current) {
        console.log('[PDFPreviewTooltip] Already extracting, skipping');
        return;
      }

      isExtracting.current = true;
      console.log('[PDFPreviewTooltip] Starting text extraction');

      try {
        setLoading(true);
        setError(null);

        // Log the PDF URL and page for debugging
        console.log('[PDFPreviewTooltip] Attempting to extract text context:', { pdfUrl, page, x, y, width, height });

        // Check cache first
        const cacheKey = `${pdfUrl}-${page}`;
        const cachedTextLines = textCache.current.get(cacheKey);
        
        if (cachedTextLines) {
          console.log('[PDFPreviewTooltip] Using cached text lines');
          const context = extractContextFromLines(cachedTextLines, y, height);
          setContextLines(context.lines);
          setHighlightedLineIndex(context.highlightedIndex);
          setLoading(false);
          return;
        }

        console.log('[PDFPreviewTooltip] Loading PDF document...');
        // Load PDF and extract text
        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        console.log('[PDFPreviewTooltip] PDF loaded, getting page...');
        const pdfPage = await pdf.getPage(page);
        
        console.log('[PDFPreviewTooltip] Extracting text content...');
        const textContent = await pdfPage.getTextContent();
        
        // Group text items by their y-coordinate (same line) with tolerance
        const lines: { [key: number]: any[] } = {};
        const tolerance = 2; // Tolerance in points for grouping items on the same line
        
        textContent.items.forEach((item: any) => {
          if (item.str && item.str.trim().length > 0) {
            const y = Math.round(item.transform[5] / tolerance) * tolerance; // Round with tolerance
            if (!lines[y]) {
              lines[y] = [];
            }
            lines[y].push(item);
          }
        });

        // Convert to TextLine array
        const textLines: TextLine[] = [];
        Object.keys(lines).forEach(yKey => {
          const y = parseInt(yKey);
          const lineItems = lines[y];
          
          // Sort items by x-coordinate to maintain reading order
          lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
          
          let combinedText = '';
          let minX = Infinity;
          let maxX = -Infinity;
          let maxHeight = 0;

          lineItems.forEach((item: any) => {
            combinedText += item.str + ' ';
            minX = Math.min(minX, item.transform[4]);
            maxX = Math.max(maxX, item.transform[4] + item.width);
            maxHeight = Math.max(maxHeight, item.height);
          });

          combinedText = combinedText.trim();
          
          // Only include meaningful text lines (at least 5 characters)
          if (combinedText.length >= 5) {
            textLines.push({
              text: combinedText,
              y: y,
              x: minX,
              width: maxX - minX,
              height: maxHeight,
            });
          }
        });

        // Sort by Y coordinate (top to bottom)
        textLines.sort((a, b) => b.y - a.y);

        // Cache the text lines
        textCache.current.set(cacheKey, textLines);
        console.log('[PDFPreviewTooltip] Text lines cached:', textLines.length);

        // Extract context around the highlighted area
        const context = extractContextFromLines(textLines, y, height);
        setContextLines(context.lines);
        setHighlightedLineIndex(context.highlightedIndex);
        
        console.log('[PDFPreviewTooltip] Context extracted successfully');
      } catch (error) {
        setError('Failed to extract text context');
        console.error('[PDFPreviewTooltip] Error extracting text context:', {
          pdfUrl,
          page,
          x,
          y,
          width,
          height,
          error
        });
        if (error instanceof Error) {
          console.error('PDF.js error:', error.message);
        } else {
          console.error('PDF.js error (non-Error object):', error);
        }
      } finally {
        setLoading(false);
        isExtracting.current = false;
        console.log('[PDFPreviewTooltip] Text extraction finished');
      }
    };

    extractContext();
  }, [pdfUrl, page, x, y, width, height, isVisible]);

  // Helper function to extract context lines around the highlighted area
  const extractContextFromLines = (textLines: TextLine[], targetY: number, targetHeight: number): { lines: string[], highlightedIndex: number } => {
    // Find the line that contains the highlighted area
    let highlightedLineIndex = -1;
    for (let i = 0; i < textLines.length; i++) {
      const line = textLines[i];
      // Check if the highlighted area overlaps with this line
      if (Math.abs(line.y - targetY) < 5 && // Within 5 points vertically
          Math.abs((line.y + line.height) - (targetY + targetHeight)) < 5) {
        highlightedLineIndex = i;
        break;
      }
    }

    // If we can't find an exact match, find the closest line
    if (highlightedLineIndex === -1) {
      let minDistance = Infinity;
      for (let i = 0; i < textLines.length; i++) {
        const line = textLines[i];
        const distance = Math.abs(line.y - targetY);
        if (distance < minDistance) {
          minDistance = distance;
          highlightedLineIndex = i;
        }
      }
    }

    // Extract context: one line before, highlighted line, one line after
    const contextLines: string[] = [];
    let contextHighlightedIndex = 1; // Default to middle position

    if (highlightedLineIndex >= 0) {
      // Add line before (if available)
      if (highlightedLineIndex < textLines.length - 1) {
        contextLines.push(textLines[highlightedLineIndex + 1].text);
      } else {
        contextLines.push(''); // Empty line if no previous line
        contextHighlightedIndex = 0; // Adjust index
      }

      // Add highlighted line
      contextLines.push(textLines[highlightedLineIndex].text);

      // Add line after (if available)
      if (highlightedLineIndex > 0) {
        contextLines.push(textLines[highlightedLineIndex - 1].text);
      } else {
        contextLines.push(''); // Empty line if no next line
      }
    } else {
      // Fallback: just show the highlighted line
      contextLines.push('');
      contextLines.push('Text not found');
      contextLines.push('');
    }

    return { lines: contextLines, highlightedIndex: contextHighlightedIndex };
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 w-96 top-full left-0 mt-2">
      <div className="relative">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Loading preview...</span>
          </div>
        )}
        
        {error && (
          <div className="text-red-600 text-sm text-center py-2">
            Failed to load preview
          </div>
        )}
        
        {!loading && !error && contextLines.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-gray-500 mb-2 text-center">
              Page {page}
            </div>
            {contextLines.map((line, index) => (
              <div
                key={index}
                className={`text-sm leading-relaxed whitespace-normal ${
                  index === highlightedLineIndex
                    ? 'bg-yellow-200 px-2 py-1 rounded font-medium'
                    : 'text-gray-700'
                }`}
              >
                {line || '\u00A0'} {/* Use non-breaking space for empty lines */}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFPreviewTooltip; 