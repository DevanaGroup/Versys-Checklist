import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Building, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  MessageSquare, 
  Download,
  LogOut,
  User
} from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";

interface ProjectDetail {
  id: string;
  name: string;
  status: "Em Andamento" | "Aguardando Documentos" | "Em Revisão" | "Concluído" | "Pendente";
  progress: number;
  startDate: string;
  estimatedCompletion: string;
  consultant: string;
  description: string;
  requirements: Array<{
    id: string;
    title: string;
    status: "Concluído" | "Pendente" | "Em Análise";
    comments?: string;
  }>;
  messages: Array<{
    id: string;
    from: string;
    message: string;
    date: string;
    type: "info" | "request" | "alert";
  }>;
}

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { userData, logout: authLogout } = useAuthContext();
  const [projectDetails, setProjectDetails] = useState<ProjectDetail[]>([]);

  useEffect(() => {
    console.log('ClientDashboard: userData atualizado:', userData);
    
    // Se não há usuário autenticado, redireciona para login
    if (!userData) {
      console.log('ClientDashboard: Nenhum usuário autenticado, redirecionando para login');
      navigate("/");
      return;
    }

    // Se o usuário não é do tipo cliente, redireciona para dashboard admin
    if (userData.type !== "client") {
      console.log('ClientDashboard: Usuário não é cliente, redirecionando para dashboard admin');
      navigate("/dashboard");
      return;
    }

    // Em produção, os dados viriam de uma API conectada ao Firebase
    setProjectDetails([]);
  }, [navigate, userData]);

  const handleLogout = async () => {
    try {
      console.log('ClientDashboard: Iniciando logout...');
      await authLogout();
      toast.success("Logout realizado com sucesso!");
      console.log('ClientDashboard: Logout realizado com sucesso');
      navigate("/");
    } catch (error) {
      console.error('ClientDashboard: Erro ao fazer logout:', error);
      toast.error("Erro ao fazer logout");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Concluído": return "bg-green-100 text-green-800";
      case "Em Andamento": return "bg-blue-100 text-blue-800";
      case "Aguardando Documentos": return "bg-yellow-100 text-yellow-800";
      case "Em Revisão": return "bg-purple-100 text-purple-800";
      case "Pendente": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRequirementStatusIcon = (status: string) => {
    switch (status) {
      case "Concluído": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Em Análise": return <Clock className="h-4 w-4 text-blue-600" />;
      case "Pendente": return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "info": return <FileText className="h-4 w-4 text-blue-600" />;
      case "request": return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "alert": return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  if (!userData) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-versys-primary"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img 
              src="/lovable-uploads/a4359bba-bc5d-4bf2-98b0-566712fd53b8.png" 
              alt="VERSYS Logo" 
              className="h-10 w-auto" 
            />
            <div>
              <h1 className="text-xl font-bold text-versys-primary">Portal do Cliente</h1>
              <p className="text-sm text-gray-600">VERSYS Consultoria em Segurança Portuária</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-versys-primary rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{userData.company || userData.displayName}</p>
                <p className="text-xs text-gray-500">{userData.type === 'admin' ? 'Administrador' : 'Cliente'}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="border-versys-primary text-versys-primary hover:bg-versys-primary hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-versys-primary to-versys-secondary text-white p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-2">Bem-vindo, {userData.company || userData.displayName}!</h2>
            <p className="text-white/90">
              Acompanhe o progresso dos seus projetos de segurança portuária e mantenha-se atualizado sobre todas as tratativas.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-versys-primary" />
                  <div>
                    <p className="text-sm text-gray-600">Projetos Ativos</p>
                    <p className="text-2xl font-bold text-versys-primary">{projectDetails.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Itens Concluídos</p>
                    <p className="text-2xl font-bold text-green-600">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">Pendências</p>
                    <p className="text-2xl font-bold text-yellow-600">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Mensagens</p>
                    <p className="text-2xl font-bold text-blue-600">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Details */}
          {projectDetails.map((project) => (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader className="bg-gray-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-versys-primary">{project.name}</CardTitle>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-600">Consultor Responsável</p>
                    <p className="font-medium">{project.consultant}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Data de Início</p>
                    <p className="font-medium">{new Date(project.startDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Previsão de Conclusão</p>
                    <p className="font-medium">{new Date(project.estimatedCompletion).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Progresso Geral</p>
                    <p className="text-sm font-medium">{project.progress}%</p>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <Tabs defaultValue="requirements" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="requirements">Requisitos</TabsTrigger>
                    <TabsTrigger value="messages">Mensagens</TabsTrigger>
                    <TabsTrigger value="documents">Documentos</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="requirements" className="p-6">
                    <div className="space-y-4">
                      {project.requirements.map((requirement) => (
                        <div key={requirement.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            {getRequirementStatusIcon(requirement.status)}
                            <div>
                              <p className="font-medium">{requirement.title}</p>
                              {requirement.comments && (
                                <p className="text-sm text-gray-600">{requirement.comments}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className={getStatusColor(requirement.status)}>
                            {requirement.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="messages" className="p-6">
                    <ScrollArea className="h-64">
                      <div className="space-y-4">
                        {project.messages.map((message) => (
                          <div key={message.id} className="p-4 border rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              {getMessageIcon(message.type)}
                              <p className="font-medium text-sm">{message.from}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(message.date).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <p className="text-sm text-gray-700">{message.message}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="documents" className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium">Relatório Preliminar</p>
                            <p className="text-sm text-gray-600">PDF • 2.5 MB</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium">Checklist de Documentos</p>
                            <p className="text-sm text-gray-600">PDF • 1.2 MB</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ClientDashboard; 