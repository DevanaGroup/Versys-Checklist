
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 flex items-center px-4 sticky top-0 z-10 shadow-sm">
            <SidebarTrigger className="text-versys-primary hover:bg-versys-primary/10 hover:scale-105 transition-all duration-200 rounded-lg p-2" />
          </header>
          <main className="flex-1 animate-fadeInUp p-6 flex flex-col">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
