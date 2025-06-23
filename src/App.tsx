import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import { DashboardLayout } from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Projetos from "./pages/Projetos";
import NewProject from "./pages/NewProject";
import NotFound from "./pages/NotFound";
import ClientDashboard from "./pages/ClientDashboard";
import Clientes from "./pages/Clientes";
import Colaboradores from "./pages/Colaboradores";
import ColaboradorFirstLogin from "./pages/ColaboradorFirstLogin";
import ClienteFirstLogin from "./pages/ClienteFirstLogin";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";

const queryClient = new QueryClient();

// Componente para verificar autenticação
const ProtectedRoute = ({ children, requiredType }: { children: React.ReactNode, requiredType?: string }) => {
  const { userData, loading, isAuthenticated } = useAuthContext();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-versys-primary"></div>
    </div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  // Verifica tipo de usuário se necessário
  if (requiredType && userData?.type && userData.type !== requiredType) {
    // Se o tipo não corresponde, redireciona para o dashboard apropriado
    if (userData.type === "admin") {
      return <Navigate to="/dashboard" replace />;
    } else if (userData.type === "client") {
      return <Navigate to="/client-dashboard" replace />;
    }
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/colaborador/primeiro-acesso" element={<ColaboradorFirstLogin />} />
            <Route path="/cliente/primeiro-acesso" element={<ClienteFirstLogin />} />
            
            {/* Rotas para Administradores */}
            <Route path="/dashboard" element={
              <ProtectedRoute requiredType="admin">
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
            </Route>
            <Route path="/projetos" element={
              <ProtectedRoute requiredType="admin">
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Projetos />} />
              <Route path="new" element={<NewProject />} />
            </Route>
            <Route path="/clientes" element={
              <ProtectedRoute requiredType="admin">
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Clientes />} />
            </Route>
            <Route path="/colaboradores" element={
              <ProtectedRoute requiredType="admin">
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Colaboradores />} />
            </Route>
            <Route path="/relatorios" element={
              <ProtectedRoute requiredType="admin">
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<div className="text-center text-gray-500 mt-20">Página de Relatórios em desenvolvimento</div>} />
            </Route>
            <Route path="/configuracoes" element={
              <ProtectedRoute requiredType="admin">
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<div className="text-center text-gray-500 mt-20">Página de Configurações em desenvolvimento</div>} />
            </Route>
            <Route path="/suporte" element={
              <ProtectedRoute requiredType="admin">
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<div className="text-center text-gray-500 mt-20">Página de Suporte em desenvolvimento</div>} />
            </Route>
            
            {/* Rota para Clientes */}
            <Route path="/client-dashboard" element={
              <ProtectedRoute requiredType="client">
                <ClientDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
