import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Building, Calendar, User, FileText, MessageSquare, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

interface ProjectDetails {
  id: string;
  nome: string;
  status: string;
  progresso: number;
  cliente?: {
    id: string;
    nome: string;
    email: string;
    empresa: string;
  };
  consultor?: string;
  dataInicio: string;
  dataCriacao: string;
  previsaoConclusao?: string;
  descricao?: string;
  customAccordions?: any[];
  itens?: any[];
  observacoes?: string;
}

const Projetos = () => {
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState<ProjectDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectDetails | null>(null);

  useEffect(() => {
    loadProjetos();
  }, []);

  const loadProjetos = async () => {
    try {
      setLoading(true);
      const projetosRef = collection(db, 'projetos');
      const q = query(projetosRef, orderBy('dataCriacao', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const projetosData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nome: data.nome,
          status: data.status || 'Iniciado',
          progresso: data.progresso || 0,
          cliente: data.cliente || null,
          consultor: data.consultor || 'Não definido',
          dataInicio: data.dataInicio,
          dataCriacao: data.dataCriacao,
          previsaoConclusao: data.previsaoConclusao || calculatePrevisao(data.dataInicio),
          descricao: data.observacoes || '',
          customAccordions: data.customAccordions || [],
          itens: data.itens || [],
          observacoes: data.observacoes || ''
        };
      }) as ProjectDetails[];
      
      setProjetos(projetosData);
      console.log('Projetos carregados:', projetosData.length);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      toast.error('Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  };

  const calculatePrevisao = (dataInicio: string) => {
    const inicio = new Date(dataInicio);
    const previsao = new Date(inicio);
    previsao.setMonth(previsao.getMonth() + 3); // 3 meses de previsão padrão
    return previsao.toISOString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ativo": return "bg-green-100 text-green-800";
      case "Em Análise": return "bg-yellow-100 text-yellow-800";
      case "Concluído": return "bg-blue-100 text-blue-800";
      case "Iniciado": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
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

        {/* Loading ou Cards dos Projetos */}
        {loading ? (
          <div className="col-span-full flex items-center justify-center h-48">
            <p className="text-gray-500">Carregando projetos...</p>
          </div>
        ) : projetos.length === 0 ? (
          <div className="col-span-full flex items-center justify-center h-48">
            <p className="text-gray-500">Nenhum projeto encontrado. Crie seu primeiro projeto!</p>
          </div>
        ) : (
          projetos.map((projeto) => (
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
                  <div className="flex items-center space-x-1 mb-1">
                    <Calendar className="h-3 w-3" />
                    <span>Previsão: {projeto.previsaoConclusao ? new Date(projeto.previsaoConclusao).toLocaleDateString('pt-BR') : 'Não definida'}</span>
                  </div>
                  {projeto.cliente && (
                    <div className="flex items-center space-x-1">
                      <Building className="h-3 w-3" />
                      <span>Cliente: {projeto.cliente.nome}</span>
                    </div>
                  )}
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
                            <p className="text-sm">{selectedProject.cliente?.nome || 'Nenhum cliente'}</p>
                            <p className="text-xs text-gray-500">{selectedProject.cliente?.email || ''}</p>
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
                            <p className="text-sm">{selectedProject.previsaoConclusao ? new Date(selectedProject.previsaoConclusao).toLocaleDateString('pt-BR') : 'Não definida'}</p>
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

                        {/* Informações Adicionais */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Itens do Projeto</h4>
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-sm text-gray-600">
                                {selectedProject.itens && selectedProject.itens.length > 0 
                                  ? `${selectedProject.itens.length} itens selecionados`
                                  : 'Nenhum item selecionado'
                                }
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Observações</h4>
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-sm text-gray-600">
                                {selectedProject.observacoes || 'Nenhuma observação adicionada'}
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Estrutura do Projeto</h4>
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-sm text-gray-600">
                                {selectedProject.customAccordions && selectedProject.customAccordions.length > 0 
                                  ? `${selectedProject.customAccordions.length} seções organizadas`
                                  : 'Nenhuma seção organizada'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Projetos;
