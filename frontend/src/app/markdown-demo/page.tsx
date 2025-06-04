'use client';

import React, { useState } from 'react';
import { MarkdownRenderer } from '@/components/markdown-renderer';

const demoMarkdown = `# Markdown Renderer Demo

This is a comprehensive demo of our **Markdown Renderer** component with all features enabled.

## Features Demonstrated

### 1. GitHub Flavored Markdown

#### Task Lists
- [x] Syntax highlighting with copy button
- [x] Mermaid diagram support
- [x] Table rendering
- [x] Math equation support
- [ ] Additional features coming soon

#### Tables
| Feature | Status | Notes |
|---------|--------|-------|
| Code Highlighting | ✅ | Prism.js integration |
| Mermaid Diagrams | ✅ | Dynamic loading |
| LaTeX Math | ✅ | KaTeX rendering |
| XSS Protection | ✅ | Sanitized HTML |

### 2. Code Blocks with Syntax Highlighting

Here's some JavaScript with syntax highlighting:

\`\`\`javascript
import { MarkdownRenderer } from '@/components/markdown-renderer';

function MyComponent() {
  const [content, setContent] = useState('# Hello World');
  
  return (
    <MarkdownRenderer 
      content={content}
      enableMermaid={true}
      enableMath={true}
    />
  );
}
\`\`\`

Python example:

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Generate first 10 Fibonacci numbers
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
\`\`\`

### 3. Mermaid Diagrams

Here's a flowchart rendered with Mermaid:

\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> E[Fix Issues]
    E --> B
    C --> F[Deploy]
\`\`\`

Sequence diagram:

\`\`\`mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Database
    
    User->>Frontend: Upload .md file
    Frontend->>API: Process markdown
    API->>Database: Store content
    Database-->>API: Confirmation
    API-->>Frontend: Success response
    Frontend-->>User: Display rendered markdown
\`\`\`

### 4. Mathematical Equations

Inline math: The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$.

Block math:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

Matrix example:

$$
\\begin{bmatrix}
a & b \\\\
c & d
\\end{bmatrix}
\\begin{bmatrix}
x \\\\
y
\\end{bmatrix}
=
\\begin{bmatrix}
ax + by \\\\
cx + dy
\\end{bmatrix}
$$

### 5. Links and Navigation

- [Internal link](#features-demonstrated)
- [External link](https://github.com/remarkjs/react-markdown) (opens in new tab)
- [Email link](mailto:example@example.com)

### 6. Rich Text Elements

> This is a blockquote with **bold** and *italic* text.
> It can span multiple lines and contains formatting.

Here's some \`inline code\` within a paragraph.

---

## Strikethrough and Emphasis

~~Strikethrough text~~ and **bold text** and *italic text*.

### Lists

1. Ordered list item 1
2. Ordered list item 2
   - Nested unordered item
   - Another nested item
3. Ordered list item 3

- Unordered list item
- Another item with **bold** text
- Item with [a link](https://example.com)

### Images

![Demo Image](https://via.placeholder.com/400x200/0066cc/ffffff?text=Markdown+Demo)

---

*This demo showcases all the major features of our Markdown Renderer component!*
`;

export default function MarkdownDemoPage() {
  const [content, setContent] = useState(demoMarkdown);
  const [showEditor, setShowEditor] = useState(false);

  const handleLinkClick = (url: string, isInternal: boolean) => {
    console.log(`Link clicked: ${url} (${isInternal ? 'internal' : 'external'})`);
    if (isInternal && url.startsWith('#')) {
      // Handle internal anchor links
      const element = document.querySelector(url);
      element?.scrollIntoView({ behavior: 'smooth' });
    } else if (!isInternal) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Markdown Renderer Demo
          </h1>
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setShowEditor(!showEditor)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showEditor ? 'Hide' : 'Show'} Editor
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {showEditor && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Markdown Source
              </h2>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-96 p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your markdown here..."
              />
            </div>
          )}
          
          <div className={showEditor ? '' : 'col-span-full'}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Rendered Output
            </h2>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
              <MarkdownRenderer
                content={content}
                enableMermaid={true}
                enableMath={true}
                allowHtml={false}
                onLinkClick={handleLinkClick}
                className="max-w-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
