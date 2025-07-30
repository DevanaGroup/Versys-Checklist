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
                    itemTitle: item.title,
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
                    changesDescription: subItem.changesDescription || '',
                    treatmentDeadline: subItem.treatmentDeadline || '',
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

  // Sincronizar relatórios quando o projeto for atualizado
  static async syncRelatoriosFromProject(projectId: string, userId: string): Promise<void> {
    try {
      console.log('🔄 Sincronizando relatórios do projeto:', projectId);
      
      // Buscar dados atualizados do projeto
      const projectDoc = await getDoc(doc(db, 'projetos', projectId));
      if (!projectDoc.exists()) {
        throw new Error('Projeto não encontrado');
      }

      const projectData = projectDoc.data();
      
      // Buscar relatórios existentes
      const relatoriosRef = collection(db, 'relatorios');
      const existingQuery = query(
        relatoriosRef,
        where('projectId', '==', projectId)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      // Criar mapa dos relatórios existentes por subItemId
      const existingRelatorios = new Map<string, {id: string, data: any}>();
      existingSnapshot.forEach(doc => {
        const data = doc.data();
        if (!data._deleted) {
          existingRelatorios.set(data.subItemId, { id: doc.id, data });
        }
      });

      // Processar cada item do projeto
      if (projectData.customAccordions) {
        for (const accordion of projectData.customAccordions) {
          if (accordion.items) {
            for (const item of accordion.items) {
              if (item.subItems) {
                for (const subItem of item.subItems) {
                  const existingItem = existingRelatorios.get(subItem.id);
                  
                  if (existingItem) {
                    // Atualizar relatório existente com dados do projeto
                    const updateData = {
                      // Campos que podem ser atualizados do projeto
                      projectName: projectData.nome,
                      clientName: projectData.cliente?.nome || '',
                      clientEmail: projectData.cliente?.email || '',
                      category: accordion.title || 'Categoria não informada',
                      itemTitle: item.title,
                      subItemTitle: subItem.title,
                      local: subItem.local || 'Local não informado',
                      currentSituation: subItem.currentSituation || '',
                      clientGuidance: subItem.clientGuidance || '',
                      
                      // Preservar dados do usuário
                      responsible: existingItem.data.responsible || '',
                      whatWasDone: existingItem.data.whatWasDone || '',
                      startDate: existingItem.data.startDate || '',
                      endDate: existingItem.data.endDate || '',
                      status: existingItem.data.status || 'pending',
                      evaluation: existingItem.data.evaluation || '',
                      photos: existingItem.data.photos || [],
                      adequacyReported: existingItem.data.adequacyReported || false,
                      adequacyStatus: existingItem.data.adequacyStatus || 'pending',
                      adequacyDetails: existingItem.data.adequacyDetails || '',
                      adequacyImages: existingItem.data.adequacyImages || [],
                      adequacyDate: existingItem.data.adequacyDate || '',
                      changesDescription: existingItem.data.changesDescription || '',
                      treatmentDeadline: existingItem.data.treatmentDeadline || '',
                      
                      // Metadados
                      updatedAt: new Date().toISOString(),
                      updatedBy: userId
                    };
                    
                    await updateDoc(doc(db, 'relatorios', existingItem.id), updateData);
                  } else {
                    // Criar novo relatório se não existir
                    const newRelatorioItem: RelatorioItem = {
                      id: '', // Será preenchido ao salvar
                      projectId,
                      projectName: projectData.nome,
                      clientId: projectData.clienteId || '',
                      clientName: projectData.cliente?.nome || '',
                      clientEmail: projectData.cliente?.email || '',
                      category: accordion.title || 'Categoria não informada',
                      itemTitle: item.title,
                      subItemId: subItem.id,
                      subItemTitle: subItem.title,
                      local: subItem.local || 'Local não informado',
                      currentSituation: subItem.currentSituation || '',
                      clientGuidance: subItem.clientGuidance || '',
                      responsible: subItem.responsible || '',
                      whatWasDone: subItem.whatWasDone || '',
                      startDate: subItem.startDate || '',
                      endDate: subItem.endDate || '',
                      status: subItem.status || 'pending',
                      evaluation: subItem.evaluation || '',
                      photos: subItem.photos || [],
                      adequacyReported: subItem.adequacyReported || false,
                      adequacyStatus: subItem.adequacyStatus || 'pending',
                      adequacyDetails: subItem.adequacyDetails || '',
                      adequacyImages: subItem.adequacyImages || [],
                      adequacyDate: subItem.adequacyDate || '',
                      changesDescription: subItem.changesDescription || '',
                      treatmentDeadline: subItem.treatmentDeadline || '',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      createdBy: userId,
                      updatedBy: userId
                    };
                    
                    await addDoc(relatoriosRef, newRelatorioItem);
                  }
                }
              }
            }
          }
        }
      }
      
      console.log('✅ Relatórios sincronizados com sucesso');
    } catch (error) {
      console.error('Erro ao sincronizar relatórios:', error);
      throw error;
    }
  }

  // Remover relatórios duplicados
  static async removeDuplicateRelatorios(projectId: string): Promise<number> {
    try {
      console.log('🧹 Verificando duplicatas para projeto:', projectId);
      
      const relatoriosRef = collection(db, 'relatorios');
      const q = query(
        relatoriosRef,
        where('projectId', '==', projectId)
      );
      const snapshot = await getDocs(q);
      
      // Agrupar por subItemId para identificar duplicatas
      const groupedBySubItemId = new Map<string, any[]>();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!data._deleted) {
          const subItemId = data.subItemId;
          if (!groupedBySubItemId.has(subItemId)) {
            groupedBySubItemId.set(subItemId, []);
          }
          groupedBySubItemId.get(subItemId)!.push({ id: doc.id, data });
        }
      });
      
      // Identificar e remover duplicatas
      const duplicatesToRemove: string[] = [];
      
      groupedBySubItemId.forEach((items, subItemId) => {
        if (items.length > 1) {
          console.log(`⚠️ Duplicatas encontradas para subItemId ${subItemId}:`, items.length);
          
          // Manter o mais recente (maior updatedAt) e remover os outros
          items.sort((a, b) => {
            const dateA = new Date(a.data.updatedAt || a.data.createdAt);
            const dateB = new Date(b.data.updatedAt || b.data.createdAt);
            return dateB.getTime() - dateA.getTime();
          });
          
          // Remover todos exceto o primeiro (mais recente)
          for (let i = 1; i < items.length; i++) {
            duplicatesToRemove.push(items[i].id);
          }
        }
      });
      
      // Remover duplicatas
      if (duplicatesToRemove.length > 0) {
        console.log(`🗑️ Removendo ${duplicatesToRemove.length} duplicatas...`);
        
        const deletePromises = duplicatesToRemove.map(docId => 
          deleteDoc(doc(db, 'relatorios', docId))
        );
        await Promise.all(deletePromises);
        
        console.log(`✅ ${duplicatesToRemove.length} duplicatas removidas`);
        return duplicatesToRemove.length;
      } else {
        console.log('✅ Nenhuma duplicata encontrada');
        return 0;
      }
      
    } catch (error) {
      console.error('Erro ao remover duplicatas:', error);
      throw error;
    }
  }

  // Determinar status baseado nos dados do item
  private static determineStatus(subItem: any): 'pending' | 'in_progress' | 'completed' {
    // Status inicial sempre é 'pending'
    // O cliente só pode alterar manualmente para 'in_progress' ou 'completed'
    return subItem.status || 'pending';
  }

  // Excluir todos os relatórios relacionados a um projeto
  static async deleteRelatoriosByProject(projectId: string): Promise<number> {
    try {
      console.log('🗑️ Excluindo relatórios do projeto:', projectId);
      
      let totalDeleted = 0;
      
      // 1. Excluir relatórios da coleção 'relatorios'
      const relatoriosRef = collection(db, 'relatorios');
      const relatoriosQuery = query(
        relatoriosRef,
        where('projectId', '==', projectId)
      );
      
      const relatoriosSnapshot = await getDocs(relatoriosQuery);
      
      if (!relatoriosSnapshot.empty) {
        const deleteRelatoriosPromises = relatoriosSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        
        await Promise.all(deleteRelatoriosPromises);
        totalDeleted += relatoriosSnapshot.docs.length;
        console.log(`✅ ${relatoriosSnapshot.docs.length} relatórios excluídos do projeto:`, projectId);
      }
      
      // 2. Excluir resumos de relatórios da coleção 'relatorio_summaries'
      const summariesRef = collection(db, 'relatorio_summaries');
      const summariesQuery = query(
        summariesRef,
        where('projectId', '==', projectId)
      );
      
      const summariesSnapshot = await getDocs(summariesQuery);
      
      if (!summariesSnapshot.empty) {
        const deleteSummariesPromises = summariesSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        
        await Promise.all(deleteSummariesPromises);
        totalDeleted += summariesSnapshot.docs.length;
        console.log(`✅ ${summariesSnapshot.docs.length} resumos de relatórios excluídos do projeto:`, projectId);
      }
      
      if (totalDeleted === 0) {
        console.log('✅ Nenhum relatório ou resumo encontrado para o projeto:', projectId);
      } else {
        console.log(`✅ Total de ${totalDeleted} documentos relacionados excluídos do projeto:`, projectId);
      }
      
      return totalDeleted;
    } catch (error) {
      console.error('Erro ao excluir relatórios do projeto:', error);
      throw error;
    }
  }
}