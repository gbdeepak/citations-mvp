# Citations MVP

A React-based web application that allows users to upload PDF and DOCX documents, extract random text citations, and provide interactive references with highlighting capabilities.

## 🎯 Overview

This MVP demonstrates a citation and reference system where users can:

- Upload PDF or DOCX files
- View randomly extracted text snippets from the documents
- Hover over citations to see previews with highlighted text
- Click "Reference" buttons to open the source document in a new tab with precise text highlighting

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd citations-mvp

# Install dependencies
npm install

# Start the development server
npm start
```

The application will be available at `http://localhost:3000`

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **PDF Processing**: PDF.js (pdfjs-dist)
- **DOCX Processing**: Mammoth.js + docx-preview
- **Routing**: React Router DOM
- **Build Tool**: Create React App

### Project Structure

```
src/
├── components/
│   ├── FileUploader.tsx          # Unified file upload component
│   ├── CitationDisplay.tsx       # Main citation display with tooltips
│   ├── PDFViewer.tsx            # PDF rendering and highlighting
│   ├── DOCXViewer.tsx           # DOCX rendering and highlighting
│   ├── PDFPreviewTooltip.tsx    # PDF hover preview
│   └── DOCXPreviewTooltip.tsx   # DOCX hover preview
├── utils/
│   ├── pdfUtils.ts              # PDF text extraction and processing
│   ├── docxUtils.ts             # DOCX text extraction and processing
│   └── fileUtils.ts             # Common file handling utilities
├── App.tsx                      # Main application component
└── index.tsx                    # Application entry point
```

## 📦 Key Dependencies

### PDF Processing

- **pdfjs-dist** (`^3.11.174`): Mozilla's PDF.js library for PDF parsing and rendering
  - Text extraction with coordinates
  - Canvas-based rendering
  - Worker-based processing for performance

### DOCX Processing

- **mammoth** (`^1.6.0`): Convert DOCX to HTML/text
  - Raw text extraction with paragraph indices
  - Maintains document structure
- **docx-preview** (`^0.0.15`): Render DOCX files in the browser
  - HTML-based rendering
  - DOM manipulation for highlighting

### UI/UX

- **react-router-dom** (`^6.8.1`): Client-side routing
- **Tailwind CSS**: Utility-first CSS framework

## 🔧 Technical Implementation

### PDF Processing Flow

1. **Upload**: File stored as blob URL
2. **Extraction**: PDF.js extracts text with coordinates
3. **Grouping**: Text items grouped into meaningful lines/chunks
4. **Random Selection**: 3 random citations selected
5. **Highlighting**: Canvas-based highlighting with coordinate mapping

### DOCX Processing Flow

1. **Upload**: File stored as blob URL
2. **Extraction**: Mammoth extracts text with paragraph indices
3. **Random Selection**: 3 random citations from substantial paragraphs
4. **Rendering**: docx-preview renders to HTML
5. **Highlighting**: DOM manipulation with text-based matching

### Highlighting Implementation

#### PDF Highlighting

```typescript
// Coordinate-based highlighting on canvas
const yOffset = 8; // Fine-tuned offset for alignment
const highlightY = (pageHeight - textItem.y) * scale + yOffset;
```

#### DOCX Highlighting

```typescript
// DOM-based highlighting with text matching
const normalizeText = (text: string) => {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
};
```

## 🎨 UI Components

### File Upload

- Drag-and-drop interface
- File type validation (PDF, DOCX)
- Size limits (20MB)
- Visual feedback

### Citation Display

- Clean card-based layout
- Hover tooltips with previews
- "Reference" buttons for full document view
- Responsive design

### Tooltips

- Fixed width (384px) for consistency
- Positioned below buttons
- Context-aware highlighting
- Loading states

## 🔍 Alternative Libraries

### JavaScript/TypeScript Alternatives

#### PDF Processing

| Library                  | Pros                                   | Cons                        | Use Case                 |
| ------------------------ | -------------------------------------- | --------------------------- | ------------------------ |
| **pdfjs-dist** (Current) | Mature, feature-rich, good performance | Large bundle size           | Production applications  |
| **pdf-lib**              | Lightweight, good for manipulation     | Limited text extraction     | PDF editing/modification |
| **react-pdf**            | React-specific, easy integration       | Less control over rendering | Simple PDF viewers       |
| **pdf2pic**              | Image conversion capabilities          | Server-side only            | PDF to image conversion  |

#### DOCX Processing

| Library                              | Pros                                    | Cons                           | Use Case                   |
| ------------------------------------ | --------------------------------------- | ------------------------------ | -------------------------- |
| **mammoth + docx-preview** (Current) | Good text extraction, browser rendering | Complex setup, limited styling | Document viewing           |
| **docx**                             | Full DOCX creation/editing              | No rendering capabilities      | Document generation        |
| **officegen**                        | Multiple Office formats                 | Server-side only               | Document generation        |
| **pizzip**                           | Low-level ZIP manipulation              | Complex API                    | Advanced DOCX manipulation |

### Python Alternatives

#### PDF Processing

```python
# PyPDF2 - Lightweight
import PyPDF2
with open('document.pdf', 'rb') as file:
    reader = PyPDF2.PdfReader(file)
    text = reader.pages[0].extract_text()

# pdfplumber - Better text extraction
import pdfplumber
with pdfplumber.open('document.pdf') as pdf:
    page = pdf.pages[0]
    text = page.extract_text()

# pdf2image - Convert to images
from pdf2image import convert_from_path
images = convert_from_path('document.pdf')

# PyMuPDF (fitz) - High performance
import fitz
doc = fitz.open('document.pdf')
page = doc[0]
text = page.get_text()
```

#### DOCX Processing

```python
# python-docx - Most popular
from docx import Document
doc = Document('document.docx')
text = '\n'.join([paragraph.text for paragraph in doc.paragraphs])

# docx2txt - Simple text extraction
import docx2txt
text = docx2txt.process('document.docx')

# python-docx2txt - Alternative implementation
import docx2txt
text = docx2txt.process('document.docx')

# mammoth - Same as JS version
import mammoth
with open('document.docx', 'rb') as docx_file:
    result = mammoth.extract_raw_text(docx_file)
    text = result.value
```

## 🚀 Deployment Considerations

### Production Build

```bash
npm run build
```

### Environment Variables

- No external API keys required (local file processing)
- Consider adding file size limits for production

### Performance Optimizations

- PDF.js worker configuration
- Blob URL management
- Canvas rendering optimization
- Debounced hover events

## 🔮 Future Enhancements

### Backend Integration

- File storage (S3, Azure Blob)
- Database for citation management
- User authentication
- Multi-document support

### AI Features

- Smart citation extraction
- Content summarization
- Automatic tagging
- Relevance scoring

### Advanced Features

- Multiple file upload
- Citation export (BibTeX, etc.)
- Collaborative annotations
- Version control for documents

## 🐛 Known Issues

1. **PDF Highlighting Alignment**: May require fine-tuning for different PDF formats
2. **DOCX Text Matching**: Complex formatting can affect highlighting precision
3. **Large File Performance**: Files >10MB may cause performance issues
4. **Browser Compatibility**: Some features may not work in older browsers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

[Add your license information here]

## 📞 Support

For questions or issues, please create an issue in the repository or contact the development team.
