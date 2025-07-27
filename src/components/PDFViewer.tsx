import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker - use local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

const PDFViewer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('Initializing...');
  
  // Track render operations to prevent multiple renders
  const renderTaskRef = useRef<any>(null);
  const isRenderingRef = useRef(false);

  const pdfUrl = searchParams.get('pdf');

  useEffect(() => {
    if (!pdfUrl) {
      console.log('No PDF URL provided');
      setError('No PDF URL provided');
      setLoading(false);
      return;
    }

    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        setLoadingStep('Loading PDF from URL...');
        console.log('Loading PDF from URL:', pdfUrl);
        
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('PDF loading timeout after 30 seconds')), 30000);
        });

        setLoadingStep('Fetching PDF document...');
        const pdfPromise = pdfjsLib.getDocument(pdfUrl).promise;
        
        const pdf = await Promise.race([pdfPromise, timeoutPromise]) as any;
        console.log('PDF loaded successfully, pages:', pdf.numPages);
        setTotalPages(pdf.numPages);
        
        // Get highlight parameters from URL
        const page = parseInt(searchParams.get('page') || '1');
        const x = parseFloat(searchParams.get('x') || '0');
        const y = parseFloat(searchParams.get('y') || '0');
        const width = parseFloat(searchParams.get('width') || '0');
        const height = parseFloat(searchParams.get('height') || '0');

        console.log('Rendering page:', page, 'with highlight:', { x, y, width, height });
        setLoadingStep('Rendering PDF page...');

        // Wait a bit for the canvas to be available, then render
        setTimeout(async () => {
          await renderPage(pdf, page, { x, y, width, height });
          
          // Scroll to the highlighted area after rendering
          if (x && y && width && height) {
            setTimeout(() => {
              scrollToHighlight(x, y, width, height);
            }, 500);
          }
        }, 100);
        
      } catch (error) {
        console.error('Error loading PDF:', error);
        if (error instanceof Error) {
          setError(`Failed to load PDF: ${error.message}`);
        } else {
          setError('Failed to load PDF. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadPDF();

    // Cleanup function to cancel any ongoing render operations
    return () => {
      if (renderTaskRef.current) {
        console.log('Cancelling ongoing render task');
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      isRenderingRef.current = false;
    };
  }, [pdfUrl, searchParams]);

  const renderPage = async (pdf: any, pageNum: number, highlight?: { x: number; y: number; width: number; height: number }) => {
    try {
      // Prevent multiple simultaneous renders
      if (isRenderingRef.current) {
        console.log('Render already in progress, skipping');
        return;
      }
      
      isRenderingRef.current = true;
      console.log('Rendering page number:', pageNum);
      
      const page = await pdf.getPage(pageNum);
      setCurrentPage(pageNum);
      
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error('Canvas ref not available during render');
        isRenderingRef.current = false;
        return;
      }

      const context = canvas.getContext('2d');
      if (!context) {
        console.error('Could not get canvas context');
        isRenderingRef.current = false;
        return;
      }

      console.log('Canvas found, dimensions:', canvas.width, 'x', canvas.height);

      // Clear the canvas
      context.clearRect(0, 0, canvas.width, canvas.height);

      const viewport = page.getViewport({ scale: 1.5 });
      console.log('Viewport dimensions:', viewport.width, 'x', viewport.height);
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      console.log('Starting page render...');
      
      // Store the render task so we can cancel it if needed
      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
      
      console.log('Page render completed');
      renderTaskRef.current = null;

      // Draw highlight if coordinates are provided
      if (highlight && highlight.x && highlight.y && highlight.width && highlight.height) {
        console.log('Drawing highlight at:', highlight);
        
        // Convert PDF coordinates to canvas coordinates
        // PDF coordinates are bottom-up, canvas coordinates are top-down
        const scale = 1.5; // Same scale as viewport
        const canvasX = highlight.x * scale;
        
        // Alternative Y coordinate calculation approach
        // PDF coordinates are bottom-up, canvas coordinates are top-down
        // Try adjusting the calculation to better match text positioning
        const yOffset = 8; // Try a larger offset
        const canvasY = viewport.height - (highlight.y * scale) - (yOffset * scale);
        
        // Alternative: try using highlight.y directly without the viewport.height subtraction
        // const canvasY = highlight.y * scale + (yOffset * scale);
        
        // Scale the highlight dimensions
        const canvasWidth = highlight.width * scale;
        const canvasHeight = highlight.height * scale;
        
        console.log('Canvas highlight coordinates:', {
          x: canvasX,
          y: canvasY,
          width: canvasWidth,
          height: canvasHeight,
          originalY: highlight.y,
          viewportHeight: viewport.height
        });
        
        // Draw yellow highlight
        context.fillStyle = 'rgba(255, 255, 0, 0.4)';
        context.fillRect(canvasX, canvasY, canvasWidth, canvasHeight);
        
        // Draw border
        context.strokeStyle = 'rgba(255, 200, 0, 0.9)';
        context.lineWidth = 3;
        context.strokeRect(canvasX, canvasY, canvasWidth, canvasHeight);
        
        console.log('Highlight drawn successfully');
      }
    } catch (error) {
      console.error('Error rendering page:', error);
      setError('Failed to render PDF page.');
    } finally {
      isRenderingRef.current = false;
    }
  };

  const scrollToHighlight = (x: number, y: number, width: number, height: number) => {
    if (!containerRef.current) return;
    
    // Calculate the position to scroll to (center the highlight)
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scale = 1.5; // Same scale as in renderPage
    const canvasY = canvas.height - (y * scale); // Convert PDF coordinates
    
    const scrollTop = canvasY - (container.clientHeight / 2) + (height * scale / 2);
    
    container.scrollTo({
      top: Math.max(0, scrollTop),
      behavior: 'smooth'
    });
  };

  if (error) {
    return (
      <div className="w-full h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition"
          >
            ← Back
          </button>
          <h1 className="text-xl font-semibold">PDF Viewer</h1>
        </div>
        <div className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </div>
      </div>
      
      {/* PDF Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 mb-2">Loading PDF...</p>
              <p className="text-sm text-gray-500">{loadingStep}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden inline-block">
            <canvas
              ref={canvasRef}
              className="block"
              style={{ display: 'block', minHeight: '100px' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer; 