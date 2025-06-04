'use client'
import * as React from "react"
import { FileDisplay } from "@/components/ui/fileDisplay";
import { AppSidebar } from "@/components/app-sidebar"
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
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
import { ChevronRight, File, Folder, PanelRightClose, PanelRightOpen, Send } from "lucide-react"
import ChatInterface from "@/components/chatInterface";
const fileText = "lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.           <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Ad perferendis itaque vel necessitatibus dignissimos maxime non laborum repellat quaerat sunt qui dolorem perspiciatis, voluptates voluptatibus voluptate, explicabo velit esse fuga eius amet temporibus ipsum fugit placeat deleniti? Sequi recusandae hic animi quasi id obcaecati ratione deserunt reprehenderit. Velit quo et hic itaque, cum exercitationem quidem dolorum praesentium quia excepturi quibusdam molestias ea autem voluptate rem corrupti nobis asperiores mollitia. Inventore officiis dolor quas, rem sunt, tenetur, vero qui ratione maiores in distinctio. Eum vitae temporibus modi iusto exercitationem maxime optio facilis, cumque magni! Sequi, ducimus quam dolor esse amet aliquid autem voluptas maxime, perferendis aspernatur officia modi nulla tenetur quo dignissimos ipsum accusantium? Laboriosam autem labore sed asperiores, obcaecati eius impedit eum, quae similique cumque nesciunt reprehenderit expedita? Praesentium magni laborum non. Dicta quidem dignissimos reprehenderit tenetur rem beatae unde voluptatum ducimus enim porro quas cumque ratione praesentium id, recusandae quibusdam repellendus voluptatibus illum maiores adipisci similique dolores! A unde distinctio vitae et facilis tempora excepturi sint at libero accusamus quaerat perspiciatis labore pariatur iusto suscipit eos porro dolores, modi aliquid? Quibusdam harum, quos perferendis accusantium, in ipsum sint numquam commodi sapiente cum corrupti voluptatibus quia quas excepturi nostrum, distinctio consequatur dolore qui? Consequatur molestiae eius quis, voluptatibus, quaerat esse nisi eligendi earum, odit provident culpa recusandae magnam autem natus. Eligendi voluptates tempora vel cumque non vero accusamus provident aperiam ut velit adipisci eos eum nam dignissimos aliquid quasi harum, excepturi commodi exercitationem temporibus earum ratione quo recusandae autem. Impedit culpa inventore tempora veniam deserunt libero, nobis distinctio et nesciunt eos eveniet odit quaerat neque laborum magni molestiae exercitationem fuga? Rerum dolorum ab enim vero quidem delectus quibusdam quod quo, quisquam fugiat necessitatibus harum sequi doloremque, reprehenderit accusamus error sunt, dolorem deserunt labore. Illum impedit architecto, sapiente nobis tempora fuga. Doloremque beatae voluptas, eius magni ipsam est recusandae alias quam distinctio exercitationem sapiente unde iusto officia in, cum corrupti ex laboriosam ducimus porro eligendi, maxime nulla at explicabo ut. Ipsum voluptates quas, laudantium minima magnam recusandae quod dolor libero ullam nemo eligendi ducimus rem maiores in reprehenderit hic inventore aut, asperiores qui consectetur praesentium cum tenetur earum? Quis porro blanditiis deleniti laudantium cum ab nobis ut officiis non dolorem sit dignissimos harum cumque libero eos aperiam saepe officia illum necessitatibus vel hic, esse velit magni! Ratione quo, quae quasi libero impedit corrupti exercitationem molestias amet officiis fuga animi alias soluta dolor suscipit magni iure minima placeat eos incidunt? Quod vero id ipsam, consectetur officiis, maiores porro iusto nemo rerum quas in et numquam animi ullam tenetur quia optio pariatur cumque, nesciunt perferendis minima odit explicabo hic a! Ut hic doloribus tempore debitis nisi laborum eaque sit quidem temporibus mollitia placeat tenetur eveniet, enim qui sunt rem cum earum iste facere quis quod inventore. Quasi incidunt vero saepe iusto eligendi eius doloremque dolore eos rem ullam, porro at ab neque velit tenetur nulla aliquam nihil, ipsum nam ea eum! Ipsa quo deserunt delectus dolor soluta vel in. Voluptate ea incidunt dolorem.</p>          <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Ad perferendis itaque vel necessitatibus dignissimos maxime non laborum repellat quaerat sunt qui dolorem perspiciatis, voluptates voluptatibus voluptate, explicabo velit esse fuga eius amet temporibus ipsum fugit placeat deleniti? Sequi recusandae hic animi quasi id obcaecati ratione deserunt reprehenderit. Velit quo et hic itaque, cum exercitationem quidem dolorum praesentium quia excepturi quibusdam molestias ea autem voluptate rem corrupti nobis asperiores mollitia. Inventore officiis dolor quas, rem sunt, tenetur, vero qui ratione maiores in distinctio. Eum vitae temporibus modi iusto exercitationem maxime optio facilis, cumque magni! Sequi, ducimus quam dolor esse amet aliquid autem voluptas maxime, perferendis aspernatur officia modi nulla tenetur quo dignissimos ipsum accusantium? Laboriosam autem labore sed asperiores, obcaecati eius impedit eum, quae similique cumque nesciunt reprehenderit expedita? Praesentium magni laborum non. Dicta quidem dignissimos reprehenderit tenetur rem beatae unde voluptatum ducimus enim porro quas cumque ratione praesentium id, recusandae quibusdam repellendus voluptatibus illum maiores adipisci similique dolores! A unde distinctio vitae et facilis tempora excepturi sint at libero accusamus quaerat perspiciatis labore pariatur iusto suscipit eos porro dolores, modi aliquid? Quibusdam harum, quos perferendis accusantium, in ipsum sint numquam commodi sapiente cum corrupti voluptatibus quia quas excepturi nostrum, distinctio consequatur dolore qui? Consequatur molestiae eius quis, voluptatibus, quaerat esse nisi eligendi earum, odit provident culpa recusandae magnam autem natus. Eligendi voluptates tempora vel cumque non vero accusamus provident aperiam ut velit adipisci eos eum nam dignissimos aliquid quasi harum, excepturi commodi exercitationem temporibus earum ratione quo recusandae autem. Impedit culpa inventore tempora veniam deserunt libero, nobis distinctio et nesciunt eos eveniet odit quaerat neque laborum magni molestiae exercitationem fuga? Rerum dolorum ab enim vero quidem delectus quibusdam quod quo, quisquam fugiat necessitatibus harum sequi doloremque, reprehenderit accusamus error sunt, dolorem deserunt labore. Illum impedit architecto, sapiente nobis tempora fuga. Doloremque beatae voluptas, eius magni ipsam est recusandae alias quam distinctio exercitationem sapiente unde iusto officia in, cum corrupti ex laboriosam ducimus porro eligendi, maxime nulla at explicabo ut. Ipsum voluptates quas, laudantium minima magnam recusandae quod dolor libero ullam nemo eligendi ducimus rem maiores in reprehenderit hic inventore aut, asperiores qui consectetur praesentium cum tenetur earum? Quis porro blanditiis deleniti laudantium cum ab nobis ut officiis non dolorem sit dignissimos harum cumque libero eos aperiam saepe officia illum necessitatibus vel hic, esse velit magni! Ratione quo, quae quasi libero impedit corrupti exercitationem molestias amet officiis fuga animi alias soluta dolor suscipit magni iure minima placeat eos incidunt? Quod vero id ipsam, consectetur officiis, maiores porro iusto nemo rerum quas in et numquam animi ullam tenetur quia optio pariatur cumque, nesciunt perferendis minima odit explicabo hic a! Ut hic doloribus tempore debitis nisi laborum eaque sit quidem temporibus mollitia placeat tenetur eveniet, enim qui sunt rem cum earum iste facere quis quod inventore. Quasi incidunt vero saepe iusto eligendi eius doloremque dolore eos rem ullam, porro at ab neque velit tenetur nulla aliquam nihil, ipsum nam ea eum! Ipsa quo deserunt delectus dolor soluta vel in. Voluptate ea incidunt dolorem.</p>"

export default function Page() {
  const [width, setWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

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

  const handleFileSelect = (filePath: string) => {
    setSelectedFilePath(filePath);
  };

  // Split the file path into segments for the breadcrumb
  const pathSegments = selectedFilePath.split('/').filter(Boolean);

  return (
    <div className="max-h-screen overflow-y-hidden overflow-x-hidden">
      <SidebarProvider>
        <AppSidebar onFileSelect={handleFileSelect} />
        <SidebarInset>
          <header className="border-b border-gray-400 sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 bg-background px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  {pathSegments.map((segment, index) => {
                    const isLast = index === pathSegments.length - 1;
                    const path = pathSegments.slice(0, index + 1).join('/');
      
                    return (
                      <React.Fragment key={path}>
                        <BreadcrumbItem className="hidden md:block">
                          {isLast ? (
                            <BreadcrumbPage>{segment}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink href="#">{segment}</BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                        {!isLast && (
                          <BreadcrumbSeparator className="hidden md:block" />
                        )}
                      </React.Fragment>
                    );
                  })}
                  {pathSegments.length === 0 && (
                    <BreadcrumbItem>
                      <BreadcrumbPage>No file selected</BreadcrumbPage>
                    </BreadcrumbItem>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div>
      
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Welcome, User</span>
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
              <FileDisplay content={fileText} />
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
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}