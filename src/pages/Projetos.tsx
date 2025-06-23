import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Building, Calendar, User, FileText, MessageSquare, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface ProjectDetails {
  id: number;
  nome: string;
  status: string;
  progresso: number;
  cliente: {
    nome: string;
    contato: string;
    email: string;
  };
  consultor: string;
  dataInicio: string;
  previsaoConclusao: string;
  descricao: string;
  atividades: Array<{
    id: string;
    titulo: string;
    status: "Concluído" | "Em Andamento" | "Pendente";
    descricao: string;
  }>;
  documentos: Array<{
    id: string;
    nome: string;
    tipo: string;
    status: "Aprovado" | "Em Análise" | "Pendente";
  }>;
  historico: Array<{
    id: string;
    data: string;
    acao: string;
    responsavel: string;
  }>;
}

const projetos: ProjectDetails[] = [];

const Projetos = () => {
  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState<ProjectDetails | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ativo": return "bg-green-100 text-green-800";
      case "Em Análise": return "bg-yellow-100 text-yellow-800";
      case "Concluído": return "bg-blue-100 text-blue-800";
      case "Iniciado": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getActivityStatusIcon = (status: string) => {
    switch (status) {
      case "Concluído": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Em Andamento": return <Clock className="h-4 w-4 text-blue-600" />;
      case "Pendente": return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-versys-primary">Projetos</h2>
        <p className="text-gray-600 mt-2">
          Gerencie seus projetos de segurança portuária
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card Novo Projeto */}
        <Card 
          className="border-2 border-dashed border-versys-secondary hover:border-versys-primary transition-colors cursor-pointer group"
          onClick={() => navigate("/projetos/new")}
        >
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-16 h-16 bg-versys-secondary/20 rounded-full flex items-center justify-center mb-4 group-hover:bg-versys-primary/20 transition-colors">
              <Plus className="h-8 w-8 text-versys-secondary group-hover:text-versys-primary" />
            </div>
            <h3 className="text-lg font-semibold text-versys-primary group-hover:text-versys-secondary">
              Novo Projeto
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              Clique para criar um novo projeto
            </p>
          </CardContent>
        </Card>

        {/* Cards dos Projetos */}
        {projetos.map((projeto) => (
          <Card key={projeto.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-versys-primary" />
                  <span className="text-versys-primary">{projeto.nome}</span>
                </CardTitle>
                <Badge className={getStatusColor(projeto.status)}>
                  {projeto.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progresso</span>
                    <span className="text-versys-primary font-medium">{projeto.progresso}%</span>
                  </div>
                  <Progress 
                    value={projeto.progresso} 
                    className="h-2"
                  />
                </div>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center space-x-1 mb-1">
                    <User className="h-3 w-3" />
                    <span>Consultor: {projeto.consultor}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>Previsão: {new Date(projeto.previsaoConclusao).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full border-versys-secondary text-versys-primary hover:bg-versys-secondary hover:text-white"
                      onClick={() => setSelectedProject(projeto)}
                    >
                      Ver Detalhes
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle className="text-versys-primary">
                        Detalhes do Projeto - {selectedProject?.nome}
                      </DialogTitle>
                    </DialogHeader>
                    
                    {selectedProject && (
                      <div className="space-y-4">
                        {/* Informações básicas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Cliente</p>
                            <p className="text-sm">{selectedProject.cliente.nome}</p>
                            <p className="text-xs text-gray-500">{selectedProject.cliente.email}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Consultor Responsável</p>
                            <p className="text-sm">{selectedProject.consultor}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Data de Início</p>
                            <p className="text-sm">{new Date(selectedProject.dataInicio).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Previsão de Conclusão</p>
                            <p className="text-sm">{new Date(selectedProject.previsaoConclusao).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>

                        {/* Progresso */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-600">Progresso Geral</p>
                            <Badge className={getStatusColor(selectedProject.status)}>
                              {selectedProject.status}
                            </Badge>
                          </div>
                          <Progress value={selectedProject.progresso} className="h-3" />
                          <p className="text-right text-sm text-gray-600">{selectedProject.progresso}%</p>
                        </div>

                        {/* Tabs */}
                        <Tabs defaultValue="atividades" className="w-full">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="atividades">Atividades</TabsTrigger>
                            <TabsTrigger value="documentos">Documentos</TabsTrigger>
                            <TabsTrigger value="historico">Histórico</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="atividades" className="mt-4">
                            <ScrollArea className="h-48">
                              <div className="space-y-3">
                                {selectedProject.atividades.map((atividade) => (
                                  <div key={atividade.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                                    {getActivityStatusIcon(atividade.status)}
                                    <div className="flex-1">
                                      <p className="font-medium text-sm">{atividade.titulo}</p>
                                      <p className="text-xs text-gray-600">{atividade.descricao}</p>
                                      <Badge variant="outline" className="mt-1 text-xs">
                                        {atividade.status}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </TabsContent>
                          
                          <TabsContent value="documentos" className="mt-4">
                            <ScrollArea className="h-48">
                              <div className="space-y-3">
                                {selectedProject.documentos.map((documento) => (
                                  <div key={documento.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center space-x-3">
                                      <FileText className="h-4 w-4 text-blue-600" />
                                      <div>
                                        <p className="font-medium text-sm">{documento.nome}</p>
                                        <p className="text-xs text-gray-600">{documento.tipo}</p>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className={getStatusColor(documento.status)}>
                                      {documento.status}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </TabsContent>
                          
                          <TabsContent value="historico" className="mt-4">
                            <ScrollArea className="h-48">
                              <div className="space-y-3">
                                {selectedProject.historico.map((item) => (
                                  <div key={item.id} className="p-3 border rounded-lg">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="font-medium text-sm">{item.acao}</p>
                                      <p className="text-xs text-gray-500">
                                        {new Date(item.data).toLocaleDateString('pt-BR')}
                                      </p>
                                    </div>
                                    <p className="text-xs text-gray-600">Por: {item.responsavel}</p>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </TabsContent>
                        </Tabs>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Projetos;
