import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [steps, setSteps] = useState<any[]>([]);
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
      if (project.customAccordions && project.customAccordions.length > 0) {
        const projectSteps = createStepsFromAccordions(project.customAccordions);
        setSteps(projectSteps);
        setCurrentStep(0);
      }
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

  const createStepsFromAccordions = (accordions: any[]) => {
    const steps: any[] = [];
    accordions.forEach((accordion: any) => {
      accordion.items.forEach((item: any) => {
        steps.push({ ...item, category: accordion.title });
      });
    });
    return steps;
  };

  const totalSteps = steps.length;
  const currentItem: any = steps[currentStep] || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-10">
        <span className="text-sm text-gray-500">Carregando projeto...</span>
      </div>
    );
  }

  if (!projectDetails) {
    return (
      <div className="flex items-center justify-center h-full p-10">
        <span className="text-sm text-gray-500">Projeto não encontrado.</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
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

      {/* Step Indicators */}
      {totalSteps > 0 && (
        <div className="flex items-center justify-center space-x-8 py-4 border-b border-gray-100">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                    index === currentStep
                      ? 'bg-blue-600 text-white shadow-lg'
                      : index < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {index < currentStep ? (
                    <span className="text-xs">✓</span>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                {index < totalSteps - 1 && (
                  <div
                    className={`w-16 h-0.5 ml-2 transition-all duration-200 ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
              <div className="mt-2 text-center w-24 truncate">
                <p
                  className={`text-xs font-medium transition-all duration-200 ${
                    index === currentStep
                      ? 'text-blue-600'
                      : index < currentStep
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                  {step.category}
                </p>
              </div>
            </div>
          ))}
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
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
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
            onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
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