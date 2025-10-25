import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Eye, Save, X, Settings, ChevronRight, ChevronDown, ArrowLeft, ArrowRight, CheckCircle, Grid, List, Package, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  tipo: "texto" | "numero" | "data" | "email" | "telefone" | "url" | "textarea";
  obrigatorio: boolean;
}

interface NewAtributo {
  nome: string;
  tipo: "texto" | "numero" | "data" | "email" | "telefone" | "url" | "textarea";
  obrigatorio: boolean;
}

const Itens = () => {
  const [displayMode, setDisplayMode] = useState<'card' | 'list'>('list');
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'create' | 'edit'>('list');
  
  // Estados para criação/edição
  const [formData, setFormData] = useState({
    nome: "",
    atributos: [] as NewAtributo[]
  });
  const [selectedAtributoIndex, setSelectedAtributoIndex] = useState<number>(-1);
  const [expandedAtributos, setExpandedAtributos] = useState<Set<number>>(new Set());

  const tiposAtributo = [
    { value: "texto", label: "Texto" },
    { value: "numero", label: "Número" },
    { value: "data", label: "Data" },
    { value: "email", label: "E-mail" },
    { value: "telefone", label: "Telefone" },
    { value: "url", label: "URL" },
    { value: "textarea", label: "Texto Longo" }
  ];

  // Carregar itens
  useEffect(() => {
    fetchItens();
  }, []);

  const fetchItens = async () => {
    try {
      setLoading(true);
      // Usar uma coleção que já funciona
      const querySnapshot = await getDocs(collection(db, "projetos"));
      const itensData: Item[] = [];
      
      // Filtrar apenas documentos que têm o campo 'tipo' como 'item'
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.tipo === 'item') {
          itensData.push({ id: doc.id, ...data } as Item);
        }
      });
      
      setItens(itensData);
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
      toast.error("Erro ao carregar itens");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (item: Item) => {
    try {
      await deleteDoc(doc(db, "projetos", item.id));
      toast.success("Item excluído com sucesso!");
      fetchItens();
    } catch (error) {
      console.error("Erro ao excluir item:", error);
      toast.error("Erro ao excluir item");
    }
  };

  const openCreateMode = () => {
    setFormData({
      nome: "",
      atributos: []
    });
    setSelectedAtributoIndex(-1);
    setExpandedAtributos(new Set());
    setViewMode('create');
  };

  const openEditMode = (item: Item) => {
    setFormData({
      nome: item.nome,
      atributos: item.atributos.map(attr => ({
        nome: attr.nome,
        tipo: attr.tipo,
        obrigatorio: attr.obrigatorio
      }))
    });
    setSelectedItem(item);
    setSelectedAtributoIndex(-1);
    setExpandedAtributos(new Set());
    setViewMode('edit');
  };

  const openViewMode = (item: Item) => {
    setSelectedItem(item);
    setViewMode('view');
  };

  const backToList = () => {
    setViewMode('list');
    setSelectedItem(null);
    setSelectedAtributoIndex(-1);
  };

  const handleCreateItem = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome do item é obrigatório");
      return;
    }

    try {
      const newItem = {
        nome: formData.nome.trim(),
        atributos: formData.atributos.map((attr, index) => ({
          id: `attr_${index}`,
          nome: attr.nome.trim(),
          tipo: attr.tipo,
          obrigatorio: attr.obrigatorio
        })),
        tipo: 'item', // Marcar como item para filtrar depois
        criadoEm: new Date()
      };
      
      await addDoc(collection(db, "projetos"), newItem);
      toast.success("Item criado com sucesso!");
      fetchItens();
      backToList();
    } catch (error) {
      console.error("Erro ao criar item:", error);
      toast.error("Erro ao criar item");
    }
  };

  const handleEditItem = async () => {
    if (!selectedItem || !formData.nome.trim()) {
      toast.error("Nome do item é obrigatório");
      return;
    }

    try {
      const updatedItem = {
        nome: formData.nome.trim(),
        atributos: formData.atributos.map((attr, index) => ({
          id: `attr_${index}`,
          nome: attr.nome.trim(),
          tipo: attr.tipo,
          obrigatorio: attr.obrigatorio
        })),
        tipo: 'item' // Manter o tipo
      };

      await updateDoc(doc(db, "projetos", selectedItem.id), updatedItem);
      toast.success("Item atualizado com sucesso!");
      fetchItens();
      backToList();
    } catch (error) {
      console.error("Erro ao atualizar item:", error);
      toast.error("Erro ao atualizar item");
    }
  };

  const addNewAtributo = () => {
    const newAtributo: NewAtributo = {
      nome: "",
      tipo: "texto",
      obrigatorio: false
    };
    
    setFormData(prev => ({
      ...prev,
      atributos: [...prev.atributos, newAtributo]
    }));
    
    const newIndex = formData.atributos.length;
    setSelectedAtributoIndex(newIndex);
    setExpandedAtributos(prev => new Set([...prev, newIndex]));
  };

  const removeAtributo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      atributos: prev.atributos.filter((_, i) => i !== index)
    }));
    setSelectedAtributoIndex(-1);
  };

  const updateAtributo = (index: number, field: keyof NewAtributo, value: any) => {
    setFormData(prev => ({
      ...prev,
      atributos: prev.atributos.map((attr, i) => 
        i === index ? { ...attr, [field]: value } : attr
      )
    }));
  };



  const toggleAtributoExpansion = (index: number) => {
    setExpandedAtributos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
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
            {viewMode === 'create' ? 'Criar Novo Item' : 'Editar Item'}
          </h1>
        </div>
        <Button onClick={viewMode === 'create' ? handleCreateItem : handleEditItem}>
          <Save className="h-4 w-4 mr-2" />
          {viewMode === 'create' ? 'Criar Item' : 'Salvar Alterações'}
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
               <Label htmlFor="nome">Nome do Item *</Label>
               <Input
                 id="nome"
                 value={formData.nome}
                 onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                 placeholder="Ex: Câmera, Sensor, etc."
               />
             </div>
           </CardContent>
         </Card>

        {/* Atributos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Atributos</CardTitle>
              <Button onClick={addNewAtributo} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Atributo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {formData.atributos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum atributo definido</p>
                <p className="text-sm">Clique em "Adicionar Atributo" para começar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.atributos.map((atributo, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAtributoExpansion(index)}
                        >
                          {expandedAtributos.has(index) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <span className="font-medium">
                          {atributo.nome || `Atributo ${index + 1}`}
                        </span>
                        <Badge variant={atributo.obrigatorio ? "default" : "secondary"}>
                          {atributo.obrigatorio ? "Obrigatório" : "Opcional"}
                        </Badge>
                        <Badge variant="outline">{atributo.tipo}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAtributo(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {expandedAtributos.has(index) && (
                      <div className="space-y-4 pl-6">
                                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div>
                             <Label>Nome do Atributo *</Label>
                             <Input
                               value={atributo.nome}
                               onChange={(e) => updateAtributo(index, 'nome', e.target.value)}
                               placeholder="Ex: Local, Número, etc."
                             />
                           </div>
                           <div>
                             <Label>Tipo *</Label>
                             <Select
                               value={atributo.tipo}
                               onValueChange={(value: any) => updateAtributo(index, 'tipo', value)}
                             >
                               <SelectTrigger>
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                 {tiposAtributo.map(tipo => (
                                   <SelectItem key={tipo.value} value={tipo.value}>
                                     {tipo.label}
                                   </SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                           </div>
                           <div className="flex items-center space-x-2">
                             <Switch
                               id={`obrigatorio-${index}`}
                               checked={atributo.obrigatorio}
                               onCheckedChange={(checked) => updateAtributo(index, 'obrigatorio', checked)}
                             />
                             <Label htmlFor={`obrigatorio-${index}`}>Obrigatório</Label>
                           </div>
                         </div>

                        
                      </div>
                    )}
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
          <h1 className="text-3xl font-bold">Itens</h1>
          <p className="text-muted-foreground">Gerencie os itens e seus atributos</p>
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
            Novo Item
          </Button>
        </div>
      </div>

      {/* Lista de itens */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando itens...</p>
        </div>
      ) : itens.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Nenhum item encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Comece criando seu primeiro item com atributos personalizados
            </p>
            <Button onClick={openCreateMode}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Item
            </Button>
          </CardContent>
        </Card>
      ) : displayMode === 'list' ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome do Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Atributos
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
              {itens.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-versys-primary mr-3 flex-shrink-0" />
                      <div className="text-sm font-medium text-gray-900">
                        {item.nome}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.atributos.slice(0, 3).map((atributo) => (
                        <Badge key={atributo.id} variant="secondary" className="text-xs">
                          {atributo.nome}
                        </Badge>
                      ))}
                      {item.atributos.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{item.atributos.length - 3}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {item.atributos.length}
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
                        <DropdownMenuItem onClick={() => openViewMode(item)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditMode(item)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteItem(item)}
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
          {itens.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{item.nome}</CardTitle>
                  <Badge variant="outline">{item.atributos.length} atributos</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                
                <div className="flex flex-wrap gap-1">
                  {item.atributos.slice(0, 4).map((atributo) => (
                    <Badge key={atributo.id} variant="secondary" className="text-xs">
                      {atributo.nome}
                    </Badge>
                  ))}
                  {item.atributos.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{item.atributos.length - 4}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openViewMode(item)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditMode(item)}
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
    if (!selectedItem) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={backToList}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">{selectedItem.nome}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => openEditMode(selectedItem)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>

        {/* Detalhes do item */}
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Nome</Label>
                <p className="text-lg">{selectedItem.nome}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Criado em</Label>
                  <p>{selectedItem.criadoEm ? new Date(selectedItem.criadoEm.seconds * 1000).toLocaleDateString('pt-BR') : 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Atualizado em</Label>
                  <p>{selectedItem.atualizadoEm ? new Date(selectedItem.atualizadoEm.seconds * 1000).toLocaleDateString('pt-BR') : 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Atributos ({selectedItem.atributos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedItem.atributos.length === 0 ? (
                <p className="text-muted-foreground">Nenhum atributo definido para este item.</p>
              ) : (
                <div className="space-y-4">
                  {selectedItem.atributos.map((atributo, index) => (
                    <div key={atributo.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{atributo.nome}</h4>
                        <Badge variant={atributo.obrigatorio ? "default" : "secondary"}>
                          {atributo.obrigatorio ? "Obrigatório" : "Opcional"}
                        </Badge>
                        <Badge variant="outline">{atributo.tipo}</Badge>
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

export default Itens; 