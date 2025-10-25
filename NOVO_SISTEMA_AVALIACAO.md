# 🎯 Novo Sistema de Avaliação com Perguntas Ponderadas

## 📋 Visão Geral

Implementamos um sistema completo de avaliação baseado em perguntas ponderadas, com interface visual moderna usando emojis, cálculo automático de pontuação e suporte tanto para desktop quanto para mobile.

## ✨ Principais Funcionalidades

### 1. **Perguntas com Peso**
- Cada pergunta tem um peso de 1 a 3
- Peso 1: Baixa importância
- Peso 2: Média importância  
- Peso 3: Alta importância
- A pontuação final leva em conta o peso de cada resposta

### 2. **Opções de Resposta Visual com Emojis**
- **N/A**: Não aplicável (conta como 100% do peso)
- **😢 Muito Ruim**: 0% do peso (pontuação zero)
- **😐 Regular**: 50% do peso 
- **😊 Bom**: 75% do peso
- **🏆 Excelente**: 100% do peso

### 3. **Cálculo Automático de Pontuação**
- Pontuação por pergunta = Peso × Porcentagem da resposta
- Exemplo: Pergunta peso 3 com resposta "Bom" (75%) = 2.25 pontos
- Total da seção = Soma de todas as pontuações
- Percentual final = (Pontos obtidos / Pontos máximos) × 100%

### 4. **Interface Desktop**
- **Barra lateral** com navegação entre seções
- Visualização de pontuação de cada seção em tempo real
- Layout de duas colunas: navegação + conteúdo
- Botões de ação: "Ver Pendências", "Continuar Depois", "Concluir Checklist"

### 5. **Interface Mobile**
- Uma pergunta por página
- Navegação com botões "Anterior" e "Próximo"
- Indicador de progresso (ex: "2 de 5")
- Layout otimizado para telas pequenas

### 6. **Campos Obrigatórios**
- Perguntas podem ser marcadas como obrigatórias
- Indicação visual com asterisco (*) e badge "OBRIGATÓRIO"
- Validação antes de concluir a avaliação

### 7. **Anexos e Comentários**
- Suporte para anexar mídia (fotos, vídeos, documentos)
- Sistema de comentários para cada pergunta
- Geolocalização de fotos anexadas

### 8. **Timestamps de Resposta**
- Registro automático de data/hora de cada resposta
- Exibição de quando a pergunta foi respondida
- Rastreamento de quem respondeu

## 📁 Arquivos Criados/Modificados

### Novos Arquivos

1. **`src/lib/types.ts`** (modificado)
   - Novos tipos: `ResponseOption`, `QuestionResponse`, `WeightedQuestion`, `QuestionSection`, `WeightedEvaluation`
   - Constantes: `RESPONSE_VALUES`, `RESPONSE_LABELS`

2. **`src/components/WeightedEvaluationView.tsx`**
   - Componente principal de visualização de avaliação
   - Suporta modo desktop e mobile
   - Interface completa com emojis e pontuação

3. **`src/pages/Checklist.tsx`** (modificado)
   - Atualizado para criar checklists com perguntas ponderadas
   - Interface de criação/edição de perguntas
   - Seleção de peso, obrigatoriedade e opções de resposta

4. **`src/pages/WeightedEvaluationDemo.tsx`**
   - Página de demonstração do novo sistema
   - Exemplos práticos com dados mockados
   - Acesse em: `/weighted-evaluation-demo`

5. **`src/lib/weightedEvaluationService.ts`**
   - Serviço para gerenciar avaliações ponderadas no Firebase
   - Funções para criar, atualizar e calcular pontuações
   - Conversão de checklists para avaliações

## 🚀 Como Usar

### 1. Criar um Checklist com Perguntas Ponderadas

1. Acesse **Checklist** no menu
2. Clique em **"Novo Checklist"**
3. Preencha as informações básicas
4. Adicione **Seções/Tópicos**
5. Para cada seção, adicione **Perguntas**:
   - Digite o texto da pergunta
   - Selecione o **peso** (1, 2 ou 3)
   - Marque se é **obrigatória**
   - Escolha quais **opções de resposta** estarão disponíveis
6. Salve o checklist

### 2. Testar o Novo Sistema

1. Acesse: `/weighted-evaluation-demo` (após fazer login como admin)
2. Veja o sistema em ação com dados de exemplo
3. Teste as respostas e veja a pontuação mudar em tempo real
4. Experimente tanto no desktop quanto redimensionando para mobile

### 3. Integrar com Projetos (Próximos Passos)

O próximo passo será integrar este sistema com os projetos existentes, permitindo que:
- Projetos possam usar checklists ponderados
- Clientes respondam às avaliações
- Administradores vejam relatórios de pontuação

## 💡 Exemplos de Uso

### Exemplo 1: Auditoria de Segurança Portuária

**Seção: Barreiras Perimetrais**
- Pergunta 1 (Peso 3): "O perímetro está iluminado e protegido?"
  - Resposta: 🏆 Excelente = 3 pontos
- Pergunta 2 (Peso 2): "Há inspeções periódicas?"
  - Resposta: 😊 Bom = 1.5 pontos
- **Total da Seção: 4.5/5 pontos (90%)**

### Exemplo 2: Auditoria de Loja (Rotinas Diárias)

**Seção: Rotinas Diárias**
- Pergunta 1 (Peso 3): "Abertura no horário correto?"
  - Resposta: 😐 Regular = 1.5 pontos
- Pergunta 2 (Peso 2): "Vitrines limpas?"
  - Resposta: 😐 Regular = 1.0 ponto
- Pergunta 3 (Peso 2): "Chão limpo?"
  - Resposta: 🏆 Excelente = 2.0 pontos
- Pergunta 4 (Peso 3): "Mostruário organizado?"
  - Resposta: 😊 Bom = 2.25 pontos
- **Total da Seção: 6.75/10 pontos (67.5%)**

## 🎨 Interface Visual

### Desktop
```
┌─────────────────────────────────────────────────┐
│  SIDEBAR          │  CONTEÚDO PRINCIPAL         │
│                   │                             │
│  📄 Detalhes      │  1. BARREIRAS PERIMETRAIS   │
│                   │  Verificação da Integridade │
│  1. BARREIRAS ✓   │                             │
│     3.0/5         │  Pergunta 1.1 (Peso 3)      │
│                   │  O perímetro está...?       │
│  2. TI            │                             │
│     0/4           │  [N/A] [😢] [😐] [😊] [🏆] │
│                   │                             │
│  ✍️ VER PENDÊNCIAS│  📎 Anexar  💬 Comentar    │
│                   │                             │
│  [CONTINUAR]      │                             │
│  [CONCLUIR]       │  [← ANTERIOR] [PRÓXIMO →]  │
└─────────────────────────────────────────────────┘
```

### Mobile
```
┌───────────────────┐
│  Rotinas Diárias  │
│     11.5/15       │
├───────────────────┤
│                   │
│  Peso: 3 | OBR.   │
│                   │
│  As impressoras   │
│  estão            │
│  funcionando?     │
│                   │
│  [😢] [😐] [😊]  │
│       [🏆]        │
│                   │
│  📎 Mídia         │
│  💬 Comentário    │
│                   │
├───────────────────┤
│ [← ANTERIOR] 2/5  │
│         [PRÓXIMO→]│
└───────────────────┘
```

## 📊 Estrutura de Dados

### Checklist com Perguntas
```typescript
{
  id: "checklist_123",
  titulo: "Auditoria de Segurança",
  tipo: "checklist",
  topicos: [
    {
      id: "secao_1",
      titulo: "Barreiras Perimetrais",
      perguntas: [
        {
          id: "q_1",
          texto: "O perímetro está iluminado?",
          peso: 3,
          obrigatorio: true,
          opcoesResposta: ['na', 'very_bad', 'bad', 'good', 'excellent']
        }
      ]
    }
  ]
}
```

### Avaliação Respondida
```typescript
{
  id: "eval_123",
  projectId: "proj_456",
  sections: [
    {
      id: "secao_1",
      title: "Barreiras Perimetrais",
      currentScore: 4.5,
      totalPossibleScore: 5,
      questions: [
        {
          id: "q_1",
          text: "O perímetro está iluminado?",
          weight: 3,
          response: {
            selectedOption: 'excellent',
            respondedAt: "2025-10-23T14:30:00Z",
            respondedBy: "user_123"
          }
        }
      ]
    }
  ],
  totalScore: 4.5,
  maxScore: 5,
  progressPercentage: 90,
  status: 'in_progress'
}
```

## 🔄 Próximos Passos

1. ✅ **Tipos e estruturas** - CONCLUÍDO
2. ✅ **Componente de visualização** - CONCLUÍDO
3. ✅ **Interface de criação de checklists** - CONCLUÍDO
4. ✅ **Sistema de pontuação** - CONCLUÍDO
5. ✅ **Página de demonstração** - CONCLUÍDO
6. ⏳ **Integração com NewProject.tsx** - EM ANDAMENTO
7. ⏳ **Integração com ProjectWrite.tsx** - PENDENTE
8. ⏳ **Relatórios de pontuação** - PENDENTE
9. ⏳ **Exportação de dados** - PENDENTE

## 📞 Suporte

Para dúvidas ou sugestões sobre o novo sistema:
- Acesse a demonstração em `/weighted-evaluation-demo`
- Revise este documento
- Consulte os arquivos de tipos em `src/lib/types.ts`

---

**Desenvolvido para Versys Port Security Hub**
*Sistema de Avaliação Ponderada v1.0*

