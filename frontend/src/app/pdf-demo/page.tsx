"use client"

import React, { useState } from 'react'
import PDFViewer from '@/components/pdf-viewer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function PDFDemoPage() {
  const [pdfUrl, setPdfUrl] = useState('https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf')
  const [currentPage, setCurrentPage] = useState(1)
  const [currentZoom, setCurrentZoom] = useState(1)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    console.log('Page changed to:', page)
  }

  const handleZoomChange = (zoom: number) => {
    setCurrentZoom(zoom)
    console.log('Zoom changed to:', Math.round(zoom * 100) + '%')
  }

  const handleError = (error: Error) => {
    console.error('PDF Viewer Error:', error)
  }

  const loadSamplePDF = () => {
    // You can use any publicly accessible PDF URL for testing
    setPdfUrl('https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf')
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">PDF Viewer Demo</h1>
          <p className="text-muted-foreground">
            A full-featured PDF viewer built with React and PDF.js
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>PDF Controls</CardTitle>
            <CardDescription>
              Load a PDF file to test the viewer functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="pdf-url">PDF URL</Label>
                <Input
                  id="pdf-url"
                  type="url"
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                  placeholder="Enter PDF URL..."
                />
              </div>
              <div className="flex items-end">
                <Button onClick={loadSamplePDF} variant="outline">
                  Load Sample PDF
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <Label className="text-sm text-muted-foreground">Current Page</Label>
                <p className="text-2xl font-bold">{currentPage}</p>
              </div>
              <div className="text-center">
                <Label className="text-sm text-muted-foreground">Current Zoom</Label>
                <p className="text-2xl font-bold">{Math.round(currentZoom * 100)}%</p>
              </div>
              <div className="text-center">
                <Label className="text-sm text-muted-foreground">Status</Label>
                <p className="text-sm text-green-600 font-medium">Ready</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features List */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>
              This PDF viewer includes all the essential features for document viewing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Navigation</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Previous/Next page buttons</li>
                  <li>• Page number input</li>
                  <li>• Keyboard shortcuts (arrows, Page Up/Down)</li>
                  <li>• Jump to first/last page (Home/End)</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Zoom Controls</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Zoom in/out buttons</li>
                  <li>• Zoom slider</li>
                  <li>• Fit to width/page modes</li>
                  <li>• Mouse wheel zoom support</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Search & Print</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Text search with highlighting</li>
                  <li>• Search result navigation</li>
                  <li>• Search shortcut (Ctrl+F)</li>
                  <li>• Print functionality (Ctrl+P)</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Loading & Errors</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Loading progress indicator</li>
                  <li>• Error handling for corrupt PDFs</li>
                  <li>• Graceful fallbacks</li>
                  <li>• Retry mechanisms</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Mobile Support</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Touch gestures for navigation</li>
                  <li>• Pinch-to-zoom support</li>
                  <li>• Responsive design</li>
                  <li>• Touch-friendly controls</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Performance</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Lazy loading</li>
                  <li>• Memory management</li>
                  <li>• Canvas/SVG rendering options</li>
                  <li>• Optimized for large documents</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDF Viewer */}
        <Card>
          <CardContent className="p-0">
            <div className="h-[800px]">
              {pdfUrl ? (
                <PDFViewer
                  fileUrl={pdfUrl}
                  className="w-full h-full"
                  onPageChange={handlePageChange}
                  onZoomChange={handleZoomChange}
                  onError={handleError}
                  enableSearch={true}
                  enablePrint={true}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center space-y-2">
                    <p>Enter a PDF URL above to start viewing</p>
                    <Button onClick={loadSamplePDF} variant="outline" size="sm">
                      Or load a sample PDF
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Instructions</CardTitle>
            <CardDescription>
              How to use the PDF viewer effectively
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Keyboard Shortcuts</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Previous page:</span>
                    <code className="bg-muted px-1 rounded">←, Page Up</code>
                  </div>
                  <div className="flex justify-between">
                    <span>Next page:</span>
                    <code className="bg-muted px-1 rounded">→, Page Down</code>
                  </div>
                  <div className="flex justify-between">
                    <span>First page:</span>
                    <code className="bg-muted px-1 rounded">Home</code>
                  </div>
                  <div className="flex justify-between">
                    <span>Last page:</span>
                    <code className="bg-muted px-1 rounded">End</code>
                  </div>
                  <div className="flex justify-between">
                    <span>Search:</span>
                    <code className="bg-muted px-1 rounded">Ctrl+F</code>
                  </div>
                  <div className="flex justify-between">
                    <span>Print:</span>
                    <code className="bg-muted px-1 rounded">Ctrl+P</code>
                  </div>
                  <div className="flex justify-between">
                    <span>Zoom in:</span>
                    <code className="bg-muted px-1 rounded">Ctrl++</code>
                  </div>
                  <div className="flex justify-between">
                    <span>Zoom out:</span>
                    <code className="bg-muted px-1 rounded">Ctrl+-</code>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use the search feature to quickly find specific text in the document</li>
                  <li>• The zoom slider allows for precise zoom control between 10% and 500%</li>
                  <li>• Fit-to-width mode automatically adjusts the document to the viewer width</li>
                  <li>• All controls have helpful tooltips when you hover over them</li>
                  <li>• The viewer supports both Canvas and SVG rendering for optimal performance</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
