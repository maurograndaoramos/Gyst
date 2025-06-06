'use client'
import * as React from "react"
import { FileDisplay } from "@/components/ui/fileDisplay"
import { AppSidebar } from "@/components/app-sidebar"
import { useSession } from "next-auth/react"
import { useParams } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

// Types for file data
interface FileData {
  id: string
  title: string
  originalFilename: string | null
  filePath: string | null
  content: string | null
  createdAt: Date | null
}

export default function OrganizationDashboard() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const organizationId = params.organizationId as string
  
  // File state
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [organizationFiles, setOrganizationFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load organization files on mount
  useEffect(() => {
    if (organizationId && session?.user) {
      loadOrganizationFiles();
    }
  }, [organizationId, session]);

  const loadOrganizationFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/files?organizationId=${organizationId}`);
      if (response.ok) {
        const files = await response.json();
        setOrganizationFiles(files);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (file: FileData) => {
    setSelectedFile(file);
  };

  // Handle dropdown click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    router.push('/login');
  };

  // Generate breadcrumb from selected file
  const pathSegments = selectedFile?.originalFilename 
    ? selectedFile.originalFilename.split('/').filter(Boolean)
    : [];

  return (
    <div className="max-h-screen overflow-y-hidden overflow-x-hidden">
      <SidebarProvider>
        <AppSidebar 
          organizationId={organizationId}
          files={organizationFiles}
          onFileSelect={handleFileSelect}
          loading={loading}
        />
        <SidebarInset>
          <header className="border-b border-gray-400 sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 bg-background px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href={`/${organizationId}/dashboard`}>
                      Dashboard
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {pathSegments.map((segment, index) => {
                    const isLast = index === pathSegments.length - 1;
                    return (
                      <React.Fragment key={index}>
                        <BreadcrumbSeparator className="hidden md:block" />
                        <BreadcrumbItem className="hidden md:block">
                          {isLast ? (
                            <BreadcrumbPage>{segment}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink href="#">{segment}</BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </React.Fragment>
                    );
                  })}
                  {!selectedFile && (
                    <BreadcrumbItem>
                      <BreadcrumbPage>No file selected</BreadcrumbPage>
                    </BreadcrumbItem>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                Welcome, {session?.user?.name || 'User'}
              </span>
              <div className="relative" ref={dropdownRef}>
                <div
                  className="h-[50px] w-[50px] border border-gray-300 rounded-full bg-cover bg-center cursor-pointer"
                  style={{ backgroundImage: "url(/user-2.png)" }}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                ></div>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
            <FileDisplay 
              content={selectedFile?.content || ''} 
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
