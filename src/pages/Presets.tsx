import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Eye, Save, X, Settings, ChevronRight, ChevronDown, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { categoriesData } from "@/lib/categoriesData";
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
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'create' | 'edit'>('list');
  
  // Estados para criação/edição com estrutura de etapas
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    accordions: [] as NewAccordion[]
  });
  const [selectedAccordionIndex, setSelectedAccordionIndex] = useState<number>(0);
  const [expandedAccordions, setExpandedAccordions] = useState<Set<number>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const steps = [
    { id: 1, title: "Informações Básicas", description: "Nome e descrição do preset" },
    { id: 2, title: "Configurar Estrutura", description: "Criar acordeões e selecionar itens" },
    { id: 3, title: "Finalizar", description: "Revisar e salvar o preset" }
  ];

  // Carregar presets
  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "presets"));
      const presetsData: Preset[] = [];
      
      querySnapshot.forEach((doc) => {
        presetsData.push({ id: doc.id, ...doc.data() } as Preset);
      });
      
      setPresets(presetsData);
    } catch (error) {
      console.error("Erro ao carregar presets:", error);
      toast.error("Erro ao carregar presets");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePreset = async (preset: Preset) => {
    try {
      await deleteDoc(doc(db, "presets", preset.id));
      toast.success("Preset excluído com sucesso!");
      fetchPresets();
    } catch (error) {
      console.error("Erro ao excluir preset:", error);
      toast.error("Erro ao excluir preset");
    }
  };

  const openCreateMode = () => {
    setFormData({
      nome: "",
      descricao: "",
      accordions: []
    });
    setCurrentStep(1);
    setSelectedAccordionIndex(0);
    setExpandedAccordions(new Set());
    setExpandedCategories(new Set([Object.keys(categoriesData)[0]])); // Expandir primeira categoria por padrão
    setViewMode('create');
  };

  const openEditMode = (preset: Preset) => {
    setFormData({
      nome: preset.nome,
      descricao: preset.descricao,
      accordions: preset.accordions
    });
    setSelectedPreset(preset);
    setCurrentStep(1);
    setSelectedAccordionIndex(0);
    // Expandir apenas o primeiro acordeão por padrão
    setExpandedAccordions(preset.accordions.length > 0 ? new Set([0]) : new Set());
    setExpandedCategories(new Set([Object.keys(categoriesData)[0]])); // Expandir primeira categoria por padrão
    setViewMode('edit');
  };

  const openViewMode = (preset: Preset) => {
    setSelectedPreset(preset);
    setViewMode('view');
  };

  const backToList = () => {
    setViewMode('list');
    setSelectedPreset(null);
    setCurrentStep(1);
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      // Ao entrar no passo 2, expandir apenas o primeiro acordeão por padrão
      if (currentStep === 1) {
        setExpandedAccordions(formData.accordions.length > 0 ? new Set([0]) : new Set());
        setExpandedCategories(new Set([Object.keys(categoriesData)[0]])); // Expandir primeira categoria por padrão
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreatePreset = async () => {
    try {
      const newPreset = {
        ...formData,
        tipo: "personalizado" as const,
        criadoEm: new Date()
      };
      
      await addDoc(collection(db, "presets"), newPreset);
      toast.success("Preset criado com sucesso!");
      fetchPresets();
      backToList();
    } catch (error) {
      console.error("Erro ao criar preset:", error);
      toast.error("Erro ao criar preset");
    }
  };

  const handleEditPreset = async () => {
    if (!selectedPreset) return;
    
    try {
      await updateDoc(doc(db, "presets", selectedPreset.id), {
        nome: formData.nome,
        descricao: formData.descricao,
        accordions: formData.accordions
      });
      toast.success("Preset atualizado com sucesso!");
      fetchPresets();
      backToList();
    } catch (error) {
      console.error("Erro ao atualizar preset:", error);
      toast.error("Erro ao atualizar preset");
    }
  };

  const addNewAccordion = () => {
    const newAccordion: NewAccordion = {
      title: `Acordeão ${formData.accordions.length + 1}`,
      items: []
    };
    
    const updatedAccordions = [...formData.accordions, newAccordion];
    setFormData(prev => ({ ...prev, accordions: updatedAccordions }));
    
    const newIndex = updatedAccordions.length - 1;
    setSelectedAccordionIndex(newIndex);
    // Expandir apenas o novo acordeão criado
    setExpandedAccordions(prev => new Set([...prev, newIndex]));
  };

  const removeAccordion = (index: number) => {
    const updatedAccordions = formData.accordions.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, accordions: updatedAccordions }));
    
    // Atualizar índices expandidos
    const newExpandedAccordions = new Set<number>();
    expandedAccordions.forEach(expandedIndex => {
      if (expandedIndex < index) {
        newExpandedAccordions.add(expandedIndex);
      } else if (expandedIndex > index) {
        newExpandedAccordions.add(expandedIndex - 1);
      }
    });
    setExpandedAccordions(newExpandedAccordions);
    
    // Ajustar selectedAccordionIndex
    if (selectedAccordionIndex >= index) {
      setSelectedAccordionIndex(Math.max(0, selectedAccordionIndex - 1));
    }
  };

  const updateAccordionTitle = (index: number, title: string) => {
    const updatedAccordions = formData.accordions.map((accordion, i) => 
      i === index ? { ...accordion, title } : accordion
    );
    setFormData(prev => ({ ...prev, accordions: updatedAccordions }));
  };

  const addItemToSelectedAccordion = (item: string, category: string) => {
    if (formData.accordions.length === 0) {
      toast.error("Crie um acordeão primeiro!");
      return;
    }

    const accordionIndex = selectedAccordionIndex;
    if (accordionIndex >= formData.accordions.length) {
      toast.error("Selecione um acordeão válido!");
      return;
    }

    const updatedAccordions = formData.accordions.map((accordion, i) => 
      i === accordionIndex ? { ...accordion, items: [...accordion.items, item] } : accordion
    );
    
    setFormData(prev => ({ ...prev, accordions: updatedAccordions }));
    
    // Expandir apenas o acordeão que recebeu o item
    setExpandedAccordions(prev => new Set([...prev, accordionIndex]));
    
    toast.success(`Item adicionado ao acordeão "${formData.accordions[accordionIndex].title}"`);
  };

  const removeItemFromAccordion = (accordionIndex: number, itemIndex: number) => {
    const updatedAccordions = formData.accordions.map((accordion, i) => 
      i === accordionIndex 
        ? { ...accordion, items: accordion.items.filter((_, j) => j !== itemIndex) }
        : accordion
    );
    setFormData(prev => ({ ...prev, accordions: updatedAccordions }));
  };

  const toggleAccordionExpansion = (index: number) => {
    setExpandedAccordions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const getTotalItems = (preset: Preset) => {
    return preset.accordions.reduce((total, accordion) => total + accordion.items.length, 0);
  };

  const renderStep1 = () => (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-versys-primary">Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome do Preset</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Digite o nome do preset"
              />
            </div>
            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva o propósito deste preset"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="h-full flex flex-col">


      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-3 min-h-0">
        {/* Coluna Esquerda - Itens Disponíveis */}
        <div className="flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="flex-shrink-0 pb-2 pt-3">
              <CardTitle className="text-base text-versys-primary">Itens Disponíveis</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
              <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-500">
                <div className="p-3 space-y-2">
                  {Object.entries(categoriesData).map(([category, items]) => (
                    <div 
                      key={category} 
                      className="border rounded-lg overflow-hidden"
                    >
                      <div 
                        className="bg-gray-50 px-3 py-2 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleCategoryExpansion(category)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-sm text-gray-900">{category}</h3>
                            <p className="text-xs text-gray-500">{items.length} itens disponíveis</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                            >
                              {expandedCategories.has(category) ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                      {expandedCategories.has(category) && (
                        <div className="max-h-36 overflow-y-auto">
                          <div className="p-2 space-y-1">
                            {items.map((item, index) => (
                              <div
                                key={index}
                                className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer text-sm border border-transparent hover:border-versys-secondary transition-colors"
                                onClick={() => addItemToSelectedAccordion(item, category)}
                              >
                                <Plus className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs leading-tight block break-words">{item}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita - Estrutura do Preset */}
        <div className="flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="flex-shrink-0 pb-2 pt-3">
              <CardTitle className="text-base text-versys-primary">Estrutura do Preset</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
              <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-500">
                <div className="p-3 space-y-2">
                  {formData.accordions.map((accordion, accordionIndex) => (
                    <div 
                      key={accordionIndex} 
                      className={`border rounded-lg transition-all duration-200 overflow-hidden ${
                        selectedAccordionIndex === accordionIndex
                          ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {/* Cabeçalho do Acordeão */}
                      <div 
                        className="flex items-center gap-2 p-2 cursor-pointer"
                        onClick={() => {
                          setSelectedAccordionIndex(accordionIndex);
                          toggleAccordionExpansion(accordionIndex);
                        }}
                      >
                        <div className="flex items-center gap-2 h-full w-full">
                          {/* Campo de Título */}
                          <Input
                            value={accordion.title}
                            onChange={(e) => updateAccordionTitle(accordionIndex, e.target.value)}
                            placeholder="Título do acordeão"
                            className={`flex-1 text-sm h-8 ${
                              selectedAccordionIndex === accordionIndex
                                ? 'border-blue-300 focus:ring-blue-500'
                                : ''
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          />

                          {/* Badge com quantidade de itens */}
                          <Badge variant="secondary" className="text-xs px-2 py-0">
                            {accordion.items.length} itens
                          </Badge>

                          {/* Botão Toggle Expansão */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            {expandedAccordions.has(accordionIndex) ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </Button>

                          {/* Botão Remover */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAccordion(accordionIndex);
                            }}
                            className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Conteúdo dos Itens */}
                      {expandedAccordions.has(accordionIndex) && (
                        <div className="border-t">
                          <div className="max-h-36 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                            <div className="space-y-1">
                              {accordion.items.map((item, itemIndex) => (
                                <div key={itemIndex} className="flex items-start gap-2 p-2 bg-white rounded text-sm border shadow-sm group">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs leading-tight block break-words">{item}</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeItemFromAccordion(accordionIndex, itemIndex);
                                    }}
                                    className="text-red-500 h-5 w-5 p-0 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              {accordion.items.length === 0 && (
                                <div className="p-3 text-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                                  <p className="text-xs text-gray-500 italic">
                                    Nenhum item adicionado. Selecione itens da coluna ao lado.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {formData.accordions.length === 0 && (
                    <div className="text-center text-gray-400 py-6">
                      <p className="text-sm mb-1">Nenhum acordeão criado.</p>
                      <p className="text-xs">Clique em "Adicionar Acordeão" para começar.</p>
                    </div>
                  )}
                  
                  {/* Botão Adicionar Acordeão */}
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addNewAccordion}
                      className="bg-versys-primary hover:bg-versys-secondary text-white w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Acordeão
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-5xl">
          <CardHeader>
            <CardTitle className="text-center text-2xl text-versys-primary">
              Resumo do Preset
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-lg font-semibold text-versys-primary">Nome do Preset</Label>
                  <p className="text-lg mt-1">{formData.nome}</p>
                </div>
                <div>
                  <Label className="text-lg font-semibold text-versys-primary">Descrição</Label>
                  <p className="text-lg mt-1">{formData.descricao || "Sem descrição"}</p>
                </div>
              </div>

              <div>
                <Label className="text-lg font-semibold text-versys-primary">Estrutura dos Acordeões</Label>
                <div className="mt-3 space-y-3 max-h-48 sm:max-h-60 overflow-y-auto">
                  {formData.accordions.map((accordion, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-medium text-versys-primary mb-2">{accordion.title}</h4>
                      <div className="space-y-1 max-h-24 sm:max-h-32 overflow-y-auto">
                        {accordion.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="text-sm text-gray-700 bg-white p-2 rounded border">
                            <span className="text-sm leading-tight block break-words">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Total de acordeões: {formData.accordions.length}</span>
                  <span>
                    Total de itens: {formData.accordions.reduce((total, acc) => total + acc.items.length, 0)}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Pronto para salvar!</strong> Verifique se todas as informações estão corretas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderCreateEditScreen = () => (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              onClick={backToList}
              className="p-1.5"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-versys-primary">
                {viewMode === 'create' ? 'Criar Preset' : 'Editar Preset'}
              </h1>
              {viewMode === 'edit' && (
                <Badge variant="secondary" className="text-xs">Personalizado</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={backToList}
              size="sm"
            >
              Cancelar
            </Button>
            {currentStep === 3 && (
              <Button
                onClick={viewMode === 'create' ? handleCreatePreset : handleEditPreset}
                className="bg-versys-primary hover:bg-versys-secondary"
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {viewMode === 'create' ? 'Criar Preset' : 'Salvar Alterações'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b p-3 flex-shrink-0">
        <div className="flex items-center justify-center space-x-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full ${
                currentStep > step.id ? 'bg-green-500 text-white' :
                currentStep === step.id ? 'bg-versys-primary text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {currentStep > step.id ? <CheckCircle className="h-3 w-3" /> : step.id}
              </div>
              <div className="ml-2">
                <div className={`text-sm font-medium ${
                  currentStep === step.id ? 'text-versys-primary' : 'text-gray-500'
                }`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-400">{step.description}</div>
              </div>
              {index < steps.length - 1 && (
                <div className="w-8 h-0.5 bg-gray-200 mx-3" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-hidden">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>

      {/* Footer */}
      <div className="bg-white border-t p-3 flex-shrink-0">
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          
          <div className="text-sm text-gray-500">
            Passo {currentStep} de {steps.length}
          </div>
          
          {currentStep < 3 ? (
            <Button
              onClick={nextStep}
              disabled={currentStep === 1 && !formData.nome}
              className="bg-versys-primary hover:bg-versys-secondary"
              size="sm"
            >
              Próximo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <div className="w-20" />
          )}
        </div>
      </div>
    </div>
  );

  const renderViewScreen = () => (
    <div className="space-y-6">
      {selectedPreset && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={backToList}
                  className="h-8 px-3 text-sm bg-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => openEditMode(selectedPreset)}
                    className="h-8 px-3 text-sm bg-white"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="h-8 px-3 text-sm bg-white text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o preset "{selectedPreset.nome}"?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            handleDeletePreset(selectedPreset);
                            backToList();
                          }}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-xl font-bold text-gray-900">{selectedPreset.nome}</h1>
                    <Badge variant="secondary" className="text-xs">Personalizado</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{selectedPreset.descricao}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-700">{selectedPreset.accordions.length}</span>
                    <span className="text-gray-500">acordeões</span>
                  </div>
                  <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-700">{getTotalItems(selectedPreset)}</span>
                    <span className="text-gray-500">itens</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid gap-3">
            {selectedPreset.accordions.map((accordion, accordionIndex) => (
              <Card key={accordionIndex} className="overflow-hidden">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-versys-primary flex items-center justify-center">
                      <span className="text-xs font-semibold text-white">{accordionIndex + 1}</span>
                    </div>
                    <div>
                      <CardTitle className="text-base text-gray-900">{accordion.title}</CardTitle>
                      <p className="text-xs text-gray-500">{accordion.items.length} itens</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="space-y-1">
                    {accordion.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex gap-2 p-2 bg-gray-50 rounded max-h-16 group">
                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-medium text-gray-600">{itemIndex + 1}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-12 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                          <p className="text-xs text-gray-700 leading-relaxed">{item}</p>
                        </div>
                      </div>
                    ))}
                    {accordion.items.length === 0 && (
                      <div className="text-center py-4 text-gray-400">
                        <p className="text-xs">Nenhum item configurado</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {selectedPreset.accordions.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-gray-400 text-sm">Nenhum acordeão configurado neste preset.</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderListScreen = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-versys-primary">Presets de Checklist</h2>
          <p className="text-gray-600 mt-1">
            Crie e gerencie presets personalizados para suas checklists
          </p>
        </div>
        <Button
          onClick={openCreateMode}
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
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{preset.nome}</CardTitle>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                      <Badge variant="secondary" className="w-fit">
                        Personalizado
                      </Badge>
                      <span className="text-sm text-gray-500 truncate">
                        {preset.accordions.length} acordeões • {getTotalItems(preset)} itens
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openViewMode(preset)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditMode(preset)}
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
                            Tem certeza que deseja excluir o preset "{preset.nome}"? Esta ação não pode ser desfeita.
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
                <p className="text-sm text-gray-600 mb-3 break-words">{preset.descricao}</p>
                <div className="space-y-2">
                  {preset.accordions.slice(0, 3).map((accordion, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium break-words">{accordion.title}</span>
                      <span className="text-gray-500 ml-2 whitespace-nowrap">({accordion.items.length} itens)</span>
                    </div>
                  ))}
                  {preset.accordions.length > 3 && (
                    <div className="text-sm text-gray-500 break-words">
                      +{preset.accordions.length - 3} mais...
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {viewMode === 'list' && renderListScreen()}
        {viewMode === 'view' && renderViewScreen()}
        {(viewMode === 'create' || viewMode === 'edit') && renderCreateEditScreen()}
      </div>
    </div>
  );
};

export default Presets; 