import mammoth from 'mammoth';

export interface DOCXTextSnippet {
  text: string;
  paragraphIndex: number;
  startIndex: number;
  endIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DOCXCitation {
  id: string;
  snippet: DOCXTextSnippet;
}

export async function extractTextFromDOCX(file: File): Promise<DOCXTextSnippet[]> {
  try {
    console.log('[DOCXUtils] Starting DOCX text extraction for file:', file.name, 'size:', file.size);
    
    const arrayBuffer = await file.arrayBuffer();
    console.log('[DOCXUtils] File converted to ArrayBuffer, size:', arrayBuffer.byteLength);
    
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    console.log('[DOCXUtils] Mammoth extraction completed');
    console.log('[DOCXUtils] Raw text length:', result.value.length);
    console.log('[DOCXUtils] Messages:', result.messages);
    
    if (result.messages.length > 0) {
      console.warn('DOCX processing messages:', result.messages);
    }

    const text = result.value;
    const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
    
    console.log('[DOCXUtils] Found paragraphs:', paragraphs.length);
    
    const snippets: DOCXTextSnippet[] = [];
    
    paragraphs.forEach((paragraph, paragraphIndex) => {
      // Only create snippets for paragraphs with substantial content
      if (paragraph.trim().length < 10) {
        return;
      }

      // Split paragraph into sentences or meaningful chunks
      const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      sentences.forEach((sentence, sentenceIndex) => {
        const trimmedSentence = sentence.trim();
        if (trimmedSentence.length >= 15) { // Minimum length for meaningful snippets
          snippets.push({
            text: trimmedSentence,
            paragraphIndex,
            startIndex: sentenceIndex,
            endIndex: sentenceIndex + 1,
            // Use more realistic coordinates that better match rendered paragraphs
            x: 0, // Start from left margin
            y: paragraphIndex * 25, // More realistic paragraph spacing
            width: Math.min(trimmedSentence.length * 7, 800), // Cap width for readability
            height: 20, // Standard line height
          });
        }
      });

      // If no sentences were long enough, create a snippet from the whole paragraph
      if (paragraph.trim().length >= 15 && sentences.length === 0) {
        snippets.push({
          text: paragraph.trim(),
          paragraphIndex,
          startIndex: 0,
          endIndex: 1,
          x: 0,
          y: paragraphIndex * 25,
          width: Math.min(paragraph.length * 7, 800),
          height: 20,
        });
      }
    });

    console.log('[DOCXUtils] Created snippets:', snippets.length);
    console.log('[DOCXUtils] Sample snippets:', snippets.slice(0, 3).map(s => ({
      text: s.text.substring(0, 50),
      paragraphIndex: s.paragraphIndex,
      startIndex: s.startIndex
    })));

    return snippets;
  } catch (error) {
    console.error('[DOCXUtils] Error extracting text from DOCX:', error);
    throw new Error(`Failed to extract text from DOCX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getRandomDOCXSnippets(snippets: DOCXTextSnippet[], count: number = 3): DOCXTextSnippet[] {
  if (snippets.length <= count) {
    return snippets;
  }

  const shuffled = [...snippets].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function createDOCXHighlightURL(docxUrl: string, snippet: DOCXTextSnippet): string {
  const params = new URLSearchParams({
    docx: snippet.text, // Pass the actual text content instead of paragraph indices
    docxUrl: docxUrl, // Pass the original DOCX URL separately
  });
  
  return `/docx-viewer?${params.toString()}`;
}

export function createDOCXCitations(snippets: DOCXTextSnippet[]): DOCXCitation[] {
  return snippets.map((snippet, index) => ({
    id: `docx-citation-${index}-${Date.now()}`,
    snippet,
  }));
} 