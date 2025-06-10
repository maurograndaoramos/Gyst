import * as React from "react"
import { File, Search, X, Tag, Upload } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// Mock data for tags
const mockTags = [
  { id: 1, name: "Project", count: 15, color: "blue" },
  { id: 2, name: "Meeting", count: 8, color: "green" },
  { id: 3, name: "Document", count: 12, color: "blue" },
  { id: 4, name: "Task", count: 20, color: "blue" },
  { id: 5, name: "Note", count: 5, color: "yellow" },
  { id: 6, name: "Idea", count: 3, color: "yellow" },
  { id: 7, name: "Report", count: 7, color: "green" },
  { id: 8, name: "Review", count: 4, color: "yellow" },
]

// Helper function to highlight matched text
const highlightMatch = (text: string, query: string) => {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) => 
    regex.test(part) ? 
      <span key={i} className="bg-yellow-200 dark:bg-yellow-800">{part}</span> : 
      part
  );
};

// Types for file data
interface FileData {
  id: string
  title: string
  originalFilename: string | null
  filePath: string | null
  content: string | null
  createdAt: Date | null
  order?: number
}

interface DragItem {
  type: 'FILE'
  id: string
  index: number
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  organizationId: string
  files: FileData[]
  onFileSelect: (file: FileData) => void
  onFilesReorder?: (files: FileData[]) => void
  loading: boolean
  isAdmin?: boolean
  onQuickUpload?: () => void
}

export function AppSidebar({ organizationId, files, onFileSelect, onFilesReorder, loading, isAdmin = false, onQuickUpload, ...props }: AppSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [tagSearchQuery, setTagSearchQuery] = React.useState("");
  const [selectedTags, setSelectedTags] = React.useState<number[]>([]);
  const [filterLogic, setFilterLogic] = React.useState<"AND" | "OR">("OR");
  const [sortBy, setSortBy] = React.useState<"count" | "name">("count");
  const [selectedFile, setSelectedFile] = React.useState<string>("");
  const [searchResults, setSearchResults] = React.useState<FileData[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [draggedItem, setDraggedItem] = React.useState<DragItem | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const debouncedTagSearch = useDebounce(tagSearchQuery, 300);

  // Perform search with API when there's a query
  React.useEffect(() => {
    if (debouncedSearch && organizationId) {
      performSearch(debouncedSearch);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [debouncedSearch, organizationId]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&organizationId=${organizationId}&highlight=true`);
      if (response.ok) {
        const searchResponse = await response.json();
        setSearchResults(searchResponse.results);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Filter local files for display when no search query
  const displayFiles = React.useMemo(() => {
    if (debouncedSearch) return searchResults || [];
    return files || [];
  }, [debouncedSearch, searchResults, files]);

  // Sync selected tags with URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tags = params.get("tags");
    if (tags) {
      setSelectedTags(tags.split(",").map(Number));
    }
  }, []);

  // Update URL when tags change
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedTags.length > 0) {
      params.set("tags", selectedTags.join(","));
    } else {
      params.delete("tags");
    }
    window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
  }, [selectedTags]);

  // Sort tags based on selected option
  const sortedTags = React.useMemo(() => {
    return [...mockTags].sort((a, b) => {
      if (sortBy === "count") {
        return b.count - a.count;
      }
      return a.name.localeCompare(b.name);
    });
  }, [sortBy]);

  // Get tag color based on frequency
  const getTagColor = (count: number) => {
    if (count >= 10) return "secondary";
    if (count >= 5) return "outline";
    return "default";
  };

  // Toggle tag selection
  const toggleTag = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Clear all selected tags
  const clearTags = () => {
    setSelectedTags([]);
  };

  // Filter tags based on search query
  const filteredTags = React.useMemo(() => {
    return sortedTags.filter(tag => 
      tag.name.toLowerCase().includes(debouncedTagSearch.toLowerCase())
    );
  }, [sortedTags, debouncedTagSearch]);

  // Clear tag search
  const clearTagSearch = () => {
    setTagSearchQuery("");
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
  };

  const handleDragStart = (e: React.DragEvent, file: FileData, index: number) => {
    setIsDragging(true);
    setDraggedItem({ type: 'FILE', id: file.id, index });
    
    // Create a drag preview
    const dragPreview = document.createElement('div');
    dragPreview.className = 'bg-background border rounded p-2 flex items-center gap-2 shadow-lg';
    dragPreview.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <line x1="10" y1="9" x2="8" y2="9"></line>
      </svg>
      <span>${file.originalFilename || file.title}</span>
    `;
    
    document.body.appendChild(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, 20, 20);
    
    // Clean up the preview element after it's no longer needed
    setTimeout(() => document.body.removeChild(dragPreview), 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    const draggedOverItem = displayFiles[index];
    if (draggedOverItem.id === draggedItem.id) return;

    const items = [...displayFiles];
    const draggedItemIndex = items.findIndex(item => item.id === draggedItem.id);
    items.splice(draggedItemIndex, 1);
    items.splice(index, 0, displayFiles[draggedItemIndex]);

    // Create new array with updated order
    const newItems = items.map((item, idx) => ({
      ...item,
      order: idx
    }));
    
    // Call the reorder callback if provided
    onFilesReorder?.(newItems);
  };

  const handleFileSelect = (file: FileData) => {
    setSelectedFile(file.id);
    onFileSelect(file);
  };

  return (
    <Sidebar {...props}>
      <SidebarContent>
          <div className="flex flex-row select-none p-4 sticky top-0 bg-background z-10 bb-1 w-full">
            <img src="/gyst-remake-flip.png" alt="GYST Logo" className="h-6 w-6 mb-2" />
            <h1 className="ml-2 font-semibold ">GYST</h1>
          </div>
        {/* Tag Filter Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </span>
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={clearTags}
              >
                Clear all
              </Button>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 py-2 space-y-2">
              {/* Tag Search Input */}
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search tags..."
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  className="pl-8 pr-8"
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                {tagSearchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4"
                    onClick={clearTagSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filter Logic Selector */}
              <div className="flex items-center gap-2">
                <Select value={filterLogic} onValueChange={(value: "AND" | "OR") => setFilterLogic(value)}>
                  <SelectTrigger className="h-8 w-[100px]">
                    <SelectValue placeholder="Logic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: "count" | "name") => setSortBy(value)}>
                  <SelectTrigger className="h-8 w-[120px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">Count</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tags Grid */}
              <div className="grid grid-cols-2 gap-2">
                {filteredTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? "default" : getTagColor(tag.count)}
                    className="cursor-pointer flex items-center justify-between"
                    onClick={() => toggleTag(tag.id)}
                  >
                    <span>{tag.name}</span>
                    <span className="ml-1 text-xs opacity-75">{tag.count}</span>
                  </Badge>
                ))}
                {filteredTags.length === 0 && (
                  <div className="col-span-2 text-sm text-gray-500 py-2 text-center">
                    No tags found
                  </div>
                )}
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Files Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>Files</span>
            {/* Discrete upload button for admins */}
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-gray-200"
                onClick={onQuickUpload}
                title="Upload files"
              >
                <Upload className="h-3 w-3" />
              </Button>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {/* File Search Input */}
            <div className="relative px-2 py-2">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-8"
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4"
                    onClick={clearSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Loading state */}
              {isSearching && (
                <div className="px-2 py-2 text-sm text-gray-500">
                  Searching...
                </div>
              )}

              {/* File List */}
              {loading ? (
                <div className="px-2 py-2 text-sm text-gray-500">
                  Loading files...
                </div>
              ) : (
                <SidebarMenu>
                  {displayFiles.map((file, index) => (
                    <SidebarMenuItem 
                      key={file.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, file, index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index)}
                      className={`
                        relative
                        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                        ${draggedItem?.id === file.id ? 'opacity-50' : 'opacity-100'}
                      `}
                    >
                      {/* Drop zone above */}
                      <div 
                        className={`
                          absolute -top-1 left-0 right-0 h-2 
                          ${isDragging ? 'bg-primary/20' : ''}
                          transition-colors duration-200
                        `}
                      />
                      
                      <SidebarMenuButton
                        isActive={file.id === selectedFile}
                        onClick={() => handleFileSelect(file)}
                        className={`
                          data-[active=true]:bg-accent
                          relative
                          ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <File className="shrink-0" />
                          <span className="truncate">
                            {file.originalFilename || file.title}
                          </span>
                        </div>
                      </SidebarMenuButton>
                      
                      {/* Drop zone below */}
                      <div 
                        className={`
                          absolute -bottom-1 left-0 right-0 h-2
                          ${isDragging ? 'bg-primary/20' : ''}
                          transition-colors duration-200
                        `}
                      />
                    </SidebarMenuItem>
                  ))}
                  {displayFiles.length === 0 && !loading && (
                    <div className="px-2 py-2 text-sm text-gray-500">
                      {debouncedSearch ? 'No search results found' : 'No files found'}
                    </div>
                  )}
                </SidebarMenu>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
