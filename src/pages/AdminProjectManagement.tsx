import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building, 
  Plus, 
  MessageSquare, 
  Clock, 
  Send,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  ClipboardCheck,
  FileCheck,
  User
} from "lucide-react";
import { toast } from "sonner";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/contexts/AuthContext";

interface SubItem {
  id: string;
  title: string;
  evaluation: "nc" | "r" | "na" | "";
  completed: boolean;
  clientResponse?: string;
  adminFeedback?: string;
  required: boolean;
  description?: string;
}

interface ProjectItem {
  id: string;
  title: string;
  category: string;
  subItems: SubItem[];
  isExpanded: boolean;
  priority: "alta" | "media" | "baixa";
}

interface Projeto {
  id: string;
  nome: string;
  status: string;
  progresso: number;
  dataInicio: string;
  cliente?: {
    id: string;
    nome: string;
    email: string;
    empresa: string;
  };
  customAccordions?: Array<{
    id: string;
    title: string;
    items: ProjectItem[];
  }>;
  solicitacoes?: Array<{
    id: string;
    titulo: string;
    descricao: string;
    status: "Pendente" | "Em Análise" | "Atendida" | "Rejeitada";
    dataLimite?: string;
    criadoPor: string;
    criadoEm: string;
  }>;
  comunicacoes?: Array<{
    id: string;
    de: string;
    para: string;
    assunto: string;
    mensagem: string;
    data: string;
    tipo: string;
    lida: boolean;
  }>;
}

const AdminProjectManagement = () => {
  const { userData } = useAuthContext();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Projeto | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingChecklist, setViewingChecklist] = useState(false);
  const [solicitacaoForm, setSolicitacaoForm] = useState({
    titulo: '',
    descricao: '',
    dataLimite: ''
  });
  const [enviandoSolicitacao, setEnviandoSolicitacao] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<{ [itemId: string]: boolean }>({});

  useEffect(() => {
    loadProjetos();
  }, []);

  const loadProjetos = async () => {
    try {
      setLoading(true);
      const projetosRef = collection(db, 'projetos');
      const q = query(projetosRef, orderBy('dataCriacao', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const projetosData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Projeto[];
      
      setProjetos(projetosData);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      toast.error('Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItemStatus = async (projectId: string, accordionId: string, itemId: string, subItemId: string, newStatus: "aprovado" | "rejeitado" | "pendente", adminFeedback?: string) => {
    const itemKey = `${projectId}_${itemId}_${subItemId}`;
    
    try {
      setUpdatingStatus(prev => ({ ...prev, [itemKey]: true }));
      
      const project = projetos.find(p => p.id === projectId);
      if (!project) return;
      
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
                        evaluation: (newStatus === "aprovado" ? "sim" : newStatus === "rejeitado" ? "nc" : "") as SubItem['evaluation'],
                        adminFeedback: adminFeedback || subItem.adminFeedback
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
      
      const projectRef = doc(db, 'projetos', projectId);
      await updateDoc(projectRef, {
        customAccordions: updatedAccordions
      });
      
      setProjetos(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, customAccordions: updatedAccordions }
          : p
      ));
      
      if (selectedProject?.id === projectId) {
        setSelectedProject(prev => prev ? { ...prev, customAccordions: updatedAccordions } : null);
      }
      
      toast.success(`Item ${newStatus === "aprovado" ? "aprovado" : newStatus === "rejeitado" ? "rejeitado" : "marcado como pendente"}!`);
      
    } catch (error) {
      console.error('Erro ao atualizar status do item:', error);
      toast.error('Erro ao atualizar status do item');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [itemKey]: false }));
    }
  };

  const handleCriarSolicitacao = async () => {
    if (!selectedProject || !solicitacaoForm.titulo.trim() || !solicitacaoForm.descricao.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setEnviandoSolicitacao(true);
      
      const novaSolicitacao = {
        id: Date.now().toString(),
        titulo: solicitacaoForm.titulo.trim(),
        descricao: solicitacaoForm.descricao.trim(),
        status: 'Pendente' as const,
        dataLimite: solicitacaoForm.dataLimite || undefined,
        criadoPor: userData?.uid || 'admin',
        criadoEm: new Date().toISOString()
      };

      const projectRef = doc(db, 'projetos', selectedProject.id);
      const solicitacoesAtualizadas = [...(selectedProject.solicitacoes || []), novaSolicitacao];
      
      const novaComunicacao = {
        id: Date.now().toString() + '_comm',
        de: userData?.uid || 'admin',
        para: selectedProject.cliente?.id || '',
        assunto: `Nova solicitação: ${novaSolicitacao.titulo}`,
        mensagem: novaSolicitacao.descricao,
        data: new Date().toISOString(),
        tipo: 'solicitacao',
        lida: false
      };

      const comunicacoesAtualizadas = [...(selectedProject.comunicacoes || []), novaComunicacao];

      await updateDoc(projectRef, {
        solicitacoes: solicitacoesAtualizadas,
        comunicacoes: comunicacoesAtualizadas
      });

      setProjetos(prev => prev.map(p => 
        p.id === selectedProject.id 
          ? { 
              ...p, 
              solicitacoes: solicitacoesAtualizadas,
              comunicacoes: comunicacoesAtualizadas 
            }
          : p
      ));

      setSelectedProject(prev => prev ? {
        ...prev,
        solicitacoes: solicitacoesAtualizadas,
        comunicacoes: comunicacoesAtualizadas
      } : null);

      setSolicitacaoForm({ titulo: '', descricao: '', dataLimite: '' });
      setDialogOpen(false);
      toast.success('Solicitação criada com sucesso!');

    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      toast.error('Erro ao criar solicitação');
    } finally {
      setEnviandoSolicitacao(false);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "alta": return "bg-red-100 text-red-800";
      case "media": return "bg-yellow-100 text-yellow-800";
      case "baixa": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getSubItemStatusIcon = (subItem: SubItem) => {
    if (subItem.evaluation === "nc") {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    if (subItem.evaluation === "r") {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
    if (subItem.evaluation === "na") {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    if (subItem.completed) {
      return <Clock className="h-4 w-4 text-blue-600" />;
    }
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  const calculateProgress = (accordions: any[]): number => {
    // Durante fase administrativa, progresso sempre é 0%
    // Progresso só deve avançar quando cliente fizer adequações
    return 0;
  };

  const generateVerificationReport = (project: Projeto) => {
    if (!project.customAccordions) return;
    
    let reportContent = `RELATÓRIO DE VERIFICAÇÃO DE CONFORMIDADE\n\n`;
    reportContent += `Projeto: ${project.nome}\n`;
    reportContent += `Cliente: ${project.cliente?.nome || 'N/A'} - ${project.cliente?.empresa || 'N/A'}\n`;
    reportContent += `Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    reportContent += `Progresso: ${calculateProgress(project.customAccordions)}%\n\n`;
    reportContent += `==============================================\n\n`;
    
    project.customAccordions.forEach((accordion, accIndex) => {
      reportContent += `${accIndex + 1}. ${accordion.title}\n`;
      reportContent += `${'='.repeat(accordion.title.length + 4)}\n\n`;
      
      accordion.items.forEach((item, itemIndex) => {
        reportContent += `${accIndex + 1}.${itemIndex + 1} ${item.title}\n`;
        reportContent += `Categoria: ${item.category}\n`;
        reportContent += `Prioridade: ${item.priority || 'Média'}\n\n`;
        
        item.subItems.forEach((subItem, subIndex) => {
          const status = subItem.evaluation === "nc" ? "✗ NÃO CONFORME" : 
                        subItem.evaluation === "r" ? "⚠ REQUER ATENÇÃO" : 
                        subItem.evaluation === "na" ? "N/A" : 
                        subItem.completed ? "⏳ AGUARDANDO ANÁLISE" : "⏸ PENDENTE";
          
          reportContent += `   ${accIndex + 1}.${itemIndex + 1}.${subIndex + 1} ${subItem.title}\n`;
          reportContent += `   Status: ${status}\n`;
          
          if (subItem.clientResponse) {
            reportContent += `   Resposta do Cliente: ${subItem.clientResponse}\n`;
          }
          
          if (subItem.adminFeedback) {
            reportContent += `   Observações: ${subItem.adminFeedback}\n`;
          }
          
          reportContent += `\n`;
        });
        
        reportContent += `\n`;
      });
      
      reportContent += `\n`;
    });
    
    reportContent += `==============================================\n`;
    reportContent += `Relatório gerado automaticamente pelo sistema VERSYS\n`;
    reportContent += `Data/Hora: ${new Date().toLocaleString('pt-BR')}\n`;
    
    // Criar e baixar o arquivo
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `relatorio_verificacao_${project.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('Relatório de verificação gerado com sucesso!');
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
      <div>
        <h2 className="text-3xl font-bold text-versys-primary">Gestão de Projetos</h2>
        <p className="text-gray-600 mt-2">
          Gerencie projetos, faça solicitações aos clientes e acompanhe o progresso das verificações
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Projetos */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Projetos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {projetos.map((projeto) => (
                    <Card 
                      key={projeto.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedProject?.id === projeto.id ? 'ring-2 ring-versys-primary' : ''
                      }`}
                      onClick={() => setSelectedProject(projeto)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-sm truncate">{projeto.nome}</h3>
                            <Badge className={getStatusColor(projeto.status)}>
                              {projeto.status}
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-gray-600">
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{projeto.cliente?.nome || 'Sem cliente'}</span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Progresso</span>
                              <span>{calculateProgress(projeto.customAccordions || [])}%</span>
                            </div>
                            <Progress value={calculateProgress(projeto.customAccordions || [])} className="h-1" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Detalhes do Projeto */}
        <div className="lg:col-span-2">
          {selectedProject ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-versys-primary">
                    {selectedProject.nome}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => generateVerificationReport(selectedProject)}
                      variant="outline"
                      size="sm"
                      className="text-versys-primary border-versys-primary"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Gerar Relatório
                    </Button>
                    <Button
                      onClick={() => setViewingChecklist(!viewingChecklist)}
                      variant="outline"
                      size="sm"
                      className="text-versys-primary border-versys-primary"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Checklist
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Cliente</p>
                    <p className="font-medium">{selectedProject.cliente?.nome || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Empresa</p>
                    <p className="font-medium">{selectedProject.cliente?.empresa || 'N/A'}</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {viewingChecklist ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Checklist de Verificação</h3>
                      <Badge className="bg-blue-100 text-blue-800">
                        {calculateProgress(selectedProject.customAccordions || [])}% Concluído
                      </Badge>
                    </div>
                    
                    {selectedProject.customAccordions && selectedProject.customAccordions.length > 0 ? (
                      <Accordion type="multiple" className="w-full">
                        {selectedProject.customAccordions.map((accordion) => (
                          <AccordionItem key={accordion.id} value={accordion.id}>
                            <AccordionTrigger className="text-left">
                              <div className="flex items-center justify-between w-full pr-4">
                                <span>{accordion.title}</span>
                                <Progress
                                  value={calculateProgress([accordion])}
                                  className="w-20 h-2"
                                />
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 pt-4">
                                {accordion.items.map((item) => (
                                  <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                                    <div className="flex items-center justify-between mb-3">
                                      <div>
                                        <h4 className="font-medium text-gray-900">{item.title}</h4>
                                        <p className="text-sm text-gray-600">Categoria: {item.category}</p>
                                      </div>
                                      <Badge className={getPriorityColor(item.priority || "media")}>
                                        Prioridade {item.priority || "média"}
                                      </Badge>
                                    </div>
                                    
                                    <div className="space-y-3">
                                      {item.subItems.map((subItem) => (
                                        <div key={subItem.id} className="bg-white rounded-lg border p-3">
                                          <div className="flex items-start space-x-3">
                                            {getSubItemStatusIcon(subItem)}
                                            
                                            <div className="flex-1 space-y-2">
                                              <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-gray-900">
                                                  {subItem.title}
                                                  {subItem.required && <span className="text-red-500 ml-1">*</span>}
                                                </p>
                                                <div className="flex items-center space-x-2">
                                                  <Select
                                                    value={subItem.evaluation === "nc" ? "rejeitado" : 
                                                           subItem.evaluation === "r" ? "pendente" : 
                                                           subItem.evaluation === "na" ? "aprovado" : "pendente"}
                                                    onValueChange={(value: "aprovado" | "rejeitado" | "pendente") => 
                                                      handleUpdateItemStatus(
                                                        selectedProject.id, 
                                                        accordion.id, 
                                                        item.id, 
                                                        subItem.id, 
                                                        value
                                                      )
                                                    }
                                                  >
                                                    <SelectTrigger className="w-32 h-8 text-xs">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="aprovado">Aprovado</SelectItem>
                                                      <SelectItem value="rejeitado">Rejeitado</SelectItem>
                                                      <SelectItem value="pendente">Pendente</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                              </div>
                                              
                                              {subItem.description && (
                                                <div className="p-2 bg-blue-50 border-l-4 border-blue-400 rounded">
                                                  <p className="text-xs text-blue-700">
                                                    <strong>Orientação:</strong> {subItem.description}
                                                  </p>
                                                </div>
                                              )}
                                              
                                              {subItem.clientResponse && (
                                                <div className="p-2 bg-green-50 border-l-4 border-green-400 rounded">
                                                  <p className="text-xs text-green-700">
                                                    <strong>Resposta do Cliente:</strong> {subItem.clientResponse}
                                                  </p>
                                                </div>
                                              )}
                                              
                                              <div>
                                                <Label className="text-xs text-gray-600">Feedback do administrador:</Label>
                                                <Textarea
                                                  value={subItem.adminFeedback || ''}
                                                  onChange={(e) => {
                                                    // Atualizar localmente
                                                    setSelectedProject(prev => {
                                                      if (!prev) return prev;
                                                      
                                                      const updatedAccordions = prev.customAccordions?.map(acc => {
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
                                                                        adminFeedback: e.target.value
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
                                                      
                                                      return { ...prev, customAccordions: updatedAccordions };
                                                    });
                                                  }}
                                                  onBlur={() => {
                                                    // Salvar no Firebase
                                                    handleUpdateItemStatus(
                                                      selectedProject.id, 
                                                      accordion.id, 
                                                      item.id, 
                                                      subItem.id, 
                                                      subItem.evaluation === "nc" ? "rejeitado" : 
                                                      subItem.evaluation === "r" ? "pendente" : 
                                                      subItem.evaluation === "na" ? "aprovado" : "pendente",
                                                      subItem.adminFeedback
                                                    );
                                                  }}
                                                  placeholder="Adicione observações, orientações ou feedback..."
                                                  className="text-xs mt-1"
                                                  rows={2}
                                                />
                                              </div>
                                            </div>
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
                          Nenhum checklist definido para este projeto ainda.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <Tabs defaultValue="solicitacoes" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="solicitacoes" className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>Solicitações</span>
                      </TabsTrigger>
                      <TabsTrigger value="comunicacoes" className="flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4" />
                        <span>Comunicações</span>
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="solicitacoes" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Solicitações</h3>
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-versys-primary hover:bg-versys-secondary">
                              <Plus className="h-4 w-4 mr-2" />
                              Nova Solicitação
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Criar Nova Solicitação</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="titulo">Título *</Label>
                                <Input
                                  id="titulo"
                                  value={solicitacaoForm.titulo}
                                  onChange={(e) => setSolicitacaoForm(prev => ({ ...prev, titulo: e.target.value }))}
                                  placeholder="Título da solicitação"
                                />
                              </div>
                              <div>
                                <Label htmlFor="descricao">Descrição *</Label>
                                <Textarea
                                  id="descricao"
                                  value={solicitacaoForm.descricao}
                                  onChange={(e) => setSolicitacaoForm(prev => ({ ...prev, descricao: e.target.value }))}
                                  placeholder="Descreva o que precisa ser fornecido..."
                                  rows={4}
                                />
                              </div>
                              <div>
                                <Label htmlFor="dataLimite">Data Limite (Opcional)</Label>
                                <Input
                                  id="dataLimite"
                                  type="date"
                                  value={solicitacaoForm.dataLimite}
                                  onChange={(e) => setSolicitacaoForm(prev => ({ ...prev, dataLimite: e.target.value }))}
                                />
                              </div>
                              <div className="flex items-center space-x-2 pt-4">
                                <Button
                                  onClick={handleCriarSolicitacao}
                                  disabled={enviandoSolicitacao}
                                  className="bg-versys-primary hover:bg-versys-secondary"
                                >
                                  {enviandoSolicitacao ? (
                                    <>
                                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                                      Criando...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="h-4 w-4 mr-2" />
                                      Criar Solicitação
                                    </>
                                  )}
                                </Button>
                                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      
                      <div className="space-y-3">
                        {selectedProject.solicitacoes && selectedProject.solicitacoes.length > 0 ? (
                          selectedProject.solicitacoes.map((solicitacao) => (
                            <Card key={solicitacao.id}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium">{solicitacao.titulo}</h4>
                                  <Badge className={getStatusColor(solicitacao.status)}>
                                    {solicitacao.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{solicitacao.descricao}</p>
                                {solicitacao.dataLimite && (
                                  <p className="text-xs text-gray-500">
                                    Prazo: {new Date(solicitacao.dataLimite).toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          ))
                        ) : (
                          <p className="text-center text-gray-500 py-8">
                            Nenhuma solicitação criada ainda.
                          </p>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="comunicacoes" className="space-y-4">
                      <h3 className="text-lg font-semibold">Comunicações</h3>
                      <ScrollArea className="h-64">
                        <div className="space-y-3">
                          {selectedProject.comunicacoes && selectedProject.comunicacoes.length > 0 ? (
                            selectedProject.comunicacoes.map((comunicacao) => (
                              <Card key={comunicacao.id}>
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="font-medium text-sm">{comunicacao.assunto}</p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(comunicacao.data).toLocaleDateString('pt-BR')}
                                    </p>
                                  </div>
                                  <p className="text-sm text-gray-700">{comunicacao.mensagem}</p>
                                </CardContent>
                              </Card>
                            ))
                          ) : (
                            <p className="text-center text-gray-500 py-8">
                              Nenhuma comunicação ainda.
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <ClipboardCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Selecione um projeto
                  </h3>
                  <p className="text-gray-600">
                    Escolha um projeto da lista para ver os detalhes e gerenciar as verificações.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProjectManagement; 