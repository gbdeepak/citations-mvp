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

// Enhanced interface for multi-line snippets
export interface MultiLineTextSnippet {
  text: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  lines: TextLine[];
  type: 'paragraph' | 'list' | 'table' | 'heading' | 'mixed';
}

export interface TextLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  isListItem?: boolean;
  indentLevel?: number;
}

export interface Citation {
  id: string;
  text: string;
  snippet: TextSnippet;
}

export interface MultiLineCitation {
  id: string;
  text: string;
  snippet: MultiLineTextSnippet;
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

// New function for multi-line extraction
export async function extractMultiLineTextFromPDF(file: File): Promise<MultiLineTextSnippet[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const multiLineSnippets: MultiLineTextSnippet[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // First pass: collect all text items with their properties
    const textItems: Array<{
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fontSize: number;
      transform: number[];
    }> = [];

    textContent.items.forEach((item: any) => {
      if (item.str && item.str.trim().length > 0) {
        textItems.push({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height,
          fontSize: item.height, // Use height as approximate font size
          transform: item.transform,
        });
      }
    });

    // Group items by proximity and structure
    const groupedBlocks = groupTextItemsIntoBlocks(textItems);
    
    // Convert blocks to multi-line snippets
    groupedBlocks.forEach(block => {
      if (block.lines.length > 0 && block.totalText.length >= 15) {
        multiLineSnippets.push({
          text: block.totalText,
          page: pageNum,
          x: block.minX,
          y: block.minY,
          width: block.maxX - block.minX,
          height: block.maxY - block.minY,
          lines: block.lines,
          type: determineBlockType(block.lines),
        });
      }
    });
  }

  return multiLineSnippets;
}

// Helper function to group text items into logical blocks
function groupTextItemsIntoBlocks(textItems: Array<{
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  transform: number[];
}>) {
  type TextBlock = {
    lines: TextLine[];
    totalText: string;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };

  const blocks: TextBlock[] = [];

  // Sort items by y-coordinate (top to bottom), then by x-coordinate (left to right)
  const sortedItems = [...textItems].sort((a, b) => {
    if (Math.abs(a.y - b.y) < 5) { // Same line tolerance
      return a.x - b.x;
    }
    return b.y - a.y; // Top to bottom
  });

  let currentBlock: TextBlock | null = null;

  const lineTolerance = 8; // Tolerance for grouping items on the same line
  const blockTolerance = 25; // Tolerance for grouping lines into the same block

  sortedItems.forEach(item => {
    if (!currentBlock) {
      // Start new block
      currentBlock = {
        lines: [{
          text: item.text,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          fontSize: item.fontSize,
          isListItem: isListItem(item.text, item.x),
          indentLevel: getIndentLevel(item.x),
        }],
        totalText: item.text,
        minX: item.x,
        maxX: item.x + item.width,
        minY: item.y,
        maxY: item.y + item.height,
      };
    } else {
      // Check if this item belongs to the current block
      const lastLine = currentBlock.lines[currentBlock.lines.length - 1];
      const yDistance = Math.abs(item.y - lastLine.y);
      const xDistance = Math.abs(item.x - lastLine.x);

      if (yDistance <= lineTolerance) {
        // Same line - append to current line
        lastLine.text += ' ' + item.text;
        lastLine.width = Math.max(lastLine.width, item.x + item.width - lastLine.x);
      } else if (yDistance <= blockTolerance && xDistance <= 100) {
        // New line in same block
        currentBlock.lines.push({
          text: item.text,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          fontSize: item.fontSize,
          isListItem: isListItem(item.text, item.x),
          indentLevel: getIndentLevel(item.x),
        });
        currentBlock.totalText += '\n' + item.text;
        currentBlock.minX = Math.min(currentBlock.minX, item.x);
        currentBlock.maxX = Math.max(currentBlock.maxX, item.x + item.width);
        currentBlock.minY = Math.min(currentBlock.minY, item.y);
        currentBlock.maxY = Math.max(currentBlock.maxY, item.y + item.height);
      } else {
        // New block
        if (currentBlock.lines.length > 0) {
          blocks.push(currentBlock);
        }
        currentBlock = {
          lines: [{
            text: item.text,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            fontSize: item.fontSize,
            isListItem: isListItem(item.text, item.x),
            indentLevel: getIndentLevel(item.x),
          }],
          totalText: item.text,
          minX: item.x,
          maxX: item.x + item.width,
          minY: item.y,
          maxY: item.y + item.height,
        };
      }
    }
  });

  // Add the last block
  if (currentBlock !== null && (currentBlock as TextBlock).lines.length > 0) {
    blocks.push(currentBlock as TextBlock);
  }

  return blocks;
}

// Helper function to detect list items
function isListItem(text: string, x: number): boolean {
  const trimmedText = text.trim();
  const listPatterns = [
    /^[\u2022\u2023\u25E6\u2043\u2219\u00B7\u25AA\u25AB\u25CF\u25CB\u25A1\u25A0\u25B2\u25BC\u25C6\u25C7\u25C8\u25C9\u25CA\u25CB\u25CC\u25CD\u25CE\u25CF\u25D0\u25D1\u25D2\u25D3\u25D4\u25D5\u25D6\u25D7\u25D8\u25D9\u25DA\u25DB\u25DC\u25DD\u25DE\u25DF\u25E0\u25E1\u25E2\u25E3\u25E4\u25E5\u25E6\u25E7\u25E8\u25E9\u25EA\u25EB\u25EC\u25ED\u25EE\u25EF\u25F0\u25F1\u25F2\u25F3\u25F4\u25F5\u25F6\u25F7\u25F8\u25F9\u25FA\u25FB\u25FC\u25FD\u25FE\u25FF]/,
    /^\d+\./,
    /^[a-zA-Z]\./,
    /^[ivxlcdm]+\./i, // Roman numerals
  ];
  
  return listPatterns.some(pattern => pattern.test(trimmedText));
}

// Helper function to determine indent level
function getIndentLevel(x: number): number {
  // Simple heuristic: every 20 points of indentation is a level
  return Math.floor(x / 20);
}

// Helper function to determine block type
function determineBlockType(lines: TextLine[]): 'paragraph' | 'list' | 'table' | 'heading' | 'mixed' {
  const listItemCount = lines.filter(line => line.isListItem).length;
  const totalLines = lines.length;
  
  if (listItemCount > totalLines * 0.5) {
    return 'list';
  } else if (totalLines === 1 && lines[0]?.fontSize && lines[0].fontSize > 14) {
    return 'heading';
  } else if (totalLines > 3 && hasTableStructure(lines)) {
    return 'table';
  } else {
    return 'paragraph';
  }
}

// Helper function to detect table structure
function hasTableStructure(lines: TextLine[]): boolean {
  // Simple heuristic: check for consistent spacing patterns
  if (lines.length < 2) return false;
  
  const xPositions = lines.map(line => line.x);
  const uniqueXPositions = Array.from(new Set(xPositions));
  
  // If we have multiple distinct x-positions, it might be a table
  return uniqueXPositions.length > 2;
}

export function getRandomSnippets(snippets: TextSnippet[], count: number = 3): TextSnippet[] {
  const shuffled = [...snippets].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function getRandomMultiLineSnippets(snippets: MultiLineTextSnippet[], count: number = 3): MultiLineTextSnippet[] {
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

export function createMultiLineHighlightURL(pdfUrl: string, snippet: MultiLineTextSnippet): string {
  // Create a URL that will highlight the multi-line text when the PDF is opened
  const params = new URLSearchParams({
    page: snippet.page.toString(),
    x: snippet.x.toString(),
    y: snippet.y.toString(),
    width: snippet.width.toString(),
    height: snippet.height.toString(),
    type: snippet.type,
    lines: JSON.stringify(snippet.lines.map(line => ({
      text: line.text,
      x: line.x,
      y: line.y,
      width: line.width,
      height: line.height,
    }))),
  });
  
  return `/viewer?pdf=${encodeURIComponent(pdfUrl)}&${params.toString()}`;
}

export function createCitations(snippets: TextSnippet[]): Citation[] {
  return snippets.map((snippet, index) => ({
    id: `citation-${index}-${Date.now()}`,
    text: snippet.text,
    snippet: snippet,
  }));
}

export function createMultiLineCitations(snippets: MultiLineTextSnippet[]): MultiLineCitation[] {
  return snippets.map((snippet, index) => ({
    id: `multiline-citation-${index}-${Date.now()}`,
    text: snippet.text,
    snippet: snippet,
  }));
} 