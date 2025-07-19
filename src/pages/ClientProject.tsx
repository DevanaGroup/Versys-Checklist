import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import WizardNavigation, { Step as WizardStep } from "@/components/WizardNavigation";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Building, 
  CheckCircle, 
  Clock, 
  User,
  ClipboardCheck,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  MessageSquare,
  Send,
  Image,
  X,
  Upload,
  Calendar,
  ArrowLeft,
  ArrowRight,
  Home,
  Eye
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface SubItem {
  id: string;
  title: string;
  evaluation: "nc" | "r" | "na" | "";
  completed: boolean;
  clientResponse?: string;
  adminFeedback?: string;
  adminImages?: string[];
  adequacyReported?: boolean;
  adequacyDetails?: string;
  adequacyImages?: string[];
  adequacyDate?: string;
  adequacyStatus?: "pending" | "approved" | "rejected";
  currentSituation?: string;
  description?: string;
}

interface ProjectItem {
  id: string;
  title: string;
  category: string;
  subItems: SubItem[];
  isExpanded: boolean;
  completed: boolean;
}

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
    items: ProjectItem[];
  }>;
  itens?: ProjectItem[];
}

const ClientProject = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { userData } = useAuthContext();
  const [projectDetails, setProjectDetails] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<any[]>([]);
  // passos formatados para o componente de wizard
  const wizardSteps: WizardStep[] = steps.map((s: any) => ({
    label: s.title,
    subtitle: s.category,
    completed: currentStep > (s.stepNumber - 1),
  }));
  const [clientResponse, setClientResponse] = useState('');
  const [clientImages, setClientImages] = useState<File[]>([]);

  useEffect(() => {
    console.log('🔍 ClientProject: userData atualizado:', userData);
    
    if (!userData) {
      console.log('❌ ClientProject: Nenhum usuário autenticado, redirecionando para login');
      navigate("/");
      return;
    }

    if (userData.type !== "client") {
      console.log('❌ ClientProject: Usuário não é cliente, redirecionando para dashboard admin');
      navigate("/dashboard");
      return;
    }

    if (!projectId) {
      console.log('❌ ClientProject: Nenhum projeto ID fornecido');
      navigate("/client-projects");
      return;
    }

    console.log('✅ ClientProject: Cliente autenticado, carregando projeto...');
    loadProject();
  }, [navigate, userData, projectId]);

  const loadProject = async () => {
    if (!userData?.uid || !projectId) return;
    
    try {
      setLoading(true);
      
      console.log('🔍 ClientProject: Buscando projeto:', projectId);
      
      const projectRef = doc(db, 'projetos', projectId);
      const projectDoc = await getDoc(projectRef);
      
      if (!projectDoc.exists()) {
        console.log('❌ ClientProject: Projeto não encontrado');
        toast.error('Projeto não encontrado');
        navigate("/client-projects");
        return;
      }

      const projectData = projectDoc.data();
      
      // Verificar se o projeto pertence ao usuário
      const clienteId = projectData.cliente?.id;
      const userUid = userData.uid;
      
      const hasAccess = clienteId === userUid || 
                       String(clienteId) === String(userUid) ||
                       (projectData.cliente?.email === userData.email);
      
      if (!hasAccess) {
        console.log('❌ ClientProject: Usuário não tem acesso ao projeto');
        toast.error('Acesso negado a este projeto');
        navigate("/client-projects");
        return;
      }

      const project: ProjectDetail = {
        id: projectDoc.id,
        nome: projectData.nome,
        status: projectData.status || 'Iniciado',
        progresso: calculateProgress(projectData.customAccordions || projectData.itens || []),
        dataInicio: projectData.dataInicio,
        previsaoConclusao: projectData.previsaoConclusao,
        consultor: projectData.consultor || 'Não definido',
        cliente: projectData.cliente,
        observacoes: projectData.observacoes || '',
        customAccordions: projectData.customAccordions || [],
        itens: projectData.itens || []
      };
      
      setProjectDetails(project);
      
      // Criar passos se houver itens
      if (project.customAccordions && project.customAccordions.length > 0) {
        const projectSteps = createStepsFromAccordions(project.customAccordions);
        setSteps(projectSteps);
        setCurrentStep(0);
      }
      
      console.log('✅ Projeto carregado:', project);
      
    } catch (error) {
      console.error('❌ Erro ao carregar projeto:', error);
      toast.error('Erro ao carregar projeto');
      navigate("/client-projects");
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (accordions: any[]): number => {
    if (!accordions || accordions.length === 0) return 0;
    
    let totalItems = 0;
    let completedItems = 0;
    
    accordions.forEach(accordion => {
      if (accordion.items) {
        accordion.items.forEach((item: any) => {
          if (item.subItems) {
            totalItems += item.subItems.length;
            completedItems += item.subItems.filter((subItem: any) => subItem.completed).length;
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

  const createStepsFromAccordions = (accordions: any[]) => {
    const steps: any[] = [];
    let stepIndex = 1;

    accordions.forEach((accordion) => {
      accordion.items.forEach((item: any) => {
        item.subItems.forEach((subItem: any) => {
          if (subItem.evaluation === "nc" || subItem.evaluation === "r") {
            steps.push({
              id: `${accordion.id}_${item.id}_${subItem.id}`,
              stepNumber: stepIndex,
              accordionId: accordion.id,
              itemId: item.id,
              subItemId: subItem.id,
              title: subItem.title,
              category: item.category,
              evaluation: subItem.evaluation,
              currentSituation: subItem.currentSituation,
              description: subItem.description,
              adminFeedback: subItem.adminFeedback,
              adequacyReported: subItem.adequacyReported,
              adequacyDetails: subItem.adequacyDetails,
              adequacyImages: subItem.adequacyImages,
              adequacyStatus: subItem.adequacyStatus,
              adequacyDate: subItem.adequacyDate,
              status: subItem.adequacyReported ? 'completed' : 'pending'
            });
            stepIndex++;
          }
        });
      });
    });

    return steps;
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setClientResponse('');
      setClientImages([]);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setClientResponse('');
      setClientImages([]);
    }
  };

  const handleClientResponse = async () => {
    if (!projectDetails || !clientResponse.trim()) {
      toast.error("Por favor, descreva as adequações realizadas.");
      return;
    }

    try {
      const currentStepData = steps[currentStep];
      
      // Converter imagens para base64
      const imageBase64Array: string[] = [];
      for (const file of clientImages) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        imageBase64Array.push(base64);
      }

      // Atualizar no Firebase
      const projectRef = doc(db, 'projetos', projectDetails.id);
      
      const updatedAccordions = projectDetails.customAccordions?.map(accordion => {
        if (accordion.id === currentStepData.accordionId) {
          return {
            ...accordion,
            items: accordion.items.map(item => {
              if (item.id === currentStepData.itemId) {
                return {
                  ...item,
                  subItems: item.subItems.map(subItem => {
                    if (subItem.id === currentStepData.subItemId) {
                      return {
                        ...subItem,
                        adequacyReported: true,
                        adequacyDetails: clientResponse,
                        adequacyImages: imageBase64Array,
                        adequacyDate: new Date().toISOString(),
                        adequacyStatus: 'pending' as const
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

      await updateDoc(projectRef, {
        customAccordions: updatedAccordions
      });

      // Atualizar estado local
      setProjectDetails(prev => {
        if (!prev) return null;
        return { ...prev, customAccordions: updatedAccordions };
      });

      // Atualizar steps
      setSteps(prev => prev.map(step => {
        if (step.id === currentStepData.id) {
          return { ...step, status: 'completed' };
        }
        return step;
      }));

      toast.success("Adequação enviada com sucesso! Aguardando aprovação do consultor.");
      setClientResponse('');
      setClientImages([]);

      // Avançar para o próximo passo se houver
      if (currentStep < steps.length - 1) {
        handleNextStep();
      }
    } catch (error) {
      console.error('Erro ao enviar adequação:', error);
      toast.error("Erro ao enviar adequação. Tente novamente.");
    }
  };

  const handleStepImageUpload = (files: FileList) => {
    const newImages = Array.from(files);
    if (clientImages.length + newImages.length > 5) {
      toast.error("Máximo de 5 imagens permitido.");
      return;
    }
    setClientImages(prev => [...prev, ...newImages]);
  };

  const removeStepImage = (index: number) => {
    setClientImages(prev => prev.filter((_, i) => i !== index));
  };

  const calculateOverallProgress = () => {
    if (steps.length === 0) return projectDetails?.progresso || 0;
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    return Math.round((completedSteps / steps.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!projectDetails) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Projeto não encontrado</h3>
        <Button onClick={() => navigate("/client-projects")}>
          Voltar para Meus Projetos
        </Button>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate("/client-projects")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para Meus Projetos</span>
          </Button>
        </div>

        {/* Informações do projeto */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1 text-gray-900">
                {projectDetails.nome}
              </h1>
              <p className="text-gray-600 text-sm">
                Este projeto não possui itens que necessitam de adequação no momento.
              </p>
            </div>
            
            <div className="flex items-center">
              <Badge className={`${getStatusColor(projectDetails.status)} px-3 py-1 text-xs`}>
                {projectDetails.status}
              </Badge>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="text-center py-12">
            <FileCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma adequação necessária
            </h3>
            <p className="text-gray-600 mb-4">
              Este projeto não possui itens que precisam de adequação no momento.
            </p>
            <p className="text-sm text-gray-500">
              Entre em contato com o consultor para mais informações.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStepData = steps[currentStep];
  const progressPercentage = calculateOverallProgress();

  return (
    <div className="space-y-6">
      {/* Navegação */}
      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
        <Button
              variant="ghost"
              size="sm"
          onClick={() => navigate("/client-projects")}
              className="w-10 h-10 p-0 text-versys-primary hover:bg-versys-primary/10 hover:text-versys-secondary transition-all duration-300 rounded-full hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Voltar para Meus Projetos</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Cabeçalho do projeto */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-1 text-gray-900">
              {projectDetails.nome}
            </h1>
            <p className="text-gray-600 text-sm">
              Siga o processo passo a passo para adequar todos os itens necessários
            </p>
          </div>
          
          <div className="flex items-center">
            <Badge className={`${getStatusColor(projectDetails.status)} px-3 py-1 text-xs`}>
              {projectDetails.status}
            </Badge>
          </div>
        </div>
        
        {/* Informações principais */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-1 mb-1">
              <User className="h-3 w-3 text-gray-600" />
              <span className="text-xs font-medium text-gray-600">Cliente</span>
            </div>
            <p className="text-xs font-semibold">{projectDetails.cliente?.nome || 'N/A'}</p>
            <p className="text-xs text-gray-500">{projectDetails.cliente?.empresa || ''}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-1 mb-1">
              <Calendar className="h-3 w-3 text-gray-600" />
              <span className="text-xs font-medium text-gray-600">Início</span>
            </div>
            <p className="text-xs font-semibold">{new Date(projectDetails.dataInicio).toLocaleDateString('pt-BR')}</p>
            <p className="text-xs text-gray-500">Data de início</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-1 mb-1">
              <CheckCircle className="h-3 w-3 text-gray-600" />
              <span className="text-xs font-medium text-gray-600">Progresso</span>
            </div>
            <p className="text-xs font-semibold">{progressPercentage}%</p>
            <p className="text-xs text-gray-500">Concluído</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">Progresso Geral</span>
          <span className="text-sm font-bold text-blue-600">{progressPercentage}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Indicadores de Passos */}
      <WizardNavigation
        steps={wizardSteps}
        currentStep={currentStep}
        onPrev={handlePreviousStep}
        onNext={handleNextStep}
        showNav={false}
        className="bg-white rounded-xl border shadow-sm"
      />

      {/* Conteúdo do passo atual */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {/* Cabeçalho do item */}
        <div className="bg-gray-50 p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Passo {currentStep + 1}: {currentStepData.title}
              </h3>
              <p className="text-sm text-gray-600">Categoria: {currentStepData.category}</p>
            </div>
            <div className="flex items-center space-x-2">
              {currentStepData.status === 'completed' ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Concluído
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  <Clock className="h-3 w-3 mr-1" />
                  Pendente
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Detalhes do item */}
        <div className="p-6 space-y-6">
          {/* Informações da avaliação */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">📊 Informações da Avaliação</h4>
            <div className={`grid grid-cols-1 ${(currentStepData.adminImages && currentStepData.adminImages.length > 0) || (currentStepData.adequacyImages && currentStepData.adequacyImages.length > 0) ? 'lg:grid-cols-3' : ''} gap-6`}>
              {/* Informações textuais - lado esquerdo */}
              <div className={`space-y-3 ${(currentStepData.adminImages && currentStepData.adminImages.length > 0) || (currentStepData.adequacyImages && currentStepData.adequacyImages.length > 0) ? 'lg:col-span-2' : ''}`}>
              <div>
                <span className="font-medium text-gray-600">🔍 Avaliação:</span>
                <p className={`font-medium mt-1 ${currentStepData.evaluation === 'nc' ? 'text-red-600' : 'text-yellow-600'}`}>
                  {currentStepData.evaluation === 'nc' ? 'Não Conforme' : 'Requer Adequação'}
                </p>
              </div>
              
              {currentStepData.currentSituation && (
                <div>
                  <span className="font-medium text-gray-600">📋 Situação Atual:</span>
                  <p className="text-gray-900 mt-1">{currentStepData.currentSituation}</p>
                </div>
              )}
              
              {currentStepData.description && (
                <div>
                  <span className="font-medium text-gray-600">📝 Descrição/Orientação:</span>
                  <p className="text-gray-900 mt-1">{currentStepData.description}</p>
                </div>
              )}
              
              {currentStepData.adminFeedback && (
                <div>
                  <span className="font-medium text-gray-600">💬 Observações do Consultor:</span>
                  <p className="text-gray-900 mt-1">{currentStepData.adminFeedback}</p>
                  </div>
                )}
              </div>
              
              {/* Imagens - lado direito */}
              {((currentStepData.adminImages && currentStepData.adminImages.length > 0) || (currentStepData.adequacyImages && currentStepData.adequacyImages.length > 0)) && (
                <div className="space-y-4">
                  <div>
                    <span className="font-medium text-gray-600">📷 Imagens Anexadas</span>
                    <div className="mt-3 space-y-4">
                      {/* Imagens do Admin */}
                      {currentStepData.adminImages && currentStepData.adminImages.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-500 mb-2">Consultor:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {currentStepData.adminImages.map((imageBase64, index) => (
                              <div key={`admin-${index}`} className="relative group">
                                <img
                                  src={imageBase64}
                                  alt={`Anexo admin ${index + 1}`}
                                  className="w-full h-16 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => {
                                    const modal = document.createElement('div');
                                    modal.innerHTML = `
                                      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000;" onclick="this.remove()">
                                        <div style="position: relative; max-width: 90%; max-height: 90%;">
                                          <img src="${imageBase64}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="Imagem ampliada" />
                                          <button style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer;" onclick="this.parentElement.parentElement.remove()">✕</button>
                                        </div>
                                      </div>
                                    `;
                                    document.body.appendChild(modal);
                                  }}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-white rounded-full p-1">
                                      <Eye className="h-3 w-3 text-gray-600" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Imagens do Cliente */}
                      {currentStepData.adequacyImages && currentStepData.adequacyImages.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-500 mb-2">Cliente:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {currentStepData.adequacyImages.map((imageBase64, index) => (
                              <div key={`client-${index}`} className="relative group">
                                <img
                                  src={imageBase64}
                                  alt={`Adequação ${index + 1}`}
                                  className="w-full h-16 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => {
                                    const modal = document.createElement('div');
                                    modal.innerHTML = `
                                      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000;" onclick="this.remove()">
                                        <div style="position: relative; max-width: 90%; max-height: 90%;">
                                          <img src="${imageBase64}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="Imagem ampliada" />
                                          <button style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer;" onclick="this.parentElement.parentElement.remove()">✕</button>
                                        </div>
                                      </div>
                                    `;
                                    document.body.appendChild(modal);
                                  }}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-white rounded-full p-1">
                                      <Eye className="h-3 w-3 text-gray-600" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Formulário de resposta do cliente */}
          {currentStepData.status !== 'completed' && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">
                <MessageSquare className="h-4 w-4 inline mr-2" />
                Reportar Adequação Realizada
              </h4>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Descreva detalhadamente as adequações realizadas:
                  </Label>
                  <Textarea
                    placeholder="Descreva as adequações que foram implementadas para este item..."
                    value={clientResponse}
                    onChange={(e) => setClientResponse(e.target.value)}
                    className="text-sm"
                    rows={4}
                  />
                </div>
                
                {/* Upload de imagens */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    <Image className="h-4 w-4 inline mr-1" />
                    Anexar Fotos Comprobatórias (máximo 5 imagens):
                  </Label>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    {clientImages.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Anexo ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border"
                        />
                        <button
                          onClick={() => removeStepImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          handleStepImageUpload(e.target.files);
                        }
                      }}
                      className="hidden"
                      id="step-image-upload"
                    />
                    <label
                      htmlFor="step-image-upload"
                      className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Anexar Imagens
                    </label>
                    <span className="text-xs text-gray-500">
                      Máximo 5 imagens
                    </span>
                  </div>
                </div>
                
                <Button
                  onClick={handleClientResponse}
                  disabled={!clientResponse.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Adequação
                </Button>
              </div>
            </div>
          )}

          {/* Adequação já enviada */}
          {currentStepData.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-green-900 text-sm">
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                Adequação Enviada
              </h4>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  currentStepData.adequacyStatus === 'approved' ? 'bg-green-100 text-green-800' :
                  currentStepData.adequacyStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {currentStepData.adequacyStatus === 'approved' ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Aprovado
                    </>
                  ) : currentStepData.adequacyStatus === 'rejected' ? (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Rejeitado
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      Aguardando
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                <div>
                  <span className="font-medium text-gray-600 text-sm">📝 Descrição:</span>
                  <p className="text-gray-900 text-sm">{currentStepData.adequacyDetails}</p>
                </div>
                
                {currentStepData.adequacyDate && (
                  <div className="text-xs text-gray-500">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Enviada em: {new Date(currentStepData.adequacyDate).toLocaleDateString('pt-BR')} às {new Date(currentStepData.adequacyDate).toLocaleTimeString('pt-BR')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navegação Inferior */}
      <WizardNavigation
        showIndicators={false}
        steps={wizardSteps}
        currentStep={currentStep}
        onPrev={handlePreviousStep}
        onNext={handleNextStep}
        className="bg-white rounded-xl border shadow-sm"
      />
    </div>
  );
};

export default ClientProject; 