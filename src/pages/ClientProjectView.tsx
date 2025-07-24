import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, ArrowRight, PlayCircle, Globe, CheckCircle, Camera } from "lucide-react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface SubItem {
  id: string;
  title: string;
  evaluation: "nc" | "r" | "na" | "";
  currentSituation?: string;
  clientGuidance?: string;
  completed?: boolean;
  photoData?: {
    url: string;
    createdAt: string;
    latitude: number;
    longitude: number;
  };
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
  itens?: ProjectItem[];
}

const ClientProjectView = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { userData } = useAuthContext();

  const [projectDetails, setProjectDetails] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [projectSteps, setProjectSteps] = useState<ProjectItem[]>([]);
  const [formState, setFormState] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState<Record<string, boolean>>({});
  const [photoPreview, setPhotoPreview] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!projectId) {
      navigate("/client-projects");
      return;
    }
    loadProject();
    // eslint-disable-next-line
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
      accordions.forEach((accordion: any) => {
        if (accordion.items && Array.isArray(accordion.items)) {
          accordion.items.forEach((item: any) => {
            steps.push({
              id: item.id,
              title: item.title,
              category: item.category,
              subItems: item.subItems || [],
              isExpanded: false,
              completed: false
            });
          });
        }
      });
      
      const project = {
        id: projectDoc.id,
        nome: projectData.nome || 'Projeto sem nome',
        status: projectData.status || 'Iniciado',
        progresso: projectData.progresso || 0,
        dataInicio: projectData.dataInicio || projectData.criadoEm?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        previsaoConclusao: projectData.previsaoConclusao,
        consultor: projectData.consultor || 'Não definido',
        cliente: projectData.cliente || null,
        observacoes: projectData.observacoes || '',
        customAccordions: accordions,
        itens: projectData.itens || []
      };
      
      setProjectDetails(project);
      setProjectSteps(steps);
      
      // Inicializar formState com dados existentes
      const initialState: Record<string, any> = {};
      steps.forEach(step => {
        step.subItems.forEach(sub => {
          initialState[sub.id] = {
            evaluation: sub.evaluation || '',
            currentSituation: sub.currentSituation || '',
            clientGuidance: sub.clientGuidance || '',
            photoData: sub.photoData || null
          };
        });
      });
      setFormState(initialState);
    } catch (error) {
      console.error('Erro ao carregar projeto:', error);
      toast.error('Erro ao carregar projeto');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (subId: string, field: string, value: any) => {
    setFormState(prev => ({
      ...prev,
      [subId]: {
        ...prev[subId],
        [field]: value
      }
    }));
  };

  const handlePhoto = async (subId: string, file: File) => {
    try {
      setPhotoUploading(prev => ({ ...prev, [subId]: true }));
      
      const getLocation = () => new Promise<{ latitude: number, longitude: number }>((resolve, reject) => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              });
            },
            (error) => {
              console.error('Erro ao obter localização:', error);
              reject(error);
            }
          );
        } else {
          reject(new Error('Geolocalização não suportada'));
        }
      });

      const location = await getLocation();
      const storage = getStorage();
      const fileName = `${projectId}_${subId}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `project-photos/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      const photoData = {
        url: downloadURL,
        createdAt: new Date().toISOString(),
        latitude: location.latitude,
        longitude: location.longitude
      };
      
      handleChange(subId, 'photoData', photoData);
      toast.success('Foto enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar foto:', error);
      toast.error('Erro ao enviar foto');
    } finally {
      setPhotoUploading(prev => ({ ...prev, [subId]: false }));
    }
  };

  const handleSave = async () => {
    if (!projectDetails) return;
    
    try {
      setSaving(true);
      
      const updatedAccordions = projectDetails.customAccordions?.map(accordion => ({
        ...accordion,
        items: accordion.items.map(item => ({
          ...item,
          subItems: item.subItems.map(sub => ({
            ...sub,
            evaluation: formState[sub.id]?.evaluation || '',
            currentSituation: formState[sub.id]?.currentSituation || '',
            clientGuidance: formState[sub.id]?.clientGuidance || '',
            photoData: formState[sub.id]?.photoData || sub.photoData || null
          }))
        }))
      }));
      
      await updateDoc(doc(db, 'projetos', projectDetails.id), {
        customAccordions: updatedAccordions
      });
      
      setProjectDetails(prev => prev ? { ...prev, customAccordions: updatedAccordions } : null);
      toast.success('Formulário salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
      toast.error('Erro ao salvar formulário');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Iniciado":
        return "bg-blue-100 text-blue-800";
      case "Em Andamento":
        return "bg-yellow-100 text-yellow-800";
      case "Aguardando Documentos":
        return "bg-orange-100 text-orange-800";
      case "Em Revisão":
        return "bg-purple-100 text-purple-800";
      case "Concluído":
        return "bg-green-100 text-green-800";
      case "Pendente":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-10">
        <span className="text-sm text-gray-600">Carregando projeto...</span>
      </div>
    );
  }

  if (!projectDetails) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 space-y-4">
        <span className="text-lg font-medium text-gray-900">Projeto não encontrado</span>
        <Button variant="outline" onClick={() => navigate('/client-projects')} className="mt-2">
          Voltar para a lista de projetos
        </Button>
      </div>
    );
  }

  const totalSteps = projectSteps.length;
  const currentItem = projectSteps[currentStep];

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
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(projectDetails.status)}`}>
            {projectDetails.status}
          </span>
          
          {/* Botões de ação */}
          <div className="flex items-center space-x-2 ml-4">
            {/* Botão de visualizar mapa */}
            <Button
              variant="outline"
              size="sm"
              title="Visualizar locais no mapa"
              onClick={() => navigate(`/client-projects/map/${projectDetails.id}`)}
              className="flex items-center space-x-2"
            >
              <Globe className="h-4 w-4 text-blue-600" />
              <span>Mapa</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div>
        <p className="text-sm mb-1 text-gray-600">Progresso geral</p>
        <Progress value={projectDetails.progresso} />
        <p className="text-xs text-right mt-1 text-gray-500">
          {projectDetails.progresso}% concluído
        </p>
      </div>

      {/* Step Counter */}
      {totalSteps > 0 && (
        <div className="flex flex-col items-center justify-center py-4">
          <div className="flex items-center justify-center mb-2">
            <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-medium shadow-lg">
              {currentStep + 1}
            </div>
          </div>
          <p className="text-sm font-medium text-gray-700">
            Passo {currentStep + 1} de {totalSteps}
          </p>
          <p className="text-xs text-gray-500 mt-1 text-center max-w-xs truncate" title={currentItem?.title}>
            {currentItem?.title || 'Sem título'}
          </p>
        </div>
      )}

      {/* Conteúdo do passo atual */}
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
                {currentItem.subItems.map((sub: SubItem) => (
                  <AccordionItem key={sub.id} value={sub.id}>
                    <AccordionTrigger>
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">{sub.title}</span>
                        {formState[sub.id]?.evaluation === 'na' && <CheckCircle size={16} className="text-green-500" />}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Avaliação</Label>
                        <RadioGroup
                          value={formState[sub.id]?.evaluation || ''}
                          onValueChange={val => handleChange(sub.id, 'evaluation', val)}
                          className="flex flex-row space-x-4"
                        >
                          <RadioGroupItem value="nc" id={`nc-${sub.id}`} />
                          <Label htmlFor={`nc-${sub.id}`}>NC</Label>
                          <RadioGroupItem value="r" id={`r-${sub.id}`} />
                          <Label htmlFor={`r-${sub.id}`}>R</Label>
                          <RadioGroupItem value="na" id={`na-${sub.id}`} />
                          <Label htmlFor={`na-${sub.id}`}>NA</Label>
                        </RadioGroup>
                      </div>
                      <div className="space-y-2">
                        <Label>Situação atual</Label>
                        <Textarea
                          value={formState[sub.id]?.currentSituation || ''}
                          onChange={e => handleChange(sub.id, 'currentSituation', e.target.value)}
                          placeholder="Situação atual..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Orientação para o cliente</Label>
                        <Textarea
                          value={formState[sub.id]?.clientGuidance || ''}
                          onChange={e => handleChange(sub.id, 'clientGuidance', e.target.value)}
                          placeholder="Orientação para o cliente..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Foto (opcional)</Label>
                        <div
                          className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition hover:border-purple-400 bg-gray-50 relative ${photoUploading[sub.id] ? 'opacity-60 pointer-events-none' : ''}`}
                          style={{ minHeight: 120 }}
                          onClick={() => {
                            if (!photoUploading[sub.id]) {
                              document.getElementById(`file-input-${sub.id}`)?.click();
                            }
                          }}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => {
                            e.preventDefault();
                            if (photoUploading[sub.id]) return;
                            const file = e.dataTransfer.files[0];
                            if (file) handlePhoto(sub.id, file);
                          }}
                        >
                          {formState[sub.id]?.photoData?.url ? (
                            <img src={formState[sub.id].photoData.url} alt="Foto do subitem" className="max-h-40 rounded border mb-2" />
                          ) : (
                            <>
                              <Camera className="w-8 h-8 text-purple-400 mb-2" />
                              <span className="text-sm text-gray-600 text-center">Clique ou arraste uma imagem aqui<br/>para tirar/enviar foto</span>
                            </>
                          )}
                          <input
                            id={`file-input-${sub.id}`}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            disabled={photoUploading[sub.id]}
                            onChange={e => {
                              if (e.target.files && e.target.files[0]) {
                                handlePhoto(sub.id, e.target.files[0]);
                              }
                            }}
                          />
                          {photoUploading[sub.id] && <span className="absolute bottom-2 left-0 right-0 text-xs text-center text-gray-500">Enviando foto...</span>}
                        </div>
                        {formState[sub.id]?.photoData?.url && (
                          <div className="text-xs text-gray-500 mt-1">
                            <div>Latitude: {formState[sub.id].photoData.latitude}</div>
                            <div>Longitude: {formState[sub.id].photoData.longitude}</div>
                            <div>Data: {new Date(formState[sub.id].photoData.createdAt).toLocaleString('pt-BR')}</div>
                          </div>
                        )}
                      </div>
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

      {/* Botões de navegação e salvar */}
      {totalSteps > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="flex items-center space-x-2"
          >
            <ArrowLeft size={16} />
            <span>Anterior</span>
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>

          <Button
            onClick={() => setCurrentStep(prev => Math.min(totalSteps - 1, prev + 1))}
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

export default ClientProjectView;
