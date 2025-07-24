import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ArrowLeft, ArrowRight, CheckCircle, Camera } from "lucide-react";
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

const ProjectWrite = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [projectDetails, setProjectDetails] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [projectSteps, setProjectSteps] = useState<ProjectItem[]>([]);
  const [formState, setFormState] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState<Record<string, boolean>>({});
  const [photoPreview, setPhotoPreview] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) {
      // Verificar se o usuário é cliente ou admin para redirecionar corretamente
      const isClient = window.location.pathname.includes('/client-projects');
      navigate(isClient ? "/client-projects" : "/projetos");
      return;
    }
    loadProject();
    // eslint-disable-next-line
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const projectRef = doc(db, 'projetos', id!);
      const projectDoc = await getDoc(projectRef);
      if (!projectDoc.exists()) {
        toast.error('Projeto não encontrado');
        // Verificar se o usuário é cliente ou admin para redirecionar corretamente
        const isClient = window.location.pathname.includes('/client-projects');
        navigate(isClient ? "/client-projects" : "/projetos");
        return;
      }
      const projectData = projectDoc.data();
      const accordions = projectData.customAccordions || [];
      const steps: ProjectItem[] = [];
      accordions.forEach((accordion: any) => {
        if (accordion.items && Array.isArray(accordion.items)) {
          accordion.items.forEach((item: any) => {
            steps.push({ ...item, category: accordion.title || 'Sem categoria' });
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
        customAccordions: accordions,
        itens: projectData.itens || []
      });
      setProjectSteps(steps);
      // Inicializa o estado do formulário
      const initialForm: Record<string, any> = {};
      steps.forEach((item) => {
        item.subItems.forEach((sub) => {
          initialForm[sub.id] = {
            evaluation: sub.evaluation || '',
            currentSituation: sub.currentSituation || '',
            clientGuidance: sub.clientGuidance || '',
            photoData: sub.photoData || null
          };
        });
      });
      setFormState(initialForm);
    } catch (error) {
      toast.error('Erro ao carregar projeto');
      navigate("/projetos");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (subId: string, field: string, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [subId]: {
        ...prev[subId],
        [field]: value
      }
    }));
  };

  const handlePhoto = async (subId: string, file: File) => {
    if (!projectDetails) return;
    setPhotoUploading(prev => ({ ...prev, [subId]: true }));
    try {
      // Captura localização
      const getLocation = () => new Promise<{ latitude: number, longitude: number }>((resolve, reject) => {
        if (!navigator.geolocation) return resolve({ latitude: 0, longitude: 0 });
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve({ latitude: 0, longitude: 0 })
        );
      });
      const { latitude, longitude } = await getLocation();
      // Upload para o Storage
      const storage = getStorage();
      const storageRef = ref(storage, `projetos/${projectDetails.id}/subitens/${subId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const createdAt = new Date().toISOString();
      // Atualiza o estado local
      setFormState(prev => ({
        ...prev,
        [subId]: {
          ...prev[subId],
          photoData: { url, createdAt, latitude, longitude }
        }
      }));
      setPhotoPreview(prev => ({ ...prev, [subId]: url }));
      toast.success('Foto enviada com sucesso!');
    } catch (err) {
      toast.error('Erro ao enviar foto');
    } finally {
      setPhotoUploading(prev => ({ ...prev, [subId]: false }));
    }
  };

  const handleSave = async () => {
    if (!projectDetails) return;
    setSaving(true);
    try {
      // Atualiza os subitens no Firestore
      const updatedAccordions = (projectDetails.customAccordions || []).map((accordion) => ({
        ...accordion,
        items: accordion.items.map((item) => ({
          ...item,
          subItems: item.subItems.map((sub) => ({
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
      toast.success('Formulário salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar formulário');
    } finally {
      setSaving(false);
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
        <Button variant="outline" onClick={() => {
          // Verificar se o usuário é cliente ou admin para redirecionar corretamente
          const isClient = window.location.pathname.includes('/client-projects');
          navigate(isClient ? "/client-projects" : "/projetos");
        }} className="mt-2">
          Voltar para a lista de projetos
        </Button>
      </div>
    );
  }

  const totalSteps = projectSteps.length;
  const currentItem = projectSteps[currentStep];

  return (
    <div className="p-6 space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          // Verificar se o usuário é cliente ou admin para redirecionar corretamente
          const isClient = window.location.pathname.includes('/client-projects');
          navigate(isClient ? "/client-projects" : "/projetos");
        }}
        className="flex items-center space-x-1 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Voltar</span>
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex-1 truncate pr-4">
          {projectDetails.nome}
        </h1>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          {projectDetails.status}
        </span>
      </div>

      <div>
        <p className="text-sm mb-1 text-gray-600">Progresso geral</p>
        <Progress value={projectDetails.progresso} />
        <p className="text-xs text-right mt-1 text-gray-500">
          {projectDetails.progresso}% concluído
        </p>
      </div>

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

export default ProjectWrite; 