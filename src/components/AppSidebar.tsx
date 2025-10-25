import { Home, FolderOpen, FileText, Settings, LogOut, User, Users, UserCheck, CheckSquare, Package, ClipboardList } from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LocationInfo } from "@/components/LocationInfo";


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
  title: "Itens",
  url: "/itens",
  icon: Package
}, {
  title: "Checklist",
  url: "/checklist",
  icon: ClipboardList
}, {
  title: "Clientes",
  url: "/clientes",
  icon: Users
}, {
  title: "Colaboradores",
  url: "/colaboradores",
  icon: UserCheck
}];

const clientMenuItems = [{
  title: "Meus Projetos",
  url: "/client-projects",
  icon: FolderOpen
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
    if (path === "/client-projects") {
      return currentPath.startsWith("/client-projects");
    }
    if (path === "/adequacoes") {
      return currentPath === "/adequacoes";
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
    
    // Remover prefixo de cargo do displayName (ex: "Administrador DEVANA" -> "DEVANA")
    let displayName = userData.displayName || "";
    
    // Remover prefixos comuns de cargo
    const prefixes = ["Administrador ", "Colaborador ", "Cliente "];
    for (const prefix of prefixes) {
      if (displayName.startsWith(prefix)) {
        displayName = displayName.substring(prefix.length);
        break;
      }
    }
    
    switch (userData.type) {
      case "admin":
        return displayName || "Admin";
      case "colaborador":
        return displayName || "Colaborador";
      case "client":
        return userData.company || displayName || "Cliente";
      default:
        return displayName || "Usuário";
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
      <Sidebar className="border-r-0" collapsible="offcanvas">
        <div className="absolute inset-0 bg-gradient-to-b from-versys-primary to-versys-secondary"></div>
        <div className="relative z-10 h-full flex flex-col">
          {/* Header com logo - responsivo */}
          <SidebarHeader className="border-b border-white/10">
            <div className="flex items-center justify-center">
              <img 
                src={`/versys-logo.png?v=${Date.now()}`} 
                alt="VERSYS Logo" 
                className="w-12 h-12 md:w-16 md:h-16 object-contain"
              />
            </div>
          </SidebarHeader>

          {/* Área do usuário - responsivo */}
          <div className="px-3 md:px-4 py-4 md:py-6 border-b border-white/10">
            <div className="flex items-center gap-2 md:gap-3">
              <Avatar className="h-8 w-8 md:h-10 md:w-10 border-2 border-white/20">
                <AvatarImage src="" />
                <AvatarFallback className="bg-white/10 text-white font-semibold text-xs md:text-sm">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <span className="text-white text-xs md:text-sm font-medium truncate block">
                    {getUserDisplayName()}
                  </span>
                  <span className="text-white/60 text-xs truncate block">
                    {getUserRole()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Menu principal - ocupa o espaço disponível */}
          <SidebarContent className="flex-1 px-2 md:px-3 py-3 md:py-4">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {getMenuItems().map(item => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`
                          h-9 md:h-10 px-2 md:px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95
                          ${isActive(item.url) 
                            ? "bg-white/20 text-white font-medium shadow-sm hover:bg-white/25" 
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                          }
                        `}
                      >
                        <NavLink to={item.url} className="flex items-center gap-2 md:gap-3">
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          {!isCollapsed && <span className="truncate text-sm md:text-base">{item.title}</span>}
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

          </SidebarContent>

          {/* Footer com localização e botão de sair - fixo na parte inferior */}
          <SidebarFooter className="mt-auto border-t border-white/10">
            {/* Informações de Localização */}
            {!isCollapsed && <LocationInfo />}
            
            <div className="p-3 md:p-4">
              <Button 
                variant="ghost" 
                onClick={handleLogout} 
                className="
                  w-full h-9 md:h-10 px-2 md:px-3 py-2 rounded-lg
                  justify-start gap-2 md:gap-3
                  text-white/80 hover:bg-white/10 hover:text-white
                  transition-all duration-200
                "
              >
                <LogOut className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && <span className="truncate text-sm md:text-base">Sair</span>}
              </Button>
            </div>
          </SidebarFooter>
        </div>
      </Sidebar>
    </div>
  );
}