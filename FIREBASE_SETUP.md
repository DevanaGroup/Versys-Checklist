# Configuração do Firebase - VERSYS Port Security Hub

## Visão Geral

O Firebase foi integrado ao projeto VERSYS Port Security Hub para fornecer:
- Autenticação de usuários
- Login com Google
- Gerenciamento de estado de usuário
- Banco de dados em tempo real (futuro)
- Hospedagem (futuro)

## Arquivos Principais

### 1. `src/lib/firebase.ts`
Contém a configuração principal do Firebase com:
- Inicialização do app
- Configuração de Analytics
- Exportação dos serviços (Auth, Firestore, Storage)

### 2. `src/hooks/useAuth.tsx`
Hook personalizado que fornece:
- `signIn(email, password)` - Login com email/senha
- `signUp(email, password)` - Registro de nova conta
- `signInWithGoogle()` - Login com Google
- `logout()` - Logout do usuário
- `user` - Estado atual do usuário
- `loading` - Estado de carregamento

### 3. `src/contexts/AuthContext.tsx`
Contexto React que gerencia:
- Estado global de autenticação
- Compatibilidade com sistema atual (localStorage)
- Dados estendidos do usuário

## Como Usar

### Na página de Login

O sistema usa exclusivamente o Firebase Authentication para todos os logins. Não há mais sistema local simulado.

### Credenciais do Administrador

O sistema agora usa exclusivamente o Firebase Authentication. 

**Administrador Principal:**
- Email: contato@devana.com.br
- Senha: devdev
- Nome: Administrador DEVANA
- UID: nVMgqkkvHMgUx8kpl80LQAXA6nz2

### Login com Firebase

O sistema está configurado para usar apenas Firebase Authentication:
1. Use as credenciais do administrador acima
2. Ou faça login com Google
3. Para criar novos usuários, use o Firebase Console ou implemente registro

## Configuração do Firebase Console

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto "versys-4529f"
3. Configure Authentication:
   - Ative Email/Password
   - Ative Google Sign-in
4. Configure Firestore Database (opcional)
5. Configure Storage (opcional)

## Funcionalidades Disponíveis

### ✅ Implementado
- [x] Configuração básica do Firebase
- [x] Autenticação com email/senha
- [x] Login com Google
- [x] Hook useAuth personalizado
- [x] Contexto de autenticação
- [x] Proteção de rotas
- [x] Usuário administrador criado
- [x] Remoção do sistema local simulado

### 🔄 Em Desenvolvimento
- [ ] Perfis de usuário no Firestore
- [ ] Gerenciamento de permissões
- [ ] Recuperação de senha
- [ ] Dados de projetos no Firestore

### 🚀 Futuras Melhorias
- [ ] Autenticação com outros provedores
- [ ] Notificações push
- [ ] Sincronização offline
- [ ] Analytics detalhados

## Estrutura de Dados (Futuro)

```typescript
// Estrutura planejada para o Firestore
interface User {
  uid: string;
  email: string;
  displayName: string;
  type: 'admin' | 'client';
  company?: string;
  projects: string[];
  createdAt: Timestamp;
  lastLogin: Timestamp;
}

interface Project {
  id: string;
  name: string;
  client: string;
  status: 'active' | 'completed' | 'paused';
  createdBy: string;
  createdAt: Timestamp;
  documents: Document[];
}
```

## Segurança

- As credenciais do Firebase estão no código (para desenvolvimento)
- Em produção, use variáveis de ambiente
- Configure regras de segurança no Firestore
- Implemente validação no backend

## Suporte

Para questões sobre o Firebase no projeto, consulte:
- [Documentação do Firebase](https://firebase.google.com/docs)
- [Guia de Autenticação](https://firebase.google.com/docs/auth)
- [Configuração Web](https://firebase.google.com/docs/web/setup) 