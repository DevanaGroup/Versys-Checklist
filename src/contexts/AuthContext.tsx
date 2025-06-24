import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  type?: 'admin' | 'client';
  company?: string;
  projects?: string[];
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserData: (data: Partial<UserData>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// Função para determinar o tipo de usuário baseado no email
const determineUserType = (email: string): 'admin' | 'client' => {
  // Se o email contém "@devana.com.br" ou "@versys", é admin
  if (email.includes('@devana.com.br') || email.includes('@versys')) {
    return 'admin';
  }
  // Caso contrário, é client
  return 'client';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const { user, loading, signIn, signInWithGoogle, logout: firebaseLogout } = useAuth();

  useEffect(() => {
    console.log('AuthContext: Firebase user mudou:', user);
    
    if (user) {
      // Quando há um usuário Firebase, criamos os dados do usuário imediatamente
      const userType = determineUserType(user.email || '');
      console.log('AuthContext: Tipo de usuário determinado:', userType, 'para email:', user.email);
      
      const newUserData: UserData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || undefined,
        type: userType,
        company: userType === 'client' ? user.displayName || user.email?.split('@')[0] : undefined,
      };
      console.log('AuthContext: Definindo userData com dados do Firebase:', newUserData);
      setUserData(newUserData);
      
      // Salva no localStorage para compatibilidade
      localStorage.setItem("versys_user", JSON.stringify({
        name: user.displayName || user.email,
        email: user.email,
        type: userType,
        company: userType === 'client' ? (user.displayName || user.email?.split('@')[0]) : undefined
      }));
    } else {
      // Quando não há usuário Firebase, limpa os dados
      console.log('AuthContext: Nenhum usuário Firebase encontrado, limpando userData');
      setUserData(null);
      localStorage.removeItem("versys_user");
    }
  }, [user]);

  // Log quando userData muda
  useEffect(() => {
    console.log('AuthContext: userData atualizado:', userData);
  }, [userData]);

  const login = async (email: string, password: string) => {
    console.log('AuthContext: Iniciando login para:', email);
    await signIn(email, password);
  };

  const loginWithGoogle = async () => {
    console.log('AuthContext: Iniciando login com Google');
    await signInWithGoogle();
  };

  const logout = async () => {
    console.log('AuthContext: Iniciando logout');
    try {
      await firebaseLogout();
      localStorage.removeItem("versys_user");
      setUserData(null);
      console.log('AuthContext: Logout completado');
    } catch (error) {
      console.error('AuthContext: Erro no logout:', error);
      throw error;
    }
  };

  const updateUserData = (data: Partial<UserData>) => {
    if (userData) {
      const updatedData = { ...userData, ...data };
      console.log('AuthContext: Atualizando userData:', updatedData);
      setUserData(updatedData);
    }
  };

  const value: AuthContextType = {
    currentUser: user,
    userData,
    loading,
    // Mudança principal: Priorizar o Firebase user para determinar se está autenticado
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    logout,
    updateUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 