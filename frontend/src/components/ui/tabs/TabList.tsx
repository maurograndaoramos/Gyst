import * as React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { Tab } from "./Tab";

// SortableTab component
interface SortableTabProps extends React.ComponentProps<typeof Tab> {
  id: string;
}

const SortableTab = ({ id, ...props }: SortableTabProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Tab
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      {...props}
      role="tab"
    />
  );
};

// TabList component
interface TabListProps {
  tabs: Array<{
    id: string;
    label: string;
    isActive?: boolean;
    isModified?: boolean;
  }>;
  onTabsReorder?: (tabs: TabListProps["tabs"]) => void;
  onTabSelect?: (id: string) => void;
  onTabClose?: (id: string) => void;
  className?: string;
  tabKey?: number;
}

export function TabList({
  tabs,
  onTabsReorder,
  onTabSelect,
  onTabClose,
  className,
  tabKey = 0,
}: TabListProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [visibleTabs, setVisibleTabs] = React.useState(tabs);
  const [overflowTabs, setOverflowTabs] = React.useState<TabListProps["tabs"]>([]);
  const [showOverflow, setShowOverflow] = React.useState(false);
  
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Handle tab container resize
  React.useEffect(() => {
    const handleResize = () => {
      if (!tabsContainerRef.current) return;

      // Reset visibility when tabs change
      setVisibleTabs(tabs);
      setOverflowTabs([]);

      // Use requestAnimationFrame to ensure DOM measurements are accurate
      requestAnimationFrame(() => {
        const containerWidth = tabsContainerRef.current?.getBoundingClientRect().width ?? 0;
        const tabElements = tabsContainerRef.current?.querySelectorAll('[role="tab"]') ?? [];
        let totalWidth = 0;
        const visible: TabListProps["tabs"] = [];
        const overflow: TabListProps["tabs"] = [];

        tabs.forEach((tab) => {
          const element = tabElements[visible.length];
          if (!element) return;
          
          totalWidth += element.getBoundingClientRect().width;
          if (totalWidth < containerWidth - 50) {
            visible.push(tab);
          } else {
            overflow.push(tab);
          }
        });

        setVisibleTabs(visible);
        setOverflowTabs(overflow);
      });
    };

    if (tabs.length > 0) {
      handleResize();
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tabs, tabKey]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((tab) => tab.id === active.id);
      const newIndex = tabs.findIndex((tab) => tab.id === over.id);
      
      const newTabs = arrayMove(tabs, oldIndex, newIndex);
      onTabsReorder?.(newTabs);
    }
  };

  return (
    <div className={cn("flex flex-1 border-b", className)}>
      <div ref={tabsContainerRef} className="flex flex-1 items-center min-w-0">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={visibleTabs.map((tab) => tab.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex items-center">
              {visibleTabs.map((tab) => (
                <SortableTab
                  key={tab.id}
                  id={tab.id}
                  isActive={tab.isActive}
                  isModified={tab.isModified}
                  onClick={() => onTabSelect?.(tab.id)}
                  onMiddleClick={() => onTabClose?.(tab.id)}
                  onClose={() => onTabClose?.(tab.id)}
                >
                  {tab.label}
                </SortableTab>
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeId ? (
              <Tab className="cursor-grabbing shadow-md">
                {tabs.find((tab) => tab.id === activeId)?.label}
              </Tab>
            ) : null}
          </DragOverlay>
        </DndContext>

        {overflowTabs.length > 0 && (
          <div className="relative ml-auto border-l bg-background">
            <button
              onClick={() => setShowOverflow(!showOverflow)}
              className="flex h-9 items-center gap-1 px-2 hover:bg-accent"
            >
              <ChevronDown className="h-4 w-4" />
              <span className="text-xs font-medium">+{overflowTabs.length}</span>
            </button>

            {showOverflow && (
              <div className="absolute top-full right-0 mt-1 w-64 rounded-md shadow-lg bg-background border z-50">
                {overflowTabs.map((tab) => (
                  <Tab
                    key={tab.id}
                    isActive={tab.isActive}
                    isModified={tab.isModified}
                    onClick={() => {
                      onTabSelect?.(tab.id);
                      setShowOverflow(false);
                    }}
                    onClose={() => onTabClose?.(tab.id)}
                    className="w-full justify-between rounded-none border-b last:border-b-0"
                  >
                    {tab.label}
                  </Tab>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
