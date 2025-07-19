import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileX } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Eye,
  Shield,
  ThumbsUp,
  ThumbsDown,
  Plus,
  ChevronDown,
  ChevronRight,
  Edit,
  Settings
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

const AdminProjectView = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { userData } = useAuthContext();
  const [projectDetails, setProjectDetails] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [projectSteps, setProjectSteps] = useState<any[]>([]);
  const [adminFeedback, setAdminFeedback] = useState('');
  const [adminImages, setAdminImages] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState('adequacoes');
  const [newAccordionTitle, setNewAccordionTitle] = useState('');

  useEffect(() => {
    if (!userData) {
      navigate("/");
      return;
    }
    if (userData.type !== "admin") {
      navigate("/dashboard");
      return;
    }
    if (!projectId) {
      navigate("/projetos");
      return;
    }
    loadProject();
  }, [navigate, userData, projectId]);

  const loadProject = async () => {
    if (!userData?.uid || !projectId) return;
    try {
      setLoading(true);
      const projectRef = doc(db, 'projetos', projectId);
      const projectDoc = await getDoc(projectRef);
      if (!projectDoc.exists()) {
        toast.error('Projeto não encontrado');
        navigate("/projetos");
        return;
      }
      const projectData = projectDoc.data();
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
      // O useEffect irá cuidar de atualizar os steps quando projectDetails mudar
    } catch (error) {
      toast.error('Erro ao carregar projeto');
      navigate("/projetos");
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
      case "Pendente": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getProjectSteps = (): any[] => {
    if (!projectDetails) return [];
    
    const steps: any[] = [];
    const accordions = projectDetails.customAccordions || [];
    
    accordions.forEach((accordion: any) => {
      if (accordion.items && Array.isArray(accordion.items)) {
        accordion.items.forEach((item: any) => {
          if (item) {
            steps.push({ 
              ...item, 
              category: accordion.title || 'Sem categoria' 
            });
          }
        });
      }
    });
    
    return steps;
  };

  // Interface para o item do passo atual
  interface CurrentStepItem {
    id: string;
    title: string;
    category: string;
    subItems: SubItem[];
    isExpanded?: boolean;
    completed?: boolean;
    [key: string]: any;
  }

  // Atualiza os passos sempre que os detalhes do projeto mudarem
  useEffect(() => {
    if (projectDetails) {
      try {
        const newSteps = getProjectSteps();
        setProjectSteps(newSteps);
        
        // Reseta para o primeiro passo se o passo atual for inválido
        if (newSteps.length > 0 && (currentStep >= newSteps.length || currentStep < 0)) {
          setCurrentStep(0);
        }
      } catch (error) {
        console.error('Erro ao carregar passos do projeto:', error);
        setProjectSteps([]);
        setCurrentStep(0);
      }
    } else {
      setProjectSteps([]);
      setCurrentStep(0);
    }
  }, [projectDetails, currentStep]);

  const totalSteps = projectSteps.length;
  const currentItem: CurrentStepItem | null = projectSteps[currentStep] || null;

  // Função para navegar para o próximo passo
  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => {
        const nextStep = prev + 1;
        return nextStep < totalSteps ? nextStep : prev;
      });
    }
  };

  // Função para navegar para o passo anterior
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => Math.max(0, prev - 1));
    }
  };
  
  // Função para verificar se o passo atual é válido
  const isValidStep = (step: number): boolean => {
    return step >= 0 && step < totalSteps;
  };

  // Estado de carregamento e erros
  const [error, setError] = useState<string | null>(null);

  // Efeito para limpar erros quando os detalhes do projeto forem carregados
  useEffect(() => {
    if (projectDetails) {
      setError(null);
    }
  }, [projectDetails]);

  // Renderização de carregamento
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-10">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-600">Carregando projeto...</span>
        </div>
      </div>
    );
  }

  // Renderização de erro
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-lg font-medium text-gray-900">Ocorreu um erro</h2>
        <p className="text-sm text-gray-600 text-center max-w-md">{error}</p>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="mt-2"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  // Renderização quando não há projeto
  if (!projectDetails) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 space-y-4">
        <FileX className="w-12 h-12 text-gray-400" />
        <h2 className="text-lg font-medium text-gray-900">Projeto não encontrado</h2>
        <p className="text-sm text-gray-600">O projeto solicitado não pôde ser carregado.</p>
        <Button 
          variant="outline" 
          onClick={() => navigate('/projetos')}
          className="mt-2"
        >
          Voltar para a lista de projetos
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/projetos")}
        className="flex items-center space-x-1 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Voltar</span>
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex-1 truncate pr-4">
          {projectDetails.nome}
        </h1>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(projectDetails.status)}`}>
          {projectDetails.status}
        </span>
      </div>

      {/* Progress */}
      <div>
        <p className="text-sm mb-1 text-gray-600">Progresso geral</p>
        <Progress value={projectDetails.progresso} />
        <p className="text-xs text-right mt-1 text-gray-500">
          {projectDetails.progresso}% concluído
        </p>
      </div>

      {/* Step Counter - Mostra apenas o passo atual e o total */}
      {projectSteps.length > 0 && (
        <div className="flex flex-col items-center justify-center py-4">
          <div className="flex items-center justify-center mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium shadow-lg">
              {currentStep + 1}
            </div>
          </div>
          <p className="text-sm font-medium text-gray-700">
            Passo {currentStep + 1} de {projectSteps.length}
          </p>
          <p className="text-xs text-gray-500 mt-1 text-center max-w-xs truncate" title={currentItem?.title}>
            {currentItem?.title || 'Sem título'}
          </p>
        </div>
      )}

    {/* Current Step Content */}
    {currentItem && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>{currentItem.title}</span>
            <Badge variant="secondary" className="uppercase">
              {currentItem.category}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentItem.subItems && currentItem.subItems.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {currentItem.subItems.map((sub: SubItem, idx: number) => (
                <AccordionItem key={sub.id} value={sub.id}>
                  <AccordionTrigger>
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">{sub.title}</span>
                      {sub.completed && <CheckCircle size={16} className="text-green-500" />}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 text-sm text-gray-600">
                    {sub.description && <p>{sub.description}</p>}
                    {sub.currentSituation && (
                      <p>
                        <span className="font-medium">Situação atual: </span>
                        {sub.currentSituation}
                      </p>
                    )}
                    {sub.evaluation && (
                      <p>
                        <span className="font-medium">Avaliação: </span>
                        {sub.evaluation.toUpperCase()}
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-sm text-gray-500">Nenhum subitem encontrado.</p>
          )}
        </CardContent>
      </Card>
    )}

      {/* Navigation Buttons */}
      {totalSteps > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center space-x-2"
          >
            <ArrowLeft size={16} />
            <span>Anterior</span>
          </Button>

          <p className="text-sm text-gray-500">
            Passo {currentStep + 1} de {totalSteps}
          </p>

          <Button
            onClick={nextStep}
            disabled={currentStep === totalSteps - 1}
            className="flex items-center space-x-2"
          >
            <span>Próximo</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminProjectView;