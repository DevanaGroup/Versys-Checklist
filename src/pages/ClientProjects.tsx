import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Building, 
  User,
  Clock,
  Calendar,
  FileCheck,
  Eye,
  ChevronRight,
  Globe,
  BarChart3,
  MoreVertical
} from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RelatorioService } from '@/lib/relatorioService';
import { calculateProjectScore, getScoreBgColor, getPerformanceLabel } from '@/lib/weightedScoreService';
import { ProjectModule } from '@/lib/types';
import { usePageTitle } from "@/contexts/PageTitleContext";

interface ProjectDetail {
  id: string;
  nome: string;
  status: "Iniciado" | "Em Andamento" | "Aguardando Documentos" | "Em Revisão" | "Concluído" | "Pendente";
  progresso: number;
  dataInicio: string;
  previsaoConclusao?: string;
  consultor?: string;
  cliente?: {
    id: string;
    nome: string;
    email: string;
    empresa: string;
  };
  observacoes?: string;
  customAccordions?: Array<{
    id: string;
    title: string;
    items: any[];
  }>;
  itens?: any[];
  modules?: ProjectModule[];
  // Pontuação ponderada
  pontuacaoAtual?: number;
  pontuacaoMaxima?: number;
  percentualPontuacao?: number;
  ncsCompleted?: number;
  ncsTotal?: number;
}

const ClientProjects = () => {
  const navigate = useNavigate();
  const { userData } = useAuthContext();
  const { setPageTitle } = usePageTitle();
  const [projectDetails, setProjectDetails] = useState<ProjectDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Função auxiliar para formatar datas
  const formatDate = (date: any): string => {
    if (!date) return 'Não definida';
    
    try {
      // Se for um Timestamp do Firebase
      if (date?.toDate && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString('pt-BR');
      }
      
      // Se for uma string ou número
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'Data inválida';
      }
      
      return dateObj.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  };

  useEffect(() => {
    if (!userData) {
      navigate("/");
      return;
    }

    if (userData.type !== "client") {
      navigate("/dashboard");
      return;
    }

    loadClientProjects();
  }, [navigate, userData]);

  // Definir o título da página
  useEffect(() => {
    setPageTitle('Meus Projetos');
    return () => {
      setPageTitle('');
    };
  }, [setPageTitle]);

  const loadClientProjects = async () => {
    if (!userData?.uid) {
      console.log('❌ userData.uid não encontrado:', userData);
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('=== DEBUG CLIENT PROJECTS ===');
      console.log('userData completo:', userData);
      console.log('userData.uid:', userData.uid);
      console.log('userData.email:', userData.email);
      console.log('userData.type:', userData.type);
      
      const projetosRef = collection(db, 'projetos');
      console.log('🔍 Buscando projetos na coleção...');
      const allProjectsSnapshot = await getDocs(projetosRef);
      
      console.log('✅ Total de projetos no Firebase:', allProjectsSnapshot.docs.length);
      
      if (allProjectsSnapshot.docs.length === 0) {
        console.log('❌ Nenhum projeto encontrado no Firebase!');
        setProjectDetails([]);
        return;
      }
      
      // Filtrar apenas projetos do cliente logado
      const projetosData = allProjectsSnapshot.docs
        .filter(doc => {
          const data = doc.data();
          const clienteId = data.clienteId || data.cliente?.id;
          const clienteEmail = data.cliente?.email;
          
          // Verificar se o projeto pertence ao cliente logado
          const belongsToClient = clienteId === userData.uid || 
                                 String(clienteId) === String(userData.uid) ||
                                 clienteEmail === userData.email;
          
          console.log('📋 Projeto:', doc.id);
          console.log('   - nome:', data.nome);
          console.log('   - clienteId:', clienteId);
          console.log('   - cliente.email:', clienteEmail);
          console.log('   - userData.uid:', userData.uid);
          console.log('   - userData.email:', userData.email);
          console.log('   - belongsToClient:', belongsToClient);
          
          return belongsToClient;
        })
        .map(doc => {
          const data = doc.data();
          
          // Usar o progresso salvo no projeto ou calcular baseado nos accordions
          const progresso = data.progresso || calculateProgress(data.customAccordions || data.itens || []);
          
          // Calcular pontuação ponderada se o projeto tiver módulos
          let pontuacaoData = {
            pontuacaoAtual: 0,
            pontuacaoMaxima: 0,
            percentualPontuacao: 0,
            ncsCompleted: 0,
            ncsTotal: 0
          };
          
          if (data.modules && Array.isArray(data.modules) && data.modules.length > 0) {
            const scoreResult = calculateProjectScore(data.modules);
            pontuacaoData = {
              pontuacaoAtual: scoreResult.pontuacaoAtual,
              pontuacaoMaxima: scoreResult.pontuacaoMaxima,
              percentualPontuacao: scoreResult.percentual,
              ncsCompleted: scoreResult.ncsCompleted,
              ncsTotal: scoreResult.ncsTotal
            };
          }
          
          // Debug: verificar formato das datas
          console.log('📅 Datas do projeto:', {
            id: doc.id,
            dataInicio: data.dataInicio,
            criadoEm: data.criadoEm,
            dataInicioType: typeof data.dataInicio,
            criadoEmType: typeof data.criadoEm,
            previsaoConclusao: data.previsaoConclusao,
            previsaoConclusaoType: typeof data.previsaoConclusao
          });

          return {
            id: doc.id,
            nome: data.nome,
            status: data.status || 'Iniciado',
            progresso: progresso,
            dataInicio: data.dataInicio || data.criadoEm || new Date().toISOString(),
            previsaoConclusao: data.previsaoConclusao,
            consultor: data.consultor || 'Não definido',
            cliente: data.cliente,
            observacoes: data.observacoes || '',
            customAccordions: data.customAccordions || [],
            itens: data.itens || [],
            modules: data.modules || [],
            ...pontuacaoData
          };
        }) as ProjectDetail[];
      
      console.log('✅ Projetos carregados:', projetosData.length);
      console.log('📊 Projetos:', projetosData.map(p => ({ id: p.id, nome: p.nome })));
      setProjectDetails(projetosData);
      
    } catch (error) {
      console.error('❌ Erro ao carregar projetos do cliente:', error);
      toast.error('Erro ao carregar seus projetos');
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (accordions: any[]): number => {
    if (!accordions || accordions.length === 0) return 0;
    
    // Agora o progresso é calculado baseado nos itens concluídos pelo cliente
    let totalItems = 0;
    let completedItems = 0;
    
    accordions.forEach(accordion => {
      if (accordion.items) {
        accordion.items.forEach((item: any) => {
          if (item.subItems) {
            totalItems += item.subItems.length;
            // Conta como progresso se o item foi marcado como concluído
            completedItems += item.subItems.filter((subItem: any) => 
              subItem.status === 'completed' || subItem.completed === true
            ).length;
          }
        });
      }
    });
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Concluído": return "bg-green-100 text-green-800";
      case "Em Andamento": return "bg-blue-100 text-blue-800";
      case "Aguardando Documentos": return "bg-yellow-100 text-yellow-800";
      case "Em Revisão": return "bg-purple-100 text-purple-800";
      case "Pendente": return "bg-gray-100 text-gray-800";
      case "Iniciado": return "bg-indigo-100 text-indigo-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/client-projects/${projectId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - apenas desktop */}
      <div className="hidden md:flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-versys-primary">Meus Projetos</h2>
          <p className="text-gray-600 mt-2">
            Visualize e gerencie seus projetos de consultoria em segurança portuária
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <FileCheck className="h-6 w-6 text-versys-primary" />
          <span className="text-sm text-gray-500">
            {projectDetails.length} projeto{projectDetails.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Tabela de Projetos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-versys-primary">Lista de Projetos</CardTitle>
        </CardHeader>
        <CardContent>
          {projectDetails.length === 0 ? (
            <div className="text-center py-12">
              <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum projeto encontrado
              </h3>
              <p className="text-gray-600">
                Você ainda não possui projetos ativos. Entre em contato com nossa equipe.
              </p>
            </div>
          ) : (
            <>
              {/* Versão Desktop - Tabela */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Projeto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progresso</TableHead>
                      <TableHead>Data de Início</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectDetails.map((project) => (
                      <TableRow 
                        key={project.id} 
                        className="cursor-pointer hover:bg-versys-secondary/5"
                        onClick={() => handleProjectClick(project.id)}
                      >
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <Building className="h-5 w-5 text-versys-primary" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{project.nome}</div>
                              <div className="text-sm text-gray-500">Projeto #{project.id.slice(-6)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={project.status === 'Concluído' ? 'default' : 
                                    project.status === 'Em Andamento' ? 'secondary' : 
                                    project.status === 'Iniciado' ? 'outline' : 'destructive'}
                            className={project.status === 'Concluído' ? 'bg-green-100 text-green-800' : 
                                      project.status === 'Em Andamento' ? 'bg-blue-100 text-blue-800' : 
                                      project.status === 'Iniciado' ? 'bg-yellow-100 text-yellow-800' : ''}
                          >
                            {project.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 max-w-[80px]">
                              <Progress value={project.progresso} className="h-2" />
                            </div>
                            <span className="text-sm text-versys-primary font-medium">
                              {project.progresso}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(project.dataInicio)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/client-projects/map/${project.id}`);
                                  }}
                                >
                                  <Globe className="h-4 w-4 mr-2 text-blue-600" />
                                  Visualizar Mapa
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/relatorios?projectId=${project.id}`);
                                  }}
                                >
                                  <BarChart3 className="h-4 w-4 mr-2 text-purple-600" />
                                  Ver Relatório
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Versão Mobile - Cards */}
              <div className="md:hidden space-y-4">
                {projectDetails.map((project) => (
                  <Card 
                    key={project.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow relative"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <CardContent className="p-4">
                      {/* Dropdown no canto superior direito */}
                      <div className="absolute top-2 right-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4 text-gray-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/client-projects/map/${project.id}`);
                              }}
                            >
                              <Globe className="h-4 w-4 mr-2 text-blue-600" />
                              Visualizar Mapa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/relatorios?projectId=${project.id}`);
                              }}
                            >
                              <BarChart3 className="h-4 w-4 mr-2 text-purple-600" />
                              Ver Relatório
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Header do Card */}
                      <div className="flex items-start justify-between mb-3 pr-8">
                        <div className="flex items-center space-x-3 flex-1">
                          <Building className="h-5 w-5 text-versys-primary flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-gray-900 truncate">{project.nome}</h3>
                            <p className="text-sm text-gray-500 truncate">Projeto #{project.id.slice(-6)}</p>
                          </div>
                        </div>
                        <Badge 
                          variant={project.status === 'Concluído' ? 'default' : 
                                  project.status === 'Em Andamento' ? 'secondary' : 
                                  project.status === 'Iniciado' ? 'outline' : 'destructive'}
                          className={`ml-2 flex-shrink-0 ${
                            project.status === 'Concluído' ? 'bg-green-100 text-green-800' : 
                            project.status === 'Em Andamento' ? 'bg-blue-100 text-blue-800' : 
                            project.status === 'Iniciado' ? 'bg-yellow-100 text-yellow-800' : ''
                          }`}
                        >
                          {project.status}
                        </Badge>
                      </div>

                      {/* Informações do Projeto */}
                      <div className="space-y-3">
                        {/* Consultor */}
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">Consultor:</span>
                          <span className="text-sm font-medium">{project.consultor}</span>
                        </div>

                        {/* Progresso */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Progresso</span>
                            <span className="text-sm font-medium text-versys-primary">
                              {project.progresso}%
                            </span>
                          </div>
                          <Progress value={project.progresso} className="h-2" />
                        </div>

                        {/* Pontuação Ponderada */}
                        {project.pontuacaoMaxima && project.pontuacaoMaxima > 0 && (
                          <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Pontuação</span>
                              <span className="text-sm font-bold">
                                {project.pontuacaoAtual}/{project.pontuacaoMaxima}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <Badge className={`text-xs ${getScoreBgColor(project.percentualPontuacao || 0)}`}>
                                {getPerformanceLabel(project.percentualPontuacao || 0)}
                              </Badge>
                              <span className="text-sm font-medium">
                                {project.percentualPontuacao?.toFixed(1)}%
                              </span>
                            </div>
                            {project.ncsTotal && project.ncsTotal > 0 && (
                              <div className="text-xs text-gray-500">
                                {project.ncsCompleted} de {project.ncsTotal} NCs concluídas
                              </div>
                            )}
                          </div>
                        )}

                        {/* Datas */}
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">Início:</span>
                            <span className="text-sm">
                              {formatDate(project.dataInicio)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">Previsão:</span>
                            <span className="text-sm">
                              {formatDate(project.previsaoConclusao)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientProjects; 