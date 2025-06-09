import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabProps extends React.HTMLAttributes<HTMLDivElement> {
  isActive?: boolean;
  isModified?: boolean;
  onClose?: (e: React.MouseEvent) => void;
  onMiddleClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

export const Tab = React.forwardRef<HTMLDivElement, TabProps>(
  ({ className, isActive, isModified, onClose, onMiddleClick, children, ...props }, ref) => {
    const handleMouseDown = (e: React.MouseEvent) => {
      // Handle middle click
      if (e.button === 1 && onMiddleClick) {
        e.preventDefault();
        onMiddleClick(e);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "group flex h-9 items-center gap-2 whitespace-nowrap px-4 text-sm font-medium transition-all relative select-none",
          isActive
            ? "bg-background text-foreground border-x border-t rounded-t-md -mb-px"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/20",
          className
        )}
        onMouseDown={handleMouseDown}
        {...props}
      >
        <span className="relative">
          {children}
          {isModified && (
            <span className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-blue-500" />
          )}
        </span>
        
        {onClose && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(e);
            }}
            className="opacity-0 group-hover:opacity-100 hover:bg-accent/20 rounded p-0.5 transition-opacity ml-1 -mr-1"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </div>
    );
  }
);

Tab.displayName = "Tab";
