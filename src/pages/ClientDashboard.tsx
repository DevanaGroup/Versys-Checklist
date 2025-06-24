import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Building, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  MessageSquare, 
  Download,
  User,
  Send,
  Upload,
  ClipboardCheck,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  FileCheck
} from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, addDoc, orderBy, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { testClientProjects } from "@/lib/testClientProjects";

interface SubItem {
  id: string;
  title: string;
  evaluation: "sim" | "nc" | "r" | "na" | "";
  completed: boolean;
  clientResponse?: string;
  adminFeedback?: string;
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
  const [newMessage, setNewMessage] = useState<{ [projectId: string]: string }>({});
  const [sendingMessage, setSendingMessage] = useState<{ [projectId: string]: boolean }>({});
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

  const handleSendMessage = async (projectId: string, solicitacaoId?: string) => {
    const message = newMessage[projectId]?.trim();
    if (!message) return;

    const messageKey = solicitacaoId || projectId;
    
    try {
      setSendingMessage(prev => ({ ...prev, [messageKey]: true }));
      
      const novaComunicacao = {
        id: Date.now().toString(),
        de: userData?.uid || '',
        para: 'admin',
        assunto: solicitacaoId ? `Resposta à solicitação` : 'Mensagem do cliente',
        mensagem: message,
        data: new Date().toISOString(),
        tipo: 'resposta' as const,
        lida: false
      };

      const projectRef = doc(db, 'projetos', projectId);
      const project = projectDetails.find(p => p.id === projectId);
      
      if (project) {
        const comunicacoesAtualizadas = [...(project.comunicacoes || []), novaComunicacao];
        
        await updateDoc(projectRef, {
          comunicacoes: comunicacoesAtualizadas
        });

        setProjectDetails(prev => prev.map(p => 
          p.id === projectId 
            ? { ...p, comunicacoes: comunicacoesAtualizadas }
            : p
        ));

        setNewMessage(prev => ({ ...prev, [projectId]: '' }));
        toast.success('Mensagem enviada!');
      }
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSendingMessage(prev => ({ ...prev, [messageKey]: false }));
    }
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

  const getRequirementStatusIcon = (status: string) => {
    switch (status) {
      case "Concluído": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Pendente": return <Clock className="h-4 w-4 text-yellow-600" />;
      case "Rejeitada": return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "solicitacao": return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "info": return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case "alerta": return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <MessageSquare className="h-4 w-4 text-gray-600" />;
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

                <CardContent className="p-0">
                  <Tabs defaultValue="checklist" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="checklist" className="flex items-center space-x-2">
                        <ClipboardCheck className="h-4 w-4" />
                        <span>Lista de Verificação</span>
                      </TabsTrigger>
                      <TabsTrigger value="solicitacoes" className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>Solicitações</span>
                        {project.solicitacoes && project.solicitacoes.length > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {project.solicitacoes.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="comunicacao" className="flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4" />
                        <span>Comunicação</span>
                        {project.comunicacoes && project.comunicacoes.filter(c => !c.lida).length > 0 && (
                          <Badge variant="destructive" className="ml-1">
                            {project.comunicacoes.filter(c => !c.lida).length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    {/* Lista de Verificação */}
                    <TabsContent value="checklist" className="p-6">
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
                                      
                                      <div className="space-y-3">
                                        {item.subItems.map((subItem) => (
                                          <div key={subItem.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border">
                                            <div className="flex items-center space-x-2 mt-1">
                                              {getSubItemStatusIcon(subItem)}
                                              <Checkbox
                                                checked={subItem.completed}
                                                onCheckedChange={(checked) => 
                                                  handleItemCompletion(
                                                    project.id, 
                                                    accordion.id, 
                                                    item.id, 
                                                    subItem.id, 
                                                    !!checked
                                                  )
                                                }
                                                disabled={updatingItem[`${project.id}_${item.id}_${subItem.id}`]}
                                              />
                                            </div>
                                            
                                            <div className="flex-1">
                                              <p className="text-sm font-medium text-gray-900">
                                                {subItem.title}
                                              </p>
                                              
                                              {subItem.adminFeedback && (
                                                <div className="mt-2 p-2 bg-blue-50 border-l-4 border-blue-400 rounded">
                                                  <p className="text-xs text-blue-700">
                                                    <strong>Orientação:</strong> {subItem.adminFeedback}
                                                  </p>
                                                </div>
                                              )}
                                              
                                              {subItem.completed && (
                                                <div className="mt-2">
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
                                                    className="text-xs"
                                                    rows={2}
                                                  />
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
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
                    </TabsContent>

                    {/* Solicitações */}
                    <TabsContent value="solicitacoes" className="p-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-versys-primary mb-2">
                          Solicitações e Documentos
                        </h3>
                        <p className="text-sm text-gray-600">
                          Documentos e informações solicitados pela nossa equipe.
                        </p>
                      </div>

                      {project.solicitacoes && project.solicitacoes.length > 0 ? (
                        <div className="space-y-4">
                          {project.solicitacoes.map((solicitacao) => (
                            <Card key={solicitacao.id}>
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-lg">
                                    {solicitacao.titulo}
                                  </CardTitle>
                                  <div className="flex items-center space-x-2">
                                    {getRequirementStatusIcon(solicitacao.status)}
                                    <Badge className={getStatusColor(solicitacao.status)}>
                                      {solicitacao.status}
                                    </Badge>
                                  </div>
                                </div>
                                {solicitacao.dataLimite && (
                                  <p className="text-sm text-gray-600">
                                    Prazo: {new Date(solicitacao.dataLimite).toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-gray-700 mb-4">
                                  {solicitacao.descricao}
                                </p>
                                
                                {solicitacao.comentarios && (
                                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                                    <p className="text-sm text-gray-700">
                                      <strong>Comentários:</strong> {solicitacao.comentarios}
                                    </p>
                                  </div>
                                )}

                                <div className="flex items-center space-x-2">
                                  <Textarea
                                    placeholder="Digite sua resposta ou comentários..."
                                    value={newMessage[`${project.id}_${solicitacao.id}`] || ''}
                                    onChange={(e) => setNewMessage(prev => ({
                                      ...prev,
                                      [`${project.id}_${solicitacao.id}`]: e.target.value
                                    }))}
                                    className="flex-1"
                                    rows={3}
                                  />
                                  <div className="flex flex-col space-y-2">
                                    <Button
                                      onClick={() => handleSendMessage(project.id, solicitacao.id)}
                                      disabled={
                                        !newMessage[`${project.id}_${solicitacao.id}`]?.trim() || 
                                        sendingMessage[solicitacao.id]
                                      }
                                      size="sm"
                                      className="bg-versys-primary hover:bg-versys-secondary"
                                    >
                                      {sendingMessage[solicitacao.id] ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      ) : (
                                        <Send className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-versys-primary border-versys-primary"
                                    >
                                      <Upload className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">
                            Nenhuma solicitação pendente no momento.
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    {/* Comunicação */}
                    <TabsContent value="comunicacao" className="p-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-versys-primary mb-2">
                          Comunicação com a Equipe
                        </h3>
                        <p className="text-sm text-gray-600">
                          Histórico de mensagens e comunicações do projeto.
                        </p>
                      </div>

                      <div className="space-y-4 mb-6">
                        {project.comunicacoes && project.comunicacoes.length > 0 ? (
                          <ScrollArea className="h-80">
                            <div className="space-y-3">
                              {project.comunicacoes.map((comunicacao) => (
                                <div key={comunicacao.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                                  {getMessageIcon(comunicacao.tipo)}
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-sm font-medium">
                                        {comunicacao.assunto}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {new Date(comunicacao.data).toLocaleDateString('pt-BR')} às{' '}
                                        {new Date(comunicacao.data).toLocaleTimeString('pt-BR', { 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        })}
                                      </p>
                                    </div>
                                    <p className="text-sm text-gray-700">
                                      {comunicacao.mensagem}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        ) : (
                          <div className="text-center py-8">
                            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">
                              Nenhuma mensagem ainda. Inicie uma conversa!
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Nova mensagem */}
                      <div className="border-t pt-4">
                        <div className="flex items-end space-x-2">
                          <div className="flex-1">
                            <Label htmlFor={`message-${project.id}`} className="text-sm font-medium">
                              Enviar mensagem
                            </Label>
                            <Textarea
                              id={`message-${project.id}`}
                              placeholder="Digite sua mensagem..."
                              value={newMessage[project.id] || ''}
                              onChange={(e) => setNewMessage(prev => ({
                                ...prev,
                                [project.id]: e.target.value
                              }))}
                              className="mt-1"
                              rows={3}
                            />
                          </div>
                          <Button
                            onClick={() => handleSendMessage(project.id)}
                            disabled={!newMessage[project.id]?.trim() || sendingMessage[project.id]}
                            className="bg-versys-primary hover:bg-versys-secondary"
                          >
                            {sendingMessage[project.id] ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
};

export default ClientDashboard; 