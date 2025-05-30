'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { LinkHandlerProps } from './types';

export function LinkHandler({ href, children, onLinkClick, ...props }: LinkHandlerProps) {
  if (!href) {
    return <span>{children}</span>;
  }

  // Determine if link is internal or external
  const isInternal = href.startsWith('/') || href.startsWith('#') || href.startsWith('?');
  const isEmail = href.startsWith('mailto:');
  const isTel = href.startsWith('tel:');
  const isExternal = !isInternal && !isEmail && !isTel;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onLinkClick) {
      e.preventDefault();
      onLinkClick(href, isInternal);
    }
  };

  const baseClasses = "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-1 underline-offset-2 transition-colors";
  
  const externalClasses = isExternal 
    ? "inline-flex items-center gap-1" 
    : "";

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`${baseClasses} ${externalClasses}`}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      {...props}
    >
      {children}
      {isExternal && (
        <ExternalLink 
          size={12} 
          className="inline-block ml-0.5 opacity-70" 
          aria-label="Opens in new tab"
        />
      )}
    </a>
  );
}
