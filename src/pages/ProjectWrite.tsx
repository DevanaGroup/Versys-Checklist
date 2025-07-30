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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ArrowLeft, ArrowRight, CheckCircle, Camera, ThumbsUp, ThumbsDown, Clock, XCircle, AlertTriangle, Eye, ZoomIn, X, Mic, MicOff } from "lucide-react";
// Removido import do Transformers.js - usando Web Speech API nativa
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { RelatorioService } from '@/lib/relatorioService';
import { useAuthContext } from '@/contexts/AuthContext';

interface SubItem {
  id: string;
  title: string;
  evaluation: "nc" | "r" | "na" | "";
  currentSituation?: string;
  clientGuidance?: string;
  completed?: boolean;
  photoData?: {
    url: string;
    firebaseUrl?: string; // Adicionado para fallback
    createdAt: string;
    latitude: number;
    longitude: number;
  };
  // Campos para adequação
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

const ProjectWrite = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { userData } = useAuthContext();
  const [projectDetails, setProjectDetails] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [projectSteps, setProjectSteps] = useState<ProjectItem[]>([]);
  const [formState, setFormState] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState<Record<string, boolean>>({});
  const [photoPreview, setPhotoPreview] = useState<Record<string, string>>({});
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  
  // Estados para adequação
  const [evaluatingAdequacy, setEvaluatingAdequacy] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Estados para transcrição de áudio com Web Speech API
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [isRecording, setIsRecording] = useState<Record<string, boolean>>({});
  const [isTranscribing, setIsTranscribing] = useState<Record<string, boolean>>({});
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'evaluation' | 'adequacy'>('evaluation');

  // Adicione o estado para controlar a aba ativa de cada subitem
  const [activeTabs, setActiveTabs] = useState<Record<string, 'visualizacao' | 'adequacao'>>({});

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

  // Função para melhorar pontuação e formatação do texto transcrito (versão conservadora)
  const improveTranscription = (text: string): string => {
    if (!text) return text;
    
    let improvedText = text.trim();
    
    // Capitalizar primeira letra apenas se não houver pontuação já presente
    if (improvedText.length > 0 && !/^[A-ZÀ-Ü]/.test(improvedText)) {
      improvedText = improvedText.charAt(0).toUpperCase() + improvedText.slice(1);
    }
    
    // Corrigir espaçamentos múltiplos
    improvedText = improvedText.replace(/\s{2,}/g, ' ');
    
    // Corrigir espaçamento antes de pontuação existente
    improvedText = improvedText.replace(/\s+([,.!?;:])/g, '$1');
    
    // Apenas adicionar ponto final se realmente não houver pontuação e a frase parecer completa
    if (!/[.!?;:]$/.test(improvedText) && improvedText.length > 10) {
      // Verificar se termina com palavras que indicam fim de frase
      if (/\b(concluído|finalizado|terminado|pronto|ok|certo|feito|acabado)$/gi.test(improvedText)) {
        improvedText += '.';
      }
      // Ou se parece ser uma frase declarativa completa (mais de 5 palavras)
      else if (improvedText.split(' ').length >= 5) {
        improvedText += '.';
      }
    }
    
    return improvedText;
  };

  // Inicializar Web Speech API para transcrição de áudio
  useEffect(() => {
    console.log('Inicializando Web Speech API...');
    
    // Verificar suporte do navegador
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.interimResults = true; // Mostrar resultados intermediários
      recognition.maxAlternatives = 1;
      recognition.continuous = true; // Gravação contínua
      recognition.serviceURI = 'pt-BR';
      
      setSpeechRecognition(recognition);
      console.log('Web Speech API inicializada com sucesso!');
    } else {
      console.error('Web Speech API não suportada pelo navegador');
      toast.error('Transcrição de áudio não suportada neste navegador');
    }
  }, []);

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
      // Recalcular progresso baseado no estado atual dos subitens
      const currentProgress = calculateProgress(accordions);
      
      setProjectDetails({
        id: projectDoc.id,
        nome: projectData.nome,
        status: projectData.status || 'Iniciado',
        progresso: currentProgress,
        dataInicio: projectData.dataInicio,
        previsaoConclusao: projectData.previsaoConclusao,
        consultor: projectData.consultor || 'Não definido',
        cliente: projectData.cliente,
        observacoes: projectData.observacoes || '',
        customAccordions: accordions,
        itens: projectData.itens || []
      });
      
      // Atualizar progresso no Firebase se estiver diferente
      if (currentProgress !== (projectData.progresso || 0)) {
        updateDoc(projectRef, { progresso: currentProgress }).catch(console.error);
      }
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

  // Função para iniciar transcrição com Web Speech API
  const startRecording = (subId: string) => {
    if (!speechRecognition) {
      toast.error('Transcrição de áudio não suportada neste navegador');
      return;
    }

    try {
      setIsRecording(prev => ({ ...prev, [subId]: true }));
      setIsTranscribing(prev => ({ ...prev, [subId]: false }));
      
      // Configurar eventos da Speech Recognition
      speechRecognition.onstart = () => {
        console.log('Reconhecimento de voz iniciado para', subId);
        toast.success('Gravação iniciada! Fale agora...');
      };

      speechRecognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscriptPart = '';
        
        // Processar todos os resultados
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscriptPart += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Se temos resultado final, processar e adicionar ao campo
        if (finalTranscriptPart) {
          console.log('Texto final:', finalTranscriptPart);
          
          // Aplicar melhorias de pontuação apenas no texto final
          const improvedTranscript = improveTranscription(finalTranscriptPart);
          console.log('Texto melhorado:', improvedTranscript);
          
          // Adicionar ao campo atual
          const currentText = formState[subId]?.currentSituation || '';
          const newText = currentText ? `${currentText} ${improvedTranscript}` : improvedTranscript;
          
          handleChange(subId, 'currentSituation', newText);
        }
        
        // Log do progresso (resultado intermediário)
        if (interimTranscript) {
          console.log('Transcrevendo...:', interimTranscript);
        }
      };

      speechRecognition.onerror = (event: any) => {
        console.error('Erro na transcrição:', event.error);
        toast.error('Erro ao transcrever áudio: ' + event.error);
        setIsRecording(prev => ({ ...prev, [subId]: false }));
        setIsTranscribing(prev => ({ ...prev, [subId]: false }));
      };

      speechRecognition.onend = () => {
        console.log('Reconhecimento de voz finalizado para', subId);
        setIsRecording(prev => ({ ...prev, [subId]: false }));
        setIsTranscribing(prev => ({ ...prev, [subId]: false }));
      };

      // Iniciar reconhecimento
      speechRecognition.start();
    } catch (error) {
      console.error('Erro ao iniciar reconhecimento:', error);
      toast.error('Erro ao iniciar transcrição');
      setIsRecording(prev => ({ ...prev, [subId]: false }));
    }
  };

  // Função para parar transcrição
  const stopRecording = (subId: string) => {
    if (speechRecognition && isRecording[subId]) {
      speechRecognition.stop();
      toast.info('Finalizando transcrição...');
    }
  };

  const handlePhoto = async (subId: string, file: File) => {
    if (!projectDetails) return;
    setPhotoUploading(prev => ({ ...prev, [subId]: true }));
    
    try {
      console.log('=== INICIANDO CAPTURA DE FOTO (PROJECT WRITE) ===');
      
      // 1. VALIDAR ARQUIVO
      if (!file.type.startsWith('image/')) {
        toast.error('Arquivo deve ser uma imagem');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast.error('Arquivo muito grande. Máximo 10MB');
        return;
      }

      // 2. CONVERTER PARA BASE64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          if (result.startsWith('data:image/')) {
            console.log('✅ Base64 gerado com sucesso');
            resolve(result);
          } else {
            reject(new Error('Falha na conversão para base64'));
          }
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsDataURL(file);
      });

      // 3. OBTER GEOLOCALIZAÇÃO
      const location = await new Promise<{ latitude: number; longitude: number }>((resolve) => {
        if (!navigator.geolocation) {
          console.warn('Geolocalização não suportada');
          resolve({ latitude: 0, longitude: 0 });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('✅ Localização capturada:', position.coords.latitude, position.coords.longitude);
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => {
            console.warn('❌ Erro na geolocalização:', error.message);
            resolve({ latitude: 0, longitude: 0 });
          },
          { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 }
        );
      });

      // 4. UPLOAD PARA FIREBASE STORAGE (BACKUP)
      let firebaseUrl = '';
      try {
        const storage = getStorage();
        const storageRef = ref(storage, `projetos/${projectDetails.id}/subitens/${subId}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        firebaseUrl = await getDownloadURL(storageRef);
        console.log('✅ Backup no Firebase Storage criado');
      } catch (error) {
        console.warn('⚠️ Erro no backup do Firebase:', error);
      }

      // 5. CRIAR DADOS DA FOTO
      const photoData = {
        url: base64Data,
        firebaseUrl: firebaseUrl || undefined,
        createdAt: new Date().toISOString(),
        latitude: location.latitude,
        longitude: location.longitude
      };
      
      console.log('=== DADOS DA FOTO PREPARADOS (PROJECT WRITE) ===');
      console.log('Base64 válido:', base64Data.substring(0, 50) + '...');
      console.log('Firebase URL:', firebaseUrl);
      console.log('Localização:', location);
      
      // Atualiza o estado local
      setFormState(prev => ({
        ...prev,
        [subId]: {
          ...prev[subId],
          photoData: photoData
        }
      }));
      setPhotoPreview(prev => ({ ...prev, [subId]: base64Data }));
      
      // 6. FEEDBACK PARA O USUÁRIO
      if (location.latitude !== 0 && location.longitude !== 0) {
        toast.success('✅ Foto salva com localização GPS!');
      } else {
        toast.success('✅ Foto salva (sem localização GPS)');
      }
    } catch (error) {
      console.error('❌ Erro no processamento da foto:', error);
      toast.error('Erro ao processar foto');
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
      
      // Sincronizar relatórios após atualizar o projeto
      try {
        await RelatorioService.syncRelatoriosFromProject(projectDetails.id, userData?.uid || '');
        console.log('✅ Relatórios sincronizados após atualização do projeto');
      } catch (syncError) {
        console.error('⚠️ Erro ao sincronizar relatórios:', syncError);
        // Não falhar a operação principal por causa da sincronização
      }
      
      toast.success('Formulário salvo com sucesso!');
      // Fechar o diálogo de confirmação
      setShowSaveConfirmation(false);
    } catch (error) {
      toast.error('Erro ao salvar formulário');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    setShowSaveConfirmation(true);
  };

  // Função para calcular progresso do projeto
  const calculateProgress = (accordions: any[]): number => {
    // Agora o progresso é calculado baseado nos itens concluídos pelo cliente
    let totalSubItems = 0;
    let completedItems = 0;
    
    accordions.forEach(accordion => {
      accordion.items.forEach(item => {
        item.subItems.forEach(subItem => {
          totalSubItems++;
          // Conta como progresso se o item foi marcado como concluído
          if (subItem.status === 'completed' || subItem.completed === true) {
            completedItems++;
          }
        });
      });
    });
    
    return totalSubItems > 0 ? Math.round((completedItems / totalSubItems) * 100) : 0;
  };

  // Funções para adequação
  const approveAdequacy = async (subItemId: string) => {
    if (!projectDetails) return;
    
    try {
      const updatedAccordions = projectDetails.customAccordions?.map(accordion => ({
        ...accordion,
        items: accordion.items.map(item => ({
          ...item,
          subItems: item.subItems.map(subItem => {
            if (subItem.id === subItemId) {
              return {
                ...subItem,
                adequacyStatus: 'approved' as const,
                completed: true
              };
            }
            return subItem;
          })
        }))
      }));

      // Calcular novo progresso
      const newProgress = calculateProgress(updatedAccordions || []);

      await updateDoc(doc(db, 'projetos', projectDetails.id), {
        customAccordions: updatedAccordions,
        progresso: newProgress
      });

      setProjectDetails(prev => prev ? { 
        ...prev, 
        customAccordions: updatedAccordions,
        progresso: newProgress
      } : null);
      
      // Atualizar o formState local para refletir imediatamente a aprovação
      setFormState(prev => ({
        ...prev,
        [subItemId]: {
          ...prev[subItemId],
          adequacyStatus: 'approved',
          completed: true
        }
      }));
      
      setEvaluatingAdequacy(null);
      toast.success(`Adequação aprovada com sucesso! Progresso: ${newProgress}%`);
    } catch (error) {
      console.error('Erro ao aprovar adequação:', error);
      toast.error('Erro ao aprovar adequação');
    }
  };

  const rejectAdequacy = async (subItemId: string) => {
    if (!projectDetails || !rejectionReason.trim()) {
      toast.error('Por favor, informe o motivo da rejeição.');
      return;
    }
    
    try {
      const updatedAccordions = projectDetails.customAccordions?.map(accordion => ({
        ...accordion,
        items: accordion.items.map(item => ({
          ...item,
          subItems: item.subItems.map(subItem => {
            if (subItem.id === subItemId) {
              return {
                ...subItem,
                adequacyStatus: 'rejected' as const,
                adminRejectionReason: rejectionReason,
                completed: false
              };
            }
            return subItem;
          })
        }))
      }));

      // Calcular novo progresso
      const newProgress = calculateProgress(updatedAccordions || []);

      await updateDoc(doc(db, 'projetos', projectDetails.id), {
        customAccordions: updatedAccordions,
        progresso: newProgress
      });

      setProjectDetails(prev => prev ? { 
        ...prev, 
        customAccordions: updatedAccordions,
        progresso: newProgress
      } : null);
      
      // Atualizar o formState local para refletir imediatamente a rejeição
      setFormState(prev => ({
        ...prev,
        [subItemId]: {
          ...prev[subItemId],
          adequacyStatus: 'rejected',
          adminRejectionReason: rejectionReason,
          completed: false
        }
      }));
      
      setEvaluatingAdequacy(null);
      setRejectionReason('');
      toast.success(`Adequação rejeitada. Cliente será notificado. Progresso: ${newProgress}%`);
    } catch (error) {
      console.error('Erro ao rejeitar adequação:', error);
      toast.error('Erro ao rejeitar adequação');
    }
  };

  const cancelEvaluation = () => {
    setEvaluatingAdequacy(null);
    setRejectionReason('');
  };

  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setImageModalOpen(false);
  };

  // Função para alternar a aba de um subitem
  const handleTabChange = (subId: string, tab: 'visualizacao' | 'adequacao') => {
    setActiveTabs(prev => ({ ...prev, [subId]: tab }));
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
              <span className="sm:hidden">
                {currentItem.title.length > 25 
                  ? currentItem.title.replace(/SÓCIOS\/PROPRIETÁRIOS\/REPRESENTANTES:/g, 'SÓCIOS/PROP./REPR.:')
                                     .replace(/DOCUMENTAÇÃO\/PRELIMINAR/g, 'DOC./PRELIM.')
                                     .replace(/INSTALAÇÃO PORTUÁRIA:/g, 'INST. PORT.:')
                                     .substring(0, 35) + (currentItem.title.length > 35 ? '...' : '')
                  : currentItem.title
                }
              </span>
              <span className="hidden sm:inline">
                {currentItem.title}
              </span>
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
                      {/* View Toggle Buttons - Exactly like client view */}
                      <div className="flex items-center justify-center mb-4">
                        <div className="flex items-center space-x-2 bg-gray-100 rounded-full p-1">
                          <button
                            onClick={() => handleTabChange(sub.id, 'visualizacao')}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              (!activeTabs[sub.id] || activeTabs[sub.id] === 'visualizacao')
                                ? 'bg-white text-blue-600 shadow-sm' 
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                          >
                            Visualização
                          </button>
                          <button
                            onClick={() => handleTabChange(sub.id, 'adequacao')}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              activeTabs[sub.id] === 'adequacao'
                                ? 'bg-white text-green-600 shadow-sm' 
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                          >
                            Adequação
                          </button>
                        </div>
                      </div>
                      
                      {/* Conteúdo da aba Visualização */}
                      {(!activeTabs[sub.id] || activeTabs[sub.id] === 'visualizacao') && (
                        <div className="space-y-4">
                          {/* Avaliação */}
                          <div className="bg-gray-50 p-4 rounded-md space-y-2">
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
                          
                          {/* Situação Atual */}
                          <div className="bg-gray-50 p-4 rounded-md space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Situação atual</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={isRecording[sub.id] ? () => stopRecording(sub.id) : () => startRecording(sub.id)}
                                disabled={isTranscribing[sub.id] || !speechRecognition}
                                className={`flex items-center space-x-2 ${
                                  isRecording[sub.id] ? 'bg-red-50 border-red-300 text-red-700' : 'hover:bg-blue-50'
                                }`}
                              >
                                {isRecording[sub.id] ? (
                                  <MicOff className="h-4 w-4" />
                                ) : (
                                  <Mic className="h-4 w-4" />
                                )}
                                <span className="text-xs">
                                  {isTranscribing[sub.id] ? 'Transcrevendo...' : isRecording[sub.id] ? 'Parar' : 'Gravar'}
                                </span>
                              </Button>
                            </div>
                            <Textarea
                              value={formState[sub.id]?.currentSituation || ''}
                              onChange={e => handleChange(sub.id, 'currentSituation', e.target.value)}
                              placeholder="Situação atual..."
                            />
                            {!speechRecognition && (
                              <p className="text-xs text-gray-500">Inicializando reconhecimento de voz...</p>
                            )}
                          </div>
                          
                          {/* Orientação para o Cliente */}
                          <div className="bg-gray-50 p-4 rounded-md space-y-2">
                            <Label>Orientação para o cliente</Label>
                            <Textarea
                              value={formState[sub.id]?.clientGuidance || ''}
                              onChange={e => handleChange(sub.id, 'clientGuidance', e.target.value)}
                              placeholder="Orientação para o cliente..."
                            />
                          </div>
                          
                          {/* Foto */}
                          <div className="bg-gray-50 p-4 rounded-md space-y-2">
                            <Label>Foto (opcional)</Label>
                            {formState[sub.id]?.photoData?.url ? (
                            <div className="border-2 border-dashed rounded-lg p-4 bg-gray-50 relative">
                              <img 
                                src={formState[sub.id].photoData.url} 
                                alt="Foto do subitem" 
                                className="max-h-40 rounded border mb-2 mx-auto block"
                                onError={(e) => {
                                  console.error('❌ Erro ao carregar imagem no ProjectWrite');
                                  // Tentar URL do Firebase como fallback
                                  if (formState[sub.id]?.photoData?.firebaseUrl) {
                                    console.log('🔄 Tentando URL do Firebase como fallback');
                                    (e.target as HTMLImageElement).src = formState[sub.id].photoData.firebaseUrl;
                                  } else {
                                    console.error('❌ Nenhum fallback disponível');
                                  }
                                }}
                                onLoad={() => {
                                  console.log('✅ Imagem carregada no ProjectWrite');
                                }}
                              />
                              <div className="flex gap-2 justify-center mt-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    document.getElementById(`camera-input-${sub.id}`)?.click();
                                  }}
                                  disabled={photoUploading[sub.id]}
                                >
                                  <Camera className="w-4 h-4 mr-2" />
                                  Nova Foto
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newFormState = { ...formState };
                                    if (newFormState[sub.id]) {
                                      newFormState[sub.id].photoData = null;
                                    }
                                    setFormState(newFormState);
                                  }}
                                  disabled={photoUploading[sub.id]}
                                  className="text-red-600 border-red-600 hover:bg-red-50"
                                >
                                  Remover
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-20 flex flex-col items-center justify-center gap-2 border-2 border-dashed hover:border-purple-400 hover:bg-purple-50"
                                  onClick={() => {
                                    document.getElementById(`camera-input-${sub.id}`)?.click();
                                  }}
                                  disabled={photoUploading[sub.id]}
                                >
                                  <Camera className="w-6 h-6 text-purple-600" />
                                  <span className="text-sm font-medium">Tirar Foto</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-20 flex flex-col items-center justify-center gap-2 border-2 border-dashed hover:border-blue-400 hover:bg-blue-50"
                                  onClick={() => {
                                    document.getElementById(`gallery-input-${sub.id}`)?.click();
                                  }}
                                  disabled={photoUploading[sub.id]}
                                >
                                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="text-sm font-medium">Da Galeria</span>
                                </Button>
                              </div>

                            </div>
                          )}
                          
                          {/* Input para câmera - Múltiplas abordagens para compatibilidade */}
                          <input
                            id={`camera-input-${sub.id}`}
                            type="file"
                            accept="image/*,image/jpeg,image/png,image/gif,image/webp"
                            capture="environment"
                            className="hidden"
                            disabled={photoUploading[sub.id]}
                            onChange={e => {
                              if (e.target.files && e.target.files[0]) {
                                handlePhoto(sub.id, e.target.files[0]);
                              }
                            }}
                          />
                          

                          {/* Input para galeria */}
                          <input
                            id={`gallery-input-${sub.id}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={photoUploading[sub.id]}
                            onChange={e => {
                              if (e.target.files && e.target.files[0]) {
                                handlePhoto(sub.id, e.target.files[0]);
                              }
                            }}
                          />
                          
                          {/* Drag and drop area for gallery input */}

                          
                          {photoUploading[sub.id] && (
                            <div className="text-xs text-center text-gray-500 mt-2">
                              Enviando foto...
                            </div>
                          )}
                          
                          {formState[sub.id]?.photoData?.url && (
                            <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                              <div>Latitude: {formState[sub.id].photoData.latitude}</div>
                              <div>Longitude: {formState[sub.id].photoData.longitude}</div>
                              <div>Data: {new Date(formState[sub.id].photoData.createdAt).toLocaleString('pt-BR')}</div>
                            </div>
                          )}
                        </div>
                      </div>
                      )}

                      {/* Conteúdo da aba Adequação */}
                      {activeTabs[sub.id] === 'adequacao' && (
                        <div className="space-y-6">
                          {sub.adequacyReported ? (
                            <>
                              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                                <h5 className="font-medium text-blue-900 mb-2">Descrição da Adequação</h5>
                                <p className="text-sm text-blue-800">{sub.adequacyDetails}</p>
                              </div>
                              {sub.adequacyImages && sub.adequacyImages.length > 0 && (
                                <div className="mb-4">
                                  <h5 className="font-medium text-gray-900 mb-2">Evidências ({sub.adequacyImages.length})</h5>
                                  <div className="grid grid-cols-3 gap-2">
                                    {sub.adequacyImages.map((image, index) => (
                                      <div key={index} className="relative group">
                                        <img
                                          src={image}
                                          alt={`Evidência ${index + 1}`}
                                          className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => openImageModal(image)}
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center">
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="bg-white rounded-full p-1">
                                              <ZoomIn className="h-3 w-3 text-gray-600" />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {sub.adequacyDate && (
                                <div className="text-xs text-blue-600 mb-2">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  Enviada em: {new Date(sub.adequacyDate).toLocaleDateString('pt-BR')} às {new Date(sub.adequacyDate).toLocaleTimeString('pt-BR')}
                                </div>
                              )}
                              {sub.adequacyRevisionCount > 0 && (
                                <div className="flex items-center space-x-2 text-orange-600 text-sm mb-2">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span>{sub.adequacyRevisionCount} revisão{sub.adequacyRevisionCount > 1 ? 'ões' : 'ão'} anterior{sub.adequacyRevisionCount > 1 ? 'es' : ''}</span>
                                </div>
                              )}
                              {/* Ações para adequações pendentes */}
                              {sub.adequacyStatus === 'pending' && (
                                <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
                                  <Button
                                    size="sm"
                                    onClick={() => approveAdequacy(sub.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <ThumbsUp className="h-4 w-4 mr-1" />
                                    Aprovar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEvaluatingAdequacy(sub.id)}
                                    className="border-red-300 text-red-700 hover:bg-red-50"
                                  >
                                    <ThumbsDown className="h-4 w-4 mr-1" />
                                    Rejeitar
                                  </Button>
                                </div>
                              )}
                              {/* Formulário de rejeição */}
                              {evaluatingAdequacy === sub.id && (
                                <div className="bg-red-50 rounded-lg p-3 mt-3 border border-red-200">
                                  <h5 className="font-medium text-red-900 mb-2">Motivo da Rejeição</h5>
                                  <div className="space-y-3">
                                    <div>
                                      <Label className="text-sm font-medium">Motivo da rejeição:</Label>
                                      <Textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Descreva o motivo da rejeição e orientações para correção..."
                                        className="mt-1"
                                        rows={3}
                                      />
                                    </div>
                                    <div className="flex space-x-2">
                                      <Button
                                        size="sm"
                                        onClick={() => rejectAdequacy(sub.id)}
                                        disabled={!rejectionReason.trim()}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Confirmar Rejeição
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={cancelEvaluation}
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {/* Status de adequação aprovada/rejeitada */}
                              {sub.adequacyStatus && sub.adequacyStatus !== 'pending' && (
                                <div className={`rounded-lg p-3 mt-3 ${
                                  sub.adequacyStatus === 'approved' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                                }`}>
                                  <h5 className={`font-medium mb-2 ${
                                    sub.adequacyStatus === 'approved' ? 'text-green-900' : 'text-red-900'
                                  }`}>
                                    {sub.adequacyStatus === 'approved' ? 'Adequação Aprovada' : 'Adequação Rejeitada'}
                                  </h5>
                                  {sub.adequacyStatus === 'rejected' && sub.adminRejectionReason && (
                                    <p className="text-sm text-red-800">
                                      <span className="font-medium">Motivo: </span>
                                      {sub.adminRejectionReason}
                                    </p>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-center py-8">
                              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma adequação encontrada</h3>
                              <p className="text-gray-600">
                                Não há adequações submetidas pelos clientes para este item.
                              </p>
                            </div>
                          )}
                        </div>
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

      {/* Botões de navegação e salvar */}
      {totalSteps > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={() => {
              setCurrentStep(prev => Math.max(0, prev - 1));
              setActiveTabs({}); // Resetar todas as abas para visualização ao navegar
            }}
            disabled={currentStep === 0}
            className="flex items-center space-x-2"
          >
            <ArrowLeft size={16} />
            <span>Anterior</span>
          </Button>

          {/* Botão Salvar - aparece apenas na última etapa */}
          {currentStep === totalSteps - 1 ? (
            <AlertDialog open={showSaveConfirmation} onOpenChange={setShowSaveConfirmation}>
              <AlertDialogTrigger asChild>
                <Button
                  onClick={handleSaveClick}
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Salvamento</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja salvar todas as alterações do formulário? 
                    Esta ação salvará todos os dados preenchidos e não poderá ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSave} disabled={saving}>
                    {saving ? 'Salvando...' : 'Confirmar Salvamento'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              onClick={() => {
                setCurrentStep(prev => Math.min(totalSteps - 1, prev + 1));
                setActiveTabs({}); // Resetar todas as abas para visualização ao navegar
              }}
              className="flex items-center space-x-2"
            >
              <span>Próximo</span>
              <ArrowRight size={16} />
            </Button>
          )}
        </div>
      )}

      {/* Modal de Imagem */}
      {imageModalOpen && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative max-w-full max-h-full">
            <img
              src={selectedImage}
              alt="Imagem ampliada"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 bg-white p-2 rounded-full hover:bg-gray-200"
            >
              <X className="h-6 w-6 text-gray-800" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectWrite; 