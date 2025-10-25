import { useState, useEffect } from "react";
import { Plus, Trash2, Edit, Eye, FolderOpen, Save, X, ArrowLeft, ChevronUp, ChevronDown, MoreVertical } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { addDefaultPreset } from "@/scripts/add-default-preset";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Tipos
interface PresetArea {
  id: string;
  name: string;
  items: PresetItem[];
  order: number;
  isExpanded?: boolean;
}

interface PresetItem {
  id: string;
  title: string;
  description: string;
  order: number;
}

interface Preset {
  id: string;
  nome: string;
  descricao: string;
  areas: PresetArea[];
  createdAt: Date;
  updatedAt: Date;
}

const Presets = () => {
  const { presetId } = useParams();
  const navigate = useNavigate();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [presetToDelete, setPresetToDelete] = useState<Preset | null>(null);
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    areas: [] as PresetArea[]
  });
  
  const [activeTab, setActiveTab] = useState<'dados' | 'estrutura'>('dados');

  // Carregar presets
  useEffect(() => {
    fetchPresets();
  }, []);

  // Detectar e carregar preset pela URL
  useEffect(() => {
    if (presetId && presets.length > 0) {
      const preset = presets.find(p => p.id === presetId);
      if (preset) {
        handleEdit(preset);
      }
    }
  }, [presetId, presets]);

  const fetchPresets = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "presets"));
      const presetsData: Preset[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        presetsData.push({ 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Preset);
      });
      
      setPresets(presetsData.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()));
    } catch (error) {
      console.error("Erro ao carregar presets:", error);
      toast.error("Erro ao carregar presets");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setFormData({
      nome: "",
      descricao: "",
      areas: []
    });
    setSelectedPreset(null);
    setActiveTab('dados');
    setViewMode('create');
    navigate('/presets/new');
  };

  const handleEdit = (preset: Preset) => {
    setFormData({
      nome: preset.nome,
      descricao: preset.descricao,
      areas: preset.areas.map(area => ({ ...area, isExpanded: true }))
    });
    setSelectedPreset(preset);
    setActiveTab('dados');
    setViewMode('edit');
    navigate(`/presets/${preset.id}`);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome do preset é obrigatório");
      return;
    }

    if (formData.areas.length === 0) {
      toast.error("Adicione pelo menos uma área ao preset");
      return;
    }

    try {
      setLoading(true);
      
      const dataToSave = {
        nome: formData.nome,
        descricao: formData.descricao,
        areas: formData.areas.map(({ isExpanded, ...area }) => area),
        updatedAt: new Date()
      };
      
      if (viewMode === 'edit' && selectedPreset) {
        await updateDoc(doc(db, "presets", selectedPreset.id), dataToSave);
        toast.success("Preset atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "presets"), {
          ...dataToSave,
          createdAt: new Date()
        });
      toast.success("Preset criado com sucesso!");
      }
      
      await fetchPresets();
      setViewMode('list');
      navigate('/presets');
    } catch (error) {
      console.error("Erro ao salvar preset:", error);
      toast.error("Erro ao salvar preset");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!presetToDelete) return;
    
    try {
      await deleteDoc(doc(db, "presets", presetToDelete.id));
      toast.success("Preset excluído com sucesso!");
      await fetchPresets();
      setPresetToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir preset:", error);
      toast.error("Erro ao excluir preset");
    }
  };

  const handleAddDefaultPreset = async () => {
    try {
      setLoading(true);
      await addDefaultPreset();
      toast.success("Preset padrão ISPS Code adicionado com sucesso!");
      await fetchPresets();
    } catch (error) {
      console.error("Erro ao adicionar preset padrão:", error);
      toast.error("Erro ao adicionar preset padrão");
    } finally {
      setLoading(false);
    }
  };

  // Funções para gerenciar áreas
  const addArea = () => {
    const newArea: PresetArea = {
      id: `area-${Date.now()}`,
      name: `Área ${formData.areas.length + 1}`,
      items: [],
      order: formData.areas.length,
      isExpanded: true
    };
    setFormData({
      ...formData,
      areas: [...formData.areas, newArea]
    });
  };

  const updateArea = (areaId: string, field: keyof PresetArea, value: any) => {
    setFormData({
      ...formData,
      areas: formData.areas.map(area =>
        area.id === areaId ? { ...area, [field]: value } : area
      )
    });
  };

  const deleteArea = (areaId: string) => {
    setFormData({
      ...formData,
      areas: formData.areas.filter(area => area.id !== areaId)
    });
  };

  const toggleArea = (areaId: string) => {
    setFormData({
      ...formData,
      areas: formData.areas.map(area =>
        area.id === areaId ? { ...area, isExpanded: !area.isExpanded } : area
      )
    });
  };

  // Funções para gerenciar itens
  const addItem = (areaId: string) => {
    setFormData({
      ...formData,
      areas: formData.areas.map(area => {
        if (area.id === areaId) {
          const newItem: PresetItem = {
            id: `item-${Date.now()}`,
            title: "",
            description: "",
            order: area.items.length
          };
          return {
            ...area,
            items: [...area.items, newItem]
          };
        }
        return area;
      })
    });
  };

  const updateItem = (areaId: string, itemId: string, field: keyof PresetItem, value: any) => {
    setFormData({
      ...formData,
      areas: formData.areas.map(area => {
        if (area.id === areaId) {
          return {
            ...area,
            items: area.items.map(item =>
              item.id === itemId ? { ...item, [field]: value } : item
            )
          };
        }
        return area;
      })
    });
  };

  const deleteItem = (areaId: string, itemId: string) => {
    setFormData({
      ...formData,
      areas: formData.areas.map(area => {
        if (area.id === areaId) {
          return {
            ...area,
            items: area.items.filter(item => item.id !== itemId)
          };
        }
        return area;
      })
    });
  };

  // Renderização da lista de presets
  const renderList = () => (
            <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
          <h1 className="text-3xl font-bold text-gray-900">Presets de Checklist</h1>
          <p className="text-gray-600 mt-1">
            Gerencie estruturas reutilizáveis para seus checklists
            </p>
            </div>
                            <Button
          onClick={handleCreateNew}
                className="bg-versys-primary hover:bg-versys-secondary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Preset
                            </Button>
                          </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Carregando presets...</div>
                        </div>
      ) : presets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center">
              Nenhum preset criado ainda.<br />
              Crie seu primeiro preset para começar!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome do Preset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Áreas
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Itens
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {presets.map((preset) => (
                <tr key={preset.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <FolderOpen className="h-5 w-5 text-versys-primary mr-3 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {preset.nome}
                      </div>
                                </div>
                              </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 line-clamp-2 max-w-md">
                      {preset.descricao || '-'}
                          </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {preset.areas?.length || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {preset.areas?.reduce((acc, area) => acc + (area.items?.length || 0), 0) || 0}
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
                        <DropdownMenuItem onClick={() => handleEdit(preset)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setPresetToDelete(preset)}
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
      )}
                                  </div>
  );

  // Renderização do formulário (criar/editar) - estilo da foto
  const renderForm = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b">
                                  <Button
                                    variant="ghost"
          size="icon"
          onClick={() => {
            setViewMode('list');
            navigate('/presets');
          }}
        >
          <ArrowLeft className="h-5 w-5" />
                                  </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-versys-primary">
            {formData.nome || 'Novo Preset'}
          </h1>
          <p className="text-sm text-gray-500">Checklist / Configurar Preset</p>
                                </div>
                    <Button
                          variant="ghost"
          size="icon"
                        >
          <MoreVertical className="h-5 w-5" />
                    </Button>
                  </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b">
        <button 
          onClick={() => setActiveTab('dados')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'dados' 
              ? 'border-versys-primary text-versys-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          DADOS CADASTRAIS
        </button>
        <button 
          onClick={() => setActiveTab('estrutura')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'estrutura' 
              ? 'border-versys-primary text-versys-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          ESTRUTURA
        </button>
                </div>

      {/* Conteúdo da Aba DADOS CADASTRAIS */}
      {activeTab === 'dados' && (
        <div className="space-y-6">
          <Card>
          <CardHeader>
              <CardTitle className="text-lg">Informações do Preset</CardTitle>
          </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Preset *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Auditoria de Segurança Perimetral"
                  className="text-lg"
                />
                <p className="text-xs text-gray-500">
                  Este nome será usado para identificar o preset na lista
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva o propósito deste preset, quando deve ser usado, etc."
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  Adicione detalhes que ajudem outros usuários a entender quando usar este preset
                </p>
            </div>
          </CardContent>
        </Card>

          {/* Botão para próxima etapa */}
          <div className="flex justify-end">
            <Button
              onClick={() => setActiveTab('estrutura')}
                className="bg-versys-primary hover:bg-versys-secondary"
              >
              Próximo: Configurar Estrutura
              </Button>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba ESTRUTURA */}
      {activeTab === 'estrutura' && (
        <div className="space-y-4">
        {/* Lista de Áreas */}
        <div className="space-y-4">
          {formData.areas.map((area, areaIndex) => (
            <div key={area.id} className="bg-white border border-gray-200 rounded-lg shadow-sm relative">
              {/* Área Header - PEQUENO canto verde (como na imagem) */}
              <div className="absolute top-0 left-0 bg-versys-primary rounded-tl-lg px-4 py-2 flex items-center gap-2 max-w-[90%] md:max-w-[70%] lg:max-w-[500px]">
                <button
                  onClick={() => toggleArea(area.id)}
                  className="text-white hover:opacity-80 transition-opacity flex-shrink-0"
                >
                  {area.isExpanded ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                <span className="text-white text-sm font-medium truncate block">
                  {area.name || `Área ${areaIndex + 1}`}
                </span>
      </div>

              {/* Botões de ação no canto superior direito */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
          <Button
                  variant="ghost"
            size="sm"
                  onClick={() => addItem(area.id)}
                  className="text-xs text-gray-500 hover:text-gray-700 h-7"
          >
                  <Plus className="h-3 w-3 mr-1" />
                  NOVO ITEM
          </Button>
            <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteArea(area.id)}
                  className="text-gray-400 hover:text-gray-600 h-7 w-7"
                >
                  <MoreVertical className="h-4 w-4" />
            </Button>
        </div>

              {/* Conteúdo da Área */}
              <div className="pt-16 p-6">
                {/* Itens da Área */}
                {area.isExpanded && (
    <div className="space-y-6">
                    {area.items.length === 0 ? (
                      <div className="text-sm text-gray-400 italic py-8 text-center">
                        Nenhum item adicionado. Clique em "NOVO ITEM" para adicionar.
        </div>
                    ) : (
                      area.items.map((item, itemIndex) => (
                        <div key={item.id} className="space-y-2 group">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <Input
                                value={item.title}
                                onChange={(e) => updateItem(area.id, item.id, 'title', e.target.value)}
                                placeholder={`${areaIndex + 1}.${itemIndex + 1} - TÍTULO DO ITEM`}
                                className="text-lg font-bold text-gray-900 uppercase border-0 px-0 focus-visible:ring-0 h-auto shadow-none"
                              />
                              <Textarea
                                value={item.description}
                                onChange={(e) => updateItem(area.id, item.id, 'description', e.target.value)}
                                placeholder="Descrição do item..."
                                rows={2}
                                className="text-sm text-gray-600 resize-none border-0 px-0 focus-visible:ring-0 shadow-none"
                              />
      </div>
          <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteItem(area.id, item.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
                      ))
                    )}
        </div>
                )}

                {!area.isExpanded && area.items.length > 0 && (
                  <div className="text-sm text-gray-500">
                    {area.items.length} {area.items.length === 1 ? 'item' : 'itens'}
                        </div>
                      )}
                    </div>
                        </div>
                      ))}
                  </div>

        {/* Botões de Ação - estilo da foto */}
        <div className="flex justify-center pt-6">
                    <Button
            onClick={addArea}
                      variant="outline"
            className="rounded-full px-6"
                    >
            ADICIONAR ÁREA
                    </Button>
                  </div>
          </div>
      )}

      {/* Footer com botões Cancelar/Salvar */}
      <div className="flex justify-end gap-3 pt-6 border-t">
                        <Button
                          variant="ghost"
          onClick={() => {
            setViewMode('list');
            navigate('/presets');
          }}
          className="text-gray-600"
        >
          CANCELAR
                        </Button>
                        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-versys-primary hover:bg-versys-secondary text-white"
        >
          SALVAR
                        </Button>
            </div>
                      </div>
    );

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {viewMode === 'list' && renderList()}
      {(viewMode === 'create' || viewMode === 'edit') && renderForm()}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!presetToDelete} onOpenChange={() => setPresetToDelete(null)}>
                        <AlertDialogContent>
                          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Preset</AlertDialogTitle>
                            <AlertDialogDescription>
              Tem certeza que deseja excluir o preset "{presetToDelete?.nome}"?
              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
              onClick={handleDelete}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
    </div>
  );
};

export default Presets; 
