import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet, Filter, Search, ArrowLeft, FolderOpen, Building2, User, BarChart3, TrendingUp, Calendar, Image, Eye, Save, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { RelatorioService } from '@/lib/relatorioService';
import { RelatorioItem } from '@/lib/types';
import { db, storage } from '@/lib/firebase';
import { ref, getBlob, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';

const ProjectReports = () => {
  const { userData } = useAuthContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [relatorios, setRelatorios] = useState<RelatorioItem[]>([]);
  const [filteredData, setFilteredData] = useState<RelatorioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectId, setProjectId] = useState<string | null>(null);

  // Estados para filtros únicos
  const [categories, setCategories] = useState<string[]>([]);
  const [statuses] = useState(['pending', 'in_progress', 'completed', 'approved', 'rejected']);

  // Efeito para carregar relatórios
  useEffect(() => {
    const projectIdFromUrl = searchParams.get('projectId');
    setProjectId(projectIdFromUrl);
    
    if (projectIdFromUrl && userData?.uid) {
      loadRelatorioByProject(projectIdFromUrl);
    } else if (!projectIdFromUrl) {
      // Se não há projectId, redirecionar para projetos
      navigate('/client-projects');
    }
  }, [searchParams]); // REMOVIDO userData da dependência

  // Efeito separado para quando userData estiver pronto
  useEffect(() => {
    if (userData?.uid && projectId && relatorios.length === 0) {
      loadRelatorioByProject(projectId);
    }
  }, [userData?.uid]);

  useEffect(() => {
    applyFilters();
  }, [relatorios, searchTerm, categoryFilter, statusFilter]);



    // Carregar relatórios da coleção 'relatorios'
  const loadFromRelatoriosCollection = async (projectId: string): Promise<RelatorioItem[] | null> => {
    try {
      if (!userData?.uid) return null;
      
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const relatoriosRef = collection(db, 'relatorios');
      
      // Buscar relatórios do cliente para este projeto específico
      const q = query(
        relatoriosRef, 
        where('projectId', '==', projectId),
        where('clientId', '==', userData.uid)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null; // Não há relatórios, precisa criar
      }
      
      const relatorios: RelatorioItem[] = [];
      snapshot.forEach(doc => {
        const documentId = doc.id;
        const docData = doc.data();
        
        // FILTRAR documentos marcados como deletados (no código JS)
        if (docData._deleted === true) {
          return; // Ignorar documentos deletados
        }
        
        // GARANTIR que o ID do Firestore seja preservado
        relatorios.push({ 
          ...docData,
          id: documentId // ID REAL do documento Firestore
        } as RelatorioItem);
      });
      
      return relatorios;
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      return null; // Retorna null em caso de erro
    }
  };





  // Criar relatórios iniciais na coleção baseados no projeto
  const createRelatoriosFromProject = async (projectId: string) => {
    try {

      
      // Buscar dados do projeto
      const { doc, getDoc, collection, addDoc } = await import('firebase/firestore');
      const projectDoc = await getDoc(doc(db, 'projetos', projectId));
      
      if (!projectDoc.exists()) {
        throw new Error('Projeto não encontrado');
      }
      
      const projectData = projectDoc.data();

      
      // Verificar permissões
      if (userData?.type === 'client' && projectData.clienteId !== userData.uid) {
        toast.error('Você não tem permissão para acessar este projeto');
        navigate('/client-projects');
        return;
      }
      
      const relatoriosCollection = collection(db, 'relatorios');
      const newRelatorios: RelatorioItem[] = [];
      
      // Processar customAccordions
      if (projectData.customAccordions) {
        for (const accordion of projectData.customAccordions) {
          if (accordion.items) {
            for (const item of accordion.items) {
              if (item.subItems) {
                for (const subItem of item.subItems) {
                  const relatorioItem: RelatorioItem = {
                    id: '', // Será preenchido pelo Firebase
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
                    adminFeedback: subItem.adminFeedback || '',
                    adminRejectionReason: subItem.adminRejectionReason || '',
                    changesDescription: subItem.changesDescription || '',
                    treatmentDeadline: subItem.treatmentDeadline || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: userData?.uid || '',
                    updatedBy: userData?.uid || ''
                  };
                  
                  // Adicionar no Firebase
                  const docRef = await addDoc(relatoriosCollection, relatorioItem);
                  relatorioItem.id = docRef.id;
                  newRelatorios.push(relatorioItem);
                  

                }
              }
            }
          }
        }
      }
      

      
      // Atualizar estado
      setRelatorios(newRelatorios);
      setFilteredData(newRelatorios);
      
      // Extrair categorias
      const uniqueCategories = Array.from(new Set(newRelatorios.map(item => item.category)));
      setCategories(uniqueCategories);
      
      toast.success(`${newRelatorios.length} relatórios criados com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao criar relatórios:', error);
      toast.error('Erro ao criar relatórios: ' + (error as Error).message);
    }
  };

  // Sincronizar novos itens do projeto com relatórios existentes
  const syncNewItemsFromProject = async (projectId: string, existingRelatorios: RelatorioItem[]) => {
    try {
      console.log('🔄 SYNC: Verificando novos itens do projeto...');
      
      const { doc, getDoc, collection, addDoc } = await import('firebase/firestore');
      
      // 1. Buscar dados atuais do projeto
      const projectRef = doc(db, 'projetos', projectId);
      const projectSnap = await getDoc(projectRef);
      
      if (!projectSnap.exists()) {
        console.log('❌ SYNC: Projeto não encontrado');
        return;
      }
      
      const projectData = projectSnap.data();
      
      // 2. Extrair subItemIds existentes no relatório
      const existingSubItemIds = new Set(existingRelatorios.map(item => item.subItemId));
      console.log('📊 SYNC: SubItemIds existentes:', existingSubItemIds.size);
      
      // 3. Processar customAccordions do projeto para encontrar novos
      const newItemsToAdd: RelatorioItem[] = [];
      
      if (projectData.customAccordions && projectData.customAccordions.length > 0) {
        for (const accordion of projectData.customAccordions) {
          if (accordion.items && accordion.items.length > 0) {
            for (const item of accordion.items) {
              if (item.subItems && item.subItems.length > 0) {
                for (const subItem of item.subItems) {
                  // Verificar se este subItem é novo
                  if (!existingSubItemIds.has(subItem.id)) {
                    console.log(`🆕 SYNC: Novo item encontrado: ${subItem.title}`);
                    
                    const newRelatorioItem: RelatorioItem = {
                      id: '', // Será preenchido após criar no Firebase
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
                      responsible: '',
                      status: 'pending',
                      evaluation: subItem.evaluation || '',
                      photos: subItem.photos || [],
                      adequacyReported: false,
                      adequacyStatus: 'pending',
                      adequacyDetails: '',
                      adequacyImages: [],
                      adequacyDate: '',
                      changesDescription: '',
                      treatmentDeadline: '',
                      whatWasDone: '',
                      startDate: '',
                      endDate: '',
                      adminFeedback: '',
                      adminRejectionReason: '',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      createdBy: userData?.uid || '',
                      updatedBy: userData?.uid || ''
                    };
                    
                    newItemsToAdd.push(newRelatorioItem);
                  }
                }
              }
            }
          }
        }
      }
      
      // 4. Adicionar novos itens no Firebase
      if (newItemsToAdd.length > 0) {
        console.log(`🔄 SYNC: Adicionando ${newItemsToAdd.length} novo(s) item(s)...`);
        
        const relatoriosCollection = collection(db, 'relatorios');
        
        for (const newItem of newItemsToAdd) {
          const docRef = await addDoc(relatoriosCollection, newItem);
          newItem.id = docRef.id;
          console.log(`✅ SYNC: Novo relatório criado: ${newItem.subItemTitle}`);
        }
        
        // 5. Atualizar estado local com novos itens
        const updatedRelatorios = [...existingRelatorios, ...newItemsToAdd];
        setRelatorios(updatedRelatorios);
        setFilteredData(updatedRelatorios);
        
        // Atualizar categorias
        const uniqueCategories = Array.from(new Set(updatedRelatorios.map(item => item.category)));
        setCategories(uniqueCategories);
        
        toast.success(`🆕 ${newItemsToAdd.length} novo(s) item(s) sincronizado(s)!`);
      } else {
        console.log('✅ SYNC: Nenhum item novo encontrado');
      }
      
    } catch (error) {
      console.error('❌ SYNC: Erro ao sincronizar:', error);
      toast.error('Erro ao sincronizar novos itens');
    }
  };

  const loadRelatorioByProject = async (projectId: string) => {
    try {
      setLoading(true);
      
      // Primeiro, verificar se já existem documentos na coleção (independente de estarem deletados)
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const relatoriosRef = collection(db, 'relatorios');
      const q = query(
        relatoriosRef, 
        where('projectId', '==', projectId),
        where('clientId', '==', userData?.uid)
      );
      const snapshot = await getDocs(q);
      
      // Se não há NENHUM documento na coleção, criar
      if (snapshot.empty) {
        await createRelatoriosFromProject(projectId);
        return;
      }
      
      // Se existem documentos, carregar apenas os não deletados
      const relatoriosExistentes = await loadFromRelatoriosCollection(projectId);
      
      if (relatoriosExistentes && relatoriosExistentes.length > 0) {
        setRelatorios(relatoriosExistentes);
        setFilteredData(relatoriosExistentes);
        
        // Extrair categorias
        const uniqueCategories = Array.from(new Set(relatoriosExistentes.map(item => item.category)));
        setCategories(uniqueCategories);
      } else {
        // Existem documentos mas todos estão deletados - não criar novos!
        setRelatorios([]);
        setFilteredData([]);
        setCategories([]);
      }
      
    } catch (error) {
      console.error('Erro ao carregar relatório do projeto:', error);
      toast.error('Erro ao carregar relatório do projeto');
    } finally {
      setLoading(false);
    }
  };



  // Função para ordenar os dados na ordem correta
  const sortRelatorios = (data: RelatorioItem[]) => {
    return [...data].sort((a, b) => {
      // 1. Ordenar por categoria (alfabeticamente)
      const categoryCompare = a.category.localeCompare(b.category);
      if (categoryCompare !== 0) return categoryCompare;
      
      // 2. Ordenar por artigo (numericamente: 1.1, 1.2, 1.3, etc.)
      const parseArticle = (article: string) => {
        const match = article.match(/(\d+)\.(\d+)/);
        if (match) {
          return [parseInt(match[1]), parseInt(match[2])];
        }
        return [0, 0];
      };
      
      const [aMain, aSub] = parseArticle(a.itemTitle);
      const [bMain, bSub] = parseArticle(b.itemTitle);
      
      if (aMain !== bMain) return aMain - bMain;
      if (aSub !== bSub) return aSub - bSub;
      
      // 3. Ordenar por NC (numericamente: NC-1, NC-2, NC-3, etc.)
      const parseNC = (title: string) => {     
        const match = title.match(/NC-(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      
      const aNC = parseNC(a.subItemTitle);
      const bNC = parseNC(b.subItemTitle);
      
      return aNC - bNC;
    });
  };

  const applyFilters = () => {
    let filtered = relatorios;

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.local.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.currentSituation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clientGuidance.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subItemTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de categoria
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Aplicar ordenação
    filtered = sortRelatorios(filtered);

    setFilteredData(filtered);
  };

  // Estado para mudanças locais (como Excel)
  const [localChanges, setLocalChanges] = useState<{[key: string]: Partial<RelatorioItem>}>({});
  const [saving, setSaving] = useState(false);

  // Função para atualizar valores localmente (como Excel)
  const updateLocalValue = async (itemId: string, field: string, value: any) => {
    const item = relatorios.find(i => i.id === itemId);
    if (!item) return;

    // Validação especial para status "completed"
    if (field === 'status' && value === 'completed') {
      if (!canMarkAsCompleted(item)) {
        const missing = getMissingRequirements(item);
        toast.error(`Para marcar como concluído, preencha: ${missing.join(', ')}`, { 
          duration: 5000 
        });
        return; // Não permite a mudança
      }
    }

    // Atualizar mudanças locais
    setLocalChanges(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
    
    // Se mudou o status, atualizar progresso do projeto
    if (field === 'status') {
      // Simular os dados atualizados para cálculo do progresso
      const updatedData = relatorios.map(item => {
        if (item.id === itemId) {
          return { ...item, [field]: value };
        }
        return item;
      });
      
      // Atualizar progresso automaticamente
      await updateProjectProgress(updatedData);
      
      // Feedback visual
      if (value === 'completed') {
        toast.success('✅ Item marcado como concluído! Progresso atualizado.', { duration: 3000 });
      }
    }
  };

  // Função para obter valor (local ou original)
  const getValue = (item: RelatorioItem, field: keyof RelatorioItem) => {
    return localChanges[item.id]?.[field] ?? item[field] ?? '';
  };

  // Função para validar se item pode ser marcado como concluído
  const canMarkAsCompleted = (item: RelatorioItem) => {
    const responsible = getValue(item, 'responsible') as string;
    const changesDescription = getValue(item, 'changesDescription') as string;
    const treatmentDeadline = getValue(item, 'treatmentDeadline') as string;
    const adequacyImages = getValue(item, 'adequacyImages') as string[] || [];

    return !!(
      responsible?.trim() && 
      changesDescription?.trim() && 
      treatmentDeadline?.trim() && 
      adequacyImages.length > 0
    );
  };

  // Função para obter mensagem do que falta para concluir
  const getMissingRequirements = (item: RelatorioItem) => {
    const missing = [];
    
    if (!(getValue(item, 'responsible') as string)?.trim()) {
      missing.push('Responsável');
    }
    if (!(getValue(item, 'changesDescription') as string)?.trim()) {
      missing.push('O que foi alterado');
    }
    if (!(getValue(item, 'treatmentDeadline') as string)?.trim()) {
      missing.push('Prazo para tratar');
    }
    if (!((getValue(item, 'adequacyImages') as string[] || []).length > 0)) {
      missing.push('Adequação (pelo menos 1 foto)');
    }
    
    return missing;
  };

  // Função para upload de fotos de adequação
  const handlePhotoUpload = async (itemId: string, files: FileList) => {
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (!file.type.startsWith('image/')) {
          throw new Error('Apenas imagens são permitidas');
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB
          throw new Error('Arquivo muito grande. Máximo 5MB');
        }

        const fileName = `adequacao/${itemId}/${Date.now()}_${file.name}`;
        const fileRef = ref(storage, fileName);
        
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);
        
        return downloadURL;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      
      // Adicionar às fotos existentes
      const item = relatorios.find(i => i.id === itemId)!;
      const currentPhotos = getValue(item, 'adequacyImages') as string[] || [];
      const newPhotos = [...currentPhotos, ...uploadedUrls];
      
      updateLocalValue(itemId, 'adequacyImages', newPhotos);
      updateLocalValue(itemId, 'adequacyReported', true);
      
      toast.success(`${uploadedUrls.length} foto(s) adicionada(s)`);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer upload');
    }
  };

  // Função para remover foto de adequação
  const removeAdequacyPhoto = (itemId: string, photoUrl: string) => {
    const item = relatorios.find(i => i.id === itemId);
    if (!item) return;
    
    const currentPhotos = getValue(item, 'adequacyImages') as string[] || [];
    const newPhotos = currentPhotos.filter(url => url !== photoUrl);
    
    updateLocalValue(itemId, 'adequacyImages', newPhotos);
    
    if (newPhotos.length === 0) {
      updateLocalValue(itemId, 'adequacyReported', false);
    }
  };

  // Função para calcular e atualizar progresso do projeto
  const updateProjectProgress = async (currentData: RelatorioItem[]) => {
    if (!projectId) return;
    
    try {
      const totalItems = currentData.length;
      const completedItems = currentData.filter(item => {
        const status = localChanges[item.id]?.status ?? item.status;
        return status === 'completed';
      }).length;
      
      const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      // Atualizar progresso no projeto
      const projectRef = doc(db, 'projetos', projectId);
      await updateDoc(projectRef, {
        progresso: progressPercent,
        dataAtualizacao: new Date().toISOString()
      });
      
      console.log(`📊 Progresso do projeto atualizado: ${progressPercent}% (${completedItems}/${totalItems} itens concluídos)`);
      
    } catch (error) {
      console.error('Erro ao atualizar progresso do projeto:', error);
    }
  };

  // Função para salvar alterações diretamente na coleção 'relatorios'
  const saveAllChanges = async () => {
    if (Object.keys(localChanges).length === 0) {
      toast.info('Nenhuma alteração para salvar');
      return;
    }

    setSaving(true);
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      
      
      
      // Salvar cada item alterado
      const promises = Object.entries(localChanges).map(async ([itemId, changes]) => {
        const docRef = doc(db, 'relatorios', itemId);
        const updateData = {
          ...changes,
          updatedAt: new Date().toISOString(),
          updatedBy: userData?.uid || ''
        };
        

        await updateDoc(docRef, updateData);
        
        return { itemId, changes };
      });
      
      await Promise.all(promises);

      
      // Atualizar dados locais
      const updatedRelatorios = relatorios.map(item => 
        localChanges[item.id] ? { ...item, ...localChanges[item.id] } : item
      );
      setRelatorios(updatedRelatorios);
      setFilteredData(updatedRelatorios.filter(item => 
        item.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subItemTitle.toLowerCase().includes(searchTerm.toLowerCase())
      ));
      
      // Atualizar progresso do projeto
      await updateProjectProgress(updatedRelatorios);
      
      // Limpar mudanças locais
      setLocalChanges({});
      
      toast.success('✅ Alterações salvas com sucesso!');
      
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      toast.error('Erro ao salvar alterações: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const exportToCSV = () => {
    if (filteredData.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const headers = [
      'Projeto',
      'Cliente',
      'Categoria',
      'Item',
      'Local',
      'Situação Atual',
      'Orientação',
      'Responsável',
      'Status',
      'Avaliação',
      'O que foi alterado',
      'Prazo para tratar',
      'Adequação Reportada',
      'Status da Adequação'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => [
        `"${item.projectName}"`,
        `"${item.clientName}"`,
        `"${item.category}"`,
        `"${item.subItemTitle}"`,
        `"${item.local}"`,
        `"${item.currentSituation}"`,
        `"${item.clientGuidance}"`,
        `"${item.responsible || ''}"`,
        `"${item.status}"`,
        `"${item.evaluation}"`,
        `"${item.changesDescription || ''}"`,
        `"${item.treatmentDeadline || ''}"`,
        `"${item.adequacyReported ? 'Sim' : 'Não'}"`,
        `"${item.adequacyStatus || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${projectId || 'geral'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      in_progress: { label: 'Em Andamento', className: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Concluído', className: 'bg-green-100 text-green-800' },
      approved: { label: 'Aprovado', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejeitado', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, className: 'bg-gray-100 text-gray-800' };
    
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getEvaluationBadge = (evaluation: string) => {
    const evaluationConfig = {
      nc: { label: 'NC', className: 'bg-red-100 text-red-800' },
      r: { label: 'R', className: 'bg-yellow-100 text-yellow-800' },
      na: { label: 'NA', className: 'bg-green-100 text-green-800' }
    };

    const config = evaluationConfig[evaluation as keyof typeof evaluationConfig] || { label: evaluation, className: 'bg-gray-100 text-gray-800' };
    
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getProjectSummary = () => {
    const totalItems = relatorios.length;
    const completedItems = relatorios.filter(r => r.status === 'completed').length;
    const pendingItems = relatorios.filter(r => r.status === 'pending').length;
    const inProgressItems = relatorios.filter(r => r.status === 'in_progress').length;

    return { totalItems, completedItems, pendingItems, inProgressItems };
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const summary = getProjectSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-versys-primary">
              {projectId ? 'Relatório do Projeto' : 'Meus Relatórios'}
            </h2>
            <p className="text-gray-600 mt-2">
              {projectId ? 'Visualize e gerencie o relatório deste projeto' : 'Visualize e gerencie seus relatórios'}
            </p>
          </div>
        </div>
        
        {/* Botões movidos para a seção "Dados do Relatório" */}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total de Itens</p>
                <p className="text-2xl font-bold">{summary.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Concluídos</p>
                <p className="text-2xl font-bold">{summary.completedItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Em Andamento</p>
                <p className="text-2xl font-bold">{summary.inProgressItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold">{summary.pendingItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                placeholder="Buscar em todos os campos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status === 'pending' ? 'Pendente' :
                       status === 'in_progress' ? 'Em Andamento' :
                       status === 'completed' ? 'Concluído' :
                       status === 'approved' ? 'Aprovado' :
                       status === 'rejected' ? 'Rejeitado' : status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Dados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dados do Relatório</CardTitle>
                                          <CardDescription>
              {(() => {
                // CALCULAR DUPLICATAS REAIS
                const subItemIds = filteredData.map(item => item.subItemId);
                const uniqueSubItemIds = Array.from(new Set(subItemIds));
                const totalItems = filteredData.length;
                const uniqueItems = uniqueSubItemIds.length;
                const duplicates = totalItems - uniqueItems;
                
                return (
                  <>
                    {totalItems} itens encontrados ({uniqueItems} únicos)
                    {duplicates > 0 && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <span className="text-red-600 font-semibold text-sm">
                          ⚠️ ATENÇÃO: {duplicates} itens duplicados detectados!
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardDescription>
              </div>
              
                            <div className="flex items-center space-x-2">
              {userData?.type === 'client' && Object.keys(localChanges).length > 0 && (
                <Button
                  onClick={saveAllChanges}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 w-8 h-8 p-0"
                  disabled={saving}
                  title="Salvar Alterações"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save size={16} />
                  )}
                </Button>
              )}







              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
                className="w-8 h-8 p-0"
                disabled={relatorios.length === 0}
                title="Exportar CSV"
              >
                <Download size={16} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum relatório encontrado
              </h3>
              <p className="text-gray-600">
                {projectId ? 'Este projeto ainda não possui relatórios.' : 'Você ainda não possui relatórios.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Artigo</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Situação Atual</TableHead>
                    <TableHead>Orientação</TableHead>
                    <TableHead>Fotos</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>O que foi alterado</TableHead>
                    <TableHead>Prazo para tratar</TableHead>
                    <TableHead>Adequação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell className="font-medium">{item.itemTitle}</TableCell>
                      <TableCell>{item.subItemTitle}</TableCell>
                      <TableCell>{item.local}</TableCell>
                      <TableCell className="max-w-xs truncate" title={item.currentSituation}>
                        {item.currentSituation || '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={item.clientGuidance}>
                        {item.clientGuidance || '-'}
                      </TableCell>
                      <TableCell>
                        {item.photos && item.photos.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.photos.map((photo, index) => (
                                <div key={index} className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      console.log('📥 Tentando baixar foto:', photo);
                                      try {
                                        if (photo && typeof photo === 'string') {
                                          // Método 1: Tentar download direto via link (sem CORS)
                                          try {
                                            console.log('🔗 Tentando download direto...');
                                            const link = document.createElement('a');
                                            link.href = photo;
                                            link.download = `foto-${item.subItemTitle.replace(/[^a-zA-Z0-9]/g, '-')}-${index + 1}.jpg`;
                                            link.target = '_blank';
                                            link.rel = 'noopener noreferrer';
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            toast.success('Foto baixada com sucesso!');
                                            return;
                                          } catch (directError) {
                                            console.warn('⚠️ Download direto falhou, tentando via Firebase SDK...', directError);
                                          }

                                          // Método 2: Usar Firebase SDK como fallback
                                          const urlObj = new URL(photo);
                                          const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
                                          
                                          if (pathMatch) {
                                            const filePath = decodeURIComponent(pathMatch[1]);
                                            console.log('📂 Tentando via Firebase SDK:', filePath);
                                            
                                            const fileRef = ref(storage, filePath);
                                            const blob = await getBlob(fileRef);
                                            
                                            const blobUrl = window.URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = blobUrl;
                                            link.download = `foto-${item.subItemTitle.replace(/[^a-zA-Z0-9]/g, '-')}-${index + 1}.jpg`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            window.URL.revokeObjectURL(blobUrl);
                                            toast.success('Foto baixada com sucesso!');
                                          } else {
                                            // Método 3: Fallback final - abrir em nova aba
                                            console.warn('⚠️ Não foi possível extrair caminho, abrindo em nova aba...');
                                            window.open(photo, '_blank');
                                            toast.info('Foto aberta em nova aba. Clique com o botão direito para salvar.');
                                          }
                                        } else {
                                          toast.error('URL da foto inválida');
                                          console.error('URL inválida:', photo);
                                        }
                                      } catch (error) {
                                        console.error('Erro ao baixar foto:', error);
                                        // Fallback final: abrir em nova aba
                                        try {
                                          window.open(photo, '_blank');
                                          toast.info('Erro no download automático. Foto aberta em nova aba.');
                                        } catch (finalError) {
                                          toast.error('Erro ao acessar foto. Verifique se ela existe.');
                                        }
                                      }
                                    }}
                                    className="h-8 px-2 text-xs"
                                    title="Baixar foto"
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    Foto {index + 1}
                                  </Button>
                                </div>
                              ))}
                          </div>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Image className="h-4 w-4" />
                              <span className="text-xs">Sem fotos</span>
                            </div>
                          )}
                        </TableCell>
                      <TableCell className="min-w-48">
                        {userData?.type === 'client' ? (
                          <Input
                            value={String(getValue(item, 'responsible') || '')}
                            onChange={(e) => updateLocalValue(item.id, 'responsible', e.target.value)}
                            placeholder="Responsável..."
                            className="w-full h-8 text-sm border-gray-200 focus:border-blue-400"
                          />
                        ) : (
                          item.responsible || '-'
                        )}
                      </TableCell>
                      <TableCell className="min-w-36">
                        {userData?.type === 'client' ? (
                          <div className="space-y-1">
                            <Select 
                              value={getValue(item, 'status') as string || 'pending'} 
                              onValueChange={(value) => updateLocalValue(item.id, 'status', value)}
                            >
                              <SelectTrigger className="w-full h-8 text-sm border-gray-200 focus:border-blue-400">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pendente</SelectItem>
                                <SelectItem value="in_progress">Em Andamento</SelectItem>
                                <SelectItem 
                                  value="completed" 
                                  disabled={!canMarkAsCompleted(item)}
                                  className={!canMarkAsCompleted(item) ? 'opacity-50 cursor-not-allowed' : ''}
                                >
                                  Concluído {!canMarkAsCompleted(item) && '🔒'}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {!canMarkAsCompleted(item) && (
                              <div className="text-xs text-red-500">
                                Falta: {getMissingRequirements(item).length} campo(s)
                              </div>
                            )}
                          </div>
                        ) : (
                          getStatusBadge(item.status)
                        )}
                      </TableCell>
                      <TableCell>{getEvaluationBadge(item.evaluation)}</TableCell>
                      <TableCell className="min-w-64">
                        {userData?.type === 'client' ? (
                          <Input
                            value={String(getValue(item, 'changesDescription') || '')}
                            onChange={(e) => updateLocalValue(item.id, 'changesDescription', e.target.value)}
                            placeholder="O que foi alterado..."
                            className="w-full h-8 text-sm border-gray-200 focus:border-blue-400"
                          />
                        ) : (
                          <div className="max-w-xs truncate" title={item.changesDescription}>
                            {item.changesDescription || '-'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="min-w-40">
                        {userData?.type === 'client' ? (
                          <Input
                            type="text"
                            value={String(getValue(item, 'treatmentDeadline') || '')}
                            onChange={(e) => updateLocalValue(item.id, 'treatmentDeadline', e.target.value)}
                            placeholder="Ex: 15/01/2024"
                            className="w-full h-8 text-sm border-gray-200 focus:border-blue-400"
                          />
                        ) : (
                          item.treatmentDeadline || '-'
                        )}
                      </TableCell>
                      <TableCell className="min-w-48">
                        {userData?.type === 'client' ? (
                          <div className="space-y-2">
                            {/* Upload de fotos */}
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={(e) => e.target.files && handlePhotoUpload(item.id, e.target.files)}
                                className="hidden"
                                id={`photo-upload-${item.id}`}
                              />
                              <label
                                htmlFor={`photo-upload-${item.id}`}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded cursor-pointer"
                              >
                                <Upload className="h-3 w-3" />
                                Anexar Fotos
                              </label>
                            </div>
                            
                            {/* Fotos anexadas */}
                            {(() => {
                              const adequacyImages = getValue(item, 'adequacyImages') as string[] || [];
                              return adequacyImages.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {adequacyImages.map((photoUrl, index) => (
                                    <div key={index} className="relative group">
                                      <img
                                        src={photoUrl}
                                        alt={`Adequação ${index + 1}`}
                                        className="w-12 h-12 object-cover rounded border"
                                      />
                                      <button
                                        onClick={() => removeAdequacyPhoto(item.id, photoUrl)}
                                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="h-2 w-2" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                            
                            {/* Status */}
                            <Badge variant={getValue(item, 'adequacyImages') && (getValue(item, 'adequacyImages') as string[]).length > 0 ? 'default' : 'secondary'} className="text-xs">
                              {getValue(item, 'adequacyImages') && (getValue(item, 'adequacyImages') as string[]).length > 0 ? 'Fotos Anexadas' : 'Sem Fotos'}
                            </Badge>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {item.adequacyImages && item.adequacyImages.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.adequacyImages.map((photoUrl, index) => (
                                  <img
                                    key={index}
                                    src={photoUrl}
                                    alt={`Adequação ${index + 1}`}
                                    className="w-12 h-12 object-cover rounded border cursor-pointer"
                                    onClick={() => window.open(photoUrl, '_blank')}
                                  />
                                ))}
                              </div>
                            ) : null}
                            <Badge variant={item.adequacyReported ? 'default' : 'secondary'}>
                              {item.adequacyReported ? 'Reportada' : 'Não Reportada'}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectReports;
