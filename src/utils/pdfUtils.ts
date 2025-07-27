import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker - use local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

export interface TextSnippet {
  text: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Citation {
  id: string;
  text: string;
  snippet: TextSnippet;
}

export async function extractTextFromPDF(file: File): Promise<TextSnippet[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const snippets: TextSnippet[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
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

    // Process each line to create meaningful text chunks
    Object.keys(lines).forEach(yKey => {
      const y = parseInt(yKey);
      const lineItems = lines[y];
      
      // Sort items by x-coordinate to maintain reading order
      lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
      
      // Combine text from items on the same line
      let combinedText = '';
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let totalWidth = 0;
      let maxHeight = 0;

      lineItems.forEach((item: any) => {
        combinedText += item.str + ' ';
        minX = Math.min(minX, item.transform[4]);
        maxX = Math.max(maxX, item.transform[4] + item.width);
        minY = Math.min(minY, item.transform[5]);
        maxY = Math.max(maxY, item.transform[5] + item.height);
        totalWidth += item.width;
        maxHeight = Math.max(maxHeight, item.height);
      });

      // Clean up the combined text
      combinedText = combinedText.trim();
      
      // Only include meaningful text chunks (at least 15 characters)
      if (combinedText.length >= 15) {
        snippets.push({
          text: combinedText,
          page: pageNum,
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxHeight,
        });
      }
    });
  }

  return snippets;
}

export function getRandomSnippets(snippets: TextSnippet[], count: number = 3): TextSnippet[] {
  const shuffled = [...snippets].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function createHighlightURL(pdfUrl: string, snippet: TextSnippet): string {
  // Create a URL that will highlight the text when the PDF is opened
  const params = new URLSearchParams({
    page: snippet.page.toString(),
    x: snippet.x.toString(),
    y: snippet.y.toString(),
    width: snippet.width.toString(),
    height: snippet.height.toString(),
  });
  
  return `${pdfUrl}#${params.toString()}`;
} 

export function createCitations(snippets: TextSnippet[]): Citation[] {
  return snippets.map((snippet, index) => ({
    id: `citation-${index}-${Date.now()}`,
    text: snippet.text,
    snippet: snippet,
  }));
} 