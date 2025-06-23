import { useState, useEffect } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// Interface para os dados do usuário no Firestore
interface UserData {
  uid: string;
  email: string;
  displayName: string;
  type: 'admin' | 'client';
  company?: string;
  projects: string[];
  createdAt: Timestamp;
  lastLogin: Timestamp;
}

// Função para determinar o tipo de usuário baseado no email
const determineUserType = (email: string): 'admin' | 'client' => {
  if (email.includes('@devana.com.br') || email.includes('@versys')) {
    return 'admin';
  }
  return 'client';
};

// Função para criar ou atualizar dados do usuário no Firestore
const createOrUpdateUserInFirestore = async (user: User, isFirstTimeColaborador = false) => {
  try {
    console.log('useAuth: Criando/atualizando usuário no Firestore:', user.email);
    
    // Se é primeira vez de um colaborador, não criar na coleção users
    if (isFirstTimeColaborador) {
      console.log('useAuth: Colaborador fazendo primeiro login, não criando na coleção users');
      return;
    }
    
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    const userData: Partial<UserData> = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || '',
      type: determineUserType(user.email || ''),
      lastLogin: serverTimestamp() as Timestamp,
    };

    if (!userSnap.exists()) {
      // Usuário novo - criar documento completo
      const newUserData: Omit<UserData, 'createdAt' | 'lastLogin'> & {
        createdAt: any;
        lastLogin: any;
      } = {
        ...userData,
        company: userData.type === 'client' ? userData.displayName : '',
        projects: [],
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      } as any;

      await setDoc(userRef, newUserData);
      console.log('useAuth: Novo usuário criado no Firestore');
    } else {
      // Usuário existente - atualizar apenas lastLogin
      await setDoc(userRef, userData, { merge: true });
      console.log('useAuth: Usuário atualizado no Firestore');
    }
  } catch (error) {
    console.error('useAuth: Erro ao criar/atualizar usuário no Firestore:', error);
  }
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('useAuth: Configurando listener de autenticação');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('useAuth: Estado de autenticação mudou:', user ? `Usuário: ${user.email}` : 'Nenhum usuário');
      
      if (user) {
        // Verificar se é um colaborador
        const colaboradoresRef = collection(db, 'colaboradores');
        const qColaboradores = query(colaboradoresRef, where('firebaseUid', '==', user.uid));
        const colaboradoresSnapshot = await getDocs(qColaboradores);
        
        // Verificar se é um cliente
        const clientesRef = collection(db, 'clientes');
        const qClientes = query(clientesRef, where('firebaseUid', '==', user.uid));
        const clientesSnapshot = await getDocs(qClientes);
        
        const isColaborador = !colaboradoresSnapshot.empty;
        const isCliente = !clientesSnapshot.empty;
        
        if (isColaborador) {
          console.log('useAuth: Usuário identificado como colaborador, não criando na coleção users');
        } else if (isCliente) {
          console.log('useAuth: Usuário identificado como cliente, não criando na coleção users');
        } else {
          // Criar/atualizar apenas se não for colaborador nem cliente
          await createOrUpdateUserInFirestore(user, false);
        }
      }
      
      setUser(user);
      setLoading(false);
    });

    return () => {
      console.log('useAuth: Removendo listener de autenticação');
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('useAuth: Tentando fazer login com:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('useAuth: Login realizado com sucesso:', result.user.email);
      // createOrUpdateUserInFirestore será chamado automaticamente pelo onAuthStateChanged
    } catch (error) {
      console.error('useAuth: Erro ao fazer login:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log('useAuth: Tentando criar conta para:', email);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('useAuth: Conta criada com sucesso:', result.user.email);
      // createOrUpdateUserInFirestore será chamado automaticamente pelo onAuthStateChanged
    } catch (error) {
      console.error('useAuth: Erro ao criar conta:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      console.log('useAuth: Tentando fazer login com Google');
      const result = await signInWithPopup(auth, provider);
      console.log('useAuth: Login com Google realizado com sucesso:', result.user.email);
      // createOrUpdateUserInFirestore será chamado automaticamente pelo onAuthStateChanged
    } catch (error) {
      console.error('useAuth: Erro ao fazer login com Google:', error);
      throw error;
    }
  };

  // Nova função para primeiro login de colaboradores
  const signInAsColaborador = async (email: string, senhaTemporaria: string, novaSenha: string) => {
    try {
      console.log('useAuth: Tentando primeiro login de colaborador:', email);
      
      // Verificar se existe um colaborador com este email e senha temporária
      const colaboradoresRef = collection(db, 'colaboradores');
      const q = query(colaboradoresRef, 
        where('email', '==', email),
        where('senhaTemporaria', '==', senhaTemporaria),
        where('precisaCriarConta', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Credenciais inválidas ou conta já ativada');
      }
      
      const colaboradorDoc = querySnapshot.docs[0];
      const colaboradorData = colaboradorDoc.data();
      
      // Criar conta no Firebase Auth
      const result = await createUserWithEmailAndPassword(auth, email, novaSenha);
      
      // Atualizar documento do colaborador
      await updateDoc(doc(db, 'colaboradores', colaboradorDoc.id), {
        firebaseUid: result.user.uid,
        precisaCriarConta: false,
        senhaTemporaria: null // Remover senha temporária por segurança
      });
      
      console.log('useAuth: Conta de colaborador criada com sucesso:', result.user.email);
      // O onAuthStateChanged vai disparar, mas não criará na coleção users
      return result;
    } catch (error) {
      console.error('useAuth: Erro ao criar conta de colaborador:', error);
      throw error;
    }
  };

  // Nova função para primeiro login de clientes
  const signInAsCliente = async (email: string, senhaTemporaria: string, novaSenha: string) => {
    try {
      console.log('useAuth: Tentando primeiro login de cliente:', email);
      
      // Verificar se existe um cliente com este email e senha temporária
      const clientesRef = collection(db, 'clientes');
      const q = query(clientesRef, 
        where('email', '==', email),
        where('senhaTemporaria', '==', senhaTemporaria),
        where('precisaCriarConta', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Credenciais inválidas ou conta já ativada');
      }
      
      const clienteDoc = querySnapshot.docs[0];
      const clienteData = clienteDoc.data();
      
      // Criar conta no Firebase Auth
      const result = await createUserWithEmailAndPassword(auth, email, novaSenha);
      
      // Atualizar documento do cliente
      await updateDoc(doc(db, 'clientes', clienteDoc.id), {
        firebaseUid: result.user.uid,
        precisaCriarConta: false,
        senhaTemporaria: null // Remover senha temporária por segurança
      });
      
      console.log('useAuth: Conta de cliente criada com sucesso:', result.user.email);
      return result;
    } catch (error) {
      console.error('useAuth: Erro ao criar conta de cliente:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('useAuth: Fazendo logout...');
      await signOut(auth);
      console.log('useAuth: Logout realizado com sucesso');
    } catch (error) {
      console.error('useAuth: Erro ao fazer logout:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInAsColaborador,
    signInAsCliente,
    logout
  };
}; 