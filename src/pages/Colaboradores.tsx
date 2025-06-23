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
import { Plus, Edit, Trash2, UserX, UserCheck, Search, Shield, User, Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where } from "firebase/firestore";

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
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [colaboradorEditando, setColaboradorEditando] = useState<Colaborador | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [dialogEdicaoAberto, setDialogEdicaoAberto] = useState(false);
  const [criandoColaborador, setCriandoColaborador] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [novoColaborador, setNovoColaborador] = useState<Partial<Colaborador & { senha: string }>>({
    nome: "",
    email: "",
    nivel: "colaborador",
    tipo: "colaborador",
    telefone: "",
    senha: "",
    status: "ativo"
  });

  // Carregar colaboradores do Firestore
  useEffect(() => {
    const carregarColaboradores = async () => {
      try {
        const q = query(collection(db, 'colaboradores'), orderBy('dataAdmissao', 'desc'));
        const querySnapshot = await getDocs(q);
        const colaboradoresData: Colaborador[] = [];
        
        querySnapshot.forEach((doc) => {
          colaboradoresData.push({
            id: doc.id,
            ...doc.data()
          } as Colaborador);
        });
        
        setColaboradores(colaboradoresData);
        console.log('Colaboradores carregados:', colaboradoresData.length);
      } catch (error) {
        console.error('Erro ao carregar colaboradores:', error);
        toast.error('Erro ao carregar colaboradores');
      } finally {
        setLoading(false);
      }
    };

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
    return nomeMatch && statusMatch;
  });

  const handleCriarColaborador = async () => {
    if (!novoColaborador.nome || !novoColaborador.email) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setCriandoColaborador(true);

    try {
      // Verificar se já existe um colaborador com este email
      const colaboradoresRef = collection(db, 'colaboradores');
      const existingQuery = query(colaboradoresRef, where('email', '==', novoColaborador.email));
      const existingDocs = await getDocs(existingQuery);
      
      if (!existingDocs.empty) {
        toast.error("Já existe um colaborador com este e-mail");
        setCriandoColaborador(false);
        return;
      }

      const colaboradorData = {
        nome: novoColaborador.nome!,
        email: novoColaborador.email!,
        nivel: novoColaborador.nivel as 'administrador' | 'colaborador',
        tipo: "admin" as 'admin' | 'colaborador',
        telefone: novoColaborador.telefone || "",
        status: "ativo" as 'ativo' | 'suspenso' | 'inativo',
        dataAdmissao: new Date().toISOString().split('T')[0],
        projetosAtivos: 0,
        // Não criar conta Firebase aqui - será criada quando o colaborador fizer primeiro login
        firebaseUid: null,
        senhaTemporaria: novoColaborador.senha || generateRandomPassword(),
        precisaCriarConta: true // Flag para indicar que precisa criar conta
      };

      // Salvar apenas no Firestore na coleção colaboradores
      const docRef = await addDoc(collection(db, 'colaboradores'), colaboradorData);
      
      const novoColaboradorCompleto: Colaborador = {
        id: docRef.id,
        ...colaboradorData,
        firebaseUid: colaboradorData.firebaseUid || undefined
      };

      setColaboradores([novoColaboradorCompleto, ...colaboradores]);
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
      
      toast.success(`Colaborador criado com sucesso!\n\nInstruções para o colaborador:\n1. Acesse: ${window.location.origin}/colaborador/primeiro-acesso\n2. Use o email: ${novoColaboradorCompleto.email}\n3. Use a senha temporária: ${colaboradorData.senhaTemporaria}\n4. Crie uma nova senha no primeiro acesso`);
    } catch (error: any) {
      console.error("Erro ao criar colaborador:", error);
      toast.error("Erro ao criar colaborador");
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
      const colaboradorRef = doc(db, 'colaboradores', colaboradorEditando.id);
      await updateDoc(colaboradorRef, {
        nome: colaboradorEditando.nome,
        email: colaboradorEditando.email,
        nivel: colaboradorEditando.nivel,
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
      const colaboradorRef = doc(db, 'colaboradores', colaboradorId);
      await updateDoc(colaboradorRef, { status: novoStatus });

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
    const colaborador = colaboradores.find(c => c.id === colaboradorId);
    if (colaborador && colaborador.projetosAtivos > 0) {
      toast.error("Não é possível deletar colaborador com projetos ativos");
      return;
    }

    try {
      await deleteDoc(doc(db, 'colaboradores', colaboradorId));
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Colaboradores</h1>
          <p className="text-gray-600 mt-1">Gerencie todos os colaboradores da empresa</p>
        </div>
        
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger asChild>
            <Button className="bg-versys-primary hover:bg-versys-secondary">
              <Plus className="h-4 w-4 mr-2" />
              Novo Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Colaborador</DialogTitle>
              <DialogDescription>
                Preencha as informações do novo colaborador. Uma conta de administrador será criada automaticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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
                <div className="flex gap-2">
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
                <p className="text-xs text-gray-500">
                  Uma senha temporária será fornecida ao colaborador. Ele deverá criar uma nova senha no primeiro acesso.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogAberto(false)} disabled={criandoColaborador}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCriarColaborador} 
                className="bg-versys-primary hover:bg-versys-secondary"
                disabled={criandoColaborador}
              >
                {criandoColaborador ? "Criando..." : "Criar Colaborador"}
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
                  placeholder="Buscar por nome ou email..."
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filtro-status">Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Colaboradores */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Colaboradores ({colaboradoresFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Projetos</TableHead>
                <TableHead>Admissão</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando colaboradores...
                  </TableCell>
                </TableRow>
              ) : colaboradoresFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
                    <TableCell>{getNivelBadge(colaborador.nivel)}</TableCell>
                    <TableCell>{getTipoBadge(colaborador.tipo)}</TableCell>
                    <TableCell>{getStatusBadge(colaborador.status)}</TableCell>
                    <TableCell>{colaborador.projetosAtivos}</TableCell>
                    <TableCell>{new Date(colaborador.dataAdmissao).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        {/* Botão Editar */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setColaboradorEditando({ ...colaborador });
                            setDialogEdicaoAberto(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        {/* Botão de Status */}
                        {colaborador.status === 'ativo' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAlterarStatus(colaborador.id, 'suspenso')}
                            className="text-orange-600 border-orange-600 hover:bg-orange-50"
                            title="Suspender colaborador"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAlterarStatus(colaborador.id, 'ativo')}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            title="Ativar colaborador"
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
                              disabled={colaborador.projetosAtivos > 0}
                              title={colaborador.projetosAtivos > 0 ? 'Não é possível deletar colaborador com projetos ativos' : 'Deletar colaborador'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Colaborador</DialogTitle>
            <DialogDescription>
              Altere as informações do colaborador
            </DialogDescription>
          </DialogHeader>
          {colaboradorEditando && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
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
                    onChange={(e) => setColaboradorEditando({...colaboradorEditando, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setColaboradorEditando(null);
              setDialogEdicaoAberto(false);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleEditarColaborador} className="bg-versys-primary hover:bg-versys-secondary">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Colaboradores; 