import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileSpreadsheet, Filter, Search, Eye, ArrowLeft, FolderOpen, Building2, User, BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { collection, getDocs, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';

interface ClienteData {
  id: string;
  nome: string;
  email: string;
  empresa: string;
}

interface ProjectSummary {
  id: string;
  nome: string;
  cliente: ClienteData | null;
  totalItems: number;
  completedItems: number;
  pendingItems: number;
  inProgressItems: number;
  categories: string[];
}

interface ReportData {
  id: string;
  projectName: string;
  clientName: string;
  category: string;
  local: string;
  currentSituation: string;
  clientGuidance: string;
  responsible?: string;
  whatWasDone?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  photos?: string[];
  evaluation: 'nc' | 'r' | 'na' | '';
  variationName: string;
}

const ProjectReports = () => {
  const { userData } = useAuthContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [filteredData, setFilteredData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectSearchTerm, setProjectSearchTerm] = useState('');

  // Estados para filtros únicos
  const [categories, setCategories] = useState<string[]>([]);
  const [statuses] = useState(['Pendente', 'Em Andamento', 'Concluído', 'Cancelado']);

  // Efeito para carregar projeto específico via URL
  useEffect(() => {
    const projectId = searchParams.get('projectId');
    if (projectId && !selectedProject) {
      loadSpecificProject(projectId);
    } else if (!selectedProject && !projectId) {
      loadProjects();
    } else if (selectedProject) {
      loadProjectReportData(selectedProject.id);
    }
  }, [searchParams, selectedProject, userData]);

  useEffect(() => {
    if (selectedProject) {
      applyFilters();
    }
  }, [selectedProject, reportData, searchTerm, categoryFilter, statusFilter]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsRef = collection(db, 'projetos');
      let projectsQuery;
      
      // Se for cliente, filtrar apenas seus projetos
      if (userData?.type === 'client') {
        projectsQuery = query(
          projectsRef, 
          where('clienteId', '==', userData.uid),
          orderBy('createdAt', 'desc')
        );
      } else {
        projectsQuery = query(projectsRef, orderBy('createdAt', 'desc'));
      }
      
      const projectsSnapshot = await getDocs(projectsQuery);
      const projectsList: ProjectSummary[] = [];

      for (const projectDoc of projectsSnapshot.docs) {
        const projectData = projectDoc.data() as any;
        const projectName = projectData.nome || 'Projeto sem nome';
        const clientName = projectData.cliente?.nome || 'Cliente não informado';
        
        let totalItems = 0;
        let completedItems = 0;
        let pendingItems = 0;
        let inProgressItems = 0;
        const categoriesSet = new Set<string>();

        if (projectData.customAccordions) {
          projectData.customAccordions.forEach((accordion: any) => {
            accordion.items.forEach((item: any) => {
              const category = item.category || accordion.title || 'Categoria não informada';
              categoriesSet.add(category);

              item.subItems.forEach((subItem: any) => {
                totalItems++;
                const status = subItem.adequacyStatus || 'Pendente';
                
                switch (status) {
                  case 'Concluído':
                    completedItems++;
                    break;
                  case 'Em Andamento':
                    inProgressItems++;
                    break;
                  default:
                    pendingItems++;
                }
              });
            });
          });
        }

        projectsList.push({
          id: projectDoc.id,
          nome: projectName,
          cliente: {
            id: projectData.clienteId || '',
            nome: clientName,
            email: '',
            empresa: ''
          },
          totalItems,
          completedItems,
          pendingItems,
          inProgressItems,
          categories: Array.from(categoriesSet)
        });
      }

      setProjects(projectsList);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      toast.error('Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  };

  const loadSpecificProject = async (projectId: string) => {
    try {
      setLoading(true);
      const projectDoc = await getDoc(doc(db, 'projetos', projectId));
      
      if (!projectDoc.exists()) {
        toast.error('Projeto não encontrado');
        return;
      }
      
      const projectData = projectDoc.data() as any;
      console.log('Dados do projeto carregado:', projectData);
      const projectName = projectData.nome || 'Projeto sem nome';
      
      // Carregar dados do cliente se existir clienteId
      let clienteData = null;
      console.log('ClienteId encontrado:', projectData.clienteId);
      console.log('Cliente direto:', projectData.cliente);
      
      if (projectData.clienteId) {
        try {
          console.log('Buscando cliente no Firestore:', projectData.clienteId);
          const clienteDoc = await getDoc(doc(db, 'clientes', projectData.clienteId));
          console.log('Cliente doc exists:', clienteDoc.exists());
          
          if (clienteDoc.exists()) {
            const clienteInfo = clienteDoc.data();
            console.log('Dados do cliente encontrado:', clienteInfo);
            clienteData = {
              id: clienteDoc.id,
              nome: clienteInfo?.nome || 'Cliente sem nome',
              email: clienteInfo?.email || '',
              empresa: clienteInfo?.empresa || ''
            };
          } else {
            console.warn('Cliente não encontrado no Firestore:', projectData.clienteId);
            // Tentar buscar na coleção users se não encontrar em clientes
            const userDoc = await getDoc(doc(db, 'users', projectData.clienteId));
            if (userDoc.exists()) {
              const userInfo = userDoc.data();
              console.log('Cliente encontrado na coleção users:', userInfo);
              clienteData = {
                id: userDoc.id,
                nome: userInfo?.displayName || userInfo?.nome || 'Cliente sem nome',
                email: userInfo?.email || '',
                empresa: userInfo?.empresa || ''
              };
            } else {
              console.error('Cliente não encontrado em nenhuma coleção:', projectData.clienteId);
            }
          }
        } catch (error) {
          console.error('Erro ao carregar dados do cliente:', error);
        }
      } else if (projectData.cliente) {
        // Fallback para dados do cliente já salvos no projeto
        console.log('Usando dados do cliente salvos no projeto');
        clienteData = {
          id: projectData.cliente.id || '',
          nome: projectData.cliente.nome || 'Cliente sem nome',
          email: projectData.cliente.email || '',
          empresa: projectData.cliente.empresa || ''
        };
      }
      
      console.log('Cliente data final:', clienteData);
      
      // Verificar permissões
      if (userData?.type === 'client' && projectData.clienteId !== userData.uid) {
        toast.error('Você não tem permissão para acessar este projeto');
        return;
      }
      
      // Calcular estatísticas do projeto
      let totalItems = 0;
      let completedItems = 0;
      let pendingItems = 0;
      let inProgressItems = 0;
      const categoriesSet = new Set<string>();
      
      if (projectData.customAccordions) {
        projectData.customAccordions.forEach((accordion: any) => {
          accordion.items.forEach((item: any) => {
            categoriesSet.add(accordion.title);
            item.subItems.forEach((subItem: any) => {
              totalItems++;
              if (subItem.evaluation === 'nc' || subItem.evaluation === 'r' || subItem.evaluation === 'na') {
                completedItems++;
              } else {
                pendingItems++;
              }
            });
          });
        });
      }
      
      const projectSummary: ProjectSummary = {
        id: projectDoc.id,
        nome: projectName,
        cliente: clienteData,
        totalItems,
        completedItems,
        pendingItems,
        inProgressItems,
        categories: Array.from(categoriesSet)
      };
      
      setSelectedProject(projectSummary);
    } catch (error) {
      console.error('Erro ao carregar projeto específico:', error);
      toast.error('Erro ao carregar projeto');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectReportData = async (projectId: string) => {
    try {
      setLoading(true);
      const projectDoc = await getDoc(doc(db, 'projetos', projectId));

      if (!projectDoc.exists()) {
        toast.error('Projeto não encontrado');
        return;
      }

      const projectData = projectDoc.data() as any;
      const projectName = projectData.nome || 'Projeto sem nome';
      const clientName = projectData.cliente?.nome || 'Cliente não informado';

      const data: ReportData[] = [];
      const uniqueCategories = new Set<string>();

      if (projectData.customAccordions) {
        projectData.customAccordions.forEach((accordion: any) => {
          accordion.items.forEach((item: any) => {
            const category = item.category || accordion.title || 'Categoria não informada';
            uniqueCategories.add(category);

            item.subItems.forEach((subItem: any) => {
              data.push({
                id: `${projectDoc.id}-${subItem.id}`,
                projectName,
                clientName,
                category,
                local: subItem.local || 'Local não informado',
                currentSituation: subItem.currentSituation || '',
                clientGuidance: subItem.adminFeedback || subItem.clientGuidance || '',
                responsible: subItem.responsible || '',
                whatWasDone: subItem.whatWasDone || '',
                startDate: subItem.startDate || '',
                endDate: subItem.endDate || '',
                status: subItem.adequacyStatus || 'Pendente',
                photos: subItem.adminImages || [],
                evaluation: subItem.evaluation || '',
                variationName: subItem.title || 'Variação'
              });
            });
          });
        });
      }

      setReportData(data);
      setCategories(Array.from(uniqueCategories).sort());
    } catch (error) {
      console.error('Erro ao carregar dados do relatório do projeto:', error);
      toast.error('Erro ao carregar dados do relatório do projeto');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = reportData;

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.local.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.currentSituation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clientGuidance.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.variationName.toLowerCase().includes(searchTerm.toLowerCase())
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
    if (!selectedProject) return;

    try {
      const headers = [
        'Categoria',
        'Local',
        'Situação Atual',
        'Orientação para o Cliente',
        'Responsável',
        'O que foi feito?',
        'Data Inicial (Adequação)',
        'Data Final (Adequação)',
        'Situação',
        'Avaliação',
        'Variação',
        'Fotos'
      ];

      const csvData = filteredData.map(item => [
        item.category,
        item.local,
        item.currentSituation,
        item.clientGuidance,
        item.responsible || '',
        item.whatWasDone || '',
        item.startDate || '',
        item.endDate || '',
        item.status || '',
        item.evaluation || '',
        item.variationName,
        item.photos?.length || 0
      ]);

      // Criar conteúdo CSV
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          row.map(field => 
            typeof field === 'string' && field.includes(',') 
              ? `"${field.replace(/"/g, '""')}"` 
              : field
          ).join(',')
        )
      ].join('\n');

      // Criar e baixar arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_${selectedProject.nome.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast.error('Erro ao exportar relatório');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'Pendente': 'bg-yellow-100 text-yellow-800',
      'Em Andamento': 'bg-blue-100 text-blue-800',
      'Concluído': 'bg-green-100 text-green-800',
      'Cancelado': 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={statusConfig[status as keyof typeof statusConfig] || 'bg-gray-100 text-gray-800'}>
        {status || 'Não definido'}
      </Badge>
    );
  };

  const getEvaluationBadge = (evaluation: string) => {
    const evalConfig = {
      'nc': 'bg-red-100 text-red-800',
      'r': 'bg-yellow-100 text-yellow-800',
      'na': 'bg-gray-100 text-gray-800'
    };
    
    const evalText = {
      'nc': 'NC',
      'r': 'R',
      'na': 'NA'
    };
    
    return evaluation ? (
      <Badge className={evalConfig[evaluation as keyof typeof evalConfig] || 'bg-gray-100 text-gray-800'}>
        {evalText[evaluation as keyof typeof evalText] || evaluation}
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">-</Badge>
    );
  };

  const getProgressPercentage = (project: ProjectSummary) => {
    if (project.totalItems === 0) return 0;
    return Math.round((project.completedItems / project.totalItems) * 100);
  };

  const filteredProjects = projects.filter(project =>
    project.nome.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
    (project.cliente?.nome || '').toLowerCase().includes(projectSearchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-versys-primary"></div>
      </div>
    );
  }

  // Tela de seleção de projeto
  if (!selectedProject) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios por Projeto</h1>
            <p className="text-muted-foreground">
              Selecione um projeto para visualizar seu relatório detalhado
            </p>
          </div>
        </div>

        {/* Busca de projetos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Projetos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Buscar por nome do projeto ou cliente..."
              value={projectSearchTerm}
              onChange={(e) => setProjectSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </CardContent>
        </Card>

        {/* Lista de projetos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedProject(project)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-versys-primary" />
                    <CardTitle className="text-lg">{project.nome}</CardTitle>
                  </div>
                  <Badge variant="outline">{getProgressPercentage(project)}%</Badge>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {project.cliente?.nome || 'Cliente não informado'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Estatísticas */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{project.totalItems}</div>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{project.completedItems}</div>
                    <p className="text-xs text-muted-foreground">Concluídos</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{project.pendingItems}</div>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </div>
                </div>

                {/* Categorias */}
                <div>
                  <p className="text-sm font-medium mb-2">Categorias:</p>
                  <div className="flex flex-wrap gap-1">
                    {project.categories.slice(0, 3).map((category) => (
                      <Badge key={category} variant="secondary" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                    {project.categories.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{project.categories.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>

                <Button className="w-full" variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Ver Relatório
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum projeto encontrado</h3>
              <p className="text-muted-foreground">
                {projectSearchTerm ? 'Tente ajustar os termos de busca' : 'Não há projetos disponíveis'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Tela de relatório do projeto selecionado
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/projetos')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{selectedProject.nome}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {selectedProject.cliente?.nome || 'Cliente não informado'}
            </p>
          </div>
        </div>

      </div>

      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Visualizar Dados
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Configurar Exportação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4">

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">{filteredData.length}</div>
                <p className="text-xs text-muted-foreground">Total de Itens</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-green-600">
                  {filteredData.filter(item => item.status === 'Concluído').length}
                </div>
                <p className="text-xs text-muted-foreground">Concluídos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredData.filter(item => item.status === 'Em Andamento').length}
                </div>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-yellow-600">
                  {filteredData.filter(item => item.status === 'Pendente').length}
                </div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Projeto</CardTitle>
              <CardDescription>
                {filteredData.length} itens encontrados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros integrados */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Buscar em todos os campos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
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

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      {statuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Situação Atual</TableHead>
                      <TableHead>Orientação</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Avaliação</TableHead>
                      <TableHead>Fotos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.category}</TableCell>
                        <TableCell>{item.local}</TableCell>
                        <TableCell className="max-w-xs truncate" title={item.currentSituation}>
                          {item.currentSituation || '-'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={item.clientGuidance}>
                          {item.clientGuidance || '-'}
                        </TableCell>
                        <TableCell>{item.responsible || '-'}</TableCell>
                        <TableCell>{getStatusBadge(item.status || 'Pendente')}</TableCell>
                        <TableCell>{getEvaluationBadge(item.evaluation)}</TableCell>
                        <TableCell>
                          {item.photos && item.photos.length > 0 ? (
                            <Badge variant="outline">{item.photos.length}</Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Configurações de Exportação
              </CardTitle>
              <CardDescription>
                Configure os dados que serão incluídos na exportação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Colunas Básicas</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span>Categoria do Artigo</span>
                      <Badge variant="outline">Incluído</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span>Local</span>
                      <Badge variant="outline">Incluído</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span>Situação Atual</span>
                      <Badge variant="outline">Incluído</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span>Orientação para o Cliente</span>
                      <Badge variant="outline">Incluído</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Colunas Adicionais</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span>Responsável</span>
                      <Badge variant="outline">Incluído</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span>O que foi feito?</span>
                      <Badge variant="outline">Incluído</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span>Data Inicial (Adequação)</span>
                      <Badge variant="outline">Incluído</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span>Data Final (Adequação)</span>
                      <Badge variant="outline">Incluído</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span>Situação</span>
                      <Badge variant="outline">Incluído</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span>Fotos Anexadas</span>
                      <Badge variant="outline">Incluído</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Dados filtrados prontos para exportação</p>
                    <p className="text-sm text-muted-foreground">
                      {filteredData.length} itens serão exportados com base nos filtros aplicados
                    </p>
                  </div>
                  <Button onClick={exportToCSV} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectReports;
