'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { CodeBlock } from './markdown/code-block';
import { MermaidDiagram } from './markdown/mermaid-diagram';
import { 
  CustomTable, 
  CustomTableHead, 
  CustomTableBody, 
  CustomTableRow, 
  CustomTableHeaderCell, 
  CustomTableCell 
} from './markdown/custom-table';
import { LinkHandler } from './markdown/link-handler';
import { MarkdownRendererProps } from './markdown/types';
import 'katex/dist/katex.min.css';

export function MarkdownRenderer({
  content,
  className = '',
  theme = 'auto',
  enableMermaid = true,
  enableMath = true,
  allowHtml = false,
  onLinkClick,
  maxWidth = 'none',
}: MarkdownRendererProps) {
  // Configure plugins based on props
  const remarkPlugins = useMemo(() => {
    const plugins: any[] = [remarkGfm];
    if (enableMath) {
      plugins.push(remarkMath);
    }
    return plugins;
  }, [enableMath]);

  const rehypePlugins = useMemo(() => {
    const plugins: any[] = [];
    
    if (allowHtml) {
      plugins.push(rehypeRaw);
      // Add sanitization for security when allowing HTML
      plugins.push([
        rehypeSanitize,
        {
          allowedTags: [
            'div', 'span', 'p', 'br', 'strong', 'em', 'u', 'i', 'b',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li',
            'blockquote',
            'code', 'pre',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'a', 'img',
            'hr',
          ],
          allowedAttributes: {
            a: ['href', 'title', 'target', 'rel'],
            img: ['src', 'alt', 'title', 'width', 'height'],
            '*': ['className', 'id'],
          },
          allowedSchemes: ['http', 'https', 'mailto', 'tel'],
        },
      ]);
    }
    
    if (enableMath) {
      plugins.push(rehypeKatex);
    }
    
    return plugins;
  }, [allowHtml, enableMath]);

  // Custom components for rendering
  const components = useMemo(() => ({
    // Code blocks with syntax highlighting
    code: ({ children, className, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match?.[1];
      
      // Handle Mermaid diagrams
      if (enableMermaid && language === 'mermaid') {
        return <MermaidDiagram className={className}>{children}</MermaidDiagram>;
      }
      
      return (
        <CodeBlock className={className} {...props}>
          {children}
        </CodeBlock>
      );
    },

    // Enhanced tables
    table: ({ children, ...props }: any) => (
      <CustomTable {...props}>{children}</CustomTable>
    ),
    thead: ({ children, ...props }: any) => (
      <CustomTableHead {...props}>{children}</CustomTableHead>
    ),
    tbody: ({ children, ...props }: any) => (
      <CustomTableBody {...props}>{children}</CustomTableBody>
    ),
    tr: ({ children, ...props }: any) => (
      <CustomTableRow {...props}>{children}</CustomTableRow>
    ),
    th: ({ children, ...props }: any) => (
      <CustomTableHeaderCell {...props}>{children}</CustomTableHeaderCell>
    ),
    td: ({ children, ...props }: any) => (
      <CustomTableCell {...props}>{children}</CustomTableCell>
    ),

    // Smart link handling
    a: ({ href, children, ...props }: any) => (
      <LinkHandler href={href} onLinkClick={onLinkClick} {...props}>
        {children}
      </LinkHandler>
    ),

    // Enhanced typography
    h1: ({ children, ...props }: any) => (
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-5 mb-2" {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }: any) => (
      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2" {...props}>
        {children}
      </h4>
    ),
    h5: ({ children, ...props }: any) => (
      <h5 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-3 mb-1" {...props}>
        {children}
      </h5>
    ),
    h6: ({ children, ...props }: any) => (
      <h6 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-2 mb-1" {...props}>
        {children}
      </h6>
    ),

    // Paragraphs and text
    p: ({ children, ...props }: any) => (
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4" {...props}>
        {children}
      </p>
    ),

    // Lists
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-1" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-1" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }: any) => (
      <li className="ml-4" {...props}>
        {children}
      </li>
    ),

    // Blockquotes
    blockquote: ({ children, ...props }: any) => (
      <blockquote className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 my-4 italic text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 py-2 rounded-r" {...props}>
        {children}
      </blockquote>
    ),

    // Horizontal rule
    hr: ({ ...props }: any) => (
      <hr className="my-8 border-t border-gray-200 dark:border-gray-700" {...props} />
    ),

    // Images
    img: ({ src, alt, ...props }: any) => (
      <img 
        src={src} 
        alt={alt} 
        className="max-w-full h-auto rounded-lg shadow-sm my-4 mx-auto block"
        loading="lazy"
        {...props} 
      />
    ),
  }), [enableMermaid, onLinkClick]);

  const containerStyle = maxWidth !== 'none' ? { maxWidth } : {};

  return (
    <div 
      className={`prose prose-gray dark:prose-invert max-w-none ${className}`}
      style={containerStyle}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
