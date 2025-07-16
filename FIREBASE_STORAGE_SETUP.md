# Configuração do Firebase Storage

## Problema identificado
O erro de CORS que está ocorrendo é devido ao Firebase Storage não estar completamente configurado no projeto.

## Solução

### 1. Configurar Firebase Storage no Console

1. Acesse o [Console do Firebase](https://console.firebase.google.com/project/versys-4529f/storage)
2. Clique em "Get Started" para inicializar o Firebase Storage
3. Escolha as configurações de segurança (pode começar com modo de teste)
4. Aguarde a criação do bucket

### 2. Configurar regras de segurança

Após configurar o Storage, as regras no arquivo `storage.rules` serão aplicadas automaticamente:

```rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Regras para imagens de adequação - apenas usuários autenticados podem fazer upload
    match /adequacy-images/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
    
    // Regras gerais para outros arquivos
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Fazer deploy das regras

Após configurar o Storage no console, execute:

```bash
npx firebase deploy --only storage
```

## Melhorias implementadas no código

1. **Sanitização de nomes de arquivos**: Caracteres especiais são removidos
2. **Melhor tratamento de erros**: Mensagens mais específicas para problemas de upload
3. **Service Worker atualizado**: Não interfere mais com as requisições do Firebase Storage
4. **Nomes de arquivos únicos**: Evita conflitos com timestamp + index

## Teste após configuração

Após configurar o Storage e fazer deploy das regras:

1. Faça login na aplicação
2. Tente anexar uma imagem em uma adequação
3. Verifique se o upload funciona corretamente

Se ainda houver problemas, verifique:
- Se o usuário está autenticado
- Se as regras foram aplicadas corretamente
- Se não há bloqueios de rede/firewall 