import React, { useState, useEffect } from 'react';
import '@/styles/mobile-fixes.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, UserX, UserCheck, Search, Eye, EyeOff, MoreVertical, Filter, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { usePageTitle } from '@/contexts/PageTitleContext';

interface Cliente {
  id: string;
  nome: string;
  email: string;
  empresa: string;
  telefone: string;
  endereco: string;
  status: 'ativo' | 'suspenso' | 'inativo';
  dataCriacao: string;
  projetos: number;
  firebaseUid?: string;
}

const Clientes = () => {
  const { setPageTitle } = usePageTitle();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [criandoCliente, setCriandoCliente] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [dialogEdicaoAberto, setDialogEdicaoAberto] = useState(false);
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [buscaExpandida, setBuscaExpandida] = useState(false);
  const [filtroExpandido, setFiltroExpandido] = useState(false);
  const [novoCliente, setNovoCliente] = useState({
    nome: '',
    email: '',
    empresa: '',
    telefone: '',
    endereco: '',
    senha: ''
  });

  useEffect(() => {
    carregarClientes();
    
    // Limpar título do header mobile
    setPageTitle('');
  }, [setPageTitle]);

  // Aplicar estilos fullscreen no modal quando abrir no mobile
  useEffect(() => {
    if (dialogAberto) {
      const modal = document.querySelector('[data-radix-dialog-content]') as HTMLElement;
      if (modal && window.innerWidth <= 640) {
        // Aplicar estilos inline para forçar fullscreen
        Object.assign(modal.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          width: '100vw',
          height: '100vh',
          maxWidth: 'none',
          maxHeight: 'none',
          margin: '0',
          padding: '0',
          borderRadius: '0',
          transform: 'none',
          overflowY: 'auto',
          zIndex: '10000',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          boxShadow: 'none'
        });
        
        // Estrutura interna
        const children = modal.children;
        if (children.length >= 3) {
          // Header
          const header = children[0] as HTMLElement;
          Object.assign(header.style, {
            flexShrink: '0',
            padding: '1rem 1rem 0.5rem 1rem',
            borderBottom: '1px solid #e5e7eb',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          });
          
          // Conteúdo
          const content = children[1] as HTMLElement;
          Object.assign(content.style, {
            flex: '1',
            padding: '1rem',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          });
          
          // Footer
          const footer = children[2] as HTMLElement;
          Object.assign(footer.style, {
            flexShrink: '0',
            padding: '1rem',
            borderTop: '1px solid #e5e7eb',
            background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
            boxShadow: '0 -1px 3px 0 rgba(0, 0, 0, 0.1)'
          });
        }
      }
    }
  }, [dialogAberto]);

  // Aplicar estilos fullscreen no modal de edição quando abrir no mobile
  useEffect(() => {
    if (dialogEdicaoAberto) {
      const modal = document.querySelector('[data-radix-dialog-content]') as HTMLElement;
      if (modal && window.innerWidth <= 640) {
        // Aplicar estilos inline para forçar fullscreen
        Object.assign(modal.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          width: '100vw',
          height: '100vh',
          maxWidth: 'none',
          maxHeight: 'none',
          margin: '0',
          padding: '0',
          borderRadius: '0',
          transform: 'none',
          overflowY: 'auto',
          zIndex: '10000',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          boxShadow: 'none'
        });
        
        // Estrutura interna
        const children = modal.children;
        if (children.length >= 3) {
          // Header
          const header = children[0] as HTMLElement;
          Object.assign(header.style, {
            flexShrink: '0',
            padding: '1rem 1rem 0.5rem 1rem',
            borderBottom: '1px solid #e5e7eb',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          });
          
          // Conteúdo
          const content = children[1] as HTMLElement;
          Object.assign(content.style, {
            flex: '1',
            padding: '1rem',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          });
          
          // Footer
          const footer = children[2] as HTMLElement;
          Object.assign(footer.style, {
            flexShrink: '0',
            padding: '1rem',
            borderTop: '1px solid #e5e7eb',
            background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
            boxShadow: '0 -1px 3px 0 rgba(0, 0, 0, 0.1)'
          });
        }
      }
    }
  }, [dialogEdicaoAberto]);

  const carregarClientes = async () => {
    try {
      setLoading(true);
      console.log('Carregando clientes da coleção users...');
      
      // Buscar apenas na coleção 'users' filtrando por type: 'client'
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('type', '==', 'client'), orderBy('createdAt', 'desc'));
      
      try {
        const querySnapshot = await getDocs(q);
        
        const clientesData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            nome: data.displayName || data.nome || 'Nome não informado',
            email: data.email || '',
            empresa: data.company || data.empresa || 'Empresa não informada',
            telefone: data.telefone || '',
            endereco: data.endereco || '',
            status: data.status || 'ativo' as const,
            dataCriacao: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            projetos: 0,
            firebaseUid: data.uid || doc.id
          };
        }) as Cliente[];
        
        console.log('Clientes encontrados na coleção users (com ordenação):', clientesData.length);
        console.log('Dados dos clientes (com ordenação):', clientesData);
        console.log('Documentos processados:', querySnapshot.docs.map(doc => ({ id: doc.id, type: doc.data().type })));
        
        // Carregar contagem de projetos para cada cliente
        await atualizarContagemProjetos(clientesData);
        
        setClientes(clientesData);
        console.log('Total de clientes carregados:', clientesData.length);
      } catch (error) {
        console.error('Erro ao executar query ordenada, tentando sem ordenação:', error);
        
        // Tentar sem ordenação caso o índice não exista
        const q2 = query(usersRef, where('type', '==', 'client'));
        const querySnapshot = await getDocs(q2);
        
        const clientesData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            nome: data.displayName || data.nome || 'Nome não informado',
            email: data.email || '',
            empresa: data.company || data.empresa || 'Empresa não informada',
            telefone: data.telefone || '',
            endereco: data.endereco || '',
            status: data.status || 'ativo' as const,
            dataCriacao: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            projetos: 0,
            firebaseUid: data.uid || doc.id
          };
        }) as Cliente[];
        
        // Ordenar no cliente se não conseguir no servidor
        clientesData.sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());
        
        console.log('Clientes encontrados na coleção users (sem ordenação):', clientesData.length);
        console.log('Documentos processados (sem ordenação):', querySnapshot.docs.map(doc => ({ id: doc.id, type: doc.data().type })));
        
        // Carregar contagem de projetos para cada cliente
        await atualizarContagemProjetos(clientesData);
        
        setClientes(clientesData);
        console.log('Total de clientes carregados:', clientesData.length);
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const atualizarContagemProjetos = async (clientesData: Cliente[]) => {
    try {
      console.log('Atualizando contagem de projetos...');
      
      // Buscar todos os projetos
      const projetosRef = collection(db, 'projetos');
      const projetosSnapshot = await getDocs(projetosRef);
      
      // Contar projetos por cliente
      const contagemProjetos: { [clienteId: string]: number } = {};
      
      projetosSnapshot.docs.forEach(doc => {
        const projetoData = doc.data();
        const clienteId = projetoData.clienteId || projetoData.cliente?.id;
        
        if (clienteId) {
          contagemProjetos[clienteId] = (contagemProjetos[clienteId] || 0) + 1;
        }
      });
      
      // Atualizar os dados dos clientes com a contagem correta
      clientesData.forEach(cliente => {
        cliente.projetos = contagemProjetos[cliente.id] || 0;
      });
      
      console.log('Contagem de projetos atualizada:', contagemProjetos);
    } catch (error) {
      console.error('Erro ao atualizar contagem de projetos:', error);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleCriarCliente = async () => {
    if (!novoCliente.nome || !novoCliente.email || !novoCliente.empresa || !novoCliente.senha) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (novoCliente.senha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setCriandoCliente(true);
    try {
      // CRIAR USUÁRIO NO FIREBASE AUTHENTICATION
      const firebaseApiKey = "AIzaSyBfqnHWfO5cTSrHSdPRU2BrPGFZ6X53qiA";
      
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: novoCliente.email,
          password: novoCliente.senha,
          returnSecureToken: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao criar usuário no Firebase Auth');
      }

      const authData = await response.json();
      const firebaseUid = authData.localId;
      
      // CRIAR DOCUMENTO NO FIRESTORE COM TODOS OS CAMPOS NECESSÁRIOS
      const clienteData = {
        uid: firebaseUid,
        displayName: novoCliente.nome,
        email: novoCliente.email,
        company: novoCliente.empresa,
        telefone: novoCliente.telefone || '',
        endereco: novoCliente.endereco || '',
        type: 'client',
        status: 'ativo',
        createdAt: new Date(),
        lastLogin: new Date(),
        lastLocation: '',
        latitude: null,
        longitude: null,
        timestamp: new Date(),
        projects: []
      };

      // Salvar na coleção users com UID do Firebase
      await setDoc(doc(db, 'users', firebaseUid), clienteData);
      
      const novoClienteCompleto: Cliente = {
        id: firebaseUid,
        nome: novoCliente.nome,
        email: novoCliente.email,
        empresa: novoCliente.empresa,
        telefone: novoCliente.telefone,
        endereco: novoCliente.endereco,
        status: 'ativo' as const,
        dataCriacao: new Date().toISOString(),
        projetos: 0,
        firebaseUid: firebaseUid
      };

      setClientes([novoClienteCompleto, ...clientes]);
      
      setNovoCliente({
        nome: '',
        email: '',
        empresa: '',
        telefone: '',
        endereco: '',
        senha: ''
      });
      
      setDialogAberto(false);
      
      toast.success(
        `✅ Cliente criado com sucesso!\n\n🔑 Credenciais:\nEmail: ${novoCliente.email}\nSenha: ${novoCliente.senha}\n\n📝 Conta criada no Firebase Authentication\n📄 Dados salvos no Firestore\n\n🎉 Cliente pode fazer login imediatamente!`
      );
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      let errorMessage = "Erro ao criar cliente";
      
      if (error.message?.includes('EMAIL_EXISTS')) {
        errorMessage = "Este email já possui uma conta no sistema";
      } else if (error.message?.includes('WEAK_PASSWORD')) {
        errorMessage = "A senha é muito fraca. Use pelo menos 6 caracteres";
      } else if (error.message?.includes('INVALID_EMAIL')) {
        errorMessage = "Email inválido";
      }
      
      toast.error(errorMessage);
    } finally {
      setCriandoCliente(false);
    }
  };

  const handleEditarCliente = async () => {
    if (!clienteEditando) return;

    try {
      // Atualizar sempre na coleção 'users'
      const clienteRef = doc(db, 'users', clienteEditando.id);
      
      // Campos editáveis na coleção users
      const updateData = {
        company: clienteEditando.empresa,
        telefone: clienteEditando.telefone,
        endereco: clienteEditando.endereco,
        status: clienteEditando.status
      };

      await updateDoc(clienteRef, updateData);
      
      // Atualizar o estado local
      const dadosAtualizados = {
        empresa: clienteEditando.empresa,
        telefone: clienteEditando.telefone || '',
        endereco: clienteEditando.endereco || '',
        status: clienteEditando.status
      };
      
      setClientes(clientes.map(cliente => 
        cliente.id === clienteEditando.id ? { ...cliente, ...dadosAtualizados } : cliente
      ));
      
      setClienteEditando(null);
      setDialogEdicaoAberto(false);
      toast.success('Cliente atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      toast.error('Erro ao atualizar cliente');
    }
  };

  const handleAlterarStatus = async (clienteId: string, novoStatus: 'ativo' | 'suspenso' | 'inativo') => {
    try {
      const cliente = clientes.find(c => c.id === clienteId);
      if (!cliente) return;

      // Atualizar sempre na coleção 'users'
      const clienteRef = doc(db, 'users', clienteId);
      await updateDoc(clienteRef, { status: novoStatus });
      
      setClientes(clientes.map(c => 
        c.id === clienteId ? { ...c, status: novoStatus } : c
      ));
      
      toast.success(`Status do cliente alterado para ${novoStatus}`);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do cliente');
    }
  };

  const handleDeletarCliente = async (clienteId: string) => {
    try {
      const cliente = clientes.find(c => c.id === clienteId);
      if (!cliente) return;

      // Deletar sempre da coleção 'users'
      const clienteRef = doc(db, 'users', clienteId);
      await deleteDoc(clienteRef);
      
      setClientes(clientes.filter(c => c.id !== clienteId));
      toast.success('Cliente deletado com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      toast.error('Erro ao deletar cliente');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
      case 'suspenso':
        return <Badge className="bg-yellow-100 text-yellow-800">Suspenso</Badge>;
      case 'inativo':
        return <Badge className="bg-red-100 text-red-800">Inativo</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const formatarTelefone = (telefone: string) => {
    if (!telefone) return '-';
    
    // Remove tudo que não é número
    const numeroLimpo = telefone.replace(/\D/g, '');
    
    // Formata de acordo com o tamanho
    if (numeroLimpo.length === 11) {
      // Celular: (XX) XXXXX-XXXX
      return `(${numeroLimpo.slice(0, 2)}) ${numeroLimpo.slice(2, 7)}-${numeroLimpo.slice(7)}`;
    } else if (numeroLimpo.length === 10) {
      // Fixo: (XX) XXXX-XXXX
      return `(${numeroLimpo.slice(0, 2)}) ${numeroLimpo.slice(2, 6)}-${numeroLimpo.slice(6)}`;
    } else if (numeroLimpo.length === 13) {
      // Internacional com DDI: +XX (XX) XXXXX-XXXX
      return `+${numeroLimpo.slice(0, 2)} (${numeroLimpo.slice(2, 4)}) ${numeroLimpo.slice(4, 9)}-${numeroLimpo.slice(9)}`;
    }
    
    // Retorna o número original se não se encaixar em nenhum formato
    return telefone;
  };

  const gerarSenhaAleatoria = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let senha = '';
    for (let i = 0; i < 12; i++) {
      senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNovoCliente({...novoCliente, senha});
  };

  const clientesFiltrados = clientes.filter(cliente => {
    const matchNome = cliente.nome.toLowerCase().includes(filtroNome.toLowerCase()) ||
                      cliente.empresa.toLowerCase().includes(filtroNome.toLowerCase()) ||
                      cliente.email.toLowerCase().includes(filtroNome.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || cliente.status === filtroStatus;
    return matchNome && matchStatus;
  });

  // Debug: Log da contagem de clientes
  console.log('=== DEBUG CLIENTES ===');
  console.log('Total de clientes:', clientes.length);
  console.log('Clientes filtrados:', clientesFiltrados.length);
  console.log('Filtro nome:', filtroNome);
  console.log('Filtro status:', filtroStatus);
  console.log('Clientes originais:', clientes.map(c => ({ id: c.id, nome: c.nome, status: c.status })));
  console.log('Clientes filtrados:', clientesFiltrados.map(c => ({ id: c.id, nome: c.nome, status: c.status })));
  console.log('=====================');



  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-x-hidden">
      <div className="page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gerenciar Clientes</h1>
          <p className="text-gray-600 mt-1">Gerencie todos os clientes da plataforma</p>
        </div>
        
        <div className="button-container flex gap-2 w-full sm:w-auto">
          <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
            <DialogTrigger asChild>
              <Button className="bg-versys-primary hover:bg-versys-secondary w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
              <DialogHeader>
                <DialogTitle>Criar Novo Cliente</DialogTitle>
                <DialogDescription>
                  Preencha as informações do novo cliente. Uma conta será criada automaticamente para acesso ao sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={novoCliente.nome}
                    onChange={(e) => setNovoCliente({...novoCliente, nome: e.target.value})}
                    placeholder="Nome completo"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={novoCliente.email}
                    onChange={(e) => setNovoCliente({...novoCliente, email: e.target.value})}
                    placeholder="cliente@empresa.com"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="empresa">Empresa</Label>
                  <Input
                    id="empresa"
                    value={novoCliente.empresa}
                    onChange={(e) => setNovoCliente({...novoCliente, empresa: e.target.value})}
                    placeholder="Nome da empresa"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={novoCliente.telefone}
                    onChange={(e) => setNovoCliente({...novoCliente, telefone: e.target.value})}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Textarea
                    id="endereco"
                    value={novoCliente.endereco}
                    onChange={(e) => setNovoCliente({...novoCliente, endereco: e.target.value})}
                    placeholder="Endereço completo"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="senha">Senha do Cliente</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="senha"
                        type={mostrarSenha ? "text" : "password"}
                        value={novoCliente.senha}
                        onChange={(e) => setNovoCliente({...novoCliente, senha: e.target.value})}
                        placeholder="Defina uma senha para o cliente"
                        className="pr-10"
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setMostrarSenha(!mostrarSenha)}
                      >
                        {mostrarSenha ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={gerarSenhaAleatoria}
                      className="whitespace-nowrap"
                    >
                      Gerar
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    O cliente poderá alterar esta senha posteriormente usando "Esqueci minha senha".
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogAberto(false)} disabled={criandoCliente}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCriarCliente} 
                  className="bg-versys-primary hover:bg-versys-secondary"
                  disabled={criandoCliente}
                >
                  {criandoCliente ? "Criando..." : "Criar Cliente"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista de Clientes */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4 overflow-x-clip">
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Lista de Clientes ({clientesFiltrados.length})</CardTitle>
            
            <div className="flex items-center gap-2 relative">
              {/* Botão de Busca */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBuscaExpandida(true)}
                  className={`h-9 w-9 p-0 transition-opacity ${buscaExpandida ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                >
                  <Search className="h-5 w-5" />
                </Button>
                
                {buscaExpandida && (
                  <div className="absolute right-0 top-0 z-50 animate-in slide-in-from-right duration-200">
                    <div className="relative bg-white rounded-md shadow-lg border border-gray-200">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input
                        placeholder="Buscar..."
                        value={filtroNome}
                        onChange={(e) => setFiltroNome(e.target.value)}
                        className="w-48 sm:w-64 pl-10 pr-10 h-9 border-0 focus-visible:ring-0"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setBuscaExpandida(false);
                          setFiltroNome('');
                        }}
                        className="absolute right-0 top-1/2 -translate-y-1/2 h-9 w-9 p-0 hover:bg-gray-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Filtro de Status */}
              <DropdownMenu open={filtroExpandido} onOpenChange={setFiltroExpandido}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 relative"
                  >
                    <Filter className="h-5 w-5" />
                    {filtroStatus !== 'todos' && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-versys-primary rounded-full" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={() => setFiltroStatus('todos')}
                    className={filtroStatus === 'todos' ? 'bg-gray-100' : ''}
                  >
                    Todos
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setFiltroStatus('ativo')}
                    className={filtroStatus === 'ativo' ? 'bg-green-50 text-green-700' : ''}
                  >
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                    Ativo
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFiltroStatus('suspenso')}
                    className={filtroStatus === 'suspenso' ? 'bg-yellow-50 text-yellow-700' : ''}
                  >
                    <span className="h-2 w-2 rounded-full bg-yellow-500 mr-2" />
                    Suspenso
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFiltroStatus('inativo')}
                    className={filtroStatus === 'inativo' ? 'bg-red-50 text-red-700' : ''}
                  >
                    <span className="h-2 w-2 rounded-full bg-red-500 mr-2" />
                    Inativo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              Carregando clientes...
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {filtroNome || filtroStatus !== "todos" 
                ? "Nenhum cliente encontrado com os filtros aplicados" 
                : "Nenhum cliente cadastrado"}
            </div>
          ) : (
            <>
              {/* Layout Mobile/Tablet - Cards */}
              <div className="cards-container block lg:hidden space-y-4">
                {clientesFiltrados.map((cliente) => (
                  <div key={cliente.id} className="client-card border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900 truncate">{cliente.nome}</h3>
                        <p className="text-sm text-gray-600 mt-1 truncate">{cliente.empresa}</p>
                        <p className="text-sm text-gray-500 truncate">{cliente.email}</p>
                        {cliente.telefone && (
                          <p className="text-sm text-gray-500 truncate">{formatarTelefone(cliente.telefone)}</p>
                        )}
                      </div>
                      <div className="flex items-start gap-2 ml-2 flex-shrink-0">
                        <div className="flex flex-col items-end gap-2">
                          <div className="status-badge">
                            {getStatusBadge(cliente.status)}
                          </div>
                          <span className="projects-count text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                            {cliente.projetos} projeto{cliente.projetos !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        {/* Dropdown de ações - Mobile */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                              <MoreVertical className="h-5 w-5 text-gray-600" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => {
                                setClienteEditando({ ...cliente });
                                setDialogEdicaoAberto(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            {cliente.status === 'ativo' ? (
                              <DropdownMenuItem
                                onClick={() => handleAlterarStatus(cliente.id, 'suspenso')}
                                className="text-orange-600"
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Suspender
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleAlterarStatus(cliente.id, 'ativo')}
                                className="text-green-600"
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Ativar
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem
                              onClick={() => {
                                if (cliente.projetos === 0) {
                                  const deleteButton = document.querySelector(`[data-delete-client="${cliente.id}"]`) as HTMLElement;
                                  deleteButton?.click();
                                }
                              }}
                              disabled={cliente.projetos > 0}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        {/* Hidden AlertDialog trigger */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              data-delete-client={cliente.id}
                              className="hidden"
                            />
                          </AlertDialogTrigger>
                          <AlertDialogContent className="w-[90vw] max-w-[400px] sm:max-w-[450px] rounded-2xl p-4 sm:p-6">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-base sm:text-lg">Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription className="text-xs sm:text-sm">
                                Tem certeza que deseja deletar o cliente "{cliente.nome}"?
                                Esta ação não pode ser desfeita e também removerá o acesso do usuário ao sistema.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2 sm:gap-0">
                              <AlertDialogCancel className="h-9 text-sm">Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeletarCliente(cliente.id)}
                                className="bg-red-600 hover:bg-red-700 h-9 text-sm"
                              >
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-200">
                      <span className="text-xs text-gray-500">
                        Criado em {new Date(cliente.dataCriacao).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Layout Desktop - Tabela */}
              <div className="table-container hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center p-2">Nome</TableHead>
                      <TableHead className="p-2">Empresa</TableHead>
                      <TableHead className="text-center p-2">Telefone</TableHead>
                      <TableHead className="text-center p-2">Projetos</TableHead>
                      <TableHead className="text-center p-2">Criação</TableHead>
                      <TableHead className="text-center p-2">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesFiltrados.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell className="p-2">
                          <div>
                            <div className="font-medium">{cliente.nome}</div>
                            <div className="text-sm text-gray-500">{cliente.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="p-2">{cliente.empresa}</TableCell>
                        <TableCell className="text-center p-2">{formatarTelefone(cliente.telefone)}</TableCell>
                        <TableCell className="text-center p-2">{cliente.projetos}</TableCell>
                        <TableCell className="text-center p-2">{new Date(cliente.dataCriacao).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-center p-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setClienteEditando({ ...cliente });
                                setDialogEdicaoAberto(true);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {cliente.status === 'ativo' ? (
                                <DropdownMenuItem 
                                  onClick={() => handleAlterarStatus(cliente.id, 'suspenso')}
                                  className="text-orange-600 focus:text-orange-600 focus:bg-orange-50"
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Suspender
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => handleAlterarStatus(cliente.id, 'ativo')}
                                  className="text-green-600 focus:text-green-600 focus:bg-green-50"
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Ativar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    disabled={cliente.projetos > 0}
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja deletar o cliente "{cliente.nome}"?
                                      Esta ação não pode ser desfeita e também removerá o acesso do usuário ao sistema.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeletarCliente(cliente.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Deletar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>


            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      <Dialog open={dialogEdicaoAberto} onOpenChange={setDialogEdicaoAberto}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Altere as informações do cliente. Nome e E-mail não podem ser editados por questões de segurança.
            </DialogDescription>
          </DialogHeader>
          {clienteEditando && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-nome" className="text-gray-500">Nome (Não editável)</Label>
                <Input
                  id="edit-nome"
                  value={clienteEditando.nome}
                  disabled
                  className="bg-gray-50 cursor-not-allowed"
                  title="Nome não pode ser alterado por questões de segurança"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email" className="text-gray-500">E-mail (Não editável)</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={clienteEditando.email}
                  disabled
                  className="bg-gray-50 cursor-not-allowed"
                  title="E-mail não pode ser alterado por estar vinculado à autenticação"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-empresa">Empresa</Label>
                <Input
                  id="edit-empresa"
                  value={clienteEditando.empresa}
                  onChange={(e) => setClienteEditando({...clienteEditando, empresa: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-telefone">Telefone</Label>
                <Input
                  id="edit-telefone"
                  value={clienteEditando.telefone || ''}
                  onChange={(e) => setClienteEditando({...clienteEditando, telefone: e.target.value})}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-endereco">Endereço</Label>
                <Textarea
                  id="edit-endereco"
                  value={clienteEditando.endereco || ''}
                  onChange={(e) => setClienteEditando({...clienteEditando, endereco: e.target.value})}
                  placeholder="Endereço completo do cliente"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setClienteEditando(null);
              setDialogEdicaoAberto(false);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleEditarCliente} className="bg-versys-primary hover:bg-versys-secondary">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clientes; 