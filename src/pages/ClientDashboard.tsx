import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Building, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  User,
  ClipboardCheck,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  MessageSquare,
  Send,
  Eye,
  FileText,
  AlertCircleIcon,
  Paperclip,
  Image,
  X,
  Upload
} from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { collection, query, orderBy, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { testClientProjects } from "@/lib/testClientProjects";

interface SubItem {
  id: string;
  title: string;
  evaluation: "nc" | "r" | "na" | "";
  completed: boolean;
  clientResponse?: string;
  adminFeedback?: string;
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
  solicitacoes?: Array<{
    id: string;
    titulo: string;
    descricao: string;
    status: "Pendente" | "Em Análise" | "Atendida" | "Rejeitada";
    dataLimite?: string;
    comentarios?: string;
    criadoPor: string;
    criadoEm: string;
    respostas?: Array<{
      id: string;
      autor: string;
      mensagem: string;
      dataResposta: string;
      anexos?: string[];
    }>;
  }>;
  comunicacoes?: Array<{
    id: string;
    de: string;
    para: string;
    assunto: string;
    mensagem: string;
    data: string;
    tipo: "info" | "solicitacao" | "alerta" | "resposta";
    lida: boolean;
  }>;
}

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { userData, logout: authLogout } = useAuthContext();
  const [projectDetails, setProjectDetails] = useState<ProjectDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnalysisDetail, setShowAnalysisDetail] = useState<{[key: string]: boolean}>({});
  const [adequacyReports, setAdequacyReports] = useState<{[key: string]: string}>({});
  const [adequacyImages, setAdequacyImages] = useState<{[key: string]: File[]}>({});

  const [updatingItem, setUpdatingItem] = useState<{ [itemId: string]: boolean }>({});

  useEffect(() => {
    console.log('🔍 ClientDashboard: userData atualizado:', userData);
    
    // Se não há usuário autenticado, redireciona para login
    if (!userData) {
      console.log('❌ ClientDashboard: Nenhum usuário autenticado, redirecionando para login');
      navigate("/");
      return;
    }

    // Se o usuário não é do tipo cliente, redireciona para dashboard admin
    if (userData.type !== "client") {
      console.log('❌ ClientDashboard: Usuário não é cliente, redirecionando para dashboard admin');
      console.log('🔍 ClientDashboard: Tipo do usuário:', userData.type);
      navigate("/dashboard");
      return;
    }

    console.log('✅ ClientDashboard: Cliente autenticado, carregando projetos...');
    console.log('🔍 ClientDashboard: UID do cliente:', userData.uid);
    console.log('🔍 ClientDashboard: Email do cliente:', userData.email);
    console.log('🔍 ClientDashboard: Company do cliente:', userData.company);
    
    // Executar teste de diagnóstico
    testClientProjects(userData.uid).then(result => {
      console.log('🧪 Resultado do teste:', result);
    }).catch(error => {
      console.error('🧪 Erro no teste:', error);
    });
    
    loadClientProjects();
  }, [navigate, userData]);

  const loadClientProjects = async () => {
    if (!userData?.uid) return;
    
    try {
      setLoading(true);
      
      console.log('🔍 ClientDashboard: Buscando projetos para cliente:', userData.uid);
      
      // Primeiro, vamos buscar todos os projetos e filtrar manualmente para debug
      const projetosRef = collection(db, 'projetos');
      
      // Tentar sem orderBy primeiro para evitar problemas de índice
      let allProjectsSnapshot;
      try {
        const allProjectsQuery = query(projetosRef, orderBy('dataCriacao', 'desc'));
        allProjectsSnapshot = await getDocs(allProjectsQuery);
        console.log('✅ Query com orderBy funcionou');
      } catch (indexError) {
        console.log('⚠️ Query com orderBy falhou, tentando sem orderBy:', indexError);
        allProjectsSnapshot = await getDocs(projetosRef);
      }
      
      console.log('🔍 Total de projetos no Firebase:', allProjectsSnapshot.size);
      
      // Filtrar projetos do cliente atual
      const projetosData = allProjectsSnapshot.docs
        .filter(doc => {
          const data = doc.data();
          
          // Múltiplas verificações para garantir que encontramos o cliente
          const clienteId = data.cliente?.id;
          const userUid = userData.uid;
          
          console.log('🔍 Verificando projeto:', {
            projetoId: doc.id,
            nome: data.nome,
            clienteId: clienteId,
            userUid: userUid,
            clienteCompleto: data.cliente
          });
          
          // Verificar se os IDs coincidem (com verificação de string)
          const isMatch = clienteId === userUid || 
                         String(clienteId) === String(userUid) ||
                         (data.cliente?.email === userData.email);
          
          console.log('🎯 Match encontrado:', isMatch);
          
          return isMatch;
        })
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            nome: data.nome,
            status: data.status || 'Iniciado',
            progresso: calculateProgress(data.customAccordions || data.itens || []),
            dataInicio: data.dataInicio,
            previsaoConclusao: data.previsaoConclusao,
            consultor: data.consultor || 'Não definido',
            cliente: data.cliente,
            observacoes: data.observacoes || '',
            customAccordions: data.customAccordions || [],
            itens: data.itens || [],
            solicitacoes: data.solicitacoes || [],
            comunicacoes: data.comunicacoes || []
          };
        }) as ProjectDetail[];
      
      setProjectDetails(projetosData);
      console.log('✅ Projetos do cliente carregados:', projetosData.length);
      
      // Verificar se há imagens salvas
      projetosData.forEach(project => {
        project.customAccordions?.forEach(accordion => {
          accordion.items.forEach(item => {
            item.subItems.forEach(subItem => {
              if (subItem.adequacyImages && subItem.adequacyImages.length > 0) {
                console.log(`🖼️ Projeto ${project.nome} - Item ${subItem.title} tem ${subItem.adequacyImages.length} imagens salvas`);
              }
            });
          });
        });
      });
      

      
    } catch (error) {
      console.error('❌ Erro ao carregar projetos do cliente:', error);
      toast.error('Erro ao carregar seus projetos');
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

  const handleItemCompletion = async (projectId: string, accordionId: string, itemId: string, subItemId: string, completed: boolean, clientResponse?: string) => {
    const itemKey = `${projectId}_${itemId}_${subItemId}`;
    
    try {
      setUpdatingItem(prev => ({ ...prev, [itemKey]: true }));
      
      // Atualizar no estado local primeiro
      setProjectDetails(prev => prev.map(project => {
        if (project.id === projectId) {
          const updatedAccordions = project.customAccordions?.map(accordion => {
            if (accordion.id === accordionId) {
              return {
                ...accordion,
                items: accordion.items.map(item => {
                  if (item.id === itemId) {
                    return {
                      ...item,
                      subItems: item.subItems.map(subItem => {
                        if (subItem.id === subItemId) {
                          return {
                            ...subItem,
                            completed,
                            clientResponse: clientResponse || subItem.clientResponse
                          };
                        }
                        return subItem;
                      })
                    };
                  }
                  return item;
                })
              };
            }
            return accordion;
          });
          
          return {
            ...project,
            customAccordions: updatedAccordions,
            progresso: calculateProgress(updatedAccordions || [])
          };
        }
        return project;
      }));
      
      // Atualizar no Firebase
      const projectRef = doc(db, 'projetos', projectId);
      const project = projectDetails.find(p => p.id === projectId);
      
      if (project) {
        const updatedAccordions = project.customAccordions?.map(accordion => {
          if (accordion.id === accordionId) {
            return {
              ...accordion,
              items: accordion.items.map(item => {
                if (item.id === itemId) {
                  return {
                    ...item,
                    subItems: item.subItems.map(subItem => {
                      if (subItem.id === subItemId) {
                        return {
                          ...subItem,
                          completed,
                          clientResponse: clientResponse || subItem.clientResponse
                        };
                      }
                      return subItem;
                    })
                  };
                }
                return item;
              })
            };
          }
          return accordion;
        });
        
        await updateDoc(projectRef, {
          customAccordions: updatedAccordions,
          progresso: calculateProgress(updatedAccordions || [])
        });
        
        toast.success(completed ? 'Item marcado como concluído!' : 'Item desmarcado');
      }
      
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast.error('Erro ao atualizar item');
      
      // Reverter mudança local em caso de erro
      loadClientProjects();
    } finally {
      setUpdatingItem(prev => ({ ...prev, [itemKey]: false }));
    }
  };

  const handleAdequacyReport = async (projectId: string, accordionId: string, itemId: string, subItemId: string, adequacyDetails: string) => {
    const itemKey = `${projectId}_${itemId}_${subItemId}`;
    
    try {
      setUpdatingItem(prev => ({ ...prev, [itemKey]: true }));
      
      // Converter imagens para Base64
      let imageBase64: string[] = [];
      try {
        imageBase64 = await convertImagesToBase64(itemKey);
        console.log('📸 Imagens convertidas para Base64:', imageBase64.length, 'imagens');
        imageBase64.forEach((img, index) => {
          console.log(`📸 Imagem ${index + 1} - Tamanho:`, img.length, 'caracteres');
        });
      } catch (convertError) {
        console.error('Erro ao converter imagens:', convertError);
        toast.error('Erro ao processar as imagens. Tente novamente.');
        return;
      }
      
      // Atualizar no estado local primeiro
      setProjectDetails(prev => prev.map(project => {
        if (project.id === projectId) {
          const updatedAccordions = project.customAccordions?.map(accordion => {
            if (accordion.id === accordionId) {
              return {
                ...accordion,
                items: accordion.items.map(item => {
                  if (item.id === itemId) {
                    return {
                      ...item,
                      subItems: item.subItems.map(subItem => {
                        if (subItem.id === subItemId) {
                          return {
                            ...subItem,
                            adequacyReported: true,
                            adequacyDetails,
                            adequacyImages: imageBase64,
                            adequacyDate: new Date().toISOString(),
                            adequacyStatus: "pending" as "pending"
                          };
                        }
                        return subItem;
                      })
                    };
                  }
                  return item;
                })
              };
            }
            return accordion;
          });
          
          return {
            ...project,
            customAccordions: updatedAccordions
          };
        }
        return project;
      }));
      
      // Atualizar no Firebase
      const projectRef = doc(db, 'projetos', projectId);
      const project = projectDetails.find(p => p.id === projectId);
      
      if (project) {
        const updatedAccordions = project.customAccordions?.map(accordion => {
          if (accordion.id === accordionId) {
            return {
              ...accordion,
              items: accordion.items.map(item => {
                if (item.id === itemId) {
                  return {
                    ...item,
                    subItems: item.subItems.map(subItem => {
                      if (subItem.id === subItemId) {
                        return {
                          ...subItem,
                          adequacyReported: true,
                          adequacyDetails,
                          adequacyImages: imageBase64,
                          adequacyDate: new Date().toISOString(),
                          adequacyStatus: "pending" as "pending"
                        };
                      }
                      return subItem;
                    })
                  };
                }
                return item;
              })
            };
          }
          return accordion;
        });
        
        console.log('💾 Salvando no Firestore - Imagens:', imageBase64.length);
        
        // Verificar tamanho do documento
        const documentSize = JSON.stringify(updatedAccordions).length;
        console.log('📊 Tamanho do documento:', documentSize, 'bytes');
        
        if (documentSize > 1000000) { // 1MB
          console.warn('⚠️ Documento muito grande:', documentSize, 'bytes');
          toast.error('Documento muito grande. Reduza o número de imagens.');
          return;
        }
        
        await updateDoc(projectRef, {
          customAccordions: updatedAccordions
        });
        
        console.log('✅ Adequação salva no Firestore com sucesso!');
        
        // Limpar o campo de adequação
        setAdequacyReports(prev => ({ ...prev, [itemKey]: '' }));
        setAdequacyImages(prev => ({ ...prev, [itemKey]: [] }));
        
        toast.success('Adequação reportada com sucesso! Aguarde a análise.');
      }
      
    } catch (error) {
      console.error('Erro ao reportar adequação:', error);
      toast.error('Erro ao reportar adequação');
    } finally {
      setUpdatingItem(prev => ({ ...prev, [itemKey]: false }));
    }
  };

  const handleImageUpload = (itemKey: string, files: FileList) => {
    const validFiles = Array.from(files).filter(file => {
      const isImage = file.type.startsWith('image/');
      const maxSize = 750 * 1024; // 750KB (otimizado para Base64)
      
      if (!isImage) {
        toast.error('Apenas arquivos de imagem são permitidos');
        return false;
      }
      
      if (file.size > maxSize) {
        toast.error('Arquivo muito grande. Máximo 750KB por imagem para garantir performance');
        return false;
      }
      
      return true;
    });

    // Verificar limite de quantidade (máximo 5 imagens)
    const currentImages = adequacyImages[itemKey] || [];
    const maxImages = 5;
    
    if (currentImages.length + validFiles.length > maxImages) {
      toast.error(`Máximo ${maxImages} imagens por adequação`);
      return;
    }

    if (validFiles.length > 0) {
      setAdequacyImages(prev => ({
        ...prev,
        [itemKey]: [...(prev[itemKey] || []), ...validFiles]
      }));
    }
  };

  const removeImage = (itemKey: string, index: number) => {
    setAdequacyImages(prev => ({
      ...prev,
      [itemKey]: prev[itemKey]?.filter((_, i) => i !== index) || []
    }));
  };



  const convertImagesToBase64 = async (itemKey: string): Promise<string[]> => {
    const images = adequacyImages[itemKey] || [];
    const base64Promises = images.map(async (file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          resolve(base64);
        };
        reader.onerror = () => {
          reject(new Error(`Erro ao converter ${file.name} para Base64`));
        };
        reader.readAsDataURL(file);
      });
    });

    return await Promise.all(base64Promises);
  };

  const getAnalysisStatusInfo = (subItem: SubItem) => {
    if (subItem.evaluation === "nc") {
      return {
        status: "Não Conforme",
        color: "text-red-700",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        icon: <XCircle className="h-4 w-4 text-red-600" />
      };
    } else if (subItem.evaluation === "r") {
      return {
        status: "Requer Atenção",
        color: "text-yellow-700",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />
      };
    } else if (subItem.evaluation === "na") {
      return {
        status: "Não Aplicável",
        color: "text-gray-700",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        icon: <CheckCircle2 className="h-4 w-4 text-gray-600" />
      };
    } else {
      return {
        status: "Pendente de Análise",
        color: "text-blue-700",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        icon: <Clock className="h-4 w-4 text-blue-600" />
      };
    }
  };

  const getAdequacyStatusInfo = (subItem: SubItem) => {
    if (subItem.adequacyStatus === "approved") {
      return {
        status: "Adequação Aprovada",
        color: "text-green-700",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        icon: <CheckCircle2 className="h-4 w-4 text-green-600" />
      };
    } else if (subItem.adequacyStatus === "rejected") {
      return {
        status: "Adequação Rejeitada",
        color: "text-red-700",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        icon: <XCircle className="h-4 w-4 text-red-600" />
      };
    } else if (subItem.adequacyStatus === "pending") {
      return {
        status: "Aguardando Análise",
        color: "text-orange-700",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        icon: <Clock className="h-4 w-4 text-orange-600" />
      };
    }
    return null;
  };

  const toggleAnalysisDetail = (itemKey: string) => {
    setShowAnalysisDetail(prev => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }));
  };

  const handleLogout = async () => {
    try {
      await authLogout();
      navigate('/');
      toast.success('Logout realizado com sucesso!');
    } catch (error) {
      console.error('Erro no logout:', error);
      toast.error('Erro ao fazer logout');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Concluído": return "bg-green-100 text-green-800";
      case "Em Andamento": return "bg-blue-100 text-blue-800";
      case "Aguardando Documentos": return "bg-yellow-100 text-yellow-800";
      case "Em Revisão": return "bg-purple-100 text-purple-800";
      case "Pendente": return "bg-gray-100 text-gray-800";
      case "Iniciado": return "bg-indigo-100 text-indigo-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };



  const getSubItemStatusIcon = (subItem: SubItem) => {
    if (subItem.completed) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    if (subItem.evaluation === "nc") {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    if (subItem.evaluation === "r") {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-versys-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">


        {projectDetails.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum projeto encontrado
              </h3>
              <p className="text-gray-600">
                Você ainda não possui projetos ativos. Entre em contato com nossa equipe.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {projectDetails.map((project) => (
              <Card key={project.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-versys-primary to-versys-secondary text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl font-bold mb-2">
                        {project.nome}
                      </CardTitle>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>Consultor: {project.consultor}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            Iniciado em: {new Date(project.dataInicio).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge 
                      className={`${getStatusColor(project.status)} text-sm px-3 py-1`}
                    >
                      {project.status}
                    </Badge>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Progresso Geral</span>
                      <span className="text-sm font-bold">{project.progresso}%</span>
                    </div>
                    <Progress 
                      value={project.progresso} 
                      className="h-3 bg-white/20"
                    />
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {/* Lista de Verificação */}
                  <div>
                      <div className="mb-4">
                                                            <h3 className="text-lg font-semibold text-versys-primary mb-2">
                                      Itens para Verificação
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                      Marque os itens conforme você os completa. Cada item marcado contribui para o progresso geral do projeto.
                                    </p>

                      </div>

                      {project.customAccordions && project.customAccordions.length > 0 ? (
                        <Accordion type="multiple" className="w-full">
                          {project.customAccordions.map((accordion) => (
                            <AccordionItem key={accordion.id} value={accordion.id}>
                              <AccordionTrigger className="text-left font-medium">
                                <div className="flex items-center justify-between w-full pr-4">
                                  <span>{accordion.title}</span>
                                  <div className="flex items-center space-x-2">
                                    <Progress
                                      value={calculateProgress([accordion])}
                                      className="w-20 h-2"
                                    />
                                    <span className="text-xs text-gray-500">
                                      {calculateProgress([accordion])}%
                                    </span>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-4 pt-4">
                                  {accordion.items.map((item) => (
                                    <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                                      <h4 className="font-medium text-gray-900 mb-2">
                                        {item.title}
                                      </h4>
                                      <p className="text-sm text-gray-600 mb-3">
                                        Categoria: {item.category}
                                      </p>
                                      
                                      <div className="space-y-4">
                                        {item.subItems.map((subItem) => {
                                          const itemKey = `${project.id}_${item.id}_${subItem.id}`;
                                          const analysisStatus = getAnalysisStatusInfo(subItem);
                                          const adequacyStatus = getAdequacyStatusInfo(subItem);
                                          

                                          
                                          return (
                                            <div key={subItem.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                                              {/* Cabeçalho com informações principais */}
                                              <div className="bg-gray-50 px-4 py-3 border-b">
                                                <div className="flex items-start justify-between">
                                                  <div className="flex-1">
                                                    <h4 className="font-semibold text-gray-900 mb-1">
                                                      📄 {subItem.title}
                                                    </h4>
                                                    <div className="flex items-center space-x-4">
                                                      <div className="flex items-center space-x-2">
                                                        {analysisStatus.icon}
                                                        <span className={`text-xs font-medium ${analysisStatus.color}`}>
                                                          Avaliação: {analysisStatus.status}
                                                        </span>
                                                      </div>
                                                      {adequacyStatus && (
                                                        <div className="flex items-center space-x-2">
                                                          {adequacyStatus.icon}
                                                          <span className={`text-xs font-medium ${adequacyStatus.color}`}>
                                                            {adequacyStatus.status}
                                                          </span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center space-x-2">
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => toggleAnalysisDetail(itemKey)}
                                                      className="text-versys-primary hover:text-versys-primary/80"
                                                    >
                                                      <Eye className="h-4 w-4 mr-1" />
                                                      {showAnalysisDetail[itemKey] ? 'Ocultar' : 'Ver'} Detalhes
                                                    </Button>
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              
                                              {/* Detalhes expandidos */}
                                              {showAnalysisDetail[itemKey] && (
                                                <div className="border-t bg-gray-50 p-4">
                                                  <div className="space-y-4">
                                                    {/* Resumo da avaliação */}
                                                    <div className="bg-white p-4 rounded-lg border">
                                                      <h5 className="text-sm font-semibold text-gray-800 mb-3">
                                                        📊 Resumo Completo do Item:
                                                      </h5>
                                                      <div className="space-y-4">
                                                        <div>
                                                          <span className="font-medium text-gray-600">📄 Nome do Item:</span>
                                                          <p className="text-gray-900 mt-1">{subItem.title}</p>
                                                        </div>
                                                        
                                                        <div>
                                                          <span className="font-medium text-gray-600">🔍 Avaliação:</span>
                                                          <p className={`font-medium mt-1 ${analysisStatus.color}`}>
                                                            {analysisStatus.status}
                                                          </p>
                                                        </div>
                                                        
                                                        {subItem.currentSituation && (
                                                          <div>
                                                            <span className="font-medium text-gray-600">📋 Situação Atual:</span>
                                                            <p className="text-gray-900 mt-1">{subItem.currentSituation}</p>
                                                          </div>
                                                        )}
                                                        
                                                        {subItem.description && (
                                                          <div>
                                                            <span className="font-medium text-gray-600">📝 Descrição/Orientação para o Cliente:</span>
                                                            <p className="text-gray-900 mt-1">{subItem.description}</p>
                                                          </div>
                                                        )}
                                                        
                                                        {subItem.adminFeedback && (
                                                          <div>
                                                            <span className="font-medium text-gray-600">💬 Observações do Consultor:</span>
                                                            <p className="text-gray-900 mt-1">{subItem.adminFeedback}</p>
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                    
                                                    {/* Formulário de adequação */}
                                                    {(subItem.evaluation === "nc" || subItem.evaluation === "r") && !subItem.adequacyReported && (
                                                      <div className="bg-white p-3 rounded-lg border">
                                                        <h5 className="text-sm font-semibold text-gray-800 mb-2">
                                                          <MessageSquare className="h-4 w-4 inline mr-1" />
                                                          Reportar Adequação Realizada:
                                                        </h5>
                                                        <Textarea
                                                          placeholder="Descreva detalhadamente as adequações realizadas para este item..."
                                                          value={adequacyReports[itemKey] || ''}
                                                          onChange={(e) => {
                                                            setAdequacyReports(prev => ({
                                                              ...prev,
                                                              [itemKey]: e.target.value
                                                            }));
                                                          }}
                                                          className="text-sm mb-3"
                                                          rows={4}
                                                        />
                                                        
                                                        {/* Seção de anexar imagens */}
                                                        <div className="mb-3">
                                                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                                                            <Image className="h-4 w-4 inline mr-1" />
                                                            Anexar Fotos Comprobatórias:
                                                          </label>
                                                          <div className="flex flex-wrap gap-2 mb-2">
                                                            {adequacyImages[itemKey]?.map((file, index) => (
                                                              <div key={index} className="relative">
                                                                <img
                                                                  src={URL.createObjectURL(file)}
                                                                  alt={`Anexo ${index + 1}`}
                                                                  className="w-20 h-20 object-cover rounded-lg border"
                                                                />
                                                                <button
                                                                  onClick={() => removeImage(itemKey, index)}
                                                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
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
                                                                  handleImageUpload(itemKey, e.target.files);
                                                                }
                                                              }}
                                                              className="hidden"
                                                              id={`image-upload-${itemKey}`}
                                                            />
                                                            <label
                                                              htmlFor={`image-upload-${itemKey}`}
                                                              className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                                            >
                                                              <Upload className="h-4 w-4 mr-1" />
                                                              Anexar Imagens
                                                            </label>
                                                            <span className="text-xs text-gray-500">
                                                              Máximo 750KB por imagem (máximo 5 imagens)
                                                            </span>
                                                          </div>
                                                        </div>
                                                        
                                                        <Button
                                                          onClick={() => {
                                                            if (adequacyReports[itemKey]?.trim()) {
                                                              handleAdequacyReport(
                                                                project.id,
                                                                accordion.id,
                                                                item.id,
                                                                subItem.id,
                                                                adequacyReports[itemKey]
                                                              );
                                                            }
                                                          }}
                                                          disabled={!adequacyReports[itemKey]?.trim() || updatingItem[itemKey]}
                                                          size="sm"
                                                          className="bg-versys-primary hover:bg-versys-primary/90"
                                                        >
                                                          <Send className="h-4 w-4 mr-1" />
                                                          Enviar Adequação
                                                        </Button>
                                                      </div>
                                                    )}
                                                    
                                                    {/* Adequação já reportada */}
                                                    {subItem.adequacyReported && (
                                                      <div className="bg-white p-3 rounded-lg border">
                                                        <h5 className="text-sm font-semibold text-gray-800 mb-2">
                                                          <CheckCircle className="h-4 w-4 inline mr-1" />
                                                          Adequação Reportada:
                                                        </h5>
                                                        
                                                        {adequacyStatus && (
                                                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-3 ${adequacyStatus.bgColor} ${adequacyStatus.color}`}>
                                                            {adequacyStatus.icon}
                                                            <span className="ml-1">{adequacyStatus.status}</span>
                                                          </div>
                                                        )}
                                                        
                                                        {subItem.adequacyDetails && (
                                                          <div className="mb-3">
                                                            <span className="font-medium text-gray-600">📝 Descrição da Adequação:</span>
                                                            <p className="text-gray-900 mt-1 text-sm">{subItem.adequacyDetails}</p>
                                                          </div>
                                                        )}
                                                        
                                                        {subItem.adequacyImages && subItem.adequacyImages.length > 0 && (
                                                          <div className="mb-3">
                                                            <span className="font-medium text-gray-600">📷 Fotos Comprobatórias ({subItem.adequacyImages.length}):</span>
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                              {subItem.adequacyImages.map((imageBase64, index) => {
                                                                console.log(`🖼️ Carregando imagem ${index + 1} - Tamanho:`, imageBase64.length, 'caracteres');
                                                                return (
                                                                  <div key={index} className="relative">
                                                                    <img
                                                                      src={imageBase64}
                                                                      alt={`Adequação ${index + 1}`}
                                                                      className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                                                                      onLoad={() => console.log(`✅ Imagem ${index + 1} carregada com sucesso`)}
                                                                      onError={() => console.error(`❌ Erro ao carregar imagem ${index + 1}`)}
                                                                      onClick={() => {
                                                                        // Criar modal para visualizar imagem em tamanho maior
                                                                        const modal = document.createElement('div');
                                                                        modal.innerHTML = `
                                                                          <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000;" onclick="this.remove()">
                                                                            <img src="${imageBase64}" style="max-width: 90%; max-height: 90%; object-fit: contain;" alt="Imagem ampliada" />
                                                                          </div>
                                                                        `;
                                                                        document.body.appendChild(modal);
                                                                      }}
                                                                    />
                                                                  </div>
                                                                );
                                                              })}
                                                            </div>
                                                          </div>
                                                        )}
                                                        
                                                        {subItem.adequacyDate && (
                                                          <div className="text-xs text-gray-500">
                                                            <Clock className="h-3 w-3 inline mr-1" />
                                                            Reportada em: {new Date(subItem.adequacyDate).toLocaleDateString('pt-BR')} às {new Date(subItem.adequacyDate).toLocaleTimeString('pt-BR')}
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}
                                                    
                                                    {/* Observações do cliente */}
                                                    {subItem.completed && (
                                                      <div className="bg-white p-3 rounded-lg border">
                                                        <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                                                          💬 Suas observações sobre este item:
                                                        </Label>
                                                        <Textarea
                                                          placeholder="Adicione observações sobre este item (opcional)"
                                                          value={subItem.clientResponse || ''}
                                                          onChange={(e) => {
                                                            // Atualizar localmente primeiro
                                                            setProjectDetails(prev => prev.map(p => {
                                                              if (p.id === project.id) {
                                                                const updatedAccordions = p.customAccordions?.map(acc => {
                                                                  if (acc.id === accordion.id) {
                                                                    return {
                                                                      ...acc,
                                                                      items: acc.items.map(itm => {
                                                                        if (itm.id === item.id) {
                                                                          return {
                                                                            ...itm,
                                                                            subItems: itm.subItems.map(subItm => {
                                                                              if (subItm.id === subItem.id) {
                                                                                return {
                                                                                  ...subItm,
                                                                                  clientResponse: e.target.value
                                                                                };
                                                                              }
                                                                              return subItm;
                                                                            })
                                                                          };
                                                                        }
                                                                        return itm;
                                                                      })
                                                                    };
                                                                  }
                                                                  return acc;
                                                                });
                                                                return { ...p, customAccordions: updatedAccordions };
                                                              }
                                                              return p;
                                                            }));
                                                          }}
                                                          onBlur={() => {
                                                            // Salvar no Firebase quando perder o foco
                                                            handleItemCompletion(
                                                              project.id, 
                                                              accordion.id, 
                                                              item.id, 
                                                              subItem.id, 
                                                              true,
                                                              subItem.clientResponse
                                                            );
                                                          }}
                                                          className="text-sm"
                                                          rows={3}
                                                        />
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ) : (
                                                            <div className="text-center py-8">
                                      <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                      <p className="text-gray-600">
                                        Nenhum item de verificação definido para este projeto ainda.
                                      </p>

                                    </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
};

export default ClientDashboard; 