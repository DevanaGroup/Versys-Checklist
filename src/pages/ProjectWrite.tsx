import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { ArrowLeft, Camera, Clock, X, Plus, Trash2, Paperclip, MessageCircle, Save, FileText, ChevronRight, ChevronLeft, Sparkles, MoreVertical } from "lucide-react";
import { HierarchicalProjectSidebar } from "@/components/HierarchicalProjectSidebar";
import { ProjectModule, NC, ResponseOption, RESPONSE_VALUES, WeightedQuestion } from "@/lib/types";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuthContext } from '@/contexts/AuthContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { useHeaderActions } from '@/contexts/HeaderActionsContext';
import { useIsMobile } from '@/hooks/use-mobile';

// Configurações da OpenAI
const OPENAI_ASSISTANT_ID = "asst_9dvrBEsSkU33QT9HwrzAYnT1";
const OPENAI_API_KEY = "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";

interface SubItem {
  id: string;
  title: string;
}

interface ProjectItem {
  id: string;
  title: string;
  category: string;
  subItems: SubItem[];
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

// Função para gerar IDs únicos
const generateUniqueId = (prefix: string) => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Função para sanitizar IDs duplicados
const sanitizeDuplicateIds = (modules: ProjectModule[]): ProjectModule[] => {
  const seenQuestionIds = new Set<string>();
  
  return modules.map(module => ({
    ...module,
    itens: module.itens.map(item => ({
      ...item,
      ncs: item.ncs.map(nc => ({
        ...nc,
        perguntas: nc.perguntas.map(q => {
          // Se o ID já foi visto, gerar um novo ID único
          if (seenQuestionIds.has(q.id)) {
            console.warn(`⚠️ ID duplicado detectado: ${q.id}. Gerando novo ID.`);
            const newId = generateUniqueId('question');
            seenQuestionIds.add(newId);
            return { ...q, id: newId };
          }
          seenQuestionIds.add(q.id);
          return q;
        })
      }))
    }))
  }));
};

const ProjectWrite = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { userData } = useAuthContext();
  const { setPageTitle } = usePageTitle();
  const { setRightAction } = useHeaderActions();
  const isMobile = useIsMobile();
  
  const [projectDetails, setProjectDetails] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estados para novo sistema de avaliação ponderada
  const [modules, setModules] = useState<ProjectModule[]>([]);
  const [currentModuleId, setCurrentModuleId] = useState<string>("");
  const [currentItemId, setCurrentItemId] = useState<string>("");
  const [currentNcId, setCurrentNcId] = useState<string>("");
  const [questionPhotos, setQuestionPhotos] = useState<Record<string, any>>({});
  const [questionPhotoUploading, setQuestionPhotoUploading] = useState<Record<string, boolean>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [photoDrawerOpen, setPhotoDrawerOpen] = useState<string | null>(null); // ID da pergunta com drawer aberto
  const [generatingGuidance, setGeneratingGuidance] = useState<Record<string, boolean>>({});
  const [showSituacaoAtual, setShowSituacaoAtual] = useState<Record<string, boolean>>({});
  const [floatingButtonTop, setFloatingButtonTop] = useState<number>(200);
  
  // Estados para importação de preset
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [availablePresets, setAvailablePresets] = useState<any[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [importingPreset, setImportingPreset] = useState(false);

  useEffect(() => {
    if (!id) {
      const isClient = window.location.pathname.includes('/client-projects');
      navigate(isClient ? "/client-projects" : "/projetos");
      return;
    }
    loadProject();
    // eslint-disable-next-line
  }, [id]);

  // Atualizar título do header quando o módulo mudar
  useEffect(() => {
    if (currentModuleId && modules.length > 0) {
      const currentModule = modules.find(m => m.id === currentModuleId);
      if (currentModule) {
        setPageTitle(currentModule.titulo);
      }
    }
  }, [currentModuleId, modules, setPageTitle]);

  // Função de salvar para uso no header
  const handleSaveProjectFromHeader = useCallback(async () => {
    if (!projectDetails || !id) return;

    try {
      setSaving(true);
      
      // Calcular progresso geral
      const totalQuestions = modules.reduce(
        (sum, module) =>
          sum +
          module.itens.reduce(
            (itemSum, item) =>
              itemSum + item.ncs.reduce((ncSum, nc) => ncSum + nc.perguntas.length, 0),
            0
          ),
        0
      );

      const answeredQuestions = modules.reduce(
        (sum, module) =>
          sum +
          module.itens.reduce(
            (itemSum, item) =>
              itemSum +
              item.ncs.reduce(
                (ncSum, nc) =>
                  ncSum + nc.perguntas.filter((q) => q.response !== null).length,
                0
              ),
            0
          ),
        0
      );

      const progresso = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

      await updateDoc(doc(db, "projetos", id), {
        weightedModules: modules,
        progresso,
        nome: projectDetails.nome,
      });

      toast.success("Projeto salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar projeto");
    } finally {
      setSaving(false);
    }
  }, [projectDetails, id, modules]);

  // Adicionar botão de salvar no header (mobile)
  useEffect(() => {
    const saveButton = (
      <Button 
        onClick={handleSaveProjectFromHeader} 
        disabled={saving} 
        variant="ghost"
        size="icon" 
        className="h-9 w-9"
      >
        <Save className="h-5 w-5" />
      </Button>
    );
    
    setRightAction(saveButton);

    // Limpar ao desmontar
    return () => {
      setRightAction(null);
    };
  }, [saving, handleSaveProjectFromHeader, setRightAction]);

  // Calcular posição do botão flutuante baseado na div de ações das NCs
  useEffect(() => {
    if (!isMobile) return;

    const updateFloatingButtonPosition = () => {
      const actionsDiv = document.getElementById('nc-actions-buttons');
      if (actionsDiv) {
        const rect = actionsDiv.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const topPosition = rect.top + scrollTop;
        setFloatingButtonTop(topPosition);
      }
    };

    // Atualizar posição inicial
    updateFloatingButtonPosition();

    // Atualizar quando o conteúdo mudar ou a janela for redimensionada
    const observer = new MutationObserver(updateFloatingButtonPosition);
    const targetNode = document.body;
    observer.observe(targetNode, { childList: true, subtree: true });

    window.addEventListener('resize', updateFloatingButtonPosition);
    window.addEventListener('scroll', updateFloatingButtonPosition);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateFloatingButtonPosition);
      window.removeEventListener('scroll', updateFloatingButtonPosition);
    };
  }, [isMobile, currentNcId, currentItemId, currentModuleId]);

  const loadProject = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const projectRef = doc(db, "projetos", id);
      const projectSnap = await getDoc(projectRef);

      if (projectSnap.exists()) {
        const data = projectSnap.data();
        const projectData: ProjectDetail = {
          id: projectSnap.id,
          nome: data.nome || "",
          status: data.status || "em_andamento",
          progresso: data.progresso || 0,
          dataInicio: data.dataInicio || "",
          previsaoConclusao: data.previsaoConclusao,
          consultor: data.consultor,
          cliente: data.cliente,
          observacoes: data.observacoes,
          customAccordions: data.customAccordions || []
        };

        setProjectDetails(projectData);
        
        // Carregar estrutura hierárquica ponderada
        if (data.weightedModules) {
          console.log('📦 weightedModules encontrado:', data.weightedModules);
          // Log detalhado da estrutura
          data.weightedModules.forEach((module: any, mIdx: number) => {
            console.log(`  Módulo ${mIdx}: ${module.titulo} (${module.itens?.length || 0} itens)`);
            module.itens?.forEach((item: any, iIdx: number) => {
              console.log(`    Item ${iIdx}: ${item.titulo} (${item.ncs?.length || 0} NCs)`);
            });
          });
          
          // Sanitizar IDs duplicados antes de carregar
          const sanitizedModules = sanitizeDuplicateIds(data.weightedModules);
          setModules(sanitizedModules);
          
          // Log detalhado PÓS-CARREGAMENTO para verificar NCs e Respostas
          console.log('🔍 VERIFICAÇÃO DE NCs E RESPOSTAS:');
          data.weightedModules.forEach((mod: any) => {
            mod.itens?.forEach((item: any) => {
              if (item.ncs && item.ncs.length > 0) {
                if (item.ncs.length > 1) {
                  console.log(`  ⚠️ ATENÇÃO: "${item.titulo}" tem ${item.ncs.length} NCs!`);
                }
                item.ncs.forEach((nc: any, idx: number) => {
                  const perguntasRespondidas = nc.perguntas?.filter((p: any) => p.response !== null).length || 0;
                  const totalPerguntas = nc.perguntas?.length || 0;
                  console.log(`    NC ${idx + 1}: ${nc.ncTitulo} - ${perguntasRespondidas}/${totalPerguntas} respondidas`);
                  
                  // Log das respostas salvas
                  nc.perguntas?.forEach((pergunta: any, pIdx: number) => {
                    if (pergunta.response) {
                      console.log(`      ✅ Pergunta ${pIdx + 1} respondida:`, {
                        resposta: pergunta.response.selectedOption,
                        fotos: pergunta.response.mediaAttachments?.length || 0,
                        comentarios: pergunta.response.comments?.length || 0
          });
        }
      });
                });
              }
        });
      });
          
          // Auto-selecionar primeira NC disponível
          if (data.weightedModules.length > 0) {
            const firstModule = data.weightedModules[0];
            if (firstModule.itens.length > 0) {
              const firstItem = firstModule.itens[0];
              console.log(`📍 Primeiro item: "${firstItem.titulo}" com ${firstItem.ncs?.length || 0} NCs`);
              if (firstItem.ncs.length > 0) {
                setCurrentModuleId(firstModule.id);
                setCurrentItemId(firstItem.id);
                setCurrentNcId(firstItem.ncs[0].id);
              }
            }
          }
        } else {
          console.log('⚠️ weightedModules NÃO encontrado, convertendo de customAccordions...');
          // Converter estrutura antiga para nova (primeira vez)
          loadHierarchicalStructure(projectData);
        }
      } else {
        toast.error("Projeto não encontrado");
      navigate("/projetos");
      }
    } catch (error) {
      console.error("Erro ao carregar projeto:", error);
      toast.error("Erro ao carregar projeto");
    } finally {
      setLoading(false);
    }
  };

  const loadHierarchicalStructure = (project: ProjectDetail) => {
    console.log('🔄 Convertendo customAccordions para estrutura hierárquica...');
    const hierarchicalModules: ProjectModule[] = [];
    
    // Agrupar itens por categoria (módulo)
    const itemsByCategory = new Map<string, any[]>();

    if (project.customAccordions) {
      console.log('customAccordions completo:', project.customAccordions);
      
      // Primeiro, coletar todos os itens e agrupar por categoria
      project.customAccordions.forEach((accordion) => {
        accordion.items.forEach((item) => {
          console.log('  📄 Item encontrado:', {
            titulo: item.title,
            categoria: item.category,
            numSubItems: item.subItems?.length || 0
          });
          
          const category = item.category || accordion.title || 'SEM CATEGORIA';
          if (!itemsByCategory.has(category)) {
            itemsByCategory.set(category, []);
          }
          itemsByCategory.get(category)!.push(item);
        });
      });

      // Agora criar módulos a partir das categorias agrupadas
      let moduleIndex = 0;
      itemsByCategory.forEach((items, categoryName) => {
        const module: ProjectModule = {
          id: `module_${moduleIndex}`,
          titulo: categoryName,
          ordem: moduleIndex,
          itens: []
        };

        items.forEach((item, itemIndex) => {
          console.log(`    🔨 Criando item: ${item.title} com ${item.subItems?.length || 0} subItems`);
          
          const hierItem: any = {
            id: `item_${moduleIndex}_${itemIndex}`,
            titulo: item.title,
            descricao: item.category,
            ordem: itemIndex,
            ncs: [],
            pontuacaoAtual: 0,
            pontuacaoMaxima: 0
          };

          // Se o item já tem NCs salvas (modo novo), usar elas
          if (item.ncs && Array.isArray(item.ncs) && item.ncs.length > 0) {
            console.log(`      ✅ Item já tem ${item.ncs.length} NCs salvas no Firebase`);
            hierItem.ncs = item.ncs;
            hierItem.pontuacaoMaxima = item.ncs.reduce((sum: number, nc: NC) => sum + nc.pontuacaoMaxima, 0);
          } else {
            // Criar uma NC para cada subItem (formato antigo) e converter dados existentes
            console.log(`      🆕 Criando ${item.subItems?.length || 0} NCs (uma para cada subItem)`);
            
            (item.subItems || []).forEach((subItem: any, ncIndex: number) => {
              // Converter evaluation antiga para nova estrutura
              let selectedOption: any = null;
              let score = 0;
              
              if (subItem.evaluation) {
                console.log(`        📝 Convertendo evaluation "${subItem.evaluation}" do subItem`);
                switch (subItem.evaluation.toLowerCase()) {
                  case 'nc':
                    selectedOption = 'very_bad';
                    score = 0;
                    break;
                  case 'r':
                    selectedOption = 'good';
                    score = 15; // peso 2 * valor 7.5
                    break;
                  case 'na':
                    selectedOption = 'na';
                    score = 0;
                    break;
                }
              }
              
              // Converter fotos antigas para novo formato
              const mediaAttachments = [];
              if (subItem.photos && Array.isArray(subItem.photos)) {
                console.log(`        📸 Convertendo ${subItem.photos.length} fotos do formato antigo`);
                mediaAttachments.push(...subItem.photos.map((photo: any) => ({
                  type: 'photo' as const,
                  url: photo.url,
                  timestamp: photo.createdAt || new Date().toISOString(),
                  uploadedBy: 'legacy',
                  location: (photo.latitude && photo.longitude) ? {
                    latitude: photo.latitude,
                    longitude: photo.longitude,
                    timestamp: photo.createdAt || new Date().toISOString()
                  } : undefined
                })));
              } else if (subItem.photoData) {
                console.log(`        📸 Convertendo 1 foto (photoData) do formato antigo`);
                mediaAttachments.push({
                  type: 'photo' as const,
                  url: subItem.photoData.url,
                  timestamp: subItem.photoData.createdAt || new Date().toISOString(),
                  uploadedBy: 'legacy',
                  location: (subItem.photoData.latitude && subItem.photoData.longitude) ? {
                    latitude: subItem.photoData.latitude,
                    longitude: subItem.photoData.longitude,
                    timestamp: subItem.photoData.createdAt || new Date().toISOString()
                  } : undefined
                });
              }
              
              // Manter campos antigos como campos próprios (não converter para comentários)
              const currentSituation = subItem.currentSituation || '';
              const aiGuidance = subItem.clientGuidance || subItem.adminFeedback || '';
              
              const nc: NC = {
                id: `nc_${moduleIndex}_${itemIndex}_${ncIndex}`,
                numero: ncIndex + 1,
                ncTitulo: `NC ${ncIndex + 1}`,
                descricao: `Não Conformidade ${ncIndex + 1}`,
                perguntas: [{
                  id: `question_${moduleIndex}_${itemIndex}_${ncIndex}_0`,
                  text: subItem.title,
                  weight: 2,
                  required: true,
                  responseOptions: ['na', 'very_bad', 'good'] as ResponseOption[],
                  response: selectedOption ? {
                    selectedOption,
                    score,
                    respondedAt: new Date().toISOString(),
                    respondedBy: 'legacy',
                    mediaAttachments,
                    currentSituation,
                    aiGuidance
                  } as any : null,
                  order: 0
                }],
                pontuacaoAtual: score,
                pontuacaoMaxima: 2 * 10,
                status: selectedOption ? 'completed' : 'pending' as const
              };
              
              hierItem.ncs.push(nc);
            });
            
            hierItem.pontuacaoMaxima = hierItem.ncs.reduce((sum: number, nc: NC) => sum + nc.pontuacaoMaxima, 0);
          }
          
          console.log(`      ✔️ Item finalizado com ${hierItem.ncs.length} NCs`);
          module.itens.push(hierItem);
        });

        hierarchicalModules.push(module);
        moduleIndex++;
      });
    }

    // Sanitizar IDs duplicados antes de aplicar
    const sanitizedModules = sanitizeDuplicateIds(hierarchicalModules);
    setModules(sanitizedModules);
    
    // Auto-selecionar primeira NC
    if (sanitizedModules.length > 0 && sanitizedModules[0].itens.length > 0) {
      setCurrentModuleId(sanitizedModules[0].id);
      setCurrentItemId(sanitizedModules[0].itens[0].id);
      setCurrentNcId(sanitizedModules[0].itens[0].ncs[0].id);
    }
  };

  const handleNavigate = (moduleId: string, itemId: string, ncId: string) => {
    setCurrentModuleId(moduleId);
    setCurrentItemId(itemId);
    setCurrentNcId(ncId);
  };

  const handleWeightedResponseChange = (questionId: string, option: ResponseOption) => {
    setModules(prevModules =>
      prevModules.map(module => ({
        ...module,
        itens: module.itens.map(item => ({
          ...item,
          ncs: item.ncs.map(nc => {
            const updatedPerguntas = nc.perguntas.map(q => {
              if (q.id === questionId) {
                const score = RESPONSE_VALUES[option] * q.weight;
                return {
                  ...q,
                  response: {
                    selectedOption: option,
                    score: score,
                    timestamp: new Date().toISOString(),
                    answeredBy: userData?.uid || '',
                    answeredByName: userData?.displayName || 'Usuário',
                    mediaAttachments: q.response?.mediaAttachments || [],
                    comments: q.response?.comments || []
                  }
                };
              }
              return q;
            });

            // Recalcular pontuação da NC
            const ncPontuacaoAtual = updatedPerguntas.reduce(
              (sum, q) => sum + ((q.response as any)?.score || 0),
              0
            );
            const ncPontuacaoMaxima = updatedPerguntas.reduce(
              (sum, q) => sum + (q.weight * 10),
              0
            );

            return {
              ...nc,
              perguntas: updatedPerguntas,
              pontuacaoAtual: ncPontuacaoAtual,
              pontuacaoMaxima: ncPontuacaoMaxima,
              status: updatedPerguntas.every(q => q.response) ? 'completed' : 'in_progress'
            };
          })
        }))
      }))
    );
  };

  const addNC = (moduleId: string, itemId: string) => {
    setModules(prevModules =>
      prevModules.map(module => {
        if (module.id === moduleId) {
          return {
            ...module,
            itens: module.itens.map(item => {
              if (item.id === itemId) {
                const ncNumber = item.ncs.length + 1;
                const firstNc = item.ncs[0];
                
                const newNC: NC = {
                  id: generateUniqueId('nc'),
                  numero: ncNumber,
                  ncTitulo: `NC ${ncNumber}`,
                  descricao: `Não Conformidade ${ncNumber}`,
                  perguntas: firstNc ? firstNc.perguntas.map(q => ({
                    ...q,
                    id: generateUniqueId('question'),
                    response: null
                  })) : [],
                  pontuacaoAtual: 0,
                  pontuacaoMaxima: firstNc?.pontuacaoMaxima || 0,
                  status: 'pending'
                };
                
                return {
                  ...item,
                  ncs: [...item.ncs, newNC]
                };
              }
              return item;
            })
          };
        }
        return module;
      })
    );
    toast.success("NC adicionada!");
  };

  const removeNC = (moduleId: string, itemId: string, ncId: string) => {
    setModules(prevModules =>
      prevModules.map(module => {
        if (module.id === moduleId) {
          return {
            ...module,
            itens: module.itens.map(item => {
              if (item.id === itemId) {
                return {
                  ...item,
                  ncs: item.ncs.filter(nc => nc.id !== ncId)
                };
              }
              return item;
            })
          };
        }
        return module;
      })
    );
    toast.success("NC removida!");
  };

  const handleQuestionPhoto = async (questionId: string, file: File) => {
    if (!projectDetails) return;
    setQuestionPhotoUploading(prev => ({ ...prev, [questionId]: true }));
    
    try {
      console.log('=== INICIANDO CAPTURA DE FOTO (MODO PONDERADO) ===');
      
      if (!file.type.startsWith('image/')) {
        toast.error('Arquivo deve ser uma imagem');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 10MB');
        return;
      }

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

      let firebaseUrl = '';
      try {
        const storage = getStorage();
        const storageRef = ref(storage, `projetos/${projectDetails.id}/perguntas/${questionId}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        firebaseUrl = await getDownloadURL(storageRef);
        console.log('✅ Backup no Firebase Storage criado');
      } catch (error) {
        console.warn('⚠️ Erro no backup do Firebase:', error);
      }

      const photoData = {
        url: base64Data,
        firebaseUrl: firebaseUrl || undefined,
        createdAt: new Date().toISOString(),
        latitude: location.latitude,
        longitude: location.longitude
      };
      
      console.log('=== DADOS DA FOTO PREPARADOS (MODO PONDERADO) ===');
      
      setQuestionPhotos(prev => ({ ...prev, [questionId]: photoData }));
      
      if (location.latitude !== 0 && location.longitude !== 0) {
        toast.success('✅ Foto salva com localização GPS!');
      } else {
        toast.success('✅ Foto salva (sem localização GPS)');
      }
    } catch (error) {
      console.error('❌ Erro no processamento da foto:', error);
      toast.error('Erro ao processar foto');
    } finally {
      setQuestionPhotoUploading(prev => ({ ...prev, [questionId]: false }));
    }
  };

  // Função para gerar orientação com IA
  const handleGenerateGuidance = async (questionId: string) => {
    // Encontrar a pergunta atual para pegar a situação atual
    let currentSituation = '';
    for (const module of modules) {
      for (const item of module.itens) {
        for (const nc of item.ncs) {
          const question = nc.perguntas.find(q => q.id === questionId);
          if (question) {
            currentSituation = question.response?.currentSituation || '';
            break;
          }
        }
      }
    }

    if (!currentSituation.trim()) {
      toast.error('Descreva a situação atual antes de gerar orientação');
      return;
    }

    try {
      setGeneratingGuidance(prev => ({ ...prev, [questionId]: true }));
      toast.info('Gerando orientação com IA...');

      // Chamar a API da OpenAI
      const assistantResponse = await fetch(`https://api.openai.com/v1/assistants/${OPENAI_ASSISTANT_ID}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        }
      });

      const assistantData = await assistantResponse.json();

      const threadResponse = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        },
        body: JSON.stringify({})
      });

      const threadData = await threadResponse.json();
      const threadId = threadData.id;

      await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        },
        body: JSON.stringify({
          role: "user",
          content: currentSituation
        })
      });

      const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        },
        body: JSON.stringify({
          assistant_id: OPENAI_ASSISTANT_ID,
          instructions: assistantData.instructions,
          model: assistantData.model || "gpt-4-turbo-preview"
        })
      });

      const runData = await runResponse.json();
      const runId = runData.id;

      // Polling para aguardar conclusão
      let status = runData.status;
      let attempts = 0;
      const maxAttempts = 60;

      while (!['completed', 'failed', 'cancelled', 'expired'].includes(status) && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;

        const checkResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "OpenAI-Beta": "assistants=v2"
          }
        });

        const checkData = await checkResponse.json();
        status = checkData.status;
      }

      if (status !== 'completed') {
        throw new Error('Timeout ao gerar orientação');
      }

      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v2"
        }
      });

      const messagesData = await messagesResponse.json();
      const assistantMessage = messagesData.data.find((msg: any) => msg.role === 'assistant');
      const textContent = assistantMessage.content.find((item: any) => item.type === 'text');
      const orientacao = textContent.text.value.trim();

      // Atualizar a orientação na pergunta
      setModules(prevModules =>
        prevModules.map(module => ({
          ...module,
          itens: module.itens.map(item => ({
            ...item,
            ncs: item.ncs.map(nc => ({
              ...nc,
              perguntas: nc.perguntas.map(q => {
                if (q.id === questionId) {
                  return {
                    ...q,
                    response: {
                      ...q.response,
                      aiGuidance: orientacao
                    }
                  };
                }
                return q;
              })
            }))
          }))
        }))
      );

      toast.success('Orientação gerada com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar orientação:', error);
      toast.error('Erro ao gerar orientação. Tente novamente.');
    } finally {
      setGeneratingGuidance(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleSaveProject = async () => {
    if (!projectDetails || !id) return;

    try {
      setSaving(true);
      
      // Calcular progresso geral
      const totalQuestions = modules.reduce(
        (sum, module) =>
          sum +
          module.itens.reduce(
            (itemSum, item) =>
              itemSum + item.ncs.reduce((ncSum, nc) => ncSum + nc.perguntas.length, 0),
            0
          ),
        0
      );

      const answeredQuestions = modules.reduce(
        (sum, module) =>
          sum +
          module.itens.reduce(
            (itemSum, item) =>
              itemSum +
              item.ncs.reduce(
                (ncSum, nc) =>
                  ncSum + nc.perguntas.filter((q) => q.response !== null).length,
                0
              ),
            0
          ),
        0
      );

      const progresso = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

      // Log antes de salvar
      console.log('💾 SALVANDO NO FIREBASE:');
      modules.forEach((mod, mIdx) => {
        console.log(`  Módulo ${mIdx}: ${mod.titulo}`);
        mod.itens.forEach((item, iIdx) => {
          if (item.ncs.length > 1) {
            console.log(`    ⚠️ Item "${item.titulo}" com ${item.ncs.length} NCs`);
          } else {
            console.log(`    Item "${item.titulo}" com ${item.ncs.length} NC`);
          }
        });
      });

      const projectRef = doc(db, "projetos", id);
      await updateDoc(projectRef, {
        nome: projectDetails.nome,
        weightedModules: modules,
        progresso: progresso,
        ultimaAtualizacao: new Date().toISOString(),
        atualizadoPor: userData?.uid || ''
      });

      toast.success("Projeto salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar projeto");
    } finally {
      setSaving(false);
    }
  };

  // Função para carregar presets disponíveis
  const loadPresets = async () => {
    try {
      setLoadingPresets(true);
      console.log('📦 Carregando presets...');
      const presetsRef = collection(db, 'presets');
      const presetsSnap = await getDocs(presetsRef);
      const presetsList = presetsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('✅ Presets carregados:', presetsList.length, presetsList);
      setAvailablePresets(presetsList);
    } catch (error) {
      console.error('❌ Erro ao carregar presets:', error);
      toast.error('Erro ao carregar presets');
    } finally {
      setLoadingPresets(false);
    }
  };

  // Função para importar preset selecionado
  const handleImportPreset = async () => {
    if (!selectedPresetId) {
      toast.error('Selecione um preset');
      return;
    }

    try {
      setImportingPreset(true);
      console.log('🔄 Iniciando importação do preset:', selectedPresetId);
      const selectedPreset = availablePresets.find(p => p.id === selectedPresetId);
      
      if (!selectedPreset) {
        console.error('❌ Preset não encontrado na lista');
        toast.error('Preset não encontrado');
        return;
      }

      console.log('📄 Preset selecionado:', selectedPreset);
      console.log('🔍 Estrutura do preset:', {
        hasTopicos: !!selectedPreset.topicos,
        hasAreas: !!selectedPreset.areas,
        topicosLength: selectedPreset.topicos?.length,
        areasLength: selectedPreset.areas?.length
      });

      // Converter estrutura do preset para módulos ponderados
      const newModules: ProjectModule[] = [];
      
      // Suporte para estrutura com "topicos" (antiga)
      if (selectedPreset.topicos && Array.isArray(selectedPreset.topicos)) {
        console.log('📋 Convertendo preset com estrutura "topicos"...');
        selectedPreset.topicos.forEach((topico: any, mIdx: number) => {
          const moduleId = generateUniqueId('module');
          const moduleItems: any[] = [];
          
          if (topico.perguntas && Array.isArray(topico.perguntas)) {
            topico.perguntas.forEach((pergunta: any, iIdx: number) => {
              const itemId = generateUniqueId('item');
              const ncId = generateUniqueId('nc');
              
              const weightedQuestion: WeightedQuestion = {
                id: generateUniqueId('question'),
                text: pergunta.texto || pergunta.text || 'Pergunta sem título',
                weight: pergunta.peso || 1,
                required: pergunta.obrigatorio || false,
                responseOptions: pergunta.opcoesResposta || ['na', 'very_bad', 'good'],
                response: null,
                order: iIdx + 1
              };
              
              const nc: NC = {
                id: ncId,
                numero: 1,
                ncTitulo: `NC 1`,
                perguntas: [weightedQuestion],
                pontuacaoAtual: 0,
                pontuacaoMaxima: RESPONSE_VALUES.excellent * weightedQuestion.weight,
                status: 'pending'
              };
              
              moduleItems.push({
                id: itemId,
                titulo: pergunta.texto || pergunta.text || 'Item sem título',
                ordem: iIdx + 1,
                ncs: [nc],
                pontuacaoAtual: 0,
                pontuacaoMaxima: RESPONSE_VALUES.excellent * weightedQuestion.weight
              });
            });
          }
          
          if (moduleItems.length > 0) {
            newModules.push({
              id: moduleId,
              titulo: topico.titulo || `Módulo ${mIdx + 1}`,
              ordem: mIdx + 1,
              itens: moduleItems
            });
          }
        });
      }
      // Suporte para estrutura com "areas" (nova)
      else if (selectedPreset.areas && Array.isArray(selectedPreset.areas)) {
        console.log('📋 Convertendo preset com estrutura "areas"...');
        selectedPreset.areas.forEach((area: any, mIdx: number) => {
          const moduleId = generateUniqueId('module');
          const moduleItems: any[] = [];
          
          if (area.items && Array.isArray(area.items)) {
            area.items.forEach((item: any, iIdx: number) => {
              const itemId = generateUniqueId('item');
              const ncId = generateUniqueId('nc');
              
              // Criar uma pergunta padrão para o item
              const weightedQuestion: WeightedQuestion = {
                id: generateUniqueId('question'),
                text: item.description || item.title || 'Pergunta sem título',
                weight: 2, // Peso padrão
                required: false,
                responseOptions: ['na', 'very_bad', 'good'],
                response: null,
                order: iIdx + 1
              };
              
              const nc: NC = {
                id: ncId,
                numero: 1,
                ncTitulo: `NC 1`,
                perguntas: [weightedQuestion],
                pontuacaoAtual: 0,
                pontuacaoMaxima: RESPONSE_VALUES.excellent * weightedQuestion.weight,
                status: 'pending'
              };
              
              moduleItems.push({
                id: itemId,
                titulo: item.title || 'Item sem título',
                descricao: item.description,
                ordem: item.order || iIdx + 1,
                ncs: [nc],
                pontuacaoAtual: 0,
                pontuacaoMaxima: RESPONSE_VALUES.excellent * weightedQuestion.weight
              });
            });
          }
          
          if (moduleItems.length > 0) {
            newModules.push({
              id: moduleId,
              titulo: area.name || `Módulo ${mIdx + 1}`,
              ordem: area.order || mIdx + 1,
              itens: moduleItems
            });
          }
        });
      } else {
        console.warn('⚠️ Preset sem estrutura reconhecida (nem topicos nem areas)');
        toast.error('Preset com estrutura inválida');
        return;
      }
      
      console.log('✅ Conversão concluída:', {
        modulosGerados: newModules.length,
        totalItens: newModules.reduce((acc, m) => acc + m.itens.length, 0)
      });
      
      if (newModules.length === 0) {
        console.warn('⚠️ Nenhum módulo foi gerado');
        toast.error('Preset vazio ou sem conteúdo válido');
        return;
      }
      
      // Sanitizar IDs duplicados antes de aplicar
      const sanitizedModules = sanitizeDuplicateIds(newModules);
      setModules(sanitizedModules);
      
      // Auto-selecionar primeiro item
      if (sanitizedModules.length > 0 && sanitizedModules[0].itens.length > 0) {
        setCurrentModuleId(sanitizedModules[0].id);
        setCurrentItemId(sanitizedModules[0].itens[0].id);
        setCurrentNcId(sanitizedModules[0].itens[0].ncs[0].id);
        console.log('✅ Primeiro item selecionado automaticamente');
      }
      
      setShowPresetModal(false);
      setSelectedPresetId('');
      console.log('🎉 Importação concluída com sucesso!');
      toast.success('Preset importado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao importar preset:', error);
      toast.error('Erro ao importar preset');
    } finally {
      setImportingPreset(false);
    }
  };

  // Abrir modal de preset
  const handleOpenPresetModal = () => {
    setShowPresetModal(true);
    loadPresets();
  };

  const currentModule = modules.find(m => m.id === currentModuleId);
  const currentWeightedItem = currentModule?.itens.find(i => i.id === currentItemId);
  const currentNC = currentWeightedItem?.ncs.find(nc => nc.id === currentNcId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando projeto...</p>
        </div>
      </div>
    );
  }

  if (!projectDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Projeto não encontrado</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen -m-6 overflow-hidden pt-4 md:pt-6">
      {/* Sidebar Hierárquica - Mobile: controlado externamente, Desktop: sidebar normal */}
      <HierarchicalProjectSidebar
        modules={modules}
        currentModuleId={currentModuleId}
        currentItemId={currentItemId}
        currentNcId={currentNcId}
        onNavigate={handleNavigate}
        className="h-full flex-shrink-0"
        showMobileButton={false}
        isOpen={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-hidden w-full">
        {/* Área de Conteúdo */}
        <div className="px-4 pt-2 pb-4 md:p-6 md:m-4 md:border md:border-gray-350 md:rounded-lg md:shadow-md bg-white h-[calc(100vh-3.5rem)] md:h-[calc(100vh-8rem)] overflow-y-auto">
          {currentNC ? (
            <div className="max-w-4xl mx-auto">
              {/* Header Mobile - Verde com artigo atual */}
              {currentWeightedItem && (
                <div className="md:hidden -mx-4 -mt-4 mb-4 bg-versys-primary text-white px-4 py-3">
                  <div className="flex items-start gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate("/projetos")}
                      className="h-8 w-8 text-white hover:bg-white/20 flex-shrink-0 mt-0.5"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-semibold leading-snug">
                        {currentWeightedItem.titulo}
                      </h2>
                    </div>
                  </div>
                </div>
              )}

              {/* Botão Flutuante da Estrutura do Projeto - Acompanha botões de ação */}
              <Button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden fixed right-0 z-50 h-16 w-10 rounded-l-full bg-versys-primary/60 hover:bg-versys-primary/80 backdrop-blur-sm shadow-lg p-0 flex items-center justify-center transition-all"
                style={{ top: `${floatingButtonTop}px` }}
              >
                <ChevronLeft className="h-6 w-6 text-white" />
              </Button>

              {/* Header Desktop */}
              <div className="hidden md:block bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="sm"
                      onClick={() => navigate("/projetos")}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Voltar
      </Button>
                    <div className="flex-1 max-w-md">
                      <Input
                        value={projectDetails.nome}
                        onChange={(e) => setProjectDetails({ ...projectDetails, nome: e.target.value })}
                        placeholder="Digite o nome do projeto..."
                        className="text-xl font-bold border-none p-0 h-auto bg-transparent focus-visible:ring-0 shadow-none"
                      />
      </div>
      </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-700">Progresso Geral</div>
                      <div className="text-2xl font-bold text-blue-600">{projectDetails.progresso}%</div>
            </div>
                    <Progress value={projectDetails.progresso} className="w-32" />
                    <Button onClick={handleSaveProject} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Salvando..." : "Salvar"}
                    </Button>
          </div>
        </div>
              </div>
              {/* Header do Módulo e Artigo - Apenas Desktop */}
              {currentModule && currentWeightedItem && (
                <div className="hidden md:block mb-4 bg-gradient-to-r from-versys-primary to-versys-secondary rounded-lg p-4 shadow-md text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      Módulo
              </Badge>
                    <h3 className="text-lg font-bold uppercase">{currentModule.titulo}</h3>
                      </div>
                  <div className="flex items-start gap-3 mt-3 pl-4 border-l-2 border-white/30">
                    <FileText className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{currentWeightedItem.titulo}</div>
                      {currentWeightedItem.descricao && (
                        <div className="text-xs text-white/80 mt-1">{currentWeightedItem.descricao}</div>
                      )}
                        </div>
                      </div>
                          </div>
              )}

              {/* Ações da NC */}
              <div id="nc-actions-buttons" className="mb-6 flex gap-2 justify-start">
                                <Button
                                  variant="ghost"
                                  size="icon"
                  onClick={() => addNC(currentModuleId, currentItemId)}
                                >
                  <Plus className="h-4 w-4" />
                                </Button>
                {currentWeightedItem && currentWeightedItem.ncs.length > 1 && (
                                <Button
                    variant="ghost"
                                  size="icon"
                    onClick={() => removeNC(currentModuleId, currentItemId, currentNcId)}
                  >
                    <Trash2 className="h-4 w-4" />
                                </Button>
                )}
                              </div>

              {/* Perguntas */}
              {currentNC.perguntas && currentNC.perguntas.length > 0 && (
                <div className="space-y-4">
                  {currentNC.perguntas.map((question: WeightedQuestion, index: number) => (
                    <Card key={question.id} className="shadow-sm">
                      <CardHeader className="pb-4">
                        {/* Título da NC - Editável inline */}
                        <Input
                          value={currentNC.ncTitulo}
                          onChange={(e) => {
                            setModules(prevModules =>
                              prevModules.map(module => ({
                                ...module,
                                itens: module.itens.map(item => ({
                                  ...item,
                                  ncs: item.ncs.map(nc => 
                                    nc.id === currentNcId ? { ...nc, ncTitulo: e.target.value } : nc
                                  )
                                }))
                              }))
                            );
                          }}
                          placeholder="Título da NC..."
                          className="text-lg font-semibold border-none p-0 h-auto bg-transparent focus-visible:ring-0 shadow-none mb-3 hover:bg-gray-50 px-2 py-1 -mx-2 rounded transition-colors"
                        />
                        <div className="text-sm text-gray-600 font-normal">
                          {question.text}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm text-gray-600 mb-3 block">
                            Selecione uma resposta:
                          </Label>
                          <div className="flex gap-3 flex-wrap justify-center">
                            {/* Apenas 3 opções: NC, R, N/A */}
                            <Button
                              variant={question.response?.selectedOption === 'very_bad' ? 'default' : 'outline'}
                              size="lg"
                              onClick={() => handleWeightedResponseChange(question.id, 'very_bad')}
                              className={question.response?.selectedOption === 'very_bad' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                            >
                              NC
                            </Button>
                            <Button
                              variant={question.response?.selectedOption === 'good' ? 'default' : 'outline'}
                              size="lg"
                              onClick={() => handleWeightedResponseChange(question.id, 'good')}
                              className={question.response?.selectedOption === 'good' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : ''}
                            >
                              R
                            </Button>
                            <Button
                              variant={question.response?.selectedOption === 'na' ? 'default' : 'outline'}
                              size="lg"
                              onClick={() => handleWeightedResponseChange(question.id, 'na')}
                              className={question.response?.selectedOption === 'na' ? 'bg-gray-600 hover:bg-gray-700 text-white' : ''}
                            >
                              N/A
                            </Button>
                              </div>
                            </div>

                        {/* Área de foto anexada - Oculto no mobile, visível no desktop */}
                        {questionPhotos[question.id] && (
                          <div className="hidden md:block mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-start gap-3">
                              <img 
                                src={questionPhotos[question.id].url} 
                                alt="Foto anexada" 
                                className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80"
                                onClick={() => window.open(questionPhotos[question.id].url, '_blank')}
                              />
                              <div className="flex-1 text-sm">
                                <div className="flex items-center gap-2 text-gray-600 mb-1">
                                  <Camera className="h-4 w-4" />
                                  <span>Foto anexada</span>
                            </div>
                                {questionPhotos[question.id].latitude !== 0 && (
                                  <div className="text-xs text-green-600">
                                    📍 GPS: {questionPhotos[question.id].latitude.toFixed(6)}, {questionPhotos[question.id].longitude.toFixed(6)}
                            </div>
                          )}
                                <div className="text-xs text-gray-400 mt-1">
                                  {new Date(questionPhotos[question.id].createdAt).toLocaleString('pt-BR')}
                                </div>
                                </div>
                                  <Button
                                variant="ghost" 
                                    size="sm"
                                onClick={() => setQuestionPhotos(prev => {
                                  const newPhotos = { ...prev };
                                  delete newPhotos[question.id];
                                  return newPhotos;
                                })}
                              >
                                <X className="h-4 w-4" />
                                  </Button>
                        </div>
                      </div>
                      )}

                        {/* Comentário do Usuário (único) */}
                        {question.response?.userComment && (
                          <div className="mt-4">
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-start gap-2">
                                <MessageCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm text-gray-800">{question.response.userComment}</p>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                    <span>{question.response.userCommentBy || 'Usuário'}</span>
                                    <span>•</span>
                                    <span>{question.response.userCommentDate ? new Date(question.response.userCommentDate).toLocaleString('pt-BR') : ''}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Situação Atual (editável) - Só aparece ao clicar em Comentar */}
                        {showSituacaoAtual[question.id] === true && (
                          <>
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm font-medium text-gray-700">Situação Atual</Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleGenerateGuidance(question.id)}
                                  disabled={generatingGuidance[question.id] || !question.response?.currentSituation?.trim()}
                                  className="h-8 w-8"
                                >
                                  {generatingGuidance[question.id] ? (
                                    <Clock className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <Textarea
                                id={`situacao-atual-${question.id}`}
                                value={question.response?.currentSituation || ''}
                                onChange={(e) => {
                                  setModules(prevModules =>
                                    prevModules.map(module => ({
                                      ...module,
                                      itens: module.itens.map(item => ({
                                        ...item,
                                        ncs: item.ncs.map(nc => ({
                                          ...nc,
                                          perguntas: nc.perguntas.map(q => {
                                            if (q.id === question.id) {
                                              return {
                                                ...q,
                                                response: {
                                                  ...q.response,
                                                  currentSituation: e.target.value
                                                }
                                              };
                                            }
                                            return q;
                                          })
                                        }))
                                      }))
                                    }))
                                  );
                                }}
                                placeholder="Descreva a situação atual encontrada..."
                                className="min-h-[80px] bg-amber-50 border-amber-200"
                              />
                            </div>

                            {/* Orientação da IA */}
                            {question.response?.aiGuidance && (
                              <div className="mt-4">
                                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <div className="flex items-start gap-2">
                                    <Sparkles className="h-4 w-4 text-purple-600 mt-0.5" />
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-purple-900 mb-1">Orientação (IA)</p>
                                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{question.response.aiGuidance}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Comentários antigos (compatibilidade) */}
                        {question.response?.comments && question.response.comments.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-xs text-gray-500">Comentários antigos:</p>
                            {question.response.comments.map((comment: any) => (
                              <div key={comment.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-start gap-2">
                                  <MessageCircle className="h-4 w-4 text-gray-600 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-800">{comment.text}</p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                      <span>{comment.createdByName || comment.author}</span>
                                      <span>•</span>
                                      <span>{new Date(comment.createdAt || comment.timestamp).toLocaleString('pt-BR')}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2 pt-4 border-t border-gray-200 justify-center">
                          <input
                            type="file"
                            id={`file-${question.id}`}
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleQuestionPhoto(question.id, file);
                            }}
                          />
                          
                                      <Button
                            variant="ghost" 
                                        size="sm"
                            onClick={() => {
                              if (isMobile) {
                                setPhotoDrawerOpen(question.id);
                              } else {
                                document.getElementById(`file-${question.id}`)?.click();
                              }
                            }}
                            disabled={questionPhotoUploading[question.id]}
                          >
                            {questionPhotoUploading[question.id] ? (
                              <>
                                <Clock className="h-4 w-4 mr-2 animate-spin" />
                                Processando...
                              </>
                            ) : (
                              <>
                                <Paperclip className="h-4 w-4 mr-2" />
                                Anexar Foto
                              </>
                            )}
                                      </Button>
                          
                                      <Button
                            variant="ghost" 
                                        size="sm"
                            onClick={() => {
                              // Alterna entre mostrar e ocultar
                              if (showSituacaoAtual[question.id] === true) {
                                setShowSituacaoAtual(prev => ({ ...prev, [question.id]: false }));
                              } else {
                                // Abre o campo
                                setShowSituacaoAtual(prev => ({ ...prev, [question.id]: true }));
                                
                                // Focar no campo após um delay
                                setTimeout(() => {
                                  const situacaoAtualField = document.getElementById(`situacao-atual-${question.id}`);
                                  if (situacaoAtualField) {
                                    situacaoAtualField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    setTimeout(() => situacaoAtualField.focus(), 300);
                                  }
                                }, 100);
                              }
                            }}
                                      >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            {showSituacaoAtual[question.id] === true ? 'Ocultar' : 'Comentar'}
                                      </Button>
                                    </div>
                      </CardContent>
                    </Card>
                  ))}
                                </div>
                              )}
                                </div>
          ) : modules.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Projeto Vazio</h3>
              <p className="text-gray-500 mb-6">
                Comece importando um preset ou adicione artigos manualmente para estruturar seu projeto.
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleOpenPresetModal}
                  className="bg-versys-primary hover:bg-versys-primary/90"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Importar Preset
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.info("Funcionalidade de adicionar artigos manualmente em desenvolvimento");
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Artigo
                </Button>
                                </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Selecione uma NC na sidebar para começar</p>
                            </div>
                          )}
                        </div>
        </div>

      {/* Modal de Importação de Preset */}
      <Dialog open={showPresetModal} onOpenChange={setShowPresetModal}>
        <DialogContent className="w-[90vw] max-w-[400px] sm:max-w-[450px] rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Importar Preset</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Selecione um preset para importar a estrutura de avaliação
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-3 sm:py-4">
            {loadingPresets ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-versys-primary" />
              </div>
            ) : availablePresets.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">Nenhum preset disponível</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <Label htmlFor="preset-select" className="text-sm">Selecione um preset:</Label>
                <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
                  <SelectTrigger id="preset-select" className="h-9 sm:h-10">
                    <SelectValue placeholder="Escolha um preset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePresets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id} className="text-sm">
                        {preset.nome || preset.title || 'Preset sem nome'}
                        {preset.topicos && ` (${preset.topicos.length} tópicos)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
                setShowPresetModal(false);
                setSelectedPresetId('');
            }}
            className="h-9 text-sm"
          >
              Cancelar
          </Button>
                <Button
              onClick={handleImportPreset}
              disabled={!selectedPresetId || importingPreset}
              className="bg-versys-primary hover:bg-versys-primary/90 h-9 text-sm"
            >
              {importingPreset ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Importar
                </>
              )}
        </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drawer para Adicionar Fotos (Mobile) - Lateral Esquerdo */}
      <Sheet open={photoDrawerOpen !== null} onOpenChange={(open) => !open && setPhotoDrawerOpen(null)}>
        <SheetContent side="left" className="w-[85vw] p-6 top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Fotos Anexadas</SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {/* Exibir fotos já anexadas */}
            {photoDrawerOpen && questionPhotos[photoDrawerOpen] && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Fotos anexadas:</h4>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {/* Foto à esquerda */}
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 w-[100px] h-[100px] flex-shrink-0">
                    <img 
                      src={questionPhotos[photoDrawerOpen].url} 
                      alt="Foto anexada" 
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => window.open(questionPhotos[photoDrawerOpen].url, '_blank')}
                    />
                  </div>
                  
                  {/* Informações à direita */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Camera className="h-4 w-4" />
                        <span className="text-sm">Foto anexada</span>
                      </div>
                      
                      {/* Dropdown de ações */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                            <MoreVertical className="h-4 w-4 text-gray-600" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => {
                              setQuestionPhotos(prev => {
                                const updated = { ...prev };
                                delete updated[photoDrawerOpen];
                                return updated;
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remover Foto
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {questionPhotos[photoDrawerOpen].latitude !== 0 && (
                      <div className="text-xs text-green-600 mb-2">
                        📍 GPS: {questionPhotos[photoDrawerOpen].latitude.toFixed(6)}, {questionPhotos[photoDrawerOpen].longitude.toFixed(6)}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-400">
                      {new Date(questionPhotos[photoDrawerOpen].createdAt).toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Botão para adicionar nova foto */}
            <div className="flex justify-center">
              <Button
                size="lg"
                className="rounded-full h-16 w-16 bg-versys-primary hover:bg-versys-primary/90"
                onClick={() => {
                  if (photoDrawerOpen) {
                    document.getElementById(`file-${photoDrawerOpen}`)?.click();
                  }
                }}
                disabled={photoDrawerOpen ? questionPhotoUploading[photoDrawerOpen] : false}
              >
                {photoDrawerOpen && questionPhotoUploading[photoDrawerOpen] ? (
                  <Clock className="h-8 w-8 animate-spin" />
                ) : (
                  <Plus className="h-8 w-8" />
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ProjectWrite; 
