
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthContext } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  FileText, 
  Award, 
  Users, 
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface Projeto {
  id: string;
  status: string;
  clienteId?: string;
  cliente?: {
    id: string;
    nome: string;
    email: string;
    empresa?: string;
  };
  customAccordions?: any[];
  createdAt: string;
  [key: string]: any;
}

interface ArtigoStats {
  id: string;
  code: string;
  title: string;
  category: string;
  usageCount: number;
  averageScore: number;
  totalScore: number;
}

interface ProdutividadeData {
  mes: string;
  adequacoes: number;
  tempoMedio: number;
  projetos: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const Dashboard = () => {
  const { userData } = useAuthContext();
  const { setPageTitle } = usePageTitle();
  const [stats, setStats] = useState({
    projetosAtivos: 0,
    totalProjetos: 0,
    pendencias: 0,
    concluidos: 0
  });
  const [loading, setLoading] = useState(true);
  const [artigosStats, setArtigosStats] = useState<ArtigoStats[]>([]);
  const [produtividadeData, setProdutividadeData] = useState<ProdutividadeData[]>([]);

  // Limpar título do header mobile
  useEffect(() => {
    setPageTitle('');
  }, [setPageTitle]);
  const [tempoMedioAdequacao, setTempoMedioAdequacao] = useState(0);
  const [adequacoesPendentes, setAdequacoesPendentes] = useState(0);
  const [adequacoesAprovadas, setAdequacoesAprovadas] = useState(0);
  const [clientesData, setClientesData] = useState<Array<{
    nome: string;
    empresa: string;
    projetos: number;
    adequacoes: number;
    tempoMedio: number;
  }>>([]);

  useEffect(() => {
    loadDashboardData();
  }, [userData]);

  // Função para calcular progresso do projeto
  const calculateProgress = (accordions: any[]): number => {
    if (!accordions || accordions.length === 0) return 0;
    
    let totalItems = 0;
    let completedItems = 0;
    
    accordions.forEach(accordion => {
      if (accordion.items) {
        accordion.items.forEach((item: any) => {
          if (item.subItems) {
            totalItems += item.subItems.length;
            // Conta como progresso se o item foi marcado como concluído
            const completedInThisItem = item.subItems.filter((subItem: any) => {
              // Verificar múltiplas condições de conclusão
              const isCompleted = subItem.status === 'completed' || 
                                subItem.completed === true || 
                                subItem.evaluation === 'c' || // conforme
                                subItem.evaluation === 'na'; // não aplicável
              
              if (isCompleted) {
                console.log(`✅ SubItem concluído:`, {
                  id: subItem.id,
                  status: subItem.status,
                  completed: subItem.completed,
                  evaluation: subItem.evaluation,
                  adequacyReported: subItem.adequacyReported
                });
              }
              return isCompleted;
            }).length;
            completedItems += completedInThisItem;
            
            // Debug para este item
            if (item.title) {
              console.log(`🔍 Progresso Item "${item.title}": ${completedInThisItem}/${item.subItems.length} concluídos`);
            }
          }
        });
      }
    });
    
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    console.log(`📊 Progresso Total: ${completedItems}/${totalItems} = ${progress}%`);
    
    return progress;
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Dashboard: Iniciando carregamento de dados...');
      console.log('👤 Usuário logado:', userData);
      
      const projetosRef = collection(db, 'projetos');
      let q = query(projetosRef, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      console.log('📊 Dashboard: Total de projetos encontrados:', querySnapshot.size);
      
      const projetos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Projeto[];

      console.log('📋 Dashboard: Projetos carregados:', projetos.map(p => ({
        id: p.id,
        nome: p.nome,
        status: p.status,
        clienteId: p.clienteId,
        cliente: p.cliente
      })));

      // Debug: mostrar estrutura completa do primeiro projeto
      if (projetos.length > 0) {
        console.log('🔍 Dashboard: Estrutura completa do primeiro projeto:', JSON.stringify(projetos[0], null, 2));
      }

      // Filtrar projetos baseado no tipo de usuário
      let projetosFiltrados = projetos;
      if (userData?.type === 'client') {
        projetosFiltrados = projetos.filter(projeto => {
          const clienteId = projeto.clienteId || projeto.cliente?.id;
          const clienteEmail = projeto.cliente?.email;
          
          // Verificar se o projeto pertence ao cliente logado
          const belongsToClient = clienteId === userData.uid || 
                                 String(clienteId) === String(userData.uid) ||
                                 clienteEmail === userData.email;
          
          return belongsToClient;
        });
        console.log('🎯 Dashboard: Projetos filtrados para cliente:', projetosFiltrados.length);
      }

      // Calcular estatísticas básicas baseadas no progresso
      const projetosAtivos = projetosFiltrados.filter(projeto => 
        ['Em Andamento', 'Aguardando Documentos', 'Em Revisão', 'Iniciado'].includes(projeto.status)
      ).length;

      // Calcular pendências e concluídos baseados no progresso (não no status)
      let pendencias = 0;
      let concluidos = 0;

      projetosFiltrados.forEach(projeto => {
        // Debug: mostrar estrutura do projeto se for o primeiro
        if (projetosFiltrados.indexOf(projeto) === 0) {
          console.log('🔍 Dashboard: Estrutura do primeiro projeto:', {
            id: projeto.id,
            nome: projeto.nome,
            customAccordions: projeto.customAccordions?.length || 0,
            itens: projeto.itens?.length || 0,
            accordions: projeto.customAccordions?.map(acc => ({
              title: acc.title,
              itemsCount: acc.items?.length || 0,
              items: acc.items?.map(item => ({
                title: item.title,
                subItemsCount: item.subItems?.length || 0,
                subItems: item.subItems?.slice(0, 2) // mostrar apenas os 2 primeiros
              }))
            })),
            itensStructure: projeto.itens?.slice(0, 2) // mostrar apenas os 2 primeiros itens
          });
        }
        
        const progresso = calculateProgress(projeto.customAccordions || projeto.itens || []);
        
        console.log(`📊 Dashboard: Projeto ${projeto.nome || projeto.id} - Progresso: ${progresso}%`);
        
        if (progresso === 100) {
          concluidos++;
          console.log(`✅ Dashboard: Projeto ${projeto.nome || projeto.id} marcado como CONCLUÍDO (100%)`);
        } else {
          pendencias++;
          console.log(`⏳ Dashboard: Projeto ${projeto.nome || projeto.id} marcado como PENDENTE (${progresso}%)`);
        }
      });

      // Calcular estatísticas de artigos
      const artigosMap = new Map<string, ArtigoStats>();
      let totalAdequacoes = 0;
      let totalTempoAdequacao = 0;
      let adequacoesPendentesCount = 0;
      let adequacoesAprovadasCount = 0;

      projetosFiltrados.forEach(projeto => {
        if (projeto.customAccordions) {
          projeto.customAccordions.forEach((accordion: any) => {
            if (accordion.items) {
              accordion.items.forEach((item: any) => {
                if (item.subItems) {
                  item.subItems.forEach((subItem: any) => {
                    // Extrair código do artigo do título do item
                    let artigoCode = '';
                    let artigoTitle = '';
                    
                    // Tentar extrair código do título do item (formato: "1.1 - Título do Artigo")
                    if (item.title && item.title.includes(' - ')) {
                      const parts = item.title.split(' - ');
                      artigoCode = parts[0].trim();
                      artigoTitle = parts.slice(1).join(' - ').trim();
                    } else {
                      // Fallback: usar o título completo
                      artigoCode = item.title || 'Artigo sem código';
                      artigoTitle = item.title || 'Título não informado';
                    }

                    // Usar código do artigo como chave única
                    const artigoKey = artigoCode;
                    
                    if (!artigosMap.has(artigoKey)) {
                      artigosMap.set(artigoKey, {
                        id: artigoKey,
                        code: artigoCode,
                        title: artigoTitle,
                        category: accordion.title || 'Categoria não informada',
                        usageCount: 0,
                        averageScore: 0,
                        totalScore: 0
                      });
                    }
                    
                    const artigo = artigosMap.get(artigoKey)!;
                    artigo.usageCount++;
                    
                    // Calcular pontuação baseada na avaliação
                    let score = 0;
                    if (subItem.evaluation === 'na') score = 3; // Não aplicável = 3 pontos
                    else if (subItem.evaluation === 'r') score = 1; // Precisa revisar = 1 ponto
                    else if (subItem.evaluation === 'nc') score = 0; // Não conforme = 0 pontos
                    
                    artigo.totalScore += score;
                    artigo.averageScore = artigo.totalScore / artigo.usageCount;

                    // Estatísticas de adequação
                    if (subItem.adequacyReported) {
                      totalAdequacoes++;
                      
                      if (subItem.adequacyDate) {
                        const adequacaoDate = new Date(subItem.adequacyDate);
                        const projetoDate = new Date(projeto.createdAt);
                        const tempoDias = (adequacaoDate.getTime() - projetoDate.getTime()) / (1000 * 60 * 60 * 24);
                        totalTempoAdequacao += tempoDias;
                      }

                      if (subItem.adequacyStatus === 'pending') {
                        adequacoesPendentesCount++;
                      } else if (subItem.adequacyStatus === 'completed') {
                        adequacoesAprovadasCount++;
                      }
                    }
                  });
                }
              });
            }
          });
        }
      });

      // Calcular dados de produtividade por mês
      const produtividadePorMes = new Map<string, { adequacoes: number; tempoTotal: number; projetos: number }>();
      
      projetosFiltrados.forEach(projeto => {
        const projetoDate = new Date(projeto.createdAt);
        const mesKey = `${projetoDate.getFullYear()}-${String(projetoDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!produtividadePorMes.has(mesKey)) {
          produtividadePorMes.set(mesKey, { adequacoes: 0, tempoTotal: 0, projetos: 0 });
        }
        
        const mesData = produtividadePorMes.get(mesKey)!;
        mesData.projetos++;
        
        if (projeto.customAccordions) {
          projeto.customAccordions.forEach((accordion: any) => {
            if (accordion.items) {
              accordion.items.forEach((item: any) => {
                if (item.subItems) {
                  item.subItems.forEach((subItem: any) => {
                    if (subItem.adequacyReported && subItem.adequacyDate) {
                      mesData.adequacoes++;
                      const adequacaoDate = new Date(subItem.adequacyDate);
                      const tempoDias = (adequacaoDate.getTime() - projetoDate.getTime()) / (1000 * 60 * 60 * 24);
                      mesData.tempoTotal += tempoDias;
                    }
                  });
                }
              });
            }
          });
        }
      });

      const produtividadeData = Array.from(produtividadePorMes.entries())
        .map(([mes, data]) => ({
          mes: new Date(mes + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
          adequacoes: data.adequacoes,
          tempoMedio: data.adequacoes > 0 ? data.tempoTotal / data.adequacoes : 0,
          projetos: data.projetos
        }))
        .sort((a, b) => new Date(a.mes).getTime() - new Date(b.mes).getTime());

      console.log('📈 Dashboard: Estatísticas calculadas:', {
        projetosAtivos,
        totalProjetos: projetosFiltrados.length,
        pendencias,
        concluidos,
        totalAdequacoes,
        tempoMedioAdequacao: totalAdequacoes > 0 ? totalTempoAdequacao / totalAdequacoes : 0
      });

      console.log('🎯 Dashboard: Resumo Progresso:', {
        totalProjetos: projetosFiltrados.length,
        pendencias: `${pendencias} projetos (< 100%)`,
        concluidos: `${concluidos} projetos (100%)`,
        verificacao: pendencias + concluidos === projetosFiltrados.length ? '✅ Correto' : '❌ Erro na soma'
      });

      setStats({
        projetosAtivos,
        totalProjetos: projetosFiltrados.length,
        pendencias,
        concluidos
      });

      setArtigosStats(Array.from(artigosMap.values())
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10));

      setProdutividadeData(produtividadeData);
      setTempoMedioAdequacao(totalAdequacoes > 0 ? totalTempoAdequacao / totalAdequacoes : 0);
      setAdequacoesPendentes(adequacoesPendentesCount);
      setAdequacoesAprovadas(adequacoesAprovadasCount);

      // Calcular dados de clientes
      const clientesMap = new Map<string, {
        nome: string;
        empresa: string;
        projetos: number;
        adequacoes: number;
        tempoTotal: number;
        tempoMedio: number;
      }>();

      projetosFiltrados.forEach(projeto => {
        if (projeto.cliente) {
          const clienteKey = projeto.cliente.id;
          if (!clientesMap.has(clienteKey)) {
            clientesMap.set(clienteKey, {
              nome: projeto.cliente.nome,
              empresa: projeto.cliente.empresa || 'Não informada',
              projetos: 0,
              adequacoes: 0,
              tempoTotal: 0,
              tempoMedio: 0
            });
          }

          const cliente = clientesMap.get(clienteKey)!;
          cliente.projetos++;

          // Calcular adequações e tempo para este projeto
          if (projeto.customAccordions) {
            projeto.customAccordions.forEach((accordion: any) => {
              if (accordion.items) {
                accordion.items.forEach((item: any) => {
                  if (item.subItems) {
                    item.subItems.forEach((subItem: any) => {
                      if (subItem.adequacyReported && subItem.adequacyDate) {
                        cliente.adequacoes++;
                        const adequacaoDate = new Date(subItem.adequacyDate);
                        const projetoDate = new Date(projeto.createdAt);
                        const tempoDias = (adequacaoDate.getTime() - projetoDate.getTime()) / (1000 * 60 * 60 * 24);
                        cliente.tempoTotal += tempoDias;
                      }
                    });
                  }
                });
              }
            });
          }
        }
      });

      // Calcular tempo médio para cada cliente
      clientesMap.forEach(cliente => {
        cliente.tempoMedio = cliente.adequacoes > 0 ? cliente.tempoTotal / cliente.adequacoes : 0;
      });

      setClientesData(Array.from(clientesMap.values())
        .sort((a, b) => b.adequacoes - a.adequacoes));

    } catch (error) {
      console.error('❌ Dashboard: Erro ao carregar dados do dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const createTestProject = async () => {
    try {
      const testProject = {
        nome: 'Projeto de Teste Dashboard',
        status: 'Iniciado',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        cliente: {
          id: userData?.uid || 'test-client',
          nome: userData?.displayName || 'Cliente Teste',
          email: userData?.email || 'teste@exemplo.com',
          empresa: 'Empresa Teste'
        },
        clienteId: userData?.uid || 'test-client',
        customAccordions: []
      };

      await addDoc(collection(db, 'projetos'), testProject);
      toast.success('Projeto de teste criado!');
      loadDashboardData(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao criar projeto de teste:', error);
      toast.error('Erro ao criar projeto de teste');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Concluído': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Em Andamento': return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'Pendente': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-versys-primary">Dashboard</h2>
          <p className="text-gray-600 mt-2">
            Bem-vindo ao sistema VERSYS de Consultoria em Segurança Portuária
          </p>
        </div>
      </div>
      
      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-versys-secondary">
              {loading ? '...' : stats.projetosAtivos}
            </div>
            <p className="text-xs text-muted-foreground">
              Em andamento, revisão ou aguardando docs
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-versys-secondary">
              {loading ? '...' : stats.totalProjetos}
            </div>
            <p className="text-xs text-muted-foreground">
              Todos os projetos cadastrados
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendências</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-versys-accent">
              {loading ? '...' : stats.pendencias}
            </div>
            <p className="text-xs text-muted-foreground">
              Projetos pendentes ou aguardando docs
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? '...' : stats.concluidos}
            </div>
            <p className="text-xs text-muted-foreground">
              Projetos finalizados com sucesso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Card de Clientes e Tempos de Adequação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Tempo Médio de Adequação por Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Cliente</th>
                  <th className="text-left p-2">Empresa</th>
                  <th className="text-center p-2">Projetos</th>
                  <th className="text-center p-2">Adequações</th>
                  <th className="text-center p-2">Tempo Médio</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {clientesData.length > 0 ? (
                  clientesData.map((cliente, index) => (
                    <tr key={index} className="border-b hover:bg-blue-50">
                      <td className="p-2 text-sm font-medium">{cliente.nome}</td>
                      <td className="p-2 text-sm text-gray-600">{cliente.empresa}</td>
                      <td className="p-2 text-center text-sm">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                          {cliente.projetos}
                        </span>
                      </td>
                      <td className="p-2 text-center text-sm font-medium">{cliente.adequacoes}</td>
                      <td className="p-2 text-center text-sm">
                        <span className={`font-semibold ${
                          cliente.tempoMedio <= 7 ? 'text-green-600' :
                          cliente.tempoMedio <= 15 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {cliente.tempoMedio > 0 ? `${cliente.tempoMedio.toFixed(1)} dias` : 'N/A'}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        {cliente.tempoMedio > 0 ? (
                          cliente.tempoMedio <= 7 ? (
                            <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                          ) : cliente.tempoMedio <= 15 ? (
                            <AlertCircle className="h-4 w-4 text-yellow-600 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                          )
                        ) : (
                          <span className="text-gray-400 text-xs">Sem dados</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
                      Nenhum cliente com dados de adequação encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Produtividade */}
        <Card>
          <CardHeader>
            <CardTitle>Produtividade de Respostas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={produtividadeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="adequacoes" 
                  stroke="#8884d8" 
                  name="Adequações"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="tempoMedio" 
                  stroke="#82ca9d" 
                  name="Tempo Médio (dias)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Artigos Mais Usados */}
        <Card>
          <CardHeader>
            <CardTitle>Artigos Mais Utilizados</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={artigosStats.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="code" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [value, 'Utilizações']}
                  labelFormatter={(label) => `Artigo ${label}`}
                />
                <Bar dataKey="usageCount" fill="#8884d8" name="Utilizações" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Artigos Mais Utilizados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Artigos Mais Utilizados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Código</th>
                  <th className="text-left p-2">Título</th>
                  <th className="text-left p-2">Categoria</th>
                  <th className="text-center p-2">Utilizações</th>
                </tr>
              </thead>
              <tbody>
                {artigosStats
                  .sort((a, b) => b.usageCount - a.usageCount)
                  .slice(0, 10)
                  .map((artigo, index) => (
                  <tr key={artigo.id} className="border-b hover:bg-blue-50">
                    <td className="p-2 font-mono text-sm font-semibold">{artigo.code}</td>
                    <td className="p-2 text-sm max-w-xs truncate" title={artigo.title}>
                      {artigo.title}
                    </td>
                    <td className="p-2 text-sm">
                      <Badge variant="outline" className="text-xs">
                        {artigo.category}
                      </Badge>
                    </td>
                    <td className="p-2 text-center text-sm font-medium">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        {artigo.usageCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
