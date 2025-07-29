import { collection, doc, getDocs, getDoc, addDoc, updateDoc, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { RelatorioItem, RelatorioSummary } from './types';

// Serviço para gerenciar relatórios
export class RelatorioService {
  
  // Criar relatório a partir de um projeto
  static async createRelatorioFromProject(projectId: string, userId: string): Promise<string> {
    try {
      // Buscar dados do projeto
      const projectDoc = await getDoc(doc(db, 'projetos', projectId));
      if (!projectDoc.exists()) {
        throw new Error('Projeto não encontrado');
      }

      const projectData = projectDoc.data();
      const projectName = projectData.nome || 'Projeto sem nome';
      const clientId = projectData.clienteId || '';
      const clientName = projectData.cliente?.nome || 'Cliente não informado';
      const clientEmail = projectData.cliente?.email || '';

      const relatoriosRef = collection(db, 'relatorios');
      const relatorios: RelatorioItem[] = [];

      // Processar cada accordion e item do projeto
      if (projectData.customAccordions) {
        projectData.customAccordions.forEach((accordion: any) => {
          if (accordion.items) {
            accordion.items.forEach((item: any) => {
              const category = item.category || accordion.title || 'Categoria não informada';
              
              if (item.subItems) {
                item.subItems.forEach((subItem: any) => {
                  const relatorioItem: RelatorioItem = {
                    id: `${projectId}-${subItem.id}`,
                    projectId,
                    projectName,
                    clientId,
                    clientName,
                    clientEmail,
                    category,
                    subItemId: subItem.id,
                    subItemTitle: subItem.title,
                    local: subItem.local || 'Local não informado',
                    currentSituation: subItem.currentSituation || '',
                    clientGuidance: subItem.clientGuidance || subItem.adminFeedback || '',
                    responsible: subItem.responsible || '',
                    whatWasDone: subItem.whatWasDone || '',
                    startDate: subItem.startDate || '',
                    endDate: subItem.endDate || '',
                    status: this.determineStatus(subItem),
                    evaluation: subItem.evaluation || '',
                    photos: subItem.photos || [],
                    adequacyReported: subItem.adequacyReported || false,
                    adequacyStatus: subItem.adequacyStatus || 'pending',
                    adequacyDetails: subItem.adequacyDetails || '',
                    adequacyImages: subItem.adequacyImages || [],
                    adequacyDate: subItem.adequacyDate || '',
                    adminFeedback: subItem.adminFeedback || '',
                    adminRejectionReason: subItem.adminRejectionReason || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: userId,
                    updatedBy: userId
                  };

                  relatorios.push(relatorioItem);
                });
              }
            });
          }
        });
      }

      if (relatorios.length === 0) {
        throw new Error('Nenhum item de relatório foi criado. Verifique se o projeto possui dados estruturados.');
      }

      // Salvar cada item do relatório
      const savedIds: string[] = [];
      for (const relatorio of relatorios) {
        const docRef = await addDoc(relatoriosRef, relatorio);
        savedIds.push(docRef.id);
      }

      // Criar resumo do relatório
      const summary: RelatorioSummary = {
        id: `summary-${projectId}`,
        projectId,
        projectName,
        clientId,
        clientName,
        totalItems: relatorios.length,
        completedItems: relatorios.filter(r => r.status === 'completed').length,
        pendingItems: relatorios.filter(r => r.status === 'pending').length,
        inProgressItems: relatorios.filter(r => r.status === 'in_progress').length,
        approvedAdequacies: relatorios.filter(r => r.adequacyStatus === 'approved').length,
        rejectedAdequacies: relatorios.filter(r => r.adequacyStatus === 'rejected').length,
        pendingAdequacies: relatorios.filter(r => r.adequacyStatus === 'pending').length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'relatorio_summaries'), summary);

      return `Relatório criado com ${relatorios.length} itens`;
    } catch (error) {
      console.error('Erro ao criar relatório:', error);
      throw error;
    }
  }

  // Buscar relatórios de um cliente
  static async getRelatoriosByClient(clientId: string): Promise<RelatorioItem[]> {
    try {
      const relatoriosRef = collection(db, 'relatorios');
      const q = query(
        relatoriosRef,
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const relatorios: RelatorioItem[] = [];

      snapshot.forEach(doc => {
        relatorios.push({ id: doc.id, ...doc.data() } as RelatorioItem);
      });

      return relatorios;
    } catch (error) {
      console.error('Erro ao buscar relatórios do cliente:', error);
      throw error;
    }
  }

  // Buscar relatório de um projeto específico
  static async getRelatorioByProject(projectId: string): Promise<RelatorioItem[]> {
    try {
      const relatoriosRef = collection(db, 'relatorios');
      const q = query(
        relatoriosRef,
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const relatorios: RelatorioItem[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        relatorios.push({ id: doc.id, ...data } as RelatorioItem);
      });

      return relatorios;
    } catch (error) {
      console.error('Erro ao buscar relatório do projeto:', error);
      throw error;
    }
  }

  // Atualizar item do relatório
  static async updateRelatorioItem(itemId: string, updates: Partial<RelatorioItem>, userId: string): Promise<void> {
    try {
      const relatorioRef = doc(db, 'relatorios', itemId);
      await updateDoc(relatorioRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: userId
      });
    } catch (error) {
      console.error('Erro ao atualizar item do relatório:', error);
      throw error;
    }
  }

  // Determinar status baseado nos dados do item
  private static determineStatus(subItem: any): 'pending' | 'in_progress' | 'completed' | 'approved' | 'rejected' {
    if (subItem.adequacyStatus === 'approved') return 'approved';
    if (subItem.adequacyStatus === 'rejected') return 'rejected';
    if (subItem.adequacyReported) return 'in_progress';
    if (subItem.evaluation && subItem.currentSituation && subItem.clientGuidance) return 'completed';
    return 'pending';
  }
}