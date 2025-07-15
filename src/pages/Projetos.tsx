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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Building, Calendar, User, FileText, CheckCircle, Clock, AlertCircle, ArrowLeft, Send, Download, CheckCircle2, XCircle, AlertTriangle, Eye, ClipboardCheck, Trash2, MoreVertical, Edit, Grid, List } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where } from "firebase/firestore";
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
  currentSituation?: string;
  adequacyReported?: boolean;
  adequacyDetails?: string;
  adequacyDate?: string;
  adequacyStatus?: "pending" | "approved" | "rejected";
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
  clienteId?: string;
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

interface Cliente {
  id: string;
  nome: string;
  email: string;
  empresa: string;
  telefone: string;
  endereco: string;
  status: 'ativo' | 'suspenso' | 'inativo';
  dataCriacao: string;
  projetos: number;
  firebaseUid?: string;
  senhaTemporaria?: string;
  precisaCriarConta?: boolean;
}

const Projetos = () => {
  const navigate = useNavigate();
  const { userData } = useAuthContext();
  const [projetos, setProjetos] = useState<ProjectDetails[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectDetails | null>(null);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [viewMode, setViewMode] = useState<'client-selection' | 'project-list' | 'project-details'>('client-selection');
  const [listView, setListView] = useState<'cards' | 'list'>('list');

  const [updatingStatus, setUpdatingStatus] = useState<{ [itemId: string]: boolean }>({});
  const [deletingProject, setDeletingProject] = useState<string | null>(null);

  const isAdmin = userData?.type === 'admin';

  useEffect(() => {
    loadClientes();
    loadProjetos();
  }, []);

  const loadClientes = async () => {
    try {
      setLoadingClientes(true);
      console.log('Carregando clientes da coleção users...');
      
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('type', '==', 'client'));
      
      const querySnapshot = await getDocs(q);
      
      const clientesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nome: data.displayName || data.nome || 'Nome não informado',
          email: data.email || '',
          empresa: data.company || data.empresa || 'Empresa não informada',
          telefone: data.telefone || '',
          endereco: data.endereco || '',
          status: data.status || 'ativo' as const,
          dataCriacao: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          projetos: 0,
          firebaseUid: data.uid || doc.id,
          senhaTemporaria: data.senhaTemporaria,
          precisaCriarConta: data.precisaCriarConta || false
        };
      }) as Cliente[];
      
      console.log('Clientes encontrados:', clientesData.length);
      setClientes(clientesData);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoadingClientes(false);
    }
  };

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
          clienteId: data.clienteId || data.cliente?.id || null,
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
      
      // Atualizar contagem de projetos por cliente
      atualizarContagemProjetos(projetosData);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      toast.error('Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  };

  const atualizarContagemProjetos = (projetosData: ProjectDetails[]) => {
    const contagemProjetos: { [clienteId: string]: number } = {};
    
    projetosData.forEach(projeto => {
      const clienteId = projeto.clienteId || projeto.cliente?.id;
      if (clienteId) {
        contagemProjetos[clienteId] = (contagemProjetos[clienteId] || 0) + 1;
      }
    });
    
    setClientes(prev => prev.map(cliente => ({
      ...cliente,
      projetos: contagemProjetos[cliente.id] || 0
    })));
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

  const getClientStatusColor = (status: string) => {
    switch (status) {
      case "ativo": return "bg-green-100 text-green-800";
      case "suspenso": return "bg-yellow-100 text-yellow-800";
      case "inativo": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleSelectClient = (cliente: Cliente) => {
    setSelectedClient(cliente);
    setViewMode('project-list');
  };

  const handleBackToClientSelection = () => {
    setSelectedClient(null);
    setViewMode('client-selection');
  };

  const getProjetosDoCliente = (): ProjectDetails[] => {
    if (!selectedClient) return [];
    
    return projetos.filter(projeto => 
      projeto.clienteId === selectedClient.id || 
      projeto.cliente?.id === selectedClient.id
    );
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
    setViewMode('project-details');
  };

  const handleBackToList = () => {
    setSelectedProject(null);
    setViewMode('project-list');
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

  if (viewMode === 'project-details' && selectedProject) {
    return (
      <div className="space-y-6 animate-fadeInUp">
        {/* Botão Voltar - Minimalista */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="w-10 h-10 p-0 text-versys-primary hover:bg-versys-primary/10 hover:text-versys-secondary transition-all duration-300 rounded-full hover:scale-105 active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Voltar</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Header do Projeto */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-versys-primary/5 to-versys-secondary/5 rounded-2xl blur-xl" />
          <div className="relative bg-white/80 backdrop-blur-sm border border-versys-primary/20 rounded-2xl p-8 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-versys-primary to-versys-secondary bg-clip-text text-transparent">
                  {selectedProject.nome}
                </h1>
                <p className="text-gray-600 text-lg mb-4">
                  Gerencie projeto, faça solicitações aos clientes e acompanhe o progresso das verificações
                </p>
                
                {/* Informações principais em cards pequenos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-gradient-to-br from-versys-primary/10 to-versys-secondary/10 rounded-lg p-4 border border-versys-primary/20">
                    <div className="flex items-center space-x-2 mb-1">
                      <User className="h-4 w-4 text-versys-primary" />
                      <span className="text-sm font-medium text-versys-primary">Cliente</span>
                    </div>
                    <p className="text-sm font-semibold">{selectedProject.cliente?.nome || 'Nenhum cliente'}</p>
                    <p className="text-xs text-gray-500">{selectedProject.cliente?.empresa || ''}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-versys-secondary/10 to-versys-accent/10 rounded-lg p-4 border border-versys-secondary/20">
                    <div className="flex items-center space-x-2 mb-1">
                      <Calendar className="h-4 w-4 text-versys-secondary" />
                      <span className="text-sm font-medium text-versys-secondary">Início</span>
                    </div>
                    <p className="text-sm font-semibold">{new Date(selectedProject.dataInicio).toLocaleDateString('pt-BR')}</p>
                    <p className="text-xs text-gray-500">Data de início</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-versys-accent/10 to-yellow-400/10 rounded-lg p-4 border border-versys-accent/20">
                    <div className="flex items-center space-x-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-versys-accent" />
                      <span className="text-sm font-medium text-versys-accent">Progresso</span>
                    </div>
                    <p className="text-sm font-semibold">{selectedProject.progresso}%</p>
                    <p className="text-xs text-gray-500">Concluído</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Badge className="bg-gradient-to-r from-versys-primary to-versys-secondary text-white border-transparent px-4 py-2 text-sm animate-pulse">
                  {selectedProject.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Informações detalhadas */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Card principal - Informações do Projeto */}
          <div className="xl:col-span-2">
            <Card className="hover-lift overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-versys-primary to-versys-secondary text-white">
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Informações do Projeto</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Progresso com visualização aprimorada */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700">Progresso Geral</h4>
                      <span className="text-versys-primary font-bold text-lg">{selectedProject.progresso}%</span>
                    </div>
                    <div className="relative">
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-versys-primary to-versys-secondary transition-all duration-1000 ease-out relative"
                          style={{ width: `${selectedProject.progresso}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                        </div>
                      </div>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <span className="text-white text-xs font-semibold drop-shadow-sm">
                          {selectedProject.progresso}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Informações detalhadas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600">Consultor Responsável</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedProject.consultor}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600">Previsão de Conclusão</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedProject.previsaoConclusao ? new Date(selectedProject.previsaoConclusao).toLocaleDateString('pt-BR') : 'Não definida'}
                      </p>
                    </div>
                  </div>

                  {/* Observações */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Observações</h4>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {selectedProject.observacoes || 'Nenhuma observação adicionada'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Estatísticas */}
          <div className="space-y-6">
            {/* Card de estatísticas rápidas */}
            <Card className="hover-lift">
              <CardHeader className="bg-gradient-to-r from-versys-accent to-yellow-400 text-white">
                <CardTitle className="flex items-center space-x-2">
                  <ClipboardCheck className="h-5 w-5" />
                  <span>Estatísticas</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total de Itens</span>
                    <span className="font-semibold text-versys-primary">
                      {selectedProject.customAccordions?.reduce((total, acc) => 
                        total + acc.items.reduce((itemTotal, item) => itemTotal + item.subItems.length, 0), 0) || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Concluídos</span>
                    <span className="font-semibold text-green-600">
                      {selectedProject.customAccordions?.reduce((total, acc) => 
                        total + acc.items.reduce((itemTotal, item) => 
                          itemTotal + item.subItems.filter(sub => sub.evaluation === 'na').length, 0), 0) || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pendentes</span>
                    <span className="font-semibold text-yellow-600">
                      {selectedProject.customAccordions?.reduce((total, acc) => 
                        total + acc.items.reduce((itemTotal, item) => 
                          itemTotal + item.subItems.filter(sub => sub.evaluation === '' || sub.evaluation === 'r').length, 0), 0) || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Seção de Checklist */}
        <Card className="hover-lift overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-versys-accent to-yellow-400 text-white">
            <CardTitle className="flex items-center space-x-2">
              <ClipboardCheck className="h-5 w-5" />
              <span>Checklist de Verificações</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96 custom-scrollbar">
              {selectedProject.customAccordions && selectedProject.customAccordions.length > 0 ? (
                <div className="p-6">
                  <Accordion type="multiple" className="space-y-4">
                    {selectedProject.customAccordions.map((accordion) => (
                      <div key={accordion.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                        <AccordionItem value={accordion.id} className="border-0">
                          <AccordionTrigger className="text-left px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                            <div className="flex items-center justify-between w-full mr-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 bg-gradient-to-r from-versys-primary to-versys-secondary rounded-full"></div>
                                <span className="text-versys-primary font-semibold text-lg">{accordion.title}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="bg-gradient-to-r from-versys-primary/10 to-versys-secondary/10 border-versys-primary/20">
                                  {accordion.items.reduce((total, item) => total + item.subItems.length, 0)} itens
                                </Badge>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-6 pb-4">
                            <div className="space-y-4">
                              {accordion.items.map((item) => (
                                <div key={item.id} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                                      <p className="text-sm text-gray-600">{item.category}</p>
                                    </div>
                                    <Badge className={getPriorityColor(item.priority)} variant="secondary">
                                      {item.priority}
                                    </Badge>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    {item.subItems.map((subItem) => (
                                      <div key={subItem.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-shadow duration-200">
                                        <div className="flex items-start space-x-3">
                                          <div className="flex-shrink-0 mt-1">
                                            {getSubItemStatusIcon(subItem)}
                                          </div>
                                          <div className="flex-grow">
                                            <p className="text-sm font-medium text-gray-900 mb-2">{subItem.title}</p>
                                            
                                            {/* Situação atual */}
                                            {subItem.currentSituation && (
                                              <div className="mt-2 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg text-xs">
                                                <div className="flex items-center mb-1">
                                                  <span className="text-amber-600 mr-1">📋</span>
                                                  <strong className="text-amber-800">Situação Atual:</strong>
                                                </div>
                                                <span className="text-amber-700">{subItem.currentSituation}</span>
                                              </div>
                                            )}
                                            
                                            {/* Descrição/Orientação para o cliente */}
                                            {subItem.description && (
                                              <div className="mt-2 p-3 bg-indigo-50 border-l-4 border-indigo-400 rounded-r-lg text-xs">
                                                <div className="flex items-center mb-1">
                                                  <span className="text-indigo-600 mr-1">📝</span>
                                                  <strong className="text-indigo-800">Descrição/Orientação:</strong>
                                                </div>
                                                <span className="text-indigo-700">{subItem.description}</span>
                                              </div>
                                            )}
                                            
                                            {/* Resposta do cliente */}
                                            {subItem.clientResponse && (
                                              <div className="mt-2 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg text-xs">
                                                <div className="flex items-center mb-1">
                                                  <span className="text-blue-600 mr-1">💬</span>
                                                  <strong className="text-blue-800">Resposta do Cliente:</strong>
                                                </div>
                                                <span className="text-blue-700">{subItem.clientResponse}</span>
                                              </div>
                                            )}
                                            
                                            {/* Feedback do admin */}
                                            {subItem.adminFeedback && (
                                              <div className="mt-2 p-3 bg-green-50 border-l-4 border-green-400 rounded-r-lg text-xs">
                                                <div className="flex items-center mb-1">
                                                  <span className="text-green-600 mr-1">🔍</span>
                                                  <strong className="text-green-800">Feedback do Admin:</strong>
                                                </div>
                                                <span className="text-green-700">{subItem.adminFeedback}</span>
                                              </div>
                                            )}
                                            
                                            {/* Adequação reportada */}
                                            {subItem.adequacyReported && subItem.adequacyDetails && (
                                              <div className="mt-2 p-3 bg-violet-50 border-l-4 border-violet-400 rounded-r-lg text-xs">
                                                <div className="flex items-center mb-1">
                                                  <span className="text-violet-600 mr-1">✅</span>
                                                  <strong className="text-violet-800">Adequação Reportada:</strong>
                                                </div>
                                                <span className="text-violet-700">{subItem.adequacyDetails}</span>
                                                {subItem.adequacyDate && (
                                                  <p className="text-violet-600 mt-1 text-xs">
                                                    Data: {new Date(subItem.adequacyDate).toLocaleString('pt-BR')}
                                                  </p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex-shrink-0 flex flex-col space-y-1">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="text-green-600 border-green-600 hover:bg-green-50 hover:scale-105 transition-all duration-200"
                                              onClick={() => handleUpdateItemStatus(selectedProject.id, accordion.id, item.id, subItem.id, "aprovado")}
                                              disabled={updatingStatus[`${selectedProject.id}_${item.id}_${subItem.id}`]}
                                            >
                                              <CheckCircle2 className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="text-red-600 border-red-600 hover:bg-red-50 hover:scale-105 transition-all duration-200"
                                              onClick={() => handleUpdateItemStatus(selectedProject.id, accordion.id, item.id, subItem.id, "rejeitado")}
                                              disabled={updatingStatus[`${selectedProject.id}_${item.id}_${subItem.id}`]}
                                            >
                                              <XCircle className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </div>
                    ))}
                  </Accordion>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <div className="animate-float">
                    <ClipboardCheck className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum checklist configurado</h3>
                  <p className="text-gray-600">Este projeto ainda não possui itens de verificação configurados.</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botão Voltar - Minimalista */}
      {viewMode === 'project-list' && selectedClient && (
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToClientSelection}
                className="w-8 h-8 p-0 text-versys-primary hover:bg-versys-primary/10 hover:text-versys-secondary transition-all duration-200 rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Voltar para Clientes</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          {viewMode === 'client-selection' && (
            <>
              <h2 className="text-3xl font-bold text-versys-primary">Projetos</h2>
              <p className="text-gray-600 mt-2">
                Selecione um cliente para ver seus projetos
              </p>
            </>
          )}
          
          {viewMode === 'project-list' && selectedClient && (
            <div>
              <h2 className="text-3xl font-bold text-versys-primary">
                Projetos de {selectedClient.nome}
              </h2>
              <p className="text-gray-600 mt-2">
                {selectedClient.empresa} - {getProjetosDoCliente().length} projeto(s)
              </p>
            </div>
          )}
        </div>
        
        {(viewMode === 'client-selection' || viewMode === 'project-list') && (
          <div className="flex items-center space-x-2">
            <Button
              variant={listView === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setListView('cards')}
              className="flex items-center space-x-2"
            >
              <Grid className="h-4 w-4" />
              <span>Cards</span>
            </Button>
            <Button
              variant={listView === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setListView('list')}
              className="flex items-center space-x-2"
            >
              <List className="h-4 w-4" />
              <span>Lista</span>
            </Button>
          </div>
        )}
      </div>

      {viewMode === 'client-selection' && (
        <>
          {listView === 'cards' ? (
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
              {loadingClientes ? (
                <div className="col-span-full flex items-center justify-center h-48">
                  <p className="text-gray-500">Carregando clientes...</p>
                </div>
              ) : clientes.length === 0 ? (
                <div className="col-span-full flex items-center justify-center h-48">
                  <p className="text-gray-500">Nenhum cliente encontrado. Crie seu primeiro cliente!</p>
                </div>
              ) : (
                clientes.filter(cliente => cliente.status === 'ativo').map((cliente) => (
                  <Card 
                    key={cliente.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleSelectClient(cliente)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CardTitle className="flex items-center space-x-2">
                            <User className="h-5 w-5 text-versys-primary" />
                            <span className="text-versys-primary">{cliente.nome}</span>
                          </CardTitle>
                          <Badge className={getClientStatusColor(cliente.status)}>
                            {cliente.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center space-x-1 mb-1">
                            <Building className="h-3 w-3" />
                            <span>Empresa: {cliente.empresa}</span>
                          </div>
                          <div className="flex items-center space-x-1 mb-1">
                            <User className="h-3 w-3" />
                            <span>Email: {cliente.email}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <FileText className="h-3 w-3" />
                            <span>Projetos: {cliente.projetos}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Botão Novo Projeto */}
              <div className="flex justify-start">
                <Button
                  onClick={() => navigate("/projetos/new")}
                  className="flex items-center space-x-2 bg-versys-primary hover:bg-versys-secondary"
                >
                  <Plus className="h-4 w-4" />
                  <span>Novo Projeto</span>
                </Button>
              </div>

              {/* Tabela de Clientes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-versys-primary">Clientes Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingClientes ? (
                    <div className="flex items-center justify-center h-48">
                      <p className="text-gray-500">Carregando clientes...</p>
                    </div>
                  ) : clientes.length === 0 ? (
                    <div className="flex items-center justify-center h-48">
                      <p className="text-gray-500">Nenhum cliente encontrado. Crie seu primeiro cliente!</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Projetos</TableHead>
                          <TableHead>Data de Criação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientes.filter(cliente => cliente.status === 'ativo').map((cliente) => (
                          <TableRow 
                            key={cliente.id} 
                            className="cursor-pointer hover:bg-versys-secondary/5"
                            onClick={() => handleSelectClient(cliente)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4 text-versys-primary" />
                                <span className="text-versys-primary">{cliente.nome}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Building className="h-3 w-3" />
                                <span>{cliente.empresa}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>{cliente.email}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getClientStatusColor(cliente.status)}>
                                {cliente.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <FileText className="h-3 w-3" />
                                <span>{cliente.projetos}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(cliente.dataCriacao).toLocaleDateString('pt-BR')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

             {viewMode === 'project-list' && (
         <>
           {listView === 'cards' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {/* Card Novo Projeto */}
               <Card 
                 className="border-2 border-dashed border-versys-secondary hover:border-versys-primary transition-colors cursor-pointer group"
                 onClick={() => navigate(`/projetos/new?clienteId=${selectedClient?.id}`)}
               >
                 <CardContent className="flex flex-col items-center justify-center h-48 text-center">
                   <div className="w-16 h-16 bg-versys-secondary/20 rounded-full flex items-center justify-center mb-4 group-hover:bg-versys-primary/20 transition-colors">
                     <Plus className="h-8 w-8 text-versys-secondary group-hover:text-versys-primary" />
                   </div>
                   <h3 className="text-lg font-semibold text-versys-primary group-hover:text-versys-secondary">
                     Novo Projeto
                   </h3>
                   <p className="text-sm text-gray-600 mt-2">
                     Criar projeto para {selectedClient?.nome}
                   </p>
                 </CardContent>
               </Card>
               
               {/* Loading ou Cards dos Projetos */}
               {loading ? (
                <div className="col-span-full flex items-center justify-center h-48">
                  <p className="text-gray-500">Carregando projetos...</p>
                </div>
              ) : getProjetosDoCliente().length === 0 ? (
                <div className="col-span-full flex items-center justify-center h-48">
                  <p className="text-gray-500">Nenhum projeto encontrado. Crie seu primeiro projeto!</p>
                </div>
              ) : (
                getProjetosDoCliente().map((projeto) => (
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
          ) : (
            <div className="space-y-4">
              {/* Botão Novo Projeto */}
              <div className="flex justify-start">
                <Button
                  onClick={() => navigate(`/projetos/new?clienteId=${selectedClient?.id}`)}
                  className="flex items-center space-x-2 bg-versys-primary hover:bg-versys-secondary"
                >
                  <Plus className="h-4 w-4" />
                  <span>Novo Projeto</span>
                </Button>
              </div>

              {/* Tabela de Projetos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-versys-primary">Projetos de {selectedClient?.nome}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center h-48">
                      <p className="text-gray-500">Carregando projetos...</p>
                    </div>
                  ) : getProjetosDoCliente().length === 0 ? (
                    <div className="flex items-center justify-center h-48">
                      <p className="text-gray-500">Nenhum projeto encontrado. Crie seu primeiro projeto!</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Progresso</TableHead>
                          <TableHead>Consultor</TableHead>
                          <TableHead>Data de Início</TableHead>
                          <TableHead>Previsão</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getProjetosDoCliente().map((projeto) => (
                          <TableRow 
                            key={projeto.id} 
                            className="cursor-pointer hover:bg-versys-secondary/5"
                            onClick={() => handleViewDetails(projeto)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <Building className="h-4 w-4 text-versys-primary" />
                                <span className="text-versys-primary">{projeto.nome}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(projeto.status)}>
                                {projeto.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 max-w-[80px]">
                                  <Progress value={projeto.progresso} className="h-2" />
                                </div>
                                <span className="text-sm text-versys-primary font-medium">
                                  {projeto.progresso}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>{projeto.consultor}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(projeto.dataInicio).toLocaleDateString('pt-BR')}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{projeto.previsaoConclusao ? new Date(projeto.previsaoConclusao).toLocaleDateString('pt-BR') : 'Não definida'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
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
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Projetos;
