
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Verifica se o usuário já está logado
    const user = localStorage.getItem("versys_user");
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-versys-primary to-versys-secondary">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-4">VERSYS Consultoria</h1>
        <p className="text-xl">Segurança Portuária</p>
      </div>
    </div>
  );
};

export default Index;
