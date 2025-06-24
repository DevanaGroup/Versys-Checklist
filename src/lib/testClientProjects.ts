import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "./firebase";

export const testClientProjects = async (clientId: string) => {
  console.log('🧪 Testando busca de projetos para cliente:', clientId);
  
  try {
    // Buscar todos os projetos
    console.log('🔍 Buscando todos os projetos...');
    const projetosRef = collection(db, 'projetos');
    const allProjectsQuery = query(projetosRef, orderBy('dataCriacao', 'desc'));
    const allProjectsSnapshot = await getDocs(allProjectsQuery);
    
    console.log('📊 Total de projetos encontrados:', allProjectsSnapshot.size);
    
    // Listar todos os projetos com detalhes
    const allProjects = [];
    allProjectsSnapshot.forEach((doc) => {
      const data = doc.data();
      const project = {
        id: doc.id,
        nome: data.nome,
        cliente: data.cliente,
        dataCriacao: data.dataCriacao
      };
      allProjects.push(project);
      
      console.log('📝 Projeto:', {
        id: doc.id,
        nome: data.nome,
        clienteId: data.cliente?.id,
        clienteNome: data.cliente?.nome,
        clienteEmail: data.cliente?.email,
        clienteEmpresa: data.cliente?.empresa
      });
    });
    
    // Filtrar projetos do cliente específico
    console.log('🎯 Filtrando projetos para cliente:', clientId);
    const clientProjects = allProjects.filter(project => 
      project.cliente?.id === clientId
    );
    
    console.log('✅ Projetos do cliente encontrados:', clientProjects.length);
    console.log('📋 Projetos filtrados:', clientProjects);
    
    // Tentar query direta com where
    console.log('🔍 Testando query direta com where...');
    try {
      const directQuery = query(
        projetosRef, 
        where('cliente.id', '==', clientId),
        orderBy('dataCriacao', 'desc')
      );
      const directSnapshot = await getDocs(directQuery);
      console.log('📊 Projetos encontrados com query direta:', directSnapshot.size);
      
      directSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📝 Projeto (query direta):', {
          id: doc.id,
          nome: data.nome,
          cliente: data.cliente
        });
      });
    } catch (queryError) {
      console.error('❌ Erro na query direta:', queryError);
    }
    
    return {
      totalProjects: allProjectsSnapshot.size,
      clientProjects: clientProjects.length,
      projects: clientProjects
    };
    
  } catch (error) {
    console.error('❌ Erro no teste de projetos do cliente:', error);
    throw error;
  }
};

// Função para testar com ID específico
export const testSpecificClient = () => {
  const clientId = 'AEc3bNxeSjeBfvQgPzBsOIoJzEf2'; // ID do cliente das screenshots
  console.log('🧪 Testando cliente específico:', clientId);
  return testClientProjects(clientId);
}; 