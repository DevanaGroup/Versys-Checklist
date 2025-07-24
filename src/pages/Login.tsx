import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useAuthContext } from "@/contexts/AuthContext";


const Login = () => {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const navigate = useNavigate();
  const { signIn, loading } = useAuth();
  const { isAuthenticated, userData } = useAuthContext();

  // Effect para redirecionar automaticamente quando autenticado
  useEffect(() => {
    if (isAuthenticated && userData) {
      console.log('Login: Usuário autenticado detectado, redirecionando...');
      if (userData.type === 'admin') {
        navigate("/dashboard", { replace: true });
      } else if (userData.type === 'client') {
        navigate("/client-projects", { replace: true });
      }
    }
  }, [isAuthenticated, userData, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await signIn(credentials.email, credentials.password);
      toast.success("Login realizado com sucesso!");
      // O redirecionamento será feito pelo useEffect acima
    } catch (error) {
      toast.error("Erro ao fazer login. Verifique suas credenciais.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-versys-primary to-versys-secondary p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <img alt="VERSYS Logo" className="h-20 w-auto" src="/lovable-uploads/d4ef3de2-1ab1-45f0-9e85-afac3edece7d.png" />
          </div>
        </CardHeader>
        <CardContent>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                value={credentials.email} 
                onChange={e => setCredentials({...credentials, email: e.target.value})} 
                className="border-gray-300 focus:border-versys-secondary" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={credentials.password} 
                onChange={e => setCredentials({...credentials, password: e.target.value})} 
                className="border-gray-300 focus:border-versys-secondary" 
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-versys-primary hover:bg-versys-secondary text-white"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          
          <div className="text-center mt-4">
            <button type="button" className="text-sm text-versys-secondary hover:text-versys-primary transition-colors">
              Esqueci minha senha
            </button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default Login;