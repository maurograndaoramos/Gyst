'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MermaidDiagramProps } from './types';

export function MermaidDiagram({ children, className }: MermaidDiagramProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mermaid: any;

    const loadMermaid = async () => {
      try {
        // Dynamically import mermaid to avoid SSR issues
        const mermaidModule = await import('mermaid');
        mermaid = mermaidModule.default;

        // Initialize mermaid with configuration
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: 14,
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
          },
          sequence: {
            useMaxWidth: true,
          },
          gantt: {
            useMaxWidth: true,
          },
        });

        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to load Mermaid:', err);
        setError('Failed to load diagram renderer');
      }
    };

    loadMermaid();
  }, []);

  useEffect(() => {
    if (!isLoaded || !elementRef.current || !children.trim()) return;

    const renderDiagram = async () => {
      try {
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default;
        
        // Clear previous content
        if (elementRef.current) {
          elementRef.current.innerHTML = '';
        }

        // Generate unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        
        // Render the diagram
        const { svg } = await mermaid.render(id, children.trim());
        
        if (elementRef.current) {
          elementRef.current.innerHTML = svg;
          
          // Make the SVG responsive
          const svgElement = elementRef.current.querySelector('svg');
          if (svgElement) {
            svgElement.style.maxWidth = '100%';
            svgElement.style.height = 'auto';
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError('Invalid diagram syntax');
        
        if (elementRef.current) {
          elementRef.current.innerHTML = `
            <div class="border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg p-4">
              <p class="text-red-600 dark:text-red-400 text-sm font-medium">Diagram Error</p>
              <p class="text-red-500 dark:text-red-300 text-sm mt-1">Failed to render Mermaid diagram. Please check the syntax.</p>
            </div>
          `;
        }
      }
    };

    renderDiagram();
  }, [isLoaded, children]);

  if (!isLoaded) {
    return (
      <div className={`my-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-2"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`my-4 ${className}`}>
      <div 
        ref={elementRef}
        className="flex justify-center items-center min-h-[100px] p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto"
      />
    </div>
  );
}
