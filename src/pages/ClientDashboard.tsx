import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { userData } = useAuthContext();

  useEffect(() => {
    console.log('🔍 ClientDashboard: userData atualizado:', userData);
    
    if (!userData) {
      console.log('❌ ClientDashboard: Nenhum usuário autenticado, redirecionando para login');
      navigate("/");
      return;
    }

    if (userData.type !== "client") {
      console.log('❌ ClientDashboard: Usuário não é cliente, redirecionando para dashboard admin');
      navigate("/dashboard");
      return;
    }

    console.log('✅ ClientDashboard: Cliente autenticado, redirecionando para nova interface...');
    navigate("/client-projects");
  }, [navigate, userData]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
};

export default ClientDashboard; 