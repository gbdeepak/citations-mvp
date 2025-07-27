import React, { useEffect, useRef, useState } from 'react';
import mammoth from 'mammoth';

interface DOCXPreviewTooltipProps {
  docxUrl: string;
  paragraphIndex: number;
  startIndex: number;
  endIndex: number;
  isVisible: boolean;
}

interface TextLine {
  text: string;
  paragraphIndex: number;
  startIndex: number;
  endIndex: number;
}

const DOCXPreviewTooltip: React.FC<DOCXPreviewTooltipProps> = ({
  docxUrl,
  paragraphIndex,
  startIndex,
  endIndex,
  isVisible
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextLines, setContextLines] = useState<string[]>([]);
  const [highlightedLineIndex, setHighlightedLineIndex] = useState<number>(1);

  // Cache for extracted text
  const textCache = useRef<Map<string, TextLine[]>>(new Map());
  // Flag to prevent multiple extractions
  const isExtracting = useRef(false);

  // Debug logging for component props
  useEffect(() => {
    console.log('[DOCXPreviewTooltip] Component props:', {
      docxUrl,
      paragraphIndex,
      startIndex,
      endIndex,
      isVisible,
      loading,
      error,
      contextLines: contextLines.length
    });
  }, [docxUrl, paragraphIndex, startIndex, endIndex, isVisible, loading, error, contextLines]);

  useEffect(() => {
    console.log('[DOCXPreviewTooltip] useEffect triggered:', {
      isVisible,
      docxUrl: !!docxUrl,
      isExtracting: isExtracting.current,
      contextLines: contextLines.length
    });

    if (!isVisible || !docxUrl || isExtracting.current) {
      console.log('[DOCXPreviewTooltip] Early return:', {
        reason: !isVisible ? 'not visible' : !docxUrl ? 'no docxUrl' : 'already extracting'
      });
      return;
    }

    const extractContext = async () => {
      if (isExtracting.current) {
        console.log('[DOCXPreviewTooltip] Already extracting, skipping');
        return;
      }

      isExtracting.current = true;
      console.log('[DOCXPreviewTooltip] Starting text extraction');

      try {
        setLoading(true);
        setError(null);

        // Log the DOCX URL and parameters for debugging
        console.log('[DOCXPreviewTooltip] Attempting to extract text context:', { docxUrl, paragraphIndex, startIndex, endIndex });

        // Check cache first
        const cacheKey = `${docxUrl}`;
        const cachedTextLines = textCache.current.get(cacheKey);
        
        if (cachedTextLines) {
          console.log('[DOCXPreviewTooltip] Using cached text lines');
          const context = extractContextFromLines(cachedTextLines, paragraphIndex);
          setContextLines(context.lines);
          setHighlightedLineIndex(context.highlightedIndex);
          setLoading(false);
          return;
        }

        console.log('[DOCXPreviewTooltip] Loading DOCX document...');
        // Fetch and extract text from DOCX
        const response = await fetch(docxUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch DOCX: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        
        if (result.messages.length > 0) {
          console.warn('DOCX processing messages:', result.messages);
        }

        const text = result.value;
        const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
        
        console.log('[DOCXPreviewTooltip] Found paragraphs:', paragraphs.length);

        // Convert to TextLine array
        const textLines: TextLine[] = [];
        paragraphs.forEach((paragraph, idx) => {
          // Split paragraph into sentences
          const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
          
          sentences.forEach((sentence, sentenceIndex) => {
            const trimmedSentence = sentence.trim();
            if (trimmedSentence.length >= 5) {
              textLines.push({
                text: trimmedSentence,
                paragraphIndex: idx,
                startIndex: sentenceIndex,
                endIndex: sentenceIndex + 1,
              });
            }
          });
        });

        // Cache the text lines
        textCache.current.set(cacheKey, textLines);
        console.log('[DOCXPreviewTooltip] Text lines cached:', textLines.length);

        // Extract context around the target paragraph
        // Try text-based search first, then fall back to paragraph-based
        let context;
        if (docxUrl) {
          // Extract the target text from the URL (it's passed as the docx parameter)
          const urlParams = new URLSearchParams(docxUrl.split('?')[1] || '');
          const targetText = urlParams.get('docx');
          if (targetText) {
            context = findTextContext(textLines, targetText);
            console.log('[DOCXPreviewTooltip] Using text-based context search for:', targetText);
          } else {
            context = extractContextFromLines(textLines, paragraphIndex);
            console.log('[DOCXPreviewTooltip] Using paragraph-based context search');
          }
        } else {
          context = extractContextFromLines(textLines, paragraphIndex);
          console.log('[DOCXPreviewTooltip] Using paragraph-based context search');
        }
        
        setContextLines(context.lines);
        setHighlightedLineIndex(context.highlightedIndex);
        
        console.log('[DOCXPreviewTooltip] Context extracted successfully');
      } catch (error) {
        setError('Failed to extract text context');
        console.error('[DOCXPreviewTooltip] Error extracting text context:', {
          docxUrl,
          paragraphIndex,
          startIndex,
          endIndex,
          error
        });
        if (error instanceof Error) {
          console.error('Mammoth error:', error.message);
        } else {
          console.error('Mammoth error (non-Error object):', error);
        }
      } finally {
        setLoading(false);
        isExtracting.current = false;
        console.log('[DOCXPreviewTooltip] Text extraction finished');
      }
    };

    extractContext();
  }, [docxUrl, paragraphIndex, startIndex, endIndex, isVisible]);

  // Helper function to extract context lines around the target paragraph
  const extractContextFromLines = (textLines: TextLine[], targetParagraphIndex: number): { lines: string[], highlightedIndex: number } => {
    // Find lines from the target paragraph
    const targetLines = textLines.filter(line => line.paragraphIndex === targetParagraphIndex);
    
    if (targetLines.length === 0) {
      return { lines: ['Text not found'], highlightedIndex: 0 };
    }

    // Get the target line (use startIndex to find the specific sentence)
    const targetLine = targetLines.find(line => line.startIndex === startIndex) || targetLines[0];

    // Extract context: one line before, target line, one line after
    const contextLines: string[] = [];
    let contextHighlightedIndex = 1; // Default to middle position

    // Add line before (if available)
    const linesBefore = textLines.filter(line => line.paragraphIndex === targetParagraphIndex - 1);
    if (linesBefore.length > 0) {
      contextLines.push(linesBefore[linesBefore.length - 1].text);
    } else {
      contextLines.push(''); // Empty line if no previous paragraph
      contextHighlightedIndex = 0; // Adjust index
    }

    // Add target line
    contextLines.push(targetLine.text);

    // Add line after (if available)
    const linesAfter = textLines.filter(line => line.paragraphIndex === targetParagraphIndex + 1);
    if (linesAfter.length > 0) {
      contextLines.push(linesAfter[0].text);
    } else {
      contextLines.push(''); // Empty line if no next paragraph
    }

    return { lines: contextLines, highlightedIndex: contextHighlightedIndex };
  };

  // Alternative: search for the actual text content
  const findTextContext = (textLines: TextLine[], searchText: string): { lines: string[], highlightedIndex: number } => {
    // Normalize search text - remove quotes and extra whitespace
    const normalizedSearchText = searchText
      .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Find the line that contains our target text
    const targetLine = textLines.find(line => {
      const normalizedLineText = line.text
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      return normalizedLineText.toLowerCase().includes(normalizedSearchText.toLowerCase());
    });

    if (!targetLine) {
      return { lines: ['Text not found'], highlightedIndex: 0 };
    }

    // Extract just the specific text that matches our search
    const textContent = targetLine.text;
    const normalizedTextContent = textContent.replace(/\s+/g, ' ').trim();
    const normalizedSearchLower = normalizedSearchText.toLowerCase();
    const normalizedTextLower = normalizedTextContent.toLowerCase();
    
    const startIndex = normalizedTextLower.indexOf(normalizedSearchLower);
    if (startIndex === -1) {
      return { lines: ['Text not found'], highlightedIndex: 0 };
    }
    
    // Map back to original text positions
    let originalStartIndex = 0;
    let originalEndIndex = 0;
    let normalizedPos = 0;
    
    // Find the actual positions in the original text
    for (let i = 0; i < textContent.length; i++) {
      if (normalizedPos === startIndex) {
        originalStartIndex = i;
      }
      if (normalizedPos === startIndex + normalizedSearchText.length) {
        originalEndIndex = i;
        break;
      }
      
      // Skip extra whitespace in normalized version
      if (textContent[i] === ' ' && textContent[i + 1] === ' ') {
        continue;
      }
      normalizedPos++;
    }
    
    // If we didn't find the end, use the search text length as fallback
    if (originalEndIndex === 0) {
      originalEndIndex = originalStartIndex + normalizedSearchText.length;
    }
    
    const beforeText = textContent.substring(0, originalStartIndex);
    const targetText = textContent.substring(originalStartIndex, originalEndIndex);
    const afterText = textContent.substring(originalEndIndex);
    
    // Show: before text, target text, after text
    const contextLines: string[] = [
      beforeText || '\u00A0',
      targetText,
      afterText || '\u00A0'
    ];
    const highlightedIndex = 1; // Middle line is highlighted

    return { lines: contextLines, highlightedIndex };
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
              Paragraph {paragraphIndex + 1}
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

export default DOCXPreviewTooltip; 