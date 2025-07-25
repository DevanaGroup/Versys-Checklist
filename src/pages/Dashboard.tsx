
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthContext } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface Projeto {
  id: string;
  status: string;
  clienteId?: string;
  [key: string]: any;
}

const Dashboard = () => {
  const { userData } = useAuthContext();
  const [stats, setStats] = useState({
    projetosAtivos: 0,
    totalProjetos: 0,
    pendencias: 0,
    concluidos: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [userData]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const projetosRef = collection(db, 'projetos');
      let q = query(projetosRef, orderBy('dataCriacao', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const projetos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Projeto[];

      // Filtrar projetos baseado no tipo de usuário
      let projetosFiltrados = projetos;
      if (userData?.type === 'client') {
        projetosFiltrados = projetos.filter(projeto => projeto.clienteId === userData.uid);
      }

      // Calcular estatísticas
      const projetosAtivos = projetosFiltrados.filter(projeto => 
        ['Em Andamento', 'Aguardando Documentos', 'Em Revisão', 'Iniciado'].includes(projeto.status)
      ).length;

      const pendencias = projetosFiltrados.filter(projeto => 
        ['Pendente', 'Aguardando Documentos'].includes(projeto.status)
      ).length;

      const concluidos = projetosFiltrados.filter(projeto => 
        projeto.status === 'Concluído'
      ).length;

      setStats({
        projetosAtivos,
        totalProjetos: projetosFiltrados.length,
        pendencias,
        concluidos
      });
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-versys-primary">Dashboard</h2>
        <p className="text-gray-600 mt-2">
          Bem-vindo ao sistema VERSYS de Consultoria em Segurança Portuária
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-versys-primary mb-2">Projetos Ativos</h3>
          <p className="text-3xl font-bold text-versys-secondary">
            {loading ? '...' : stats.projetosAtivos}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Em andamento, revisão ou aguardando docs
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-versys-primary mb-2">Total de Projetos</h3>
          <p className="text-3xl font-bold text-versys-secondary">
            {loading ? '...' : stats.totalProjetos}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Todos os projetos cadastrados
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-versys-primary mb-2">Pendências</h3>
          <p className="text-3xl font-bold text-versys-accent">
            {loading ? '...' : stats.pendencias}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Projetos pendentes ou aguardando docs
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-versys-primary mb-2">Concluídos</h3>
          <p className="text-3xl font-bold text-green-600">
            {loading ? '...' : stats.concluidos}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Projetos finalizados com sucesso
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
