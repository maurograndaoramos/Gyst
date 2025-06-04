export interface MarkdownRendererProps {
  content: string;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  enableMermaid?: boolean;
  enableMath?: boolean;
  allowHtml?: boolean;
  onLinkClick?: (url: string, isInternal: boolean) => void;
  codeTheme?: string;
  maxWidth?: string;
}

export interface CodeBlockProps {
  children: string;
  className?: string;
  inline?: boolean;
  node?: any;
}

export interface MermaidDiagramProps {
  children: string;
  className?: string;
}

export interface CustomTableProps {
  children: React.ReactNode;
  className?: string;
}

export interface LinkHandlerProps {
  href?: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
  onLinkClick?: (url: string, isInternal: boolean) => void;
}
