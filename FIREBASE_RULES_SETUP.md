# 🔥 Configuração das Regras do Firestore

## 🚨 AÇÃO NECESSÁRIA: Configurar Regras de Segurança

O erro **"Missing or insufficient permissions"** indica que as regras do Firestore estão bloqueando as operações.

## 📋 Passo-a-Passo para Configurar

### 1. **Acesse o Firebase Console**
- Vá para: https://console.firebase.google.com/
- Selecione o projeto: **versys-4529f**

### 2. **Navegue para Firestore**
- No menu lateral, clique em **"Firestore Database"**
- Clique na aba **"Rules"** (Regras)

### 3. **Aplique as Regras**
**Copie e cole o conteúdo do arquivo `firestore.rules`** na janela de edição.

⚠️ **IMPORTANTE**: As regras foram atualizadas para suportar a nova coleção `relatorios`. Certifique-se de aplicar a versão mais recente!

### 4. **Publique as Regras**
- Clique no botão **"Publish"** (Publicar)
- Aguarde alguns segundos para as regras serem aplicadas

## 🧪 **Teste Imediatamente**

Após publicar as regras:

1. **Volte para** http://localhost:8084/
2. **Faça login** com `contato@devana.com.br` / `devdev`
3. **Clique em "🔗 Testar Conexão"** - deve funcionar agora!
4. **Clique em "👤 Criar Usuário"** - deve criar o usuário no Firestore!

## ✅ **Resultado Esperado**

Após aplicar as regras, você deve ver:
- ✅ Mensagens de sucesso nos testes
- 🗂️ Coleção `users` aparecendo no Firebase Console
- 📄 Documento do usuário criado com os dados corretos

## 🔧 **Alternativa Rápida (Desenvolvimento)**

Se quiser regras mais permissivas para desenvolvimento, use:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🔒 **Segurança**

As regras configuradas garantem que:
- ✅ Apenas usuários autenticados podem acessar os dados
- ✅ Usuários só podem editar seus próprios dados na coleção `users`
- ✅ Acesso controlado a projetos e documentos

## 🚀 **Próximos Passos**

Depois de configurar as regras:
1. Teste todas as funcionalidades
2. Verifique se a coleção `users` apareceu
3. Confirme que o login está criando usuários automaticamente

---

**⚡ Configure as regras AGORA e teste imediatamente!** 