
import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  FolderOpen, 
  FileText, 
  Settings, 
  HelpCircle, 
  LogOut,
  User
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Projetos", url: "/projetos", icon: FolderOpen },
  { title: "Relatórios", url: "/relatorios", icon: FileText },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

const supportItems = [
  { title: "Suporte", url: "/suporte", icon: HelpCircle },
];

export function AppSidebar() {
  const { collapsed } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const user = JSON.parse(localStorage.getItem("versys_user") || "{}");

  const isActive = (path: string) => currentPath === path;

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-versys-accent/20 text-versys-primary font-medium border-r-2 border-versys-accent" 
      : "hover:bg-versys-secondary/10 text-white/90 hover:text-white";

  const handleLogout = () => {
    localStorage.removeItem("versys_user");
    toast.success("Logout realizado com sucesso!");
    navigate("/");
  };

  return (
    <Sidebar
      className={`${collapsed ? "w-16" : "w-64"} bg-versys-primary border-r-0`}
      collapsible
    >
      <SidebarContent className="bg-versys-primary">
        {/* Logo */}
        <div className="p-4 flex justify-center">
          <img 
            src="/lovable-uploads/a4359bba-bc5d-4bf2-98b0-566712fd53b8.png" 
            alt="VERSYS Logo" 
            className={`${collapsed ? "h-8" : "h-12"} w-auto`}
          />
        </div>

        <Separator className="bg-versys-secondary/30" />

        {/* User Info */}
        {!collapsed && (
          <div className="p-4 flex items-center space-x-3">
            <Avatar className="h-10 w-10 bg-versys-accent">
              <AvatarFallback className="bg-versys-accent text-versys-primary font-semibold">
                {user.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.name || "Usuário"}
              </p>
              <p className="text-xs text-white/70 truncate">
                {user.email || "user@email.com"}
              </p>
            </div>
          </div>
        )}

        <Separator className="bg-versys-secondary/30" />

        {/* Main Menu */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="bg-versys-secondary/30" />

        {/* Support Menu */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {supportItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="bg-versys-secondary/30" />

        {/* Logout */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="hover:bg-red-500/20 text-white/90 hover:text-white">
                  <LogOut className="h-4 w-4" />
                  {!collapsed && <span>Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
