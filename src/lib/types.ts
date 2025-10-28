// Tipos para relatórios

// Item individual do relatório (NC ou subItem)
export interface RelatorioItem {
  id: string; // ID único do item
  category: string;
  itemTitle: string;
  subItemId: string;
  subItemTitle: string;
  local: string;
  currentSituation: string;
  clientGuidance: string;
  responsible?: string;
  whatWasDone?: string;
  startDate?: string;
  endDate?: string;
  status: 'pending' | 'in_progress' | 'completed';
  evaluation: 'nc' | 'r' | 'na' | '';
  photos?: string[];
  adequacyReported: boolean;
  adequacyStatus?: 'pending' | 'completed' | 'not_applicable';
  adequacyDetails?: string;
  adequacyImages?: string[];
  adequacyDate?: string;
  changesDescription?: string;
  treatmentDeadline?: string;
  updatedAt: string;
  updatedBy: string;
}

// Documento principal do relatório (1 por projeto)
export interface Relatorio {
  id: string; // = projectId
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  
  // Todos os itens do relatório dentro de um array
  itens: RelatorioItem[];
  
  // Estatísticas calculadas
  statistics: {
    totalItems: number;
    completedItems: number;
    pendingItems: number;
    inProgressItems: number;
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface RelatorioSummary {
  id: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  totalItems: number;
  completedItems: number;
  pendingItems: number;
  inProgressItems: number;
  approvedAdequacies: number;
  rejectedAdequacies: number;
  pendingAdequacies: number;
  createdAt: string;
  updatedAt: string;
}

// Tipos para o novo sistema de avaliação com perguntas ponderadas
export type ResponseOption = 'na' | 'very_bad' | 'bad' | 'good' | 'excellent';

export interface QuestionResponse {
  selectedOption: ResponseOption | null;
  score?: number;
  textResponse?: string;
  mediaAttachments?: MediaAttachment[];
  userComment?: string; // Comentário único do usuário (sobrescreve)
  userCommentDate?: string; // Data do comentário do usuário
  userCommentBy?: string; // Quem fez o comentário
  aiGuidance?: string; // Orientação gerada pela IA (campo separado)
  currentSituation?: string; // Situação atual descrita
  comments?: Comment[]; // Array de comentários (mantido para compatibilidade com dados antigos)
  respondedAt?: string;
  respondedBy?: string;
}

// NC - Não Conformidade
export interface NC {
  id: string;
  numero: number; // NC 1, NC 2, NC 3...
  ncTitulo: string; // Título da NC (ex: "NC-1", "Documentação")
  descricao?: string;
  perguntas: WeightedQuestion[];
  pontuacaoAtual: number;
  pontuacaoMaxima: number;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface MediaAttachment {
  id: string;
  url: string;
  type: 'image' | 'video' | 'document';
  createdAt: string;
  latitude?: number;
  longitude?: number;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface WeightedQuestion {
  id: string;
  text: string;
  weight: number; // 1, 2, ou 3
  required: boolean; // OBRIGATÓRIO ou não
  responseOptions: ResponseOption[]; // Opções disponíveis para esta pergunta
  response?: QuestionResponse;
  order: number; // Ordem de exibição
}

export interface QuestionSection {
  id: string;
  title: string;
  subtitle?: string;
  questions: WeightedQuestion[];
  order: number;
  totalPossibleScore: number;
  currentScore: number;
}

// Estrutura hierárquica: Módulo > Item > NCs
export interface ProjectModule {
  id: string;
  titulo: string;
  ordem: number;
  itens: ProjectItem[];
}

export interface ProjectItem {
  id: string;
  titulo: string;
  descricao?: string;
  ordem: number;
  ncs: NC[]; // Um item pode ter múltiplas NCs
  pontuacaoAtual: number;
  pontuacaoMaxima: number;
}

export interface WeightedEvaluation {
  id: string;
  projectId: string;
  projectName: string;
  modules: ProjectModule[]; // Agora usa módulos hierárquicos
  sections: QuestionSection[]; // Mantido para compatibilidade
  totalScore: number;
  maxScore: number;
  progressPercentage: number;
  createdAt: string;
  updatedAt: string;
  status: 'not_started' | 'in_progress' | 'completed';
}

// Mapeamento de opções para valores de pontuação (% do peso máximo)
export const RESPONSE_VALUES: Record<ResponseOption, number> = {
  'na': 1.0, // N/A = 100% (não aplicável, conta como completo)
  'very_bad': 0.0, // 😢 = 0%
  'bad': 0.5, // 😐 = 50%
  'good': 0.75, // 😊 = 75%
  'excellent': 1.0 // 🏆 = 100%
};

// Labels e emojis para as opções
export const RESPONSE_LABELS: Record<ResponseOption, { label: string; emoji: string }> = {
  'na': { label: 'N/A', emoji: '' },
  'very_bad': { label: 'Muito Ruim', emoji: '😢' },
  'bad': { label: 'Regular', emoji: '😐' },
  'good': { label: 'Bom', emoji: '😊' },
  'excellent': { label: 'Excelente', emoji: '🏆' }
};