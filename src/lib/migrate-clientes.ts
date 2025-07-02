import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

interface ClienteAnterior {
  id: string;
  nome: string;
  email: string;
  empresa: string;
  telefone?: string;
  endereco?: string;
  status: 'ativo' | 'suspenso' | 'inativo';
  dataCriacao: string;
  projetos?: number;
  senhaTemporaria?: string;
  precisaCriarConta?: boolean;
}

export const migrateClientesToUsers = async () => {
  console.log('🔄 Iniciando migração da coleção "clientes" para "users"...');
  
  try {
    // 1. Buscar todos os documentos da coleção "clientes"
    const clientesRef = collection(db, 'clientes');
    const clientesSnapshot = await getDocs(clientesRef);
    
    if (clientesSnapshot.empty) {
      console.log('✅ Nenhum documento encontrado na coleção "clientes". Migração não necessária.');
      return { success: true, migrated: 0, message: 'Nenhum cliente para migrar' };
    }
    
    console.log(`📊 Encontrados ${clientesSnapshot.size} clientes para migrar`);
    
    const clientesParaMigrar: ClienteAnterior[] = [];
    clientesSnapshot.forEach(doc => {
      const data = doc.data();
      clientesParaMigrar.push({
        id: doc.id,
        nome: data.nome || 'Nome não informado',
        email: data.email || '',
        empresa: data.empresa || 'Empresa não informada',
        telefone: data.telefone || '',
        endereco: data.endereco || '',
        status: data.status || 'ativo',
        dataCriacao: data.dataCriacao || new Date().toISOString(),
        projetos: data.projetos || 0,
        senhaTemporaria: data.senhaTemporaria,
        precisaCriarConta: data.precisaCriarConta || false
      });
    });
    
    // 2. Verificar se já existem na coleção "users"
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    const existingEmails = new Set<string>();
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.email && data.type === 'client') {
        existingEmails.add(data.email);
      }
    });
    
    console.log(`📧 Encontrados ${existingEmails.size} emails já existentes na coleção "users"`);
    
    // 3. Migrar apenas clientes que não existem ainda
    const clientesNovos = clientesParaMigrar.filter(cliente => 
      cliente.email && !existingEmails.has(cliente.email)
    );
    
    console.log(`🆕 ${clientesNovos.length} clientes novos serão migrados`);
    
    const clientesMigrados: string[] = [];
    const erros: string[] = [];
    
    for (const cliente of clientesNovos) {
      try {
        console.log(`➡️ Migrando cliente: ${cliente.nome} (${cliente.email})`);
        
        // Criar documento na coleção "users" com formato correto
        const userData = {
          displayName: cliente.nome,
          email: cliente.email,
          company: cliente.empresa,
          telefone: cliente.telefone,
          endereco: cliente.endereco,
          type: 'client',
          status: cliente.status,
          createdAt: new Date(cliente.dataCriacao),
          uid: '', // Será preenchido quando o usuário fizer login
          senhaTemporaria: cliente.senhaTemporaria,
          precisaCriarConta: cliente.precisaCriarConta,
          // Metadados da migração
          migratedFrom: 'clientes',
          migratedAt: new Date(),
          originalId: cliente.id
        };
        
        await addDoc(usersRef, userData);
        clientesMigrados.push(cliente.email);
        
        console.log(`✅ Cliente migrado: ${cliente.nome}`);
        
      } catch (error) {
        console.error(`❌ Erro ao migrar cliente ${cliente.nome}:`, error);
        erros.push(`${cliente.nome}: ${error}`);
      }
    }
    
    console.log(`🎉 Migração concluída! ${clientesMigrados.length} clientes migrados com sucesso`);
    
    if (erros.length > 0) {
      console.log(`⚠️ ${erros.length} erros durante a migração:`, erros);
    }
    
    // 4. Listar clientes que já existiam
    const clientesExistentes = clientesParaMigrar.filter(cliente => 
      cliente.email && existingEmails.has(cliente.email)
    );
    
    if (clientesExistentes.length > 0) {
      console.log(`ℹ️ ${clientesExistentes.length} clientes já existiam na coleção "users":`);
      clientesExistentes.forEach(cliente => {
        console.log(`  - ${cliente.nome} (${cliente.email})`);
      });
    }
    
    return {
      success: true,
      migrated: clientesMigrados.length,
      existing: clientesExistentes.length,
      errors: erros.length,
      message: `Migração concluída: ${clientesMigrados.length} migrados, ${clientesExistentes.length} já existiam, ${erros.length} erros`
    };
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    return {
      success: false,
      error: error,
      message: 'Erro durante a migração'
    };
  }
};

export const deleteClientesCollection = async () => {
  console.log('🗑️ Verificando se é seguro deletar a coleção "clientes"...');
  
  try {
    // Verificar se a migração foi bem-sucedida
    const clientesRef = collection(db, 'clientes');
    const clientesSnapshot = await getDocs(clientesRef);
    
    if (clientesSnapshot.empty) {
      console.log('✅ Coleção "clientes" já está vazia');
      return { success: true, message: 'Coleção já está vazia' };
    }
    
    // Verificar se todos os clientes existem na coleção users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    const usersEmails = new Set<string>();
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.email && data.type === 'client') {
        usersEmails.add(data.email);
      }
    });
    
    const clientesEmails = new Set<string>();
    clientesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.email) {
        clientesEmails.add(data.email);
      }
    });
    
    // Verificar se todos os clientes foram migrados
    const naoMigrados = Array.from(clientesEmails).filter(email => !usersEmails.has(email));
    
    if (naoMigrados.length > 0) {
      console.log('⚠️ Ainda existem clientes não migrados:', naoMigrados);
      return {
        success: false,
        message: `${naoMigrados.length} clientes ainda não foram migrados`,
        notMigrated: naoMigrados
      };
    }
    
    // Se todos foram migrados, deletar a coleção
    console.log('🗑️ Deletando documentos da coleção "clientes"...');
    const deletePromises = clientesSnapshot.docs.map(documento => 
      deleteDoc(doc(db, 'clientes', documento.id))
    );
    
    await Promise.all(deletePromises);
    
    console.log('✅ Coleção "clientes" deletada com sucesso!');
    
    return {
      success: true,
      deleted: clientesSnapshot.size,
      message: `${clientesSnapshot.size} documentos deletados da coleção "clientes"`
    };
    
  } catch (error) {
    console.error('❌ Erro ao deletar coleção "clientes":', error);
    return {
      success: false,
      error: error,
      message: 'Erro ao deletar coleção'
    };
  }
};

export const testMigration = async () => {
  console.log('🧪 Testando migração...');
  
  try {
    // Contar documentos em ambas as coleções
    const clientesRef = collection(db, 'clientes');
    const clientesSnapshot = await getDocs(clientesRef);
    
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let clientsInUsers = 0;
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.type === 'client') {
        clientsInUsers++;
      }
    });
    
    console.log('📊 Relatório de migração:');
    console.log(`  - Documentos na coleção "clientes": ${clientesSnapshot.size}`);
    console.log(`  - Clientes na coleção "users": ${clientsInUsers}`);
    console.log(`  - Total na coleção "users": ${usersSnapshot.size}`);
    
    return {
      clientesCollection: clientesSnapshot.size,
      clientsInUsers: clientsInUsers,
      totalUsers: usersSnapshot.size
    };
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    throw error;
  }
}; 