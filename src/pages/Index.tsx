import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Verifica se o usuário já está logado
    const userData = localStorage.getItem("versys_user");
    if (userData) {
      const user = JSON.parse(userData);
      // Redireciona para o dashboard apropriado baseado no tipo de usuário
      if (user.type === "admin") {
        navigate("/dashboard");
      } else if (user.type === "client") {
        navigate("/client-dashboard");
      } else {
        navigate("/dashboard"); // fallback para admin
      }
    } else {
      navigate("/"); // vai para a página de login
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-versys-primary to-versys-secondary">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-4">VERSYS Consultoria</h1>
        <p className="text-xl">Segurança Portuária</p>
        <div className="mt-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-sm">Carregando...</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
