// Tipos para relatórios
export interface RelatorioItem {
  id: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
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
  status: 'pending' | 'in_progress' | 'completed' | 'approved' | 'rejected';
  evaluation: 'nc' | 'r' | 'na' | '';
  photos?: string[];
  adequacyReported: boolean;
  adequacyStatus?: 'pending' | 'approved' | 'rejected';
  adequacyDetails?: string;
  adequacyImages?: string[];
  adequacyDate?: string;
  adminFeedback?: string;
  adminRejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string; // ID do usuário que criou
  updatedBy: string; // ID do usuário que atualizou
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