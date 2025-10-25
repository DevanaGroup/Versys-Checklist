import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Eye, Save, X, Settings, ArrowLeft, ArrowRight, CheckCircle, Grid, List, ClipboardList, Package, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Item {
  id: string;
  nome: string;
  atributos: Atributo[];
  tipo: string;
  criadoEm?: Date;
  atualizadoEm?: Date;
}

interface Atributo {
  id: string;
  nome: string;
  tipo: string;
  obrigatorio: boolean;
}

interface Checklist {
  id: string;
  titulo: string;
  itemId: string;
  itemNome: string;
  topicos: Topico[];
  criadoEm?: Date;
  atualizadoEm?: Date;
}

interface Topico {
  id: string;
  titulo: string;
  perguntas: Pergunta[];
}

interface Pergunta {
  id: string;
  texto: string;
  peso: number; // 1, 2, ou 3
  obrigatorio: boolean;
  opcoesResposta: string[]; // 'na', 'very_bad', 'bad', 'good', 'excellent'
}

interface NewTopico {
  titulo: string;
  perguntas: NewPergunta[];
}

interface NewPergunta {
  texto: string;
  peso: number;
  obrigatorio: boolean;
  opcoesResposta: string[];
}

const Checklist = () => {
  const [displayMode, setDisplayMode] = useState<'card' | 'list'>('list');
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'create' | 'edit'>('list');
  
  // Estados para criação/edição
  const [formData, setFormData] = useState({
    titulo: "",
    itemId: "",
    topicos: [] as NewTopico[]
  });


  // Carregar dados
  useEffect(() => {
    fetchChecklists();
    fetchItens();
  }, []);

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "projetos"));
      const checklistsData: Checklist[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.tipo === 'checklist') {
          checklistsData.push({ id: doc.id, ...data } as Checklist);
        }
      });
      
      setChecklists(checklistsData);
    } catch (error) {
      console.error("Erro ao carregar checklists:", error);
      toast.error("Erro ao carregar checklists");
    } finally {
      setLoading(false);
    }
  };

  const fetchItens = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "projetos"));
      const itensData: Item[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.tipo === 'item') {
          itensData.push({ id: doc.id, ...data } as Item);
        }
      });
      
      setItens(itensData);
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
    }
  };

  const handleDeleteChecklist = async (checklist: Checklist) => {
    try {
      await deleteDoc(doc(db, "projetos", checklist.id));
      toast.success("Checklist excluído com sucesso!");
      fetchChecklists();
    } catch (error) {
      console.error("Erro ao excluir checklist:", error);
      toast.error("Erro ao excluir checklist");
    }
  };

  const openCreateMode = () => {
    setFormData({
      titulo: "",
      itemId: "",
      topicos: []
    });
    setViewMode('create');
  };

  const openEditMode = (checklist: Checklist) => {
    setFormData({
      titulo: checklist.titulo,
      itemId: checklist.itemId,
      topicos: checklist.topicos.map(topico => ({
        titulo: topico.titulo,
        perguntas: topico.perguntas ? topico.perguntas.map(pergunta => ({
          texto: pergunta.texto,
          peso: pergunta.peso,
          obrigatorio: pergunta.obrigatorio,
          opcoesResposta: pergunta.opcoesResposta
        })) : []
      }))
    });
    setSelectedChecklist(checklist);
    setViewMode('edit');
  };

  const openViewMode = (checklist: Checklist) => {
    setSelectedChecklist(checklist);
    setViewMode('view');
  };

  const backToList = () => {
    setViewMode('list');
    setSelectedChecklist(null);
  };

  const handleCreateChecklist = async () => {
    if (!formData.titulo.trim()) {
      toast.error("Título do checklist é obrigatório");
      return;
    }

    if (!formData.itemId) {
      toast.error("Selecione um item");
      return;
    }

    const selectedItem = itens.find(item => item.id === formData.itemId);
    if (!selectedItem) {
      toast.error("Item selecionado não encontrado");
      return;
    }

    // Validar que cada tópico tem perguntas
    if (formData.topicos.some(t => !t.perguntas || t.perguntas.length === 0)) {
      toast.error("Cada seção deve ter pelo menos uma pergunta");
      return;
    }

    try {
      const newChecklist = {
        titulo: formData.titulo.trim(),
        itemId: formData.itemId,
        itemNome: selectedItem.nome,
        topicos: formData.topicos.map((topico, index) => ({
          id: `topico_${Date.now()}_${index}`,
          titulo: topico.titulo.trim(),
          perguntas: topico.perguntas.map((pergunta, pIndex) => ({
            id: `pergunta_${Date.now()}_${pIndex}`,
            texto: pergunta.texto.trim(),
            peso: pergunta.peso,
            obrigatorio: pergunta.obrigatorio,
            opcoesResposta: pergunta.opcoesResposta
          }))
        })),
        tipo: 'checklist',
        criadoEm: new Date()
      };
      
      await addDoc(collection(db, "projetos"), newChecklist);
      toast.success("Checklist criado com sucesso!");
      fetchChecklists();
      backToList();
    } catch (error) {
      console.error("Erro ao criar checklist:", error);
      toast.error("Erro ao criar checklist");
    }
  };

  const handleEditChecklist = async () => {
    if (!selectedChecklist || !formData.titulo.trim()) {
      toast.error("Título do checklist é obrigatório");
      return;
    }

    if (!formData.itemId) {
      toast.error("Selecione um item");
      return;
    }

    const selectedItem = itens.find(item => item.id === formData.itemId);
    if (!selectedItem) {
      toast.error("Item selecionado não encontrado");
      return;
    }

    // Validar que cada tópico tem perguntas
    if (formData.topicos.some(t => !t.perguntas || t.perguntas.length === 0)) {
      toast.error("Cada seção deve ter pelo menos uma pergunta");
      return;
    }

    try {
      const updatedChecklist = {
        titulo: formData.titulo.trim(),
        itemId: formData.itemId,
        itemNome: selectedItem.nome,
        topicos: formData.topicos.map((topico, index) => ({
          id: topico.id || `topico_${Date.now()}_${index}`,
          titulo: topico.titulo.trim(),
          perguntas: topico.perguntas.map((pergunta, pIndex) => ({
            id: pergunta.id || `pergunta_${Date.now()}_${pIndex}`,
            texto: pergunta.texto.trim(),
            peso: pergunta.peso,
            obrigatorio: pergunta.obrigatorio,
            opcoesResposta: pergunta.opcoesResposta
          }))
        })),
        tipo: 'checklist'
      };

      await updateDoc(doc(db, "projetos", selectedChecklist.id), updatedChecklist);
      toast.success("Checklist atualizado com sucesso!");
      fetchChecklists();
      backToList();
    } catch (error) {
      console.error("Erro ao atualizar checklist:", error);
      toast.error("Erro ao atualizar checklist");
    }
  };

  const addNewTopico = () => {
    const newTopico: NewTopico = {
      titulo: "",
      perguntas: []
    };
    
    setFormData(prev => ({
      ...prev,
      topicos: [...prev.topicos, newTopico]
    }));
  };

  const removeTopico = (index: number) => {
    setFormData(prev => ({
      ...prev,
      topicos: prev.topicos.filter((_, i) => i !== index)
    }));
  };

  const updateTopico = (index: number, field: keyof NewTopico, value: any) => {
    setFormData(prev => ({
      ...prev,
      topicos: prev.topicos.map((topico, i) => 
        i === index ? { ...topico, [field]: value } : topico
      )
    }));
  };

  // Funções para gerenciar perguntas
  const addNewPergunta = (topicoIndex: number) => {
    const newPergunta: NewPergunta = {
      texto: "",
      peso: 1,
      obrigatorio: false,
      opcoesResposta: ['na', 'very_bad', 'bad', 'good', 'excellent']
    };
    
    setFormData(prev => ({
      ...prev,
      topicos: prev.topicos.map((topico, i) => 
        i === topicoIndex 
          ? { ...topico, perguntas: [...topico.perguntas, newPergunta] }
          : topico
      )
    }));
  };

  const removePergunta = (topicoIndex: number, perguntaIndex: number) => {
    setFormData(prev => ({
      ...prev,
      topicos: prev.topicos.map((topico, i) => 
        i === topicoIndex 
          ? { ...topico, perguntas: topico.perguntas.filter((_, pi) => pi !== perguntaIndex) }
          : topico
      )
    }));
  };

  const updatePergunta = (topicoIndex: number, perguntaIndex: number, field: keyof NewPergunta, value: any) => {
    setFormData(prev => ({
      ...prev,
      topicos: prev.topicos.map((topico, i) => 
        i === topicoIndex 
          ? { 
              ...topico, 
              perguntas: topico.perguntas.map((pergunta, pi) => 
                pi === perguntaIndex 
                  ? { ...pergunta, [field]: value }
                  : pergunta
              )
            }
          : topico
      )
    }));
  };

  const toggleOpcaoResposta = (topicoIndex: number, perguntaIndex: number, opcao: string) => {
    setFormData(prev => ({
      ...prev,
      topicos: prev.topicos.map((topico, i) => 
        i === topicoIndex 
          ? { 
              ...topico, 
              perguntas: topico.perguntas.map((pergunta, pi) => {
                if (pi === perguntaIndex) {
                  const currentOptions = pergunta.opcoesResposta;
                  const hasOption = currentOptions.includes(opcao);
                  const newOptions = hasOption
                    ? currentOptions.filter(o => o !== opcao)
                    : [...currentOptions, opcao];
                  return { ...pergunta, opcoesResposta: newOptions };
                }
                return pergunta;
              })
            }
          : topico
      )
    }));
  };



  const renderCreateEditScreen = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={backToList}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {viewMode === 'create' ? 'Criar Novo Checklist' : 'Editar Checklist'}
          </h1>
        </div>
        <Button onClick={viewMode === 'create' ? handleCreateChecklist : handleEditChecklist}>
          <Save className="h-4 w-4 mr-2" />
          {viewMode === 'create' ? 'Criar Checklist' : 'Salvar Alterações'}
        </Button>
      </div>

      {/* Formulário */}
      <div className="grid gap-6">
        {/* Informações básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="titulo">Título do Checklist *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ex: CFTV, Controle de Acesso, etc."
              />
            </div>
            <div>
              <Label htmlFor="item">Item Base *</Label>
              <Select
                value={formData.itemId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, itemId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um item" />
                </SelectTrigger>
                <SelectContent>
                  {itens.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {item.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>
          </CardContent>
        </Card>

        {/* Tópicos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tópicos do Checklist</CardTitle>
              <Button onClick={addNewTopico} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Tópico/Seção
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {formData.topicos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum tópico definido</p>
                <p className="text-sm">Clique em "Adicionar Tópico/Seção" para começar</p>
              </div>
            ) : (
              <div className="space-y-6">
                {formData.topicos.map((topico, topicoIndex) => (
                  <div key={topicoIndex} className="border-2 rounded-lg p-6 bg-gray-50">
                    {/* Cabeçalho do Tópico */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-lg px-3 py-1">{topicoIndex + 1}</Badge>
                        <h4 className="text-lg font-semibold">Seção {topicoIndex + 1}</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTopico(topicoIndex)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Título do Tópico */}
                    <div className="mb-6">
                      <Label className="text-base">Título da Seção *</Label>
                      <Input
                        value={topico.titulo}
                        onChange={(e) => updateTopico(topicoIndex, 'titulo', e.target.value)}
                        placeholder="Ex: Barreiras Perimetrais, Rotinas Diárias, etc."
                        className="mt-1"
                      />
                    </div>

                    {/* Perguntas do Tópico */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base">Perguntas</Label>
                        <Button 
                          onClick={() => addNewPergunta(topicoIndex)} 
                          size="sm" 
                          variant="outline"
                          className="text-versys-primary border-versys-primary hover:bg-versys-primary hover:text-white"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar Pergunta
                        </Button>
                      </div>

                      {topico.perguntas && topico.perguntas.length === 0 ? (
                        <div className="text-center py-6 border-2 border-dashed rounded-lg bg-white">
                          <p className="text-sm text-muted-foreground">Nenhuma pergunta adicionada</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {topico.perguntas && topico.perguntas.map((pergunta, perguntaIndex) => (
                            <div key={perguntaIndex} className="border rounded-lg p-4 bg-white">
                              {/* Cabeçalho da Pergunta */}
                              <div className="flex items-center justify-between mb-3">
                                <Badge variant="secondary">Pergunta {perguntaIndex + 1}</Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePergunta(topicoIndex, perguntaIndex)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>

                              {/* Texto da Pergunta */}
                              <div className="mb-3">
                                <Label className="text-sm">Texto da Pergunta *</Label>
                                <Input
                                  value={pergunta.texto}
                                  onChange={(e) => updatePergunta(topicoIndex, perguntaIndex, 'texto', e.target.value)}
                                  placeholder="Ex: As impressoras estão funcionando corretamente?"
                                  className="mt-1"
                                />
                              </div>

                              {/* Peso e Obrigatório */}
                              <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                  <Label className="text-sm">Peso *</Label>
                                  <Select
                                    value={pergunta.peso.toString()}
                                    onValueChange={(value) => updatePergunta(topicoIndex, perguntaIndex, 'peso', parseInt(value))}
                                  >
                                    <SelectTrigger className="mt-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="1">Peso 1 (Baixo)</SelectItem>
                                      <SelectItem value="2">Peso 2 (Médio)</SelectItem>
                                      <SelectItem value="3">Peso 3 (Alto)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center">
                                  <label className="flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={pergunta.obrigatorio}
                                      onChange={(e) => updatePergunta(topicoIndex, perguntaIndex, 'obrigatorio', e.target.checked)}
                                      className="mr-2 h-4 w-4 rounded border-gray-300 text-versys-primary focus:ring-versys-primary"
                                    />
                                    <span className="text-sm font-medium">Obrigatório</span>
                                  </label>
                                </div>
                              </div>

                              {/* Opções de Resposta */}
                              <div>
                                <Label className="text-sm mb-2 block">Opções de Resposta Disponíveis</Label>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    variant={pergunta.opcoesResposta.includes('na') ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => toggleOpcaoResposta(topicoIndex, perguntaIndex, 'na')}
                                  >
                                    N/A
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={pergunta.opcoesResposta.includes('very_bad') ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => toggleOpcaoResposta(topicoIndex, perguntaIndex, 'very_bad')}
                                  >
                                    😢 Muito Ruim
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={pergunta.opcoesResposta.includes('bad') ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => toggleOpcaoResposta(topicoIndex, perguntaIndex, 'bad')}
                                  >
                                    😐 Regular
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={pergunta.opcoesResposta.includes('good') ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => toggleOpcaoResposta(topicoIndex, perguntaIndex, 'good')}
                                  >
                                    😊 Bom
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={pergunta.opcoesResposta.includes('excellent') ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => toggleOpcaoResposta(topicoIndex, perguntaIndex, 'excellent')}
                                  >
                                    🏆 Excelente
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderListScreen = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Checklists</h1>
          <p className="text-muted-foreground">Gerencie suas listas de verificação</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={displayMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setDisplayMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={displayMode === 'card' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setDisplayMode('card')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button onClick={openCreateMode}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Checklist
          </Button>
        </div>
      </div>

      {/* Lista de checklists */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando checklists...</p>
        </div>
      ) : checklists.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Nenhum checklist encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Comece criando seu primeiro checklist baseado em um item
            </p>
            <Button onClick={openCreateMode}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Checklist
            </Button>
          </CardContent>
        </Card>
      ) : displayMode === 'list' ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Título do Checklist
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Baseado em
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tópicos
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {checklists.map((checklist) => (
                <tr key={checklist.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <ClipboardList className="h-5 w-5 text-versys-primary mr-3 flex-shrink-0" />
                      <div className="text-sm font-medium text-gray-900">
                        {checklist.titulo}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{checklist.itemNome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {checklist.topicos.slice(0, 2).map((topico) => (
                        <Badge key={topico.id} variant="secondary" className="text-xs">
                          {topico.titulo}
                        </Badge>
                      ))}
                      {checklist.topicos.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{checklist.topicos.length - 2}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {checklist.topicos.length}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openViewMode(checklist)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditMode(checklist)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteChecklist(checklist)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {checklists.map((checklist) => (
            <Card key={checklist.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{checklist.titulo}</CardTitle>
                  <Badge variant="outline">{checklist.topicos.length} tópicos</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{checklist.itemNome}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {checklist.topicos.slice(0, 4).map((topico) => (
                    <Badge key={topico.id} variant="secondary" className="text-xs">
                      {topico.titulo}
                    </Badge>
                  ))}
                  {checklist.topicos.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{checklist.topicos.length - 4}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openViewMode(checklist)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditMode(checklist)}
                    className="flex-1"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderViewScreen = () => {
    if (!selectedChecklist) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={backToList}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">{selectedChecklist.titulo}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => openEditMode(selectedChecklist)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>

        {/* Detalhes do checklist */}
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Título</Label>
                <p className="text-lg">{selectedChecklist.titulo}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Item Base</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Package className="h-4 w-4" />
                  <p>{selectedChecklist.itemNome}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Criado em</Label>
                  <p>{selectedChecklist.criadoEm ? new Date(selectedChecklist.criadoEm.seconds * 1000).toLocaleDateString('pt-BR') : 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Atualizado em</Label>
                  <p>{selectedChecklist.atualizadoEm ? new Date(selectedChecklist.atualizadoEm.seconds * 1000).toLocaleDateString('pt-BR') : 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tópicos ({selectedChecklist.topicos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedChecklist.topicos.length === 0 ? (
                <p className="text-muted-foreground">Nenhum tópico definido para este checklist.</p>
              ) : (
                <div className="space-y-4">
                  {selectedChecklist.topicos.map((topico, index) => (
                                         <div key={topico.id} className="border rounded-lg p-4">
                       <div className="flex items-center gap-3">
                         <Badge variant="outline">{index + 1}</Badge>
                         <h4 className="font-medium">{topico.titulo}</h4>
                       </div>
                     </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6">
      {viewMode === 'list' && renderListScreen()}
      {viewMode === 'create' && renderCreateEditScreen()}
      {viewMode === 'edit' && renderCreateEditScreen()}
      {viewMode === 'view' && renderViewScreen()}
    </div>
  );
};

export default Checklist; 