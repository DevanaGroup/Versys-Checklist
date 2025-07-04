import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Eye, Save, X, Settings, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { categoriesData } from "@/lib/categoriesData";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Preset {
  id: string;
  nome: string;
  descricao: string;
  tipo: "personalizado";
  accordions: {
    title: string;
    items: string[];
  }[];
  criadoEm?: Date;
}

interface NewAccordion {
  title: string;
  items: string[];
}

const Presets = () => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  
  // Estados para criação/edição
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    accordions: [{ title: "", items: [""] }] as NewAccordion[]
  });

  const [selectedAccordionIndex, setSelectedAccordionIndex] = useState<number>(0);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    setLoading(true);
    try {
      // Carregar presets do Firebase
      const presetsRef = collection(db, "presets");
      const querySnapshot = await getDocs(presetsRef);
      
      const firebasePresets: Preset[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nome: data.nome,
          descricao: data.descricao,
          tipo: "personalizado",
          accordions: data.accordions || [],
          criadoEm: data.criadoEm?.toDate()
        };
      });

      setPresets(firebasePresets);
    } catch (error) {
      console.error("Erro ao carregar presets:", error);
      toast.error("Erro ao carregar presets");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePreset = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (formData.accordions.length === 0) {
      toast.error("Adicione pelo menos um acordeão");
      return;
    }

    try {
      const presetData = {
        nome: formData.nome,
        descricao: formData.descricao,
        accordions: formData.accordions.filter(acc => acc.title.trim() && acc.items.some(item => item.trim())),
        criadoEm: new Date(),
        tipo: "personalizado"
      };

      const docRef = await addDoc(collection(db, "presets"), presetData);
      
      toast.success("Preset criado com sucesso!");
      setShowCreateDialog(false);
      resetForm();
      loadPresets();
    } catch (error) {
      console.error("Erro ao criar preset:", error);
      toast.error("Erro ao criar preset");
    }
  };

  const handleEditPreset = async () => {
    if (!selectedPreset) return;

    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      const presetRef = doc(db, "presets", selectedPreset.id);
      await updateDoc(presetRef, {
        nome: formData.nome,
        descricao: formData.descricao,
        accordions: formData.accordions.filter(acc => acc.title.trim() && acc.items.some(item => item.trim())),
        atualizadoEm: new Date()
      });

      toast.success("Preset atualizado com sucesso!");
      setShowEditDialog(false);
      setSelectedPreset(null);
      resetForm();
      loadPresets();
    } catch (error) {
      console.error("Erro ao atualizar preset:", error);
      toast.error("Erro ao atualizar preset");
    }
  };

  const handleDeletePreset = async (preset: Preset) => {
    try {
      await deleteDoc(doc(db, "presets", preset.id));
      toast.success("Preset excluído com sucesso!");
      loadPresets();
    } catch (error) {
      console.error("Erro ao excluir preset:", error);
      toast.error("Erro ao excluir preset");
    }
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      accordions: [{ title: "", items: [""] }]
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const openEditDialog = (preset: Preset) => {
    setSelectedPreset(preset);
    setFormData({
      nome: preset.nome,
      descricao: preset.descricao,
      accordions: preset.accordions.map(acc => ({
        title: acc.title,
        items: acc.items.length > 0 ? acc.items : [""]
      }))
    });
    setShowEditDialog(true);
  };

  const openViewDialog = (preset: Preset) => {
    setSelectedPreset(preset);
    setShowViewDialog(true);
  };

  const addNewAccordion = () => {
    setFormData(prev => ({
      ...prev,
      accordions: [...prev.accordions, { title: "", items: [] }]
    }));
  };

  const updateAccordionTitle = (accordionIndex: number, title: string) => {
    setFormData(prev => ({
      ...prev,
      accordions: prev.accordions.map((acc, i) => 
        i === accordionIndex ? { ...acc, title } : acc
      )
    }));
  };

  const removeAccordion = (accordionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      accordions: prev.accordions.filter((_, i) => i !== accordionIndex)
    }));
  };

  const addItemToSelectedAccordion = (item: string, category: string) => {
    if (formData.accordions.length === 0) {
      // Se não há acordeões, criar um automaticamente com o nome da categoria
      setFormData(prev => ({
        ...prev,
        accordions: [{ title: category, items: [item] }]
      }));
    } else {
      // Adicionar ao acordeão selecionado (padrão: primeiro)
      setFormData(prev => ({
        ...prev,
        accordions: prev.accordions.map((acc, index) => 
          index === selectedAccordionIndex ? { ...acc, items: [...acc.items, item] } : acc
        )
      }));
    }
    toast.success(`Item adicionado ao preset!`);
  };

  const removeItemFromAccordion = (accordionIndex: number, itemIndex: number) => {
    setFormData(prev => ({
      ...prev,
      accordions: prev.accordions.map((acc, i) => 
        i === accordionIndex 
          ? { ...acc, items: acc.items.filter((_, j) => j !== itemIndex) }
          : acc
      )
    }));
  };

  const getTotalItems = (preset: Preset) => {
    return preset.accordions.reduce((total, acc) => total + acc.items.length, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-versys-primary">Presets de Checklist</h2>
          <p className="text-gray-600 mt-1">
            Gerencie seus presets de checklist para criação rápida de projetos
          </p>
        </div>
        <Button 
          onClick={openCreateDialog}
          className="bg-versys-primary hover:bg-versys-secondary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Preset
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-versys-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando presets...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {presets.map((preset) => (
            <Card key={preset.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{preset.nome}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">
                        Personalizado
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {preset.accordions.length} acordeões • {getTotalItems(preset)} itens
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openViewDialog(preset)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(preset)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o preset "{preset.nome}"?
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeletePreset(preset)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">{preset.descricao}</p>
                <div className="space-y-2">
                  {preset.accordions.slice(0, 2).map((accordion, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium">{accordion.title}</span>
                      <span className="text-gray-500 ml-2">({accordion.items.length} itens)</span>
                    </div>
                  ))}
                  {preset.accordions.length > 2 && (
                    <div className="text-sm text-gray-500">
                      +{preset.accordions.length - 2} mais acordeões
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Criação */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-5xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Preset</DialogTitle>
          </DialogHeader>
          
          {/* Seção 1: Informações Básicas */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="preset-name">Nome do Preset</Label>
                <Input
                  id="preset-name"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    nome: e.target.value
                  }))}
                  placeholder="Digite o nome do preset"
                />
              </div>
              <div>
                <Label htmlFor="preset-description">Descrição</Label>
                <Input
                  id="preset-description"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    descricao: e.target.value
                  }))}
                  placeholder="Digite uma descrição para o preset"
                />
              </div>
            </div>

            {/* Seção 2: Header de Controle */}
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <Label className="text-base font-semibold">Estrutura do Checklist</Label>
                <p className="text-xs text-gray-500">Configure os acordeões e itens do preset</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addNewAccordion}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Acordeão
              </Button>
            </div>

            {/* Seção 3: Seletor de Acordeão */}
            {formData.accordions.length > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <Label className="text-sm font-medium">Adicionar itens ao acordeão:</Label>
                <Select 
                  value={selectedAccordionIndex.toString()} 
                  onValueChange={(value) => setSelectedAccordionIndex(parseInt(value))}
                >
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue placeholder="Selecione um acordeão" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.accordions.map((accordion, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {accordion.title || `Acordeão ${index + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Seção 4: Duas Colunas Principais */}
            <div className="grid grid-cols-2 gap-6">
              {/* Coluna Esquerda - Itens Disponíveis */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Itens Disponíveis</Label>
                  <span className="text-xs text-gray-500">Clique para adicionar</span>
                </div>
                
                <div className="border rounded-lg">
                  <ScrollArea className="h-[400px]">
                    <Accordion type="multiple" className="w-full">
                      {Object.entries(categoriesData).map(([category, items]) => (
                        <AccordionItem key={category} value={category}>
                          <AccordionTrigger className="px-4 py-2 text-left text-sm">
                            {category}
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="px-4 pb-2 space-y-1">
                              {items.map((item, index) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                                  onClick={() => addItemToSelectedAccordion(item, category)}
                                >
                                  <Plus className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                                  <span className="flex-1">{item}</span>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </ScrollArea>
                </div>
              </div>

              {/* Coluna Direita - Estrutura do Preset */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Estrutura do Preset</Label>
                  <span className="text-xs text-gray-500">Organize os itens</span>
                </div>
                
                <div className="border rounded-lg">
                  <ScrollArea className="h-[400px]">
                    <div className="p-4 space-y-3">
                      {formData.accordions.map((accordion, accordionIndex) => (
                        <div key={accordionIndex} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center gap-2 mb-3">
                            <Input
                              value={accordion.title}
                              onChange={(e) => updateAccordionTitle(accordionIndex, e.target.value)}
                              placeholder="Título do acordeão"
                              className="flex-1 text-sm"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAccordion(accordionIndex)}
                              className="text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            {accordion.items.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex items-start gap-2 p-2 bg-white rounded text-sm border">
                                <span className="flex-1">{item}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItemFromAccordion(accordionIndex, itemIndex)}
                                  className="text-red-500 h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            {accordion.items.length === 0 && (
                              <p className="text-xs text-gray-400 italic p-3 text-center border border-dashed rounded">
                                Nenhum item adicionado. Selecione itens da coluna ao lado.
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {formData.accordions.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                          <p className="text-sm mb-1">Nenhum acordeão criado.</p>
                          <p className="text-xs">Clique em "Adicionar Acordeão" para começar.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer com Botões */}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreatePreset} className="bg-versys-primary hover:bg-versys-secondary">
              <Save className="h-4 w-4 mr-2" />
              Criar Preset
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-5xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Editar Preset: {selectedPreset?.nome}
              <Badge variant="secondary">
                Personalizado
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {/* Seção 1: Informações Básicas */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-nome">Nome do Preset</Label>
                <Input
                  id="edit-nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Digite o nome do preset"
                />
              </div>
              <div>
                <Label htmlFor="edit-descricao">Descrição</Label>
                <Input
                  id="edit-descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Digite uma descrição para o preset"
                />
              </div>
            </div>

            {/* Seção 2: Header de Controle */}
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <Label className="text-base font-semibold">Estrutura do Checklist</Label>
                <p className="text-xs text-gray-500">Configure os acordeões e itens do preset</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addNewAccordion}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Acordeão
              </Button>
            </div>

            {/* Seção 3: Seletor de Acordeão */}
            {formData.accordions.length > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <Label className="text-sm font-medium">Adicionar itens ao acordeão:</Label>
                <Select 
                  value={selectedAccordionIndex.toString()} 
                  onValueChange={(value) => setSelectedAccordionIndex(parseInt(value))}
                >
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue placeholder="Selecione um acordeão" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.accordions.map((accordion, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {accordion.title || `Acordeão ${index + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Seção 4: Duas Colunas Principais */}
            <div className="grid grid-cols-2 gap-6">
              {/* Coluna Esquerda - Itens Disponíveis */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Itens Disponíveis</Label>
                  <span className="text-xs text-gray-500">Clique para adicionar</span>
                </div>
                
                <div className="border rounded-lg">
                  <ScrollArea className="h-[400px]">
                    <Accordion type="multiple" className="w-full">
                      {Object.entries(categoriesData).map(([category, items]) => (
                        <AccordionItem key={category} value={category}>
                          <AccordionTrigger className="px-4 py-2 text-left text-sm">
                            {category}
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="px-4 pb-2 space-y-1">
                              {items.map((item, index) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                                  onClick={() => addItemToSelectedAccordion(item, category)}
                                >
                                  <Plus className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                                  <span className="flex-1">{item}</span>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </ScrollArea>
                </div>
              </div>

              {/* Coluna Direita - Estrutura do Preset */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Estrutura do Preset</Label>
                  <span className="text-xs text-gray-500">Organize os itens</span>
                </div>
                
                <div className="border rounded-lg">
                  <ScrollArea className="h-[400px]">
                    <div className="p-4 space-y-3">
                      {formData.accordions.map((accordion, accordionIndex) => (
                        <div key={accordionIndex} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center gap-2 mb-3">
                            <Input
                              value={accordion.title}
                              onChange={(e) => updateAccordionTitle(accordionIndex, e.target.value)}
                              placeholder="Título do acordeão"
                              className="flex-1 text-sm"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAccordion(accordionIndex)}
                              className="text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            {accordion.items.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex items-start gap-2 p-2 bg-white rounded text-sm border">
                                <span className="flex-1">{item}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItemFromAccordion(accordionIndex, itemIndex)}
                                  className="text-red-500 h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            {accordion.items.length === 0 && (
                              <p className="text-xs text-gray-400 italic p-3 text-center border border-dashed rounded">
                                Nenhum item adicionado. Selecione itens da coluna ao lado.
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {formData.accordions.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                          <p className="text-sm mb-1">Nenhum acordeão criado.</p>
                          <p className="text-xs">Clique em "Adicionar Acordeão" para começar.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer com Botões */}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditPreset} className="bg-blue-600 hover:bg-blue-700">
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPreset?.nome}
              <Badge variant="secondary">
                Personalizado
              </Badge>
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedPreset?.descricao}
            </p>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Estrutura do Checklist</Label>
                <Badge variant="outline">
                  {selectedPreset?.accordions.length || 0} acordeões
                </Badge>
              </div>

              <div className="flex-1 border rounded-lg overflow-hidden min-h-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {selectedPreset?.accordions.map((accordion, accordionIndex) => (
                      <div key={accordionIndex} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                          <h3 className="font-medium text-sm">{accordion.title}</h3>
                          <Badge variant="secondary" className="ml-auto">
                            {accordion.items.length} itens
                          </Badge>
                        </div>
                        <div className="space-y-2 ml-6">
                          {accordion.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm">
                              <div className="w-2 h-2 rounded-full bg-gray-400 mt-2 flex-shrink-0"></div>
                              <span className="flex-1">{item}</span>
                            </div>
                          ))}
                          {accordion.items.length === 0 && (
                            <p className="text-xs text-gray-400 italic p-2">
                              Nenhum item configurado neste acordeão.
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {(!selectedPreset?.accordions || selectedPreset.accordions.length === 0) && (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-sm">Nenhum acordeão configurado neste preset.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Presets; 