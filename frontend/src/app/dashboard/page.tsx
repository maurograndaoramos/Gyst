'use client'
import { FileDisplay } from "@/components/ui/fileDisplay";
import { AppSidebar } from "@/components/app-sidebar"
import ResizeableDiv  from "@/components/ResizableDiv"
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

const fileText = "lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.           <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Ad perferendis itaque vel necessitatibus dignissimos maxime non laborum repellat quaerat sunt qui dolorem perspiciatis, voluptates voluptatibus voluptate, explicabo velit esse fuga eius amet temporibus ipsum fugit placeat deleniti? Sequi recusandae hic animi quasi id obcaecati ratione deserunt reprehenderit. Velit quo et hic itaque, cum exercitationem quidem dolorum praesentium quia excepturi quibusdam molestias ea autem voluptate rem corrupti nobis asperiores mollitia. Inventore officiis dolor quas, rem sunt, tenetur, vero qui ratione maiores in distinctio. Eum vitae temporibus modi iusto exercitationem maxime optio facilis, cumque magni! Sequi, ducimus quam dolor esse amet aliquid autem voluptas maxime, perferendis aspernatur officia modi nulla tenetur quo dignissimos ipsum accusantium? Laboriosam autem labore sed asperiores, obcaecati eius impedit eum, quae similique cumque nesciunt reprehenderit expedita? Praesentium magni laborum non. Dicta quidem dignissimos reprehenderit tenetur rem beatae unde voluptatum ducimus enim porro quas cumque ratione praesentium id, recusandae quibusdam repellendus voluptatibus illum maiores adipisci similique dolores! A unde distinctio vitae et facilis tempora excepturi sint at libero accusamus quaerat perspiciatis labore pariatur iusto suscipit eos porro dolores, modi aliquid? Quibusdam harum, quos perferendis accusantium, in ipsum sint numquam commodi sapiente cum corrupti voluptatibus quia quas excepturi nostrum, distinctio consequatur dolore qui? Consequatur molestiae eius quis, voluptatibus, quaerat esse nisi eligendi earum, odit provident culpa recusandae magnam autem natus. Eligendi voluptates tempora vel cumque non vero accusamus provident aperiam ut velit adipisci eos eum nam dignissimos aliquid quasi harum, excepturi commodi exercitationem temporibus earum ratione quo recusandae autem. Impedit culpa inventore tempora veniam deserunt libero, nobis distinctio et nesciunt eos eveniet odit quaerat neque laborum magni molestiae exercitationem fuga? Rerum dolorum ab enim vero quidem delectus quibusdam quod quo, quisquam fugiat necessitatibus harum sequi doloremque, reprehenderit accusamus error sunt, dolorem deserunt labore. Illum impedit architecto, sapiente nobis tempora fuga. Doloremque beatae voluptas, eius magni ipsam est recusandae alias quam distinctio exercitationem sapiente unde iusto officia in, cum corrupti ex laboriosam ducimus porro eligendi, maxime nulla at explicabo ut. Ipsum voluptates quas, laudantium minima magnam recusandae quod dolor libero ullam nemo eligendi ducimus rem maiores in reprehenderit hic inventore aut, asperiores qui consectetur praesentium cum tenetur earum? Quis porro blanditiis deleniti laudantium cum ab nobis ut officiis non dolorem sit dignissimos harum cumque libero eos aperiam saepe officia illum necessitatibus vel hic, esse velit magni! Ratione quo, quae quasi libero impedit corrupti exercitationem molestias amet officiis fuga animi alias soluta dolor suscipit magni iure minima placeat eos incidunt? Quod vero id ipsam, consectetur officiis, maiores porro iusto nemo rerum quas in et numquam animi ullam tenetur quia optio pariatur cumque, nesciunt perferendis minima odit explicabo hic a! Ut hic doloribus tempore debitis nisi laborum eaque sit quidem temporibus mollitia placeat tenetur eveniet, enim qui sunt rem cum earum iste facere quis quod inventore. Quasi incidunt vero saepe iusto eligendi eius doloremque dolore eos rem ullam, porro at ab neque velit tenetur nulla aliquam nihil, ipsum nam ea eum! Ipsa quo deserunt delectus dolor soluta vel in. Voluptate ea incidunt dolorem.</p>          <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Ad perferendis itaque vel necessitatibus dignissimos maxime non laborum repellat quaerat sunt qui dolorem perspiciatis, voluptates voluptatibus voluptate, explicabo velit esse fuga eius amet temporibus ipsum fugit placeat deleniti? Sequi recusandae hic animi quasi id obcaecati ratione deserunt reprehenderit. Velit quo et hic itaque, cum exercitationem quidem dolorum praesentium quia excepturi quibusdam molestias ea autem voluptate rem corrupti nobis asperiores mollitia. Inventore officiis dolor quas, rem sunt, tenetur, vero qui ratione maiores in distinctio. Eum vitae temporibus modi iusto exercitationem maxime optio facilis, cumque magni! Sequi, ducimus quam dolor esse amet aliquid autem voluptas maxime, perferendis aspernatur officia modi nulla tenetur quo dignissimos ipsum accusantium? Laboriosam autem labore sed asperiores, obcaecati eius impedit eum, quae similique cumque nesciunt reprehenderit expedita? Praesentium magni laborum non. Dicta quidem dignissimos reprehenderit tenetur rem beatae unde voluptatum ducimus enim porro quas cumque ratione praesentium id, recusandae quibusdam repellendus voluptatibus illum maiores adipisci similique dolores! A unde distinctio vitae et facilis tempora excepturi sint at libero accusamus quaerat perspiciatis labore pariatur iusto suscipit eos porro dolores, modi aliquid? Quibusdam harum, quos perferendis accusantium, in ipsum sint numquam commodi sapiente cum corrupti voluptatibus quia quas excepturi nostrum, distinctio consequatur dolore qui? Consequatur molestiae eius quis, voluptatibus, quaerat esse nisi eligendi earum, odit provident culpa recusandae magnam autem natus. Eligendi voluptates tempora vel cumque non vero accusamus provident aperiam ut velit adipisci eos eum nam dignissimos aliquid quasi harum, excepturi commodi exercitationem temporibus earum ratione quo recusandae autem. Impedit culpa inventore tempora veniam deserunt libero, nobis distinctio et nesciunt eos eveniet odit quaerat neque laborum magni molestiae exercitationem fuga? Rerum dolorum ab enim vero quidem delectus quibusdam quod quo, quisquam fugiat necessitatibus harum sequi doloremque, reprehenderit accusamus error sunt, dolorem deserunt labore. Illum impedit architecto, sapiente nobis tempora fuga. Doloremque beatae voluptas, eius magni ipsam est recusandae alias quam distinctio exercitationem sapiente unde iusto officia in, cum corrupti ex laboriosam ducimus porro eligendi, maxime nulla at explicabo ut. Ipsum voluptates quas, laudantium minima magnam recusandae quod dolor libero ullam nemo eligendi ducimus rem maiores in reprehenderit hic inventore aut, asperiores qui consectetur praesentium cum tenetur earum? Quis porro blanditiis deleniti laudantium cum ab nobis ut officiis non dolorem sit dignissimos harum cumque libero eos aperiam saepe officia illum necessitatibus vel hic, esse velit magni! Ratione quo, quae quasi libero impedit corrupti exercitationem molestias amet officiis fuga animi alias soluta dolor suscipit magni iure minima placeat eos incidunt? Quod vero id ipsam, consectetur officiis, maiores porro iusto nemo rerum quas in et numquam animi ullam tenetur quia optio pariatur cumque, nesciunt perferendis minima odit explicabo hic a! Ut hic doloribus tempore debitis nisi laborum eaque sit quidem temporibus mollitia placeat tenetur eveniet, enim qui sunt rem cum earum iste facere quis quod inventore. Quasi incidunt vero saepe iusto eligendi eius doloremque dolore eos rem ullam, porro at ab neque velit tenetur nulla aliquam nihil, ipsum nam ea eum! Ipsa quo deserunt delectus dolor soluta vel in. Voluptate ea incidunt dolorem.</p>"

export default function Page() {
  const [width, setWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

const handleMouseDown = (e: React.MouseEvent) => {
  setIsResizing(true);
  startXRef.current = e.clientX;
  startWidthRef.current = width;
  document.body.style.cursor = "ew-resize"; // Change cursor to "ew-resize"
};

const MAX_WIDTH = 600; // Define the maximum width

const handleMouseMove = (e: MouseEvent) => {
  if (!isResizing) return;

  const deltaX = startXRef.current - e.clientX;
  const newWidth = startWidthRef.current + deltaX;

  if (newWidth < 150) {
    setIsCollapsed(true);
    setWidth(300);
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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">components</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">ui</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>button.tsx</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="w-full h-full p-4 flex gap-4">
          <FileDisplay content={fileText} />
          {/* <div className="grid auto-rows-min gap-4 md:grid-cols-3"> */}
          <div id="collapseableSideBar" className="h-full" style={{ minWidth: isCollapsed ? 0 : width }}>
            <div 
              className={`fixed top-[5rem] right-4 rounded-l h-[calc(100vh-5rem)] bg-gray-100 bg-red-500 transition-all duration-200 ${isCollapsed ? 'translate-x-full' : ''}`}
              style={{ width: width }}
            >
<div 
  className={`absolute left-0 top-0 bottom-0 w-1 ${isCollapsed ? 'cursor-pointer' : 'cursor-col-resize'} hover:bg-gray-300`}
onMouseDown={!isCollapsed ? handleMouseDown : undefined}
onClick={isCollapsed ? () => {
    setIsCollapsed(false);
    setWidth(300); // Restore original width
  } : undefined}
/>
            </div>
          </div>
          {/* <div className="h-full min-w-[300px] w bg-red-500 resize-x overflow-auto">
          </div> */}
            {/* <ResizeableDiv></ResizeableDiv> */}
          {/* </div> */}
          {/* <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" /> */}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
