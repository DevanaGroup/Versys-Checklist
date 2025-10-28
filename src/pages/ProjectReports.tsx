import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet, Filter, Search, ArrowLeft, FolderOpen, Building2, User, BarChart3, TrendingUp, Calendar, Image, Eye, Save, Upload, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { RelatorioService } from '@/lib/relatorioService';
import { Relatorio, RelatorioItem } from '@/lib/types';
import { db, storage } from '@/lib/firebase';
import { ref, getBlob, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';

const ProjectReports = () => {
  const { userData } = useAuthContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [relatorios, setRelatorios] = useState<RelatorioItem[]>([]);
  const [filteredData, setFilteredData] = useState<RelatorioItem[]>([]);
  
  // Log essencial apenas
  if (relatorios.length > 0) {
    console.log('📊 Relatórios carregados:', relatorios.length);
    // Debug: verificar se há dados vazios
    const emptyData = relatorios.filter(item => 
      !item.category || !item.itemTitle || !item.local || !item.responsible
    );
    if (emptyData.length > 0) {
      console.warn('⚠️ Dados vazios detectados:', emptyData.length, 'itens com campos vazios');
      console.warn('⚠️ Detalhes dos dados vazios:', emptyData.map(item => ({
        id: item.id,
        category: item.category,
        itemTitle: item.itemTitle,
        local: item.local,
        responsible: item.responsible
      })));
    }
  }
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [articleFilter, setArticleFilter] = useState('all');
  const [localFilter, setLocalFilter] = useState('all');
  const [responsibleFilter, setResponsibleFilter] = useState('all');
  const [projectId, setProjectId] = useState<string | null>(null);

  // Estados para filtros únicos
  const [categories, setCategories] = useState<string[]>([]);
  const [statuses] = useState(['pending', 'in_progress', 'completed']);
  const [articles, setArticles] = useState<string[]>([]);
  const [locals, setLocals] = useState<string[]>([]);
  const [responsibles, setResponsibles] = useState<string[]>([]);
  
  // Estado para controlar execuções simultâneas e evitar duplicação
  const [isCreatingRelatorios, setIsCreatingRelatorios] = useState(false);

  // Efeito para carregar relatórios - CORRIGIDO para evitar duplicação
  useEffect(() => {
    const projectIdFromUrl = searchParams.get('projectId');
    setProjectId(projectIdFromUrl);
    
    if (!projectIdFromUrl) {
      // Se não há projectId, redirecionar para projetos
      navigate('/client-projects');
      return;
    }

    // Só executa se tiver projectId E userData, evitando execuções múltiplas
    if (projectIdFromUrl && userData?.uid && !isCreatingRelatorios) {
      // Debounce para evitar execuções muito próximas
      const timeoutId = setTimeout(() => {
        loadRelatorioByProject(projectIdFromUrl);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [searchParams, userData?.uid]); // Dependência unificada para evitar múltiplas execuções

  useEffect(() => {
    applyFilters();
  }, [relatorios, searchTerm, categoryFilter, statusFilter, articleFilter, localFilter, responsibleFilter]);

  // NOVA FUNÇÃO: Carregar relatório único do projeto
  const loadRelatorioFromFirebase = async (projectId: string): Promise<Relatorio | null> => {
    try {
      if (!userData?.uid) return null;
      
      console.log('🔍 Buscando relatório único para projeto:', projectId);
      const relatorioDoc = await getDoc(doc(db, 'relatorios', projectId));
      
      if (relatorioDoc.exists()) {
        const data = relatorioDoc.data() as Relatorio;
        console.log('✅ Relatório encontrado:', data.itens.length, 'itens');
        return data;
      }
      
      console.log('📄 Nenhum relatório encontrado para este projeto');
      return null;
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      return null;
    }
  };

  // ANTIGA FUNÇÃO (deprecada - manter apenas para migração)
  const loadFromRelatoriosCollection = async (projectId: string): Promise<RelatorioItem[] | null> => {
    try {
      if (!userData?.uid) return null;
      
      const { collection, query, where, getDocs, deleteDoc, doc } = await import('firebase/firestore');
      const relatoriosRef = collection(db, 'relatorios');
      
      // Construir query baseada no tipo de usuário
      let q;
      if (userData?.type === 'admin') {
        // Admin vê TODOS os relatórios do projeto
        q = query(
          relatoriosRef, 
          where('projectId', '==', projectId)
        );
      } else {
        // Cliente vê apenas seus próprios relatórios
        q = query(
          relatoriosRef, 
          where('projectId', '==', projectId),
          where('clientId', '==', userData.uid)
        );
      }
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null; // Não há relatórios, precisa criar
      }
      
      const relatorios: RelatorioItem[] = [];
      const documentsToDelete: string[] = [];
      
      snapshot.forEach(docSnapshot => {
        const documentId = docSnapshot.id;
        const docData = docSnapshot.data() as any;
        
        // FILTRAR documentos marcados como deletados (no código JS)
        if (docData._deleted === true) {
          documentsToDelete.push(documentId);
          return; // Ignorar documentos deletados
        }
        
        // VERIFICAR permissões baseado no tipo de usuário
        if (userData?.type !== 'admin') {
          // Cliente só pode ver seus próprios documentos
          if (docData.clientId !== userData.uid) {
            console.warn(`⚠️ Documento ${documentId} com clientId incorreto: ${docData.clientId} (usuário: ${userData.uid})`);
            documentsToDelete.push(documentId);
            return;
          }
        }
        
        // GARANTIR que o ID do Firestore seja preservado
        relatorios.push({ 
          ...docData,
          id: documentId
        } as RelatorioItem);
      });
      
      // Limpar documentos problemáticos
      if (documentsToDelete.length > 0) {
        console.log(`🧹 Limpando ${documentsToDelete.length} documentos problemáticos...`);
        const deletePromises = documentsToDelete.map(docId => 
          deleteDoc(doc(db, 'relatorios', docId))
        );
        await Promise.all(deletePromises);
        console.log('✅ Documentos problemáticos removidos');
      }
      
      return relatorios;
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      return null; // Retorna null em caso de erro
    }
  };

  // Função auxiliar para extrair situação atual das perguntas da NC
  const extractCurrentSituation = (nc: any): string => {
    console.log('🔍 Extraindo situação atual da NC:', nc.ncTitulo || nc.numero);
    
    if (nc.descricao) {
      console.log('✅ Descrição encontrada:', nc.descricao);
      return nc.descricao;
    }
    
    // Se não tem descrição, tentar extrair das respostas das perguntas
    if (nc.perguntas && Array.isArray(nc.perguntas)) {
      console.log(`📋 NC tem ${nc.perguntas.length} perguntas`);
      
      const situacoes = nc.perguntas
        .map((p: any, idx: number) => {
          const situacao = p.response?.currentSituation;
          if (situacao) {
            console.log(`  ✅ Pergunta ${idx + 1} tem situação: "${situacao}"`);
          }
          return situacao;
        })
        .filter((s: any) => s && s.trim() !== '');
      
      if (situacoes.length > 0) {
        const resultado = situacoes.join(' | ');
        console.log(`✅ Situações encontradas: "${resultado}"`);
        return resultado;
      }
      
      console.log('⚠️ Nenhuma pergunta tem currentSituation');
    } else {
      console.log('⚠️ NC não tem perguntas');
    }
    
    console.log('❌ Nenhuma situação atual encontrada');
    return '';
  };

  // Função auxiliar para extrair orientação para o cliente das perguntas
  const extractClientGuidance = (nc: any): string => {
    if ((nc as any).orientacao) return (nc as any).orientacao;
    
    // Se não tem orientação, tentar extrair das respostas das perguntas (IA guidance)
    if (nc.perguntas && Array.isArray(nc.perguntas)) {
      const orientacoes = nc.perguntas
        .map((p: any) => p.response?.aiGuidance)
        .filter((g: any) => g && g.trim() !== '');
      
      if (orientacoes.length > 0) {
        return orientacoes.join(' | ');
      }
    }
    
    return '';
  };

  // Função auxiliar para extrair fotos das mediaAttachments das perguntas
  const extractPhotos = (nc: any): string[] => {
    const photos: string[] = [];
    
    // Primeiro, verificar se há campo fotos direto na NC (compatibilidade)
    if ((nc as any).fotos && Array.isArray((nc as any).fotos)) {
      photos.push(...(nc as any).fotos);
    }
    
    // Extrair fotos das mediaAttachments das perguntas
    if (nc.perguntas && Array.isArray(nc.perguntas)) {
      nc.perguntas.forEach((pergunta: any) => {
        if (pergunta.response?.mediaAttachments && Array.isArray(pergunta.response.mediaAttachments)) {
          pergunta.response.mediaAttachments.forEach((media: any) => {
            if (media.url && !photos.includes(media.url)) {
              photos.push(media.url);
            }
          });
        }
      });
    }
    
    console.log(`📸 Extraídas ${photos.length} foto(s) da NC`);
    return photos;
  };

  // NOVA FUNÇÃO: Criar ou atualizar relatório ÚNICO baseado no projeto
  const createOrUpdateRelatorio = async (projectId: string) => {
    try {
      console.log('📝 Criando/atualizando relatório único para projeto:', projectId);
      
      // Buscar dados do projeto
      const projectDocSnap = await getDoc(doc(db, 'projetos', projectId));
      
      if (!projectDocSnap.exists()) {
        throw new Error('Projeto não encontrado');
      }
      
      const projectData = projectDocSnap.data() as any;
      console.log('✅ Projeto encontrado:', projectData.nome);
      
      // Verificar permissões
      if (userData?.type === 'client' && projectData.clienteId !== userData.uid) {
        toast.error('Você não tem permissão para acessar este projeto');
        navigate('/client-projects');
        return;
      }

      const itensRelatorio: RelatorioItem[] = [];
      
      // Buscar módulos (compatibilidade com ambos os nomes)
      const modulesData = projectData.modules || projectData.weightedModules;
      
      // PROCESSAR MÓDULOS (Sistema NOVO com avaliação ponderada)
      if (modulesData && Array.isArray(modulesData) && modulesData.length > 0) {
        console.log('📊 Extraindo dados do sistema NOVO (modules):', modulesData.length, 'módulos');
        
        modulesData.forEach((module: any, modIndex: number) => {
          if (module.itens && Array.isArray(module.itens)) {
            module.itens.forEach((item: any, itemIndex: number) => {
              if (item.ncs && Array.isArray(item.ncs)) {
                item.ncs.forEach((nc: any, ncIndex: number) => {
                  const itemId = `mod${modIndex}_item${itemIndex}_nc${ncIndex}`;
                  
                  // Extrair situação atual, orientação e fotos das perguntas
                  const currentSituation = extractCurrentSituation(nc);
                  const clientGuidance = extractClientGuidance(nc);
                  const photos = extractPhotos(nc);
                  
                  console.log(`📝 NC "${nc.ncTitulo}": local="${(nc as any).local || 'A definir'}", situação="${currentSituation}", orientação="${clientGuidance}", fotos=${photos.length}`);
                  
                  itensRelatorio.push({
                    id: itemId,
                    category: module.titulo || `Módulo ${modIndex + 1}`,
                    itemTitle: item.titulo || `Item ${itemIndex + 1}`,
                    subItemId: nc.id || itemId,
                    subItemTitle: nc.ncTitulo || `NC ${nc.numero}`,
                    local: (nc as any).local || 'A definir',
                    currentSituation: currentSituation,
                    clientGuidance: clientGuidance,
                    responsible: (nc as any).responsavel || '',
                    whatWasDone: (nc as any).acaoRealizada || '',
                    startDate: (nc as any).dataInicio || '',
                    endDate: (nc as any).dataFim || '',
                    status: nc.status || 'pending',
                    evaluation: '',
                    photos: photos,
                    adequacyReported: (nc as any).adequacyReported || false,
                    adequacyStatus: nc.status || 'pending',
                    adequacyDetails: (nc as any).detalhes || '',
                    adequacyImages: (nc as any).adequacyImages || [],
                    adequacyDate: (nc as any).dataFim || '',
                    changesDescription: (nc as any).mudancas || '',
                    treatmentDeadline: (nc as any).prazo || '',
                    updatedAt: new Date().toISOString(),
                    updatedBy: userData?.uid || ''
                  });
                });
              }
            });
          }
        });
      }
      // PROCESSAR CUSTOM ACCORDIONS (Sistema ANTIGO)
      else if (projectData.customAccordions && Array.isArray(projectData.customAccordions)) {
        console.log('📊 Extraindo dados do sistema ANTIGO (customAccordions)');
        
        projectData.customAccordions.forEach((accordion: any) => {
          if (accordion.items && Array.isArray(accordion.items)) {
            accordion.items.forEach((item: any) => {
              if (item.subItems && Array.isArray(item.subItems)) {
                item.subItems.forEach((subItem: any) => {
                  itensRelatorio.push({
                    id: subItem.id,
                    category: accordion.title || 'Categoria não informada',
                    itemTitle: item.title || 'Item não informado',
                    subItemId: subItem.id,
                    subItemTitle: subItem.title || 'SubItem',
                    local: subItem.location || 'Local não informado',
                    currentSituation: subItem.currentSituation || '',
                    clientGuidance: subItem.clientGuidance || '',
                    responsible: subItem.responsible || '',
                    whatWasDone: subItem.whatWasDone || '',
                    startDate: subItem.startDate || '',
                    endDate: subItem.endDate || '',
                    status: subItem.status || 'pending',
                    evaluation: subItem.evaluation || '',
                    photos: Array.isArray(subItem.photos) 
                      ? subItem.photos.map((photo: any) => typeof photo === 'string' ? photo : photo?.url || '')
                      : [],
                    adequacyReported: subItem.adequacyReported || false,
                    adequacyStatus: subItem.adequacyStatus || 'pending',
                    adequacyDetails: subItem.adequacyDetails || '',
                    adequacyImages: subItem.adequacyImages || [],
                    adequacyDate: subItem.adequacyDate || '',
                    changesDescription: subItem.changesDescription || '',
                    treatmentDeadline: subItem.treatmentDeadline || '',
                    updatedAt: new Date().toISOString(),
                    updatedBy: userData?.uid || ''
                  });
                });
              }
            });
          }
        });
      } else {
        console.warn('⚠️ Projeto sem dados (nem modules nem customAccordions)');
        toast.warning('Este projeto não possui dados para gerar relatório');
        return;
      }

      // Calcular estatísticas
      const statistics = {
        totalItems: itensRelatorio.length,
        completedItems: itensRelatorio.filter(item => item.status === 'completed').length,
        pendingItems: itensRelatorio.filter(item => item.status === 'pending').length,
        inProgressItems: itensRelatorio.filter(item => item.status === 'in_progress').length
      };

      // Criar/atualizar documento ÚNICO do relatório
      const relatorioDoc: Relatorio = {
        id: projectId,
        projectId,
        projectName: projectData.nome || 'Projeto sem nome',
        clientId: projectData.clienteId || '',
        clientName: projectData.cliente?.nome || 'Cliente não informado',
        clientEmail: projectData.cliente?.email || '',
        itens: itensRelatorio,
        statistics,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userData?.uid || '',
        updatedBy: userData?.uid || ''
      };

      console.log('💾 Salvando relatório único:', {
        projectId,
        totalItens: itensRelatorio.length,
        statistics
      });

      // Salvar como documento ÚNICO (ID = projectId)
      await setDoc(doc(db, 'relatorios', projectId), relatorioDoc);
      
      console.log('✅ Relatório único criado/atualizado com sucesso!');
      toast.success(`Relatório criado com ${itensRelatorio.length} itens!`);
      
      // Carregar dados atualizados
      setRelatorios(itensRelatorio);
      setFilteredData(itensRelatorio);
      
      // Extrair categorias, artigos, locais, responsáveis
      const uniqueCategories = Array.from(new Set(itensRelatorio.map(item => item.category).filter(cat => cat && cat.trim() !== '')));
      setCategories(uniqueCategories.sort());
      
      const uniqueArticles = Array.from(new Set(itensRelatorio.map(item => item.itemTitle).filter(title => title && title.trim() !== '')));
      setArticles(uniqueArticles.sort());
      
      const uniqueLocals = Array.from(new Set(itensRelatorio.map(item => item.local).filter(local => local && local.trim() !== '')));
      setLocals(uniqueLocals.sort());
      
      const uniqueResponsibles = Array.from(new Set(itensRelatorio.map(item => item.responsible).filter(resp => resp && resp.trim() !== '')));
      setResponsibles(uniqueResponsibles.sort());
      
    } catch (error) {
      console.error('Erro ao criar/atualizar relatório:', error);
      toast.error('Erro ao processar relatório: ' + (error as Error).message);
    }
  };

  // Função auxiliar para extrair filtros dos dados
  const extractFiltersFromData = (data: RelatorioItem[]) => {
    // Categorias
    const uniqueCategories = Array.from(new Set(data.map(item => item.category).filter(cat => cat && cat.trim() !== '')));
    setCategories(uniqueCategories.sort());
    
    // Artigos
    const uniqueArticles = Array.from(new Set(data.map(item => item.itemTitle).filter(title => title && title.trim() !== '')));
    setArticles(uniqueArticles.sort());
    
    // Locais
    const uniqueLocals = Array.from(new Set(data.map(item => item.local).filter(local => local && local.trim() !== '')));
    setLocals(uniqueLocals.sort());
    
    // Responsáveis
    const uniqueResponsibles = Array.from(new Set(data.map(item => item.responsible).filter(resp => resp && resp.trim() !== '')));
    setResponsibles(uniqueResponsibles.sort());
  };

  // Função para atualizar relatório com novos dados do projeto
  const updateRelatorioFromProject = async (projectId: string) => {
    // Re-chamar a função principal que faz tudo
    await createOrUpdateRelatorio(projectId);
  };

  // ANTIGA FUNÇÃO (deprecada - manter apenas para referência)
  const createRelatoriosFromProject = async (projectId: string) => {
    // Evitar execuções simultâneas que causam duplicação
    if (isCreatingRelatorios) {
      console.log('Criação de relatórios já em andamento, ignorando chamada duplicada');
      return;
    }
    
    setIsCreatingRelatorios(true);
    try {
      // Buscar dados do projeto
      const { doc, getDoc, collection, addDoc, query, where, getDocs, updateDoc } = await import('firebase/firestore');
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

      // Primeiro, buscar relatórios existentes para este projeto
      const relatoriosCollection = collection(db, 'relatorios');
      let existingQuery;
      
      if (userData?.type === 'admin') {
        // Admin busca todos os relatórios do projeto
        existingQuery = query(
          relatoriosCollection,
          where('projectId', '==', projectId)
        );
      } else {
        // Cliente busca apenas seus próprios relatórios
        existingQuery = query(
          relatoriosCollection,
          where('projectId', '==', projectId),
          where('clientId', '==', userData?.uid)
        );
      }
      
      const existingSnapshot = await getDocs(existingQuery);
      
      // Criar um mapa dos relatórios existentes por subItemId
      const existingRelatorios = new Map<string, {id: string, data: any}>();
      existingSnapshot.forEach(doc => {
        const data = doc.data() as any;
        if (!data._deleted) { // Ignorar documentos deletados
          existingRelatorios.set(data.subItemId, { id: doc.id, data });
        }
      });

      const allRelatorios: RelatorioItem[] = [];
      let newItemsCount = 0;
      let updatedItemsCount = 0;
      
      // Debug: Verificar estrutura do projeto
      console.log('🔍 Estrutura do projeto:', {
        projectId,
        temModules: !!projectData.modules,
        temCustomAccordions: !!projectData.customAccordions,
        modulesLength: projectData.modules?.length || 0,
        customAccordionsLength: projectData.customAccordions?.length || 0,
        projectName: projectData.nome
      });
      
      // NOVO SISTEMA: Processar modules (avaliação ponderada)
      if (projectData.modules && Array.isArray(projectData.modules) && projectData.modules.length > 0) {
        console.log('📊 Processando sistema NOVO (modules com avaliação ponderada)');
        
        for (const module of projectData.modules) {
          if (module.itens && Array.isArray(module.itens)) {
            for (const item of module.itens) {
              if (item.ncs && Array.isArray(item.ncs)) {
                for (const nc of item.ncs) {
                  const ncId = `${module.id}_${item.id}_${nc.id}`;
                  
                  let relatorioItem: RelatorioItem = {
                    id: '',
                    projectId,
                    projectName: projectData.nome,
                    clientId: projectData.clienteId || '',
                    clientName: projectData.cliente?.nome || '',
                    clientEmail: projectData.cliente?.email || '',
                    category: module.titulo || 'Módulo não informado',
                    itemTitle: item.titulo || 'Item não informado',
                    subItemId: ncId,
                    subItemTitle: nc.titulo || `NC ${nc.numero}`,
                    local: nc.local || 'Local não informado',
                    currentSituation: nc.descricao || '',
                    clientGuidance: nc.orientacao || '',
                    responsible: nc.responsavel || '',
                    whatWasDone: nc.acaoRealizada || '',
                    startDate: nc.dataInicio || '',
                    endDate: nc.dataFim || '',
                    status: nc.status || 'pending',
                    evaluation: '',
                    photos: nc.fotos || [],
                    adequacyReported: nc.adequacyReported || false,
                    adequacyStatus: nc.status || 'pending',
                    adequacyDetails: nc.detalhes || '',
                    adequacyImages: nc.adequacyImages || [],
                    adequacyDate: nc.dataFim || '',
                    changesDescription: nc.mudancas || '',
                    treatmentDeadline: nc.prazo || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: userData?.uid || '',
                    updatedBy: userData?.uid || ''
                  };

                  const existingItem = existingRelatorios.get(ncId);
                  
                  if (existingItem) {
                    // PRESERVAR dados salvos pelo usuário
                    const preservedData = {
                      responsible: existingItem.data.responsible || relatorioItem.responsible,
                      whatWasDone: existingItem.data.whatWasDone || relatorioItem.whatWasDone,
                      startDate: existingItem.data.startDate || relatorioItem.startDate,
                      endDate: existingItem.data.endDate || relatorioItem.endDate,
                      status: existingItem.data.status || relatorioItem.status,
                      evaluation: existingItem.data.evaluation || relatorioItem.evaluation,
                      photos: existingItem.data.photos || relatorioItem.photos,
                      adequacyReported: existingItem.data.adequacyReported || relatorioItem.adequacyReported,
                      adequacyStatus: existingItem.data.adequacyStatus || relatorioItem.adequacyStatus,
                      adequacyDetails: existingItem.data.adequacyDetails || relatorioItem.adequacyDetails,
                      adequacyImages: existingItem.data.adequacyImages || relatorioItem.adequacyImages,
                      adequacyDate: existingItem.data.adequacyDate || relatorioItem.adequacyDate,
                      changesDescription: existingItem.data.changesDescription || relatorioItem.changesDescription,
                      treatmentDeadline: existingItem.data.treatmentDeadline || relatorioItem.treatmentDeadline,
                      
                      // Campos atualizáveis do projeto
                      projectName: relatorioItem.projectName,
                      clientName: relatorioItem.clientName,
                      clientEmail: relatorioItem.clientEmail,
                      category: relatorioItem.category,
                      itemTitle: relatorioItem.itemTitle,
                      subItemTitle: relatorioItem.subItemTitle,
                      local: relatorioItem.local,
                      currentSituation: relatorioItem.currentSituation,
                      clientGuidance: relatorioItem.clientGuidance,
                      
                      id: existingItem.id,
                      projectId: relatorioItem.projectId,
                      clientId: relatorioItem.clientId,
                      subItemId: relatorioItem.subItemId,
                      createdAt: existingItem.data.createdAt,
                      updatedAt: new Date().toISOString(),
                      createdBy: existingItem.data.createdBy || relatorioItem.createdBy,
                      updatedBy: userData?.uid || ''
                    };
                    
                    const docRef = doc(db, 'relatorios', existingItem.id);
                    await updateDoc(docRef, preservedData);
                    
                    allRelatorios.push({ ...preservedData } as RelatorioItem);
                    updatedItemsCount++;
                  } else {
                    // Criar novo
                    const docRef = await addDoc(relatoriosCollection, relatorioItem);
                    relatorioItem.id = docRef.id;
                    allRelatorios.push(relatorioItem);
                    newItemsCount++;
                  }
                }
              }
            }
          }
        }
        
        console.log(`✅ Sistema NOVO processado: ${newItemsCount} novos, ${updatedItemsCount} atualizados`);
      }
      // SISTEMA ANTIGO: Processar customAccordions
      else if (projectData.customAccordions) {
        console.log('📊 Processando sistema ANTIGO (customAccordions)');
        
        for (const accordion of projectData.customAccordions) {
          if (accordion.items) {
            for (const item of accordion.items) {
              if (item.subItems) {
                for (const subItem of item.subItems) {
                  let relatorioItem: RelatorioItem = {
                    id: '', // Será preenchido conforme necessário
                    projectId,
                    projectName: projectData.nome,
                    clientId: projectData.clienteId || '',
                    clientName: projectData.cliente?.nome || '',
                    clientEmail: projectData.cliente?.email || '',
                    category: accordion.title || 'Categoria não informada',
                    itemTitle: item.title,
                    subItemId: subItem.id,
                    subItemTitle: subItem.title,
                    local: subItem.location || 'Local não informado',
                    currentSituation: subItem.currentSituation || '',
                    clientGuidance: subItem.clientGuidance || '',
                    responsible: subItem.responsible || '',
                    whatWasDone: subItem.whatWasDone || '',
                    startDate: subItem.startDate || '',
                    endDate: subItem.endDate || '',
                    status: subItem.status || 'pending',
                    evaluation: subItem.evaluation || '',
                    photos: Array.isArray(subItem.photos) 
                      ? subItem.photos.map(photo => typeof photo === 'string' ? photo : (photo as any)?.url || '')
                      : [],
                    adequacyReported: subItem.adequacyReported || false,
                    adequacyStatus: subItem.adequacyStatus || 'pending',
                    adequacyDetails: subItem.adequacyDetails || '',
                    adequacyImages: subItem.adequacyImages || [],
                    adequacyDate: subItem.adequacyDate || '',
                    changesDescription: subItem.changesDescription || '',
                    treatmentDeadline: subItem.treatmentDeadline || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: userData?.uid || '',
                    updatedBy: userData?.uid || ''
                  };

                  // Verificar se já existe um relatório para este subItemId
                  const existingItem = existingRelatorios.get(subItem.id);
                  
                  if (existingItem) {
                    // PRESERVAR dados salvos pelo usuário e apenas atualizar campos básicos
                    const preservedData = {
                      // Campos que devem ser preservados (dados do usuário)
                      responsible: existingItem.data.responsible || relatorioItem.responsible,
                      whatWasDone: existingItem.data.whatWasDone || relatorioItem.whatWasDone,
                      startDate: existingItem.data.startDate || relatorioItem.startDate,
                      endDate: existingItem.data.endDate || relatorioItem.endDate,
                      status: existingItem.data.status || relatorioItem.status,
                      evaluation: existingItem.data.evaluation || relatorioItem.evaluation,
                      photos: existingItem.data.photos || relatorioItem.photos,
                      adequacyReported: existingItem.data.adequacyReported || relatorioItem.adequacyReported,
                      adequacyStatus: existingItem.data.adequacyStatus || relatorioItem.adequacyStatus,
                      adequacyDetails: existingItem.data.adequacyDetails || relatorioItem.adequacyDetails,
                      adequacyImages: existingItem.data.adequacyImages || relatorioItem.adequacyImages,
                      adequacyDate: existingItem.data.adequacyDate || relatorioItem.adequacyDate,
                      changesDescription: existingItem.data.changesDescription || relatorioItem.changesDescription,
                      treatmentDeadline: existingItem.data.treatmentDeadline || relatorioItem.treatmentDeadline,
                      
                      // Campos que podem ser atualizados do projeto
                      projectName: relatorioItem.projectName,
                      clientName: relatorioItem.clientName,
                      clientEmail: relatorioItem.clientEmail,
                      category: relatorioItem.category,
                      itemTitle: relatorioItem.itemTitle,
                      subItemTitle: relatorioItem.subItemTitle,
                      local: relatorioItem.local,
                      currentSituation: relatorioItem.currentSituation,
                      clientGuidance: relatorioItem.clientGuidance,
                      
                      // Metadados
                      id: existingItem.id,
                      projectId: relatorioItem.projectId,
                      clientId: relatorioItem.clientId,
                      subItemId: relatorioItem.subItemId,
                      createdAt: existingItem.data.createdAt,
                      updatedAt: new Date().toISOString(),
                      createdBy: existingItem.data.createdBy || relatorioItem.createdBy,
                      updatedBy: userData?.uid || ''
                    };
                    
                    // Atualizar no Firebase
                    const docRef = doc(db, 'relatorios', existingItem.id);
                    await updateDoc(docRef, preservedData);
                    
                    // Usar dados preservados para o estado local
                    relatorioItem = { ...relatorioItem, ...preservedData };
                    updatedItemsCount++;
                  } else {
                    // Verificação dupla para evitar duplicação por condição de corrida
                    // Buscar novamente especificamente por este subItemId antes de criar
                    const doubleCheckQuery = query(
                      relatoriosCollection,
                      where('projectId', '==', projectId),
                      where('subItemId', '==', subItem.id),
                      where('clientId', '==', userData?.uid)
                    );
                    const doubleCheckSnapshot = await getDocs(doubleCheckQuery);
                    
                    if (!doubleCheckSnapshot.empty) {
                      // Item foi criado por outro processo, preservar dados existentes
                      const existingDoc = doubleCheckSnapshot.docs[0];
                      const existingData = existingDoc.data();
                      
                      // Preservar dados do usuário
                      const preservedData = {
                        // Campos que devem ser preservados (dados do usuário)
                        responsible: existingData.responsible || relatorioItem.responsible,
                        whatWasDone: existingData.whatWasDone || relatorioItem.whatWasDone,
                        startDate: existingData.startDate || relatorioItem.startDate,
                        endDate: existingData.endDate || relatorioItem.endDate,
                        status: existingData.status || relatorioItem.status,
                        evaluation: existingData.evaluation || relatorioItem.evaluation,
                        photos: existingData.photos || relatorioItem.photos,
                        adequacyReported: existingData.adequacyReported || relatorioItem.adequacyReported,
                        adequacyStatus: existingData.adequacyStatus || relatorioItem.adequacyStatus,
                        adequacyDetails: existingData.adequacyDetails || relatorioItem.adequacyDetails,
                        adequacyImages: existingData.adequacyImages || relatorioItem.adequacyImages,
                        adequacyDate: existingData.adequacyDate || relatorioItem.adequacyDate,
                        changesDescription: existingData.changesDescription || relatorioItem.changesDescription,
                        treatmentDeadline: existingData.treatmentDeadline || relatorioItem.treatmentDeadline,
                        
                        // Campos que podem ser atualizados do projeto
                        projectName: relatorioItem.projectName,
                        clientName: relatorioItem.clientName,
                        clientEmail: relatorioItem.clientEmail,
                        category: relatorioItem.category,
                        itemTitle: relatorioItem.itemTitle,
                        subItemTitle: relatorioItem.subItemTitle,
                        local: relatorioItem.local,
                        currentSituation: relatorioItem.currentSituation,
                        clientGuidance: relatorioItem.clientGuidance,
                        
                        // Metadados
                        id: existingDoc.id,
                        projectId: relatorioItem.projectId,
                        clientId: relatorioItem.clientId,
                        subItemId: relatorioItem.subItemId,
                        createdAt: existingData.createdAt,
                        updatedAt: new Date().toISOString(),
                        createdBy: existingData.createdBy || relatorioItem.createdBy,
                        updatedBy: userData?.uid || ''
                      };
                      
                      const docRef = doc(db, 'relatorios', existingDoc.id);
                      await updateDoc(docRef, preservedData);
                      
                      relatorioItem = { ...relatorioItem, ...preservedData };
                      updatedItemsCount++;
                      console.log(`⚠️ Duplicação evitada para subItemId: ${subItem.id}`);
                    } else {
                      // Realmente criar novo item
                      const docRef = await addDoc(relatoriosCollection, relatorioItem);
                      relatorioItem.id = docRef.id;
                      newItemsCount++;
                    }
                  }
                  
                  allRelatorios.push(relatorioItem);
                }
              }
            }
          }
        }
        
        console.log(`✅ Sistema ANTIGO processado: ${newItemsCount} novos, ${updatedItemsCount} atualizados`);
      } else {
        console.log('⚠️ Nenhum dado encontrado no projeto (nem modules nem customAccordions)');
        toast.warning('Este projeto não possui dados para gerar relatório');
      }
      
      // Atualizar estado
      setRelatorios(allRelatorios);
      setFilteredData(allRelatorios);
      
      // Extrair e ordenar categorias
      const uniqueCategories = Array.from(new Set(allRelatorios.map(item => item.category).filter(cat => cat && cat.trim() !== '')));
      const sortedCategories = uniqueCategories.sort((a, b) => {
        // Ordem específica das categorias
        const categoryOrder = [
          'DOCUMENTAÇÃO PRELIMINAR',
          'ESTUDO DE AVALIAÇÃO DE RISCOS (EAR)',
          'PLANO DE SEGURANÇA PORTUÁRIA (PSP)',
          'SEGURANÇA',
          'COMUNICAÇÕES E TECNOLOGIA DA INFORMAÇÃO (TI)',
          '6.1 - Descrever detalhadamente',
          'OUTROS ITENS JULGADOS NECESSÁRIOS'
        ];
        
        const aIndex = categoryOrder.indexOf(a);
        const bIndex = categoryOrder.indexOf(b);
        
        // Se ambos estão na lista de ordem, usar a ordem definida
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        // Se apenas um está na lista, priorizar o que está na lista
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        // Se nenhum está na lista, ordenar alfabeticamente
        return a.localeCompare(b);
      });
      setCategories(sortedCategories);
      
      // Extrair e ordenar artigos
      const uniqueArticles = Array.from(new Set(allRelatorios.map(item => item.itemTitle).filter(title => title && title.trim() !== '')));
      const sortedArticles = uniqueArticles.sort((a, b) => {
        // Extrair números dos artigos (ex: "1.1", "1.2", "2.1")
        const parseArticleNumber = (title: string) => {
          const match = title.match(/^(\d+)\.(\d+)/);
          if (match) {
            return [parseInt(match[1]), parseInt(match[2])];
          }
          return [0, 0];
        };
        
        const [aMain, aSub] = parseArticleNumber(a);
        const [bMain, bSub] = parseArticleNumber(b);
        
        if (aMain !== bMain) return aMain - bMain;
        return aSub - bSub;
      });
      setArticles(sortedArticles);
      
      // Extrair locais
      const uniqueLocals = Array.from(new Set(allRelatorios.map(item => item.local).filter(local => local && local.trim() !== '')));
      setLocals(uniqueLocals);
      
      // Extrair responsáveis
      const uniqueResponsibles = Array.from(new Set(allRelatorios.map(item => item.responsible).filter(resp => resp && resp.trim() !== '')));
      setResponsibles(uniqueResponsibles);
      
      // Mostrar mensagem de sucesso com detalhes
      if (newItemsCount > 0 && updatedItemsCount > 0) {
        toast.success(`${newItemsCount} novos itens criados e ${updatedItemsCount} itens atualizados!`);
      } else if (newItemsCount > 0) {
        toast.success(`${newItemsCount} relatórios criados com sucesso!`);
      } else if (updatedItemsCount > 0) {
        toast.success(`${updatedItemsCount} relatórios atualizados com sucesso!`);
      } else {
        toast.info('Todos os relatórios já estão atualizados.');
      }
      
    } catch (error) {
      console.error('Erro ao criar/atualizar relatórios:', error);
      toast.error('Erro ao processar relatórios: ' + (error as Error).message);
    } finally {
      setIsCreatingRelatorios(false);
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
      
      // 2. Criar mapa dos relatórios existentes por subItemId
      const existingRelatoriosMap = new Map<string, RelatorioItem>();
      existingRelatorios.forEach(relatorio => {
        existingRelatoriosMap.set(relatorio.subItemId, relatorio);
      });
      
      // 3. Verificar se há novos itens no projeto
      const newItems: RelatorioItem[] = [];
      
      if (projectData.customAccordions) {
        for (const accordion of projectData.customAccordions) {
          if (accordion.items) {
            for (const item of accordion.items) {
              if (item.subItems) {
                for (const subItem of item.subItems) {
                  // Verificar se já existe relatório para este subItem
                  if (!existingRelatoriosMap.has(subItem.id)) {
                    console.log(`🆕 SYNC: Novo item encontrado: ${subItem.id}`);
                    
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
                      local: subItem.location || 'Local não informado',
                      currentSituation: subItem.currentSituation || '',
                      clientGuidance: subItem.clientGuidance || '',
                      responsible: subItem.responsible || '',
                      whatWasDone: subItem.whatWasDone || '',
                      startDate: subItem.startDate || '',
                      endDate: subItem.endDate || '',
                      status: subItem.status || 'pending',
                      evaluation: subItem.evaluation || '',
                      photos: Array.isArray(subItem.photos) 
                        ? subItem.photos.map(photo => typeof photo === 'string' ? photo : (photo as any)?.url || '')
                        : [],
                      adequacyReported: subItem.adequacyReported || false,
                      adequacyStatus: subItem.adequacyStatus || 'pending',
                      adequacyDetails: subItem.adequacyDetails || '',
                      adequacyImages: subItem.adequacyImages || [],
                      adequacyDate: subItem.adequacyDate || '',
                      changesDescription: subItem.changesDescription || '',
                      treatmentDeadline: subItem.treatmentDeadline || '',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      createdBy: userData?.uid || '',
                      updatedBy: userData?.uid || ''
                    };
                    
                    newItems.push(newRelatorioItem);
                  }
                }
              }
            }
          }
        }
      }
      
      // 4. Salvar novos itens
      if (newItems.length > 0) {
        console.log(`💾 SYNC: Salvando ${newItems.length} novos itens...`);
        const relatoriosRef = collection(db, 'relatorios');
        
        for (const newItem of newItems) {
          const docRef = await addDoc(relatoriosRef, newItem);
          newItem.id = docRef.id;
        }
        
        // 5. Atualizar estado local
        const updatedRelatorios = [...existingRelatorios, ...newItems];
        setRelatorios(updatedRelatorios);
        setFilteredData(updatedRelatorios);
        
        console.log(`✅ SYNC: ${newItems.length} novos itens sincronizados`);
        toast.success(`${newItems.length} novos itens sincronizados do projeto!`);
      } else {
        console.log('✅ SYNC: Nenhum novo item encontrado');
      }
      
    } catch (error) {
      console.error('❌ SYNC: Erro ao sincronizar:', error);
      toast.error('Erro ao sincronizar novos itens');
    }
  };

  // Atualizar dados existentes com informações do projeto
  const updateExistingRelatoriosFromProject = async (projectId: string, existingRelatorios: RelatorioItem[]) => {
    try {
      console.log('🔄 UPDATE: Atualizando dados existentes com informações do projeto...');
      
      const { doc, getDoc, updateDoc } = await import('firebase/firestore');
      
      // 1. Buscar dados atuais do projeto
      const projectRef = doc(db, 'projetos', projectId);
      const projectSnap = await getDoc(projectRef);
      
      if (!projectSnap.exists()) {
        console.log('❌ UPDATE: Projeto não encontrado');
        return;
      }
      
      const projectData = projectSnap.data();
      
      // 2. Criar mapa dos dados do projeto por subItemId
      const projectDataMap = new Map<string, any>();
      
      if (projectData.customAccordions) {
        for (const accordion of projectData.customAccordions) {
          if (accordion.items) {
            for (const item of accordion.items) {
              if (item.subItems) {
                for (const subItem of item.subItems) {
                  projectDataMap.set(subItem.id, {
                    location: subItem.location || '',
                    currentSituation: subItem.currentSituation || '',
                    clientGuidance: subItem.clientGuidance || '',
                    evaluation: subItem.evaluation || '',
                    photos: Array.isArray(subItem.photos) 
                      ? subItem.photos.map(photo => typeof photo === 'string' ? photo : (photo as any)?.url || '')
                      : []
                  });
                }
              }
            }
          }
        }
      }
      
      // 3. Atualizar relatórios existentes
      let updatedCount = 0;
      
      for (const relatorio of existingRelatorios) {
        const projectSubItem = projectDataMap.get(relatorio.subItemId);
        
        if (projectSubItem) {
          // Verificar se há diferenças que precisam ser atualizadas
          const needsUpdate = 
            relatorio.local !== projectSubItem.location ||
            relatorio.currentSituation !== projectSubItem.currentSituation ||
            relatorio.clientGuidance !== projectSubItem.clientGuidance ||
            relatorio.evaluation !== projectSubItem.evaluation ||
            JSON.stringify(relatorio.photos) !== JSON.stringify(projectSubItem.photos);
          
          if (needsUpdate) {
            console.log(`🔄 UPDATE: Atualizando relatório ${relatorio.id} (${relatorio.subItemTitle})`);
            
            const updateData = {
              local: projectSubItem.location,
              currentSituation: projectSubItem.currentSituation,
              clientGuidance: projectSubItem.clientGuidance,
              evaluation: projectSubItem.evaluation,
              photos: projectSubItem.photos,
              updatedAt: new Date().toISOString(),
              updatedBy: userData?.uid || ''
            };
            
            try {
              const docRef = doc(db, 'relatorios', relatorio.id);
              await updateDoc(docRef, updateData);
              updatedCount++;
              
              // Atualizar também o estado local
              setRelatorios(prev => prev.map(item => 
                item.id === relatorio.id 
                  ? { ...item, ...updateData }
                  : item
              ));
              setFilteredData(prev => prev.map(item => 
                item.id === relatorio.id 
                  ? { ...item, ...updateData }
                  : item
              ));
            } catch (error) {
              console.error(`❌ UPDATE: Erro ao atualizar relatório ${relatorio.id}:`, error);
            }
          }
        }
      }
      
      if (updatedCount > 0) {
        console.log(`✅ UPDATE: ${updatedCount} relatórios atualizados com dados do projeto`);
        toast.success(`${updatedCount} relatórios atualizados com dados do projeto!`);
      } else {
        console.log('✅ UPDATE: Nenhum relatório precisava ser atualizado');
      }
      
    } catch (error) {
      console.error('❌ UPDATE: Erro ao atualizar relatórios existentes:', error);
    }
  };

  // Remover relatórios duplicados
  const removeDuplicateRelatorios = async (projectId: string) => {
    try {
      console.log('🧹 Verificando duplicatas...');
      
      const { collection, query, where, getDocs, deleteDoc } = await import('firebase/firestore');
      const relatoriosRef = collection(db, 'relatorios');
      
      // Buscar todos os relatórios do projeto
      const q = query(
        relatoriosRef,
        where('projectId', '==', projectId),
        where('clientId', '==', userData?.uid)
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
        toast.success(`${duplicatesToRemove.length} itens duplicados removidos!`);
        
        // Recarregar dados
        await loadRelatorioByProject(projectId);
      } else {
        console.log('✅ Nenhuma duplicata encontrada');
      }
      
    } catch (error) {
      console.error('❌ Erro ao remover duplicatas:', error);
      toast.error('Erro ao remover duplicatas');
    }
  };

  const loadRelatorioByProject = async (projectId: string) => {
    try {
      setLoading(true);
      
      console.log('📊 Carregando relatório do projeto:', projectId);
      
      // Tentar carregar relatório único do Firebase (nova estrutura)
      const relatorioExistente = await loadRelatorioFromFirebase(projectId);
      
      if (relatorioExistente && relatorioExistente.itens && relatorioExistente.itens.length > 0) {
        console.log('✅ Carregando relatório da NOVA estrutura:', relatorioExistente.itens.length, 'itens');
        
        const sortedData = sortRelatorios(relatorioExistente.itens);
        setRelatorios(sortedData);
        setFilteredData(sortedData);
        
        // Extrair e ordenar categorias
        const uniqueCategories = Array.from(new Set(sortedData.map(item => item.category).filter(cat => cat && cat.trim() !== '')));
        const sortedCategories = uniqueCategories.sort((a, b) => {
          // Ordem específica das categorias
          const categoryOrder = [
            'DOCUMENTAÇÃO PRELIMINAR',
            'ESTUDO DE AVALIAÇÃO DE RISCOS (EAR)',
            'PLANO DE SEGURANÇA PORTUÁRIA (PSP)',
            'SEGURANÇA',
            'COMUNICAÇÕES E TECNOLOGIA DA INFORMAÇÃO (TI)',
            '6.1 - Descrever detalhadamente',
            'OUTROS ITENS JULGADOS NECESSÁRIOS'
          ];
          
          const aIndex = categoryOrder.indexOf(a);
          const bIndex = categoryOrder.indexOf(b);
          
          // Se ambos estão na lista de ordem, usar a ordem definida
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
          // Se apenas um está na lista, priorizar o que está na lista
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          // Se nenhum está na lista, ordenar alfabeticamente
          return a.localeCompare(b);
        });
        setCategories(sortedCategories);
        
        // Extrair e ordenar artigos
        const uniqueArticles = Array.from(new Set(sortedData.map(item => item.itemTitle).filter(title => title && title.trim() !== '')));
        setArticles(uniqueArticles.sort());
        
        // Extrair locais
        const uniqueLocals = Array.from(new Set(sortedData.map(item => item.local).filter(local => local && local.trim() !== '')));
        setLocals(uniqueLocals.sort());
        
        // Extrair responsáveis
        const uniqueResponsibles = Array.from(new Set(sortedData.map(item => item.responsible).filter(resp => resp && resp.trim() !== '')));
        setResponsibles(uniqueResponsibles.sort());
        
        return; // Dados já carregados
      }
      
      // Se não há relatório, criar novo baseado no projeto
      console.log('📄 Nenhum relatório encontrado, criando novo...');
      await createOrUpdateRelatorio(projectId);
      
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
      // 1. Ordenar por categoria (ordem específica)
      const categoryOrder = [
        'DOCUMENTAÇÃO PRELIMINAR',
        'ESTUDO DE AVALIAÇÃO DE RISCOS (EAR)',
        'PLANO DE SEGURANÇA PORTUÁRIA (PSP)',
        'SEGURANÇA',
        'COMUNICAÇÕES E TECNOLOGIA DA INFORMAÇÃO (TI)',
        '6.1 - Descrever detalhadamente',
        'OUTROS ITENS JULGADOS NECESSÁRIOS'
      ];
      
      const aCategoryIndex = categoryOrder.indexOf(a.category);
      const bCategoryIndex = categoryOrder.indexOf(b.category);
      
      // Se ambos estão na lista de ordem, usar a ordem definida
      if (aCategoryIndex !== -1 && bCategoryIndex !== -1) {
        if (aCategoryIndex !== bCategoryIndex) {
          return aCategoryIndex - bCategoryIndex;
        }
      } else if (aCategoryIndex !== -1) {
        return -1; // a vem primeiro
      } else if (bCategoryIndex !== -1) {
        return 1; // b vem primeiro
      } else {
        // Se nenhum está na lista, ordenar alfabeticamente
        const categoryCompare = a.category.localeCompare(b.category);
        if (categoryCompare !== 0) return categoryCompare;
      }
      
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

    // Filtro de artigo
    if (articleFilter !== 'all') {
      filtered = filtered.filter(item => item.itemTitle === articleFilter);
    }

    // Filtro de local
    if (localFilter !== 'all') {
      filtered = filtered.filter(item => item.local === localFilter);
    }

    // Filtro de responsável
    if (responsibleFilter !== 'all') {
      filtered = filtered.filter(item => item.responsible === responsibleFilter);
    }

    // Aplicar ordenação
    filtered = sortRelatorios(filtered);

    setFilteredData(filtered);
  };

  // Estado para mudanças locais (como Excel)
  const [localChanges, setLocalChanges] = useState<{[key: string]: Partial<RelatorioItem>}>({});
  const [saving, setSaving] = useState(false);
  
  // Log mudanças importantes apenas
  React.useEffect(() => {
    const changeCount = Object.keys(localChanges).length;
    if (changeCount > 0) {
      console.log('📊 Mudanças pendentes:', changeCount);
    }
  }, [localChanges]);
  


  // Função para atualizar valores localmente
  const updateLocalValue = async (itemId: string, field: string, value: any) => {
    const item = relatorios.find(i => i.id === itemId);
    if (!item) {
      console.error(`❌ Item não encontrado: ${itemId}`);
      return;
    }

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
    const localValue = localChanges[item.id]?.[field];
    const originalValue = item[field];
    const finalValue = localValue ?? originalValue;
    
    // Para campos específicos, garantir valores padrão
    if (field === 'adequacyStatus' && (!finalValue || finalValue === '')) {
      return 'pending';
    }
    if (field === 'status' && (!finalValue || finalValue === '')) {
      return 'pending';
    }
    
    // Debug: verificar se há valores vazios sendo retornados
    if (finalValue === '' || finalValue === null || finalValue === undefined) {
      console.warn(`⚠️ Valor vazio detectado para campo ${field} no item ${item.id}:`, finalValue);
    }
    
    return finalValue ?? '';
  };

  // Função para validar se cliente pode alterar adequacyStatus
  const canChangeAdequacyStatus = (item: RelatorioItem) => {
    const responsible = getValue(item, 'responsible') as string;
    const changesDescription = getValue(item, 'changesDescription') as string;
    
    return item.adequacyReported && responsible.trim() !== '' && changesDescription.trim() !== '';
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

  // Função para salvar alterações diretamente na coleção 'relatorios' - COM LOGS DETALHADOS
  const saveAllChanges = async () => {
    console.log('🚀 INICIANDO SALVAMENTO...');
                  console.log('📋 Local changes:', localChanges);
              console.log('👤 User data:', { uid: userData?.uid, type: userData?.type });
              
              if (Object.keys(localChanges).length === 0) {
                console.log('❌ Nenhuma alteração para salvar');
                toast.info('Nenhuma alteração para salvar');
                return;
              }

    if (!projectId) {
      toast.error('ID do projeto não encontrado');
      return;
    }

    setSaving(true);
    try {
      // Carregar o documento único do relatório
      const relatorioDoc = await getDoc(doc(db, 'relatorios', projectId));
      
      if (!relatorioDoc.exists()) {
        console.error('❌ Documento de relatório não encontrado!');
        toast.error('Relatório não encontrado');
        return;
      }

      const relatorioData = relatorioDoc.data() as Relatorio;
      console.log('✅ Relatório carregado:', relatorioData.itens.length, 'itens');

      // Aplicar as mudanças locais aos itens
      const itensAtualizados = relatorioData.itens.map(item => {
        const mudancas = localChanges[item.id];
        if (mudancas) {
          console.log(`🔄 Aplicando mudanças ao item ${item.id}`);
          return {
            ...item,
            ...mudancas,
            updatedAt: new Date().toISOString(),
            updatedBy: userData?.uid || ''
          };
        }
        return item;
      });

      // Recalcular estatísticas
      const statistics = {
        totalItems: itensAtualizados.length,
        completedItems: itensAtualizados.filter(item => item.status === 'completed').length,
        pendingItems: itensAtualizados.filter(item => item.status === 'pending').length,
        inProgressItems: itensAtualizados.filter(item => item.status === 'in_progress').length
      };

      // Atualizar documento único
      const relatorioAtualizado: Relatorio = {
        ...relatorioData,
        itens: itensAtualizados,
        statistics,
        updatedAt: new Date().toISOString(),
        updatedBy: userData?.uid || ''
      };

      console.log('💾 Salvando documento único com mudanças...');
      await setDoc(doc(db, 'relatorios', projectId), relatorioAtualizado);

      console.log('✅ Mudanças salvas com sucesso!');
      toast.success(`${Object.keys(localChanges).length} alterações salvas com sucesso!`);

      // Limpar mudanças locais
      setLocalChanges({});
      
      // Atualizar estado local
      setRelatorios(itensAtualizados);
      setFilteredData(itensAtualizados);

    } catch (error) {
      console.error('❌ Erro ao salvar mudanças:', error);
      toast.error('Erro ao salvar mudanças: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // ANTIGA FUNÇÃO DE SALVAMENTO (deprecada)
  const saveAllChangesOld = async () => {
              const validChanges: typeof localChanges = {};
              const invalidItems: string[] = [];
              
              for (const [itemId, changes] of Object.entries(localChanges)) {
                try {
                  const docRef = doc(db, 'relatorios', itemId);
                  const docSnap = await getDoc(docRef);
                  
                  if (!docSnap.exists()) {
                    console.warn(`⚠️ Documento ${itemId} não existe, removendo do localChanges`);
                    invalidItems.push(itemId);
                    continue;
                  }
                  
                  const docData = docSnap.data();
                  if (docData.clientId !== userData?.uid && userData?.type !== 'admin') {
                    console.warn(`⚠️ Documento ${itemId} com clientId incorreto (${docData.clientId}), removendo do localChanges`);
                    invalidItems.push(itemId);
                    continue;
                  }
                  
                  validChanges[itemId] = changes;
                } catch (error) {
                  console.warn(`⚠️ Erro ao verificar documento ${itemId}:`, error);
                  invalidItems.push(itemId);
                }
              }
              
              // Remover itens inválidos do estado local
              if (invalidItems.length > 0) {
                console.log(`🧹 Removendo ${invalidItems.length} itens inválidos do localChanges`);
                setRelatorios(prev => prev.filter(item => !invalidItems.includes(item.id)));
                
                const newLocalChanges = { ...localChanges };
                invalidItems.forEach(itemId => delete newLocalChanges[itemId]);
                setLocalChanges(newLocalChanges);
              }
              
              if (Object.keys(validChanges).length === 0) {
                console.log('❌ Nenhuma alteração válida para salvar após filtro');
                toast.info('Nenhuma alteração válida para salvar');
                return;
              }

    setSaving(true);
    try {
                      const { doc, updateDoc, getDoc } = await import('firebase/firestore');
      
                      console.log(`💾 Salvando ${Object.keys(validChanges).length} item(s)...`);
                
                // Salvar cada item alterado
                const promises = Object.entries(validChanges).map(async ([itemId, changes]) => {
                  console.log(`📝 Salvando item ${itemId}:`, changes);
                  
                  const docRef = doc(db, 'relatorios', itemId);
                  const updateData = {
                    ...changes,
                    updatedAt: new Date().toISOString(),
                    updatedBy: userData?.uid || ''
                  };
                  
                  console.log(`🔄 Update data para ${itemId}:`, updateData);

                  try {
                    // Verificar se o documento existe e se o usuário tem permissão
                    const docSnap = await getDoc(docRef);
                    if (!docSnap.exists()) {
                      console.error(`❌ Documento ${itemId} não existe!`);
                      return { itemId, changes, success: false, error: new Error('Documento não existe') };
                    }
                    
                    const docData = docSnap.data();
                    if (docData.clientId !== userData?.uid && userData?.type !== 'admin') {
                      console.error(`❌ Usuário ${userData?.uid} não tem permissão para documento ${itemId} (clientId: ${docData.clientId})`);
                      
                      // Tentar corrigir o clientId do documento problemático
                      try {
                        console.log(`🔄 Tentando corrigir clientId do documento ${itemId}...`);
                        await updateDoc(docRef, { 
                          clientId: userData?.uid,
                          updatedAt: new Date().toISOString(),
                          updatedBy: userData?.uid || ''
                        });
                        console.log(`✅ ClientId corrigido para documento ${itemId}`);
                        
                        // Agora tentar salvar novamente
                        await updateDoc(docRef, updateData);
                        console.log(`✅ Item ${itemId} salvo com sucesso após correção!`);
                        return { itemId, changes, success: true };
                      } catch (correctionError) {
                        console.error(`❌ Falha ao corrigir documento ${itemId}:`, correctionError);
                        return { itemId, changes, success: false, error: new Error('Permissão negada') };
                      }
                    }
                    
                    await updateDoc(docRef, updateData);
                    console.log(`✅ Item ${itemId} salvo com sucesso!`);
                    return { itemId, changes, success: true };
                  } catch (itemError) {
                    console.error(`❌ Erro ao salvar item ${itemId}:`, itemError);
                    return { itemId, changes, success: false, error: itemError };
                  }
                });
      
      const results = await Promise.all(promises);
      console.log('📊 Resultados do salvamento:', results);
      
                      // Verificar se houve erros
                const failedSaves = results.filter(r => !r.success);
                if (failedSaves.length > 0) {
                  console.error('❌ Itens que falharam ao salvar:', failedSaves);
                  
                                     // Tentar corrigir documentos com problemas de permissão
                   for (const failedSave of failedSaves) {
                     if (failedSave.error?.message === 'Permissão negada' || failedSave.error?.message === 'Documento não existe') {
                       console.log(`🔄 Tentando corrigir documento problemático: ${failedSave.itemId}`);
                       
                       // Tentar forçar a remoção do documento problemático
                       try {
                         const { deleteDoc, doc } = await import('firebase/firestore');
                         const docRef = doc(db, 'relatorios', failedSave.itemId);
                         await deleteDoc(docRef);
                         console.log(`🗑️ Documento problemático ${failedSave.itemId} removido com sucesso`);
                       } catch (deleteError) {
                         console.warn(`⚠️ Não foi possível remover documento ${failedSave.itemId}:`, deleteError);
                       }
                       
                       // Remover do localChanges para evitar tentativas futuras
                       const newLocalChanges = { ...localChanges };
                       delete newLocalChanges[failedSave.itemId];
                       setLocalChanges(newLocalChanges);
                       
                       // Remover do estado local se existir
                       setRelatorios(prev => prev.filter(item => item.id !== failedSave.itemId));
                     }
                   }
                  
                  // Se ainda há erros após correção, mostrar erro
                  const remainingErrors = failedSaves.filter(r => 
                    r.error?.message !== 'Permissão negada' && 
                    r.error?.message !== 'Documento não existe'
                  );
                  
                  if (remainingErrors.length > 0) {
                    throw new Error(`Falha ao salvar ${remainingErrors.length} item(s)`);
                  }
                }

                      const successfulSaves = results.filter(r => r.success).length;
                const totalItems = results.length;
                console.log(`✅ ${successfulSaves}/${totalItems} itens salvos com sucesso!`);
      
                      // Atualizar dados locais
                const updatedRelatorios = relatorios.map(item => 
                  validChanges[item.id] ? { ...item, ...validChanges[item.id] } : item
                );
      
                      console.log('🔄 Atualizando estado local após salvamento:', {
                  relatoriosAntigos: relatorios.length,
                  relatoriosNovos: updatedRelatorios.length,
                  mudancasSalvas: Object.keys(validChanges),
                  exemploAtualizacao: updatedRelatorios.find(r => validChanges[r.id])
                });
      
      setRelatorios(updatedRelatorios);
      
      // Aplicar filtros novamente
      const filtered = updatedRelatorios.filter(item => {
        const matchesSearch = searchTerm === '' || 
          item.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.subItemTitle.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        
        return matchesSearch && matchesCategory && matchesStatus;
      });
      
      setFilteredData(filtered);
      console.log('✅ Interface atualizada com dados salvos');
      
      // Atualizar progresso do projeto
      await updateProjectProgress(updatedRelatorios);
      
                      // Limpar mudanças locais (apenas as válidas foram salvas)
                setLocalChanges({});
      console.log('🧹 Local changes limpo, salvamento concluído!');
      
                      // Dados já estão sincronizados localmente, não precisa recarregar
                console.log('✅ Dados salvos e sincronizados localmente');
      
                      if (successfulSaves === totalItems) {
                  toast.success('✅ Alterações salvas com sucesso!');
                } else {
                  toast.success(`✅ ${successfulSaves}/${totalItems} itens salvos com sucesso!`);
                }
      
    } catch (error) {
      console.error('💥 ERRO CRÍTICO no salvamento:', error);
      console.error('Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        localChanges,
        userData: userData?.uid
      });
      toast.error('Erro ao salvar alterações: ' + (error as Error).message);
    } finally {
      setSaving(false);
      console.log('🏁 Processo de salvamento finalizado');
    }
  };

  // Função para formatar data no formato dd/mm/aaaa
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    // Remove todos os caracteres não numéricos
    const numbers = dateString.replace(/\D/g, '');
    
    // Se não tem números, retorna vazio
    if (numbers.length === 0) return '';
    
    // Se tem menos de 8 dígitos, formata progressivamente
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.substring(0, 2)}/${numbers.substring(2)}`;
    } else if (numbers.length <= 8) {
      return `${numbers.substring(0, 2)}/${numbers.substring(2, 4)}/${numbers.substring(4, 8)}`;
    } else {
      // Se tem mais de 8 dígitos, pega apenas os primeiros 8
      return `${numbers.substring(0, 2)}/${numbers.substring(2, 4)}/${numbers.substring(4, 8)}`;
    }
  };

  // Função para validar formato de data
  const validateDate = (dateString: string) => {
    if (!dateString) return true;
    
    // Verifica se tem o formato básico dd/mm/aaaa
    const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    if (!regex.test(dateString)) return false;
    
    // Validação adicional: verifica se a data é válida
    const parts = dateString.split('/');
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    
    // Verifica se o ano é razoável (entre 1900 e 2100)
    if (year < 1900 || year > 2100) return false;
    
    // Verifica se o mês é válido
    if (month < 1 || month > 12) return false;
    
    // Verifica se o dia é válido para o mês
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;
    
    return true;
  };

  // Função para converter data de outros formatos para dd/mm/aaaa
  const convertToDateFormat = (dateString: string) => {
    if (!dateString) return '';
    
    // Se já está no formato correto, retorna como está
    if (validateDate(dateString)) return dateString;
    
    // Tenta converter de diferentes formatos
    try {
      // Tenta converter de ISO string (2024-01-15)
      if (dateString.includes('-')) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        }
      }
      
      // Tenta converter de outros formatos com barras
      if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          // Se está no formato mm/dd/yyyy, converte para dd/mm/yyyy
          if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
            const month = parts[0];
            const day = parts[1];
            const year = parts[2];
            return `${day}/${month}/${year}`;
          }
        }
      }
    } catch (error) {
      console.error('Erro ao converter data:', error);
    }
    
    // Se não conseguiu converter, retorna como está
    return dateString;
  };

  const exportToCSV = () => {
    console.log('📊 Iniciando exportação CSV...');
    console.log('📊 Dados filtrados:', filteredData.length, 'itens');
    
    if (filteredData.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    // Função para escapar caracteres especiais no CSV
    const escapeCSV = (text: string) => {
      if (!text) return '';
      // Remove quebras de linha e substitui aspas duplas
      return text.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, ' ');
    };

    const headers = [
      'Categoria',
      'Artigo',
      'Item',
      'Local',
      'Situacao Atual',
      'Orientacao',
      'Fotos',
      'Responsavel',
      'Status',
      'Avaliacao',
      'O que foi alterado',
      'Prazo para tratar',
      'Adequacao'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredData.map((item, index) => {
        console.log(`📊 Processando item ${index + 1}:`, item);
        
        // Preparar dados das fotos
        const photosInfo = item.photos && item.photos.length > 0 
          ? `${item.photos.length} foto(s)` 
          : 'Sem fotos';
        
        // Preparar dados da adequação
        let adequacyInfo = '';
        if (item.adequacyReported) {
          adequacyInfo = `Reportada - ${item.adequacyStatus || 'Pendente'}`;
          if (item.adequacyDetails) {
            adequacyInfo += ` - ${item.adequacyDetails}`;
          }
        } else {
          adequacyInfo = 'Nao reportada';
        }

        const row = [
          `"${escapeCSV(item.category || '')}"`,
          `"${escapeCSV(item.itemTitle || '')}"`,
          `"${escapeCSV(item.subItemTitle || '')}"`,
          `"${escapeCSV(item.local || '')}"`,
          `"${escapeCSV(item.currentSituation || '')}"`,
          `"${escapeCSV(item.clientGuidance || '')}"`,
          `"${escapeCSV(photosInfo)}"`,
          `"${escapeCSV(item.responsible || '')}"`,
          `"${escapeCSV(item.status || '')}"`,
          `"${escapeCSV(item.evaluation || '')}"`,
          `"${escapeCSV(item.changesDescription || '')}"`,
          `"${escapeCSV(item.treatmentDeadline || '')}"`,
          `"${escapeCSV(adequacyInfo)}"`
        ].join(',');
        
        console.log(`📊 Linha ${index + 1} gerada:`, row);
        return row;
      })
    ].join('\n');

    // Adicionar BOM para UTF-8
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    console.log('📊 CSV gerado com sucesso');
    console.log('📊 Tamanho do CSV:', csvWithBOM.length, 'caracteres');
    console.log('📊 Primeiras linhas:', csvWithBOM.split('\n').slice(0, 3));

    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${projectId || 'geral'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    
    console.log('📊 Link criado:', url);
    console.log('📊 Nome do arquivo:', `relatorio_${projectId || 'geral'}_${new Date().toISOString().split('T')[0]}.csv`);
    
    try {
      link.click();
      console.log('📊 Click executado com sucesso');
    } catch (error) {
      console.error('📊 Erro ao executar click:', error);
      toast.error('Erro ao baixar arquivo');
      return;
    }
    
    document.body.removeChild(link);
    
    console.log('📊 Download iniciado');
    toast.success('Relatório exportado com sucesso!');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      in_progress: { label: 'Em Andamento', className: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Concluído', className: 'bg-green-100 text-green-800' }
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
    const completedItems = relatorios.filter(item => {
      const status = localChanges[item.id]?.status ?? item.status;
      return status === 'completed';
    }).length;
    const pendingItems = relatorios.filter(item => {
      const status = localChanges[item.id]?.status ?? item.status;
      return status === 'pending';
    }).length;
    const inProgressItems = relatorios.filter(item => {
      const status = localChanges[item.id]?.status ?? item.status;
      return status === 'in_progress';
    }).length;

    return { totalItems, completedItems, pendingItems, inProgressItems };
  };

  // Função para calcular o progresso real do projeto
  const calculateRealProgress = () => {
    const totalItems = relatorios.length;
    const completedItems = relatorios.filter(item => {
      // Considerar mudanças locais se existirem
      const status = localChanges[item.id]?.status ?? item.status;
      return status === 'completed';
    }).length;
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  // Função para recarregar dados manualmente
  const handleRefreshData = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      await loadRelatorioByProject(projectId);
      toast.success('Dados atualizados!');
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      toast.error('Erro ao atualizar dados');
    } finally {
      setLoading(false);
    }
  };

  // Botão para remover duplicatas manualmente
  const handleRemoveDuplicates = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const duplicatesRemoved = await RelatorioService.removeDuplicateRelatorios(projectId);
      
      if (duplicatesRemoved > 0) {
        toast.success(`${duplicatesRemoved} itens duplicados removidos!`);
        // Recarregar dados após remoção
        await loadRelatorioByProject(projectId);
      } else {
        toast.info('Nenhuma duplicata encontrada!');
      }
    } catch (error) {
      console.error('Erro ao remover duplicatas:', error);
      toast.error('Erro ao remover duplicatas');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const summary = getProjectSummary();
  const realProgress = calculateRealProgress();

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Relatório do Projeto</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie o relatório deste projeto
            </p>

          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Botão para atualizar dados */}
          <Button
            variant="outline"
            onClick={handleRefreshData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
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

      {/* Barra de Progresso */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Progresso Geral do Projeto</h3>
              <span className="text-2xl font-bold text-versys-primary">{realProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-versys-primary to-versys-secondary h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${realProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{summary.completedItems} de {summary.totalItems} itens concluídos</span>
              <span>{summary.pendingItems} pendentes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  {categories.filter(cat => cat && cat.trim() !== '').length > 0 ? categories.filter(cat => cat && cat.trim() !== '').map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  )) : (
                    <SelectItem value="no-categories" disabled>Nenhuma categoria disponível</SelectItem>
                  )}
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
                  {statuses.filter(status => status && status.trim() !== '').map(status => (
                    <SelectItem key={status} value={status}>
                      {status === 'pending' ? 'Pendente' :
                       status === 'in_progress' ? 'Em Andamento' :
                       status === 'completed' ? 'Concluído' : status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="article">Artigo</Label>
              <Select value={articleFilter} onValueChange={setArticleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os artigos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os artigos</SelectItem>
                  {articles.filter(article => article && article.trim() !== '').length > 0 ? articles.filter(article => article && article.trim() !== '').map(article => (
                    <SelectItem key={article} value={article}>{article}</SelectItem>
                  )) : (
                    <SelectItem value="no-articles" disabled>Nenhum artigo disponível</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="local">Local</Label>
              <Select value={localFilter} onValueChange={setLocalFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os locais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os locais</SelectItem>
                  {locals.filter(local => local && local.trim() !== '').length > 0 ? locals.filter(local => local && local.trim() !== '').map(local => (
                    <SelectItem key={local} value={local}>{local}</SelectItem>
                  )) : (
                    <SelectItem value="no-locals" disabled>Nenhum local disponível</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="responsible">Responsável</Label>
              <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os responsáveis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os responsáveis</SelectItem>
                  {responsibles.filter(resp => resp && resp.trim() !== '').length > 0 ? responsibles.filter(resp => resp && resp.trim() !== '').map(responsible => (
                    <SelectItem key={responsible} value={responsible}>{responsible}</SelectItem>
                  )) : (
                    <SelectItem value="no-responsibles" disabled>Nenhum responsável disponível</SelectItem>
                  )}
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
                        <div className="flex items-center justify-between">
                          <span className="text-red-600 font-semibold text-sm">
                            ⚠️ ATENÇÃO: {duplicates} itens duplicados detectados!
                          </span>
                          <button
                            onClick={() => removeDuplicateRelatorios(projectId)}
                            className="ml-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                          >
                            Remover Duplicatas
                          </button>
                        </div>
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
                disabled={filteredData.length === 0}
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
                                      console.log('📥 Tipo da foto:', typeof photo);
                                      console.log('📥 Estrutura da foto:', photo);
                                      
                                      // Extrair URL da foto (pode ser string ou objeto)
                                      let photoUrl = '';
                                      if (typeof photo === 'string') {
                                        photoUrl = photo;
                                      } else if (photo && typeof photo === 'object') {
                                        // Se for objeto, tentar diferentes propriedades comuns
                                        const photoObj = photo as any;
                                        photoUrl = photoObj.url || photoObj.downloadURL || photoObj.src || photoObj.path || '';
                                        console.log('📥 URL extraída do objeto:', photoUrl);
                                      }
                                      
                                      if (!photoUrl) {
                                        toast.error('URL da foto inválida');
                                        console.error('URL inválida:', photo);
                                        return;
                                      }
                                      
                                      try {
                                        // Método 1: Tentar download direto (evita problemas de CORS)
                                        console.log('🔗 Tentando download direto...');
                                        const link = document.createElement('a');
                                        link.href = photoUrl;
                                        link.download = `foto-${item.subItemTitle.replace(/[^a-zA-Z0-9]/g, '-')}-${index + 1}.jpg`;
                                        link.target = '_blank';
                                        link.rel = 'noopener noreferrer';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        toast.success('Foto baixada com sucesso!');
                                        return;
                                      } catch (directError) {
                                        console.error('❌ Erro no download direto:', directError);
                                        
                                        // Método 2: Tentar via Firebase SDK
                                        try {
                                          const urlObj = new URL(photoUrl);
                                          console.log('🔗 URL objeto:', urlObj);
                                          console.log('🔗 Pathname:', urlObj.pathname);
                                          
                                          // Tentar diferentes padrões de URL do Firebase Storage
                                          let pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
                                          if (!pathMatch) {
                                            pathMatch = urlObj.pathname.match(/\/v0\/b\/[^\/]+\/o\/(.+)$/);
                                          }
                                          if (!pathMatch) {
                                            pathMatch = urlObj.pathname.match(/\/o\/(.+?)(\?|$)/);
                                          }
                                          
                                          console.log('🔗 Path match:', pathMatch);
                                          
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
                                            return;
                                          }
                                        } catch (firebaseError) {
                                          console.error('❌ Erro no Firebase SDK:', firebaseError);
                                        }
                                        
                                        // Método 3: Fallback final - abrir em nova aba
                                        console.warn('⚠️ Todos os métodos falharam, abrindo em nova aba...');
                                        window.open(photoUrl, '_blank');
                                        toast.info('Erro no download automático. Foto aberta em nova aba.');
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
                              value={String(getValue(item, 'status') || 'pending')} 
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
                          <div className="space-y-1">
                            <Input
                              type="text"
                              value={String(getValue(item, 'treatmentDeadline') || '')}
                              onChange={(e) => {
                                const value = e.target.value;
                                const formatted = formatDate(value);
                                updateLocalValue(item.id, 'treatmentDeadline', formatted);
                              }}
                              onBlur={(e) => {
                                const value = e.target.value;
                                if (value && !validateDate(value)) {
                                  toast.error('Formato de data inválido. Use dd/mm/aaaa');
                                } else if (value) {
                                  // Converte para o formato correto se necessário
                                  const converted = convertToDateFormat(value);
                                  if (converted !== value) {
                                    updateLocalValue(item.id, 'treatmentDeadline', converted);
                                  }
                                }
                              }}
                              placeholder="dd/mm/aaaa"
                              maxLength={10}
                              className={`w-full h-8 text-sm border-gray-200 focus:border-blue-400 ${
                                getValue(item, 'treatmentDeadline') && !validateDate(String(getValue(item, 'treatmentDeadline'))) 
                                  ? 'border-red-500' 
                                  : ''
                              }`}
                            />
                            {getValue(item, 'treatmentDeadline') && !validateDate(String(getValue(item, 'treatmentDeadline'))) && (
                              <p className="text-xs text-red-500">Formato inválido</p>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm">
                            {(() => {
                              const deadline = getValue(item, 'treatmentDeadline');
                              if (!deadline) return '-';
                              
                              const converted = convertToDateFormat(String(deadline));
                              return validateDate(converted) ? converted : String(deadline);
                            })()}
                          </div>
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
                            {userData && (userData.type as string) === 'client' ? (
                              <div className="space-y-1">
                                <Badge variant={item.adequacyReported ? 'default' : 'secondary'}>
                                  {item.adequacyReported ? 'Reportada' : 'Não Reportada'}
                                </Badge>
                                {/* Seletor de Status de Adequação para Cliente */}
                                <Select 
                                  value={String(getValue(item, 'adequacyStatus') || 'pending')} 
                                  onValueChange={(value) => updateLocalValue(item.id, 'adequacyStatus', value)}
                                  disabled={!canChangeAdequacyStatus(item)}
                                >
                                  <SelectTrigger className="w-full h-7 text-xs border-gray-200 focus:border-blue-400">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pendente</SelectItem>
                                    <SelectItem value="completed">Concluída</SelectItem>
                                    <SelectItem value="not_applicable">Não se Aplica</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <Badge variant={item.adequacyReported ? 'default' : 'secondary'}>
                                  {item.adequacyReported ? 'Reportada' : 'Não Reportada'}
                                </Badge>
                              </div>
                            )}
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
