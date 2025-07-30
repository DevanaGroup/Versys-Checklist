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
  changesDescription?: string; // O que foi alterado pelo cliente
  treatmentDeadline?: string; // Prazo para tratar
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

const ProjectView = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [projectDetails, setProjectDetails] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [projectSteps, setProjectSteps] = useState<ProjectItem[]>([]);

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const projectRef = doc(db, 'projetos', id!);
      const projectDoc = await getDoc(projectRef);
      
      if (!projectDoc.exists()) {
        toast.error('Projeto não encontrado');
        navigate("/projetos");
        return;
      }

      const projectData = projectDoc.data();
      console.log('=== DADOS COMPLETOS DO PROJETO ===');
      console.log('Project data:', projectData);
      console.log('Custom accordions:', projectData.customAccordions);
      
      const accordions = projectData.customAccordions || [];
      const steps: ProjectItem[] = [];

      // Converter accordions para steps para navegação
      accordions.forEach((accordion: any) => {
        if (accordion.items && Array.isArray(accordion.items)) {
          accordion.items.forEach((item: any) => {
            // Converter subItems corretamente
            const convertedSubItems = item.subItems ? item.subItems.map((subItem: any) => ({
              id: subItem.id,
              title: subItem.title,
              evaluation: subItem.evaluation || '',
              currentSituation: subItem.currentSituation || '',
              clientGuidance: subItem.clientGuidance || subItem.adminFeedback || '',
              photos: subItem.photoData ? [{
                id: `photo-${Date.now()}`,
                url: subItem.photoData.url,
                createdAt: subItem.photoData.createdAt,
                latitude: subItem.photoData.latitude,
                longitude: subItem.photoData.longitude
              }] : (subItem.photos || []),
              completed: subItem.completed || false
            })) : [];
            
            steps.push({ 
              ...item, 
              category: accordion.title || 'Sem categoria',
              subItems: convertedSubItems
            });
          });
        }
      });

      setProjectDetails({
        id: projectDoc.id,
        nome: projectData.nome,
        status: projectData.status || 'Iniciado',
        progresso: projectData.progresso || 0,
        dataInicio: projectData.dataInicio,
        previsaoConclusao: projectData.previsaoConclusao,
        consultor: projectData.consultor || 'Não definido',
        cliente: projectData.cliente,
        observacoes: projectData.observacoes || '',
        customAccordions: accordions
      });

      setProjectSteps(steps);
    } catch (error) {
      console.error('Erro ao carregar projeto:', error);
      toast.error('Erro ao carregar projeto');
      navigate("/projetos");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'concluído':
        return 'bg-green-100 text-green-800';
      case 'em andamento':
        return 'bg-blue-100 text-blue-800';
      case 'iniciado':
        return 'bg-purple-100 text-purple-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEvaluationIcon = (evaluation: string) => {
    switch (evaluation) {
      case 'nc':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'r':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'na':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getEvaluationText = (evaluation: string) => {
    switch (evaluation) {
      case 'nc':
        return 'Não Conforme';
      case 'r':
        return 'Recomendação';
      case 'na':
        return 'Não Aplicável';
      default:
        return 'Não Avaliado';
    }
  };

  const totalSteps = projectSteps.length;
  const currentStepData = projectSteps[currentStep];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando projeto...</p>
        </div>
      </div>
    );
  }

  if (!projectDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Projeto não encontrado</p>
          <Button onClick={() => navigate("/projetos")} className="mt-4">
            Voltar aos Projetos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* Layout Desktop */}
      <div className="hidden md:flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/projetos")}
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
        
        <Button
          onClick={() => navigate(`/projetos/edit/${id}?clienteId=${projectDetails.cliente?.id || ''}`)}
          className="flex items-center space-x-2"
        >
          <Edit size={16} />
          <span>Editar Projeto</span>
        </Button>
      </div>

      {/* Layout Mobile */}
      <div className="md:hidden space-y-4">
        {/* Título Centralizado */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 break-words">{projectDetails.nome}</h1>
          <Badge className={`mt-2 ${getStatusColor(projectDetails.status)}`}>
            {projectDetails.status}
          </Badge>
        </div>

        {/* Botões na mesma linha */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/projetos")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </Button>
          
          <Button
            onClick={() => navigate(`/projetos/edit/${id}?clienteId=${projectDetails.cliente?.id || ''}`)}
            className="flex items-center space-x-2"
          >
            <Edit size={16} />
          </Button>
        </div>
      </div>

      {/* Progresso do Projeto */}
      {/* Desktop */}
      <div className="hidden md:block">
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
      </div>

      {/* Mobile - Progresso Simplificado */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600">Progresso Geral</span>
          <span className="text-sm font-medium text-gray-900">{projectDetails.progresso}% concluído</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${projectDetails.progresso}%` }}
          />
        </div>
      </div>

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

export default ProjectView;
