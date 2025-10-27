import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Camera, FileText, MessageSquare, MapPin, ChevronLeft, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ProjectModule, ProjectItem, NC, WeightedQuestion } from "@/lib/types";
import { HierarchicalProjectSidebar } from "@/components/HierarchicalProjectSidebar";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { useHeaderActions } from "@/contexts/HeaderActionsContext";

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
  modules?: ProjectModule[];
}

const ClientProjectView = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { setPageTitle } = usePageTitle();
  const { setRightAction } = useHeaderActions();
  const [projectDetails, setProjectDetails] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<ProjectModule[]>([]);
  
  // Estados de navegação
  const [currentModuleId, setCurrentModuleId] = useState<string>('');
  const [currentItemId, setCurrentItemId] = useState<string>('');
  const [currentNcId, setCurrentNcId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  // Atualizar título do header quando o módulo mudar
  useEffect(() => {
    if (currentModuleId && modules.length > 0) {
      const currentModule = modules.find(m => m.id === currentModuleId);
      if (currentModule) {
        setPageTitle(currentModule.titulo);
      }
    }
  }, [currentModuleId, modules, setPageTitle]);

  // Limpar ação do header e título ao desmontar
  useEffect(() => {
    return () => {
      setRightAction(null);
      setPageTitle('');
    };
  }, [setRightAction, setPageTitle]);

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
      console.log('=== DADOS DO PROJETO (CLIENT VIEW MODE) ===', projectData);
      console.log('projectData.weightedModules:', projectData.weightedModules);
      console.log('projectData.modules:', projectData.modules);
      console.log('projectData.customAccordions:', projectData.customAccordions);
      
      // Priorizar weightedModules (novo formato de avaliação ponderada)
      let loadedModules: ProjectModule[] = [];
      
      if (projectData.weightedModules && Array.isArray(projectData.weightedModules) && projectData.weightedModules.length > 0) {
        console.log('✅ Carregando do campo weightedModules (novo formato de avaliação ponderada)');
        loadedModules = projectData.weightedModules;
      } else if (projectData.modules && Array.isArray(projectData.modules) && projectData.modules.length > 0) {
        console.log('✅ Carregando do campo modules (formato intermediário)');
        loadedModules = projectData.modules;
      } else if (projectData.customAccordions && Array.isArray(projectData.customAccordions)) {
        console.log('⚠️ Convertendo de customAccordions (formato antigo) para modules');
        
        // Agrupar itens por categoria (módulo) - mesma lógica do ProjectView.tsx
        const itemsByCategory = new Map<string, any[]>();
        
        projectData.customAccordions.forEach((accordion: any) => {
          (accordion.items || []).forEach((item: any) => {
            const category = item.category || accordion.title || 'SEM CATEGORIA';
            if (!itemsByCategory.has(category)) {
              itemsByCategory.set(category, []);
            }
            itemsByCategory.get(category)!.push(item);
          });
        });
        
        // Criar módulos a partir das categorias agrupadas
        let moduleIndex = 0;
        itemsByCategory.forEach((items, categoryName) => {
          const module: ProjectModule = {
            id: `module_${moduleIndex}`,
            titulo: categoryName,
            ordem: moduleIndex,
            itens: []
          };
          
          items.forEach((item: any, itemIndex: number) => {
            const hierItem: any = {
              id: `item_${moduleIndex}_${itemIndex}`,
              titulo: item.title,
              descricao: item.category,
              ordem: itemIndex,
              ncs: [],
              pontuacaoAtual: 0,
              pontuacaoMaxima: 0
            };
            
            // Criar uma NC para cada subItem (1 subItem = 1 NC com 1 pergunta)
            (item.subItems || []).forEach((subItem: any, ncIndex: number) => {
              // Converter evaluation antiga (nc/r/na) para nova estrutura de response
              let selectedOption: any = null;
              let score = 0;
              
              if (subItem.evaluation) {
                switch (subItem.evaluation.toLowerCase()) {
                  case 'nc':
                    selectedOption = 'very_bad';
                    score = 0;
                    break;
                  case 'r':
                    selectedOption = 'good';
                    score = 15;
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
                mediaAttachments.push(...subItem.photos.map((photo: any) => ({
                  id: photo.id || generateUniqueId('photo'),
                  type: 'image' as const,
                  url: photo.url,
                  createdAt: photo.createdAt || new Date().toISOString(),
                  latitude: photo.latitude,
                  longitude: photo.longitude
                })));
              } else if (subItem.photoData) {
                mediaAttachments.push({
                  id: generateUniqueId('photo'),
                  type: 'image' as const,
                  url: subItem.photoData.url,
                  createdAt: subItem.photoData.createdAt || new Date().toISOString(),
                  latitude: subItem.photoData.latitude,
                  longitude: subItem.photoData.longitude
                });
              }
              
              // Manter campos antigos como campos próprios
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
                  responseOptions: ['na', 'very_bad', 'good'] as any[],
                  response: selectedOption ? {
                    selectedOption,
                    score,
                    respondedAt: new Date().toISOString(),
                    respondedBy: 'legacy',
                    mediaAttachments,
                    currentSituation,
                    aiGuidance
                  } : undefined,
                  order: 0
                }],
                pontuacaoAtual: 0,
                pontuacaoMaxima: 20,
                status: 'pending' as const
              };
              
              hierItem.ncs.push(nc);
            });
            
            hierItem.pontuacaoMaxima = hierItem.ncs.reduce((sum: number, nc: NC) => sum + nc.pontuacaoMaxima, 0);
            module.itens.push(hierItem);
          });
          
          loadedModules.push(module);
          moduleIndex++;
        });
        
        console.log('✅ Conversão concluída:', loadedModules);
      } else {
        console.log('❌ Nenhum dado de avaliação encontrado');
      }
      
      console.log('loadedModules final:', loadedModules);
      
      // Sanitizar IDs duplicados antes de carregar
      const sanitizedModules = sanitizeDuplicateIds(loadedModules);
      setModules(sanitizedModules);

      // Inicializar navegação com o primeiro módulo/item/nc disponível
      if (sanitizedModules.length > 0) {
        const firstModule = sanitizedModules[0];
        setCurrentModuleId(firstModule.id);
        
        if (firstModule.itens && firstModule.itens.length > 0) {
          const firstItem = firstModule.itens[0];
          setCurrentItemId(firstItem.id);
          
          if (firstItem.ncs && firstItem.ncs.length > 0) {
            setCurrentNcId(firstItem.ncs[0].id);
          }
        }
      }

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
        modules: loadedModules
      });
    } catch (error) {
      console.error('Erro ao carregar projeto:', error);
      toast.error('Erro ao carregar projeto');
      navigate("/client-projects");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (moduleId: string, itemId: string, ncId?: string) => {
    setCurrentModuleId(moduleId);
    setCurrentItemId(itemId);
    if (ncId) {
      setCurrentNcId(ncId);
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

  const getResponseText = (option: string | null | undefined) => {
    switch (option) {
      case 'very_bad': return 'NC';
      case 'good': return 'R';
      case 'na': return 'N/A';
      default: return 'Não Respondida';
    }
  };

  const getResponseColor = (option: string | null | undefined) => {
    switch (option) {
      case 'very_bad': return 'bg-red-100 text-red-800 border-red-200';
      case 'good': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'na': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  // Encontrar módulo, item e NC atual
  const currentModule = modules.find(m => m.id === currentModuleId);
  const currentItem = currentModule?.itens.find(i => i.id === currentItemId);
  const currentNC = currentItem?.ncs.find(nc => nc.id === currentNcId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-versys-primary mx-auto"></div>
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
          <Button onClick={() => navigate("/client-projects")} className="mt-4">
            Voltar aos Projetos
        </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen -m-6 overflow-hidden pt-14 md:pt-16">
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
        {/* Conteúdo */}
        <div className="p-4 md:p-6 md:m-4 md:border md:border-gray-350 md:rounded-lg md:shadow-md bg-white h-[calc(100vh-3.5rem)] md:h-[calc(100vh-8rem)] overflow-y-auto">
          {currentNC && currentItem && currentModule ? (
            <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
              {/* Header Mobile - Verde com artigo atual */}
              <div className="md:hidden -mx-4 -mt-4 mb-4 bg-versys-primary text-white px-4 py-3">
                <div className="flex items-start gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/client-projects")}
                    className="h-8 w-8 text-white hover:bg-white/20 flex-shrink-0 mt-0.5"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold leading-snug">
                      {currentItem.titulo}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Botão Flutuante da Estrutura do Projeto - Posição central */}
              <Button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden fixed right-0 top-[30%] -translate-y-1/2 z-50 h-16 w-10 rounded-l-full bg-versys-primary/60 hover:bg-versys-primary/80 backdrop-blur-sm shadow-lg p-0 flex items-center justify-center transition-all"
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
        onClick={() => navigate("/client-projects")}
      >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Voltar
      </Button>
          <div>
                      <h1 className="text-xl font-bold text-gray-900">{projectDetails.nome}</h1>
          </div>
        </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-700">Progresso Geral</div>
                      <div className="text-2xl font-bold text-blue-600">{projectDetails.progresso}%</div>
      </div>
                    <Progress
                      value={projectDetails.progresso}
                      className="w-32 h-4"
                    />
            </div>
          </div>
              </div>

              {/* Header do Módulo e Item (Artigo) - Apenas Desktop */}
              <div className="hidden md:block bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="mb-4">
                  <Badge variant="outline" className="mb-2">
                    {currentModule.titulo}
                  </Badge>
                  <h2 className="text-xl font-bold text-gray-900">{currentItem.titulo}</h2>
                  {currentItem.descricao && (
                    <p className="text-gray-600 mt-2">{currentItem.descricao}</p>
                  )}
                </div>
              </div>

              {/* Perguntas */}
              <div className="space-y-4">
                {currentNC.perguntas && currentNC.perguntas.length > 0 ? (
                  currentNC.perguntas.map((question: WeightedQuestion, index: number) => (
                    <div
                      key={question.id}
                      className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
                    >
                      {/* Cabeçalho da NC e Pergunta */}
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {currentNC.ncTitulo}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {question.text}
                        </p>
          </div>

                      {/* Resposta */}
                      {question.response ? (
                        <div className="space-y-3">
                          {/* Opção Selecionada */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600">Resposta:</span>
                            <Badge
                              className={`text-sm px-3 py-1 border font-semibold ${getResponseColor(question.response.selectedOption)}`}
                            >
                              {getResponseText(question.response.selectedOption)}
            </Badge>
        </div>

                          {/* Fotos */}
                          {question.response.mediaAttachments && question.response.mediaAttachments.length > 0 && (
                            <div className="border-t pt-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Camera className="h-4 w-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">Fotos Anexadas</span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {question.response.mediaAttachments.map((media, idx) => (
                                  <div key={idx} className="relative">
                                    <img
                                      src={media.url}
                                      alt={`Foto ${idx + 1}`}
                                      className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => window.open(media.url, '_blank')}
                                    />
                                    {media.latitude && media.longitude && (
                                      <a
                                        href={`https://www.google.com/maps?q=${media.latitude},${media.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute bottom-2 right-2 bg-white rounded-full p-1.5 shadow-md hover:bg-gray-100"
                                        title="Ver localização no mapa"
                                      >
                                        <MapPin className="h-3 w-3 text-blue-600" />
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Comentário do Usuário */}
                          {question.response.userComment && (
                            <div className="border-t pt-3">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium text-gray-700">Comentário</span>
                              </div>
                              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                <p className="text-sm text-gray-800">{question.response.userComment}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {question.response.userCommentBy} • {question.response.userCommentDate ? new Date(question.response.userCommentDate).toLocaleString('pt-BR') : ''}
                                </p>
                              </div>
                        </div>
                          )}

                          {/* Situação Atual */}
                          {question.response.currentSituation && (
                            <div className="border-t pt-3">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                <span className="text-sm font-medium text-gray-700">Situação Atual</span>
                              </div>
                              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                                <p className="text-sm text-gray-800">{question.response.currentSituation}</p>
                              </div>
                                </div>
                              )}
                              
                          {/* Orientação (IA) */}
                          {question.response.aiGuidance && (
                            <div className="border-t pt-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-4 w-4 text-purple-500" />
                                <span className="text-sm font-medium text-gray-700">Orientação</span>
                              </div>
                              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{question.response.aiGuidance}</p>
                                  </div>
                                </div>
                              )}
                              
                          {/* Comentários antigos (compatibilidade) */}
                          {question.response.comments && question.response.comments.length > 0 && (
                            <div className="border-t pt-3">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="h-4 w-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">Comentários (sistema antigo)</span>
                                    </div>
                              <div className="space-y-2">
                                {question.response.comments.map((comment: any, idx) => (
                                  <div key={idx} className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-sm text-gray-800">{comment.text}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {comment.createdByName || comment.author || 'Sistema'} • {new Date(comment.createdAt || comment.timestamp).toLocaleString('pt-BR')}
                                    </p>
                                      </div>
                                    ))}
                              </div>
                          </div>
                        )}
                      </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                          <p className="text-sm">Esta pergunta ainda não foi respondida</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhuma pergunta cadastrada para esta NC</p>
                </div>
            )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  Selecione uma NC na sidebar para visualizar seu conteúdo
                </p>
              </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientProjectView;
