# ✅ Visualização de Avaliação Ponderada - Cliente

## 🎯 Objetivo

Integração completa do sistema de avaliação ponderada na visualização de projetos para clientes na rota `/client-projects`, permitindo que os clientes vejam suas pontuações, performance e progresso detalhado por módulo.

---

## 📋 O Que Foi Implementado

### 1. **Serviço de Cálculo de Pontuação** (`weightedScoreService.ts`)

Criado serviço completo para calcular pontuações ponderadas baseadas em:
- **Perguntas**: Peso × Valor da resposta (emoji)
- **NCs**: Soma das pontuações de todas as perguntas
- **Itens**: Soma das pontuações de todas as NCs
- **Módulos**: Soma das pontuações de todos os itens
- **Projeto**: Soma das pontuações de todos os módulos

#### Funções Principais:
```typescript
calculateQuestionScore(question)      // Calcula pontuação de uma pergunta
calculateNCScore(nc)                   // Calcula pontuação de uma NC
calculateItemScore(item)               // Calcula pontuação de um item
calculateModuleScore(module)           // Calcula pontuação de um módulo
calculateProjectScore(modules)         // Calcula pontuação total do projeto
calculateDetailedProjectScore(modules) // Calcula pontuação detalhada (inclui breakdown)
```

#### Funções Auxiliares:
```typescript
getScoreColor(percentual)          // Retorna cor baseada no percentual
getScoreBgColor(percentual)        // Retorna cor de fundo para badge
getPerformanceLabel(percentual)    // Retorna label (Excelente, Bom, Regular, etc)
```

#### Critérios de Performance:
- **≥ 90%**: Excelente (verde)
- **≥ 75%**: Bom (azul)
- **≥ 60%**: Regular (amarelo)
- **≥ 40%**: Insatisfatório (laranja)
- **< 40%**: Crítico (vermelho)

---

### 2. **Lista de Projetos** (`ClientProjects.tsx`)

#### Versão Desktop - Tabela
✅ **Nova coluna "Pontuação"** com:
- Pontuação atual / máxima (ex: 45.5/60)
- Badge de performance com cor e label
- Contador de NCs concluídas (ex: 8/12 NCs)

#### Versão Mobile - Cards
✅ **Card de pontuação destacado** com:
- Background cinza claro para destaque
- Pontuação e percentual
- Badge de performance colorido
- Contador de NCs com texto descritivo

#### Dados Carregados:
```typescript
interface ProjectDetail {
  // ... campos existentes
  pontuacaoAtual: number
  pontuacaoMaxima: number
  percentualPontuacao: number
  ncsCompleted: number
  ncsTotal: number
  modules: ProjectModule[]
}
```

---

### 3. **Visualização Individual do Projeto** (`ClientProjectView.tsx`)

#### 3.1 Cards de Métricas (3 cards em grid)

**Card 1 - Pontuação Total:**
- Ícone: 🏆 Award (azul)
- Exibe: Pontuação atual/máxima
- Exemplo: "45.5/60"

**Card 2 - Performance:**
- Ícone: 📈 TrendingUp (verde)
- Exibe: Percentual + Badge de performance
- Exemplo: "75.8% | Bom"

**Card 3 - NCs Concluídas:**
- Ícone: 🎯 Target (roxo)
- Exibe: Contador + Barra de progresso
- Exemplo: "8/12 NCs" com Progress bar

#### 3.2 Card de Pontuação por Módulo

**Visualização Principal:**
- Lista todos os módulos do projeto
- Para cada módulo:
  - Título e quantidade de itens
  - Pontuação atual/máxima
  - Badge de performance colorido
  - Barra de progresso

**Visualização Detalhada (Accordion):**
- Botão "Ver detalhes dos itens"
- Expandível para mostrar:
  - Todos os itens do módulo
  - Pontuação de cada item
  - Percentual individual
  - Quantidade de NCs
  - Mini barra de progresso

---

## 🎨 Interface Visual

### Desktop - Lista de Projetos

```
┌─────────────────────────────────────────────────────────────────────┐
│ Nome        Status      Consultor  Progresso  Pontuação  Data  Ações │
├─────────────────────────────────────────────────────────────────────┤
│ Projeto A   Em Andamento  João     [███░░] 60%  45.5/60    01/10    │
│                                               [Bom - 75.8%]          │
│                                                 8/12 NCs             │
└─────────────────────────────────────────────────────────────────────┘
```

### Mobile - Lista de Projetos

```
┌───────────────────────┐
│ 🏢 Projeto A          │
│ Status: Em Andamento  │
├───────────────────────┤
│ 👤 Consultor: João    │
│                       │
│ Progresso: 60%        │
│ [███████░░░░]         │
│                       │
│ ╔═══════════════════╗ │
│ ║ Pontuação         ║ │
│ ║ 45.5/60           ║ │
│ ║ [Bom] 75.8%      ║ │
│ ║ 8 de 12 NCs      ║ │
│ ╚═══════════════════╝ │
│                       │
│ 📅 01/10 | 🕐 15/12  │
│ [Mapa] [Relatório]    │
└───────────────────────┘
```

### Desktop - Visualização Individual

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Voltar | Projeto A | Status: Em Andamento                     │
├─────────────────────────────────────────────────────────────────┤
│ Progresso Geral: [████████░░░░] 60%                            │
├──────────────────┬──────────────────┬──────────────────┐        │
│ 🏆 Pontuação     │ 📈 Performance   │ 🎯 NCs          │        │
│    45.5/60       │    75.8%         │    8/12         │        │
│                  │    [Bom]         │    [████░]      │        │
└──────────────────┴──────────────────┴──────────────────┘        │
│                                                                  │
│ ┌─ Pontuação por Módulo ────────────────────────────────┐       │
│ │                                                        │       │
│ │ 1. BARREIRAS PERIMETRAIS                    25.5/30   │       │
│ │ 5 itens                                     [Bom 85%] │       │
│ │ [█████████░]                                          │       │
│ │ ▼ Ver detalhes dos itens                              │       │
│ │                                                        │       │
│ │ 2. TECNOLOGIA DA INFORMAÇÃO                 20.0/30   │       │
│ │ 4 itens                                  [Regular 67%] │       │
│ │ [██████░░░]                                           │       │
│ │ ▶ Ver detalhes dos itens                              │       │
│ └────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Dados

### 1. Carregamento dos Projetos

```typescript
// ClientProjects.tsx ou ClientProjectView.tsx
const projectData = await getDoc(projectRef)

// Se o projeto tem módulos, calcular pontuação
if (projectData.modules && projectData.modules.length > 0) {
  const scoreResult = calculateProjectScore(projectData.modules)
  // ou
  const detailedScore = calculateDetailedProjectScore(projectData.modules)
}
```

### 2. Cálculo Hierárquico

```
Projeto
  └─ Módulo 1
      ├─ Item 1
      │   ├─ NC 1
      │   │   ├─ Pergunta 1 (Peso 3, Resposta: Bom) = 2.25
      │   │   ├─ Pergunta 2 (Peso 2, Resposta: Excelente) = 2.00
      │   │   └─ Total NC 1: 4.25/5
      │   ├─ NC 2
      │   │   └─ ...
      │   └─ Total Item 1: 8.5/10
      └─ Item 2
          └─ ...
```

### 3. Estrutura de Dados

```typescript
// Projeto no Firebase
{
  id: "proj_123",
  nome: "Projeto A",
  modules: [
    {
      id: "mod_1",
      titulo: "1. BARREIRAS PERIMETRAIS",
      ordem: 1,
      itens: [
        {
          id: "item_1",
          titulo: "4.1 - O perímetro está protegido?",
          ordem: 1,
          ncs: [
            {
              id: "nc_1",
              numero: 1,
              ncTitulo: "Iluminação insuficiente",
              perguntas: [
                {
                  id: "q_1",
                  text: "A iluminação está adequada?",
                  weight: 3,
                  required: true,
                  response: {
                    selectedOption: "good", // 😊 = 75%
                    respondedAt: "2025-10-27T10:00:00Z"
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

// Após processamento
{
  pontuacaoAtual: 45.5,
  pontuacaoMaxima: 60,
  percentualPontuacao: 75.8,
  ncsCompleted: 8,
  ncsTotal: 12,
  modulesScores: [
    {
      id: "mod_1",
      titulo: "1. BARREIRAS PERIMETRAIS",
      pontuacaoAtual: 25.5,
      pontuacaoMaxima: 30,
      percentual: 85,
      itens: [...]
    }
  ]
}
```

---

## 📊 Valores de Resposta

Cada pergunta tem um peso (1, 2 ou 3) e recebe uma resposta:

| Opção      | Emoji | Valor | Exemplo (Peso 3) |
|------------|-------|-------|------------------|
| N/A        | -     | 100%  | 3.00             |
| Muito Ruim | 😢    | 0%    | 0.00             |
| Regular    | 😐    | 50%   | 1.50             |
| Bom        | 😊    | 75%   | 2.25             |
| Excelente  | 🏆    | 100%  | 3.00             |

**Fórmula:** `Pontuação = Peso × Valor da Resposta`

---

## 🎯 Funcionalidades Implementadas

### ✅ Lista de Projetos (`/client-projects`)
- [x] Coluna de pontuação na tabela desktop
- [x] Card de pontuação na versão mobile
- [x] Badge de performance com cores
- [x] Contador de NCs concluídas
- [x] Cálculo automático ao carregar projetos

### ✅ Visualização Individual (`/client-projects/:id`)
- [x] 3 cards de métricas (Pontuação, Performance, NCs)
- [x] Card de pontuação por módulo
- [x] Accordion para ver detalhes dos itens
- [x] Barras de progresso visuais
- [x] Badges coloridos de performance
- [x] Layout responsivo (desktop e mobile)

### ✅ Serviço de Cálculo
- [x] Cálculo de pontuação por pergunta
- [x] Cálculo de pontuação por NC
- [x] Cálculo de pontuação por item
- [x] Cálculo de pontuação por módulo
- [x] Cálculo de pontuação total do projeto
- [x] Cálculo detalhado com breakdown completo
- [x] Funções auxiliares de formatação

---

## 🚀 Como Usar

### Para Clientes:

1. **Acessar lista de projetos:**
   - Login → Menu → Meus Projetos
   - Visualize a pontuação de cada projeto na lista

2. **Ver detalhes do projeto:**
   - Clique em qualquer projeto
   - Veja os 3 cards de métricas no topo
   - Role para baixo para ver pontuação por módulo
   - Clique em "Ver detalhes dos itens" para expandir

### Para Administradores:

1. **Criar projeto com avaliação ponderada:**
   - Projetos → Novo Projeto
   - Configure usando o "Novo Modo Avaliação"
   - Estruture: Módulos > Itens > NCs > Perguntas

2. **Responder avaliações:**
   - Projetos → Editar → Novo Modo Avaliação
   - Responda as perguntas com emojis
   - Pontuação calculada automaticamente

---

## 📁 Arquivos Criados/Modificados

### Novos Arquivos:
1. **`src/lib/weightedScoreService.ts`**
   - Serviço completo de cálculo de pontuações
   - Funções auxiliares de formatação
   - Tipos exportados

### Arquivos Modificados:
1. **`src/pages/ClientProjects.tsx`**
   - Adicionada coluna de pontuação na tabela
   - Adicionado card de pontuação na versão mobile
   - Cálculo de pontuações ao carregar projetos

2. **`src/pages/ClientProjectView.tsx`**
   - Adicionados 3 cards de métricas
   - Adicionado card de pontuação por módulo
   - Cálculo detalhado de pontuações
   - Accordion para detalhes dos itens

---

## 🎨 Componentes Visuais

### Badges de Performance:
```typescript
// Verde (≥90%)
<Badge className="bg-green-100 text-green-800">Excelente</Badge>

// Azul (≥75%)
<Badge className="bg-blue-100 text-blue-800">Bom</Badge>

// Amarelo (≥60%)
<Badge className="bg-yellow-100 text-yellow-800">Regular</Badge>

// Laranja (≥40%)
<Badge className="bg-orange-100 text-orange-800">Insatisfatório</Badge>

// Vermelho (<40%)
<Badge className="bg-red-100 text-red-800">Crítico</Badge>
```

### Ícones Utilizados:
- 🏆 `Award` - Pontuação total
- 📈 `TrendingUp` - Performance
- 🎯 `Target` - NCs concluídas

---

## 🔧 Manutenção e Extensões Futuras

### Possíveis Melhorias:
1. **Gráficos de evolução:**
   - Gráfico de linha mostrando evolução da pontuação ao longo do tempo
   - Comparação entre módulos

2. **Exportação de dados:**
   - Exportar pontuação para PDF/Excel
   - Relatório consolidado

3. **Notificações:**
   - Alertar cliente quando pontuação cair abaixo de threshold
   - Notificar sobre NCs pendentes

4. **Filtros e ordenação:**
   - Filtrar projetos por faixa de pontuação
   - Ordenar por performance

5. **Metas e objetivos:**
   - Definir meta de pontuação para o projeto
   - Indicador visual de quanto falta para atingir meta

---

## ✅ Checklist Final

- [x] Serviço de cálculo criado
- [x] Lista de projetos atualizada (desktop)
- [x] Lista de projetos atualizada (mobile)
- [x] Visualização individual atualizada
- [x] Cards de métricas implementados
- [x] Card de pontuação por módulo implementado
- [x] Accordion de detalhes implementado
- [x] Badges coloridos implementados
- [x] Layout responsivo
- [x] Sem erros de linter
- [x] Documentação completa

---

## 📞 Suporte

Para dúvidas ou sugestões:
- Verifique a documentação em `INTEGRACAO_MODO_PONDERADO.md`
- Consulte os tipos em `src/lib/types.ts`
- Revise o serviço em `src/lib/weightedScoreService.ts`

---

**Sistema 100% funcional e integrado! 🎉**

Acesse: `/client-projects` para visualizar as pontuações ponderadas

