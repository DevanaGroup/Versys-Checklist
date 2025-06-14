
import { Home, FolderOpen, FileText, Settings, HelpCircle, LogOut, User } from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Projetos", url: "/projetos", icon: FolderOpen },
  { title: "Relatórios", url: "/relatorios", icon: FileText },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

const supportItems = [
  { title: "Suporte", url: "/suporte", icon: HelpCircle },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const handleLogout = () => {
    localStorage.removeItem("versys_user");
    navigate("/");
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/dashboard";
    }
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar className="bg-versys-primary border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-3">
          <img 
            src="/lovable-uploads/a4359bba-bc5d-4bf2-98b0-566712fd53b8.png" 
            alt="VERSYS Logo" 
            className="h-8 w-auto"
          />
          {!isCollapsed && (
            <span className="text-white font-semibold text-lg">VERSYS</span>
          )}
        </div>
      </SidebarHeader>

      <Separator className="bg-versys-secondary/30" />

      <SidebarContent className="px-2">
        <div className="py-4">
          <div className="flex items-center space-x-3 px-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback className="bg-versys-secondary text-white text-sm">
                AD
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">Admin</span>
                <span className="text-versys-secondary text-xs">Administrador</span>
              </div>
            )}
          </div>
        </div>

        <Separator className="bg-versys-secondary/30" />

        <SidebarGroup className="py-4">
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={`${
                      isActive(item.url) 
                        ? "bg-versys-secondary text-white" 
                        : "text-versys-secondary hover:bg-versys-secondary/20 hover:text-white"
                    }`}
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

        <Separator className="bg-versys-secondary/30" />

        <SidebarGroup className="py-4">
          <SidebarGroupContent>
            <SidebarMenu>
              {supportItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={`${
                      isActive(item.url) 
                        ? "bg-versys-secondary text-white" 
                        : "text-versys-secondary hover:bg-versys-secondary/20 hover:text-white"
                    }`}
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
        <Separator className="bg-versys-secondary/30 mb-2" />
        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="w-full justify-start text-versys-secondary hover:bg-versys-secondary/20 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
