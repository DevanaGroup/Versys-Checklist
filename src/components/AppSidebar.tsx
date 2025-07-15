import { Home, FolderOpen, FileText, Settings, HelpCircle, LogOut, User, Users, UserCheck, CheckSquare } from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

const adminMenuItems = [{
  title: "Dashboard",
  url: "/dashboard",
  icon: Home
}, {
  title: "Projetos",
  url: "/projetos",
  icon: FolderOpen
}, {
  title: "Presets",
  url: "/presets",
  icon: CheckSquare
}, {
  title: "Clientes",
  url: "/clientes",
  icon: Users
}, {
  title: "Colaboradores",
  url: "/colaboradores",
  icon: UserCheck
}, {
  title: "Relatórios",
  url: "/relatorios",
  icon: FileText
}, {
  title: "Configurações",
  url: "/configuracoes",
  icon: Settings
}];

const clientMenuItems = [{
  title: "Dashboard",
  url: "/client-dashboard",
  icon: Home
}, {
  title: "Meus Projetos",
  url: "/client-dashboard",
  icon: FolderOpen
}];

const supportItems = [{
  title: "Suporte",
  url: "/suporte",
  icon: HelpCircle
}];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const { userData, logout: authLogout } = useAuthContext();
  
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  // Log para debug quando userData muda
  useEffect(() => {
    console.log('AppSidebar: userData atualizado:', userData);
  }, [userData]);

  const handleLogout = async () => {
    try {
      console.log('AppSidebar: Iniciando logout...');
      await authLogout();
      toast.success("Logout realizado com sucesso!");
      console.log('AppSidebar: Logout realizado com sucesso');
      navigate("/");
    } catch (error) {
      console.error('AppSidebar: Erro ao fazer logout:', error);
      toast.error("Erro ao fazer logout");
    }
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/dashboard";
    }
    if (path === "/client-dashboard") {
      return currentPath === "/client-dashboard";
    }
    return currentPath.startsWith(path);
  };

  const getUserInitials = () => {
    if (!userData) return "U";
    switch (userData.type) {
      case "admin":
        return "AD";
      case "colaborador":
        return "CO";
      case "client":
        return userData.company ? userData.company.substring(0, 2).toUpperCase() : "CL";
      default:
        return "U";
    }
  };

  const getUserDisplayName = () => {
    if (!userData) return "Usuário";
    switch (userData.type) {
      case "admin":
        return userData.displayName || "Admin";
      case "colaborador":
        return userData.displayName || "Colaborador";
      case "client":
        return userData.company || userData.displayName || "Cliente";
      default:
        return userData.displayName || "Usuário";
    }
  };

  const getUserRole = () => {
    if (!userData) return "Usuário";
    switch (userData.type) {
      case "admin":
        return "Administrador";
      case "colaborador":
        return "Colaborador";
      case "client":
        return "Cliente";
      default:
        return "Usuário";
    }
  };

  const getMenuItems = () => {
    // Clientes têm menu específico, admin e colaborador têm menu completo
    return userData?.type === "client" ? clientMenuItems : adminMenuItems;
  };

  return (
    <div className="relative">
      <Sidebar className="border-r-0">
        <div className="absolute inset-0 bg-gradient-to-b from-versys-primary to-versys-secondary"></div>
        <div className="relative z-10 h-full flex flex-col">
          {/* Header com logo */}
          <SidebarHeader className="p-6 flex items-center justify-center border-b border-white/10">
            <div className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/a4359bba-bc5d-4bf2-98b0-566712fd53b8.png" 
                alt="VERSYS Logo" 
                className="h-12 w-auto transition-all duration-300" 
              />
            </div>
          </SidebarHeader>

          {/* Área do usuário */}
          <div className="px-4 py-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10 border-2 border-white/20">
                <AvatarImage src="" />
                <AvatarFallback className="bg-white/20 text-white text-sm font-medium">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-white text-sm font-medium truncate">
                    {getUserDisplayName()}
                  </span>
                  <span className="text-white/60 text-xs truncate">
                    {getUserRole()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Menu principal - ocupa o espaço disponível */}
          <SidebarContent className="flex-1 px-3 py-4">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {getMenuItems().map(item => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`
                          h-10 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95
                          ${isActive(item.url) 
                            ? "bg-white/20 text-white font-medium shadow-sm hover:bg-white/25" 
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                          }
                        `}
                      >
                        <NavLink to={item.url} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          {!isCollapsed && <span className="truncate">{item.title}</span>}
                          {isActive(item.url) && !isCollapsed && (
                            <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Separador visual */}
            <div className="my-6">
              <Separator className="bg-white/10" />
            </div>

            {/* Menu de suporte */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {supportItems.map(item => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`
                          h-10 px-3 py-2 rounded-lg transition-all duration-200
                          ${isActive(item.url) 
                            ? "bg-white/20 text-white font-medium shadow-sm" 
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                          }
                        `}
                      >
                        <NavLink to={item.url} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          {!isCollapsed && <span className="truncate">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* Footer com botão de sair */}
          <SidebarFooter className="p-4 border-t border-white/10 mt-auto">
            <Button 
              variant="ghost" 
              onClick={handleLogout} 
              className="
                w-full h-10 px-3 py-2 rounded-lg
                justify-start gap-3
                text-white/80 hover:bg-white/10 hover:text-white
                transition-all duration-200
              "
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && <span className="truncate">Sair</span>}
            </Button>
          </SidebarFooter>
        </div>
      </Sidebar>
    </div>
  );
}