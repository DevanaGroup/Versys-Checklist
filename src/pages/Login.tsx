import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";


const Login = () => {
  const [adminCredentials, setAdminCredentials] = useState({ email: "", password: "" });
  const [clientCredentials, setClientCredentials] = useState({ email: "", password: "" });
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, loading } = useAuth();



  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await signIn(adminCredentials.email, adminCredentials.password);
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Erro ao fazer login. Verifique suas credenciais.");
    }
  };

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await signIn(clientCredentials.email, clientCredentials.password);
      toast.success("Login realizado com sucesso!");
      navigate("/client-dashboard");
    } catch (error) {
      toast.error("Erro ao fazer login. Verifique suas credenciais.");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      toast.success("Login com Google realizado com sucesso!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Erro ao fazer login com Google.");
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
          
          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="admin">Administrador</TabsTrigger>
              <TabsTrigger value="client">Cliente</TabsTrigger>
            </TabsList>
            
            <TabsContent value="admin">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">E-mail</Label>
                  <Input 
                    id="admin-email" 
                    type="email" 
                    placeholder="contato@devana.com.br" 
                    value={adminCredentials.email} 
                    onChange={e => setAdminCredentials({...adminCredentials, email: e.target.value})} 
                    className="border-gray-300 focus:border-versys-secondary" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Senha</Label>
                  <Input 
                    id="admin-password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={adminCredentials.password} 
                    onChange={e => setAdminCredentials({...adminCredentials, password: e.target.value})} 
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
                
                <Button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full mt-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
                  disabled={loading}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Entrar com Google
                </Button>
              </form>

              <div className="mt-4 text-center space-y-2">
                <Button
                  variant="link"
                  onClick={() => navigate("/colaborador/primeiro-acesso")}
                  className="text-sm text-versys-primary hover:text-versys-secondary"
                >
                  Primeiro acesso? Criar conta de colaborador
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="client">
              <form onSubmit={handleClientLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-email">E-mail</Label>
                  <Input 
                    id="client-email" 
                    type="email" 
                    placeholder="seu@empresa.com" 
                    value={clientCredentials.email} 
                    onChange={e => setClientCredentials({...clientCredentials, email: e.target.value})} 
                    className="border-gray-300 focus:border-versys-secondary" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-password">Senha</Label>
                  <Input 
                    id="client-password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={clientCredentials.password} 
                    onChange={e => setClientCredentials({...clientCredentials, password: e.target.value})} 
                    className="border-gray-300 focus:border-versys-secondary" 
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-versys-secondary hover:bg-versys-primary transition-colors"
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Login Cliente"}
                </Button>
                
                <Button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full mt-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
                  disabled={loading}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Entrar com Google
                </Button>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-2">Autenticação Firebase:</p>
                  <div className="text-xs text-blue-600 space-y-1">
                    <p>• Use suas credenciais cadastradas no sistema</p>
                    <p>• Ou faça login com Google</p>
                    <p>• Entre em contato com o administrador para criar uma conta</p>
                  </div>
                </div>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="text-center mt-4">
            <button type="button" className="text-sm text-versys-secondary hover:text-versys-primary transition-colors">
              Esqueci minha senha
            </button>
          </div>

          <div className="mt-4 text-center space-y-2">
            <Button
              variant="link"
              onClick={() => navigate("/colaborador/primeiro-acesso")}
              className="text-sm text-versys-primary hover:text-versys-secondary"
            >
              Primeiro acesso? Criar conta de colaborador
            </Button>
            <Button
              variant="link"
              onClick={() => navigate("/cliente/primeiro-acesso")}
              className="text-sm text-green-600 hover:text-green-700"
            >
              Cliente? Ativar sua conta
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default Login;