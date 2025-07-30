import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, ArrowRight, Edit, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface SubItem {
  id: string;
  title: string;
  evaluation: "nc" | "r" | "na" | "";
  currentSituation?: string;
  clientGuidance?: string;
  photos?: {
    id: string;
    url: string;
    createdAt: string;
    latitude: number;
    longitude: number;
  }[];
  completed?: boolean;
}

interface ProjectItem {
  id: string;
  title: string;
  category: string;
  subItems: SubItem[];
  isExpanded?: boolean;
  completed?: boolean;
}

interface ProjectDetail {
  id: string;
  nome: string;
  status: string;
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
}

const ClientProjectView = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [projectDetails, setProjectDetails] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [projectSteps, setProjectSteps] = useState<ProjectItem[]>([]);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const projectRef = doc(db, 'projetos', projectId!);
      const projectDoc = await getDoc(projectRef);
      
      if (!projectDoc.exists()) {
        toast.error('Projeto não encontrado');
        navigate("/client-projects");
        return;
      }

      const projectData = projectDoc.data();
      
      const accordions = projectData.customAccordions || [];
      const steps: ProjectItem[] = [];

      // Converter accordions para steps para navegação
      accordions.forEach((accordion: any) => {
        if (accordion.items && Array.isArray(accordion.items)) {
          accordion.items.forEach((item: any) => {
            // Converter subItems corretamente
            const convertedSubItems = item.subItems ? item.subItems.map((subItem: any) => {
              const converted = {
                id: subItem.id,
                title: subItem.title,
                evaluation: subItem.evaluation || '',
                currentSituation: subItem.currentSituation || '',
                clientGuidance: subItem.clientGuidance || subItem.adminFeedback || '', // Buscar ambos os campos
                photos: Array.isArray(subItem.photos) 
                  ? subItem.photos.map(photo => typeof photo === 'string' ? photo : (photo as any)?.url || '')
                  : [],
                completed: subItem.completed || false
              };
              
              return converted;
            }) : [];

            steps.push({
              id: item.id || `step-${Date.now()}`,
              title: item.title,
              category: item.category || accordion.title,
              subItems: convertedSubItems,
              isExpanded: false,
              completed: false
            });
          });
        }
      });
      
      setProjectSteps(steps);
      
      // Usar o progresso salvo no projeto ou calcular baseado nos accordions
      const calculatedProgress = projectData.progresso || calculateProgress(accordions);
      
      const projectDetail: ProjectDetail = {
        id: projectDoc.id,
        nome: projectData.nome || 'Projeto sem nome',
        status: projectData.status || 'Iniciado',
        progresso: calculatedProgress, // SEMPRE usar o cálculo, nunca o valor salvo
        dataInicio: projectData.dataInicio || projectData.createdAt || new Date().toISOString(),
        previsaoConclusao: projectData.previsaoConclusao,
        consultor: projectData.consultor || 'Não definido',
        cliente: projectData.cliente,
        observacoes: projectData.observacoes || '',
        customAccordions: accordions
      };

      setProjectDetails(projectDetail);
      
    } catch (error) {
      console.error('Erro ao carregar projeto:', error);
      toast.error('Erro ao carregar projeto');
      navigate("/client-projects");
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (accordions: any[]): number => {
    if (!accordions || accordions.length === 0) return 0;
    
    // Agora o progresso é calculado baseado nos itens concluídos pelo cliente
    let totalItems = 0;
    let completedItems = 0;
    
    accordions.forEach((accordion, accordionIndex) => {
      if (accordion.items) {
        accordion.items.forEach((item: any, itemIndex: number) => {
          if (item.subItems) {
            item.subItems.forEach((subItem: any, subIndex: number) => {
              totalItems++;
              // Conta como progresso se o item foi marcado como concluído
              if (subItem.status === 'completed' || subItem.completed === true) {
                completedItems++;
              }
            });
          }
        });
      }
    });
    
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    
    return progress;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Concluído": return "bg-green-100 text-green-800";
      case "Em Andamento": return "bg-blue-100 text-blue-800";
      case "Aguardando Documentos": return "bg-yellow-100 text-yellow-800";
      case "Em Revisão": return "bg-purple-100 text-purple-800";
      case "Iniciado": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getEvaluationIcon = (evaluation: string) => {
    switch (evaluation) {
      case "nc": return <XCircle className="h-5 w-5 text-red-500" />;
      case "r": return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "na": return <CheckCircle className="h-5 w-5 text-green-500" />;
      default: return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getEvaluationText = (evaluation: string) => {
    switch (evaluation) {
      case "nc": return "Não Conforme";
      case "r": return "Requer Atenção";
      case "na": return "Não Aplicável";
      default: return "Não Avaliado";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-versys-primary"></div>
      </div>
    );
  }

  if (!projectDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Projeto não encontrado</p>
          <Button onClick={() => navigate("/client-projects")} className="mt-4">
            Voltar aos Projetos
        </Button>
        </div>
      </div>
    );
  }

  const totalSteps = projectSteps.length;
  const currentStepData = projectSteps[currentStep];

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/client-projects")}
            className="flex items-center space-x-2"
      >
            <ArrowLeft size={16} />
        <span>Voltar</span>
      </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{projectDetails.nome}</h1>
            <Badge className={getStatusColor(projectDetails.status)}>
            {projectDetails.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Progresso do Projeto */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div>
            <p className="text-sm text-gray-500 mb-2">Progresso Geral</p>
            <div className="flex items-center space-x-3">
              <Progress value={projectDetails.progresso} className="flex-1" />
              <span className="text-sm font-medium">{projectDetails.progresso}% concluído</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navegação por Steps */}
      {totalSteps > 0 && (
        <>
          {/* Indicador de Progresso */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-2">
              <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
              {currentStep + 1}
              </div>
              <div className="text-sm text-gray-600">
                Passo {currentStep + 1} de {totalSteps}
              </div>
            </div>
          </div>

          {/* Título do Step Atual */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {currentStepData.title}
            </h2>
            <Badge variant="outline" className="text-xs">
              {currentStepData.category}
            </Badge>
        </div>

          {/* Conteúdo do Step */}
          <Card className="mb-6">
            <CardContent className="p-6">
              {currentStepData.subItems && currentStepData.subItems.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                  {currentStepData.subItems.map((subItem, index) => (
                    <AccordionItem key={subItem.id} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                      <div className="flex items-center space-x-3">
                          {getEvaluationIcon(subItem.evaluation)}
                          <span className="font-medium">{subItem.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {getEvaluationText(subItem.evaluation)}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4">
                          {/* Situação Atual */}
                          {subItem.currentSituation && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Situação Atual</h4>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm text-gray-700">{subItem.currentSituation}</p>
                              </div>
                                </div>
                              )}
                              
                          {/* Orientação para o Cliente */}
                          {subItem.clientGuidance && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Orientação para o Cliente</h4>
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="text-sm text-gray-700">{subItem.clientGuidance}</p>
                                  </div>
                                </div>
                              )}
                              
                          {/* Fotos */}
                          {subItem.photos && subItem.photos.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">📸 Fotos</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {subItem.photos.map((photo) => (
                                  <div key={photo.id} className="bg-gray-50 p-2 rounded-lg">
                                    <img
                                      src={photo.url}
                                      alt="Foto do local"
                                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                                      onClick={() => window.open(photo.url, '_blank')}
                                    />
                                    <div className="text-xs text-gray-500 mt-2 space-y-1">
                                      <p>📅 Capturada em: {new Date(photo.createdAt).toLocaleString('pt-BR')}</p>
                                      {photo.latitude && photo.longitude && 
                                       photo.latitude !== 0 && photo.longitude !== 0 && (
                                    <div>
                                          <p>📍 Localização: {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}</p>
                                          <a 
                                            href={`https://www.google.com/maps?q=${photo.latitude},${photo.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 underline text-xs"
                                          >
                                            🗺️ Ver no Google Maps
                                          </a>
                                    </div>
                                  )}
                                      {(!photo.latitude || !photo.longitude || 
                                        (photo.latitude === 0 && photo.longitude === 0)) && (
                                          <p className="text-orange-600 text-xs">⚠️ Foto sem localização GPS</p>
                                      )}
                                    </div>
                                      </div>
                                    ))}
                              </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum item encontrado para este passo.</p>
                </div>
            )}
          </CardContent>
        </Card>

          {/* Navegação */}
          <div className="flex items-center justify-between">
          <Button
            variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="flex items-center space-x-2"
          >
            <ArrowLeft size={16} />
            <span>Anterior</span>
          </Button>

          <div className="text-sm text-gray-500">
              Visualização - Somente Leitura
          </div>

          <Button
              onClick={() => setCurrentStep(prev => Math.min(totalSteps - 1, prev + 1))}
              disabled={currentStep === totalSteps - 1}
            className="flex items-center space-x-2"
          >
            <span>Próximo</span>
            <ArrowRight size={16} />
          </Button>
        </div>
        </>
      )}

      {/* Observações */}
      {projectDetails.observacoes && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{projectDetails.observacoes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientProjectView;
