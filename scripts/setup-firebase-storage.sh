#!/bin/bash

echo "🔧 Configurando Firebase Storage..."

# Verificar se o Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "📦 Instalando Firebase CLI..."
    npm install firebase-tools
fi

# Fazer login no Firebase se necessário
echo "🔑 Verificando autenticação..."
npx firebase login

# Tentar fazer deploy das regras do Storage
echo "🚀 Fazendo deploy das regras do Storage..."
npx firebase deploy --only storage

if [ $? -eq 0 ]; then
    echo "✅ Firebase Storage configurado com sucesso!"
else
    echo "❌ Erro ao configurar Firebase Storage."
    echo "📋 Siga as instruções em FIREBASE_STORAGE_SETUP.md"
    echo "🔗 Acesse: https://console.firebase.google.com/project/versys-4529f/storage"
fi

echo "🎉 Configuração concluída!" 