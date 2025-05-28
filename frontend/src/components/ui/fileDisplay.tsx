// components/ui/FileDisplay.tsx
import React from "react";

interface FileDisplayProps {
  content: string;
}

export function FileDisplay({ content }: FileDisplayProps) {
  return (
    <div className="w-full h-full overflow-y-scroll px-20 py-10 rounded-lg border bg-muted font-mono whitespace-pre-wrap">
      {content}
    </div>
  );
}