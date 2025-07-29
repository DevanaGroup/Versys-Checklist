import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Building, 
  User,
  Clock,
  Calendar,
  FileCheck,
  Eye,
  ChevronRight,
  Globe,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { collection, query, orderBy, getDocs, updateDoc, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RelatorioService } from '@/lib/relatorioService';

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
}

const ClientProjects = () => {
  const navigate = useNavigate();
  const { userData } = useAuthContext();
  const [projectDetails, setProjectDetails] = useState<ProjectDetail[]>([]);
  const [loading, setLoading] = useState(true);

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
      
      // Mostrar TODOS os projetos para clientes (sem filtro restritivo)
      const projetosData = allProjectsSnapshot.docs
        .map(doc => {
          const data = doc.data();
          console.log('📋 Projeto:', doc.id);
          console.log('   - nome:', data.nome);
          console.log('   - clienteId:', data.clienteId);
          console.log('   - cliente.email:', data.cliente?.email);
          console.log('   - cliente:', data.cliente);
          
          return {
            id: doc.id,
            nome: data.nome,
            status: data.status || 'Iniciado',
            progresso: calculateProgress(data.customAccordions || data.itens || []),
            dataInicio: data.dataInicio,
            previsaoConclusao: data.previsaoConclusao,
            consultor: data.consultor || 'Não definido',
            cliente: data.cliente,
            observacoes: data.observacoes || '',
            customAccordions: data.customAccordions || [],
            itens: data.itens || []
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
    
    // Durante a fase administrativa, o progresso deve ser sempre 0%
    // O progresso só deve avançar quando o cliente fizer adequações e elas forem aprovadas pelo admin
    let totalItems = 0;
    let approvedAdequacies = 0;
    
    accordions.forEach(accordion => {
      if (accordion.items) {
        accordion.items.forEach((item: any) => {
          if (item.subItems) {
            totalItems += item.subItems.length;
            // Só conta como progresso se a adequação foi reportada pelo cliente E aprovada pelo admin
            approvedAdequacies += item.subItems.filter((subItem: any) => 
              subItem.adequacyReported && subItem.adequacyStatus === 'approved'
            ).length;
          }
        });
      }
    });
    
    return totalItems > 0 ? Math.round((approvedAdequacies / totalItems) * 100) : 0;
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
      {/* Header */}
      <div className="flex items-center justify-between">
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
                      <TableHead>Consultor</TableHead>
                      <TableHead>Progresso</TableHead>
                      <TableHead>Data de Início</TableHead>
                      <TableHead>Previsão de Conclusão</TableHead>
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
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{project.consultor}</span>
                          </div>
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
                            <span>{new Date(project.dataInicio).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {project.previsaoConclusao 
                                ? new Date(project.previsaoConclusao).toLocaleDateString('pt-BR')
                                : 'Não definida'
                              }
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center space-x-2">
                            {/* Botão de visualizar mapa */}
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              title="Visualizar locais no mapa"
                              onClick={e => {
                                e.stopPropagation();
                                navigate(`/client-projects/map/${project.id}`);
                              }}
                            >
                              <Globe className="h-5 w-5 text-blue-600" />
                            </Button>
                            
                            {/* Button for report */}
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              title="Visualizar relatório do projeto"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Navegar diretamente para a página de relatórios
                                navigate(`/relatorios?projectId=${project.id}`);
                              }}
                            >
                              <BarChart3 className="h-5 w-5 text-purple-600" />
                            </Button>
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
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <CardContent className="p-4">
                      {/* Header do Card */}
                      <div className="flex items-start justify-between mb-3">
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

                        {/* Datas */}
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">Início:</span>
                            <span className="text-sm">
                              {new Date(project.dataInicio).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">Previsão:</span>
                            <span className="text-sm">
                              {project.previsaoConclusao 
                                ? new Date(project.previsaoConclusao).toLocaleDateString('pt-BR')
                                : 'Não definida'
                              }
                            </span>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center space-x-2"
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/client-projects/map/${project.id}`);
                            }}
                          >
                            <Globe className="h-4 w-4 text-blue-600" />
                            <span>Mapa</span>
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center space-x-2 bg-purple-50 hover:bg-purple-100 border-purple-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Navegar diretamente para a página de relatórios
                              navigate(`/relatorios?projectId=${project.id}`);
                            }}
                          >
                            <BarChart3 className="h-4 w-4 text-purple-600" />
                            <span className="text-purple-700">Relatório</span>
                          </Button>
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