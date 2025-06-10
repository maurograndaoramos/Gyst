'use client'
import * as React from "react"
import { SmartFileRenderer } from "@/components/smart-file-renderer";
import { AppSidebar } from "@/components/app-sidebar"
import FileValidator, { type FileWithPreview } from "@/components/FileValidator"; 
import UploadProgressModal, { type FileProgress } from "@/components/UploadProgressModal";
import { useAuth } from "@/hooks/use-auth";
import { useParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTabs } from "@/hooks/use-tabs";
import { TabList } from "@/components/ui/tabs/TabList";
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, File } from "lucide-react"
import ChatInterface from "@/components/chatInterface";
import { LoadingSpinner } from "@/components/auth/loading-spinner"

import type { FileData } from "@/types/file";

export default function Page() {
  const [width, setWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { tabs, activeTabId, activeTab, addTab, closeTab, setTabModified, reorderTabs, key } = useTabs({
    maxTabs: 10,
    onTabLimitReached: () => {
      // TODO: Add toast notification
      console.warn("Maximum number of tabs reached");
    }
  });
  const [uploadingFiles, setUploadingFiles] = useState<FileProgress[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const params = useParams();
  const organizationId = params.organizationId as string;
  const { role, user, organizationId: userOrgId } = useAuth();
  const [hasCheckedOrg, setHasCheckedOrg] = useState(false);
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const isAdmin = role === 'admin';

  // Handle quick upload from sidebar
  const handleQuickUpload = () => {
    // Create a file input element and trigger it
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.txt,.md,.pdf,.docx';
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        const filesWithPreview = files.map(file => ({
          ...file,
          preview: URL.createObjectURL(file),
          isValid: true,
          errors: []
        } as FileWithPreview));
        handleFilesValidated(filesWithPreview);
      }
    };
    input.click();
  };

  const handleFilesReorder = async (reorderedFiles: FileData[]) => {
    if (!isAdmin) return;
    setFiles(reorderedFiles);

    // Optimistically update the UI first
    const fileOrder = reorderedFiles.map((file, index) => ({
      id: file.id,
      order: index
    }));

    // Then persist to backend
    try {
      setIsReordering(true);
      const response = await fetch(`/api/files/reorder?organizationId=${organizationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileOrder })
      });

      if (!response.ok) {
        throw new Error('Failed to update file order');
      }
    } catch (error) {
      console.error('Error updating file order:', error);
      // Reload files to reset to server state
      if (organizationId && hasCheckedOrg) {
        fetchFiles();
      }
    } finally {
      setIsReordering(false);
    }
  };

  // All useEffect hooks MUST come before any conditional returns
  // Fix for "Rendered more hooks than during the previous render" error
  
  // Validate organization access
  useEffect(() => {
    if (!userOrgId || userOrgId !== organizationId) {
      router.replace('/');
      return;
    }
    setHasCheckedOrg(true);
  }, [userOrgId, organizationId, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Fetch files function
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/files?organizationId=${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch files when component mounts or organizationId changes
  useEffect(() => {
    if (organizationId && hasCheckedOrg) {
      fetchFiles();
    }
  }, [organizationId, hasCheckedOrg]);

  // Debug logging for tab state
  useEffect(() => {
    console.log('Current tabs:', tabs);
    console.log('Active tab:', activeTab);
  }, [tabs, activeTab]);

  // Define mouse event handlers BEFORE the useEffect that uses them
  const handleLogout = async () => {
    try {
      await signOut({ 
        callbackUrl: '/',
        redirect: true 
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: force redirect if signOut fails
      router.push('/');
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.body.style.cursor = "ew-resize"; // Change cursor to "ew-resize"
    document.body.style.userSelect = "none"; // Prevent text selection during resize
  };

  const MAX_WIDTH = 600; // Define the maximum width

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = startXRef.current - e.clientX;
    const newWidth = startWidthRef.current + deltaX;

    if (newWidth < 150) {
      setIsCollapsed(true);
    } else if (newWidth > MAX_WIDTH) {
      setWidth(MAX_WIDTH);
      setIsCollapsed(false);
    } else {
      setIsCollapsed(false);
      setWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    document.body.style.cursor = ""; // Reset cursor to default
    document.body.style.userSelect = ""; // Reset user-select to default
  };

  // Now the useEffect can safely reference the functions defined above
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Don't render anything until we've checked organization access
  if (!hasCheckedOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
        <span className="ml-3 text-sm text-muted-foreground">
          Validating access...
        </span>
      </div>
    );
  }

  const handleFileSelect = (file: FileData) => {
    console.log('File selected:', file);
    if (activeTabId === file.id) return; // Don't re-add if already active
    const added = addTab(file);
    console.log('Tab added:', added);
  };

  const handleFilesValidated = async (validFiles: FileWithPreview[]) => {
    if (!isAdmin || validFiles.length === 0) return;

    const newUploadingFiles: FileProgress[] = validFiles.map(file => ({
      id: Math.random().toString(36).substring(2),
      name: file.name,
      progress: 0,
      status: 'queued',
      originalFile: file
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);
    setShowUploadModal(true);

    for (const fileProgress of newUploadingFiles) {
      try {
        const formData = new FormData();
        if (!fileProgress.originalFile) continue;
        
        formData.append('file', fileProgress.originalFile);
        
        // Update status to uploading before starting the upload
        setUploadingFiles(prevFiles => 
          prevFiles.map(f => 
            f.id === fileProgress.id 
              ? { ...f, status: 'uploading', progress: 0 }
              : f
          )
        );

        // Create fake progress updates
        const progressInterval = setInterval(() => {
          setUploadingFiles(prevFiles => {
            const currentFile = prevFiles.find(f => f.id === fileProgress.id);
            if (!currentFile || currentFile.status !== 'uploading') {
              clearInterval(progressInterval);
              return prevFiles;
            }
            const newProgress = Math.min(95, (currentFile.progress || 0) + 5);
            return prevFiles.map(f => 
              f.id === fileProgress.id 
                ? { ...f, progress: newProgress }
                : f
            );
          });
        }, 100);

        const response = await fetch(`/api/documents/upload?organizationId=${organizationId}`, {
          method: 'POST',
          body: formData
        });

        // Clear the progress interval
        clearInterval(progressInterval);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
        }

        setUploadingFiles(prevFiles =>
          prevFiles.map(f =>
            f.id === fileProgress.id
              ? { ...f, status: 'completed', progress: 100 }
              : f
          )
        );

        // Refresh file list after successful upload
        await fetchFiles();

      } catch (error) {
        console.error('Upload error:', error);
        setUploadingFiles(prevFiles =>
          prevFiles.map(f =>
            f.id === fileProgress.id
              ? { 
                  ...f, 
                  status: 'error',
                  errorMessage: error instanceof Error ? error.message : 'Upload failed'
                }
              : f
          )
        );
      } finally {
        // Always refresh the file list to ensure it's up to date
        await fetchFiles();
      }
    }
  };

  const handleCancelUpload = (fileId: string) => {
    setUploadingFiles(prevFiles =>
      prevFiles.map(f =>
        f.id === fileId
          ? { ...f, status: 'cancelled' }
          : f
      )
    );
  };

  const handleRetryUpload = (fileId: string) => {
    const fileToRetry = uploadingFiles.find(f => f.id === fileId);
    if (!fileToRetry?.originalFile) return;

    // Create a new FileWithPreview from the original file
    const fileWithPreview = Object.assign(fileToRetry.originalFile, {
      preview: URL.createObjectURL(fileToRetry.originalFile),
      isValid: true,
      errors: []
    }) as FileWithPreview;

    // Create a new upload entry and start upload
    handleFilesValidated([fileWithPreview]);
  };

  // Configure drag and drop for FileValidator
  const handleDragDrop = (files: File[]) => {
    const filesWithPreview = files.map(file => ({
      ...file,
      preview: URL.createObjectURL(file),
      isValid: true,
      errors: []
    } as FileWithPreview));
    
    handleFilesValidated(filesWithPreview);
  };

  return (
    <div className="max-h-screen overflow-y-hidden overflow-x-hidden">
      <SidebarProvider>
          <AppSidebar
            onFileSelect={handleFileSelect}
            onFilesReorder={handleFilesReorder}
            organizationId={organizationId}
            files={files}
            loading={loading || isReordering}
            isAdmin={isAdmin}
            onQuickUpload={handleQuickUpload}
        />
        <SidebarInset>
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between bg-background border-b border-border shadow-sm">
            <div className="flex items-center gap-2 min-w-0 flex-1 h-16 px-4 mr-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="flex-1 min-w-0">
                <TabList
                  key={key}
                  className="w-full"
                  tabKey={key}
                  tabs={tabs.map(tab => ({
                    id: tab.id,
                    label: tab.file.originalFilename || tab.file.title,
                    isActive: tab.id === activeTabId,
                    isModified: tab.isModified
                  }))}
                  onTabSelect={id => {
                    const tab = tabs.find(t => t.id === id);
                    if (tab) {
                      addTab(tab.file);
                      setTabModified(id, false);
                    }
                  }}
                  onTabClose={closeTab}
                  onTabsReorder={newTabs => {
                    reorderTabs(newTabs.map(t => tabs.find(tab => tab.id === t.id)!));
                  }}
                />
              </div>
            </div>
            <div>
      
            </div>
            <div className="flex items-center gap-3 px-4">
                <span className="text-sm font-medium text-muted-foreground">Welcome, {user?.role} {user?.name}</span>
              <div className="relative" ref={dropdownRef}>
                <div
                  id="profile-pic"
                  className="h-[40px] w-[40px] border border-gray-300 rounded-full bg-contain bg-center cursor-pointer"
                  style={{ backgroundImage: "url(/user-3.png)" }}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                ></div>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 "
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>
          <div className="w-full h-full flex">
            <div 
              className="flex-1 h-full"
              style={{ marginRight: isCollapsed ? 0 : width }}
            >
              {/* Content Layer */}
              <div className={`absolute inset-0 bg-white border-t ${activeTab ? 'z-30' : 'z-20'}`}>
                {activeTab ? (
                  <div className="w-full h-full">
                    <SmartFileRenderer file={activeTab.file} />
                  </div>
                ) : (
                  <div className="w-full h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8 space-y-8">
                    <div className="text-center space-y-4">
                      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <File className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No file selected</h3>
                        <p className="text-muted-foreground">Select a file from the sidebar to view its content</p>
                      </div>
                    </div>
                    
                    {isAdmin && (
                      <div className="w-full max-w-md">
                        <FileValidator 
                          onFilesReadyForUpload={handleFilesValidated}
                          customClasses={{
                            root: "bg-transparent shadow-none border-none",
                            dropzone: "border-2 border-dashed border-gray-300 hover:border-primary transition-colors hover:bg-gray-50 p-6 rounded-lg",
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
              {showUploadModal && (
                <UploadProgressModal
                  files={uploadingFiles}
                  isOpen={showUploadModal}
                  onClose={() => setShowUploadModal(false)}
                  onCancelFile={handleCancelUpload}
                  onRetryFile={handleRetryUpload}
                />
              )}
            </div>
            
            {/* Fixed positioned sidebar anchored to right side */}
            <div 
              className={`fixed top-16 right-0 h-[calc(100vh-4rem)] overflow-hidden z-40 ${
                !isResizing ? 'transition-all duration-300 ease-in-out' : ''
              }`}
              style={{ width: isCollapsed ? 0 : width }}
            >
              {/* Collapse button when sidebar is collapsed */}
              {isCollapsed && (
                <button
                  onClick={() => {
                    setIsCollapsed(false);
                    setWidth(450);
                  }}
                  className="fixed top-[5rem] right-6 w-12 h-12 bg-gray-100 border border-gray-400 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors shadow-lg z-50"
                  // title="Expand GYST Sidebar"
                >
                  <img src="/gyst-remake-flip.png" alt="GYST Logo" className="h-6 w-6" />
                </button>
              )}
              
              {/* Sidebar content - always rendered but hidden when collapsed */}
              <div
                id="gyst-sidebar"
                className={`w-full h-full bg-gray-100 border border-gray-400 box-border flex flex-col transition-opacity duration-300 ${
                  isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <div className="flex justify-between gap-2 p-4 pb-0">
                  <span className="text-lg font-bold">GYST-AI</span>
                  <button
                    className="text-gray-500 hover:bg-gray-300 transition-colors w-6 h-6 rounded-full flex items-center justify-center"
                    onClick={() => {
                      setIsCollapsed(true);
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 p-4 pt-0 overflow-y-auto">
                  <ChatInterface key="gyst-chat-stable" />
                </div>
              </div>
              
              {/* Resize handle - positioned on the left edge of the sidebar */}
              {!isCollapsed && (
                <div
                  id="sidebar-resize-handle"
                  className="absolute top-0 left-0 w-1 h-full cursor-ew-resize hover:bg-gray-200 bg-gray-300 transition-colors z-10"
                  onMouseDown={handleMouseDown}
                ></div>
              )}
            </div> {/* Closes Gyst AI sidebar container */}
          </div> {/* Closes the main content wrapper <div className="w-full h-full flex"> */}
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
