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

const fileText = "lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.           <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Ad perferendis itaque vel necessitatibus dignissimos maxime non laborum repellat quaerat sunt qui dolorem perspiciatis, voluptates voluptatibus voluptate, explicabo velit esse fuga eius amet temporibus ipsum fugit placeat deleniti? Sequi recusandae hic animi quasi id obcaecati ratione deserunt reprehenderit. Velit quo et hic itaque, cum exercitationem quidem dolorum praesentium quia excepturi quibusdam molestias ea autem voluptate rem corrupti nobis asperiores mollitia. Inventore officiis dolor quas, rem sunt, tenetur, vero qui ratione maiores in distinctio. Eum vitae temporibus modi iusto exercitationem maxime optio facilis, cumque magni! Sequi, ducimus quam dolor esse amet aliquid autem voluptas maxime, perferendis aspernatur officia modi nulla tenetur quo dignissimos ipsum accusantium? Laboriosam autem labore sed asperiores, obcaecati eius impedit eum, quae similique cumque nesciunt reprehenderit expedita? Praesentium magni laborum non. Dicta quidem dignissimos reprehenderit tenetur rem beatae unde voluptatum ducimus enim porro quas cumque ratione praesentium id, recusandae quibusdam repellendus voluptatibus illum maiores adipisci similique dolores! A unde distinctio vitae et facilis tempora excepturi sint at libero accusamus quaerat perspiciatis labore pariatur iusto suscipit eos porro dolores, modi aliquid? Quibusdam harum, quos perferendis accusantium, in ipsum sint numquam commodi sapiente cum corrupti voluptatibus quia quas excepturi nostrum, distinctio consequatur dolore qui? Consequatur molestiae eius quis, voluptatibus, quaerat esse nisi eligendi earum, odit provident culpa recusandae magnam autem natus. Eligendi voluptates tempora vel cumque non vero accusamus provident aperiam ut velit adipisci eos eum nam dignissimos aliquid quasi harum, excepturi commodi exercitationem temporibus earum ratione quo recusandae autem. Impedit culpa inventore tempora veniam deserunt libero, nobis distinctio et nesciunt eos eveniet odit quaerat neque laborum magni molestiae exercitationem fuga? Rerum dolorum ab enim vero quidem delectus quibusdam quod quo, quisquam fugiat necessitatibus harum sequi doloremque, reprehenderit accusamus error sunt, dolorem deserunt labore. Illum impedit architecto, sapiente nobis tempora fuga. Doloremque beatae voluptas, eius magni ipsam est recusandae alias quam distinctio exercitationem sapiente unde iusto officia in, cum corrupti ex laboriosam ducimus porro eligendi, maxime nulla at explicabo ut. Ipsum voluptates quas, laudantium minima magnam recusandae quod dolor libero ullam nemo eligendi ducimus rem maiores in reprehenderit hic inventore aut, asperiores qui consectetur praesentium cum tenetur earum? Quis porro blanditiis deleniti laudantium cum ab nobis ut officiis non dolorem sit dignissimos harum cumque libero eos aperiam saepe officia illum necessitatibus vel hic, esse velit magni! Ratione quo, quae quasi libero impedit corrupti exercitationem molestias amet officiis fuga animi alias soluta dolor suscipit magni iure minima placeat eos incidunt? Quod vero id ipsam, consectetur officiis, maiores porro iusto nemo rerum quas in et numquam animi ullam tenetur quia optio pariatur cumque, nesciunt perferendis minima odit explicabo hic a! Ut hic doloribus tempore debitis nisi laborum eaque sit quidem temporibus mollitia placeat tenetur eveniet, enim qui sunt rem cum earum iste facere quis quod inventore. Quasi incidunt vero saepe iusto eligendi eius doloremque dolore eos rem ullam, porro at ab neque velit tenetur nulla aliquam nihil, ipsum nam ea eum! Ipsa quo deserunt delectus dolor soluta vel in. Voluptate ea incidunt dolorem.</p>          <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Ad perferendis itaque vel necessitatibus dignissimos maxime non laborum repellat quaerat sunt qui dolorem perspiciatis, voluptates voluptatibus voluptate, explicabo velit esse fuga eius amet temporibus ipsum fugit placeat deleniti? Sequi recusandae hic animi quasi id obcaecati ratione deserunt reprehenderit. Velit quo et hic itaque, cum exercitationem quidem dolorum praesentium quia excepturi quibusdam molestias ea autem voluptate rem corrupti nobis asperiores mollitia. Inventore officiis dolor quas, rem sunt, tenetur, vero qui ratione maiores in distinctio. Eum vitae temporibus modi iusto exercitationem maxime optio facilis, cumque magni! Sequi, ducimus quam dolor esse amet aliquid autem voluptas maxime, perferendis aspernatur officia modi nulla tenetur quo dignissimos ipsum accusantium? Laboriosam autem labore sed asperiores, obcaecati eius impedit eum, quae similique cumque nesciunt reprehenderit expedita? Praesentium magni laborum non. Dicta quidem dignissimos reprehenderit tenetur rem beatae unde voluptatum ducimus enim porro quas cumque ratione praesentium id, recusandae quibusdam repellendus voluptatibus illum maiores adipisci similique dolores! A unde distinctio vitae et facilis tempora excepturi sint at libero accusamus quaerat perspiciatis labore pariatur iusto suscipit eos porro dolores, modi aliquid? Quibusdam harum, quos perferendis accusantium, in ipsum sint numquam commodi sapiente cum corrupti voluptatibus quia quas excepturi nostrum, distinctio consequatur dolore qui? Consequatur molestiae eius quis, voluptatibus, quaerat esse nisi eligendi earum, odit provident culpa recusandae magnam autem natus. Eligendi voluptates tempora vel cumque non vero accusamus provident aperiam ut velit adipisci eos eum nam dignissimos aliquid quasi harum, excepturi commodi exercitationem temporibus earum ratione quo recusandae autem. Impedit culpa inventore tempora veniam deserunt libero, nobis distinctio et nesciunt eos eveniet odit quaerat neque laborum magni molestiae exercitationem fuga? Rerum dolorum ab enim vero quidem delectus quibusdam quod quo, quisquam fugiat necessitatibus harum sequi doloremque, reprehenderit accusamus error sunt, dolorem deserunt labore. Illum impedit architecto, sapiente nobis tempora fuga. Doloremque beatae voluptas, eius magni ipsam est recusandae alias quam distinctio exercitationem sapiente unde iusto officia in, cum corrupti ex laboriosam ducimus porro eligendi, maxime nulla at explicabo ut. Ipsum voluptates quas, laudantium minima magnam recusandae quod dolor libero ullam nemo eligendi ducimus rem maiores in reprehenderit hic inventore aut, asperiores qui consectetur praesentium cum tenetur earum? Quis porro blanditiis deleniti laudantium cum ab nobis ut officiis non dolorem sit dignissimos harum cumque libero eos aperiam saepe officia illum necessitatibus vel hic, esse velit magni! Ratione quo, quae quasi libero impedit corrupti exercitationem molestias amet officiis fuga animi alias soluta dolor suscipit magni iure minima placeat eos incidunt? Quod vero id ipsam, consectetur officiis, maiores porro iusto nemo rerum quas in et numquam animi ullam tenetur quia optio pariatur cumque, nesciunt perferendis minima odit explicabo hic a! Ut hic doloribus tempore debitis nisi laborum eaque sit quidem temporibus mollitia placeat tenetur eveniet, enim qui sunt rem cum earum iste facere quis quod inventore. Quasi incidunt vero saepe iusto eligendi eius doloremque dolore eos rem ullam, porro at ab neque velit tenetur nulla aliquam nihil, ipsum nam ea eum! Ipsa quo deserunt delectus dolor soluta vel in. Voluptate ea incidunt dolorem.</p>"

export default function Page() {
  const [width, setWidth] = useState(350);
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
      setWidth(350);
    } else if (newWidth > MAX_WIDTH) {
      setWidth(MAX_WIDTH);
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
                className="h-[50px] w-[50px] border border-gray-300 rounded-full bg-cover bg-center cursor-pointer" 
                style={{ backgroundImage: "url('https://thumbs.dreamstime.com/z/creative-vector-illustration-default-avatar-profile-placeholder-isolated-background-art-design-grey-photo-blank-template-mo-118823351.jpg?ct=jpeg)" }}
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
        <div className="w-full h-full p-4 flex gap-4">
          <FileDisplay content={fileText} />
          {/* <div className="grid auto-rows-min gap-4 md:grid-cols-3"> */}
          <div id="collapseableSideBar" className="h-full" style={{ minWidth: isCollapsed ? 0 : width }}>
            {isCollapsed && (
              <button
                onClick={() => {
                  setIsCollapsed(false);
                  setWidth(350);
                }}
                className="fixed top-[5rem] right-4 w-8 h-8 bg-gray-100 border border-gray-400 rounded-md flex items-center justify-center hover:bg-gray-200 transition-colors shadow-sm z-50"
              >
                <PanelRightOpen className="w-4 h-4" />
              </button>
            )}
            <div 
              className={`border border-gray-400 bg-gray-100 fixed top-[5rem] p-10 right-4 h-[calc(100vh-5rem)] bg-gray-100 transition-all duration-200 ${isCollapsed ? 'translate-x-full cursor-pointer' : ''}`}
              style={{ width: width }}
              onClick={isCollapsed ? () => {
                setIsCollapsed(false);
                setWidth(350); // Restore original width
              } : undefined}
            >
              <div className="absolute top-2 left-2 flex items-center gap-2">
                <img src="/gyst-logo-black.png" alt="GYST Logo" className="h-6 w-6" />
                <span className="text-lg font-bold ">GYST-AI</span>
              </div>
              {!isCollapsed && (
                <button 
                  className="absolute top-2 right-2 bg-gray-300 hover:bg-gray-400 text-black rounded px-2 py-1"
                  onClick={() => {
                    setIsCollapsed(true);
                    setWidth(0); // Collapse the div
                  }}
                >
                  <PanelRightClose className="w-4 h-4" />
                </button>
              )}
              <div id="prompt-area" className="absolute bottom-0 left-0 w-full flex flex-col justify-center items-center p-6">
                <p className="text-center text-xl font-bold mb-4">How can I help?</p>
                <div className="relative w-full">
                  <Textarea className="w-full pr-12" />
                  <button 
                    className="absolute right-2 bottom-2 p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-md hover:bg-gray-100"
                    onClick={() => {
                      // Handle submit logic here
                      console.log('Submit clicked');
                    }}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div 
                className={`absolute left-0 top-0 bottom-0 w-1 ${!isCollapsed ? 'cursor-ew-resize hover:bg-blue-500' : ''}`}
                onMouseDown={!isCollapsed ? handleMouseDown : undefined}
              ></div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}