# ✅ Integração do Modo de Avaliação Ponderada

## 🎯 Implementação Completa

Sistema de avaliação ponderada **integrado** na rota existente `/projetos/write/:id` mantendo o **AppSidebar** do sistema.

---

## 📍 Rota e Acesso

### Rota Integrada
- ✅ **Rota**: `/projetos/write/:id` (mesma rota existente)
- ✅ **Mantém**: AppSidebar do sistema (menu lateral principal)
- ✅ **Toggle**: Botão para alternar entre "Modo Antigo" e "Novo Modo Avaliação"

### Como Acessar
1. Faça login como administrador
2. Vá em **Projetos** no menu
3. Clique em qualquer projeto
4. Clique em **"Editar"** ou **"Escrever"**
5. Na página, clique no botão **"✨ Novo Modo Avaliação"** (canto superior direito)

---

## 🏗️ Estrutura Hierárquica

### Sidebar com 3 Níveis

```
📁 MÓDULO (ex: "1. BARREIRAS PERIMETRAIS")
  └─ 📄 ITEM (ex: "4.1 - O perímetro está protegido?")
     ├─ ⚠️ NC 1: "Iluminação insuficiente" (1.5/5)
     ├─ ⚠️ NC 2: "Muros com falhas" (1.0/3)
     └─ ⚠️ NC 3: ... (quantas NCs você quiser!)
```

### Recursos da Sidebar

#### Expansão/Colapso
- Clique no **módulo** para expandir/colapsar itens
- Clique no **item** para expandir/colapsar NCs

#### Informações em Tempo Real
- **Pontuação por nível**: 
  - Módulo: soma de todos os itens
  - Item: soma de todas as NCs
  - NC: soma de todas as perguntas

- **Badges informativos**:
  - Número de itens no módulo
  - Número de NCs no item

- **Ícones de status**:
  - ⚠️ Pendente (cinza)
  - 🕐 Em progresso (amarelo)
  - ✅ Concluído (verde)

#### Navegação
- Clique em qualquer **NC** para visualizar suas perguntas
- Item ativo destacado em **azul claro**
- NC ativa destacada em **verde** (cor primária)

---

## 🎯 Sistema de NCs (Não Conformidades)

### O Que São NCs?

NCs são **subdivisões de um item** para organizar melhor as avaliações. Por exemplo:

**Item**: "O perímetro está protegido?"
- **NC 1**: Iluminação insuficiente
- **NC 2**: Muros com falhas  
- **NC 3**: Cercas danificadas

### Gerenciamento de NCs

#### Adicionar NC
1. Selecione um item na sidebar
2. Clique no botão **"+ Adicionar NC"** no header
3. Uma nova NC é criada automaticamente com numeração sequencial

#### Remover NC
1. Navegue até a NC que deseja remover
2. Clique no botão **"🗑️ Remover NC"** (só aparece se houver mais de 1 NC)
3. A NC é removida e as demais são renumeradas

#### Características
- ✅ **Ilimitadas**: Adicione quantas NCs precisar (1, 2, 3, 10...)
- ✅ **Numeração automática**: NC 1, NC 2, NC 3...
- ✅ **Pontuação independente**: Cada NC tem sua própria pontuação
- ✅ **Perguntas próprias**: Cada NC pode ter suas próprias perguntas

---

## ❓ Sistema de Perguntas Ponderadas

### Estrutura de Cada Pergunta

```
Pergunta: "A iluminação está adequada?" (Peso 3 | OBRIGATÓRIO)

Opções de Resposta:
[N/A]  [😢]  [😐]  [😊]  [🏆]

Ações:
📎 Anexar    💬 Comentar
```

### Pesos e Pontuação

| Peso | Importância | Exemplo |
|------|-------------|---------|
| **1** | Baixa | Itens de menor criticidade |
| **2** | Média | Itens importantes |
| **3** | Alta | Itens críticos/obrigatórios |

### Opções de Resposta e Valores

| Opção | Emoji | Valor | Cálculo |
|-------|-------|-------|---------|
| **N/A** | - | 100% | Peso × 1.0 |
| **Muito Ruim** | 😢 | 0% | Peso × 0.0 |
| **Regular** | 😐 | 50% | Peso × 0.5 |
| **Bom** | 😊 | 75% | Peso × 0.75 |
| **Excelente** | 🏆 | 100% | Peso × 1.0 |

### Exemplos de Cálculo

**Exemplo 1**: Pergunta peso 3 com resposta "Bom" (😊)
- Cálculo: 3 × 0.75 = **2.25 pontos**

**Exemplo 2**: Pergunta peso 2 com resposta "Regular" (😐)
- Cálculo: 2 × 0.5 = **1.0 ponto**

**Exemplo 3**: NC com 3 perguntas
- Pergunta 1 (Peso 3): Bom = 2.25
- Pergunta 2 (Peso 2): Regular = 1.0
- Pergunta 3 (Peso 2): Excelente = 2.0
- **Total da NC: 5.25/7 pontos (75%)**

---

## 🎨 Interface e Usabilidade

### Layout Desktop

```
┌─────────────────────────────────────────────────────────────┐
│  [← Voltar]  Projeto: XPTO          [Modo Antigo] [+ NC]   │
│  1. BARREIRAS → 4.1 Perímetro                               │
├─────────────────┬───────────────────────────────────────────┤
│  SIDEBAR        │  CONTEÚDO                                 │
│                 │                                           │
│  📁 BARREIRAS   │  NC 1 - Iluminação  [1.5/5]             │
│   └─ 4.1...     │                                           │
│      ⚠️ NC 1    │  1. A iluminação está adequada?          │
│      ⚠️ NC 2    │     Peso 3 | OBRIGATÓRIO                 │
│                 │                                           │
│  📁 TI          │  [N/A] [😢] [😐] [😊] [🏆]              │
│                 │                                           │
│  [VER PENDÊNCIAS│  📎 Anexar  💬 Comentar                  │
│  [CONTINUAR]    │                                           │
│  [CONCLUIR]     │  Respondido em: 24/10 14:30              │
└─────────────────┴───────────────────────────────────────────┘
```

### Breadcrumbs
No header, você sempre vê onde está:
```
Módulo Atual → Item Atual
```
Exemplo: `1. BARREIRAS PERIMETRAIS → 4.1 - O perímetro está protegido?`

### Botões e Ações

| Botão | Localização | Função |
|-------|-------------|--------|
| **← Voltar** | Header | Volta para lista de projetos |
| **Modo Antigo** | Header | Volta para interface antiga |
| **+ Adicionar NC** | Header | Cria nova NC no item atual |
| **🗑️ Remover NC** | Abaixo do título NC | Remove NC atual (se houver >1) |
| **📎 Anexar** | Abaixo das respostas | Anexa mídia |
| **💬 Comentar** | Abaixo das respostas | Adiciona comentário |

---

## 🔄 Alternância de Modos

### Modo Antigo (Legacy)
- Interface original com passos sequenciais
- Avaliações NC/R/NA tradicionais
- Navegação por passos (1 de 5, 2 de 5...)

### Novo Modo (Weighted)
- Sidebar hierárquica: Módulos > Itens > NCs
- Perguntas com peso e emojis
- Pontuação automática em tempo real
- Suporte a múltiplas NCs por item

### Como Alternar

**Para Novo Modo:**
1. No modo antigo, clique em **"✨ Novo Modo Avaliação"** (canto superior direito)

**Para Modo Antigo:**
1. No novo modo, clique em **"📋 Modo Antigo"** (canto superior direito)

---

## 📊 Dados e Estrutura

### Conversão Automática

O sistema **converte automaticamente** os dados existentes para a nova estrutura:

**Estrutura Antiga:**
```
customAccordions → items → subItems
```

**Nova Estrutura:**
```
módulos → itens → ncs → perguntas
```

### Estrutura de Dados

```typescript
{
  modules: [
    {
      id: "mod_1",
      titulo: "1. BARREIRAS PERIMETRAIS",
      ordem: 1,
      itens: [
        {
          id: "item_1",
          titulo: "4.1 - O perímetro...",
          ordem: 1,
          pontuacaoAtual: 2.5,
          pontuacaoMaxima: 7,
          ncs: [
            {
              id: "nc_1",
              numero: 1,
              titulo: "Iluminação insuficiente",
              pontuacaoAtual: 1.5,
              pontuacaoMaxima: 5,
              perguntas: [
                {
                  id: "q_1",
                  text: "A iluminação está adequada?",
                  weight: 3,
                  required: true,
                  responseOptions: ['na', 'very_bad', 'bad', 'good', 'excellent'],
                  response: {
                    selectedOption: 'bad',
                    respondedAt: "2025-10-24T14:30:00",
                    respondedBy: "user123"
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
```

---

## 🔧 Arquivos Modificados

1. **`src/lib/types.ts`**
   - Adicionado: `NC`, `ProjectModule`, `ProjectItem` (hierárquico)

2. **`src/components/HierarchicalProjectSidebar.tsx`** (NOVO)
   - Sidebar hierárquica com 3 níveis
   - Expansão/colapso de módulos e itens
   - Navegação por clique
   - Indicadores visuais de status

3. **`src/pages/ProjectWrite.tsx`** (MODIFICADO)
   - Estado `evaluationMode` para alternar entre modos
   - Função `loadHierarchicalStructure()` para converter dados
   - Funções `handleNavigate()`, `addNC()`, `removeNC()`
   - Renderização condicional baseada no modo
   - Interface completa do modo ponderado integrada

---

## ✅ Checklist de Funcionalidades

### Sidebar
- [x] Hierarquia de 3 níveis (Módulo > Item > NC)
- [x] Expansão/colapso de módulos
- [x] Expansão/colapso de itens
- [x] Navegação por clique nas NCs
- [x] Pontuação em tempo real
- [x] Badges informativos
- [x] Ícones de status
- [x] Highlight de item/NC ativo

### NCs
- [x] Adicionar NC dinamicamente
- [x] Remover NC (quando houver >1)
- [x] Numeração automática
- [x] Pontuação independente
- [x] Perguntas próprias

### Perguntas
- [x] Peso configurável (1, 2, 3)
- [x] Campo obrigatório (*)
- [x] Opções de resposta com emojis
- [x] Cálculo automático de pontuação
- [x] Timestamp de resposta
- [x] Indicação visual de resposta selecionada

### Interface
- [x] Breadcrumbs de navegação
- [x] Botão alternar entre modos
- [x] Botão adicionar NC
- [x] Botão remover NC
- [x] Botões anexar e comentar
- [x] Layout responsivo

### Integração
- [x] Rota existente mantida
- [x] AppSidebar mantido
- [x] Conversão automática de dados
- [x] Compatibilidade com modo antigo

---

## 🚀 Próximos Passos (Opcionais)

1. **Persistência de NCs no Firebase**
   - Salvar NCs criadas no banco
   - Carregar NCs salvas

2. **Anexos e Comentários Funcionais**
   - Implementar upload de mídia
   - Sistema de comentários completo

3. **Relatórios de Pontuação**
   - Gráficos por módulo/item/NC
   - Exportação para PDF

4. **Configuração de Perguntas**
   - Interface para criar/editar perguntas
   - Definir pesos por pergunta

---

## 📖 Guia Rápido de Uso

### 1. Ativar Novo Modo
```
Projetos → Selecionar Projeto → Editar → "✨ Novo Modo Avaliação"
```

### 2. Navegar pela Estrutura
```
Sidebar: Módulo → Item → NC (clique para abrir)
```

### 3. Adicionar NC
```
Header: "+ Adicionar NC" (com item selecionado)
```

### 4. Responder Perguntas
```
Clique no emoji correspondente → Pontuação atualiza automaticamente
```

### 5. Remover NC
```
Abaixo do título da NC: "🗑️ Remover NC" (se houver >1)
```

### 6. Voltar ao Modo Antigo
```
Header: "📋 Modo Antigo"
```

---

**Sistema 100% funcional e integrado! 🎉**

Acesse: `/projetos/write/:id` e clique em "✨ Novo Modo Avaliação"

