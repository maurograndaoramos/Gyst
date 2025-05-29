# PDF Viewer Component

A comprehensive, production-ready PDF viewer component built with React, TypeScript, and PDF.js. This component provides all essential PDF viewing features with a modern, accessible interface that integrates seamlessly with shadcn/ui.

## ✨ Features

### 📖 Navigation
- **Page Navigation**: Previous/Next buttons with keyboard shortcuts
- **Direct Page Access**: Input field to jump to specific pages
- **Page Counter**: Shows current page and total pages (X of Y format)
- **Keyboard Support**: Arrow keys, Page Up/Down, Home/End navigation

### 🔍 Zoom Controls
- **Multiple Zoom Modes**: Fit-to-width, fit-to-page, and custom zoom
- **Zoom Controls**: Dedicated zoom in/out buttons
- **Zoom Slider**: Precise zoom control from 10% to 500%
- **Mouse Wheel Support**: Zoom with Ctrl + mouse wheel
- **Responsive Scaling**: Automatic scaling based on container size

### 🔎 Search Functionality
- **Text Search**: Full-text search across all pages
- **Search Highlighting**: Visual highlighting of search terms
- **Result Navigation**: Previous/Next buttons for search results
- **Search Counter**: Shows current result position (X of Y matches)
- **Keyboard Shortcuts**: Ctrl+F to open search, Escape to close

### 🎨 User Interface
- **Modern Design**: Consistent with shadcn/ui design system
- **Responsive Layout**: Works on desktop, tablet, and mobile devices
- **Dark Mode Support**: Automatic theme adaptation
- **Tooltips**: Helpful tooltips for all controls
- **Loading States**: Progress indicators and skeleton loading

### 🖨️ Additional Features
- **Print Support**: Native browser print functionality (Ctrl+P)
- **Error Handling**: Graceful error states with retry options
- **Performance Optimized**: Efficient rendering and memory management
- **Accessibility**: ARIA labels and keyboard navigation
- **Touch Support**: Mobile gestures and pinch-to-zoom

## 🚀 Installation

The PDF viewer component and its dependencies are already installed in this project. The setup includes:

```bash
npm install react-pdf pdfjs-dist @radix-ui/react-slider @radix-ui/react-progress @radix-ui/react-tooltip
```

## 📁 File Structure

```
src/
├── components/
│   ├── pdf-viewer.tsx              # Main PDF viewer component
│   └── ui/
│       ├── slider.tsx              # Zoom slider component
│       ├── progress.tsx            # Loading progress bar
│       └── tooltip.tsx             # Tooltip component
├── hooks/
│   └── use-pdf-viewer.ts           # PDF viewer state management hook
└── app/
    └── pdf-demo/
        └── page.tsx                # Demo page showing usage
```

## 🔧 Usage

### Basic Usage

```tsx
import PDFViewer from '@/components/pdf-viewer'

export default function MyPage() {
  return (
    <div className="h-screen">
      <PDFViewer
        fileUrl="/path/to/your/document.pdf"
        className="w-full h-full"
      />
    </div>
  )
}
```

### Advanced Usage with Event Handlers

```tsx
import PDFViewer from '@/components/pdf-viewer'

export default function AdvancedPDFPage() {
  const handlePageChange = (page: number) => {
    console.log('Current page:', page)
  }

  const handleZoomChange = (zoom: number) => {
    console.log('Current zoom:', Math.round(zoom * 100) + '%')
  }

  const handleError = (error: Error) => {
    console.error('PDF Error:', error)
  }

  return (
    <PDFViewer
      fileUrl="https://example.com/document.pdf"
      className="w-full h-full border rounded-lg"
      initialPage={1}
      initialZoom={1}
      enableSearch={true}
      enablePrint={true}
      onPageChange={handlePageChange}
      onZoomChange={handleZoomChange}
      onError={handleError}
    />
  )
}
```

## 🎛️ Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fileUrl` | `string` | - | **Required.** URL or path to the PDF file |
| `className` | `string` | - | Additional CSS classes for the container |
| `initialPage` | `number` | `1` | Initial page to display |
| `initialZoom` | `number` | `1` | Initial zoom level (1 = 100%) |
| `enableSearch` | `boolean` | `true` | Enable/disable search functionality |
| `enablePrint` | `boolean` | `true` | Enable/disable print button |
| `onPageChange` | `(page: number) => void` | - | Callback when page changes |
| `onZoomChange` | `(zoom: number) => void` | - | Callback when zoom changes |
| `onError` | `(error: Error) => void` | - | Callback when an error occurs |

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `←` or `Page Up` | Previous page |
| `→` or `Page Down` | Next page |
| `Home` | First page |
| `End` | Last page |
| `Ctrl+F` | Open search |
| `Escape` | Close search |
| `Ctrl+P` | Print document |
| `Ctrl++` | Zoom in |
| `Ctrl+-` | Zoom out |

## 🎯 Demo

Visit `/pdf-demo` to see a comprehensive demonstration of the PDF viewer with:
- Interactive controls
- Feature overview
- Usage examples
- Keyboard shortcut reference

## 🔧 Configuration

### Next.js Setup

The project is already configured for PDF.js with Next.js. The configuration includes:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  experimental: {
    turbo: {
      resolveAlias: {
        canvas: './empty-module.ts',
      },
    },
  },
};
```

### PDF.js Worker

The PDF.js worker is automatically configured in the `usePDFViewer` hook:

```typescript
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()
```

## 🎨 Styling

The component uses Tailwind CSS and follows the shadcn/ui design system. It automatically adapts to your theme's:
- Color scheme (light/dark mode)
- Border radius
- Font family
- Spacing scale

### Custom Styling

You can customize the appearance by:

1. **Adding custom classes**: Use the `className` prop
2. **Modifying CSS variables**: Update your theme's CSS custom properties
3. **Component styling**: Modify the component's internal Tailwind classes

## 🔍 State Management

The `usePDFViewer` hook manages all PDF viewer state:

```typescript
const {
  // State
  numPages,
  pageNumber,
  scale,
  zoomMode,
  isLoading,
  error,
  searchText,
  searchResults,
  
  // Actions
  goToPage,
  goToPreviousPage,
  goToNextPage,
  setZoom,
  zoomIn,
  zoomOut,
  fitToWidth,
  fitToPage,
  search,
  print
} = usePDFViewer(options)
```

## 🚨 Error Handling

The component handles various error scenarios:

- **Network errors**: When PDF cannot be loaded from URL
- **Corrupt files**: When PDF file is damaged or invalid
- **Permission errors**: When PDF requires authentication
- **Rendering errors**: When specific pages fail to render

Errors are displayed with:
- Clear error messages
- Retry functionality
- Fallback UI states

## 📱 Mobile Support

The component is fully responsive and includes:

- **Touch navigation**: Swipe gestures for page navigation
- **Pinch-to-zoom**: Native mobile zoom gestures
- **Responsive toolbar**: Adapts to different screen sizes
- **Touch-friendly controls**: Larger tap targets on mobile

## 🔧 Performance

The component is optimized for performance:

- **Lazy loading**: Pages are rendered on-demand
- **Memory management**: Efficient cleanup of resources
- **Canvas optimization**: Smart rendering strategy
- **Search optimization**: Debounced search to prevent excessive API calls

## 🧪 Testing

To test the PDF viewer:

1. **Navigate to the demo**: Visit `/pdf-demo`
2. **Load a PDF**: Use the provided sample or enter your own URL
3. **Test features**: Try all navigation, zoom, and search functionality
4. **Test responsive**: Check behavior on different screen sizes
5. **Test keyboard**: Verify all keyboard shortcuts work

## 🐛 Troubleshooting

### Common Issues

**PDF not loading:**
- Check if the URL is accessible
- Verify CORS settings for external URLs
- Ensure the file is a valid PDF

**Search not working:**
- Text search requires PDFs with selectable text
- Scanned PDFs (images) won't support text search
- Large PDFs may take time to index

**Performance issues:**
- Large PDFs (100+ pages) may load slowly
- Consider implementing virtual scrolling for very large documents
- Reduce zoom level for better performance

## 📋 Browser Support

The component supports all modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🤝 Contributing

To extend or modify the PDF viewer:

1. **Component structure**: Main logic is in `pdf-viewer.tsx`
2. **State management**: Extend `usePDFViewer` hook for new features
3. **UI components**: Add new controls to the toolbar
4. **Styling**: Follow shadcn/ui patterns for consistency

## 📄 License

This component is part of the project and follows the same license terms.
