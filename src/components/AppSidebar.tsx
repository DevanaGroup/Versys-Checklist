import { Home, FolderOpen, FileText, Settings, HelpCircle, LogOut, User, Users, UserCheck } from "lucide-react";
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
    if (userData.type === "admin") return "AD";
    return userData.company ? userData.company.substring(0, 2).toUpperCase() : "CL";
  };

  const getUserDisplayName = () => {
    if (!userData) return "Usuário";
    if (userData.type === "admin") return userData.displayName || "Admin";
    return userData.company || userData.displayName || "Cliente";
  };

  const getUserRole = () => {
    if (!userData) return "Usuário";
    return userData.type === "admin" ? "Administrador" : "Cliente";
  };

  const getMenuItems = () => {
    return userData?.type === "client" ? clientMenuItems : adminMenuItems;
  };

  return (
    <div className="relative">
      <Sidebar className="border-r-0">
        <div className="absolute inset-0 bg-gradient-to-b from-versys-primary to-versys-secondary"></div>
        <div className="relative z-10 h-full">
          <SidebarHeader className="p-4 flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <img src="/lovable-uploads/a4359bba-bc5d-4bf2-98b0-566712fd53b8.png" alt="VERSYS Logo" className="h-14 w-auto" />
            </div>
          </SidebarHeader>

          <Separator className="bg-white/20" />

          <SidebarContent className="px-2">
            <div className="py-4">
              <div className="flex items-center space-x-3 px-3 py-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-white/20 text-white text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex flex-col">
                    <span className="text-white text-sm font-medium">{getUserDisplayName()}</span>
                    <span className="text-white/70 text-xs">{getUserRole()}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-white/20" />

            <SidebarGroup className="py-4">
              <SidebarGroupContent>
                <SidebarMenu>
                  {getMenuItems().map(item => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`${isActive(item.url) ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
                      >
                        <NavLink to={item.url}>
                          <item.icon className="h-4 w-4" />
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <Separator className="bg-white/20" />

            <SidebarGroup className="py-4">
              <SidebarGroupContent>
                <SidebarMenu>
                  {supportItems.map(item => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`${isActive(item.url) ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
                      >
                        <NavLink to={item.url}>
                          <item.icon className="h-4 w-4" />
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-2">
            <Separator className="bg-white/20 mb-2" />
            <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white">
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span className="ml-2">Sair</span>}
            </Button>
          </SidebarFooter>
        </div>
      </Sidebar>
    </div>
  );
}