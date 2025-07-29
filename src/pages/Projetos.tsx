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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Building, Calendar, User, FileText, CheckCircle, Clock, AlertCircle, ArrowLeft, Send, Download, CheckCircle2, XCircle, AlertTriangle, Eye, ClipboardCheck, Trash2, MoreVertical, Edit, Grid, List, ChevronRight, ChevronLeft, PauseCircle, RotateCcw, FileTextIcon, MessageSquare, CheckSquare, X, Globe, BarChart3 } from "lucide-react";
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
  const [viewMode, setViewMode] = useState<'client-selection' | 'project-list'>('client-selection');
  const [listView, setListView] = useState<'cards' | 'list'>('list');
  
  // Estados para o sistema de passos
  const [currentStep, setCurrentStep] = useState(0);
  const [clientResponse, setClientResponse] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState<{ [itemId: string]: boolean }>({});
  const [deletingProject, setDeletingProject] = useState<string | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [selectedClienteForNew, setSelectedClienteForNew] = useState<string>('none');
  const [selectedPreset, setSelectedPreset] = useState<string>('none');
  const [presets, setPresets] = useState<any[]>([]);

  const isAdmin = userData?.type === 'admin';

  useEffect(() => {
    loadClientes();
    loadProjetos();
    loadPresets();
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

  const loadPresets = async () => {
    try {
      const presetsRef = collection(db, 'presets');
      const querySnapshot = await getDocs(presetsRef);
      
      const presetsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setPresets(presetsData);
    } catch (error) {
      console.error('Erro ao carregar presets:', error);
      toast.error('Erro ao carregar presets');
    }
  };

  const handleCreateNewProject = () => {
    let url = '/projetos/new';
    const params = new URLSearchParams();
    
    if (selectedClienteForNew && selectedClienteForNew !== 'none') {
      params.append('clienteId', selectedClienteForNew);
    }
    
    if (selectedPreset && selectedPreset !== 'none') {
      params.append('presetId', selectedPreset);
    }
    
    if (params.toString()) {
      url += '?' + params.toString();
    }
    
    setShowNewProjectModal(false);
    setSelectedClienteForNew('none');
    setSelectedPreset('none');
    navigate(url);
  };

  const loadProjetos = async () => {
    try {
      setLoading(true);
      const projetosRef = collection(db, 'projetos');
      const querySnapshot = await getDocs(projetosRef);
      
      const projetosData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Dados do projeto:', doc.id, data);
        
        // Debug específico para o projeto Novo teste 00009
        if (data.nome === 'Novo teste 00009') {
          console.log('🔍 PROJETO NOVO TESTE 00009 ENCONTRADO:');
          console.log('- ID do projeto:', doc.id);
          console.log('- Nome:', data.nome);
          console.log('- ClienteId:', data.clienteId);
          console.log('- Cliente objeto:', data.cliente);
          console.log('- Todos os dados:', JSON.stringify(data, null, 2));
        }
        
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
    if (!selectedClient) {
      // Se nenhum cliente estiver selecionado, retorna projetos sem clientes
      return projetos.filter(projeto => 
        !projeto.clienteId && !projeto.cliente?.id
      );
    }
    
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
    // Durante fase administrativa, progresso sempre é 0%
    // Progresso só deve avançar quando cliente fizer adequações
    return 0;
  };

  const handleViewDetails = (projeto: ProjectDetails) => {
    navigate(`/projetos/view/${projeto.id}`);
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

  // Função para criar os passos a partir dos accordions
  const createStepsFromAccordions = (accordions: any[]) => {
    if (!accordions || accordions.length === 0) return [];
    
    const steps: any[] = [];
    
    accordions.forEach((accordion, accordionIndex) => {
      accordion.items.forEach((item: any, itemIndex: number) => {
        item.subItems.forEach((subItem: any, subItemIndex: number) => {
          const stepNumber = steps.length + 1;
          
          steps.push({
            id: `${accordion.id}-${item.id}-${subItem.id}`,
            stepNumber,
            title: subItem.title,
            itemTitle: item.title,
            category: item.category,
            accordionTitle: accordion.title,
            priority: item.priority,
            accordionId: accordion.id,
            itemId: item.id,
            subItemId: subItem.id,
            subItem: subItem,
            description: subItem.description,
            currentSituation: subItem.currentSituation,
            clientResponse: subItem.clientResponse || '',
            adminFeedback: subItem.adminFeedback || '',
            adequacyReported: subItem.adequacyReported || false,
            adequacyDetails: subItem.adequacyDetails || '',
            adequacyDate: subItem.adequacyDate || null,
            status: subItem.evaluation || 'pending',
            required: subItem.required || false
          });
        });
      });
    });
    
    return steps;
  };

  const steps = selectedProject ? createStepsFromAccordions(selectedProject.customAccordions || []) : [];
  const currentStepData = steps[currentStep];
  


  const getStepStatusDisplay = (status: string) => {
    switch (status) {
      case 'na':
        return { 
          icon: <CheckCircle className="h-6 w-6 text-green-600" />, 
          text: 'Aprovado',
          color: 'bg-green-100 border-green-300 text-green-800'
        };
      case 'nc':
        return { 
          icon: <XCircle className="h-6 w-6 text-red-600" />, 
          text: 'Rejeitado',
          color: 'bg-red-100 border-red-300 text-red-800'
        };
      case 'r':
        return { 
          icon: <AlertTriangle className="h-6 w-6 text-yellow-600" />, 
          text: 'Precisa Revisar',
          color: 'bg-yellow-100 border-yellow-300 text-yellow-800'
        };
      default:
        return { 
          icon: <Clock className="h-6 w-6 text-gray-400" />, 
          text: 'Pendente',
          color: 'bg-gray-100 border-gray-300 text-gray-600'
        };
    }
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setClientResponse('');
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setClientResponse('');
    }
  };

  const handleClientResponse = async () => {
    if (!selectedProject || !currentStepData || !clientResponse.trim()) {
      toast.error('Por favor, preencha sua resposta antes de enviar.');
      return;
    }

    try {
      setIsSubmittingResponse(true);
      
      const updatedAccordions = selectedProject.customAccordions?.map(accordion => {
        if (accordion.id === currentStepData.accordionId) {
          return {
            ...accordion,
            items: accordion.items.map((item: any) => {
              if (item.id === currentStepData.itemId) {
                return {
                  ...item,
                  subItems: item.subItems.map((subItem: any) => {
                    if (subItem.id === currentStepData.subItemId) {
                      return {
                        ...subItem,
                        clientResponse: clientResponse,
                        adequacyReported: true,
                        adequacyDetails: clientResponse,
                        adequacyDate: new Date().toISOString(),
                        evaluation: 'r' // Marca como "precisa revisar" até admin aprovar
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

      const projectRef = doc(db, 'projetos', selectedProject.id);
      await updateDoc(projectRef, {
        customAccordions: updatedAccordions
      });

      // Atualizar o projeto localmente
      setProjetos(prev => prev.map(p => 
        p.id === selectedProject.id 
          ? { ...p, customAccordions: updatedAccordions }
          : p
      ));

      setSelectedProject(prev => prev ? { ...prev, customAccordions: updatedAccordions } : null);
      
      toast.success('Resposta enviada com sucesso! Aguarde a análise do administrador.');
      setClientResponse('');
      
    } catch (error) {
      console.error('Erro ao enviar resposta:', error);
      toast.error('Erro ao enviar resposta. Tente novamente.');
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const handleAdminAction = async (action: 'approve' | 'reject', feedback?: string) => {
    if (!selectedProject || !currentStepData) return;

    try {
      setUpdatingStatus(prev => ({ ...prev, [currentStepData.id]: true }));
      
      const updatedAccordions = selectedProject.customAccordions?.map(accordion => {
        if (accordion.id === currentStepData.accordionId) {
          return {
            ...accordion,
            items: accordion.items.map((item: any) => {
              if (item.id === currentStepData.itemId) {
                return {
                  ...item,
                  subItems: item.subItems.map((subItem: any) => {
                    if (subItem.id === currentStepData.subItemId) {
                      return {
                        ...subItem,
                        evaluation: action === 'approve' ? 'na' : 'nc',
                        adminFeedback: feedback || subItem.adminFeedback || ''
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

      const projectRef = doc(db, 'projetos', selectedProject.id);
      await updateDoc(projectRef, {
        customAccordions: updatedAccordions
      });

      setProjetos(prev => prev.map(p => 
        p.id === selectedProject.id 
          ? { ...p, customAccordions: updatedAccordions }
          : p
      ));

      setSelectedProject(prev => prev ? { ...prev, customAccordions: updatedAccordions } : null);
      
      toast.success(`Item ${action === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status. Tente novamente.');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [currentStepData.id]: false }));
    }
  };

  const calculateOverallProgress = () => {
    if (steps.length === 0) return 0;
    const approved = steps.filter(step => step.status === 'na').length;
    return Math.round((approved / steps.length) * 100);
  };

  const renderStepByStep = () => {
    if (steps.length === 0) {
      return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileTextIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum item configurado</h3>
            <p className="text-gray-500">Este projeto ainda não possui itens de verificação configurados.</p>
          </div>
        </div>
      );
    }

    const statusDisplay = getStepStatusDisplay(currentStepData.status);

    return (
      <div className="max-w-3xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="px-4 py-3">
            {/* Title and Status */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-versys-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-base">{currentStepData.stepNumber}</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{currentStepData.title}</h1>
                  <p className="text-gray-500 text-xs">{currentStepData.accordionTitle} • {currentStepData.itemTitle}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge className={`${getPriorityColor(currentStepData.priority)} text-xs`} variant="outline">
                  {currentStepData.priority}
                </Badge>
                <div className={`flex items-center space-x-1 px-2 py-1 rounded ${statusDisplay.color}`}>
                  {statusDisplay.icon}
                  <span className="font-medium text-xs">{statusDisplay.text}</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Progresso do Projeto</span>
                <span className="font-medium text-gray-900">{calculateOverallProgress()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-versys-primary h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${calculateOverallProgress()}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{steps.filter(s => s.status === 'na').length} de {steps.length} itens concluídos</span>
                <span>Etapa {currentStepData.stepNumber} de {steps.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Cards */}
        <div className="space-y-3">
          {/* Current Situation */}
          {currentStepData.currentSituation && (
            <div className="bg-white rounded-lg shadow-sm border border-amber-200">
              <div className="px-4 py-3">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Situação Atual</h3>
                    <p className="text-gray-700 leading-relaxed text-sm">{currentStepData.currentSituation}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* What needs to be done */}
          {currentStepData.description && (
            <div className="bg-white rounded-lg shadow-sm border border-blue-200">
              <div className="px-4 py-3">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileTextIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">O que precisa ser feito</h3>
                    <p className="text-gray-700 leading-relaxed text-sm">{currentStepData.description}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Client Response */}
          {currentStepData.clientResponse && (
            <div className="bg-white rounded-lg shadow-sm border border-green-200">
              <div className="px-4 py-3">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Sua Resposta</h3>
                    <p className="text-gray-700 leading-relaxed text-sm mb-2">{currentStepData.clientResponse}</p>
                    {currentStepData.adequacyDate && (
                      <p className="text-xs text-gray-500">
                        Enviado em: {new Date(currentStepData.adequacyDate).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Admin Feedback */}
          {currentStepData.adminFeedback && (
            <div className="bg-white rounded-lg shadow-sm border border-purple-200">
              <div className="px-4 py-3">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckSquare className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Feedback do Administrador</h3>
                    <p className="text-gray-700 leading-relaxed text-sm">{currentStepData.adminFeedback}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Client Response Form */}
          {!isAdmin && currentStepData.status !== 'na' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-4 py-3">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Descreva sua adequação</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="client-response" className="text-xs font-medium text-gray-700 mb-2 block">
                      Como você se adequou a este requisito?
                    </Label>
                    <Textarea
                      id="client-response"
                      placeholder="Descreva detalhadamente as ações que você tomou para se adequar a este requisito..."
                      value={clientResponse}
                      onChange={(e) => setClientResponse(e.target.value)}
                      className="min-h-[100px] resize-none border-gray-300 focus:border-versys-primary focus:ring-versys-primary text-sm"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Seja específico e detalhado. Quanto mais informações você fornecer, mais rápida será a análise.
                    </p>
                  </div>
                  <Button
                    onClick={handleClientResponse}
                    disabled={isSubmittingResponse || !clientResponse.trim()}
                    className="w-full bg-versys-primary hover:bg-versys-primary/90 text-white font-medium h-10 rounded-lg text-sm"
                  >
                    {isSubmittingResponse ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Resposta para Análise
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Admin Actions */}
          {isAdmin && currentStepData.status !== 'pending' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-4 py-3">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Ações do Administrador</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleAdminAction('approve')}
                    disabled={updatingStatus[currentStepData.id]}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium h-10 rounded-lg text-sm"
                  >
                    {updatingStatus[currentStepData.id] ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Aprovando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Aprovar
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleAdminAction('reject')}
                    disabled={updatingStatus[currentStepData.id]}
                    variant="destructive"
                    className="font-medium h-10 rounded-lg text-sm"
                  >
                    {updatingStatus[currentStepData.id] ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Rejeitando...
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Rejeitar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-4">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePreviousStep}
                disabled={currentStep === 0}
                className="flex items-center space-x-2 h-8 text-xs"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>Anterior</span>
              </Button>
              
              <div className="text-center">
                <div className="text-xs font-medium text-gray-900">
                  {currentStep + 1} de {steps.length}
                </div>
                <div className="text-xs text-gray-500">
                  {Math.round(((currentStep + 1) / steps.length) * 100)}% concluído
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={handleNextStep}
                disabled={currentStep === steps.length - 1}
                className="flex items-center space-x-2 h-8 text-xs"
              >
                <span>Próximo</span>
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Removed project-details view - now using AdminProjectView component

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
                Selecione um cliente para ver seus projetos ou visualize projetos sem clientes
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
          
          {viewMode === 'project-list' && !selectedClient && (
            <div>
              <h2 className="text-3xl font-bold text-versys-primary">
                Projetos Sem Cliente
              </h2>
              <p className="text-gray-600 mt-2">
                {getProjetosDoCliente().length} projeto(s) sem cliente associado
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


              {/* Card Projetos Sem Cliente */}
              <Card 
                className="border-2 border-dashed border-gray-300 hover:border-versys-primary transition-colors cursor-pointer group"
                onClick={() => setViewMode('project-list')}
              >
                <CardContent className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-versys-primary/20 transition-colors">
                    <FileText className="h-8 w-8 text-gray-400 group-hover:text-versys-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 group-hover:text-versys-primary">
                    Projetos Sem Cliente
                  </h3>
                  <p className="text-sm text-gray-600 mt-2">
                    {projetos.filter(p => !p.clienteId && !p.cliente?.id).length} projeto(s) sem cliente associado
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
                  onClick={() => setShowNewProjectModal(true)}
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
                        {/* Linha para Projetos Sem Cliente */}
                        <TableRow 
                          className="cursor-pointer hover:bg-versys-secondary/5 border-t-2 border-gray-200"
                          onClick={() => setViewMode('project-list')}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-700">Projetos Sem Cliente</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-500">-</TableCell>
                          <TableCell className="text-gray-500">-</TableCell>
                          <TableCell>
                            <Badge className="bg-gray-100 text-gray-800">
                              Sem Cliente
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-versys-primary">
                            {projetos.filter(p => !p.clienteId && !p.cliente?.id).length}
                          </TableCell>
                          <TableCell className="text-gray-500">-</TableCell>
                        </TableRow>
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
                                 navigate(`/projetos/new?editId=${projeto.id}`);
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
                    <>
                      {/* Tabela Otimizada para Landscape Mobile */}
                      <div className="hidden portrait:sm:block landscape:block">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="min-w-[120px] landscape:min-w-[100px]">Nome</TableHead>
                                <TableHead className="min-w-[80px] landscape:min-w-[70px]">Status</TableHead>
                                <TableHead className="min-w-[100px] landscape:min-w-[80px]">Progresso</TableHead>
                                <TableHead className="min-w-[80px] landscape:min-w-[70px]">Consultor</TableHead>
                                <TableHead className="min-w-[80px] landscape:min-w-[70px]">Início</TableHead>
                                <TableHead className="min-w-[80px] landscape:min-w-[70px]">Previsão</TableHead>
                                <TableHead className="text-center min-w-[100px] landscape:min-w-[80px]">Ações</TableHead>
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
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center space-x-2">

                                    <Button
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      title="Visualizar locais no mapa"
                                      onClick={e => {
                                        e.stopPropagation();
                                        navigate(`/projetos/map/${projeto.id}`);
                                      }}
                                    >
                                      <Globe className="h-5 w-5 text-blue-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      title="Ver relatório do projeto"
                                      onClick={e => {
                                        e.stopPropagation();
                                        navigate(`/relatorios?projectId=${projeto.id}`);
                                      }}
                                    >
                                      <BarChart3 className="h-5 w-5 text-purple-600" />
                                    </Button>
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
                                            navigate(`/projetos/new?editId=${projeto.id}`);
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
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Cards para Portrait Mobile apenas */}
                      <div className="portrait:block landscape:hidden sm:hidden space-y-4">
                        {getProjetosDoCliente().map((projeto) => (
                          <Card 
                            key={projeto.id} 
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => handleViewDetails(projeto)}
                          >
                            <CardContent className="p-4">
                              {/* Header do Card */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-3 flex-1">
                                  <Building className="h-5 w-5 text-versys-primary flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-medium text-versys-primary truncate">{projeto.nome}</h3>
                                    <p className="text-sm text-gray-500 truncate">ID: #{projeto.id.slice(-6)}</p>
                                  </div>
                                </div>
                                <Badge className={`ml-2 flex-shrink-0 ${getStatusColor(projeto.status)}`}>
                                  {projeto.status}
                                </Badge>
                              </div>

                              {/* Informações do Projeto */}
                              <div className="space-y-3">
                                {/* Consultor */}
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">Consultor:</span>
                                  <span className="text-sm font-medium">{projeto.consultor}</span>
                                </div>

                                {/* Progresso */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Progresso</span>
                                    <span className="text-sm font-medium text-versys-primary">
                                      {projeto.progresso}%
                                    </span>
                                  </div>
                                  <Progress value={projeto.progresso} className="h-2" />
                                </div>

                                {/* Datas */}
                                <div className="grid grid-cols-1 gap-2">
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">Início:</span>
                                    <span className="text-sm">
                                      {new Date(projeto.dataInicio).toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">Previsão:</span>
                                    <span className="text-sm">
                                      {projeto.previsaoConclusao 
                                        ? new Date(projeto.previsaoConclusao).toLocaleDateString('pt-BR')
                                        : 'Não definida'
                                      }
                                    </span>
                                  </div>
                                </div>

                                {/* Ações */}
                                <div className="flex items-center justify-between pt-2 border-t">
                                  <div className="flex items-center space-x-1 flex-1">

                                    
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex items-center space-x-1 text-xs px-2 py-1 h-7 flex-shrink-0"
                                      onClick={e => {
                                        e.stopPropagation();
                                        navigate(`/projetos/map/${projeto.id}`);
                                      }}
                                    >
                                      <Globe className="h-3 w-3 text-blue-600" />
                                      <span>Mapa</span>
                                    </Button>
                                  </div>
                                  
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
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
                                          navigate(`/projetos/new?editId=${projeto.id}`);
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
                                              {deletingProject === projeto.id ? 'Deletando...' : 'Excluir'}
                                            </DropdownMenuItem>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Tem certeza que deseja excluir o projeto "{projeto.nome}"?
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
                                                Confirmar
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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
          )}
        </>
      )}
      
      {/* Modal de Novo Projeto */}
      <Dialog open={showNewProjectModal} onOpenChange={setShowNewProjectModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Criar Novo Projeto</span>
            </DialogTitle>
            <DialogDescription>
              Configure as opções iniciais para o novo projeto
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Seleção de Cliente */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cliente (Opcional)</Label>
              <Select value={selectedClienteForNew} onValueChange={setSelectedClienteForNew}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente ou deixe em branco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum cliente selecionado</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4" />
                        <span>{cliente.nome} - {cliente.empresa}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Seleção de Preset */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Preset/Template (Opcional)</Label>
              <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um preset ou comece do zero" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Começar do zero</SelectItem>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <div className="flex items-center space-x-2">
                        <ClipboardCheck className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{preset.nome}</div>
                          {preset.descricao && (
                            <div className="text-xs text-muted-foreground">{preset.descricao}</div>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPreset && (
                <div className="text-xs text-muted-foreground">
                  💡 O preset selecionado será usado como base para estruturar o projeto
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowNewProjectModal(false);
                setSelectedClienteForNew('none');
                setSelectedPreset('none');
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateNewProject}
              className="bg-versys-primary hover:bg-versys-secondary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Projeto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Projetos;
