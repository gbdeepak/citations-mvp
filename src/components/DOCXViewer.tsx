import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { renderAsync } from 'docx-preview';

interface DOCXViewerProps {}

interface HighlightParams {
  docx: string;
  docxUrl: string;
  type?: string;
  multiline?: string;
}

const DOCXViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [highlightParams, setHighlightParams] = useState<HighlightParams | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [containerReady, setContainerReady] = useState(false);

  // Get URL parameters
  const [searchParams] = useSearchParams();
  const docxUrl = searchParams.get('docxUrl');
  const docxText = searchParams.get('docx');
  const docxType = searchParams.get('type');
  const isMultiLine = searchParams.get('multiline') === 'true';

  // Initialize component and load DOCX
  useEffect(() => {
    setIsMounted(true);
    
    if (docxUrl && docxText) {
      console.log('[DOCXViewer] Initializing with URL params:', { docxUrl, docxText, docxType, isMultiLine });
      setHighlightParams({
        docx: docxText,
        docxUrl: docxUrl,
        type: docxType || undefined,
        multiline: isMultiLine ? 'true' : undefined,
      });
    } else {
      console.log('[DOCXViewer] Missing required URL parameters');
      setError('Missing required parameters');
      setIsLoading(false);
    }
  }, [docxUrl, docxText, docxType, isMultiLine]);

  // Load DOCX when highlight params are set
  useEffect(() => {
    if (highlightParams && isMounted) {
      loadDOCX();
    }
  }, [highlightParams, isMounted]);

  // Callback ref to ensure container is ready
  const setContainerRef = (element: HTMLDivElement | null) => {
    containerRef.current = element;
    if (element) {
      console.log('[DOCXViewer] Container ref set successfully');
      setContainerReady(true);
    } else {
      console.log('[DOCXViewer] Container ref cleared');
      setContainerReady(false);
    }
  };

  // Load DOCX file
  const loadDOCX = async (docxUrl?: string) => {
    const urlToLoad = docxUrl || highlightParams?.docxUrl;
    if (!urlToLoad) {
      console.log('[DOCXViewer] No DOCX URL provided');
      return;
    }

    // Wait for container to be available with retry mechanism
    let attempts = 0;
    const maxAttempts = 20;
    
    while (!containerReady && attempts < maxAttempts) {
      console.log(`[DOCXViewer] Waiting for container... attempt ${attempts + 1}`);
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!containerReady) {
      console.error('[DOCXViewer] Container not available after waiting');
      setError('Container not available');
      setIsLoading(false);
      return;
    }

    if (!isMounted) {
      console.log('[DOCXViewer] Component not mounted');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setDebugInfo('Loading DOCX file...');

      // Fetch the DOCX file
      console.log('[DOCXViewer] Fetching DOCX file...');
      const response = await fetch(urlToLoad);
      if (!response.ok) {
        throw new Error(`Failed to fetch DOCX: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log('[DOCXViewer] DOCX file loaded, size:', arrayBuffer.byteLength);

      // Render the DOCX
      console.log('[DOCXViewer] Rendering DOCX...');
      if (containerRef.current) {
        await renderAsync(arrayBuffer, containerRef.current, containerRef.current, {
          className: 'docx-content',
          inWrapper: true,
        });
      } else {
        throw new Error('Container ref is null during rendering');
      }

      console.log('[DOCXViewer] DOCX rendered successfully');
      setDebugInfo('DOCX rendered successfully');
      setIsLoading(false);

      // Add highlight after rendering
      setTimeout(() => {
        addHighlight();
      }, 100);

    } catch (error) {
      console.error('[DOCXViewer] Error loading DOCX:', error);
      setError('Failed to load DOCX file');
      setDebugInfo(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  // Calculate similarity between two strings
  const calculateSimilarity = (str1: string, str2: string): number => {
    const words1 = str1.split(' ').filter(w => w.length > 2);
    const words2 = str2.split(' ').filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    let matches = 0;
    words1.forEach(word1 => {
      if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        matches++;
      }
    });
    
    return matches / Math.max(words1.length, words2.length);
  };

  // Add highlight overlay
  const addHighlight = () => {
    if (!containerRef.current || !highlightParams) return;

    console.log('[DOCXViewer] Adding highlight...');

    // Get the target text from the URL parameters
    const targetText = highlightParams.docx; // This contains the text we're looking for
    const isMultiLine = highlightParams.multiline === 'true';
    console.log('[DOCXViewer] Looking for text:', targetText);
    console.log('[DOCXViewer] Is multi-line:', isMultiLine);

    // Normalize the target text for comparison
    const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .trim();
    };

    const normalizedTarget = normalizeText(targetText);
    console.log('[DOCXViewer] Normalized target text:', normalizedTarget);

    // Find all text nodes in the document
    const walker = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let targetNode: Text | null = null;
    let bestMatch: { node: Text; score: number } | null = null;
    let node: Node | null;

    // Search through all text nodes to find our target text
    while (node = walker.nextNode()) {
      const textNode = node as Text;
      const text = textNode.textContent || '';
      
      // For multi-line content, we need to be more flexible with matching
      if (isMultiLine) {
        // Try to find a partial match for multi-line content
        const targetWords = targetText.split(/\s+/).filter(word => word.length > 3);
        const textWords = text.split(/\s+/).filter(word => word.length > 3);
        
        let matchCount = 0;
        targetWords.forEach(targetWord => {
          if (textWords.some(textWord => 
            textWord.toLowerCase().includes(targetWord.toLowerCase()) ||
            targetWord.toLowerCase().includes(textWord.toLowerCase())
          )) {
            matchCount++;
          }
        });
        
        // If we have a good partial match (at least 3 words or 50% of target words)
        if (matchCount >= Math.min(3, targetWords.length) || matchCount >= targetWords.length * 0.5) {
          targetNode = textNode;
          console.log('[DOCXViewer] Found multi-line partial match in node:', text.substring(0, 100));
          break;
        }
      } else {
        // Try exact match first for single-line content
        if (text.includes(targetText)) {
          targetNode = textNode;
          console.log('[DOCXViewer] Found exact text match in node:', text.substring(0, 100));
          break;
        }

        // Try normalized match
        const normalizedText = normalizeText(text);
        if (normalizedText.includes(normalizedTarget)) {
          targetNode = textNode;
          console.log('[DOCXViewer] Found normalized text match in node:', text.substring(0, 100));
          break;
        }
      }

      // Calculate similarity score for partial matches
      const words = normalizedTarget.split(' ').filter((w: string) => w.length > 3); // Only consider words longer than 3 chars
      const textWords = normalizeText(text).split(' ').filter((w: string) => w.length > 3);
      
      let matchScore = 0;
      words.forEach((word: string) => {
        if (textWords.some((textWord: string) => textWord.includes(word) || word.includes(textWord))) {
          matchScore += 1;
        }
      });

      if (matchScore > 0 && (!bestMatch || matchScore > bestMatch.score)) {
        bestMatch = { node: textNode, score: matchScore };
      }
    }

    // If no exact match found, use the best partial match
    if (!targetNode && bestMatch && bestMatch.score >= 2) {
      targetNode = bestMatch.node;
      console.log('[DOCXViewer] Using best partial match (score:', bestMatch.score, '):', targetNode.textContent?.substring(0, 100));
    }

    if (targetNode) {
      console.log('[DOCXViewer] Target text node found');
      
      // Try to highlight just the specific text content first
      let targetElement = targetNode.parentElement;
      
      // Try precise highlighting for any element, not just paragraphs
      if (targetElement) {
        // Create a span around the target text for more precise highlighting
        const textContent = targetNode.textContent || '';
        const targetText = highlightParams.docx;
        
        // Find the position of the target text within the text content
        const targetIndex = textContent.toLowerCase().indexOf(targetText.toLowerCase());
        
        if (targetIndex !== -1) {
          console.log('[DOCXViewer] Found target text at index:', targetIndex);
          console.log('[DOCXViewer] Text content length:', textContent.length);
          console.log('[DOCXViewer] Target text length:', targetText.length);
          
          // Create a more precise highlight by wrapping the target text in a span
          const beforeText = textContent.substring(0, targetIndex);
          const targetTextActual = textContent.substring(targetIndex, targetIndex + targetText.length);
          const afterText = textContent.substring(targetIndex + targetText.length);
          
          // Create new text nodes and span
          const beforeNode = document.createTextNode(beforeText);
          const afterNode = document.createTextNode(afterText);
          const spanNode = document.createElement('span');
          spanNode.textContent = targetTextActual;
          spanNode.style.backgroundColor = isMultiLine ? 'rgba(255, 165, 0, 0.6)' : 'rgba(255, 255, 0, 0.4)';
          spanNode.style.border = isMultiLine ? '3px solid rgba(255, 140, 0, 0.9)' : '2px solid rgba(255, 200, 0, 0.9)';
          spanNode.style.borderRadius = '4px';
          spanNode.style.padding = isMultiLine ? '4px 8px' : '2px 4px';
          spanNode.style.display = 'inline';
          spanNode.style.fontWeight = isMultiLine ? 'bold' : 'normal';
          
          // Replace the original text node with the new structure
          if (targetNode.parentNode) {
            targetNode.parentNode.replaceChild(beforeNode, targetNode);
            targetElement.insertBefore(spanNode, beforeNode.nextSibling);
            targetElement.insertBefore(afterNode, spanNode.nextSibling);
            
            // Scroll to the highlight
            spanNode.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
            
            console.log('[DOCXViewer] Precise text highlight added');
            return;
          }
        } else {
          console.log('[DOCXViewer] Target text not found at exact position, trying normalized match');
          
          // Try normalized matching for more flexible text matching
          const normalizeText = (text: string) => {
            return text
              .toLowerCase()
              .replace(/\s+/g, ' ')
              .replace(/[^\w\s]/g, '')
              .trim();
          };
          
          const normalizedTextContent = normalizeText(textContent);
          const normalizedTarget = normalizeText(targetText);
          
          // Find the best matching substring
          let bestMatch = { start: -1, length: 0, score: 0 };
          
          for (let i = 0; i < normalizedTextContent.length; i++) {
            for (let j = i + 10; j <= normalizedTextContent.length; j++) {
              const substring = normalizedTextContent.substring(i, j);
              const similarity = calculateSimilarity(substring, normalizedTarget);
              
              if (similarity > bestMatch.score) {
                bestMatch = { start: i, length: j - i, score: similarity };
              }
            }
          }
          
          if (bestMatch.score > 0.7) { // 70% similarity threshold
            console.log('[DOCXViewer] Using normalized match with score:', bestMatch.score);
            
            // Map back to original text positions
            const originalBefore = textContent.substring(0, bestMatch.start);
            const originalTarget = textContent.substring(bestMatch.start, bestMatch.start + bestMatch.length);
            const originalAfter = textContent.substring(bestMatch.start + bestMatch.length);
            
            const beforeNode = document.createTextNode(originalBefore);
            const afterNode = document.createTextNode(originalAfter);
            const spanNode = document.createElement('span');
            spanNode.textContent = originalTarget;
            spanNode.style.backgroundColor = isMultiLine ? 'rgba(255, 165, 0, 0.6)' : 'rgba(255, 255, 0, 0.4)';
            spanNode.style.border = isMultiLine ? '3px solid rgba(255, 140, 0, 0.9)' : '2px solid rgba(255, 200, 0, 0.9)';
            spanNode.style.borderRadius = '4px';
            spanNode.style.padding = isMultiLine ? '4px 8px' : '2px 4px';
            spanNode.style.display = 'inline';
            spanNode.style.fontWeight = isMultiLine ? 'bold' : 'normal';
            
            if (targetNode.parentNode) {
              targetNode.parentNode.replaceChild(beforeNode, targetNode);
              targetElement.insertBefore(spanNode, beforeNode.nextSibling);
              targetElement.insertBefore(afterNode, spanNode.nextSibling);
              
              spanNode.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
              
              console.log('[DOCXViewer] Normalized precise highlight added');
              return;
            }
          }
        }
      }
      
      // Fallback to highlighting the parent element if precise highlighting fails
      while (targetElement && targetElement !== containerRef.current) {
        if (targetElement.tagName === 'P' || targetElement.tagName === 'DIV' || targetElement.tagName === 'TD') {
          break;
        }
        targetElement = targetElement.parentElement;
      }

      if (targetElement) {
        console.log('[DOCXViewer] Target element found:', targetElement.tagName, targetElement.textContent?.substring(0, 100));
        
        // Create highlight overlay
        const highlight = document.createElement('div');
        highlight.style.position = 'absolute';
        highlight.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
        highlight.style.border = '2px solid rgba(255, 200, 0, 0.9)';
        highlight.style.borderRadius = '2px';
        highlight.style.pointerEvents = 'none';
        highlight.style.zIndex = '1000';

        // Get the actual element position
        const rect = targetElement.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        // Position the highlight over the target element
        highlight.style.left = `${rect.left - containerRect.left}px`;
        highlight.style.top = `${rect.top - containerRect.top}px`;
        highlight.style.width = `${rect.width}px`;
        highlight.style.height = `${rect.height}px`;

        containerRef.current.appendChild(highlight);

        // Scroll to the highlight
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        console.log('[DOCXViewer] Element highlight added and scrolled to target');
        console.log('[DOCXViewer] Highlight position:', {
          left: highlight.style.left,
          top: highlight.style.top,
          width: highlight.style.width,
          height: highlight.style.height
        });
      } else {
        console.warn('[DOCXViewer] Could not find parent element for target text');
      }
    } else {
      console.warn('[DOCXViewer] Target text not found in document');
      console.log('[DOCXViewer] Available text nodes:');
      
      // Log all text nodes for debugging
      const allWalker = document.createTreeWalker(
        containerRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );
      let allNode: Node | null;
      let nodeCount = 0;
      while ((allNode = allWalker.nextNode()) && nodeCount < 10) {
        const text = allNode.textContent || '';
        if (text.trim().length > 20) {
          console.log(`[DOCXViewer] Text node ${nodeCount}:`, text.substring(0, 100));
          nodeCount++;
        }
      }
      
      // Fallback: highlight the first substantial paragraph
      const paragraphs = containerRef.current.querySelectorAll('p');
      if (paragraphs.length > 0) {
        const firstParagraph = paragraphs[0];
        const highlight = document.createElement('div');
        highlight.style.position = 'absolute';
        highlight.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
        highlight.style.border = '2px solid rgba(255, 200, 0, 0.9)';
        highlight.style.borderRadius = '2px';
        highlight.style.pointerEvents = 'none';
        highlight.style.zIndex = '1000';

        const rect = firstParagraph.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        highlight.style.left = `${rect.left - containerRect.left}px`;
        highlight.style.top = `${rect.top - containerRect.top}px`;
        highlight.style.width = `${rect.width}px`;
        highlight.style.height = `${rect.height}px`;

        containerRef.current.appendChild(highlight);
        firstParagraph.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Component mount effect and URL parameter extraction
  useEffect(() => {
    setIsMounted(true);
    console.log('[DOCXViewer] Component mounted');
    
    // Extract URL parameters immediately
    const params = new URLSearchParams(window.location.search);
    const docxUrl = params.get('docxUrl');
    const targetText = params.get('docx');
    
    console.log('[DOCXViewer] URL params:', { docxUrl, targetText });

    if (docxUrl) {
      console.log('[DOCXViewer] Setting highlight params:', { docx: targetText || '', docxUrl });
      setHighlightParams({ docx: targetText || '', docxUrl });
    } else {
      console.error('[DOCXViewer] No docxUrl found in URL parameters');
    }
  }, []);

  // Load DOCX when component is ready and highlightParams are set
  useEffect(() => {
    console.log('[DOCXViewer] useEffect triggered:', { isMounted, highlightParams: !!highlightParams, containerReady });
    
    if (isMounted && highlightParams && containerReady) {
      console.log('[DOCXViewer] Component ready, loading DOCX...');
      loadDOCX();
    }
  }, [isMounted, highlightParams, containerReady]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">DOCX Viewer</h1>
          {highlightParams && (
            <p className="text-sm text-gray-600">
              Highlighting paragraph {highlightParams.docx}
            </p>
          )}
        </div>

        {/* Debug Info - Always show */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Debug Info:</h3>
          <p className="text-sm text-blue-700">
            Component mounted: {isMounted ? 'Yes' : 'No'}
          </p>
          <p className="text-sm text-blue-700">
            Container ref available: {containerReady ? 'Yes' : 'No'}
          </p>
          <p className="text-sm text-blue-700">
            Highlight params: {highlightParams ? 'Yes' : 'No'}
          </p>
          <p className="text-sm text-blue-700">
            Loading: {isLoading ? 'Yes' : 'No'}
          </p>
          <p className="text-sm text-blue-700">
            Debug Info: {debugInfo}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading DOCX document...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 font-medium mb-2">Error Loading Document</div>
            <div className="text-red-500 text-sm">{error}</div>
          </div>
        )}

        {/* Document Container - Always render this */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div
            ref={setContainerRef}
            className="docx-container p-8 min-h-[800px] relative border-2 border-dashed border-gray-300"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {!isLoading && !error && (
              <div className="text-center text-gray-500 py-8">
                <p>Document container ready</p>
                <p className="text-sm">Container ref: {containerReady ? 'Available' : 'Not available'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Debug Info */}
        {!isLoading && !error && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Render Debug Info:</h3>
            <p className="text-sm text-gray-600">
              Container content length: {containerRef.current?.innerHTML.length || 0}
            </p>
            <p className="text-sm text-gray-600">
              Paragraphs found: {containerRef.current?.querySelectorAll('p').length || 0}
            </p>
            <p className="text-sm text-gray-600">
              Container element: {containerRef.current ? containerRef.current.tagName : 'None'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DOCXViewer; 