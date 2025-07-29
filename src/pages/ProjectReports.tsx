import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet, Filter, Search, ArrowLeft, FolderOpen, Building2, User, BarChart3, TrendingUp, Calendar, Image, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { RelatorioService } from '@/lib/relatorioService';
import { RelatorioItem } from '@/lib/types';
import { db, storage } from '@/lib/firebase';
import { ref, getBlob } from 'firebase/storage';

const ProjectReports = () => {
  const { userData } = useAuthContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [relatorios, setRelatorios] = useState<RelatorioItem[]>([]);
  const [filteredData, setFilteredData] = useState<RelatorioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectId, setProjectId] = useState<string | null>(null);

  // Estados para filtros únicos
  const [categories, setCategories] = useState<string[]>([]);
  const [statuses] = useState(['pending', 'in_progress', 'completed', 'approved', 'rejected']);

  // Efeito para carregar relatórios
  useEffect(() => {
    console.log('🔄 DEBUG: useEffect executado');
    console.log('🔍 DEBUG: searchParams:', searchParams.toString());
    console.log('👤 DEBUG: userData:', userData);
    
    const projectIdFromUrl = searchParams.get('projectId');
    console.log('📋 DEBUG: projectIdFromUrl:', projectIdFromUrl);
    
    setProjectId(projectIdFromUrl);
    
    if (projectIdFromUrl) {
      console.log('🚀 DEBUG: Chamando loadRelatorioByProject...');
      loadRelatorioByProject(projectIdFromUrl);
    } else {
      console.log('⚠️ DEBUG: Nenhum projectId na URL, redirecionando...');
      // Se não há projectId, redirecionar para projetos
      navigate('/client-projects');
    }
  }, [searchParams, userData]);

  useEffect(() => {
    applyFilters();
  }, [relatorios, searchTerm, categoryFilter, statusFilter]);

  const loadRelatorioByProject = async (projectId: string) => {
    try {
      setLoading(true);
      console.log('🔍 DEBUG: loadRelatorioByProject iniciado para projeto:', projectId);
      console.log('👤 DEBUG: User data:', userData);
      
      // Carregar dados diretamente do projeto
      console.log('🚀 DEBUG: Carregando dados do projeto...');
      await loadProjectDataDirectly(projectId);
      
    } catch (error) {
      console.error('❌ DEBUG: Erro ao carregar relatório do projeto:', error);
      toast.error('Erro ao carregar relatório do projeto');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectDataDirectly = async (projectId: string) => {
    try {
      console.log('🔍 DEBUG: Iniciando loadProjectDataDirectly para projeto:', projectId);
      
      // Buscar dados do projeto
      const { doc, getDoc } = await import('firebase/firestore');
      const projectDoc = await getDoc(doc(db, 'projetos', projectId));
      
      if (!projectDoc.exists()) {
        console.error('❌ DEBUG: Projeto não encontrado no Firestore');
        toast.error('Projeto não encontrado');
        return;
      }
      
      const projectData = projectDoc.data();
      console.log('📊 DEBUG: Dados do projeto encontrados:', projectData);
      console.log('📊 DEBUG: customAccordions existe?', !!projectData.customAccordions);
      console.log('📊 DEBUG: customAccordions length:', projectData.customAccordions?.length);
      console.log('📊 DEBUG: customAccordions completo:', JSON.stringify(projectData.customAccordions, null, 2));
      
      // Verificar permissões
      if (userData?.type === 'client') {
        if (projectData.clienteId !== userData.uid) {
          console.error('❌ DEBUG: Cliente não tem permissão. ClienteId:', projectData.clienteId, 'UserData.uid:', userData.uid);
          toast.error('Você não tem permissão para acessar este projeto');
          navigate('/client-projects');
          return;
        }
      }
      
      // Converter dados do projeto para formato de relatório
      const relatoriosFromProject: RelatorioItem[] = [];
      
      if (projectData.customAccordions && projectData.customAccordions.length > 0) {
        console.log('📁 DEBUG: Processando customAccordions...');
        projectData.customAccordions.forEach((accordion: any, accordionIndex: number) => {
          console.log(`📂 DEBUG: Accordion ${accordionIndex + 1}:`, accordion.title);
          console.log(`📂 DEBUG: Items no accordion:`, accordion.items?.length || 0);
          console.log(`📂 DEBUG: Items completo:`, JSON.stringify(accordion.items, null, 2));
          
          if (accordion.items && accordion.items.length > 0) {
            accordion.items.forEach((item: any, itemIndex: number) => {
              console.log(`📄 DEBUG: Item ${itemIndex + 1}:`, item.category || 'Sem categoria');
              console.log(`📄 DEBUG: Item title:`, item.title || 'Sem título do item');
              console.log(`📄 DEBUG: SubItems no item:`, item.subItems?.length || 0);
              console.log(`📄 DEBUG: SubItems completo:`, JSON.stringify(item.subItems, null, 2));
              
              const category = item.category || accordion.title || 'Categoria não informada';
              
              if (item.subItems && item.subItems.length > 0) {
                item.subItems.forEach((subItem: any, subItemIndex: number) => {
                  console.log(`🔹 DEBUG: SubItem ${subItemIndex + 1}:`, subItem.title || 'Sem título');
                  console.log(`🔹 DEBUG: SubItem photos:`, subItem.photos);
                  console.log(`🔹 DEBUG: SubItem completo:`, JSON.stringify(subItem, null, 2));
                  
                  const relatorioItem: RelatorioItem = {
                    id: `${projectId}-${subItem.id}`,
                    projectId,
                    projectName: projectData.nome || 'Projeto sem nome',
                    clientId: projectData.clienteId || '',
                    clientName: projectData.cliente?.nome || 'Cliente não informado',
                    clientEmail: projectData.cliente?.email || '',
                    category,
                    itemTitle: item.title || 'Artigo não informado',
                    subItemId: subItem.id,
                    subItemTitle: subItem.title,
                    local: subItem.local || 'Local não informado',
                    currentSituation: subItem.currentSituation || '',
                    clientGuidance: subItem.clientGuidance || subItem.adminFeedback || '',
                    responsible: subItem.responsible || '',
                    whatWasDone: subItem.whatWasDone || '',
                    startDate: subItem.startDate || '',
                    endDate: subItem.endDate || '',
                    status: determineStatus(subItem),
                    evaluation: subItem.evaluation || '',
                    photos: Array.isArray(subItem.photos) 
                      ? subItem.photos.map((photo: any) => 
                          typeof photo === 'string' ? photo : photo.url || photo
                        ).filter(Boolean)
                      : [],
                    adequacyReported: subItem.adequacyReported || false,
                    adequacyStatus: subItem.adequacyStatus || 'pending',
                    adequacyDetails: subItem.adequacyDetails || '',
                    adequacyImages: subItem.adequacyImages || [],
                    adequacyDate: subItem.adequacyDate || '',
                    adminFeedback: subItem.adminFeedback || '',
                    adminRejectionReason: subItem.adminRejectionReason || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: userData?.uid || '',
                    updatedBy: userData?.uid || ''
                  };

                  console.log(`✅ DEBUG: RelatorioItem criado:`, relatorioItem);
                  relatoriosFromProject.push(relatorioItem);
                });
              } else {
                console.log(`⚠️ DEBUG: Item ${itemIndex + 1} não possui subItems ou subItems está vazio`);
              }
            });
          } else {
            console.log(`⚠️ DEBUG: Accordion ${accordionIndex + 1} não possui items ou items está vazio`);
          }
        });
      } else {
        console.log('⚠️ DEBUG: Projeto não possui customAccordions ou está vazio');
        console.log('📋 DEBUG: Estrutura completa do projeto:', JSON.stringify(projectData, null, 2));
      }
      
      console.log('📊 DEBUG: Total de itens criados:', relatoriosFromProject.length);
      console.log('📊 DEBUG: Itens criados:', relatoriosFromProject);
      setRelatorios(relatoriosFromProject);
      
      // Extrair categorias únicas
      const uniqueCategories = [...new Set(relatoriosFromProject.map(r => r.category))];
      setCategories(uniqueCategories.sort());
      console.log('📂 DEBUG: Categorias encontradas:', uniqueCategories);
      
    } catch (error) {
      console.error('❌ DEBUG: Erro ao carregar dados do projeto:', error);
      toast.error('Erro ao carregar dados do projeto');
    }
  };

  const determineStatus = (subItem: any): 'pending' | 'in_progress' | 'completed' | 'approved' | 'rejected' => {
    if (subItem.adequacyStatus === 'approved') return 'approved';
    if (subItem.adequacyStatus === 'rejected') return 'rejected';
    if (subItem.adequacyReported) return 'in_progress';
    if (subItem.evaluation && subItem.currentSituation && subItem.clientGuidance) return 'completed';
    return 'pending';
  };

  const applyFilters = () => {
    let filtered = relatorios;

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.local.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.currentSituation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clientGuidance.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subItemTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de categoria
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    setFilteredData(filtered);
  };

  const exportToCSV = () => {
    if (filteredData.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const headers = [
      'Projeto',
      'Cliente',
      'Categoria',
      'Item',
      'Local',
      'Situação Atual',
      'Orientação',
      'Responsável',
      'Status',
      'Avaliação',
      'Adequação Reportada',
      'Status da Adequação'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => [
        `"${item.projectName}"`,
        `"${item.clientName}"`,
        `"${item.category}"`,
        `"${item.subItemTitle}"`,
        `"${item.local}"`,
        `"${item.currentSituation}"`,
        `"${item.clientGuidance}"`,
        `"${item.responsible || ''}"`,
        `"${item.status}"`,
        `"${item.evaluation}"`,
        `"${item.adequacyReported ? 'Sim' : 'Não'}"`,
        `"${item.adequacyStatus || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${projectId || 'geral'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      in_progress: { label: 'Em Andamento', className: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Concluído', className: 'bg-green-100 text-green-800' },
      approved: { label: 'Aprovado', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejeitado', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, className: 'bg-gray-100 text-gray-800' };
    
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getEvaluationBadge = (evaluation: string) => {
    const evaluationConfig = {
      nc: { label: 'NC', className: 'bg-red-100 text-red-800' },
      r: { label: 'R', className: 'bg-yellow-100 text-yellow-800' },
      na: { label: 'NA', className: 'bg-green-100 text-green-800' }
    };

    const config = evaluationConfig[evaluation as keyof typeof evaluationConfig] || { label: evaluation, className: 'bg-gray-100 text-gray-800' };
    
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getProjectSummary = () => {
    const totalItems = relatorios.length;
    const completedItems = relatorios.filter(r => r.status === 'completed').length;
    const pendingItems = relatorios.filter(r => r.status === 'pending').length;
    const inProgressItems = relatorios.filter(r => r.status === 'in_progress').length;

    return { totalItems, completedItems, pendingItems, inProgressItems };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const summary = getProjectSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-versys-primary">
              {projectId ? 'Relatório do Projeto' : 'Meus Relatórios'}
            </h2>
            <p className="text-gray-600 mt-2">
              {projectId ? 'Visualize e gerencie o relatório deste projeto' : 'Visualize e gerencie seus relatórios'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">

          <Button
            onClick={exportToCSV}
            variant="outline"
            className="flex items-center space-x-2"
            disabled={relatorios.length === 0}
          >
            <Download size={16} />
            <span>Exportar CSV</span>
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total de Itens</p>
                <p className="text-2xl font-bold">{summary.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Concluídos</p>
                <p className="text-2xl font-bold">{summary.completedItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Em Andamento</p>
                <p className="text-2xl font-bold">{summary.inProgressItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold">{summary.pendingItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                placeholder="Buscar em todos os campos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status === 'pending' ? 'Pendente' :
                       status === 'in_progress' ? 'Em Andamento' :
                       status === 'completed' ? 'Concluído' :
                       status === 'approved' ? 'Aprovado' :
                       status === 'rejected' ? 'Rejeitado' : status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Dados */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Relatório</CardTitle>
          <CardDescription>
            {filteredData.length} itens encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum relatório encontrado
              </h3>
              <p className="text-gray-600">
                {projectId ? 'Este projeto ainda não possui relatórios.' : 'Você ainda não possui relatórios.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Artigo</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Situação Atual</TableHead>
                    <TableHead>Orientação</TableHead>
                    <TableHead>Fotos</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Adequação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell className="font-medium">{item.itemTitle}</TableCell>
                      <TableCell>{item.subItemTitle}</TableCell>
                      <TableCell>{item.local}</TableCell>
                      <TableCell className="max-w-xs truncate" title={item.currentSituation}>
                        {item.currentSituation || '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={item.clientGuidance}>
                        {item.clientGuidance || '-'}
                      </TableCell>
                      <TableCell>
                        {item.photos && item.photos.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.photos.map((photo, index) => (
                                <div key={index} className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      console.log('📥 Tentando baixar foto:', photo);
                                      try {
                                        if (photo && typeof photo === 'string') {
                                          // Método 1: Tentar download direto via link (sem CORS)
                                          try {
                                            console.log('🔗 Tentando download direto...');
                                            const link = document.createElement('a');
                                            link.href = photo;
                                            link.download = `foto-${item.subItemTitle.replace(/[^a-zA-Z0-9]/g, '-')}-${index + 1}.jpg`;
                                            link.target = '_blank';
                                            link.rel = 'noopener noreferrer';
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            toast.success('Foto baixada com sucesso!');
                                            return;
                                          } catch (directError) {
                                            console.warn('⚠️ Download direto falhou, tentando via Firebase SDK...', directError);
                                          }

                                          // Método 2: Usar Firebase SDK como fallback
                                          const urlObj = new URL(photo);
                                          const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
                                          
                                          if (pathMatch) {
                                            const filePath = decodeURIComponent(pathMatch[1]);
                                            console.log('📂 Tentando via Firebase SDK:', filePath);
                                            
                                            const fileRef = ref(storage, filePath);
                                            const blob = await getBlob(fileRef);
                                            
                                            const blobUrl = window.URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = blobUrl;
                                            link.download = `foto-${item.subItemTitle.replace(/[^a-zA-Z0-9]/g, '-')}-${index + 1}.jpg`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            window.URL.revokeObjectURL(blobUrl);
                                            toast.success('Foto baixada com sucesso!');
                                          } else {
                                            // Método 3: Fallback final - abrir em nova aba
                                            console.warn('⚠️ Não foi possível extrair caminho, abrindo em nova aba...');
                                            window.open(photo, '_blank');
                                            toast.info('Foto aberta em nova aba. Clique com o botão direito para salvar.');
                                          }
                                        } else {
                                          toast.error('URL da foto inválida');
                                          console.error('URL inválida:', photo);
                                        }
                                      } catch (error) {
                                        console.error('Erro ao baixar foto:', error);
                                        // Fallback final: abrir em nova aba
                                        try {
                                          window.open(photo, '_blank');
                                          toast.info('Erro no download automático. Foto aberta em nova aba.');
                                        } catch (finalError) {
                                          toast.error('Erro ao acessar foto. Verifique se ela existe.');
                                        }
                                      }
                                    }}
                                    className="h-8 px-2 text-xs"
                                    title="Baixar foto"
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    Foto {index + 1}
                                  </Button>
                                </div>
                              ))}
                          </div>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Image className="h-4 w-4" />
                              <span className="text-xs">Sem fotos</span>
                            </div>
                          )}
                        </TableCell>
                      <TableCell>{item.responsible || '-'}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>{getEvaluationBadge(item.evaluation)}</TableCell>
                      <TableCell>
                        <Badge variant={item.adequacyReported ? 'default' : 'secondary'}>
                          {item.adequacyReported ? 'Reportada' : 'Não Reportada'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectReports;
