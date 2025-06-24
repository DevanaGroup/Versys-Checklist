import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, UserX, UserCheck, Search, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { testClientesCollection } from '@/lib/testFirestore';

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
  senhaTemporaria?: string;
  precisaCriarConta?: boolean;
  origem?: 'clientes' | 'users'; // Para identificar de onde veio o cliente
}

const Clientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [criandoCliente, setCriandoCliente] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [dialogEdicaoAberto, setDialogEdicaoAberto] = useState(false);
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [mostrarSenha, setMostrarSenha] = useState(false);
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
    testClientesCollection(); // Teste para debug
  }, []);

  const carregarClientes = async () => {
    try {
      setLoading(true);
      console.log('Carregando clientes da coleção clientes...');
      
      // Tentar carregar da coleção clientes primeiro
      const clientesRef = collection(db, 'clientes');
      const q = query(clientesRef, orderBy('dataCriacao', 'desc'));
      const querySnapshot = await getDocs(q);
      
      let clientesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        origem: 'clientes' as const
      })) as Cliente[];
      
      console.log('Clientes encontrados na coleção clientes:', clientesData.length);
      
      // Se não houver clientes na coleção 'clientes', verificar na coleção 'users'
      if (clientesData.length === 0) {
        console.log('Nenhum cliente na coleção clientes, verificando coleção users...');
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        const clientesFromUsers = usersSnapshot.docs
          .filter(doc => doc.data().type === 'client')
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              nome: data.displayName || 'Nome não informado',
              email: data.email || '',
              empresa: data.company || 'Empresa não informada',
              telefone: '',
              endereco: '',
              status: 'ativo' as const,
              dataCriacao: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
              projetos: data.projects?.length || 0,
              firebaseUid: data.uid,
              origem: 'users' as const
            };
          }) as Cliente[];
        
        console.log('Clientes encontrados na coleção users:', clientesFromUsers.length);
        clientesData = clientesFromUsers;
      }
      
      // Carregar contagem de projetos para cada cliente
      await atualizarContagemProjetos(clientesData);
      
      setClientes(clientesData);
      console.log('Total de clientes carregados:', clientesData.length);
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
    if (!novoCliente.nome || !novoCliente.email || !novoCliente.empresa) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setCriandoCliente(true);
    try {
      const senhaTemporaria = novoCliente.senha || generateRandomPassword();
      
      const clienteData = {
        nome: novoCliente.nome,
        email: novoCliente.email,
        empresa: novoCliente.empresa,
        telefone: novoCliente.telefone,
        endereco: novoCliente.endereco,
        status: 'ativo' as const,
        dataCriacao: new Date().toISOString(),
        projetos: 0,
        senhaTemporaria: senhaTemporaria,
        precisaCriarConta: true
      };

      const docRef = await addDoc(collection(db, 'clientes'), clienteData);
      
      const novoClienteCompleto: Cliente = {
        id: docRef.id,
        ...clienteData
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
        `Cliente criado com sucesso! 
         Senha temporária: ${senhaTemporaria}
         Link de primeiro acesso: ${window.location.origin}/cliente/primeiro-acesso`
      );
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      toast.error('Erro ao criar cliente');
    } finally {
      setCriandoCliente(false);
    }
  };

  const handleEditarCliente = async () => {
    if (!clienteEditando) return;

    try {
      // Determinar a coleção correta baseada na origem
      const colecao = clienteEditando.origem === 'users' ? 'users' : 'clientes';
      const clienteRef = doc(db, colecao, clienteEditando.id);
      
      let updateData: any;
      
      if (clienteEditando.origem === 'users') {
        // Para clientes da coleção users, usar o formato antigo
        updateData = {
          displayName: clienteEditando.nome,
          email: clienteEditando.email,
          company: clienteEditando.empresa
        };
      } else {
        // Para clientes da coleção clientes, usar o formato novo
        updateData = {
          nome: clienteEditando.nome,
          email: clienteEditando.email,
          empresa: clienteEditando.empresa,
          telefone: clienteEditando.telefone,
          endereco: clienteEditando.endereco
        };
      }

      await updateDoc(clienteRef, updateData);
      
      // Atualizar o estado local - sempre incluir todos os campos
      const dadosAtualizados = {
        nome: clienteEditando.nome,
        email: clienteEditando.email,
        empresa: clienteEditando.empresa,
        telefone: clienteEditando.telefone || '',
        endereco: clienteEditando.endereco || ''
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

      const colecao = cliente.origem === 'users' ? 'users' : 'clientes';
      const clienteRef = doc(db, colecao, clienteId);
      
      // Para clientes da coleção users, não há campo status, então vamos simular localmente
      if (cliente.origem !== 'users') {
        await updateDoc(clienteRef, { status: novoStatus });
      }
      
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

      const colecao = cliente.origem === 'users' ? 'users' : 'clientes';
      const clienteRef = doc(db, colecao, clienteId);
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Clientes</h1>
          <p className="text-gray-600 mt-1">Gerencie todos os clientes da plataforma</p>
        </div>
        
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger asChild>
            <Button className="bg-versys-primary hover:bg-versys-secondary">
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Cliente</DialogTitle>
              <DialogDescription>
                Preencha as informações do novo cliente. Uma conta será criada automaticamente para acesso ao sistema.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={novoCliente.nome}
                  onChange={(e) => setNovoCliente({...novoCliente, nome: e.target.value})}
                  placeholder="Nome completo"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={novoCliente.email}
                  onChange={(e) => setNovoCliente({...novoCliente, email: e.target.value})}
                  placeholder="cliente@empresa.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="empresa">Empresa *</Label>
                <Input
                  id="empresa"
                  value={novoCliente.empresa}
                  onChange={(e) => setNovoCliente({...novoCliente, empresa: e.target.value})}
                  placeholder="Nome da empresa"
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
                <Label htmlFor="senha">Senha Temporária (Opcional)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="senha"
                      type={mostrarSenha ? "text" : "password"}
                      value={novoCliente.senha}
                      onChange={(e) => setNovoCliente({...novoCliente, senha: e.target.value})}
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
                <p className="text-xs text-gray-500">
                  Uma senha temporária será fornecida ao cliente. Ele deverá criar uma nova senha no primeiro acesso.
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

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="filtro-nome">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="filtro-nome"
                  placeholder="Buscar por nome, empresa ou email..."
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filtro-status">Status</Label>
              <select
                id="filtro-status"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="todos">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="suspenso">Suspenso</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes ({clientesFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Projetos</TableHead>
                <TableHead>Data Criação</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Carregando clientes...
                  </TableCell>
                </TableRow>
              ) : clientesFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    {filtroNome || filtroStatus !== "todos" 
                      ? "Nenhum cliente encontrado com os filtros aplicados" 
                      : "Nenhum cliente cadastrado"}
                  </TableCell>
                </TableRow>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">
                      {cliente.nome}
                      {cliente.origem === 'users' && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Antigo
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{cliente.empresa}</TableCell>
                    <TableCell>{cliente.email}</TableCell>
                    <TableCell>{cliente.telefone || '-'}</TableCell>
                    <TableCell>{getStatusBadge(cliente.status)}</TableCell>
                    <TableCell>{cliente.projetos}</TableCell>
                    <TableCell>{new Date(cliente.dataCriacao).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        {/* Botão Editar */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setClienteEditando({ ...cliente });
                            setDialogEdicaoAberto(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        {/* Botões de Status */}
                        {cliente.status === 'ativo' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAlterarStatus(cliente.id, 'suspenso')}
                            className="text-orange-600 border-orange-600 hover:bg-orange-50"
                            title={cliente.origem === 'users' ? 'Status alterado apenas localmente (cliente do sistema antigo)' : 'Suspender cliente'}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAlterarStatus(cliente.id, 'ativo')}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            title={cliente.origem === 'users' ? 'Status alterado apenas localmente (cliente do sistema antigo)' : 'Ativar cliente'}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Botão Deletar */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              disabled={cliente.projetos > 0}
                              title={cliente.projetos > 0 ? 'Não é possível deletar cliente com projetos ativos' : 'Deletar cliente'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      <Dialog open={dialogEdicaoAberto} onOpenChange={setDialogEdicaoAberto}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Altere as informações do cliente
            </DialogDescription>
          </DialogHeader>
          {clienteEditando && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-nome">Nome</Label>
                <Input
                  id="edit-nome"
                  value={clienteEditando.nome}
                  onChange={(e) => setClienteEditando({...clienteEditando, nome: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">E-mail</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={clienteEditando.email}
                  onChange={(e) => setClienteEditando({...clienteEditando, email: e.target.value})}
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
                  placeholder={clienteEditando.origem === 'users' ? 'Campo não disponível para clientes antigos' : 'Telefone do cliente'}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-endereco">Endereço</Label>
                <Textarea
                  id="edit-endereco"
                  value={clienteEditando.endereco || ''}
                  onChange={(e) => setClienteEditando({...clienteEditando, endereco: e.target.value})}
                  placeholder={clienteEditando.origem === 'users' ? 'Campo não disponível para clientes antigos' : 'Endereço do cliente'}
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