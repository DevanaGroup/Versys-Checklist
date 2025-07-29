import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileSpreadsheet, Filter, Search, Eye, Calendar, ArrowLeft, FolderOpen, Building2, User, BarChart3, TrendingUp } from 'lucide-react';
import { collection, getDocs, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';

interface ProjectSummary {
  id: string;
  name: string;
  clientName: string;
  clientId: string;
  createdAt: string;
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

const Reports = () => {
  const { userData } = useAuthContext();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [filteredData, setFilteredData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Estados para filtros únicos
  const [categories, setCategories] = useState<string[]>([]);
  const [statuses] = useState(['Pendente', 'Em Andamento', 'Concluído', 'Cancelado']);

  useEffect(() => {
    if (!selectedProject) {
      loadProjects();
    } else {
      loadProjectReportData(selectedProject.id);
    }
  }, [selectedProject]);

  useEffect(() => {
    applyFilters();
  }, [reportData, searchTerm, categoryFilter, statusFilter]);

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
        const projectData = projectDoc.data();
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
          name: projectName,
          clientName,
          clientId: projectData.clienteId || '',
          createdAt: projectData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
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

  const loadProjectReportData = async (projectId: string) => {
    try {
      setLoading(true);
      const projectsRef = collection(db, 'projetos');
      const projectsQuery = query(projectsRef, where('__name__', '==', projectId));
      const projectsSnapshot = await getDocs(projectsQuery);

      const data: ReportData[] = [];
      const uniqueCategories = new Set<string>();

      for (const projectDoc of projectsSnapshot.docs) {
        const projectData = projectDoc.data();
        const projectName = projectData.nome || 'Projeto sem nome';
        const clientName = projectData.cliente?.nome || 'Cliente não informado';

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
        item.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.local.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.currentSituation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clientGuidance.toLowerCase().includes(searchTerm.toLowerCase())
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
    try {
      const headers = [
        'Projeto',
        'Cliente', 
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
        item.projectName,
        item.clientName,
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
      link.setAttribute('download', `relatorio_projetos_${new Date().toISOString().split('T')[0]}.csv`);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-versys-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Acompanhamento e exportação de dados dos projetos
          </p>
        </div>
        <Button onClick={exportToCSV} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
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
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
              <CardDescription>
                Use os filtros abaixo para refinar os dados exibidos
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Label htmlFor="project">Projeto</Label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os projetos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os projetos</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project} value={project}>{project}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </CardContent>
          </Card>

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
              <CardTitle>Dados dos Projetos</CardTitle>
              <CardDescription>
                {filteredData.length} itens encontrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Cliente</TableHead>
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
                        <TableCell className="font-medium">{item.projectName}</TableCell>
                        <TableCell>{item.clientName}</TableCell>
                        <TableCell>{item.category}</TableCell>
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

export default Reports;
