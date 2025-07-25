import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ClipboardCheck, 
  CheckCircle, 
  Clock, 
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Calendar,
  Eye,
  ThumbsUp,
  ThumbsDown,
  ZoomIn,
  X,
  ArrowLeft,
  Building,
  User,
  FileText,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AdequacyItem {
  id: string;
  title: string;
  adequacyDetails: string;
  adequacyImages?: string[];
  adequacyDate: string;
  adequacyStatus: "pending" | "approved" | "rejected";
  adequacyRevisionCount?: number;
  adminRejectionReason?: string;
  accordionTitle: string;
  itemTitle: string;
  accordionId: string;
  itemId: string;
  projectId: string;
  projectName: string;
  clientName: string;
  clientCompany: string;
}

const AdminAdequacyManagement = () => {
  const navigate = useNavigate();
  const { userData } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [adequacies, setAdequacies] = useState<AdequacyItem[]>([]);
  const [filteredAdequacies, setFilteredAdequacies] = useState<AdequacyItem[]>([]);
  
  // Estados de filtro e busca
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  
  // Estados para avaliação
  const [evaluatingAdequacy, setEvaluatingAdequacy] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  useEffect(() => {
    if (!userData) {
      navigate("/");
      return;
    }
    if (userData.type !== "admin") {
      navigate("/dashboard");
      return;
    }
    loadAdequacies();
  }, [navigate, userData]);

  const loadAdequacies = async () => {
    try {
      setLoading(true);
      const projectsRef = collection(db, 'projetos');
      const projectsSnapshot = await getDocs(projectsRef);
      
      const allAdequacies: AdequacyItem[] = [];
      
      projectsSnapshot.forEach((projectDoc) => {
        const projectData = projectDoc.data();
        const projectId = projectDoc.id;
        
        if (projectData.customAccordions) {
          projectData.customAccordions.forEach((accordion: any) => {
            accordion.items.forEach((item: any) => {
              item.subItems.forEach((subItem: any) => {
                if (subItem.adequacyReported) {
                  allAdequacies.push({
                    id: subItem.id,
                    title: subItem.title,
                    adequacyDetails: subItem.adequacyDetails,
                    adequacyImages: subItem.adequacyImages,
                    adequacyDate: subItem.adequacyDate,
                    adequacyStatus: subItem.adequacyStatus,
                    adequacyRevisionCount: subItem.adequacyRevisionCount,
                    adminRejectionReason: subItem.adminRejectionReason,
                    accordionTitle: accordion.title,
                    itemTitle: item.title,
                    accordionId: accordion.id,
                    itemId: item.id,
                    projectId: projectId,
                    projectName: projectData.nome,
                    clientName: projectData.cliente?.nome || 'Cliente não informado',
                    clientCompany: projectData.cliente?.empresa || 'Empresa não informada'
                  });
                }
              });
            });
          });
        }
      });
      
      setAdequacies(allAdequacies);
      setFilteredAdequacies(allAdequacies);
    } catch (error) {
      console.error('Erro ao carregar adequações:', error);
      toast.error('Erro ao carregar adequações');
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros
  useEffect(() => {
    let filtered = adequacies;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(adequacy => adequacy.adequacyStatus === statusFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(adequacy => 
        adequacy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adequacy.adequacyDetails.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adequacy.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adequacy.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adequacy.clientCompany.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (projectFilter !== 'all') {
      filtered = filtered.filter(adequacy => adequacy.projectId === projectFilter);
    }
    
    setFilteredAdequacies(filtered);
  }, [adequacies, statusFilter, searchTerm, projectFilter]);

  const approveAdequacy = async (adequacy: AdequacyItem) => {
    try {
      const projectRef = doc(db, 'projetos', adequacy.projectId);
      
      // Buscar o projeto atual
      const projectDoc = await getDocs(query(collection(db, 'projetos'), where('__name__', '==', adequacy.projectId)));
      const projectData = projectDoc.docs[0]?.data();
      
      if (!projectData) {
        toast.error('Projeto não encontrado');
        return;
      }
      
      // Atualizar a adequação específica
      const updatedAccordions = projectData.customAccordions?.map((accordion: any) => {
        if (accordion.id === adequacy.accordionId) {
          return {
            ...accordion,
            items: accordion.items.map((item: any) => {
              if (item.id === adequacy.itemId) {
                return {
                  ...item,
                  subItems: item.subItems.map((subItem: any) => {
                    if (subItem.id === adequacy.id) {
                      return {
                        ...subItem,
                        adequacyStatus: 'approved' as const,
                        completed: true
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
        customAccordions: updatedAccordions
      });

      // Atualizar estado local
      setAdequacies(prev => prev.map(a => 
        a.id === adequacy.id && a.projectId === adequacy.projectId
          ? { ...a, adequacyStatus: 'approved' }
          : a
      ));

      toast.success('Adequação aprovada com sucesso!');
    } catch (error) {
      console.error('Erro ao aprovar adequação:', error);
      toast.error('Erro ao aprovar adequação');
    }
  };

  const rejectAdequacy = async (adequacy: AdequacyItem) => {
    if (!rejectionReason.trim()) {
      toast.error('Por favor, informe o motivo da rejeição.');
      return;
    }
    
    try {
      const projectRef = doc(db, 'projetos', adequacy.projectId);
      
      // Buscar o projeto atual
      const projectDoc = await getDocs(query(collection(db, 'projetos'), where('__name__', '==', adequacy.projectId)));
      const projectData = projectDoc.docs[0]?.data();
      
      if (!projectData) {
        toast.error('Projeto não encontrado');
        return;
      }
      
      // Atualizar a adequação específica
      const updatedAccordions = projectData.customAccordions?.map((accordion: any) => {
        if (accordion.id === adequacy.accordionId) {
          return {
            ...accordion,
            items: accordion.items.map((item: any) => {
              if (item.id === adequacy.itemId) {
                return {
                  ...item,
                  subItems: item.subItems.map((subItem: any) => {
                    if (subItem.id === adequacy.id) {
                      return {
                        ...subItem,
                        adequacyStatus: 'rejected' as const,
                        adminRejectionReason: rejectionReason,
                        completed: false
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
        customAccordions: updatedAccordions
      });

      // Atualizar estado local
      setAdequacies(prev => prev.map(a => 
        a.id === adequacy.id && a.projectId === adequacy.projectId
          ? { ...a, adequacyStatus: 'rejected', adminRejectionReason: rejectionReason }
          : a
      ));

      setEvaluatingAdequacy(null);
      setRejectionReason('');
      toast.success('Adequação rejeitada. Cliente será notificado.');
    } catch (error) {
      console.error('Erro ao rejeitar adequação:', error);
      toast.error('Erro ao rejeitar adequação');
    }
  };

  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setImageModalOpen(false);
  };

  const getStatusStats = () => {
    const pending = adequacies.filter(a => a.adequacyStatus === 'pending').length;
    const approved = adequacies.filter(a => a.adequacyStatus === 'approved').length;
    const rejected = adequacies.filter(a => a.adequacyStatus === 'rejected').length;
    return { pending, approved, rejected, total: adequacies.length };
  };

  const stats = getStatusStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-10">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-600">Carregando adequações...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate("/projetos")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft size={16} />
              <span>Voltar</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestão de Adequações</h1>
              <p className="text-sm text-gray-600">Revisão e aprovação de adequações de todos os projetos</p>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total de Adequações</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-gray-600">Pendentes</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                <div className="text-sm text-gray-600">Aprovadas</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                <div className="text-sm text-gray-600">Rejeitadas</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar adequações, projetos ou clientes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="approved">Aprovadas</SelectItem>
                  <SelectItem value="rejected">Rejeitadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Adequações */}
        <div className="space-y-4">
          {filteredAdequacies.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ClipboardCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma adequação encontrada</h3>
                <p className="text-gray-600">
                  {adequacies.length === 0 
                    ? "Não há adequações submetidas pelos clientes."
                    : "Tente ajustar os filtros de busca."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAdequacies.map((adequacy) => (
              <Card key={`${adequacy.projectId}_${adequacy.id}`} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{adequacy.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {adequacy.accordionTitle} → {adequacy.itemTitle}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                        <span className="flex items-center">
                          <Building className="h-4 w-4 mr-1" />
                          {adequacy.projectName}
                        </span>
                        <span className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {adequacy.clientName} ({adequacy.clientCompany})
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(adequacy.adequacyDate).toLocaleDateString('pt-BR')} às {new Date(adequacy.adequacyDate).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="h-4 w-4 text-gray-600" />
                          <span className="font-medium text-sm">Descrição da Adequação</span>
                        </div>
                        <p className="text-sm text-gray-700">{adequacy.adequacyDetails}</p>
                      </div>

                      {adequacy.adequacyRevisionCount > 0 && (
                        <div className="flex items-center space-x-2 text-orange-600 text-sm mb-3">
                          <AlertTriangle className="h-4 w-4" />
                          <span>{adequacy.adequacyRevisionCount} revisão{adequacy.adequacyRevisionCount > 1 ? 'ões' : 'ão'} anterior{adequacy.adequacyRevisionCount > 1 ? 'es' : ''}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {adequacy.adequacyStatus === 'pending' && (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                      {adequacy.adequacyStatus === 'approved' && (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Aprovada
                        </Badge>
                      )}
                      {adequacy.adequacyStatus === 'rejected' && (
                        <Badge className="bg-red-100 text-red-800 border-red-200">
                          <XCircle className="h-3 w-3 mr-1" />
                          Rejeitada
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Evidências */}
                  {adequacy.adequacyImages && adequacy.adequacyImages.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <ImageIcon className="h-4 w-4 text-gray-600" />
                        <span className="font-medium text-sm">Evidências ({adequacy.adequacyImages.length})</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {adequacy.adequacyImages.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={image}
                              alt={`Evidência ${index + 1}`}
                              className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => openImageModal(image)}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="bg-white rounded-full p-1">
                                  <ZoomIn className="h-3 w-3 text-gray-600" />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ações para adequações pendentes */}
                  {adequacy.adequacyStatus === 'pending' && (
                    <div className="flex items-center space-x-2 pt-4 border-t border-gray-100">
                      <Button
                        size="sm"
                        onClick={() => approveAdequacy(adequacy)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEvaluatingAdequacy(adequacy.id)}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <ThumbsDown className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/project/${adequacy.projectId}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Projeto
                      </Button>
                    </div>
                  )}

                  {/* Formulário de rejeição */}
                  {evaluatingAdequacy === adequacy.id && (
                    <div className="bg-red-50 rounded-lg p-4 mt-4 border border-red-200">
                      <h5 className="font-medium text-red-900 mb-3">Motivo da Rejeição</h5>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Motivo da rejeição:</Label>
                          <Textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Descreva o motivo da rejeição e orientações para correção..."
                            className="mt-1"
                            rows={3}
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => rejectAdequacy(adequacy)}
                            disabled={!rejectionReason.trim()}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Confirmar Rejeição
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEvaluatingAdequacy(null);
                              setRejectionReason('');
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status de adequação aprovada/rejeitada */}
                  {adequacy.adequacyStatus && adequacy.adequacyStatus !== 'pending' && (
                    <div className={`rounded-lg p-3 mt-4 ${
                      adequacy.adequacyStatus === 'approved' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <h5 className={`font-medium mb-2 ${
                        adequacy.adequacyStatus === 'approved' ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {adequacy.adequacyStatus === 'approved' ? 'Adequação Aprovada' : 'Adequação Rejeitada'}
                      </h5>
                      {adequacy.adequacyStatus === 'rejected' && adequacy.adminRejectionReason && (
                        <p className="text-sm text-red-800">
                          <span className="font-medium">Motivo: </span>
                          {adequacy.adminRejectionReason}
                        </p>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/project/${adequacy.projectId}`)}
                        className="mt-2"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Projeto
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Modal de Imagem */}
        {imageModalOpen && selectedImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
            <div className="relative max-w-full max-h-full">
              <img
                src={selectedImage}
                alt="Imagem ampliada"
                className="max-w-full max-h-full object-contain"
              />
              <button
                onClick={closeImageModal}
                className="absolute top-4 right-4 bg-white p-2 rounded-full hover:bg-gray-200"
              >
                <X className="h-6 w-6 text-gray-800" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAdequacyManagement; 