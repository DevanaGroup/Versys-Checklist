import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, useLocation, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { db, storage } from "../lib/firebase";
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs } from "firebase/firestore";
import { ArrowLeft, ArrowRight, Camera, Plus, Trash2, Search, ChevronDown, Mic, MicOff, FileText, Save, Clock, Lightbulb, Sparkles, MapPin, MoreVertical, Download, Edit, X } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { useAuth } from "../hooks/useAuth";
// Removido import do Transformers.js - usando Web Speech API nativa

// Importar lista completa de artigos
import { ARTICLES } from '@/data/articles';
import { RelatorioService } from '@/lib/relatorioService';
import { PDFService, PDFProjectData } from '@/lib/pdfService';

interface Article {
  id: string;
  code: string;
  title: string;
  category: string;
}

interface PhotoData {
  id: string;
  url: string; // Base64 da imagem
  createdAt: string;
  latitude: number;
  longitude: number;
}

interface ProjectVariation {
  id: string;
  name: string; // Nome da variação (ex: "CERCAS", "MUROS")
  evaluation: "nc" | "r" | "na" | "";
  location?: string; // Local onde a NC foi encontrada
  currentSituation?: string;
  clientGuidance?: string;
  photos: PhotoData[]; // Array de fotos (máximo 2)
  selectedItems?: SelectedItemData[]; // Nova propriedade para armazenar itens selecionados
}

type VariationFieldValue = string | PhotoData;

interface ProjectStep {
  id: string;
  articleId: string;
  code: string;
  title: string;
  category: string;
  variations: ProjectVariation[]; // Array de variações dentro do artigo
}

interface ClienteData {
  id: string;
  nome: string;
  email: string;
  empresa: string;
}

interface ProjectData {
  nome: string;
  clienteId: string;
  cliente?: ClienteData;
  steps: ProjectStep[];
}

// Interfaces para Itens e Checklists
interface Item {
  id: string;
  nome: string;
  atributos: Atributo[];
  tipo: string;
  criadoEm?: Date;
  atualizadoEm?: Date;
}

interface Atributo {
  id: string;
  nome: string;
  tipo: string;
  obrigatorio: boolean;
}

interface Checklist {
  id: string;
  titulo: string;
  itemId: string;
  itemNome: string;
  topicos: Topico[];
  criadoEm?: Date;
  atualizadoEm?: Date;
}

interface Topico {
  id: string;
  titulo: string;
}

// Interface para item selecionado no dialog
interface SelectedItemData {
  itemId: string;
  itemNome: string;
  atributos: { [key: string]: string };
  checklistId: string;
  checklistNome: string;
  topicosSelecionados: string[];
}

// Adicione no início do arquivo:
const OPENAI_ASSISTANT_ID = import.meta.env.VITE_OPENAI_ASSISTANT_ID || "";
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";

// Função utilitária para chamar o assistente OpenAI
// Função corrigida para chamar o assistente OpenAI
// Função corrigida para chamar o assistente OpenAI
async function gerarOrientacaoOpenAI(situacaoAtual: string): Promise<string> {
  try {
    console.log('=== INICIANDO CHAMADA PARA OPENAI ===');
    console.log('Situação atual:', situacaoAtual);

    // Validação de entrada
    if (!situacaoAtual || situacaoAtual.trim().length === 0) {
      throw new Error('Situação atual não pode estar vazia');
    }

    if (!OPENAI_API_KEY || !OPENAI_ASSISTANT_ID) {
      throw new Error('Configurações da OpenAI não encontradas');
    }

    // 0. Obter informações do assistente (incluindo instruções)
    console.log('0. Obtendo informações do assistente...');
    const assistantResponse = await fetch(`https://api.openai.com/v1/assistants/${OPENAI_ASSISTANT_ID}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      }
    });

    if (!assistantResponse.ok) {
      const errorText = await assistantResponse.text();
      console.error('Erro ao obter assistente:', errorText);
      throw new Error(`Erro ao obter assistente: ${assistantResponse.status} - ${errorText}`);
    }

    const assistantData = await assistantResponse.json();
    console.log('✅ Assistente obtido:', {
      id: assistantData.id,
      name: assistantData.name,
      model: assistantData.model,
      hasInstructions: !!assistantData.instructions
    });

    // Log das instruções (apenas primeiros 200 caracteres para não poluir o log)
    if (assistantData.instructions) {
      console.log('Instruções do assistente:', assistantData.instructions.substring(0, 200) + '...');
    }

    // 1. Criar um thread
    console.log('1. Criando thread...');
    const threadResponse = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2" // Header necessário para assistants API
      },
      body: JSON.stringify({})
    });

    if (!threadResponse.ok) {
      const errorText = await threadResponse.text();
      console.error('Erro na resposta do thread:', errorText);
      throw new Error(`Erro ao criar thread: ${threadResponse.status} - ${errorText}`);
    }

    const threadData = await threadResponse.json();
    const threadId = threadData.id;
    console.log('✅ Thread criado:', threadId);

    // 2. Adicionar mensagem do usuário ao thread
    console.log('2. Adicionando mensagem ao thread...');
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        role: "user",
        content: situacaoAtual
      })
    });

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text();
      console.error('Erro na resposta da mensagem:', errorText);
      throw new Error(`Erro ao adicionar mensagem: ${messageResponse.status} - ${errorText}`);
    }

    console.log('✅ Mensagem adicionada ao thread');

    // 3. Executar o run com o assistant (usando as instruções obtidas)
    console.log('3. Executando run com instruções do assistente...');
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        assistant_id: OPENAI_ASSISTANT_ID,
        // Usar as instruções do assistente obtidas via GET
        instructions: assistantData.instructions,
        // Você pode adicionar instruções adicionais específicas para este contexto se necessário
        additional_instructions: `Contexto específico: Análise de situação atual em auditoria/vistoria. 
        Situação relatada: "${situacaoAtual}"
        
        Por favor, forneça orientações claras e práticas baseadas nas suas instruções principais.`,
        // Configurações adicionais se necessário
        model: assistantData.model || "gpt-4-turbo-preview",
        temperature: 0.7,
        max_prompt_tokens: 4000,
        max_completion_tokens: 2000
      })
    });

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error('Erro na resposta do run:', errorText);
      throw new Error(`Erro ao executar run: ${runResponse.status} - ${errorText}`);
    }

    const runData = await runResponse.json();
    const runId = runData.id;
    console.log('✅ Run iniciado:', runId);

    // 4. Polling para aguardar a conclusão com timeout e melhor tratamento de erro
    console.log('4. Aguardando conclusão do run...');
    let status = runData.status;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutos máximo (60 tentativas x 2 segundos)
    const pollInterval = 2000; // 2 segundos

    while (!['completed', 'failed', 'cancelled', 'expired'].includes(status) && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      attempts++;

      console.log(`Tentativa ${attempts}/${maxAttempts} - Status atual: ${status}`);

      const checkResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v2"
        }
      });

      if (!checkResponse.ok) {
        const errorText = await checkResponse.text();
        console.error('Erro ao verificar status:', errorText);
        throw new Error(`Erro ao verificar status: ${checkResponse.status} - ${errorText}`);
      }

      const checkData = await checkResponse.json();
      status = checkData.status;

      // Log adicional para debug
      if (checkData.last_error) {
        console.error('Erro reportado pelo run:', checkData.last_error);
      }

      // Se o run requer ação (function calling, etc)
      if (status === 'requires_action') {
        console.log('Run requer ação:', checkData.required_action);
        // Aqui você poderia implementar function calling se necessário
      }
    }

    // Verificar resultado final
    if (status === 'failed') {
      console.error('Run falhou com status:', status);
      throw new Error('O assistente falhou ao processar a solicitação');
    }

    if (status === 'cancelled') {
      throw new Error('O processamento foi cancelado');
    }

    if (status === 'expired') {
      throw new Error('O processamento expirou');
    }

    if (status !== 'completed') {
      console.error('Timeout - Status final:', status);
      throw new Error(`Timeout: O assistente não respondeu a tempo (status: ${status})`);
    }

    console.log('✅ Run completado com sucesso');

    // 5. Buscar mensagens do thread (resposta do assistant)
    console.log('5. Buscando resposta do assistente...');
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v2"
      }
    });

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text();
      console.error('Erro ao buscar mensagens:', errorText);
      throw new Error(`Erro ao buscar mensagens: ${messagesResponse.status} - ${errorText}`);
    }

    const messagesData = await messagesResponse.json();
    console.log('Mensagens recebidas:', messagesData);

    // Encontrar a resposta do assistant (primeira mensagem que não é do usuário)
    const assistantMessage = messagesData.data.find((msg: any) => msg.role === 'assistant');

    if (!assistantMessage) {
      console.error('Resposta do assistente não encontrada nas mensagens:', messagesData.data);
      throw new Error('Resposta do assistente não encontrada');
    }

    // Extrair o texto da resposta
    const content = assistantMessage.content;
    if (!content || !Array.isArray(content) || content.length === 0) {
      console.error('Conteúdo da resposta inválido:', content);
      throw new Error('Conteúdo da resposta do assistente é inválido');
    }

    // Assumindo que o primeiro item de content é texto
    const textContent = content.find((item: any) => item.type === 'text');
    if (!textContent || !textContent.text || !textContent.text.value) {
      console.error('Texto não encontrado no conteúdo:', content);
      throw new Error('Texto da resposta não encontrado');
    }

    const resposta = textContent.text.value.trim();
    console.log('✅ Resposta do assistente obtida:', resposta.substring(0, 100) + '...');

    return resposta;

  } catch (error) {
    console.error('❌ Erro na função gerarOrientacaoOpenAI:', error);

    // Tratamento de erros mais específico
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        throw new Error('API Key inválida. Verifique suas credenciais do OpenAI.');
      } else if (error.message.includes('429')) {
        throw new Error('Limite de requisições atingido. Tente novamente em alguns minutos.');
      } else if (error.message.includes('404')) {
        throw new Error('Assistente não encontrado. Verifique o ID do assistente.');
      } else if (error.message.includes('400')) {
        throw new Error('Requisição inválida. Verifique os parâmetros enviados.');
      }
    }

    throw error;
  }
}

const NewProject = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { editId, projectId } = useParams();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const clienteId = searchParams.get('clienteId');
  const isEditMode = !!(editId || projectId);
  const currentProjectId = editId || projectId;

  console.log('=== DEBUG PARÂMETROS ===');
  console.log('editId:', editId);
  console.log('projectId:', projectId);
  console.log('currentProjectId:', currentProjectId);
  console.log('isEditMode:', isEditMode);
  console.log('clienteId:', clienteId);

  // Estados do projeto
  const [projectData, setProjectData] = useState<ProjectData>({
    nome: "",
    clienteId: clienteId || "",
    steps: []
  });

  // Estados da interface
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [clienteData, setClienteData] = useState<ClienteData | null>(null);
  const [loadingCliente, setLoadingCliente] = useState(false);

  // Estados para autosave
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const AUTOSAVE_DELAY = 1000; // 1 segundo

  // Estados para transcrição de áudio com Web Speech API
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeField, setActiveField] = useState<string>('');

  // Estados para seleção de artigos
  const [showArticleSelection, setShowArticleSelection] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Estado para controlar campos abertos no mobile
  const [openFields, setOpenFields] = useState<{ [key: string]: boolean }>({});

  // Estados para o dialog de itens e checklists
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [currentVariationIndex, setCurrentVariationIndex] = useState<number>(0);
  const [itens, setItens] = useState<Item[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedChecklistId, setSelectedChecklistId] = useState<string>("");
  const [selectedItemAtributos, setSelectedItemAtributos] = useState<{ [key: string]: string }>({});
  const [selectedTopicos, setSelectedTopicos] = useState<string[]>([]);
  const [editingItemIndex, setEditingItemIndex] = useState<number>(-1);
  
  // Hook para detectar se estamos em mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
          const checkMobile = () => {
        const width = window.innerWidth;
        const mobile = width < 900;
        setIsMobile(mobile);
      };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Estados para transcrição e geração
  const [transcribingVariation, setTranscribingVariation] = useState<number | null>(null);
  const [pendingTranscription, setPendingTranscription] = useState<string>('');

  // Estados para PDF
  const [showDownloadButton, setShowDownloadButton] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Definir currentStepData
  const currentStepData = projectData.steps[currentStep];

  // Função para alternar campo
  const toggleField = (variationIndex: number, field: string) => {
    const key = `${currentStep}-${variationIndex}-${field}`;
    setOpenFields(prev => {
      // Se o campo clicado já está aberto, feche-o
      if (prev[key]) {
        const newState = { ...prev };
        newState[key] = false;
        return newState;
      }

      // Caso contrário, feche TODOS os campos de TODAS as variations e abra apenas o clicado
      const newState = { ...prev };

      // Fechar todos os campos de todas as variations do step atual
      Object.keys(newState).forEach(existingKey => {
        if (existingKey.startsWith(`${currentStep}-`)) {
          newState[existingKey] = false;
        }
      });

      // Abrir apenas o campo clicado
      newState[key] = true;
      return newState;
    });
  };

  // Bloquear saída se há mudanças não salvas
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Você tem mudanças não salvas. Tem certeza que quer sair?';
        return 'Você tem mudanças não salvas. Tem certeza que quer sair?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Carregar dados do cliente se fornecido
  useEffect(() => {
    if (clienteId) {
      loadClienteData();
    }
  }, [clienteId]);


  // Carregar dados do projeto existente se estiver em modo de edição
  useEffect(() => {
    if (isEditMode && currentProjectId) {
      loadProjectData();
    }
  }, [isEditMode, currentProjectId]);

  // Inicializar sistema sem verificação de rascunhos
  useEffect(() => {
    // Remover lógica de rascunho - não é mais necessária
    console.log('Componente NewProject inicializado');
    loadItensAndChecklists();
  }, []);

  // Funções de rascunho removidas - não são mais necessárias

  // Sistema de rascunho removido - não é mais necessário

  // Cleanup do timeout ao desmontar componente
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Ajustar altura do textarea do título quando o step mudar
  useEffect(() => {
    setTimeout(() => {
      const textarea = document.querySelector('textarea[placeholder="Digite o título do item..."]') as HTMLTextAreaElement;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      }
    }, 100);
  }, [currentStep, currentStepData?.title]);

  // Salvar automaticamente ao navegar entre steps
  // REMOVIDO: useEffect que causava sobrescrita automática e perda de dados
  // useEffect(() => {
  //   if (projectData.steps.length > 0) {
  //     triggerAutoSave();
  //   }
  // }, [currentStep]);

  // Função para melhorar pontuação e formatação do texto transcrito (versão conservadora)
  const improveTranscription = (text: string): string => {
    if (!text) return text;

    let improvedText = text.trim();

    // Capitalizar primeira letra apenas se não houver pontuação já presente
    if (improvedText.length > 0 && !/^[A-ZÀ-Ü]/.test(improvedText)) {
      improvedText = improvedText.charAt(0).toUpperCase() + improvedText.slice(1);
    }

    // Corrigir espaçamentos múltiplos
    improvedText = improvedText.replace(/\s{2,}/g, ' ');

    // Corrigir espaçamento antes de pontuação existente
    improvedText = improvedText.replace(/\s+([,.!?;:])/g, '$1');

    // Apenas adicionar ponto final se realmente não houver pontuação e a frase parecer completa
    if (!/[.!?;:]$/.test(improvedText) && improvedText.length > 10) {
      // Verificar se termina com palavras que indicam fim de frase
      if (/\b(concluído|finalizado|terminado|pronto|ok|certo|feito|acabado)$/gi.test(improvedText)) {
        improvedText += '.';
      }
      // Ou se parece ser uma frase declarativa completa (mais de 5 palavras)
      else if (improvedText.split(' ').length >= 5) {
        improvedText += '.';
      }
    }

    return improvedText;
  };

  // Inicializar Web Speech API para transcrição de áudio
  useEffect(() => {
    console.log('Inicializando Web Speech API...');

    // Verificar suporte do navegador
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.interimResults = true; // Mostrar resultados intermediários
      recognition.maxAlternatives = 1;
      recognition.continuous = true; // Gravação contínua
      recognition.serviceURI = '';

      // Evitar timeout automático
      let finalTranscript = '';

      setSpeechRecognition(recognition);
      console.log('Web Speech API inicializada com sucesso!');
    } else {
      console.error('Web Speech API não suportada pelo navegador');
      toast.error('Transcrição de áudio não suportada neste navegador');
    }
  }, []);

  const loadProjectData = async () => {
    if (!currentProjectId) return;

    try {
      setLoadingCliente(true);
      const projectRef = doc(db, 'projetos', currentProjectId);
      const projectSnap = await getDoc(projectRef);

      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        console.log('=== DADOS DO PROJETO CARREGADOS ===');
        console.log('Dados completos:', projectData);
        console.log('CustomAccordions:', projectData.customAccordions);

        // Converter customAccordions para steps do NewProject
        const steps: ProjectStep[] = [];

        if (projectData.customAccordions) {
          console.log('=== PROCESSANDO CUSTOM ACCORDIONS ===');
          projectData.customAccordions.forEach((accordion: { title: string; items: any[] }, accordionIndex: number) => {
            console.log(`Accordion ${accordionIndex}:`, accordion);
            accordion.items.forEach((item: { title: string; category: string; subItems: any[] }, itemIndex: number) => {
              console.log(`Item ${itemIndex}:`, item);
              console.log(`SubItems do item ${itemIndex}:`, item.subItems);
              console.log(`Quantidade de subItems:`, item.subItems.length);

              const code = item.title.split(' - ')[0] || '';
              // Usar o título original do item, que já está formatado corretamente
              const correctTitle = item.title;

              console.log('Processando item:', item);
              console.log('SubItems encontrados:', item.subItems);

              // Encontrar o artigo correspondente no ARTICLES
              let foundArticle = ARTICLES.find(article =>
                `${article.code} - ${article.title}` === correctTitle
              );

              // Se não encontrou, tentar buscar apenas pelo código
              if (!foundArticle) {
                foundArticle = ARTICLES.find(article => article.code === code);
              }

              // Se ainda não encontrou, tentar buscar pelo título
              if (!foundArticle) {
                foundArticle = ARTICLES.find(article => article.title === correctTitle);
              }

              // Converter todas as subItems em variações
              const variations: ProjectVariation[] = item.subItems.map((subItem: { id: string; title: string; evaluation?: string; location?: string; currentSituation?: string; adminFeedback?: string; clientGuidance?: string; photoData?: any; photos?: any[] }, index: number) => {
                const variation = {
                  id: subItem.id || `variation-${Date.now()}-${index}`,
                  name: subItem.title || `NC-${index + 1}`,
                  evaluation: (subItem.evaluation === 'nc' || subItem.evaluation === 'r' || subItem.evaluation === 'na') ? subItem.evaluation as "" | "nc" | "r" | "na" : '',
                  location: subItem.location || '',
                  currentSituation: subItem.currentSituation || '',
                  clientGuidance: subItem.clientGuidance || subItem.adminFeedback || '',
                  photos: Array.isArray(subItem.photos) ? subItem.photos : []
                };

                return variation;
              });

              console.log('Variações convertidas:', variations);
              console.log('Quantidade de variações:', variations.length);

              // Criar o step com todas as variações
              const step = {
                id: `step-${Date.now()}-${steps.length}`,
                articleId: foundArticle?.id || `article-${steps.length}`,
                code: code,
                title: correctTitle,
                category: item.category || accordion.title,

                variations: variations
              };

              console.log('Step criado:', step);
              steps.push(step);
            });
          });
        }

        console.log('=== RESUMO FINAL ===');
        console.log('Steps convertidos:', steps);
        console.log('Quantidade total de steps:', steps.length);
        steps.forEach((step, index) => {
          console.log(`Step ${index}:`, step.title, 'com', step.variations.length, 'variações');
          step.variations.forEach((variation, vIndex) => {
            console.log(`  Variação ${vIndex}:`, variation.name, 'com', variation.photos.length, 'fotos');
            if (variation.photos.length > 0) {
              console.log(`    Fotos:`, variation.photos);
            }
          });
        });

        // Atualizar estado do projeto
        setProjectData({
          nome: projectData.nome || '',
          clienteId: projectData.clienteId || '',
          cliente: projectData.cliente || null,
          steps: steps
        });

        // Se houver cliente, carregar dados do cliente
        if (projectData.clienteId) {
          const clienteRef = doc(db, 'clientes', projectData.clienteId);
          const clienteSnap = await getDoc(clienteRef);
          if (clienteSnap.exists()) {
            const clienteData = clienteSnap.data();
            setClienteData({
              id: clienteSnap.id,
              nome: clienteData?.nome || '',
              email: clienteData?.email || '',
              empresa: clienteData?.empresa || ''
            });
          }
        }

        console.log('Projeto carregado com', steps.length, 'passos');
        
        // Redirecionar automaticamente para o novo modo de avaliação ponderada
        toast.info('Redirecionando para o modo de avaliação...');
        navigate(`/projetos/write/${currentProjectId}`);
        return; // Evitar continuar o carregamento
      } else {
        toast.error('Projeto não encontrado');
        navigate('/projetos');
      }
    } catch (error) {
      console.error('Erro ao carregar projeto:', error);
      toast.error('Erro ao carregar projeto');
      navigate('/projetos');
    } finally {
      setLoadingCliente(false);
    }
  };

  const loadClienteData = async () => {
    try {
      setLoadingCliente(true);
      const clienteRef = doc(db, 'clientes', clienteId!);
      const clienteSnap = await getDoc(clienteRef);

      if (clienteSnap.exists()) {
        const clienteData = clienteSnap.data();
        const cliente: ClienteData = {
          id: clienteSnap.id,
          nome: clienteData?.nome || '',
          email: clienteData?.email || '',
          empresa: clienteData?.empresa || ''
        };
        setClienteData(cliente);
        setProjectData(prev => ({
          ...prev,
          cliente: {
            id: cliente.id,
            nome: clienteData.nome || '',
            email: clienteData.email || '',
            empresa: clienteData.empresa || ''
          }
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
      toast.error('Erro ao carregar dados do cliente');
    } finally {
      setLoadingCliente(false);
    }
  };

  const loadItensAndChecklists = async () => {
    try {
      console.log('🔍 Carregando itens e checklists...');
      
      // Carregar itens
      const itensQuery = query(collection(db, 'projetos'), where('tipo', '==', 'item'));
      const itensSnapshot = await getDocs(itensQuery);
      const itensData: Item[] = [];
      
      itensSnapshot.forEach((doc) => {
        itensData.push({ id: doc.id, ...doc.data() } as Item);
      });
      
      console.log('🔍 Itens carregados:', itensData.length);
      setItens(itensData);

      // Carregar checklists
      const checklistsQuery = query(collection(db, 'projetos'), where('tipo', '==', 'checklist'));
      const checklistsSnapshot = await getDocs(checklistsQuery);
      const checklistsData: Checklist[] = [];
      
      checklistsSnapshot.forEach((doc) => {
        checklistsData.push({ id: doc.id, ...doc.data() } as Checklist);
      });
      
      console.log('🔍 Checklists carregados:', checklistsData.length);
      setChecklists(checklistsData);
    } catch (error) {
      console.error('Erro ao carregar itens e checklists:', error);
      toast.error('Erro ao carregar itens e checklists');
    }
  };


  const handleProjectNameChange = (nome: string) => {
    setProjectData(prev => ({ ...prev, nome }));
    setHasUnsavedChanges(true);
  };

  // Função para alterar dados do step (título, descrição)
  const handleStepChange = (field: string, value: string) => {
    setProjectData(prev => ({
      ...prev,
      steps: prev.steps.map((step, index) =>
        index === currentStep ? { ...step, [field]: value } : step
      )
    }));
    setHasUnsavedChanges(true);
    
    // Auto-ajustar altura do textarea se for o título
    if (field === 'title') {
      setTimeout(() => {
        const textarea = document.querySelector('textarea[placeholder="Digite o título do item..."]') as HTMLTextAreaElement;
        if (textarea) {
          textarea.style.height = 'auto';
          textarea.style.height = textarea.scrollHeight + 'px';
        }
      }, 0);
    }
  };

  // Função para alterar dados de uma variação específica
  const handleVariationChange = (stepIndex: number, variationIndex: number, field: string, value: VariationFieldValue) => {
    console.log('=== HANDLE VARIATION CHANGE ===');
    console.log('Step index:', stepIndex, 'Variation index:', variationIndex, 'Field:', field, 'Value:', value);

    setProjectData(prev => ({
      ...prev,
      steps: prev.steps.map((step, stepIdx) =>
        stepIdx === stepIndex
          ? {
            ...step,
            variations: step.variations.map((variation, varIdx) =>
              varIdx === variationIndex
                ? { ...variation, [field]: value }
                : variation
            )
          }
          : step
      )
    }));
    setHasUnsavedChanges(true);
  };

  // Função para iniciar transcrição com Web Speech API
  const startRecording = () => {
    if (!speechRecognition) {
      toast.error('Transcrição de áudio não suportada neste navegador');
      return;
    }

    try {
      setIsRecording(true);
      setIsTranscribing(false);

      // Configurar eventos da Speech Recognition
      speechRecognition.onstart = () => {
        console.log('Reconhecimento de voz iniciado');
        toast.success('Gravação iniciada! Fale agora...');
      };

      speechRecognition.onresult = (event: Event & { results: SpeechRecognitionResultList; resultIndex: number }) => {
        let interimTranscript = '';
        let finalTranscriptPart = '';

        // Processar todos os resultados
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            finalTranscriptPart += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Se temos resultado final, processar e adicionar ao campo
        if (finalTranscriptPart) {
          console.log('Texto final:', finalTranscriptPart);

          // Aplicar melhorias de pontuação apenas no texto final
          const improvedTranscript = improveTranscription(finalTranscriptPart);
          console.log('Texto melhorado:', improvedTranscript);

          // Armazenar o texto transcrito para processamento posterior
          console.log('Armazenando transcrição pendente:', improvedTranscript);
          setPendingTranscription(improvedTranscript);
        }

        // Log do progresso (resultado intermediário)
        if (interimTranscript) {
          console.log('Transcrevendo...:', interimTranscript);
        }
      };

      speechRecognition.onerror = (event: Event & { error: string }) => {
        console.error('Erro na transcrição:', event.error);
        toast.error('Erro ao transcrever áudio: ' + event.error);
        setIsRecording(false);
        setIsTranscribing(false);
      };

      speechRecognition.onend = () => {
        console.log('Reconhecimento de voz finalizado');
        setIsRecording(false);
        setIsTranscribing(false);

        // Aguardar um pouco antes de limpar o transcribingVariation
        // para garantir que a transcrição seja processada primeiro
        setTimeout(() => {
          console.log('Limpando transcribingVariation após processamento');
          setTranscribingVariation(null);
        }, 2000); // Aumentado para 2 segundos para garantir processamento
      };

      // Iniciar reconhecimento
      speechRecognition.start();
    } catch (error) {
      console.error('Erro ao iniciar reconhecimento:', error);
      toast.error('Erro ao iniciar transcrição');
      setIsRecording(false);
    }
  };

  // Função para parar transcrição
  const stopRecording = () => {
    if (speechRecognition && isRecording) {
      speechRecognition.stop();
      toast.info('Finalizando transcrição...');
    }
  };

  const handlePhoto = async (file: File, stepIndex: number, variationIndex: number) => {
    try {
      console.log('=== UPLOAD DE FOTO INICIADO ===');
      console.log('Arquivo:', file.name, 'Tamanho:', file.size, 'Tipo:', file.type);
      console.log('Step:', stepIndex, 'Variação:', variationIndex);
      console.log('EditId:', currentProjectId);
      console.log('Storage disponível:', !!storage);
      console.log('Usuário autenticado:', !!user, user?.uid);

      // Verificar autenticação
      if (!user) {
        throw new Error('Usuário não está autenticado. Faça login novamente.');
      }

      setPhotoUploading(true);

      // Validações
      const currentVariation = projectData.steps[stepIndex]?.variations[variationIndex];
      if (!currentVariation) {
        throw new Error('Variação não encontrada');
      }

      if (currentVariation.photos && currentVariation.photos.length >= 2) {
        throw new Error('Máximo de 2 fotos por variação atingido');
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('Arquivo deve ser uma imagem');
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB
        throw new Error('Arquivo muito grande. Máximo 10MB');
      }

      console.log('✅ Validações OK, iniciando upload...');

      // Capturar localização GPS
      let latitude = 0;
      let longitude = 0;
      
      try {
        console.log('📍 Tentando obter localização GPS...');
        console.log('📍 Navegador suporta geolocalização:', !!navigator.geolocation);
        
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocalização não suportada pelo navegador'));
            return;
          }
          
          const successCallback = (position: GeolocationPosition) => {
            console.log('📍 Sucesso na geolocalização:', position);
            resolve(position);
          };
          
          const errorCallback = (error: GeolocationPositionError) => {
            console.error('📍 Erro na geolocalização:', error);
            console.error('📍 Código do erro:', error.code);
            console.error('📍 Mensagem do erro:', error.message);
            reject(error);
          };
          
          const options = {
            enableHighAccuracy: true,
            timeout: 15000, // Aumentado para 15 segundos
            maximumAge: 300000 // 5 minutos
          };
          
          console.log('📍 Iniciando getCurrentPosition com opções:', options);
          navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
        });
        
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        console.log('✅ Localização capturada com sucesso:', { 
          latitude, 
          longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed
        });
      } catch (locationError) {
        console.warn('⚠️ Erro ao obter localização:', locationError);
        console.log('📸 Continuando sem localização GPS');
        
        // Tentar obter localização com configurações mais permissivas
        try {
          console.log('📍 Tentando segunda tentativa com configurações mais permissivas...');
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (position) => resolve(position),
              (error) => reject(error),
              {
                enableHighAccuracy: false, // Menos precisa, mas mais rápida
                timeout: 5000,
                maximumAge: 600000 // 10 minutos
              }
            );
          });
          
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          console.log('✅ Localização capturada na segunda tentativa:', { latitude, longitude });
        } catch (secondError) {
          console.warn('⚠️ Segunda tentativa também falhou:', secondError);
        }
      }

      // Criar caminho único para o arquivo
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `projects/${currentProjectId || 'temp'}/${currentVariation.id}/${timestamp}_${randomId}.${fileExtension}`;

      console.log('📁 Caminho do arquivo:', fileName);

      // Upload para Firebase Storage
      const storageRef = ref(storage, fileName);
      console.log('📦 Referência criada:', storageRef);
      console.log('🌐 Storage bucket:', storage.app.options.storageBucket);
      console.log('🔗 Storage URL base:', `https://firebasestorage.googleapis.com/v0/b/${storage.app.options.storageBucket}/o`);

      console.log('⬆️ Fazendo upload...');

      // Upload com listener de progresso
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Criar Promise para aguardar o upload
      const uploadPromise = new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            // Progresso do upload
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`📊 Progresso: ${progress.toFixed(1)}%`);
          },
          (error) => {
            // Erro no upload
            console.error('❌ Erro no upload:', error);
            reject(error);
          },
          () => {
            // Upload concluído
            console.log('✅ Upload concluído');
            resolve(uploadTask.snapshot);
          }
        );
      });

      await uploadPromise;

      console.log('🔗 Obtendo URL pública...');
      const downloadURL = await getDownloadURL(storageRef);
      console.log('✅ URL obtida:', downloadURL);

      // Criar objeto da foto
      const photoData = {
        id: `photo_${timestamp}_${randomId}`,
        url: downloadURL,
        fileName: file.name,
        size: file.size,
        type: file.type,
        createdAt: new Date().toISOString(),
        latitude: latitude,
        longitude: longitude
      };

      console.log('📸 Dados da foto:', photoData);
      console.log('📍 Coordenadas finais salvas:', { latitude: photoData.latitude, longitude: photoData.longitude });

      // Atualizar estado local
      setProjectData(prevData => {
        const newSteps = [...prevData.steps];
        const targetStep = newSteps[stepIndex];

        if (targetStep) {
          const newVariations = [...targetStep.variations];
          const targetVariation = newVariations[variationIndex];

          if (targetVariation) {
            const currentPhotos = targetVariation.photos || [];
            newVariations[variationIndex] = {
              ...targetVariation,
              photos: [...currentPhotos, photoData]
            };

            newSteps[stepIndex] = {
              ...targetStep,
              variations: newVariations
            };
          }
        }

        const newData = { ...prevData, steps: newSteps };
        console.log('🔄 Estado atualizado com foto:', {
          stepIndex,
          variationIndex,
          photoData,
          totalPhotos: newData.steps[stepIndex]?.variations[variationIndex]?.photos?.length,
          todasAsFotos: newData.steps[stepIndex]?.variations[variationIndex]?.photos
        });
        return newData;
      });

      console.log('✅ Estado local atualizado');

      setHasUnsavedChanges(true);
      toast.success(`Foto "${file.name}" enviada com sucesso!`);

    } catch (error) {
      console.error('❌ Erro no upload:', error);
      if (error.message.includes('auth')) {
        toast.error('Erro de autenticação. Faça login novamente.');
      } else if (error.message.includes('permission')) {
        toast.error('Sem permissão para upload. Verifique as configurações.');
      } else {
        toast.error(`Erro: ${error.message}`);
      }
    } finally {
      console.log('🔄 Finalizando upload...');
      setPhotoUploading(false);
    }
  };

  const addNewStep = (article?: Article) => {
    if (!article) {
      setShowArticleSelection(true);
      return;
    }

    // Verificar se o artigo já existe no projeto
    const articleExists = projectData.steps.some(step =>
      step.articleId === article.id ||
      step.code === article.code ||
      step.title === `${article.code} - ${article.title}`
    );

    if (articleExists) {
      toast.error('Este artigo já foi adicionado ao projeto. Para adicionar mais variações (NCs), use o botão "+" dentro do artigo existente.');
      setShowArticleSelection(false);
      return;
    }

    const newStep: ProjectStep = {
      id: `step-${Date.now()}`,
      articleId: article.id,
      code: article.code,
      title: `${article.code} - ${article.title}`,
      category: article.category,
      variations: [{
        id: `variation-${Date.now()}`,
        name: "NC-1",
        evaluation: "",
        currentSituation: "",
        clientGuidance: "",
        photos: [] // Garantir que o array photos seja inicializado corretamente
      }]
    };

    setProjectData(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
    setHasUnsavedChanges(true);
  };

  // Função para adicionar variação dentro de um step
  const addVariation = (stepIndex: number) => {
    console.log('=== ADICIONANDO VARIAÇÃO ===');
    console.log('Step index:', stepIndex);
    console.log('Steps atuais:', projectData.steps);
    console.log('Step alvo:', projectData.steps[stepIndex]);

    const updatedSteps = [...projectData.steps];
    if (!updatedSteps[stepIndex]) {
      console.error('Step não encontrado:', stepIndex);
      toast.error('Erro: Step não encontrado');
      return;
    }

    // Calcular o próximo número NC baseado nas variações existentes
    const currentVariations = updatedSteps[stepIndex].variations;
    const nextNumber = currentVariations.length + 1;
    const variationName = `NC-${nextNumber}`;

    console.log('Variações atuais:', currentVariations);
    console.log('Nova variação:', variationName);

    const newVariation: ProjectVariation = {
      id: `variation-${Date.now()}`,
      name: variationName,
      evaluation: "",
      location: "",
      currentSituation: "",
      clientGuidance: "",
      photos: [] // Garantir que o array photos seja inicializado
    };

    console.log('Nova variação criada:', newVariation);

    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      variations: [...updatedSteps[stepIndex].variations, newVariation]
    };

    console.log('Step atualizado:', updatedSteps[stepIndex]);
    console.log('Todos os steps após atualização:', updatedSteps);

    setProjectData(prev => ({
      ...prev,
      steps: updatedSteps
    }));
    setHasUnsavedChanges(true);

    toast.success(`Variação ${variationName} adicionada com sucesso!`);
    console.log('=== VARIAÇÃO ADICIONADA COM SUCESSO ===');
  };

  // Função para remover variação
  const removeVariation = (stepIndex: number, variationIndex: number) => {
    const updatedSteps = [...projectData.steps];
    if (!updatedSteps[stepIndex] || updatedSteps[stepIndex].variations.length <= 1) return;

    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      variations: updatedSteps[stepIndex].variations.filter((_, index) => index !== variationIndex)
    };

    setProjectData(prev => ({ ...prev, steps: updatedSteps }));
    setHasUnsavedChanges(true);
  };

  const handleArticleSelect = (article: Article) => {
    // Verificar se o artigo já existe no projeto
    const articleExists = projectData.steps.some(step =>
      step.articleId === article.id ||
      step.code === article.code ||
      step.title === `${article.code} - ${article.title}`
    );

    if (articleExists) {
      toast.error('Este artigo já foi adicionado ao projeto. Para adicionar mais variações (NCs), use o botão "+" dentro do artigo existente.');
      setShowArticleSelection(false);
      return;
    }

    addNewStep(article);
  };

  // Filtrar artigos baseado na busca e categoria
  const filteredArticles = ARTICLES.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Obter IDs dos artigos já usados no projeto
  const usedArticleIds = projectData.steps.map(step => step.articleId);
  console.log('Artigos usados no projeto:', usedArticleIds);
  console.log('Steps do projeto:', projectData.steps.map(step => ({ id: step.id, articleId: step.articleId, title: step.title })));

  // Função para verificar se um artigo já está sendo usado
  const isArticleUsed = (article: Article) => {
    // Verificar por ID
    if (usedArticleIds.includes(article.id)) {
      return true;
    }

    // Verificar por código
    const usedCodes = projectData.steps.map(step => step.code);
    if (usedCodes.includes(article.code)) {
      return true;
    }

    // Verificar por título completo
    const usedTitles = projectData.steps.map(step => step.title);
    const articleFullTitle = `${article.code} - ${article.title}`;
    if (usedTitles.includes(articleFullTitle)) {
      return true;
    }

    return false;
  };

  // Obter categorias únicas
  const categories = Array.from(new Set(ARTICLES.map(article => article.category)));

  const removeStep = (stepIndex: number) => {
    setProjectData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, index) => index !== stepIndex)
    }));
    setHasUnsavedChanges(true);
  };

  // Função para limpar steps duplicados (temporária para debug)
  const cleanDuplicateSteps = () => {
    const uniqueSteps = projectData.steps.filter((step, index, self) =>
      index === self.findIndex(s => s.code === step.code)
    );

    if (uniqueSteps.length !== projectData.steps.length) {
      setProjectData(prev => ({ ...prev, steps: uniqueSteps }));
      toast.success(`Removidos ${projectData.steps.length - uniqueSteps.length} steps duplicados!`);
    } else {
      toast.info('Nenhum step duplicado encontrado.');
    }
  };

  // Calcular progresso geral
  const calculateProgress = () => {
    // Durante criação/edição administrativa, progresso sempre é 0%
    // Progresso só deve avançar quando cliente fizer adequações
    return 0;
  };

  // Calcular total de passos baseado no artigo atual
  const getTotalSteps = () => {
    return currentStepData ? currentStepData.variations.length : 0;
  };

  // Funções de autosave
  const sanitizeDataForFirestore = (data: any): any => {
    if (data === null || data === undefined) {
      return null;
    }

    if (Array.isArray(data)) {
      return data.map(item => sanitizeDataForFirestore(item));
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          sanitized[key] = sanitizeDataForFirestore(value);
        }
      }

      // Log específico para verificar se photoData está sendo preservado
      if (data.photoData) {
        console.log('Sanitizando photoData:', data.photoData);
        console.log('PhotoData após sanitização:', sanitized.photoData);
      }

      return sanitized;
    }

    return data;
  };

  const saveToLocalStorage = useCallback(() => {
    try {
      const draftKey = draftId || `draft_${Date.now()}`;
      const draftData = {
        ...projectData,
        lastModified: new Date().toISOString(),
        isEditMode,
        currentProjectId
      };
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      if (!draftId) {
        setDraftId(draftKey);
      }
    } catch (error) {
      console.error('Erro ao salvar no localStorage:', error);
    }
  }, [projectData, draftId, isEditMode, currentProjectId]);

  const autoSave = useCallback(async () => {
    console.log('=== INICIANDO AUTO SAVE ===');
    console.log('Nome do projeto:', projectData.nome);
    console.log('Cliente ID:', projectData.clienteId);
    console.log('Modo de edição:', isEditMode);
    console.log('Edit ID:', currentProjectId);
    console.log('Draft ID:', draftId);

    if (!projectData.nome.trim()) {
      console.log('Nome do projeto vazio, salvando apenas no localStorage');
      saveToLocalStorage();
      return;
    }

    try {
      setAutoSaving(true);
      console.log('Iniciando autoSave com dados:', projectData);

      // Verificar se há fotos no estado atual antes de preparar os dados
      const photosInCurrentState = projectData.steps.flatMap(step =>
        step.variations.filter(variation => variation.photos.length > 0)
      );
      console.log('Fotos no estado atual:', photosInCurrentState.length, photosInCurrentState);

      // Salvar no localStorage primeiro
      saveToLocalStorage();

      // Preparar dados para Firestore
      const projectDataToSave = {
        nome: projectData.nome || '',
        clienteId: projectData.clienteId || '',
        isDraft: true, // Marcar como rascunho
        lastAutoSave: new Date(),
        customAccordions: projectData.steps.map(step => {
          console.log('=== PREPARANDO STEP PARA SALVAMENTO ===');
          console.log('Step:', step.title);
          console.log('Variações no step:', step.variations);
          console.log('Quantidade de variações:', step.variations.length);

          return {
            title: step.category || '',
            items: [{
              title: step.title, // Usar apenas o título já formatado
              category: step.category || '',
              subItems: step.variations.map(variation => ({
                id: variation.id,
                title: variation.name,
                evaluation: variation.evaluation || '',
                location: variation.location || '',
                currentSituation: variation.currentSituation || '',
                clientGuidance: variation.clientGuidance || '',
                photos: (variation.photos || []).map(photo => ({
                  id: photo.id,
                  url: photo.url,
                  createdAt: photo.createdAt,
                  latitude: photo.latitude || 0,
                  longitude: photo.longitude || 0
                })),
                completed: false
              }))
            }]
          };
        })
      };

      console.log('Dados preparados para salvamento:', projectDataToSave);

      // Verificar se há fotos nos dados
      const photosInData = projectDataToSave.customAccordions.flatMap(accordion =>
        accordion.items.flatMap(item =>
          item.subItems.filter(subItem => subItem.photos.length > 0)
        )
      );
      console.log('Fotos encontradas nos dados:', photosInData.length, photosInData);

      // Verificar se todas as variações estão sendo preservadas
      const totalVariationsInData = projectDataToSave.customAccordions.reduce((total, accordion) => {
        return total + accordion.items.reduce((itemTotal, item) => {
          return itemTotal + item.subItems.length;
        }, 0);
      }, 0);

      const totalVariationsInState = projectData.steps.reduce((total, step) => {
        return total + step.variations.length;
      }, 0);

      console.log('=== VERIFICAÇÃO DE PRESERVAÇÃO DE DADOS ===');
      console.log('Variações no estado atual:', totalVariationsInState);
      console.log('Variações nos dados para salvamento:', totalVariationsInData);

      if (totalVariationsInState !== totalVariationsInData) {
        console.error('❌ ERRO: Perda de variações detectada!');
        console.error('Estado atual:', projectData.steps.map(step => ({
          title: step.title,
          variations: step.variations.length
        })));
        console.error('Dados para salvamento:', projectDataToSave.customAccordions.map(accordion =>
          accordion.items.map(item => ({
            title: item.title,
            subItems: item.subItems.length
          }))
        ));
      } else {
        console.log('✅ Todas as variações preservadas corretamente');
      }

      // Sanitizar dados para remover campos undefined
      const sanitizedData = sanitizeDataForFirestore(projectDataToSave);
      console.log('Dados sanitizados:', sanitizedData);

      if (isEditMode && currentProjectId) {
        // Atualizar projeto existente
        console.log('Atualizando projeto existente no Firestore:', currentProjectId);
        const projectRef = doc(db, 'projetos', currentProjectId);
        await updateDoc(projectRef, sanitizedData);
        console.log('✅ Projeto atualizado no Firestore com sucesso:', currentProjectId);
      } else if (draftId && draftId.startsWith('firebase_')) {
        // Atualizar rascunho existente no Firestore
        console.log('Atualizando rascunho existente no Firestore:', draftId);
        const draftRef = doc(db, 'projetos', draftId.replace('firebase_', ''));
        await updateDoc(draftRef, sanitizedData);
        console.log('✅ Rascunho atualizado no Firestore com sucesso:', draftId);
      } else {
        // Criar novo rascunho no Firestore
        console.log('Criando novo rascunho no Firestore');
        const docRef = await addDoc(collection(db, 'projetos'), sanitizedData);
        setDraftId(`firebase_${docRef.id}`);
        console.log('✅ Novo rascunho criado no Firestore:', docRef.id);
      }

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      console.log('✅ Auto save concluído com sucesso');
    } catch (error) {
      console.error('❌ Erro no autosave:', error);
      // Em caso de erro, pelo menos salva no localStorage
      saveToLocalStorage();
    } finally {
      setAutoSaving(false);
    }
  }, [projectData, saveToLocalStorage, isEditMode, currentProjectId, draftId]);

  const triggerAutoSave = useCallback(() => {
    setHasUnsavedChanges(true);

    // Limpar timeout anterior
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Agendar novo autosave
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, AUTOSAVE_DELAY);
  }, [autoSave, AUTOSAVE_DELAY]);

  const clearDraft = useCallback(() => {
    if (draftId && draftId.startsWith('draft_')) {
      localStorage.removeItem(draftId);
    }
    setDraftId(null);
    setHasUnsavedChanges(false);
  }, [draftId]);

  const handleSave = async () => {
    if (saving) return;

    setSaving(true);

    try {
      console.log('Artigos usados no projeto:', usedArticleIds);
      console.log('Steps do projeto:', projectData.steps);

      if (isEditMode && currentProjectId) {
        // MODO EDIÇÃO
        const projectRef = doc(db, 'projetos', currentProjectId);

        const rawProjectData = {
          nome: projectData.nome || '',
          updatedAt: new Date().toISOString(),
          customAccordions: projectData.steps.map(step => ({
            title: step.category || 'DOCUMENTAÇÃO PRELIMINAR',
            items: [{
              title: step.title,
              category: step.category || '',
              subItems: step.variations.map(variation => ({
                id: variation.id,
                title: variation.name,
                evaluation: variation.evaluation || '',
                location: variation.location || '',
                currentSituation: variation.currentSituation || '',
                clientGuidance: variation.clientGuidance || '',
                photos: (variation.photos || []).map(photo => ({
                  id: photo.id,
                  url: photo.url,
                  createdAt: photo.createdAt,
                  latitude: photo.latitude || 0,
                  longitude: photo.longitude || 0
                })),
                completed: false
              }))
            }]
          }))
        };

        console.log('🔍 Dados para salvar:', rawProjectData);

        await updateDoc(projectRef, rawProjectData);

        // Sincronizar relatórios após atualizar o projeto
        try {
          await RelatorioService.syncRelatoriosFromProject(currentProjectId, user?.uid || '');
          console.log('✅ Relatórios sincronizados após atualização do projeto');
        } catch (syncError) {
          console.error('⚠️ Erro ao sincronizar relatórios:', syncError);
          // Não falhar a operação principal por causa da sincronização
        }

        setHasUnsavedChanges(false);
        toast.success('Projeto salvo com sucesso! Redirecionando para avaliação...');
        // Redirecionar para o novo modo de avaliação ponderada
        navigate(`/projetos/write/${currentProjectId}`);

      } else {
        // MODO CRIAÇÃO
        const newProjectData = {
          nome: projectData.nome || '',
          nomeCliente: projectData.cliente?.nome || '',
          clienteId,
          status: 'Iniciado',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          customAccordions: projectData.steps.map(step => ({
            title: step.category || 'DOCUMENTAÇÃO PRELIMINAR',
            items: [{
              title: step.title,
              category: step.category || '',
              subItems: step.variations.map(variation => ({
                id: variation.id,
                title: variation.name,
                evaluation: variation.evaluation || '',
                location: variation.location || '',
                currentSituation: variation.currentSituation || '',
                clientGuidance: variation.clientGuidance || '',
                photos: (variation.photos || []).map(photo => ({
                  id: photo.id,
                  url: photo.url,
                  createdAt: photo.createdAt,
                  latitude: photo.latitude || 0,
                  longitude: photo.longitude || 0
                })),
                completed: false
              }))
            }]
          }))
        };

        const docRef = await addDoc(collection(db, 'projetos'), newProjectData);

        // Sincronizar relatórios após criar o projeto
        try {
          await RelatorioService.syncRelatoriosFromProject(docRef.id, user?.uid || '');
          console.log('✅ Relatórios sincronizados após criação do projeto');
        } catch (syncError) {
          console.error('⚠️ Erro ao sincronizar relatórios:', syncError);
          // Não falhar a operação principal por causa da sincronização
        }

        setHasUnsavedChanges(false);
        toast.success('Projeto criado com sucesso! Redirecionando para avaliação...');
        // Redirecionar para o novo modo de avaliação ponderada
        navigate(`/projetos/write/${docRef.id}`);
      }

    } catch (error) {
      console.error('Erro ao salvar projeto:', error);
      toast.error('Erro ao salvar projeto');
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = async () => {
    if (!projectData.nome) return;
    
    setGeneratingPDF(true);
    try {
      console.log('🔄 Iniciando geração do PDF...');
      console.log('📊 Dados do projeto:', projectData);
      
      // Converter dados do projeto para o formato esperado pelo PDFService
      const pdfData: PDFProjectData = {
        nome: projectData.nome,
        cliente: projectData.cliente || undefined,
        customAccordions: projectData.steps.map(step => {
          console.log(`📋 Processando step: ${step.title}`);
          console.log(`📸 Variações com fotos:`, step.variations.filter(v => v.photos && v.photos.length > 0).length);
          
          return {
            title: step.category,
            items: [{
              title: step.title,
              subItems: step.variations.map(variation => {
                const hasPhotos = variation.photos && variation.photos.length > 0;
                console.log(`🖼️ Variação "${variation.name}" tem fotos:`, hasPhotos);
                if (hasPhotos) {
                  console.log(`📸 URL da primeira foto:`, variation.photos[0].url);
                }
                
                return {
                  id: variation.id,
                  title: variation.name,
                  evaluation: variation.evaluation,
                  currentSituation: variation.currentSituation,
                  clientGuidance: variation.clientGuidance,
                  photoData: hasPhotos ? {
                    url: variation.photos[0].url,
                    createdAt: variation.photos[0].createdAt,
                    latitude: variation.photos[0].latitude,
                    longitude: variation.photos[0].longitude
                  } : undefined
                };
              })
            }]
          };
        })
      };
      
      console.log('📄 Dados convertidos para PDF:', pdfData);
      
      await PDFService.generateProjectPDF(pdfData);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Estado para controlar qual variação está ativa
  const [activeVariation, setActiveVariation] = useState(0);

  const progress = calculateProgress();

  // Função para remover foto do Storage e do estado
  const removePhoto = async (stepIndex: number, variationIndex: number, photoId: string) => {
    try {
      console.log('=== REMOVENDO FOTO ===');
      console.log('Step:', stepIndex, 'Variação:', variationIndex, 'Foto ID:', photoId);

      const currentVariation = projectData.steps[stepIndex]?.variations[variationIndex];
      if (!currentVariation) {
        throw new Error('Variação não encontrada');
      }

      const photoToRemove = currentVariation.photos?.find(photo => photo.id === photoId);
      if (!photoToRemove) {
        throw new Error('Foto não encontrada');
      }

      console.log('🗑️ Removendo do Storage:', photoToRemove.url);

      // Extrair o caminho do arquivo da URL
      try {
        const url = new URL(photoToRemove.url);
        const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
        if (pathMatch) {
          const filePath = decodeURIComponent(pathMatch[1]);
          const fileRef = ref(storage, filePath);
          await deleteObject(fileRef);
          console.log('✅ Arquivo removido do Storage');
        }
      } catch (storageError) {
        console.warn('⚠️ Erro ao remover do Storage:', storageError);
        // Continua mesmo se não conseguir remover do Storage
      }

      // Remover do estado local
      setProjectData(prevData => {
        const newSteps = [...prevData.steps];
        const targetStep = newSteps[stepIndex];

        if (targetStep) {
          const newVariations = [...targetStep.variations];
          const targetVariation = newVariations[variationIndex];

          if (targetVariation) {
            const updatedPhotos = (targetVariation.photos || []).filter(photo => photo.id !== photoId);
            newVariations[variationIndex] = {
              ...targetVariation,
              photos: updatedPhotos
            };

            newSteps[stepIndex] = {
              ...targetStep,
              variations: newVariations
            };
          }
        }

        return { ...prevData, steps: newSteps };
      });

      console.log('✅ Foto removida do estado local');
      setHasUnsavedChanges(true);
      toast.success('Foto removida com sucesso!');

    } catch (error) {
      console.error('❌ Erro ao remover foto:', error);
      toast.error(`Erro ao remover foto: ${error.message}`);
    }
  };

  // Função para forçar atualização do projeto existente
  const forceUpdateProject = async () => {
    try {
      console.log('🔄 Forçando atualização do projeto existente...');

      const projectDataToSave = {
        nome: projectData.nome || '',
        clienteId: projectData.clienteId || '',
        cliente: projectData.cliente || null,
        status: 'iniciado',
        progresso: 0,
        dataInicio: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDraft: false,
        customAccordions: projectData.steps.map(step => ({
          title: step.category || 'Categoria',
          items: [{
            title: step.title,
            category: step.category || 'Categoria',
            subItems: step.variations.map(variation => ({
              id: variation.id,
              title: variation.name,
              evaluation: variation.evaluation || '',
              location: variation.location || '',
              currentSituation: variation.currentSituation || '',
              clientGuidance: variation.clientGuidance || '',
              photos: (variation.photos || []).map(photo => ({
                id: photo.id,
                url: photo.url,
                createdAt: photo.createdAt,
                latitude: photo.latitude || 0,
                longitude: photo.longitude || 0
              })),
              completed: false
            }))
          }]
        }))
      };

      // Garantir que o objeto cliente seja salvo corretamente
      if (projectData.clienteId && !projectData.cliente) {
        try {
          const clienteRef = doc(db, 'users', projectData.clienteId);
          const clienteDoc = await getDoc(clienteRef);
          if (clienteDoc.exists()) {
            const clienteData = clienteDoc.data();
            projectDataToSave.cliente = {
              id: projectData.clienteId,
              nome: clienteData.displayName || clienteData.nome || clienteData.email,
              email: clienteData.email,
              empresa: clienteData.company || clienteData.empresa || 'Não informado'
            };
          }
        } catch (error) {
          console.error('Erro ao buscar dados do cliente:', error);
        }
      }

      if (isEditMode && currentProjectId) {
        const projectRef = doc(db, 'projetos', currentProjectId);
        await updateDoc(projectRef, projectDataToSave);
        console.log('✅ Projeto atualizado com sucesso:', currentProjectId);
        toast.success('Projeto atualizado com sucesso!');
      } else {
        console.log('❌ Não é modo de edição ou currentProjectId não encontrado');
        toast.error('Erro: Projeto não encontrado para atualização');
      }
    } catch (error) {
      console.error('❌ Erro ao forçar atualização:', error);
      toast.error('Erro ao atualizar projeto');
    }
  };

  // Resetar activeVariation quando mudar de artigo
  useEffect(() => {
    setActiveVariation(0);
  }, [currentStep]);

  // Função para adicionar transcrição diretamente ao campo correto
  const addTranscriptionToField = (variationIndex: number, text: string) => {
    console.log('=== ADICIONANDO TRANSCRIÇÃO DIRETAMENTE ===');
    console.log('Variation Index:', variationIndex);
    console.log('Texto:', text);
    console.log('Current Step:', currentStep);

    const variation = currentStepData?.variations?.[variationIndex];

    console.log('Current Step Data:', currentStepData);
    console.log('Variation encontrada:', variation);

    if (variation) {
      const currentText = variation.currentSituation || '';
      const newText = currentText ? `${currentText} ${text}` : text;

      console.log('Texto atual:', currentText);
      console.log('Novo texto:', newText);

      handleVariationChange(currentStep, variationIndex, 'currentSituation', newText);
      console.log('Transcrição adicionada com sucesso ao variation', variationIndex);
    } else {
      console.error('Variation não encontrada para index:', variationIndex);
    }
  };

  // Função para transcrição de áudio
  const handleTranscribe = async (variationIndex: number) => {
    if (!speechRecognition) {
      toast.error('Reconhecimento de voz não disponível');
      return;
    }

    console.log('=== INICIANDO TRANSCRIÇÃO ===');
    console.log('Variation Index:', variationIndex);
    console.log('Current Step:', currentStep);

    setIsTranscribing(true);
    setTranscribingVariation(variationIndex);

    console.log('TranscribingVariation definido como:', variationIndex);

    try {
      // Parar gravação atual se estiver ativa
      if (isRecording) {
        console.log('Parando gravação atual...');
        stopRecording();
        // Aguardar um pouco para garantir que a gravação anterior foi finalizada
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('Iniciando nova gravação...');
      startRecording();

    } catch (error) {
      console.error('Erro na transcrição:', error);
      toast.error('Erro ao iniciar transcrição');
      setIsTranscribing(false);
      setTranscribingVariation(null);
    }
  };

  // Função para pausar/retomar transcrição
  const toggleTranscription = (variationIndex: number) => {
    if (isRecording) {
      stopRecording();
    } else {
      handleTranscribe(variationIndex);
    }
  };

  // Função para gerar orientação com IA
  const handleGenerateGuidance = async (variationIndex: number) => {
    const currentVariation = projectData.steps[currentStep]?.variations[variationIndex];

    if (!currentVariation?.currentSituation?.trim()) {
      toast.error('É necessário preencher a situação atual primeiro');
      return;
    }

    setIsGenerating(true);

    try {
      // Chamada ao assistente OpenAI
      handleVariationChange(currentStep, variationIndex, 'clientGuidance', 'Gerando orientação...');
      const orientacao = await gerarOrientacaoOpenAI(currentVariation.currentSituation);
      handleVariationChange(currentStep, variationIndex, 'clientGuidance', orientacao);
      toast.success('Orientação gerada com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar orientação:', error);
      toast.error(`Erro ao gerar orientação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Funções para gerenciar o dialog de itens e checklists
  const openItemDialog = (stepIndex: number, variationIndex: number, editingIndex: number = -1) => {
    console.log('🔍 Abrindo dialog:', { stepIndex, variationIndex, editingIndex });
    setCurrentStepIndex(stepIndex);
    setCurrentVariationIndex(variationIndex);
    setEditingItemIndex(editingIndex);
    setDialogOpen(true);
    setSelectedItemId("");
    setSelectedChecklistId("");
    setSelectedItemAtributos({});
    setSelectedTopicos([]);
  };

  const closeItemDialog = () => {
    console.log('🔍 Fechando dialog');
    setDialogOpen(false);
    setCurrentStepIndex(0);
    setCurrentVariationIndex(0);
    setEditingItemIndex(-1);
    setSelectedItemId("");
    setSelectedChecklistId("");
    setSelectedItemAtributos({});
    setSelectedTopicos([]);
  };

  const handleItemSelect = (itemId: string) => {
    console.log('🔍 Item selecionado:', itemId);
    setSelectedItemId(itemId);
    setSelectedChecklistId("");
    setSelectedTopicos([]);
    
    const selectedItem = itens.find(item => item.id === itemId);
    if (selectedItem) {
      const atributosIniciais: { [key: string]: string } = {};
      selectedItem.atributos.forEach(atributo => {
        atributosIniciais[atributo.nome] = "";
      });
      setSelectedItemAtributos(atributosIniciais);
      console.log('🔍 Atributos inicializados:', atributosIniciais);
    }
  };

  const handleChecklistSelect = (checklistId: string) => {
    console.log('🔍 Checklist selecionado:', checklistId);
    setSelectedChecklistId(checklistId);
    setSelectedTopicos([]);
  };

  const handleTopicoToggle = (topicoId: string) => {
    console.log('🔍 Tópico toggle:', topicoId);
    setSelectedTopicos(prev => 
      prev.includes(topicoId) 
        ? prev.filter(id => id !== topicoId)
        : [...prev, topicoId]
    );
  };

  const generateCurrentSituationText = (selectedItems: SelectedItemData[]): string => {
    console.log('🔍 Gerando texto para itens:', selectedItems);
    
    if (!selectedItems || selectedItems.length === 0) {
      return "";
    }

    return selectedItems.map(item => {
      // Formatar atributos
      const atributosText = Object.entries(item.atributos)
        .filter(([_, value]) => value.trim() !== "")
        .map(([nome, value]) => `${nome}: ${value}`)
        .join(", ");

      // Formatar tópicos selecionados
      const topicosText = item.topicosSelecionados.join(", ");

      // Montar texto final com formatação organizada
      let result = `${item.itemNome}`;
      if (atributosText) {
        result += `:\n${atributosText}`;
      }
      if (topicosText) {
        result += `.\n${topicosText}`;
      }

      console.log('🔍 Texto gerado:', result);
      return result;
    }).join("\n\n");
  };

  const saveSelectedItem = () => {
    console.log('🔍 Salvando item selecionado:', { selectedItemId, selectedChecklistId });
    
    if (!selectedItemId || !selectedChecklistId) {
      toast.error("Selecione um item e um checklist");
      return;
    }

    const selectedItem = itens.find(item => item.id === selectedItemId);
    const selectedChecklist = checklists.find(checklist => checklist.id === selectedChecklistId);
    
    if (!selectedItem || !selectedChecklist) {
      toast.error("Item ou checklist não encontrado");
      return;
    }

    const selectedTopicosNomes = selectedChecklist.topicos
      .filter(topico => selectedTopicos.includes(topico.id))
      .map(topico => topico.titulo);

    const newSelectedItemData: SelectedItemData = {
      itemId: selectedItemId,
      itemNome: selectedItem.nome,
      atributos: selectedItemAtributos,
      checklistId: selectedChecklistId,
      checklistNome: selectedChecklist.titulo,
      topicosSelecionados: selectedTopicosNomes
    };

    // Atualizar a variação com o novo item selecionado
    setProjectData(prev => ({
      ...prev,
      steps: prev.steps.map((step, stepIdx) => {
        if (stepIdx === currentStepIndex) {
          return {
            ...step,
            variations: step.variations.map((variation, varIdx) => {
              if (varIdx === currentVariationIndex) {
                const existingItems = variation.selectedItems || [];
                if (editingItemIndex >= 0) {
                  // Editando item existente
                  const updatedItems = [...existingItems];
                  updatedItems[editingItemIndex] = newSelectedItemData;
                  return { ...variation, selectedItems: updatedItems };
                } else {
                  // Adicionando novo item
                  return { ...variation, selectedItems: [...existingItems, newSelectedItemData] };
                }
              }
              return variation;
            })
          };
        }
        return step;
      })
    }));

    closeItemDialog();
    toast.success("Item adicionado com sucesso!");
  };

  const removeSelectedItem = (stepIndex: number, variationIndex: number, itemIndex: number) => {
    console.log('🔍 Removendo item:', { stepIndex, variationIndex, itemIndex });
    setProjectData(prev => ({
      ...prev,
      steps: prev.steps.map((step, stepIdx) => {
        if (stepIdx === stepIndex) {
          return {
            ...step,
            variations: step.variations.map((variation, varIdx) => {
              if (varIdx === variationIndex) {
                const existingItems = variation.selectedItems || [];
                const updatedItems = existingItems.filter((_, index) => index !== itemIndex);
                return { ...variation, selectedItems: updatedItems };
              }
              return variation;
            })
          };
        }
        return step;
      })
    }));
  };

  const editSelectedItem = (stepIndex: number, variationIndex: number, itemIndex: number) => {
    console.log('🔍 Editando item:', { stepIndex, variationIndex, itemIndex });
    const variation = projectData.steps[stepIndex]?.variations[variationIndex];
    if (variation && variation.selectedItems && variation.selectedItems[itemIndex]) {
      const itemData = variation.selectedItems[itemIndex];
      console.log('🔍 Dados do item para edição:', itemData);
      openItemDialog(stepIndex, variationIndex, itemIndex);
      setSelectedItemId(itemData.itemId);
      setSelectedItemAtributos(itemData.atributos);
      setSelectedChecklistId(itemData.checklistId);
      
      const selectedChecklist = checklists.find(c => c.id === itemData.checklistId);
      if (selectedChecklist) {
        const topicosIds = selectedChecklist.topicos
          .filter(topico => itemData.topicosSelecionados.includes(topico.titulo))
          .map(topico => topico.id);
        setSelectedTopicos(topicosIds);
        console.log('🔍 Tópicos IDs para edição:', topicosIds);
      }
    }
  };

  // useEffect para processar transcrições pendentes
  useEffect(() => {
    if (pendingTranscription && transcribingVariation !== null) {
      console.log('=== PROCESSANDO TRANSCRIÇÃO PENDENTE ===');
      console.log('Texto pendente:', pendingTranscription);
      console.log('Variation:', transcribingVariation);

      addTranscriptionToField(transcribingVariation, pendingTranscription);
      setPendingTranscription('');
    }
  }, [pendingTranscription, transcribingVariation]);

  return (
    <div className="space-y-6">
      {/* Layout Desktop */}
      <div className="hidden md:flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/projetos")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </Button>
          <div className="flex-1">
            <Input
              value={projectData.nome}
              onChange={(e) => handleProjectNameChange(e.target.value)}
              placeholder="Digite o nome do projeto..."
              className="text-2xl font-semibold border-none p-0 h-auto bg-transparent focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Download PDF - aparece após salvar */}
          {showDownloadButton && (
            <Button
              onClick={generatePDF}
              disabled={generatingPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {generatingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </>
              )}
            </Button>
          )}

          {/* Botão Salvar */}
          <Button
            onClick={handleSave}
            disabled={saving || !projectData.nome.trim()}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {hasUnsavedChanges ? 'Salvar*' : 'Salvar'}
              </>
            )}
          </Button>

          {/* Indicador de Status de Salvamento */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {autoSaving ? (
              <>
                <Clock className="h-3 w-3 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                <span>Não salvo</span>
              </>
            ) : lastSaved ? (
              <>
                <Save className="h-3 w-3 text-green-600" />
                <span>Salvo {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Layout Mobile */}
      <div className={`${isMobile ? 'block' : 'hidden'} space-y-4`}>
        {/* Título Centralizado */}
        <div className="text-center">
          <Input
            value={projectData.nome}
            onChange={(e) => handleProjectNameChange(e.target.value)}
            placeholder="Digite o nome do projeto..."
            className="text-xl font-semibold border-none p-0 h-auto bg-transparent focus-visible:ring-0 text-center"
          />
        </div>

        {/* Botões na mesma linha */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/projetos")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </Button>

          <div className="flex items-center gap-2">
            {/* Botão Download PDF - Mobile */}
            {showDownloadButton && (
              <Button
                onClick={generatePDF}
                disabled={generatingPDF}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {generatingPDF ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    PDF
                  </>
                ) : (
                  <>
                    <Download className="h-3 w-3 mr-1" />
                    PDF
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={handleSave}
              disabled={saving || !projectData.nome.trim()}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {hasUnsavedChanges ? 'Salvar*' : 'Salvar'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Indicador de Status de Salvamento - Mobile */}
        <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
          {autoSaving ? (
            <>
              <Clock className="h-3 w-3 animate-spin" />
              <span>Salvando...</span>
            </>
          ) : hasUnsavedChanges ? (
            <>
              <div className="h-2 w-2 bg-yellow-500 rounded-full" />
              <span>Não salvo</span>
            </>
          ) : lastSaved ? (
            <>
              <Save className="h-3 w-3 text-green-600" />
              <span>Salvo {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Cliente Selecionado */}
      {clienteData && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-600">Cliente selecionado:</p>
          <p className="font-medium">{clienteData.nome} - {clienteData.empresa}</p>
        </div>
      )}

      {/* Progresso Geral */}
      {/* Desktop */}
      {!isMobile && (
        <div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm mb-2 text-gray-600">Progresso geral</p>
          <Progress value={progress} className="h-4" />
          <p className="text-xs text-right mt-1 text-gray-500">
            {progress}% concluído
          </p>
          <p className="text-xs text-center mt-2 text-blue-600">
            ⏳ Progresso avança quando cliente informar adequações
          </p>
        </div>
      </div>
      )}

      {/* Mobile - Progresso Simplificado */}
      {isMobile && (
        <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600">Progresso geral</span>
          <span className="text-sm font-medium text-gray-900">{progress}% concluído</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-center text-blue-600">
          ⏳ Progresso avança quando cliente informar adequações
        </p>
      </div>
      )}

      {/* Indicador de Passos - responsivo */}
      {getTotalSteps() > 0 ? (
        <div className="flex flex-col items-center justify-center py-3 md:py-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs md:text-sm font-medium shadow-lg">
              {currentStep + 1}
            </div>
            <Button
              onClick={() => addNewStep()}
              className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-600 hover:bg-green-700 text-white p-0 shadow-lg"
              title="Adicionar Novo Artigo"
            >
              <Plus className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
          <p className="text-xs md:text-sm font-medium text-gray-700">Artigo {currentStep + 1} de {projectData.steps.length}</p>
          <Badge className="uppercase text-xs px-2 py-1 mt-1">{currentStepData?.category || ''}</Badge>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 md:py-8">
          <p className="text-gray-500 mb-3 md:mb-4 text-sm md:text-base">Nenhum item adicionado ainda</p>
          <Button onClick={() => addNewStep()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white" size="sm">
            <FileText className="h-4 w-4" />
            <span>Adicionar Primeiro Artigo</span>
          </Button>
        </div>
      )}

      {/* Card Principal - Apenas se houver steps - responsivo */}
      {currentStepData && (
        <Card>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 card-title-container">
              <div className="flex-1 min-w-0 break-words card-title-area">
                <Textarea
                  value={currentStepData?.title || ''}
                  onChange={(e) => handleStepChange('title', e.target.value)}
                  className="text-sm sm:text-base md:text-lg font-semibold border-none p-0 h-auto bg-transparent focus-visible:ring-0 w-full break-words overflow-visible card-title-input resize-none"
                  placeholder="Digite o título do item..."
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-center gap-2 flex-shrink-0 mt-2 sm:mt-0 card-title-buttons">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    addVariation(currentStep);
                  }}
                  className="text-blue-600 hover:text-blue-700 h-9 w-9 p-0"
                  title="Adicionar Nova NC (Não Conformidade) dentro deste artigo"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeStep(currentStep)}
                  className="text-red-600 hover:text-red-700 h-9 w-9 p-0"
                  title="Remover artigo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Lista de Variações - Desktop */}
              {currentStepData?.variations && currentStepData.variations.length > 0 && !isMobile && (
                <Card>
                  <CardContent>
                    <Accordion type="multiple" className="w-full">
                      {currentStepData.variations.map((variation, index) => {
                        return (
                          <AccordionItem key={variation.id} value={`variation-${index}`}>
                            <div className="flex items-center justify-between w-full">
                              <span className="font-medium text-left">{variation.name}</span>
                              <div className="flex items-center gap-2">
                                {(currentStepData?.variations?.length || 0) > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeVariation(currentStep, index);
                                    }}
                                    className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                                <AccordionTrigger className="hover:no-underline p-0 h-auto">
                                </AccordionTrigger>
                              </div>
                            </div>
                            <AccordionContent className="space-y-4">
                              {/* Avaliação */}
                              <div className="bg-gray-50 p-4 rounded-md space-y-2">
                                <Label className="text-sm font-medium">Avaliação</Label>
                                <RadioGroup
                                  value={variation.evaluation}
                                  onValueChange={(value) => handleVariationChange(currentStep, index, 'evaluation', value)}
                                  className="flex space-x-4"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="nc" id={`nc-${index}`} />
                                    <Label htmlFor={`nc-${index}`} className="text-sm">NC (Não Conforme)</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="r" id={`r-${index}`} />
                                    <Label htmlFor={`r-${index}`} className="text-sm">R (Recomendação)</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="na" id={`na-${index}`} />
                                    <Label htmlFor={`na-${index}`} className="text-sm">NA (Não Aplicável)</Label>
                                  </div>
                                </RadioGroup>
                              </div>

                              {/* Local */}
                              <div className="bg-gray-50 p-4 rounded-md space-y-2">
                                <Label className="text-sm font-medium">Local</Label>
                                <Input
                                  value={variation.location || ""}
                                  onChange={(e) => handleVariationChange(currentStep, index, 'location', e.target.value)}
                                  placeholder="Especifique o local onde foi encontrada..."
                                  className="w-full"
                                />
                              </div>

                              {/* Situação Atual */}
                              <div className="bg-gray-50 p-4 rounded-md space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium">Situação Atual</Label>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => {
                                        setActiveField(`currentSituation-${currentStep}-${index}`);
                                        if (isRecording) {
                                          stopRecording();
                                        } else {
                                          startRecording();
                                        }
                                      }}
                                      disabled={!speechRecognition}
                                    >
                                      {isRecording && activeField === `currentSituation-${currentStep}-${index}` ? (
                                        <MicOff className="h-4 w-4 text-red-500" />
                                      ) : (
                                        <Mic className="h-4 w-4 text-blue-500" />
                                      )}
                                    </Button>
                                    
                                    {/* Botão + para adicionar item/checklist */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => openItemDialog(currentStep, index)}
                                      title="Adicionar item e checklist"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Exibir itens selecionados */}
                                {variation.selectedItems && variation.selectedItems.length > 0 && (
                                  <div className="mb-3">
                                    <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      Itens selecionados ({variation.selectedItems.length})
                                    </div>
                                    <div className="space-y-2">
                                      {variation.selectedItems.map((selectedItem, itemIndex) => (
                                        <div key={itemIndex} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1 pr-3">
                                              <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-line">
                                                {generateCurrentSituationText([selectedItem])}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                                                onClick={() => editSelectedItem(currentStep, index, itemIndex)}
                                                title="Editar item"
                                              >
                                                <Edit className="h-3.5 w-3.5" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => removeSelectedItem(currentStep, index, itemIndex)}
                                                title="Remover item"
                                              >
                                                <X className="h-3.5 w-3.5" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <Textarea
                                  value={variation.currentSituation || ""}
                                  onChange={(e) => handleVariationChange(currentStep, index, 'currentSituation', e.target.value)}
                                  placeholder="Descreva a situação atual encontrada..."
                                  rows={7}
                                />
                                {isTranscribing && activeField === `currentSituation-${currentStep}-${index}` && (
                                  <div className="flex items-center space-x-2 text-sm text-blue-600">
                                    <div className="animate-pulse w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span>Transcrevendo...</span>
                                  </div>
                                )}
                              </div>

                              {/* Orientação para o Cliente */}
                              <div className="bg-gray-50 p-4 rounded-md space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium">Orientação para o Cliente</Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                      setActiveField(`clientGuidance-${currentStep}-${index}`);
                                      if (isRecording) {
                                        stopRecording();
                                      } else {
                                        startRecording();
                                      }
                                    }}
                                    disabled={!speechRecognition}
                                  >
                                    {isRecording && activeField === `clientGuidance-${currentStep}-${index}` ? (
                                      <MicOff className="h-4 w-4 text-red-500" />
                                    ) : (
                                      <Mic className="h-4 w-4 text-blue-500" />
                                    )}
                                  </Button>
                                </div>
                                <Textarea
                                  value={variation.clientGuidance || ""}
                                  onChange={(e) => handleVariationChange(currentStep, index, 'clientGuidance', e.target.value)}
                                  placeholder="Orientações e recomendações para o cliente..."
                                  rows={7}
                                />
                                {isTranscribing && activeField === `clientGuidance-${currentStep}-${index}` && (
                                  <div className="flex items-center space-x-2 text-sm text-blue-600">
                                    <div className="animate-pulse w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span>Transcrevendo...</span>
                                  </div>
                                )}
                              </div>

                              {/* Upload de Foto */}
                              <div className="bg-gray-50 p-4 rounded-md space-y-2">
                                <Label className="text-sm font-medium">Foto (Opcional)</Label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      console.log('Arquivo selecionado:', file);
                                      if (file) {
                                        console.log('Chamando handlePhoto com:', { file, currentStep, index });
                                        handlePhoto(file, currentStep, index);
                                      }
                                    }}
                                    id={`photo-upload-${currentStep}-${index}`}
                                    className="hidden"
                                  />
                                  {variation.photos.length < 2 && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        console.log('Botão clicado, procurando input:', `photo-upload-${currentStep}-${index}`);
                                        const input = document.getElementById(`photo-upload-${currentStep}-${index}`);
                                        console.log('Input encontrado:', input);
                                        if (input) {
                                          input.click();
                                        } else {
                                          console.error('Input não encontrado!');
                                        }
                                      }}
                                      disabled={photoUploading}
                                      className="flex items-center space-x-2"
                                    >
                                      <Camera className="h-4 w-4" />
                                      <span>{photoUploading ? 'Enviando...' : 'Adicionar Foto'}</span>
                                    </Button>
                                  )}


                                  {variation.photos.length >= 2 && (
                                    <div className="text-xs text-gray-500">
                                      Máximo de 2 fotos atingido
                                    </div>
                                  )}
                                </div>
                                {variation.photos.length > 0 && (
                                  <div className="mt-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      {variation.photos.map((photo, photoIndex) => (
                                        <div key={photo.id} className="space-y-2">
                                          {/* Imagem */}
                                          <div className="relative rounded-lg overflow-hidden border shadow-sm group">
                                            <img
                                              src={photo.url}
                                              alt={`Foto - ${variation.name}`}
                                              className="w-full h-32 object-cover"
                                            />
                                            <button
                                              onClick={() => removePhoto(currentStep, index, photo.id)}
                                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                              title="Remover foto"
                                            >
                                              ×
                                            </button>
                                            <div className="absolute bottom-0 left-0 bg-black bg-opacity-50 text-white text-xs p-1">
                                              {new Date(photo.createdAt).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            {photo.latitude && photo.longitude &&
                                              photo.latitude !== 0 && photo.longitude !== 0 && (
                                                <div className="absolute bottom-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                                                  📍
                                                </div>
                                              )}
                                          </div>
                                          
                                          {/* Informações da foto */}
                                          <div className="p-2 bg-gray-50 rounded border-l-2 border-blue-200">
                                            <p className="text-xs text-gray-600 mb-1">
                                              📸 Foto {photoIndex + 1} - {new Date(photo.createdAt).toLocaleString('pt-BR')}
                                            </p>
                                            {photo.latitude !== 0 && photo.longitude !== 0 ? (
                                              <div>
                                                <p className="text-xs text-green-600">
                                                  📍 Localização: {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}
                                                </p>
                                                <a
                                                  href={`https://www.google.com/maps?q=${photo.latitude},${photo.longitude}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-blue-600 hover:text-blue-800 underline text-xs"
                                                >
                                                  🗺️ Ver no Google Maps
                                                </a>
                                              </div>
                                            ) : (
                                              <p className="text-xs text-orange-600">⚠️ Sem localização GPS</p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2">
                                      {/* Debug temporário */}
                                      <p className="text-red-500">DEBUG: {variation.photos.length} fotos, última: {variation.photos[variation.photos.length - 1]?.latitude}, {variation.photos[variation.photos.length - 1]?.longitude}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Variações - Mobile (Nova Estrutura) */}
      {isMobile && (
        <div className="space-y-4">
        {currentStepData?.variations?.map((variation, index) => (
          <div key={variation.id} className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 space-y-4">
            {/* Cabeçalho com título e botão de exclusão */}
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 text-sm leading-relaxed">
                {variation.name}
              </h3>
              {/* Botão de exclusão - apenas se houver mais de uma variação */}
              {(currentStepData?.variations?.length || 0) > 1 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                      title="Excluir variação"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir a variação "{variation.name}"? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => removeVariation(currentStep, index)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Opções de Resposta */}
            <div className="flex space-x-2">
              <Button
                variant={variation.evaluation === 'nc' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleVariationChange(currentStep, index, 'evaluation', 'nc')}
                className={`flex-1 h-10 md:h-8 ${variation.evaluation === 'nc'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'border-gray-300 text-gray-700'
                  }`}
              >
                N/C
              </Button>
              <Button
                variant={variation.evaluation === 'r' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleVariationChange(currentStep, index, 'evaluation', 'r')}
                className={`flex-1 h-10 md:h-8 ${variation.evaluation === 'r'
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'border-gray-300 text-gray-700'
                  }`}
              >
                R
              </Button>
              <Button
                variant={variation.evaluation === 'na' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleVariationChange(currentStep, index, 'evaluation', 'na')}
                className={`flex-1 h-10 md:h-8 ${variation.evaluation === 'na'
                  ? isEditMode 
                    ? 'bg-gray-400 hover:bg-gray-500 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                  : 'border-gray-300 text-gray-700'
                  }`}
              >
                N/A
              </Button>
            </div>

            {/* Botões de Ação */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center justify-center space-x-1 md:space-x-2 border-gray-300 text-gray-700 h-12 md:h-8 px-2 md:px-3"
                onClick={() => toggleField(index, 'local')}
              >
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs md:text-xs truncate">Local</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center justify-center space-x-1 md:space-x-2 border-gray-300 text-gray-700 h-12 md:h-8 px-2 md:px-3"
                onClick={() => toggleField(index, 'situacao')}
              >
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs md:text-xs truncate">Situação</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center justify-center space-x-1 md:space-x-2 border-gray-300 text-gray-700 h-12 md:h-8 px-2 md:px-3"
                onClick={() => toggleField(index, 'orientacao')}
              >
                <Lightbulb className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs md:text-xs truncate">Orientação</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center justify-center space-x-1 md:space-x-2 border-gray-300 text-gray-700 h-12 md:h-8 px-2 md:px-3"
                onClick={() => toggleField(index, 'foto')}
              >
                <Camera className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs md:text-xs truncate">Foto</span>
              </Button>
            </div>

            {/* Campos de Texto (Simplificados) */}
            <div className="space-y-3">
              {/* Situação Atual */}
              {openFields[`${currentStep}-${index}-situacao`] && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Situação Atual</Label>
                  
                  {/* Exibir itens selecionados */}
                  {variation.selectedItems && variation.selectedItems.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Itens selecionados ({variation.selectedItems.length})
                      </div>
                      <div className="space-y-2">
                        {variation.selectedItems.map((selectedItem, itemIndex) => (
                          <div key={itemIndex} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 pr-3">
                                <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-line">
                                  {generateCurrentSituationText([selectedItem])}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                                  onClick={() => editSelectedItem(currentStep, index, itemIndex)}
                                  title="Editar item"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => removeSelectedItem(currentStep, index, itemIndex)}
                                  title="Remover item"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Textarea
                    value={variation.currentSituation || ""}
                    onChange={(e) => handleVariationChange(currentStep, index, 'currentSituation', e.target.value)}
                    placeholder="Descreva a situação atual..."
                    rows={7}
                    className="mt-1 text-sm"
                    data-field={`currentSituation-${currentStep}-${index}`}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleTranscription(index)}
                      disabled={!speechRecognition}
                      className="flex items-center space-x-2"
                    >
                      {isRecording && transcribingVariation === index ? (
                        <>
                          <MicOff className="h-4 w-4" />
                          <span>Pausar</span>
                        </>
                      ) : isTranscribing && transcribingVariation === index ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          <span>Gravando...</span>
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4" />
                          <span>Transcrever</span>
                        </>
                      )}
                    </Button>
                    
                    {/* Botão + para adicionar item/checklist */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openItemDialog(currentStep, index)}
                      title="Adicionar item e checklist"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Local */}
              {openFields[`${currentStep}-${index}-local`] && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Local</Label>
                  <Input
                    value={variation.location || ""}
                    onChange={(e) => handleVariationChange(currentStep, index, 'location', e.target.value)}
                    placeholder="Especifique o local onde foi encontrada..."
                    className="mt-1 text-sm"
                  />
                </div>
              )}

              {/* Orientação para o Cliente */}
              {openFields[`${currentStep}-${index}-orientacao`] && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Orientação para o Cliente</Label>
                  <Textarea
                    value={variation.clientGuidance || ""}
                    onChange={(e) => handleVariationChange(currentStep, index, 'clientGuidance', e.target.value)}
                    placeholder="Oriente o cliente..."
                    rows={7}
                    className="mt-1 text-sm"
                    data-field={`clientGuidance-${currentStep}-${index}`}
                  />
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateGuidance(index)}
                      disabled={isGenerating || !variation.currentSituation?.trim()}
                      className="flex items-center space-x-2"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                          <span>Gerando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Gerar</span>
                        </>
                      )}
                    </Button>
                    {!variation.currentSituation?.trim() && (
                      <p className="text-xs text-gray-500 mt-1">
                        Preencha a situação atual primeiro
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Upload de Foto */}
              {openFields[`${currentStep}-${index}-foto`] && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Foto</Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhoto(file, currentStep, index);
                    }}
                    className="hidden"
                    data-field={`photo-${currentStep}-${index}`}
                  />
                  <div className="mt-1 flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const fileInput = document.querySelector(`input[data-field="photo-${currentStep}-${index}"]`) as HTMLInputElement;
                        if (fileInput) fileInput.click();
                      }}
                      className="text-sm"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Adicionar Foto
                    </Button>
                    {variation.photos && variation.photos.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {variation.photos.length} foto(s)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Fotos Existentes */}
              {openFields[`${currentStep}-${index}-foto`] && variation.photos && variation.photos.length > 0 && (
                <div className="space-y-3">
                  {variation.photos.map((photo, photoIndex) => (
                    <div key={photo.id} className="bg-gray-50 p-3 rounded-lg space-y-2">
                      {/* Imagem */}
                      <img
                        src={photo.url}
                        alt="Foto"
                        className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(photo.url, '_blank')}
                      />
                      
                      {/* Informações da foto */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 font-medium">
                            📸 Foto {photoIndex + 1} - {new Date(photo.createdAt).toLocaleString('pt-BR')}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePhoto(currentStep, index, photo.id)}
                            className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {/* Localização */}
                        {photo.latitude !== 0 && photo.longitude !== 0 ? (
                          <div className="space-y-1">
                            <p className="text-xs text-green-600">
                              📍 Localização: {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}
                            </p>
                            <a
                              href={`https://www.google.com/maps?q=${photo.latitude},${photo.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline text-xs block"
                            >
                              🗺️ Ver no Google Maps
                            </a>
                          </div>
                        ) : (
                          <p className="text-xs text-orange-600">⚠️ Sem localização GPS</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      )}



      {/* Botões de Ação */}
      {projectData.steps.length > 0 && (
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 pt-3 md:pt-4 border-t border-gray-100">
          {/* Navegação Mobile - Lado a lado com select no meio */}
          {isMobile && (
            <div className="flex justify-between items-center w-full">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="flex items-center gap-1 text-xs"
              size="sm"
            >
              <ArrowLeft size={14} />
              <span>Ant.</span>
            </Button>

            {/* Select de Navegação - Mobile */}
            <div className="flex-1 mx-2">
              <select
                value={currentStep}
                onChange={(e) => setCurrentStep(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                {projectData.steps.map((step, index) => (
                  <option key={step.id} value={index}>
                    {step.code} - {step.title.length > 30 ? step.title.substring(0, 30) + '...' : step.title}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={() => setCurrentStep(prev => Math.min(projectData.steps.length - 1, prev + 1))}
              disabled={currentStep === projectData.steps.length - 1}
              className="flex items-center gap-1 text-xs"
              size="sm"
            >
              <span>Próx.</span>
              <ArrowRight size={14} />
            </Button>
          </div>
          )}

          {/* Navegação Desktop - Lado a lado */}
          {!isMobile && (
            <div className="flex justify-between items-center w-full">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="flex items-center gap-2 text-sm"
              size="sm"
            >
              <ArrowLeft size={16} />
              <span>Artigo Anterior</span>
            </Button>

            {/* Select de Navegação - Desktop */}
            <div className="flex-1 mx-4 max-w-md">
              <select
                value={currentStep}
                onChange={(e) => setCurrentStep(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                {projectData.steps.map((step, index) => (
                  <option key={step.id} value={index}>
                    {step.code} - {step.title}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={() => setCurrentStep(prev => Math.min(projectData.steps.length - 1, prev + 1))}
              disabled={currentStep === projectData.steps.length - 1}
              className="flex items-center gap-2 text-sm"
              size="sm"
            >
              <span>Próximo Artigo</span>
              <ArrowRight size={16} />
            </Button>
          </div>
          )}
        </div>
      )}

      {/* Modal de Seleção de Artigos */}
      {showArticleSelection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] md:max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 md:p-6 border-b flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-xl font-semibold">Selecionar Artigo</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowArticleSelection(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>

              {/* Filtros - Responsivo */}
              <div className="space-y-3 md:space-y-0 md:flex md:space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar por código ou título..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-10 md:h-9"
                    />
                  </div>
                </div>
                <div className="w-full md:w-64">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2 md:p-2 border border-gray-300 rounded-md h-10 md:h-9 text-sm"
                  >
                    <option value="">Todas as categorias</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Lista de Artigos */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {filteredArticles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum artigo encontrado</p>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-2">
                  {filteredArticles.map(article => {
                    const isUsed = isArticleUsed(article);
                    return (
                      <div
                        key={article.id}
                        onClick={() => !isUsed && handleArticleSelect(article)}
                        className={`p-4 md:p-3 border rounded-lg transition-colors ${isUsed
                          ? 'bg-gray-100 cursor-not-allowed opacity-60'
                          : 'hover:bg-gray-50 cursor-pointer active:bg-gray-100'
                          }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`px-3 py-1 md:px-2 md:py-1 rounded text-xs font-medium min-w-fit flex-shrink-0 ${isUsed
                            ? 'bg-gray-300 text-gray-600'
                            : 'bg-blue-100 text-blue-800'
                            }`}>
                            {article.code}
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <p className={`font-medium text-sm md:text-sm leading-relaxed break-words ${isUsed ? 'text-gray-500' : ''}`}>
                              {article.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 break-words">{article.category}</p>
                            {isUsed && (
                              <p className="text-xs text-red-500 mt-1 font-medium break-words">
                                ⚠️ Já adicionado ao projeto
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 md:p-6 border-t bg-gray-50 flex-shrink-0">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-3 md:space-y-0">
                <div className="text-sm text-gray-600">
                  <p>{filteredArticles.length} artigo(s) encontrado(s)</p>
                  <p className="text-xs text-gray-500">
                    {filteredArticles.filter(article => !isArticleUsed(article)).length} disponível(is) • {filteredArticles.filter(article => isArticleUsed(article)).length} já usado(s)
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowArticleSelection(false)}
                  className="w-full md:w-auto"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Componente responsivo para adicionar itens e checklists */}
      {isMobile ? (
        <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
          <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-xl">
            <SheetHeader>
              <SheetTitle>
                {editingItemIndex >= 0 ? "Editar Item e Checklist" : "Adicionar Item e Checklist"}
              </SheetTitle>
              <SheetDescription>
                Selecione um item, preencha seus atributos e escolha um checklist com os tópicos desejados.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Seleção de Item */}
              <div>
                <Label className="text-sm font-medium">Selecionar Item *</Label>
                <Select value={selectedItemId} onValueChange={handleItemSelect}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Escolha um item..." />
                  </SelectTrigger>
                  <SelectContent>
                    {itens.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Atributos do Item Selecionado */}
              {selectedItemId && (
                <div>
                  <Label className="text-sm font-medium">Atributos do Item</Label>
                  <div className="mt-2 space-y-3">
                    {itens.find(item => item.id === selectedItemId)?.atributos.map((atributo) => (
                      <div key={atributo.id}>
                        <Label className="text-xs text-gray-600">
                          {atributo.nome} {atributo.obrigatorio && <span className="text-red-500">*</span>}
                        </Label>
                        <Input
                          value={selectedItemAtributos[atributo.nome] || ""}
                          onChange={(e) => setSelectedItemAtributos(prev => ({
                            ...prev,
                            [atributo.nome]: e.target.value
                          }))}
                          placeholder={`Digite ${atributo.nome.toLowerCase()}`}
                          className="mt-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seleção de Checklist */}
              {selectedItemId && (
                <div>
                  <Label className="text-sm font-medium">Selecionar Checklist *</Label>
                  <Select value={selectedChecklistId} onValueChange={handleChecklistSelect}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Escolha um checklist..." />
                    </SelectTrigger>
                    <SelectContent>
                      {checklists
                        .filter(checklist => checklist.itemId === selectedItemId)
                        .map((checklist) => (
                          <SelectItem key={checklist.id} value={checklist.id}>
                            {checklist.titulo}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Tópicos do Checklist Selecionado */}
              {selectedChecklistId && (
                <div>
                  <Label className="text-sm font-medium">Selecionar Tópicos</Label>
                  <div className="mt-2 space-y-2">
                    {checklists.find(checklist => checklist.id === selectedChecklistId)?.topicos.map((topico) => (
                      <div key={topico.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={topico.id}
                          checked={selectedTopicos.includes(topico.id)}
                          onCheckedChange={() => handleTopicoToggle(topico.id)}
                        />
                        <Label htmlFor={topico.id} className="text-sm">
                          {topico.titulo}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button onClick={saveSelectedItem} disabled={!selectedItemId || !selectedChecklistId} className="w-full">
                {editingItemIndex >= 0 ? "Atualizar" : "Adicionar"}
              </Button>
              <Button variant="outline" onClick={closeItemDialog} className="w-full">
                Cancelar
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItemIndex >= 0 ? "Editar Item e Checklist" : "Adicionar Item e Checklist"}
              </DialogTitle>
              <DialogDescription>
                Selecione um item, preencha seus atributos e escolha um checklist com os tópicos desejados.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Seleção de Item */}
              <div>
                <Label className="text-sm font-medium">Selecionar Item *</Label>
                <Select value={selectedItemId} onValueChange={handleItemSelect}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Escolha um item..." />
                  </SelectTrigger>
                  <SelectContent>
                    {itens.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Atributos do Item Selecionado */}
              {selectedItemId && (
                <div>
                  <Label className="text-sm font-medium">Atributos do Item</Label>
                  <div className="mt-2 space-y-3">
                    {itens.find(item => item.id === selectedItemId)?.atributos.map((atributo) => (
                      <div key={atributo.id}>
                        <Label className="text-xs text-gray-600">
                          {atributo.nome} {atributo.obrigatorio && <span className="text-red-500">*</span>}
                        </Label>
                        <Input
                          value={selectedItemAtributos[atributo.nome] || ""}
                          onChange={(e) => setSelectedItemAtributos(prev => ({
                            ...prev,
                            [atributo.nome]: e.target.value
                          }))}
                          placeholder={`Digite ${atributo.nome.toLowerCase()}`}
                          className="mt-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seleção de Checklist */}
              {selectedItemId && (
                <div>
                  <Label className="text-sm font-medium">Selecionar Checklist *</Label>
                  <Select value={selectedChecklistId} onValueChange={handleChecklistSelect}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Escolha um checklist..." />
                    </SelectTrigger>
                    <SelectContent>
                      {checklists
                        .filter(checklist => checklist.itemId === selectedItemId)
                        .map((checklist) => (
                          <SelectItem key={checklist.id} value={checklist.id}>
                            {checklist.titulo}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Tópicos do Checklist Selecionado */}
              {selectedChecklistId && (
                <div>
                  <Label className="text-sm font-medium">Selecionar Tópicos</Label>
                  <div className="mt-2 space-y-2">
                    {checklists.find(checklist => checklist.id === selectedChecklistId)?.topicos.map((topico) => (
                      <div key={topico.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={topico.id}
                          checked={selectedTopicos.includes(topico.id)}
                          onCheckedChange={() => handleTopicoToggle(topico.id)}
                        />
                        <Label htmlFor={topico.id} className="text-sm">
                          {topico.titulo}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeItemDialog}>
                Cancelar
              </Button>
              <Button onClick={saveSelectedItem} disabled={!selectedItemId || !selectedChecklistId}>
                {editingItemIndex >= 0 ? "Atualizar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default NewProject;
