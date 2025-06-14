import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      localStorage.setItem("versys_user", JSON.stringify({
        email,
        name: "João Silva"
      }));
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } else {
      toast.error("Por favor, preencha todos os campos");
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-versys-primary to-versys-secondary p-4">
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
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="border-gray-300 focus:border-versys-secondary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="border-gray-300 focus:border-versys-secondary" />
            </div>
            <Button type="submit" className="w-full bg-versys-primary hover:bg-versys-secondary transition-colors">
              Fazer Login
            </Button>
            <div className="text-center">
              <button type="button" className="text-sm text-versys-secondary hover:text-versys-primary transition-colors">
                Esqueci minha senha
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>;
};
export default Login;