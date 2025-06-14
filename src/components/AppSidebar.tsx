import { Home, FolderOpen, FileText, Settings, HelpCircle, LogOut, User } from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
const menuItems = [{
  title: "Dashboard",
  url: "/dashboard",
  icon: Home
}, {
  title: "Projetos",
  url: "/projetos",
  icon: FolderOpen
}, {
  title: "Relatórios",
  url: "/relatorios",
  icon: FileText
}, {
  title: "Configurações",
  url: "/configuracoes",
  icon: Settings
}];
const supportItems = [{
  title: "Suporte",
  url: "/suporte",
  icon: HelpCircle
}];
export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    state
  } = useSidebar();
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
  return <div className="relative">
      <Sidebar className="border-r-0">
        <div className="absolute inset-0 bg-gradient-to-b from-versys-primary to-versys-secondary"></div>
        <div className="relative z-10 h-full">
          <SidebarHeader className="p-4">
            <div className="flex items-center space-x-3">
              <img src="/lovable-uploads/a4359bba-bc5d-4bf2-98b0-566712fd53b8.png" alt="VERSYS Logo" className="h-14 w-auto" />
              {!isCollapsed}
            </div>
          </SidebarHeader>

          <Separator className="bg-white/20" />

          <SidebarContent className="px-2">
            <div className="py-4">
              <div className="flex items-center space-x-3 px-3 py-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-white/20 text-white text-sm">
                    AD
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && <div className="flex flex-col">
                    <span className="text-white text-sm font-medium">Admin</span>
                    <span className="text-white/70 text-xs">Administrador</span>
                  </div>}
              </div>
            </div>

            <Separator className="bg-white/20" />

            <SidebarGroup className="py-4">
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map(item => <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild className={`${isActive(item.url) ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
                        <NavLink to={item.url}>
                          <item.icon className="h-4 w-4" />
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <Separator className="bg-white/20" />

            <SidebarGroup className="py-4">
              <SidebarGroupContent>
                <SidebarMenu>
                  {supportItems.map(item => <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild className={`${isActive(item.url) ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
                        <NavLink to={item.url}>
                          <item.icon className="h-4 w-4" />
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>)}
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
    </div>;
}