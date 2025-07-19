import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, ArrowRight } from "lucide-react";

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

const ClientProjectView = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { userData } = useAuthContext();

  const [projectDetails, setProjectDetails] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<any[]>([]);

  /* ----------------------- helpers ----------------------- */
  const createStepsFromAccordions = (accordions: any[]) => {
    const s: any[] = [];
    let idx = 1;
    accordions.forEach((acc) => {
      acc.items.forEach((it: any) => {
        it.subItems.forEach((sub: any) => {
          if (sub.evaluation === "nc" || sub.evaluation === "r") {
            s.push({
              id: `${acc.id}_${it.id}_${sub.id}`,
              stepNumber: idx,
              title: sub.title,
              category: it.category,
              status: sub.adequacyReported ? "completed" : "pending",
              ...sub,
            });
            idx++;
          }
        });
      });
    });
    return s;
  };

  const calculateOverallProgress = () => {
    if (steps.length === 0) return projectDetails?.progresso || 0;
    const completed = steps.filter((s) => s.status === "completed").length;
    return Math.round((completed / steps.length) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Concluído":
        return "bg-green-100 text-green-800";
      case "Em Andamento":
        return "bg-blue-100 text-blue-800";
      case "Aguardando Documentos":
        return "bg-yellow-100 text-yellow-800";
      case "Em Revisão":
        return "bg-purple-100 text-purple-800";
      case "Pendente":
        return "bg-gray-100 text-gray-800";
      case "Iniciado":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  /* ----------------------- data ----------------------- */
  const loadProject = async () => {
    if (!userData?.uid || !projectId) return;
    try {
      setLoading(true);
      const ref = doc(db, "projetos", projectId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        toast.error("Projeto não encontrado");
        navigate("/client-projects");
        return;
      }
      const pData = snap.data();
      // ensure belongs to user
      if (pData.cliente?.id !== userData.uid) {
        toast.error("Projeto não pertence ao usuário");
        navigate("/client-projects");
        return;
      }
      const project: ProjectDetail = {
        id: snap.id,
        nome: pData.nome,
        status: pData.status,
        progresso: pData.progresso || 0,
        dataInicio: pData.dataInicio,
        previsaoConclusao: pData.previsaoConclusao,
        consultor: pData.consultor,
        cliente: pData.cliente,
        observacoes: pData.observacoes,
        customAccordions: pData.customAccordions || [],
        itens: pData.itens || [],
      };
      setProjectDetails(project);
      if (project.customAccordions && project.customAccordions.length > 0) {
        const s = createStepsFromAccordions(project.customAccordions);
        setSteps(s);
        setCurrentStep(0);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar projeto");
      navigate("/client-projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userData) return;
    if (userData.type !== "client") {
      navigate("/dashboard");
      return;
    }
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData, projectId]);

  /* ----------------------- navigation ----------------------- */
  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };
  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  /* ----------------------- render ----------------------- */
  if (loading || !projectDetails) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-versys-primary" />
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/client-projects")}>Voltar</Button>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-2">{projectDetails.nome}</h1>
          <p className="text-gray-600 text-sm">Nenhuma adequação necessária no momento.</p>
        </div>
      </div>
    );
  }

  const current = steps[currentStep];

  const overallProgress = calculateOverallProgress();

  return (
    <div className="p-6 space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/client-projects")}
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
        <Progress value={overallProgress} />
        <p className="text-xs text-right mt-1 text-gray-500">
          {overallProgress}% concluído
        </p>
      </div>

      {/* Step Counter - Mostra apenas o passo atual e o total */}
      {steps.length > 0 && (
        <div className="flex flex-col items-center justify-center py-4 border-b border-gray-100">
          <div className="flex items-center justify-center mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium shadow-lg">
              {currentStep + 1}
            </div>
          </div>
          <p className="text-sm font-medium text-gray-700">
            Passo {currentStep + 1} de {steps.length}
          </p>
          <p className="text-xs text-gray-500 mt-1 text-center max-w-xs truncate" title={current?.title}>
            {current?.title || 'Sem título'}
          </p>
        </div>
      )}

      {/* Current Step Content */}
      {current && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>{current.title}</span>
              <Badge variant="secondary" className="uppercase">
                {current.category}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* TODO: adequação form / details */}
            <p className="text-sm text-gray-600">Conteúdo do passo será implementado aqui.</p>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      {steps.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={handlePrevStep}
            disabled={currentStep === 0}
            className="flex items-center space-x-2"
          >
            <ArrowLeft size={16} />
            <span>Anterior</span>
          </Button>

          <p className="text-sm text-gray-500">
            Passo {currentStep + 1} de {steps.length}
          </p>

          <Button
            onClick={handleNextStep}
            disabled={currentStep === steps.length - 1}
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

export default ClientProjectView;
