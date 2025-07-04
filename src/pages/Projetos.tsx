import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Building, Calendar, User, FileText, CheckCircle, Clock, AlertCircle, ArrowLeft, Send, Download, CheckCircle2, XCircle, AlertTriangle, Eye, ClipboardCheck, Trash2, MoreVertical, Edit } from "lucide-react";
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SubItem {
  id: string;
  title: string;
  evaluation: "nc" | "r" | "na" | "";
  completed: boolean;
  clientResponse?: string;
  adminFeedback?: string;
  required: boolean;
  description?: string;
}

interface ProjectItem {
  id: string;
  title: string;
  category: string;
  subItems: SubItem[];
  isExpanded: boolean;
  priority: "alta" | "media" | "baixa";
}

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
  customAccordions?: Array<{
    id: string;
    title: string;
    items: ProjectItem[];
  }>;
  itens?: any[];
  observacoes?: string;
  solicitacoes?: Array<{
    id: string;
    titulo: string;
    descricao: string;
    status: "Pendente" | "Em Análise" | "Atendida" | "Rejeitada";
    dataLimite?: string;
    criadoPor: string;
    criadoEm: string;
  }>;
  comunicacoes?: Array<{
    id: string;
    de: string;
    para: string;
    assunto: string;
    mensagem: string;
    data: string;
    tipo: string;
    lida: boolean;
  }>;
}

const Projetos = () => {
  const navigate = useNavigate();
  const { userData } = useAuthContext();
  const [projetos, setProjetos] = useState<ProjectDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectDetails | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'details'>('list');

  const [updatingStatus, setUpdatingStatus] = useState<{ [itemId: string]: boolean }>({});
  const [deletingProject, setDeletingProject] = useState<string | null>(null);

  const isAdmin = userData?.type === 'admin';

  useEffect(() => {
    loadProjetos();
  }, []);

  const loadProjetos = async () => {
    try {
      setLoading(true);
      const projetosRef = collection(db, 'projetos');
      const querySnapshot = await getDocs(projetosRef);
      
      const projetosData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Dados do projeto:', doc.id, data);
        
        // Compatibilidade com diferentes estruturas
        const projeto = {
          id: doc.id,
          nome: data.nome || 'Projeto sem nome',
          status: data.status || 'Iniciado',
          progresso: data.progresso || 0,
          cliente: data.cliente || null,
          consultor: data.consultor || 'Não definido',
          dataInicio: data.dataInicio || data.criadoEm?.toDate?.()?.toISOString?.() || new Date().toISOString(),
          dataCriacao: data.dataCriacao || data.criadoEm?.toDate?.()?.toISOString?.() || new Date().toISOString(),
          previsaoConclusao: data.previsaoConclusao || calculatePrevisao(data.dataInicio || data.criadoEm?.toDate?.()?.toISOString?.() || new Date().toISOString()),
          descricao: data.observacoes || data.descricao || '',
          customAccordions: data.customAccordions || data.accordions || [],
          itens: data.itens || [],
          observacoes: data.observacoes || '',
          solicitacoes: data.solicitacoes || [],
          comunicacoes: data.comunicacoes || []
        };
        
        return projeto;
      }) as ProjectDetails[];
      
      // Ordenar os projetos por data de criação (mais recentes primeiro)
      projetosData.sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());
      
      setProjetos(projetosData);
      console.log('Total de projetos carregados:', projetosData.length);
      projetosData.forEach(p => console.log(`- ${p.nome} (${p.id})`));
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "alta": return "bg-red-100 text-red-800";
      case "media": return "bg-yellow-100 text-yellow-800";
      case "baixa": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getSubItemStatusIcon = (subItem: SubItem) => {
    switch (subItem.evaluation) {
      case "nc":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "r":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "na":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const handleUpdateItemStatus = async (projectId: string, accordionId: string, itemId: string, subItemId: string, newStatus: "aprovado" | "rejeitado" | "pendente", adminFeedback?: string) => {
    const itemKey = `${projectId}_${itemId}_${subItemId}`;
    
    try {
      setUpdatingStatus(prev => ({ ...prev, [itemKey]: true }));
      
      const project = projetos.find(p => p.id === projectId);
      if (!project) return;
      
      const updatedAccordions = project.customAccordions?.map(accordion => {
        if (accordion.id === accordionId) {
          return {
            ...accordion,
            items: accordion.items.map(item => {
              if (item.id === itemId) {
                return {
                  ...item,
                  subItems: item.subItems.map(subItem => {
                    if (subItem.id === subItemId) {
                      return {
                        ...subItem,
                        evaluation: (newStatus === "aprovado" ? "na" : newStatus === "rejeitado" ? "nc" : "") as SubItem['evaluation'],
                        adminFeedback: adminFeedback || subItem.adminFeedback
                      };
                    }
                    return subItem;
                  })
                };
              }
              return item;
            })
          };
        }
        return accordion;
      });
      
      const projectRef = doc(db, 'projetos', projectId);
      await updateDoc(projectRef, {
        customAccordions: updatedAccordions
      });
      
      setProjetos(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, customAccordions: updatedAccordions }
          : p
      ));
      
      if (selectedProject?.id === projectId) {
        setSelectedProject(prev => prev ? { ...prev, customAccordions: updatedAccordions } : null);
      }
      
      toast.success(`Item ${newStatus === "aprovado" ? "aprovado" : newStatus === "rejeitado" ? "rejeitado" : "marcado como pendente"}!`);
      
    } catch (error) {
      console.error('Erro ao atualizar status do item:', error);
      toast.error('Erro ao atualizar status do item');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [itemKey]: false }));
    }
  };



  const calculateProgress = (accordions: any[]): number => {
    if (!accordions || accordions.length === 0) return 0;
    
    let totalItems = 0;
    let completedItems = 0;
    
    accordions.forEach(accordion => {
      accordion.items.forEach((item: any) => {
        item.subItems.forEach((subItem: any) => {
          totalItems++;
          if (subItem.evaluation === "na") {
            completedItems++;
          }
        });
      });
    });
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  const handleViewDetails = (projeto: ProjectDetails) => {
    setSelectedProject(projeto);
    setViewMode('details');
  };

  const handleBackToList = () => {
    setSelectedProject(null);
    setViewMode('list');
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      setDeletingProject(projectId);
      const projectRef = doc(db, 'projetos', projectId);
      await deleteDoc(projectRef);
      setProjetos(prev => prev.filter(p => p.id !== projectId));
      toast.success('Projeto deletado com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar projeto:', error);
      toast.error('Erro ao deletar projeto');
    } finally {
      setDeletingProject(null);
    }
  };

  if (viewMode === 'details' && selectedProject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handleBackToList}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar</span>
            </Button>
            <div>
              <h2 className="text-3xl font-bold text-versys-primary">{selectedProject.nome}</h2>
              <p className="text-gray-600 mt-2">
                Gerencie projeto, faça solicitações aos clientes e acompanhe o progresso das verificações
              </p>
            </div>
          </div>


        </div>

        <div className="space-y-6">
          {/* Informações do Projeto */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="h-5 w-5 text-versys-primary" />
                    <span className="text-versys-primary">{selectedProject.nome}</span>
                  </CardTitle>
                  <Badge className={getStatusColor(selectedProject.status)}>
                    {selectedProject.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Informações básicas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Cliente</p>
                      <p className="text-sm">{selectedProject.cliente?.nome || 'Nenhum cliente'}</p>
                      <p className="text-xs text-gray-500">{selectedProject.cliente?.email || ''}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Empresa</p>
                      <p className="text-sm">{selectedProject.cliente?.empresa || 'Não informado'}</p>
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
                      <span className="text-versys-primary font-medium">{selectedProject.progresso}%</span>
                    </div>
                    <Progress value={selectedProject.progresso} className="h-3" />
                  </div>

                  {/* Observações */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Observações</h4>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">
                        {selectedProject.observacoes || 'Nenhuma observação adicionada'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>


        </div>

        {/* Seção de Tabs */}
        <Tabs defaultValue="checklist" className="space-y-4">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="checklist" className="flex items-center space-x-2">
              <ClipboardCheck className="h-4 w-4" />
              <span>Checklist</span>
            </TabsTrigger>
          </TabsList>



          <TabsContent value="checklist">
            <Card>
              <CardHeader>
                <CardTitle>Checklist de Verificações</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {selectedProject.customAccordions && selectedProject.customAccordions.length > 0 ? (
                    <Accordion type="multiple" className="space-y-2">
                      {selectedProject.customAccordions.map((accordion) => (
                        <AccordionItem key={accordion.id} value={accordion.id}>
                          <AccordionTrigger className="text-left">
                            <div className="flex items-center justify-between w-full mr-4">
                              <span className="text-versys-primary font-medium">{accordion.title}</span>
                              <Badge variant="outline">
                                {accordion.items.reduce((total, item) => total + item.subItems.length, 0)} itens
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4">
                              {accordion.items.map((item) => (
                                <div key={item.id} className="border rounded-lg p-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <h4 className="font-medium text-gray-900">{item.title}</h4>
                                      <p className="text-sm text-gray-500">{item.category}</p>
                                    </div>
                                    <Badge className={getPriorityColor(item.priority)}>
                                      {item.priority}
                                    </Badge>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    {item.subItems.map((subItem) => (
                                      <div key={subItem.id} className="flex items-start space-x-3 p-2 bg-gray-50 rounded">
                                        <div className="flex-shrink-0 mt-1">
                                          {getSubItemStatusIcon(subItem)}
                                        </div>
                                        <div className="flex-grow">
                                          <p className="text-sm font-medium text-gray-900">{subItem.title}</p>
                                          {subItem.description && (
                                            <p className="text-xs text-gray-600 mt-1">{subItem.description}</p>
                                          )}
                                          {subItem.clientResponse && (
                                            <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                                              <strong>Resposta do Cliente:</strong> {subItem.clientResponse}
                                            </div>
                                          )}
                                          {subItem.adminFeedback && (
                                            <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                                              <strong>Feedback do Admin:</strong> {subItem.adminFeedback}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex-shrink-0 space-x-1">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-green-600 border-green-600 hover:bg-green-50"
                                            onClick={() => handleUpdateItemStatus(selectedProject.id, accordion.id, item.id, subItem.id, "aprovado")}
                                            disabled={updatingStatus[`${selectedProject.id}_${item.id}_${subItem.id}`]}
                                          >
                                            <CheckCircle2 className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-600 border-red-600 hover:bg-red-50"
                                            onClick={() => handleUpdateItemStatus(selectedProject.id, accordion.id, item.id, subItem.id, "rejeitado")}
                                            disabled={updatingStatus[`${selectedProject.id}_${item.id}_${subItem.id}`]}
                                          >
                                            <XCircle className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Nenhum checklist configurado para este projeto.</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      </div>
    );
  }

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
          <Card 
            key={projeto.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleViewDetails(projeto)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="h-5 w-5 text-versys-primary" />
                    <span className="text-versys-primary">{projeto.nome}</span>
                  </CardTitle>
                  <Badge className={getStatusColor(projeto.status)}>
                    {projeto.status}
                  </Badge>
                </div>
                
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
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(projeto);
                    }}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projetos/edit/${projeto.id}`);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar Projeto
                      </DropdownMenuItem>
                    )}
                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            onSelect={(e) => e.preventDefault()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {deletingProject === projeto.id ? 'Deletando...' : 'Excluir Projeto'}
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o projeto "{projeto.nome}"? 
                              Esta ação não pode ser desfeita e todos os dados relacionados ao projeto serão perdidos permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(projeto.id);
                              }}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Confirmar Exclusão
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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
