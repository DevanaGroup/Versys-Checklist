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
import { ArrowLeft, ArrowRight, PlayCircle, Globe, CheckCircle, Camera, ClipboardCheck, ChevronRight, ChevronLeft, Send, Upload, X, Image, Clock, XCircle } from "lucide-react";
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
  // Campos para adequações
  adequacyReported?: boolean;
  adequacyDetails?: string;
  adequacyImages?: string[];
  adequacyDate?: string;
  adequacyStatus?: "pending" | "approved" | "rejected";
  adminRejectionReason?: string;
  adequacyRevisionCount?: number;
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
  
  // Estados para controle de páginas e adequações
  const [currentPage, setCurrentPage] = useState<'view' | 'adequation'>('view');
  const [adequationResponse, setAdequationResponse] = useState('');
  const [adequationImages, setAdequationImages] = useState<File[]>([]);
  const [submittingAdequation, setSubmittingAdequation] = useState(false);
  const [currentSubItemId, setCurrentSubItemId] = useState<string>('');

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
      
      // Inicializar formState com dados existentes - usando customAccordions para obter dados completos
      const initialState: Record<string, any> = {};
      accordions.forEach(accordion => {
        if (accordion.items && Array.isArray(accordion.items)) {
          accordion.items.forEach(item => {
            if (item.subItems && Array.isArray(item.subItems)) {
              item.subItems.forEach(sub => {
                // Validar e limpar dados de adequação existentes
                const adequacyData = validateAndCleanAdequationData({
                  adequacyReported: sub.adequacyReported,
                  adequacyDetails: sub.adequacyDetails,
                  adequacyImages: sub.adequacyImages,
                  adequacyDate: sub.adequacyDate,
                  adequacyStatus: sub.adequacyStatus,
                  adminRejectionReason: sub.adminRejectionReason,
                  adequacyRevisionCount: sub.adequacyRevisionCount
                });

                initialState[sub.id] = {
                  evaluation: sub.evaluation || '',
                  currentSituation: sub.currentSituation || '',
                  clientGuidance: sub.clientGuidance || '',
                  photoData: sub.photoData || null,
                  // Dados de adequação validados
                  ...adequacyData
                };
              });
            }
          });
        }
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

  // Funções para adequações
  const handleAdequationImageUpload = (files: FileList) => {
    const newImages = Array.from(files);
    if (adequationImages.length + newImages.length > 5) {
      toast.error("Máximo de 5 imagens permitido.");
      return;
    }
    setAdequationImages(prev => [...prev, ...newImages]);
  };

  const removeAdequationImage = (index: number) => {
    setAdequationImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleOpenAdequation = (subItemId: string) => {
    setCurrentSubItemId(subItemId);
    const existingAdequation = formState[subItemId];
    if (existingAdequation?.adequacyDetails) {
      setAdequationResponse(existingAdequation.adequacyDetails);
    } else {
      setAdequationResponse('');
    }
    setAdequationImages([]);
    setCurrentPage('adequation');
  };

  // Função para limpar objetos removendo campos undefined e validar dados
  const cleanObjectForFirebase = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(cleanObjectForFirebase).filter(item => item !== null && item !== undefined);
    }
    
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        const cleanedValue = cleanObjectForFirebase(value);
        if (cleanedValue !== null && cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : null;
  };

  // Função para validar e limpar dados de adequação
  const validateAndCleanAdequationData = (data: any) => {
    if (!data || typeof data !== 'object') return {};
    
    const cleaned: any = {
      adequacyReported: Boolean(data.adequacyReported),
      adequacyDetails: String(data.adequacyDetails || ''),
      adequacyImages: Array.isArray(data.adequacyImages) ? data.adequacyImages.filter((img: any) => img && typeof img === 'string') : [],
      adequacyDate: data.adequacyDate ? String(data.adequacyDate) : new Date().toISOString(),
      adequacyStatus: ['pending', 'approved', 'rejected'].includes(data.adequacyStatus) ? data.adequacyStatus : 'pending',
      adequacyRevisionCount: Number(data.adequacyRevisionCount || 0)
    };

    // Só incluir adminRejectionReason se não for undefined/null
    if (data.adminRejectionReason && typeof data.adminRejectionReason === 'string') {
      cleaned.adminRejectionReason = data.adminRejectionReason;
    }

    // Remover campos undefined/null
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined || cleaned[key] === null) {
        delete cleaned[key];
      }
    });

    return cleaned;
  };

  const handleSubmitAdequation = async () => {
    if (!adequationResponse.trim()) {
      toast.error("Por favor, descreva as adequações realizadas.");
      return;
    }

    try {
      setSubmittingAdequation(true);
      
      // Upload imagens para Firebase Storage e obter URLs
      const imageUrls: string[] = [];
      const storage = getStorage();
      
      for (const file of adequationImages) {
        try {
          // Criar referência única para cada imagem
          const timestamp = Date.now();
          const fileName = `adequation_${currentSubItemId}_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop()}`;
          const storageRef = ref(storage, `adequation-images/${fileName}`);
          
          // Upload da imagem
          const snapshot = await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          imageUrls.push(downloadURL);
        } catch (uploadError) {
          console.error('Erro ao fazer upload da imagem:', uploadError);
          toast.error('Erro ao fazer upload de uma das imagens');
          return;
        }
      }

      // Obter o subItem atual
      const currentSubItem = currentItem.subItems.find(sub => sub.id === currentSubItemId);
      if (!currentSubItem) {
        toast.error("Item não encontrado.");
        return;
      }

      // Calcular contador de revisões
      const currentRevisionCount = currentSubItem.adequacyRevisionCount || 0;
      const newRevisionCount = currentSubItem.adequacyStatus === 'rejected' ? currentRevisionCount + 1 : currentRevisionCount;

      // SALVAR NO FIREBASE - SOLUÇÃO DIRETA
      const projectRef = doc(db, 'projetos', projectId!);
      
      // Buscar dados atuais
      const projectDoc = await getDoc(projectRef);
      const projectData = projectDoc.data();
      const accordions = projectData.customAccordions || [];
      
      // Encontrar e atualizar o subItem específico
      let updated = false;
      const updatedAccordions = accordions.map(accordion => {
        return {
          ...accordion,
          items: accordion.items?.map(item => {
            if (item.id === currentItem.id) {
              return {
                ...item,
                subItems: item.subItems?.map(subItem => {
                  if (subItem.id === currentSubItemId) {
                    updated = true;
                    return {
                      ...subItem,
                      adequacyReported: true,
                      adequacyDetails: adequationResponse,
                      adequacyImages: imageUrls,
                      adequacyDate: new Date().toISOString(),
                      adequacyStatus: 'pending',
                      adequacyRevisionCount: newRevisionCount
                    };
                  }
                  return subItem;
                })
              };
            }
            return item;
          })
        };
      });

      if (!updated) {
        toast.error("Item não encontrado.");
        return;
      }

      // Salvar no Firebase
      await updateDoc(projectRef, {
        customAccordions: updatedAccordions
      });

      // Atualizar estado local
      setFormState(prev => ({
        ...prev,
        [currentSubItemId]: {
          ...prev[currentSubItemId],
          adequacyReported: true,
          adequacyDetails: adequationResponse,
          adequacyImages: imageUrls,
          adequacyDate: new Date().toISOString(),
          adequacyStatus: 'pending',
          adequacyRevisionCount: newRevisionCount
        }
      }));

      const revisionText = currentSubItem.adequacyStatus === 'rejected' ? ' (Revisão)' : '';
      toast.success(`Adequação enviada com sucesso${revisionText}! Aguardando aprovação do consultor.`);
      
      // Limpar formulário
      setAdequationResponse('');
      setAdequationImages([]);
      
      // Voltar para a página de visualização
      setCurrentPage('view');
      
    } catch (error) {
      console.error('Erro ao enviar adequação:', error);
      toast.error("Erro ao enviar adequação. Tente novamente.");
    } finally {
      setSubmittingAdequation(false);
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
                      {/* Sistema de Páginas */}
                      <div className="relative">
                        {/* Indicador de Página */}
                        <div className="flex items-center justify-center mb-4">
                          <div className="flex items-center space-x-2 bg-gray-100 rounded-full p-1">
                            <button
                              onClick={() => setCurrentPage('view')}
                              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                currentPage === 'view' 
                                  ? 'bg-white text-blue-600 shadow-sm' 
                                  : 'text-gray-600 hover:text-gray-800'
                              }`}
                            >
                              Visualização
                            </button>
                            <button
                              onClick={() => handleOpenAdequation(sub.id)}
                              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                currentPage === 'adequation' 
                                  ? 'bg-white text-green-600 shadow-sm' 
                                  : 'text-gray-600 hover:text-gray-800'
                              }`}
                            >
                              Adequação
                            </button>
                          </div>
                        </div>

                        {/* Página 1: Visualização da Avaliação */}
                        {currentPage === 'view' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-blue-900">📊 Avaliação do Consultor</h4>
                              <Badge className={`px-2 py-1 text-xs ${
                                formState[sub.id]?.evaluation === 'nc' ? 'bg-red-100 text-red-800' : 
                                formState[sub.id]?.evaluation === 'r' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-green-100 text-green-800'
                              }`}>
                                {formState[sub.id]?.evaluation === 'nc' ? 'Não Conforme' : 
                                 formState[sub.id]?.evaluation === 'r' ? 'Requer Adequação' : 'Não Aplicável'}
                              </Badge>
                            </div>
                            
                            <div className="space-y-3">
                              {formState[sub.id]?.currentSituation && (
                                <div className="bg-white rounded-lg p-3 border">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <CheckCircle className="h-4 w-4 text-orange-600" />
                                    <span className="font-medium text-gray-700">Situação Atual Identificada</span>
                                  </div>
                                  <p className="text-gray-900 text-sm leading-relaxed">{formState[sub.id].currentSituation}</p>
                                </div>
                              )}
                              
                              {formState[sub.id]?.clientGuidance && (
                                <div className="bg-white rounded-lg p-3 border">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <ClipboardCheck className="h-4 w-4 text-blue-600" />
                                    <span className="font-medium text-gray-700">Orientações para Adequação</span>
                                  </div>
                                  <p className="text-gray-900 text-sm leading-relaxed">{formState[sub.id].clientGuidance}</p>
                                </div>
                              )}
                              
                              {formState[sub.id]?.photoData?.url && (
                                <div className="bg-white rounded-lg p-3 border">
                                  <div className="flex items-center space-x-2 mb-3">
                                    <Camera className="h-4 w-4 text-blue-600" />
                                    <span className="font-medium text-gray-700">Evidências do Consultor</span>
                                  </div>
                                  <div className="space-y-2">
                                    <img 
                                      src={formState[sub.id].photoData.url} 
                                      alt="Evidência do consultor" 
                                      className="max-h-40 rounded border cursor-pointer hover:opacity-80"
                                      onClick={() => {
                                        const modal = document.createElement('div');
                                        modal.innerHTML = `
                                          <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000;" onclick="this.remove()">
                                            <div style="position: relative; max-width: 90%; max-height: 90%;">
                                              <img src="${formState[sub.id].photoData.url}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="Imagem ampliada" />
                                              <button style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer;" onclick="this.parentElement.parentElement.remove()">✕</button>
                                            </div>
                                          </div>
                                        `;
                                        document.body.appendChild(modal);
                                      }}
                                    />
                                    <div className="text-xs text-gray-500">
                                      <div>Latitude: {formState[sub.id].photoData.latitude}</div>
                                      <div>Longitude: {formState[sub.id].photoData.longitude}</div>
                                      <div>Data: {new Date(formState[sub.id].photoData.createdAt).toLocaleString('pt-BR')}</div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Seção de Adequações Existentes */}
                              {formState[sub.id]?.adequacyReported && (
                                <div className="bg-white rounded-lg p-3 border border-green-200">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                      <span className="font-medium text-gray-700">Adequação Reportada</span>
                                    </div>
                                    <Badge className={`px-2 py-1 text-xs ${
                                      formState[sub.id]?.adequacyStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      formState[sub.id]?.adequacyStatus === 'approved' ? 'bg-green-100 text-green-800' :
                                      formState[sub.id]?.adequacyStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {formState[sub.id]?.adequacyStatus === 'pending' ? 'Pendente' :
                                       formState[sub.id]?.adequacyStatus === 'approved' ? 'Aprovada' :
                                       formState[sub.id]?.adequacyStatus === 'rejected' ? 'Rejeitada' : 'Desconhecido'}
                                    </Badge>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    {/* Detalhes da adequação */}
                                    {formState[sub.id]?.adequacyDetails && (
                                      <div className="bg-gray-50 rounded p-2">
                                        <p className="text-sm text-gray-900 leading-relaxed">
                                          {formState[sub.id].adequacyDetails}
                                        </p>
                                      </div>
                                    )}

                                    {/* Imagens da adequação */}
                                    {formState[sub.id]?.adequacyImages && formState[sub.id].adequacyImages.length > 0 && (
                                      <div>
                                        <p className="text-sm font-medium text-gray-700 mb-2">Evidências da Adequação:</p>
                                        <div className="grid grid-cols-4 gap-2">
                                          {formState[sub.id].adequacyImages.map((image, imgIndex) => (
                                            <div key={imgIndex} className="relative group">
                                              <img
                                                src={image}
                                                alt={`Evidência ${imgIndex + 1}`}
                                                className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => {
                                                  const modal = document.createElement('div');
                                                  modal.innerHTML = `
                                                    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000;" onclick="this.remove()">
                                                      <div style="position: relative; max-width: 90%; max-height: 90%;">
                                                        <img src="${image}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="Imagem ampliada" />
                                                        <button style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer;" onclick="this.parentElement.parentElement.remove()">✕</button>
                                                      </div>
                                                    </div>
                                                  `;
                                                  document.body.appendChild(modal);
                                                }}
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Data da adequação */}
                                    {formState[sub.id]?.adequacyDate && (
                                      <div className="text-xs text-gray-500">
                                        Enviada em: {new Date(formState[sub.id].adequacyDate).toLocaleString('pt-BR')}
                                      </div>
                                    )}

                                    {/* Motivo da rejeição */}
                                    {formState[sub.id]?.adequacyStatus === 'rejected' && formState[sub.id]?.adminRejectionReason && (
                                      <div className="bg-red-50 border border-red-200 rounded p-2">
                                        <div className="flex items-center space-x-2 mb-1">
                                          <XCircle className="h-4 w-4 text-red-600" />
                                          <span className="font-medium text-red-900">Motivo da Rejeição:</span>
                                        </div>
                                        <p className="text-sm text-red-800">{formState[sub.id].adminRejectionReason}</p>
                                      </div>
                                    )}

                                    {/* Contador de revisões */}
                                    {formState[sub.id]?.adequacyRevisionCount && formState[sub.id].adequacyRevisionCount > 0 && (
                                      <div className="text-xs text-gray-500">
                                        Revisão #{formState[sub.id].adequacyRevisionCount}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Página 2: Formulário de Adequação */}
                        {currentPage === 'adequation' && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold text-green-900">
                                <CheckCircle className="h-4 w-4 inline mr-2" />
                                Reportar Adequação Realizada
                              </h4>
                              <Badge className="bg-green-100 text-green-800 px-2 py-1 text-xs">
                                Ação Necessária
                              </Badge>
                            </div>
                            
                            <div className="space-y-4">
                              {/* Mostrar adequação existente se houver */}
                              {formState[currentSubItemId]?.adequacyReported && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-medium text-blue-900">Adequação Anterior</h5>
                                    <Badge className={`px-2 py-1 text-xs ${
                                      formState[currentSubItemId]?.adequacyStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      formState[currentSubItemId]?.adequacyStatus === 'approved' ? 'bg-green-100 text-green-800' :
                                      formState[currentSubItemId]?.adequacyStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {formState[currentSubItemId]?.adequacyStatus === 'pending' ? 'Pendente' :
                                       formState[currentSubItemId]?.adequacyStatus === 'approved' ? 'Aprovada' :
                                       formState[currentSubItemId]?.adequacyStatus === 'rejected' ? 'Rejeitada' : 'Desconhecido'}
                                    </Badge>
                                  </div>
                                  
                                  {formState[currentSubItemId]?.adequacyDetails && (
                                    <p className="text-sm text-blue-800 mb-2">
                                      {formState[currentSubItemId].adequacyDetails}
                                    </p>
                                  )}
                                  
                                  {formState[currentSubItemId]?.adequacyStatus === 'rejected' && formState[currentSubItemId]?.adminRejectionReason && (
                                    <div className="bg-red-50 border border-red-200 rounded p-2">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <XCircle className="h-4 w-4 text-red-600" />
                                        <span className="font-medium text-red-900">Motivo da Rejeição:</span>
                                      </div>
                                      <p className="text-sm text-red-800">{formState[currentSubItemId].adminRejectionReason}</p>
                                    </div>
                                  )}
                                  
                                  <div className="text-xs text-blue-600 mt-2">
                                    Enviada em: {formState[currentSubItemId]?.adequacyDate ? new Date(formState[currentSubItemId].adequacyDate).toLocaleString('pt-BR') : 'Data não disponível'}
                                  </div>
                                </div>
                              )}

                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                  📝 Descreva detalhadamente as adequações implementadas:
                                </Label>
                                <Textarea
                                  placeholder="Descreva as adequações que foram implementadas para atender aos requisitos identificados pelo consultor..."
                                  value={adequationResponse}
                                  onChange={(e) => setAdequationResponse(e.target.value)}
                                  className="text-sm border-green-300 focus:border-green-500 focus:ring-green-500"
                                  rows={4}
                                  maxLength={1000}
                                />
                                <div className="flex justify-between items-center mt-1">
                                  <p className="text-xs text-gray-500">
                                    Seja específico sobre as mudanças realizadas e como elas atendem aos requisitos.
                                  </p>
                                  <span className={`text-xs ${
                                    adequationResponse.length > 800 ? 'text-orange-600' : 'text-gray-500'
                                  }`}>
                                    {adequationResponse.length}/1000 caracteres
                                  </span>
                                </div>
                              </div>
                              
                              {/* Upload de imagens */}
                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                  <Image className="h-4 w-4 inline mr-1" />
                                  📷 Anexar Fotos Comprobatórias (máximo 5 imagens):
                                </Label>
                                
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {adequationImages.length > 0 && (
                                    <div className="w-full mb-2">
                                      <span className="text-xs text-green-600 font-medium">
                                        📷 {adequationImages.length} imagem(ns) anexada(s)
                                      </span>
                                    </div>
                                  )}
                                  {adequationImages.map((file, index) => (
                                    <div key={index} className="relative">
                                      <img
                                        src={URL.createObjectURL(file)}
                                        alt={`Anexo ${index + 1}`}
                                        className="w-20 h-20 object-cover rounded-lg border border-green-300"
                                      />
                                      <button
                                        onClick={() => removeAdequationImage(index)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
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
                                        handleAdequationImageUpload(e.target.files);
                                      }
                                    }}
                                    className="hidden"
                                    id="adequation-image-upload"
                                  />
                                  <label
                                    htmlFor="adequation-image-upload"
                                    className="cursor-pointer inline-flex items-center px-3 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-white hover:bg-green-50 transition-colors"
                                  >
                                    <Upload className="h-4 w-4 mr-1" />
                                    Anexar Imagens
                                  </label>
                                  <span className="text-xs text-gray-500">
                                    Máximo 5 imagens • Formatos: JPG, PNG, GIF
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Adicione fotos que comprovem as adequações realizadas.
                                </p>
                              </div>
                              
                              <div className="flex items-center justify-between pt-2">
                                <div className="text-xs text-gray-500">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  Após o envio, aguarde a análise do consultor.
                                </div>
                                <Button
                                  onClick={handleSubmitAdequation}
                                  disabled={!adequationResponse.trim() || submittingAdequation}
                                  className={`${
                                    adequationResponse.trim() && !submittingAdequation
                                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  } transition-colors`}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  {submittingAdequation ? 'Enviando...' : 
                                   formState[currentSubItemId]?.adequacyStatus === 'rejected' ? 'Enviar Revisão' : 
                                   formState[currentSubItemId]?.adequacyReported ? 'Atualizar Adequação' : 'Enviar Adequação'}
                                </Button>
                              </div>
                            </div>
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

      {/* Botões de navegação - Somente visualização */}
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

          <div className="text-sm text-gray-500">
            Passo {currentStep + 1} de {totalSteps} - Modo Visualização
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
      )}
    </div>
  );
};

export default ClientProjectView;
