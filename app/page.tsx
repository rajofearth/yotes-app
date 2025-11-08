import { AppSidebar } from "@/components/home/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { HomeMenubar } from "@/components/home/menubar"

export default function Home() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <HomeMenubar />
        </header>
        <div className="flex flex-1 flex-col p-4">
          {/* Content area */}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
