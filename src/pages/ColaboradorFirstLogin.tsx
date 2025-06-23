import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const ColaboradorFirstLogin = () => {
  const [formData, setFormData] = useState({
    email: "",
    senhaTemporaria: "",
    novaSenha: "",
    confirmarSenha: ""
  });
  const [mostrarSenhas, setMostrarSenhas] = useState({
    temporaria: false,
    nova: false,
    confirmar: false
  });
  const [loading, setLoading] = useState(false);
  const { signInAsColaborador } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.senhaTemporaria || !formData.novaSenha) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (formData.novaSenha.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (formData.novaSenha !== formData.confirmarSenha) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);

    try {
      await signInAsColaborador(formData.email, formData.senhaTemporaria, formData.novaSenha);
      toast.success("Conta criada com sucesso! Bem-vindo ao sistema.");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Erro no primeiro login:", error);
      let errorMessage = "Erro ao criar conta";
      
      if (error.message.includes('Credenciais inválidas')) {
        errorMessage = "Email ou senha temporária incorretos";
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Este email já possui uma conta ativa";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "A senha é muito fraca";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Email inválido";
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Primeiro Acesso</CardTitle>
          <p className="text-gray-600">
            Crie sua senha para acessar o sistema
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senhaTemporaria">Senha Temporária</Label>
              <div className="relative">
                <Input
                  id="senhaTemporaria"
                  type={mostrarSenhas.temporaria ? "text" : "password"}
                  value={formData.senhaTemporaria}
                  onChange={(e) => setFormData({...formData, senhaTemporaria: e.target.value})}
                  placeholder="Senha fornecida pelo administrador"
                  className="pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setMostrarSenhas({...mostrarSenhas, temporaria: !mostrarSenhas.temporaria})}
                >
                  {mostrarSenhas.temporaria ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="novaSenha">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="novaSenha"
                  type={mostrarSenhas.nova ? "text" : "password"}
                  value={formData.novaSenha}
                  onChange={(e) => setFormData({...formData, novaSenha: e.target.value})}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setMostrarSenhas({...mostrarSenhas, nova: !mostrarSenhas.nova})}
                >
                  {mostrarSenhas.nova ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirmarSenha"
                  type={mostrarSenhas.confirmar ? "text" : "password"}
                  value={formData.confirmarSenha}
                  onChange={(e) => setFormData({...formData, confirmarSenha: e.target.value})}
                  placeholder="Digite a senha novamente"
                  className="pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setMostrarSenhas({...mostrarSenhas, confirmar: !mostrarSenhas.confirmar})}
                >
                  {mostrarSenhas.confirmar ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-versys-primary hover:bg-versys-secondary"
              disabled={loading}
            >
              {loading ? "Criando conta..." : "Criar Conta"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => navigate("/login")}
              className="text-sm text-gray-600"
            >
              Já possui conta? Fazer login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ColaboradorFirstLogin; 