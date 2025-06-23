import { 
  doc, 
  setDoc, 
  getDoc, 
  collection,
  getDocs,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';

// Interface para os dados do usuário
interface UserData {
  uid: string;
  email: string;
  displayName: string;
  type: 'admin' | 'client';
  company?: string;
  projects: string[];
  createdAt: any;
  lastLogin: any;
}

// Função para criar usuário de teste (removida - dados mocados limpos)

// Função para listar todos os usuários
export const listAllUsers = async () => {
  try {
    console.log('📋 Listando usuários do Firestore...');
    
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const users: any[] = [];
    snapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });

    console.log('👥 Usuários encontrados:', users);
    return users;
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error);
    throw error;
  }
};

// Função para verificar se usuário existe
export const checkUserExists = async (uid: string) => {
  try {
    console.log('🔍 Verificando se usuário existe:', uid);
    
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      console.log('✅ Usuário encontrado:', userSnap.data());
      return userSnap.data();
    } else {
      console.log('❌ Usuário não encontrado');
      return null;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar usuário:', error);
    throw error;
  }
};

// Função para testar conexão com Firestore
export const testFirestoreConnection = async () => {
  try {
    console.log('🔗 Testando conexão com Firestore...');
    
    // Tenta criar um documento de teste
    const testRef = doc(db, 'test', 'connection');
    await setDoc(testRef, {
      message: 'Conexão testada com sucesso!',
      timestamp: serverTimestamp()
    });
    
    console.log('✅ Conexão com Firestore funcionando!');
    return true;
  } catch (error) {
    console.error('❌ Erro na conexão com Firestore:', error);
    throw error;
  }
};

export const testClientesCollection = async () => {
  try {
    console.log('Testando coleção clientes...');
    const clientesRef = collection(db, 'clientes');
    const q = query(clientesRef, orderBy('dataCriacao', 'desc'));
    const querySnapshot = await getDocs(q);
    
    console.log('Número de documentos na coleção clientes:', querySnapshot.size);
    
    querySnapshot.forEach((doc) => {
      console.log('Documento cliente:', doc.id, doc.data());
    });
    
    // Testar também coleção users para ver se há clientes lá
    console.log('\nTestando coleção users...');
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    console.log('Número de documentos na coleção users:', usersSnapshot.size);
    
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.type === 'client') {
        console.log('Cliente encontrado na coleção users:', doc.id, data);
      }
    });
    
    return { clientesCount: querySnapshot.size, usersCount: usersSnapshot.size };
  } catch (error) {
    console.error('Erro ao testar coleções:', error);
    return { error };
  }
}; 