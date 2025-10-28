import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, UserX, UserCheck, Search, Shield, User, Eye, EyeOff, MoreVertical, Filter, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where, setDoc } from "firebase/firestore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { usePageTitle } from '@/contexts/PageTitleContext';

interface Colaborador {
  id: string;
  nome: string;
  email: string;
  nivel: 'administrador' | 'colaborador';
  tipo: 'admin' | 'colaborador';
  telefone: string;
  status: 'ativo' | 'suspenso' | 'inativo';
  dataAdmissao: string;
  projetosAtivos: number;
  firebaseUid?: string;
  senhaTemporaria?: string;
  precisaCriarConta?: boolean;
}

const Colaboradores = () => {
  const { setPageTitle } = usePageTitle();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroNivel, setFiltroNivel] = useState("todos");
  const [colaboradorEditando, setColaboradorEditando] = useState<Colaborador | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [dialogEdicaoAberto, setDialogEdicaoAberto] = useState(false);
  const [criandoColaborador, setCriandoColaborador] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [buscaExpandida, setBuscaExpandida] = useState(false);
  const [filtroExpandido, setFiltroExpandido] = useState(false);
  const [novoColaborador, setNovoColaborador] = useState<Partial<Colaborador & { senha: string }>>({
    nome: "",
    email: "",
    nivel: "colaborador",
    tipo: "colaborador",
    telefone: "",
    senha: "",
    status: "ativo"
  });

  // Limpar o título do header no mobile
  useEffect(() => {
    setPageTitle('');
  }, [setPageTitle]);

  // Carregar colaboradores do Firestore
  const carregarColaboradores = async () => {
    try {
      // Buscar usuários que são colaboradores ou admins na coleção users
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('type', 'in', ['admin', 'colaborador']));
      const querySnapshot = await getDocs(q);
      const colaboradoresData: Colaborador[] = [];
      
      console.log('🔍 Iniciando busca de colaboradores...');
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        
        console.log('👤 Usuário encontrado:', {
          id: doc.id,
          email: userData.email,
          type: userData.type,
          nivel: userData.nivel,
          displayName: userData.displayName,
          isColaborador: userData.isColaborador
        });
        
        // Pular apenas usuários que são clientes explicitamente
        if (userData.type === 'client') {
          console.log('❌ Ignorando cliente:', userData.email);
          return;
        }
        
        // Se é admin ou colaborador, incluir na lista
        if (userData.type === 'admin' || userData.type === 'colaborador') {
          const colaborador = {
            id: doc.id,
            nome: userData.displayName || userData.email,
            email: userData.email,
            nivel: userData.nivel || (userData.type === 'admin' ? 'administrador' : 'colaborador'),
            tipo: userData.type,
            telefone: userData.telefone || '',
            status: userData.status || 'ativo',
            dataAdmissao: userData.dataAdmissao || new Date().toISOString().split('T')[0],
            projetosAtivos: userData.projetosAtivos || 0,
            firebaseUid: userData.uid,
            precisaCriarConta: userData.precisaCriarConta || false
          } as Colaborador;
          
          console.log('✅ Adicionando colaborador:', colaborador.nome, colaborador.email);
          colaboradoresData.push(colaborador);
        }
      });
      
      // Ordenar por data de admissão (mais recentes primeiro)
      colaboradoresData.sort((a, b) => new Date(b.dataAdmissao).getTime() - new Date(a.dataAdmissao).getTime());
      
      setColaboradores(colaboradoresData);
      console.log('📊 Total de colaboradores carregados:', colaboradoresData.length);
      console.log('📋 Lista final:', colaboradoresData.map(c => ({ nome: c.nome, email: c.email, tipo: c.tipo })));
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
      toast.error('Erro ao carregar colaboradores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarColaboradores();
  }, []);

  const niveis = [
    { value: "administrador", label: "Administrador" },
    { value: "colaborador", label: "Colaborador" }
  ];

  const colaboradoresFiltrados = colaboradores.filter(colaborador => {
    const nomeMatch = colaborador.nome.toLowerCase().includes(filtroNome.toLowerCase()) ||
                     colaborador.email.toLowerCase().includes(filtroNome.toLowerCase());
    const statusMatch = filtroStatus === "todos" || colaborador.status === filtroStatus;
    const nivelMatch = filtroNivel === "todos" || colaborador.nivel === filtroNivel;
    return nomeMatch && statusMatch && nivelMatch;
  });

  const handleCriarColaborador = async () => {
    if (!novoColaborador.nome || !novoColaborador.email) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setCriandoColaborador(true);

    try {
      // Verificar se já existe um usuário com este email na coleção users
      const usersRef = collection(db, 'users');
      const existingQuery = query(usersRef, where('email', '==', novoColaborador.email));
      const existingDocs = await getDocs(existingQuery);
      
      if (!existingDocs.empty) {
        toast.error("Já existe um usuário com este e-mail");
        setCriandoColaborador(false);
        return;
      }

      // Determinar se é senha definida pelo admin ou gerada automaticamente
      const senhaDefinidaPeloAdmin = !!novoColaborador.senha?.trim();
      const senhaFinal = senhaDefinidaPeloAdmin ? novoColaborador.senha! : generateRandomPassword();

      // Determinar o tipo baseado no nível
      const userType = novoColaborador.nivel === 'administrador' ? 'admin' : 'colaborador';

      // CRIAR USUÁRIO VIA FIREBASE REST API (SEM AFETAR SESSÃO ATUAL)
      const firebaseApiKey = "AIzaSyBfqnHWfO5cTSrHSdPRU2BrPGFZ6X53qiA";
      
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: novoColaborador.email,
          password: senhaFinal,
          returnSecureToken: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao criar usuário no Firebase Auth');
      }

      const authData = await response.json();
      const firebaseUid = authData.localId;

      // Criar documento na coleção users com UID real do Firebase
      const userData = {
        uid: firebaseUid,
        email: novoColaborador.email!,
        displayName: novoColaborador.nome!,
        type: userType,
        company: userType === 'admin' ? 'Versys' : '',
        projects: [],
        telefone: novoColaborador.telefone || "",
        nivel: novoColaborador.nivel,
        status: "ativo",
        dataAdmissao: new Date().toISOString().split('T')[0],
        projetosAtivos: 0,
        createdAt: new Date(),
        lastLogin: new Date()
      };

      // Salvar na coleção users com UID do Firebase
      await setDoc(doc(db, 'users', firebaseUid), userData);
      
      // Atualizar lista local
      await carregarColaboradores();

      setNovoColaborador({
        nome: "",
        email: "",
        nivel: "colaborador",
        tipo: "colaborador",
        telefone: "",
        senha: "",
        status: "ativo"
      });
      setDialogAberto(false);
      
      toast.success(`✅ Colaborador criado com sucesso!\n\n🔑 Credenciais:\nEmail: ${userData.email}\nSenha: ${senhaFinal}\n\n📝 Conta criada no Firebase Authentication\n📄 Dados salvos no Firestore\n\n🎉 Sua sessão permaneceu ativa!`);
    } catch (error: any) {
      console.error("Erro ao criar colaborador:", error);
      let errorMessage = "Erro ao criar colaborador";
      
      if (error.message?.includes('EMAIL_EXISTS')) {
        errorMessage = "Este email já possui uma conta no sistema";
      } else if (error.message?.includes('WEAK_PASSWORD')) {
        errorMessage = "A senha é muito fraca. Use pelo menos 6 caracteres";
      } else if (error.message?.includes('INVALID_EMAIL')) {
        errorMessage = "Email inválido";
      }
      
      toast.error(errorMessage);
    } finally {
      setCriandoColaborador(false);
    }
  };

  // Função para gerar senha aleatória
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let senha = '';
    for (let i = 0; i < 8; i++) {
      senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return senha;
  };

  const handleEditarColaborador = async () => {
    if (!colaboradorEditando) return;

    try {
      const userRef = doc(db, 'users', colaboradorEditando.id);
      await updateDoc(userRef, {
        displayName: colaboradorEditando.nome,
        email: colaboradorEditando.email,
        nivel: colaboradorEditando.nivel,
        type: colaboradorEditando.nivel === 'administrador' ? 'admin' : 'colaborador',
        telefone: colaboradorEditando.telefone,
        status: colaboradorEditando.status
      });

      setColaboradores(colaboradores.map(c => 
        c.id === colaboradorEditando.id ? colaboradorEditando : c
      ));
      setColaboradorEditando(null);
      setDialogEdicaoAberto(false);
      toast.success("Colaborador atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar colaborador:", error);
      toast.error("Erro ao atualizar colaborador");
    }
  };

  const handleAlterarStatus = async (colaboradorId: string, novoStatus: 'ativo' | 'suspenso' | 'inativo') => {
    try {
      const userRef = doc(db, 'users', colaboradorId);
      await updateDoc(userRef, { status: novoStatus });

      setColaboradores(colaboradores.map(c => 
        c.id === colaboradorId ? { ...c, status: novoStatus } : c
      ));
      
      const statusTexto = novoStatus === 'ativo' ? 'ativado' : 
                         novoStatus === 'suspenso' ? 'suspenso' : 'inativado';
      toast.success(`Colaborador ${statusTexto} com sucesso!`);
    } catch (error) {
      console.error("Erro ao alterar status do colaborador:", error);
      toast.error("Erro ao alterar status do colaborador");
    }
  };

  const handleDeletarColaborador = async (colaboradorId: string) => {
    try {
      await deleteDoc(doc(db, 'users', colaboradorId));
      setColaboradores(colaboradores.filter(c => c.id !== colaboradorId));
      toast.success("Colaborador deletado com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar colaborador:", error);
      toast.error("Erro ao deletar colaborador");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      ativo: "default",
      suspenso: "secondary",
      inativo: "destructive"
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getNivelBadge = (nivel: string) => {
    const colors = {
      administrador: "bg-red-100 text-red-800",
      colaborador: "bg-blue-100 text-blue-800"
    } as const;

    return (
      <Badge className={colors[nivel as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {nivel.charAt(0).toUpperCase() + nivel.slice(1)}
      </Badge>
    );
  };

  const getTipoBadge = (tipo: string) => {
    return (
      <Badge variant={tipo === 'admin' ? "destructive" : "outline"}>
        {tipo === 'admin' ? (
          <>
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </>
        ) : (
          <>
            <User className="h-3 w-3 mr-1" />
            Colaborador
          </>
        )}
      </Badge>
    );
  };

  const gerarSenhaAleatoria = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let senha = '';
    for (let i = 0; i < 8; i++) {
      senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNovoColaborador({...novoColaborador, senha});
  };

  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Header responsivo */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gerenciar Colaboradores</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Gerencie todos os colaboradores da empresa</p>
        </div>
        
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger asChild>
            <Button className="bg-versys-primary hover:bg-versys-secondary w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Colaborador</DialogTitle>
              <DialogDescription>
                Preencha as informações do novo colaborador. Uma conta de administrador será criada automaticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={novoColaborador.nome}
                    onChange={(e) => setNovoColaborador({...novoColaborador, nome: e.target.value})}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={novoColaborador.email}
                    onChange={(e) => setNovoColaborador({...novoColaborador, email: e.target.value})}
                    placeholder="exemplo@email.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={novoColaborador.telefone}
                    onChange={(e) => setNovoColaborador({...novoColaborador, telefone: e.target.value})}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nivel">Nível</Label>
                  <Select
                    value={novoColaborador.nivel}
                    onValueChange={(value) => setNovoColaborador({...novoColaborador, nivel: value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {niveis.map(nivel => (
                        <SelectItem key={nivel.value} value={nivel.value}>{nivel.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="senha">Senha Temporária (Opcional)</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="senha"
                      type={mostrarSenha ? "text" : "password"}
                      value={novoColaborador.senha}
                      onChange={(e) => setNovoColaborador({...novoColaborador, senha: e.target.value})}
                      placeholder="Deixe em branco para gerar automaticamente"
                      className="pr-10"
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
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setDialogAberto(false)} disabled={criandoColaborador} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button 
                onClick={handleCriarColaborador} 
                className="bg-versys-primary hover:bg-versys-secondary w-full sm:w-auto"
                disabled={criandoColaborador}
              >
                {criandoColaborador ? "Criando..." : "Criar Colaborador"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela de Colaboradores */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4 overflow-x-clip">
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Lista de Colaboradores ({colaboradoresFiltrados.length})</CardTitle>
            
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

              {/* Filtro de Status e Nível */}
              <DropdownMenu open={filtroExpandido} onOpenChange={setFiltroExpandido}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 relative"
                  >
                    <Filter className="h-5 w-5" />
                    {(filtroStatus !== 'todos' || filtroNivel !== 'todos') && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-versys-primary rounded-full" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {/* Filtros de Status */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Status</div>
                  <DropdownMenuItem
                    onClick={() => setFiltroStatus('todos')}
                    className={filtroStatus === 'todos' ? 'bg-gray-100' : ''}
                  >
                    Todos os status
                  </DropdownMenuItem>
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
                  
                  <DropdownMenuSeparator />
                  
                  {/* Filtros de Nível */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Nível</div>
                  <DropdownMenuItem
                    onClick={() => setFiltroNivel('todos')}
                    className={filtroNivel === 'todos' ? 'bg-gray-100' : ''}
                  >
                    Todos os níveis
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFiltroNivel('administrador')}
                    className={filtroNivel === 'administrador' ? 'bg-purple-50 text-purple-700' : ''}
                  >
                    <Shield className="h-4 w-4 mr-2 text-purple-600" />
                    Administrador
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFiltroNivel('colaborador')}
                    className={filtroNivel === 'colaborador' ? 'bg-blue-50 text-blue-700' : ''}
                  >
                    <User className="h-4 w-4 mr-2 text-blue-600" />
                    Colaborador
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Layout Desktop - Tabela */}
          <div className="hidden md:block">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-center">Nível</TableHead>
                <TableHead className="text-center">Tipo</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Carregando colaboradores...
                  </TableCell>
                </TableRow>
              ) : colaboradoresFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    {filtroNome || filtroStatus !== "todos" 
                      ? "Nenhum colaborador encontrado com os filtros aplicados" 
                      : "Nenhum colaborador cadastrado"}
                  </TableCell>
                </TableRow>
              ) : (
                colaboradoresFiltrados.map((colaborador) => (
                  <TableRow key={colaborador.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{colaborador.nome}</div>
                        <div className="text-sm text-gray-500">{colaborador.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{getNivelBadge(colaborador.nivel)}</TableCell>
                    <TableCell className="text-center">{getTipoBadge(colaborador.tipo)}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(colaborador.status)}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setColaboradorEditando({ ...colaborador });
                            setDialogEdicaoAberto(true);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {colaborador.status === 'ativo' ? (
                            <DropdownMenuItem 
                              onClick={() => handleAlterarStatus(colaborador.id, 'suspenso')}
                              className="text-orange-600 focus:text-orange-600 focus:bg-orange-50"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Suspender
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => handleAlterarStatus(colaborador.id, 'ativo')}
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
                                  Tem certeza que deseja deletar o colaborador "{colaborador.nome}"?
                                  Esta ação não pode ser desfeita e também removerá o acesso do usuário ao sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletarColaborador(colaborador.id)}
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
                ))
              )}
            </TableBody>
            </Table>
          </div>

          {/* Layout Mobile - Cards */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <p>Carregando colaboradores...</p>
              </div>
            ) : colaboradoresFiltrados.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>
                  {filtroNome || filtroStatus !== "todos" 
                    ? "Nenhum colaborador encontrado com os filtros aplicados" 
                    : "Nenhum colaborador cadastrado"}
                </p>
              </div>
            ) : (
              colaboradoresFiltrados.map((colaborador) => (
                <Card key={colaborador.id} className="p-4">
                  <div className="space-y-3">
                    {/* Header do Card */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900 truncate">{colaborador.nome}</h3>
                        <p className="text-sm text-gray-600 truncate">{colaborador.email}</p>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex items-center gap-2">
                        {getStatusBadge(colaborador.status)}
                        
                        {/* Dropdown no canto superior - Mobile */}
                        <div className="sm:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                <MoreVertical className="h-5 w-5 text-gray-600" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => {
                                  setColaboradorEditando({ ...colaborador });
                                  setDialogEdicaoAberto(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              {colaborador.status === 'ativo' ? (
                                <DropdownMenuItem
                                  onClick={() => handleAlterarStatus(colaborador.id, 'suspenso')}
                                  className="text-orange-600"
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Suspender
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleAlterarStatus(colaborador.id, 'ativo')}
                                  className="text-green-600"
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Ativar
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem
                                onClick={() => {
                                  const deleteButton = document.querySelector(`[data-delete-colab="${colaborador.id}"]`) as HTMLElement;
                                  deleteButton?.click();
                                }}
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
                                data-delete-colab={colaborador.id}
                                className="hidden"
                              />
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[90vw] max-w-[400px] sm:max-w-[450px] rounded-2xl p-4 sm:p-6">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-base sm:text-lg">Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription className="text-xs sm:text-sm">
                                  Tem certeza que deseja deletar o colaborador "{colaborador.nome}"?
                                  Esta ação não pode ser desfeita e também removerá o acesso do usuário ao sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2 sm:gap-0">
                                <AlertDialogCancel className="h-9 text-sm">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletarColaborador(colaborador.id)}
                                  className="bg-red-600 hover:bg-red-700 h-9 text-sm"
                                >
                                  Deletar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>

                    {/* Informações do Colaborador */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700 text-sm">Nível:</span>
                        {getNivelBadge(colaborador.nivel)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700 text-sm">Tipo:</span>
                        {getTipoBadge(colaborador.tipo)}
                      </div>
                      {colaborador.telefone && (
                        <div className="flex items-center text-sm">
                          <span className="font-medium text-gray-700 w-20 flex-shrink-0">Telefone:</span>
                          <span className="text-gray-600 truncate">{colaborador.telefone}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm">
                        <span className="font-medium text-gray-700 w-20 flex-shrink-0">Admissão:</span>
                        <span className="text-gray-600">{new Date(colaborador.dataAdmissao).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>

                    {/* Ações - Apenas Desktop */}
                    <div className="hidden sm:flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setColaboradorEditando({ ...colaborador });
                          setDialogEdicaoAberto(true);
                        }}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      {colaborador.status === 'ativo' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAlterarStatus(colaborador.id, 'suspenso')}
                          className="flex-1 text-orange-600 border-orange-600 hover:bg-orange-50"
                          title="Suspender colaborador"
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Suspender
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAlterarStatus(colaborador.id, 'ativo')}
                          className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
                          title="Ativar colaborador"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Ativar
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            title="Deletar colaborador"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[90vw] max-w-[400px] sm:max-w-[450px] rounded-2xl p-4 sm:p-6">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-base sm:text-lg">Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription className="text-xs sm:text-sm">
                              Tem certeza que deseja deletar o colaborador "{colaborador.nome}"?
                              Esta ação não pode ser desfeita e também removerá o acesso do usuário ao sistema.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-2 sm:gap-0">
                            <AlertDialogCancel className="h-9 text-sm">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletarColaborador(colaborador.id)}
                              className="bg-red-600 hover:bg-red-700 h-9 text-sm"
                            >
                              Deletar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      <Dialog open={dialogEdicaoAberto} onOpenChange={setDialogEdicaoAberto}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Colaborador</DialogTitle>
            <DialogDescription>
              Altere as informações do colaborador
            </DialogDescription>
          </DialogHeader>
          {colaboradorEditando && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-nome">Nome</Label>
                  <Input
                    id="edit-nome"
                    value={colaboradorEditando.nome}
                    onChange={(e) => setColaboradorEditando({...colaboradorEditando, nome: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">E-mail</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={colaboradorEditando.email}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-telefone">Telefone</Label>
                  <Input
                    id="edit-telefone"
                    value={colaboradorEditando.telefone}
                    onChange={(e) => setColaboradorEditando({...colaboradorEditando, telefone: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-nivel">Nível</Label>
                  <Select
                    value={colaboradorEditando.nivel}
                    onValueChange={(value) => setColaboradorEditando({...colaboradorEditando, nivel: value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {niveis.map(nivel => (
                        <SelectItem key={nivel.value} value={nivel.value}>{nivel.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => {
              setColaboradorEditando(null);
              setDialogEdicaoAberto(false);
            }} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleEditarColaborador} className="bg-versys-primary hover:bg-versys-secondary w-full sm:w-auto">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Colaboradores; 