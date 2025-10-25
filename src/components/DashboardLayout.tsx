
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { PageTitleProvider, usePageTitle } from "@/contexts/PageTitleContext";
import { HeaderActionsProvider, useHeaderActions } from "@/contexts/HeaderActionsContext";

function DashboardHeader() {
  const { pageTitle } = usePageTitle();
  const { rightAction } = useHeaderActions();
  
  // Limitar o título a 20 caracteres
  const truncatedTitle = pageTitle.length > 45 ? pageTitle.substring(0, 45) + '...' : pageTitle;
  
  return (
    <header className="h-14 md:h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 flex items-center px-3 md:px-4 sticky top-0 z-50 shadow-sm">
      <SidebarTrigger className="text-versys-primary hover:bg-versys-primary/10 hover:scale-105 transition-all duration-200 rounded-lg p-2 mr-2 md:mr-0" />
      
      {/* Título da página para mobile - só mostra se houver título */}
      {pageTitle && (
        <div className="flex-1 md:hidden absolute left-0 right-0 flex justify-center pointer-events-none px-16">
          <h1 className="text-xs font-semibold text-gray-900">
            {truncatedTitle}
          </h1>
        </div>
      )}
      
      {/* Ação customizada no canto direito (mobile) */}
      {rightAction && (
        <div className="md:hidden ml-auto">
          {rightAction}
        </div>
      )}
    </header>
  );
}

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <PageTitleProvider>
        <HeaderActionsProvider>
          <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 via-white to-gray-100">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <DashboardHeader />
              
              {/* Main content com padding responsivo */}
              <main className="flex-1 animate-fadeInUp p-3 sm:p-4 md:p-6 flex flex-col min-h-0">
                <Outlet />
              </main>
            </div>
          </div>
        </HeaderActionsProvider>
      </PageTitleProvider>
    </SidebarProvider>
  );
}
