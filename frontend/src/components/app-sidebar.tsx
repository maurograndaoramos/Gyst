import * as React from "react"
import { ChevronRight, File, Folder, Search, X, History, Tag, XCircle } from "lucide-react"
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  changes: [
    {
      file: "README.md",
      state: "M",
    },
    {
      file: "api/hello/route.ts",
      state: "U",
    },
    {
      file: "app/layout.tsx",
      state: "M",
    },
  ],
  tree: [
    [
      "app",
      [
        "api",
        ["hello", ["route.ts"]],
        "page.tsx",
        "layout.tsx",
        ["blog", ["page.tsx"]],
      ],
    ],
    [
      "components",
      ["ui", "button.tsx", "card.tsx"],
      "header.tsx",
      "footer.tsx",
    ],
    ["lib", ["util.ts"]],
    ["public", "favicon.ico", "vercel.svg"],
    ".eslintrc.json",
    ".gitignore",
    "next.config.js",
    "tailwind.config.js",
    "package.json",
    "README.md",
  ],
}

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

// Helper function to flatten tree structure for search
const flattenTree = (tree: any[]): string[] => {
  return tree.reduce((acc: string[], item) => {
    if (Array.isArray(item)) {
      const [name, ...children] = item;
      return [...acc, name, ...flattenTree(children)];
    }
    return [...acc, item];
  }, []);
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onFileSelect?: (filePath: string) => void;
}

export function AppSidebar({ onFileSelect, ...props }: AppSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [tagSearchQuery, setTagSearchQuery] = React.useState("");
  const [selectedTags, setSelectedTags] = React.useState<number[]>([]);
  const [filterLogic, setFilterLogic] = React.useState<"AND" | "OR">("OR");
  const [sortBy, setSortBy] = React.useState<"count" | "name">("count");
  const [selectedFile, setSelectedFile] = React.useState<string>("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const debouncedTagSearch = useDebounce(tagSearchQuery, 300);

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
    if (count >= 10) return "tagCommon";
    if (count >= 5) return "tagMedium";
    return "tagRare";
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

  // Flatten tree for search
  const allFiles = React.useMemo(() => flattenTree(data.tree), []);
  
  // Filter files based on search query
  const filteredFiles = React.useMemo(() => {
    if (!debouncedSearch) return allFiles;
    const query = debouncedSearch.toLowerCase();
    return allFiles.filter(file => 
      file.toLowerCase().includes(query)
    );
  }, [debouncedSearch, allFiles]);

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
  };

  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath);
    onFileSelect?.(filePath);
  };

  return (
    <Sidebar {...props}>
      {/* <h1>GYST</h1> */}
      <SidebarContent>
          <div className="flex flex-row select-none p-4 sticky top-0 bg-background z-10 bb-1 w-full">
            <img src="/gyst-logo-black.png" alt="GYST Logo" className="h-6 w-6 mb-2" />
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
                    variant={selectedTags.includes(tag.id) ? "tagSelected" : getTagColor(tag.count)}
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

        <SidebarGroup>
          <SidebarGroupLabel>Files</SidebarGroupLabel>
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

              {/* Search Results */}
              {debouncedSearch && (
                <div className="px-2 py-1">
                  <div className="text-sm text-gray-500">
                    {filteredFiles.length} {filteredFiles.length === 1 ? 'result' : 'results'}
                  </div>
                  {filteredFiles.length === 0 ? (
                    <div className="text-sm text-gray-500 py-2">No results found</div>
                  ) : (
                    <SidebarMenu>
                      {filteredFiles.map((file, index) => (
                        <SidebarMenuItem key={index}>
                          <SidebarMenuButton>
                            <File />
                            {highlightMatch(file, debouncedSearch)}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  )}
                </div>
              )}
            </div>

            <SidebarMenu>
              {data.tree.map((item, index) => (
                <Tree 
                  key={index} 
                  item={item} 
                  onSelect={handleFileSelect}
                  selectedFile={selectedFile}
                  currentPath=""
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

function Tree({ 
  item, 
  onSelect,
  selectedFile,
  currentPath
}: { 
  item: string | any[];
  onSelect: (filePath: string) => void;
  selectedFile: string;
  currentPath: string;
}) {
  const [name, ...items] = Array.isArray(item) ? item : [item]
  const fullPath = currentPath ? `${currentPath}/${name}` : name;

  if (!items.length) {
    return (
      <SidebarMenuButton
        isActive={fullPath === selectedFile}
        className="data-[active=true]:bg-transparent"
        onClick={() => onSelect(fullPath)}
      >
        <File />
        {name}
      </SidebarMenuButton>
    )
  }

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        defaultOpen={name === "components" || name === "ui"}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <ChevronRight className="transition-transform" />
            <Folder />
            {name}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map((subItem, index) => (
              <Tree 
                key={index} 
                item={subItem} 
                onSelect={onSelect}
                selectedFile={selectedFile}
                currentPath={fullPath}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}
