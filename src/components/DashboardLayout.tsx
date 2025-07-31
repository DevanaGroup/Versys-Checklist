
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header responsivo */}
          <header className="h-14 md:h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 flex items-center px-3 md:px-4 sticky top-0 z-50 shadow-sm">
            <SidebarTrigger className="text-versys-primary hover:bg-versys-primary/10 hover:scale-105 transition-all duration-200 rounded-lg p-2 mr-2 md:mr-0" />
            
            {/* Título da página para mobile */}
            <div className="flex-1 md:hidden">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {/* O título será definido dinamicamente por cada página */}
              </h1>
            </div>
          </header>
          
          {/* Main content com padding responsivo */}
          <main className="flex-1 animate-fadeInUp p-3 sm:p-4 md:p-6 flex flex-col min-h-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
