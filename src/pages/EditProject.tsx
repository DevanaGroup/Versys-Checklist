import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, X, ArrowLeft, ChevronDown, ChevronRight, Save, ArrowRight, CheckCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { collection, getDocs, query, orderBy, where, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface SubItem {
  id: string;
  title: string;
  evaluation: "nc" | "r" | "na" | "";
  completed: boolean;
  clientResponse?: string;
  adminFeedback?: string;
  required: boolean;
  description?: string;
  currentSituation?: string;
}

interface SelectedItem {
  id: string;
  title: string;
  category: string;
  subItems: SubItem[];
  isExpanded: boolean;
  description?: string;
  priority: "alta" | "media" | "baixa";
}

interface CustomAccordion {
  id: string;
  title: string;
  items: SelectedItem[];
}

interface Cliente {
  id: string;
  nome: string;
  email?: string;
  empresa?: string;
}

const categoriesData = {
  "DOCUMENTAÇÃO PRELIMINAR": [
    "1.1 - INSTALAÇÃO PORTUÁRIA: Razão Social e CNPJ",
    "1.2 - SÓCIOS/PROPRIETÁRIOS/REPRESENTANTES:",
    "1.2.1 - Carteira de Identidade",
    "1.2.2 - CPF",
    "1.2.3 - Estatuto (comprovação de quem são os representantes legais)",
    "1.3 - SUPERVISORES DE SEGURANÇA PORTUÁRIA (SSP):",
    "1.3.1 - Carteira de Identidade",
    "1.3.2 - CPF",
    "1.3.3 - Certidão Negativa de Antecedentes Criminais expedida pela Justiça Federal",
    "1.3.4 - Certidão Negativa de Antecedentes Criminais Expedidas pela Justiça Estadual",
    "1.3.5 - Certificados do CESSP e CASSP do SSP (informar edições dos cursos)",
    "1.3.6 - Informações contidas no Global Integrated Shipping Information System (GISIS). caso desatualizadas, indicar quais necessitam atualização"
  ],
  "ESTUDO DE AVALIAÇÃO DE RISCOS": [
    "2.1 - Possui EAR aprovado e atualizado?",
    "2.2 - O EAR considera como área de abrangência do Código ISPS a área outorgada integralmente como instalação portuária?",
    "2.3 - O EAR considera os ativos de interesse para o Código ISPS localizados fora da área outorgada? Quais?"
  ],
  "PLANO DE SEGURANÇA PORTUÁRIA": [
    "3.1 - Possui PSP aprovado e atualizado?",
    "3.2 - O PSP considera como área de abrangência do Código ISPS a área outorgada integralmente como instalação portuária?",
    "3.3 - Há ativos de interesse localizados fora da área outorgada? Quais?"
  ],
  "SEGURANÇA": [
    "4.1 - O perímetro da instalação está devidamente iluminado e protegido por muros, cercas, ofendículos, barreiras ou outros?",
    "4.2 - Os recursos indicados no item 4.1 são adequados para prevenir o acesso não autorizado às instalações?",
    "4.3 - O procedimento definido para cadastramento e autorização de acesso cumpre o seu mister (controle e cadastramento irrestrito de pessoas, cargas e veículos)?",
    "4.4 - O material de proteção do perímetro está em bom estado (necessário para prevenir acessos não autorizados)?",
    "4.5 - Existe inspeção periódica para verificar falhas nas defesas do perímetro?",
    "4.6 - A instalação portuária é coberta por outros meios de proteção, complementares aos do item 4.1? quais?",
    "4.7 - Existe sistema de CFTV ou outro similar?",
    "4.8 - O CFTV possui sistema de gravação de vídeos e diagramação informatizada da localização de suas câmeras?",
    "4.9 - O sistema de gravação de vídeos de CFTV armazena os dados de interesse à proteção da instalação por um período mínimo de 90 dias?",
    "4.10 - A qualidade dos vídeos armazenados é adequada para eventual apuração de incidente de proteção, permitindo a identificação de pessoas, veículos e outros meios envolvidos, inclusive à noite?",
    "4.11 - O sistema de gravação de vídeos de CFTV contempla todas as câmeras contidas no plano de segurança portuária?",
    "4.12 - Existe sistema de redundância (backup) da gravação dos vídeos do CFTV? qual o período de armazenamento deste sistema?",
    "4.13 - O sistema de redundância (backup) está localizado em local distinto do sistema de gravação primário?",
    "4.14 - O CFTV está adequado (perímetro coberto por câmeras fixas, sem pontos cegos relevantes, com funcionamento adequado e com as devidas nitidez e resolução?",
    "4.15 - O CFTV monitora o bordo do mar dos navios atracados e a área marítima adjacente à instalação?",
    "4.16 - Os operadores do CFTV e seus eventuais substitutos estão devidamente treinados para operação eficiente do sistema? Há procedimentos para os operadores do CFTV no caso de detecção de intrusão ou outra ocorrência anormal na instalação portuária?",
    "4.17 - Existem postos de controle de acesso em número adequado? Esses postos são devidamente guarnecidos permanentemente?",
    "4.18 - Todos os funcionários, prestadores de serviço, visitantes e demais pessoas que tenham acesso à instalação portuária são obrigados a exibir permanentemente sua identificação enquanto estiverem nas áreas restritas e controlada da instalação portuária?",
    "4.19 - Existe meio eficaz de identificação do nível de proteção, em todos os acessos de pedestres, veículos e embarcações?",
    "4.20 - Há solicitação de identificação pessoal (crachá ou outros) em outros locais além do de ingresso à instalação?",
    "4.21 - É procedimento normal a solicitação de identificação pessoal (crachá ou outros) no interior da instalação?",
    "4.22 - Existe a efetiva verificação da identificação pessoal nos pontos de controle de acesso?",
    "4.23 - Existe controle de acesso por meio de sistema informatizado em todos os pontos de acesso?",
    "4.24 - A identificação pessoal (crachá ou outros) é registrada com número serial e código de barras (ou outro mecanismo) e fornece controle irrestrito de pessoal à instalação, sem múltiplos acessos contínuos?",
    "4.25 - O crachá extraviado é substituído por outro com número diferente? É feita a baixa para a negativa de acesso do extraviado? Existe sistema de comunicação aos postos de controle do extravio?",
    "4.26 - O procedimento de identificação de visitantes e de fornecimento de crachá aos funcionários que tiverem esquecido sua identificação é separado? O controle é feito indistintamente e de maneira universal?",
    "4.27 - As identificações pessoais (crachá ou outros) são diferenciadas (cor ou forma) em face dos diversos locais com autorizações próprias, para facilitar a identificação?",
    "4.28 - O recolhimento das identificações pessoais (crachá ou outros) tem procedimento eficiente?",
    "4.29 - Existe previsão e efetivo para fazer o acompanhamento de pessoas na instalação portuária quando necessário (ex: visitantes, vendedores, motoristas, etc.)?",
    "4.30 - Há procedimento específico para o controle de acesso e movimentação de tripulantes? Há previsão de escolta de membros da tripulação das embarcações atracadas?",
    "4.31 - Há procedimento específico para o controle de acesso de familiares e visitantes aos tripulantes das embarcações atracadas/fundeadas? O registro de visitantes é eficiente e facilmente acessível?",
    "4.32 - O controle de acesso de veículos é eficiente?",
    "4.33 - O estacionamento é supervisionado e restrito apenas a veículos próprios e controlados? Há sistema de vigilância no estacionamento?",
    "4.34 - O procedimento de controle de tráfego na instalação é eficaz?",
    "4.35 - Os veículos não autorizados têm área própria de estacionamento?",
    "4.36 - Os postos de controle de acesso às áreas restritas e controladas estão devidamente estruturados (localização, equipamentos e insumos)?",
    "4.37 - As áreas restritas e controladas estão devidamente cercadas e sinalizadas?",
    "4.38 - A equipe de segurança realiza patrulhas rotineiras em todas as áreas (notadamente nas controladas e restritas)?",
    "4.39 - Quantos colaboradores fazem parte da equipe de segurança? Em que escala de turno trabalham? As quantidades existentes e a escalas de trabalho são adequadas?",
    "4.40 - A equipe de segurança tem identificação própria (uniforme e autorização para acesso às áreas específicas necessárias ao desempenho da função)?",
    "4.41 - O SSP realiza reuniões com a equipe da unidade de segurança? Qual a frequência? há evidências que comprovem a realização das mesmas? A frequência observada é suficiente?",
    "4.42 - Os equipamentos de comunicação do SSP com a equipe de segurança, demais funcionários e órgãos de segurança pública e de defesa são eficazes? quais são os meios utilizados?",
    "4.43 - Em caso de crise ou emergência, existe previsão de procedimentos a serem adotados?",
    "4.44 - Há registro de passagem da equipe de segurança por algum meio em pontos de controle? A ronda feita tem itinerário variado, para evitar estabelecimento de rotina?",
    "4.45 - A equipe de segurança possui treinamento e certificado válido para portar arma de fogo?",
    "4.46 - A equipe de segurança possui equipamentos adequados e dentro da validade requerida? Há caixa de areia para passagem de serviço armado?",
    "4.47 - A equipe de segurança recebe treinamento frequente? (mencionar a frequência)",
    "4.48 - A equipe de segurança realiza exercícios? (mencionar a frequência e data do último exercício)",
    "4.49 - O sistema de detecção de invasão é sinalizado e monitorado de um ponto central, de modo que a força de resposta possa ser acionada desse ponto?",
    "4.50 - Os pontos de acesso de veículos e pedestres são fechados quando não utilizados ou por ocasião da elevação do nível de proteção para 2 ou 3, conforme especificado no PSP?",
    "4.51 - As lâmpadas/iluminação por ventura impróprias são imediatamente substituídas?",
    "4.52 - Há atualização dos registros de exercícios, incidentes e demais dados exigidos no PSP? Há auditorias internas? Existe registro específico? Qual a frequência?",
    "4.53 - O pessoal que realiza a identificação de visitantes, controla portões de acesso e atende ligações telefônicas conhece os procedimentos a serem tomados em caso de: ameaça terrorista (bomba, incêndio ou tomada de embarcações atracadas etc.)? sequestro com reféns? distúrbios civis (protestos, greves etc.) que resultem na necessidade de evacuação em emergência?",
    "4.54 - O pessoal componente da Unidade de Segurança possui conhecimentos e sabe como proceder para contactar os órgãos de segurança pública, defesa civil, autoridade marítima e outros de interesse do serviço?",
    "4.55 - Os procedimentos previstos para atender às disposições do PSP, por ocasião da elevação do nível de proteção para 2 ou 3 se demonstram adequados?",
    "4.56 - Os Registros de Ocorrência de Incidente de Proteção (ROIP) são emitidos no prazo de 24hs e são mantidos arquivados na instalação portuária por um período de 5 anos?",
    "4.57 - A contratação de novos colaboradores é precedida de avaliação prévia de seus eventuais antecedentes criminais?",
    "4.58 - O EAR e o PSP estão protegidos contra o acesso não autorizado?",
    "4.59 - A instalação portuária conhece os procedimentos para responder aos sinais de alarme das embarcações atracadas ou fundeadas?",
    "4.60 - A Unidade de Segurança é capaz de efetuar contato imediato com os funcionários da instalação portuária durante o horário de expediente e fora dele?",
    "4.61 - O pessoal da Unidade de Segurança possui acesso à relação de seus deveres e atribuições contida no PSP?",
    "4.62 - O Sistema de cadastramento, movimentação, armazenamento e manuseio de veículos, embarcações, equipamentos, cargas em geral, mercadorias perigosas e substâncias nocivas funciona adequadamente?",
    "4.63 - A instalação portuária possui sistema informatizado de registro de dados de segurança (registros dos controles de acessos e controle de chaves)? Os dados são mantidos por um período mínimo de 90 dias?",
    "4.64 - Os sistemas de alarme e de comunicação previstos no PSP funcionam adequadamente?"
  ],
  "COMUNICAÇÕES E TECNOLOGIA DA INFORMAÇÃO": [
    "5.1 - Existe login único por colaborador, para acesso às estações de trabalho?",
    "5.2 - As estações de trabalho estão configuradas para 'usuários', sem direitos de administradores?",
    "5.3 - O uso de dispositivos de entrada e saída (CD-Rom, pen-drive, HD externo etc.) é autorizado pelo administrador da rede local, mediante solicitação justificada?",
    "5.4 - Existem filtros para inibir o acesso a sites de redes sociais, entretenimento e outros não afetos à atividade da instalação portuária? (Testar em uma estação de trabalho aleatória)",
    "5.5 - A administração de sistemas digitais ou dispositivos de proteção é dividida por mais de uma pessoa, evitando que um único funcionário concentre todas as informações, controles e acessos?",
    "5.6 - Ocorre a identificação dos recursos computacionais (estações de trabalho, servidores, dispositivos de conectividade etc.) como 'críticos', para fins de elaboração e adoção de medidas de proteção?",
    "5.7 - Locais de guarda dos recursos de alta criticidade possuem mecanismos de controle e registro (compartimento segregado, barreiras físicas, alarmes de abertura não autorizada de portas, registro de entrada e saída de pessoal durante e após o expediente, senhas para servidores etc.)?",
    "5.8 - Os sistemas de controle de acesso e registro são auditáveis (registro por no mínimo 90 dias)?",
    "5.9 - Os equipamentos de conectividade utilizam gabinetes fechados com chave e lacre numerado?",
    "5.10 - O controle dessas chaves e dos lacres está implementado? É adequado?",
    "5.11 - Existem equipamentos elétricos de alta potência nas proximidades de recursos críticos, que possam interferir no funcionamento destes?",
    "5.12 - Os recursos críticos fazem uso de fontes estabilizadas e/ou nobreaks?",
    "5.13 - Ocorre a exigência de termo de responsabilidade para a execução de serviços nos recursos críticos por pessoal externo, alertando para a vedação do acesso indevido às informações da instalação portuária?",
    "5.14 - Há o estabelecimento, demarcação e monitoramento dos perímetros de segurança dos locais de guarda de recursos de alta criticidade?",
    "5.15 - As estações de trabalho e servidores fazem uso de versões atualizadas dos programas instalados?",
    "5.16 - Os acessos remotos são desabilitados para recursos de alta criticidade?",
    "5.17 - Os dispositivos de conectividade possuem senhas fortes (não usar senha padrão de fábrica)?",
    "5.18 - As estações de trabalho e servidores utilizam antivírus, firewall e antispyware?",
    "5.19 - As estações de trabalho possuem senha de configuração de uso exclusivo do administrador da rede?",
    "5.20 - O compartilhamento de pastas e arquivos de trabalho é feito por meio de servidor de arquivo, evitando o uso de soluções inseguras para esse fim ('rede windows', serviços peer-to-peer - P2P, etc)?",
    "5.21 - Há o uso de sistema operacional de rede para gestão de recursos da rede local?",
    "5.22 - O acesso das estações de trabalho à internet se dá por meio do servidor da instalação portuária, vedando-se o acesso por outros meios (redes 3G/4G, redes wi-fi externas ou outras soluções que envolvam recursos externos)?",
    "5.23 - Existem rotinas de backup para servidores e estações de trabalho?",
    "5.24 - O uso de programas oriundos de fontes desconhecidas é vedado?",
    "5.25 - O uso de mídias e redes sociais é restrito às atividades de divulgação institucional?",
    "5.26 - As instalações afastadas da rede local são interligadas por meio de rede privada virtual (VPN)?",
    "5.27 - A instalação portuária é capaz de identificar usuários logados na rede local, por meio de rede wi-fi?",
    "5.28 - Há adestramento inicial (novos colaboradores) e contínuo (manutenção de uma cultura de segurança) no que tange à proteção na área de TI?",
    "5.29 - Existe controle de presença nesses adestramentos?",
    "5.30 - Colaboradores possuem conhecimento sobre as vedações explicitadas nesta lista de verificação (perguntar aleatoriamente a usuários da rede local)?",
    "5.31 - Administrador da rede local possui formação na área de TI?",
    "5.32 - A topologia da rede local e suas alterações ao longo do tempo são registradas em um histórico da rede local?",
    "5.33 - Existe plano de contingência para o Setor de TI?",
    "5.34 - Existe rotina de verificação periódica das contas de usuários e seus direitos?",
    "5.35 - Existe rotina de verificação periódica dos programas instalados nas estações de trabalho e servidores, atualizando os defasados e eliminando os desnecessários?",
    "5.36 - As mídias dos backups estão guardadas em local adequado (controle de acesso e barreiras físicas)?",
    "5.37 - Existe verificação periódica da integralidade dos backups (testes de recuperação)?",
    "5.38 - Há verificação periódica da desabilitação do acesso remoto?",
    "5.39 - Existe rotina de remoção de usuários devido a afastamento definitivo (demissão, aposentadoria etc.)?",
    "5.40 - Ocorre o uso de rede dedicada para o CFTV?",
    "5.41 - Os usuários que operam estações de trabalho assinam de Termo de Responsabilidade Individual (TRI)?",
    "5.42 - Existe rotina de auditoria interna, com emissão de relatório e controle da adoção das medidas recomendadas?",
    "5.43 - O administrador da rede possui conhecimento da necessidade de elaboração, expedição, adoção de medidas e arquivamento de registros de incidente de proteção (ROIP) relacionados ao Setor de TI da instalação portuária?",
    "5.44 - Incidentes de proteção relacionados ao Setor de TI são registrados no histórico da rede local?",
    "5.45 - Há o uso de estações de trabalho alugadas? Caso sim, há uma política de devolução desses equipamentos, de modo a impedir o acesso indevido a informações sensíveis da instalação portuária?",
    "5.46 - As rotinas de atualizações automáticas de sistemas operacionais e ferramentas de proteção (antivírus, anti-spyware, firewall etc.) estão habilitadas?"
  ],
  "OUTROS ITENS JULGADOS NECESSÁRIOS": [
    "6.1 - Descrever detalhadamente."
  ]
};

const EditProject = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [projectName, setProjectName] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("none");
  const [customAccordions, setCustomAccordions] = useState<CustomAccordion[]>([]);
  const [newAccordionTitle, setNewAccordionTitle] = useState("");
  const [clients, setClients] = useState<Cliente[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingProject, setLoadingProject] = useState(true);
  const [savingProject, setSavingProject] = useState(false);
  const [draggedItem, setDraggedItem] = useState<Omit<SelectedItem, 'subItems' | 'isExpanded'> | null>(null);

  const steps = [
    { id: 1, title: "Informações Básicas", description: "Nome e Cliente" },
    { id: 2, title: "Configurar Itens", description: "Adicionar itens, observações e avaliações" },
    { id: 3, title: "Finalizar", description: "Revisar e salvar as alterações" }
  ];

  useEffect(() => {
    loadClients();
    if (projectId) {
      loadProjectData(projectId);
    }
  }, [projectId]);

  const loadProjectData = async (id: string) => {
    try {
      setLoadingProject(true);
      console.log('🔍 Carregando dados do projeto:', id);
      
      const projectDoc = await getDoc(doc(db, 'projetos', id));
      
      if (projectDoc.exists()) {
        const data = projectDoc.data();
        console.log('📄 Dados do projeto encontrados:', {
          nome: data.nome,
          clienteId: data.clienteId,
          cliente: data.cliente,
          customAccordions: data.customAccordions?.length || 0
        });
        
        setProjectName(data.nome || '');
        
        // Verificar se há cliente vinculado
        const clienteId = data.clienteId || data.cliente?.id;
        if (clienteId) {
          console.log('👤 Cliente encontrado no projeto:', clienteId);
          setSelectedClient(clienteId);
        } else {
          console.log('❌ Nenhum cliente vinculado ao projeto');
          setSelectedClient('none');
        }
        
        setCustomAccordions(data.customAccordions || []);
        console.log('✅ Projeto carregado com sucesso');
      } else {
        console.error('❌ Projeto não encontrado no Firebase');
        toast.error('Projeto não encontrado');
        navigate('/projetos');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar projeto:', error);
      toast.error('Erro ao carregar projeto');
      navigate('/projetos');
    } finally {
      setLoadingProject(false);
    }
  };

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      console.log('🔍 Carregando clientes...');
      
      // Buscar apenas na coleção 'users' filtrando por type: 'client'
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, where('type', '==', 'client'));
      const usersSnapshot = await getDocs(usersQuery);
      
      const clientsData = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('👤 Cliente encontrado:', {
          id: doc.id,
          nome: data.displayName || data.nome,
          empresa: data.company || data.empresa,
          email: data.email
        });
        
        return {
          id: doc.id,
          nome: data.displayName || data.nome || 'Nome não definido',
          email: data.email || '',
          empresa: data.company || data.empresa || 'Empresa não definida'
        };
      });
      
      console.log('📊 Total de clientes encontrados:', clientsData.length);
      console.log('📋 Lista de clientes:', clientsData);
      
      setClients(clientsData);
    } catch (error) {
      console.error('❌ Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoadingClients(false);
    }
  };

  const addCustomAccordion = () => {
    if (!newAccordionTitle.trim()) {
      toast.error("Digite um título para o acordeão");
      return;
    }
    
    const newAccordion: CustomAccordion = {
      id: `accordion-${Date.now()}`,
      title: newAccordionTitle,
      items: []
    };
    
    setCustomAccordions([...customAccordions, newAccordion]);
    setNewAccordionTitle("");
  };

  const removeCustomAccordion = (id: string) => {
    setCustomAccordions(customAccordions.filter(acc => acc.id !== id));
  };

  const addItemToAccordion = (accordionId: string, item: Omit<SelectedItem, 'subItems' | 'isExpanded'>) => {
    const newItem: SelectedItem = {
      ...item,
      subItems: [{
        id: `subitem-${Date.now()}`,
        title: item.title,
        evaluation: "",
        completed: false,
        required: true,
        description: ""
      }],
      isExpanded: false
    };

    setCustomAccordions(customAccordions.map(accordion => 
      accordion.id === accordionId 
        ? { ...accordion, items: [...accordion.items, newItem] }
        : accordion
    ));
  };

  const removeItemFromAccordion = (accordionId: string, itemId: string) => {
    setCustomAccordions(customAccordions.map(accordion =>
      accordion.id === accordionId
        ? { ...accordion, items: accordion.items.filter(item => item.id !== itemId) }
        : accordion
    ));
  };

  const toggleItemExpansion = (accordionId: string, itemId: string) => {
    setCustomAccordions(customAccordions.map(accordion =>
      accordion.id === accordionId
        ? {
            ...accordion,
            items: accordion.items.map(item =>
              item.id === itemId
                ? { ...item, isExpanded: !item.isExpanded }
                : item
            )
          }
        : accordion
    ));
  };

  const addSubItem = (accordionId: string, itemId: string) => {
    const newSubItem: SubItem = {
      id: `subitem-${Date.now()}`,
      title: `Novo item ${Date.now()}`,
      evaluation: "",
      completed: false,
      required: true,
      description: ""
    };

    setCustomAccordions(customAccordions.map(accordion =>
      accordion.id === accordionId
        ? {
            ...accordion,
            items: accordion.items.map(item =>
              item.id === itemId
                ? { ...item, subItems: [...item.subItems, newSubItem] }
                : item
            )
          }
        : accordion
    ));
  };

  const removeSubItem = (accordionId: string, itemId: string, subItemId: string) => {
    setCustomAccordions(customAccordions.map(accordion =>
      accordion.id === accordionId
        ? {
            ...accordion,
            items: accordion.items.map(item =>
              item.id === itemId
                ? { ...item, subItems: item.subItems.filter(sub => sub.id !== subItemId) }
                : item
            )
          }
        : accordion
    ));
  };

  const updateSubItemDescription = (accordionId: string, itemId: string, subItemId: string, description: string) => {
    setCustomAccordions(customAccordions.map(accordion =>
      accordion.id === accordionId
        ? {
            ...accordion,
            items: accordion.items.map(item =>
              item.id === itemId
                ? {
                    ...item,
                    subItems: item.subItems.map(sub =>
                      sub.id === subItemId
                        ? { ...sub, description }
                        : sub
                    )
                  }
                : item
            )
          }
        : accordion
    ));
  };

  const updateSubItemCurrentSituation = (accordionId: string, itemId: string, subItemId: string, currentSituation: string) => {
    setCustomAccordions(customAccordions.map(accordion =>
      accordion.id === accordionId
        ? {
            ...accordion,
            items: accordion.items.map(item =>
              item.id === itemId
                ? {
                    ...item,
                    subItems: item.subItems.map(sub =>
                      sub.id === subItemId
                        ? { ...sub, currentSituation }
                        : sub
                    )
                  }
                : item
            )
          }
        : accordion
    ));
  };

  const updateSubItemRequired = (accordionId: string, itemId: string, subItemId: string, required: boolean) => {
    setCustomAccordions(customAccordions.map(accordion =>
      accordion.id === accordionId
        ? {
            ...accordion,
            items: accordion.items.map(item =>
              item.id === itemId
                ? {
                    ...item,
                    subItems: item.subItems.map(sub =>
                      sub.id === subItemId
                        ? { ...sub, required }
                        : sub
                    )
                  }
                : item
            )
          }
        : accordion
    ));
  };

  const updateSubItemEvaluation = (accordionId: string, itemId: string, subItemId: string, evaluation: SubItem['evaluation']) => {
    setCustomAccordions(customAccordions.map(accordion =>
      accordion.id === accordionId
        ? {
            ...accordion,
            items: accordion.items.map(item =>
              item.id === itemId
                ? {
                    ...item,
                    subItems: item.subItems.map(sub =>
                      sub.id === subItemId
                        ? { ...sub, evaluation }
                        : sub
                    )
                  }
                : item
            )
          }
        : accordion
    ));
  };

  const updateSubItemAdminFeedback = (accordionId: string, itemId: string, subItemId: string, adminFeedback: string) => {
    setCustomAccordions(customAccordions.map(accordion =>
      accordion.id === accordionId
        ? {
            ...accordion,
            items: accordion.items.map(item =>
              item.id === itemId
                ? {
                    ...item,
                    subItems: item.subItems.map(sub =>
                      sub.id === subItemId
                        ? { ...sub, adminFeedback }
                        : sub
                    )
                  }
                : item
            )
          }
        : accordion
    ));
  };

  const updateItemPriority = (accordionId: string, itemId: string, priority: "alta" | "media" | "baixa") => {
    setCustomAccordions(customAccordions.map(accordion =>
      accordion.id === accordionId
        ? {
            ...accordion,
            items: accordion.items.map(item =>
              item.id === itemId
                ? { ...item, priority }
                : item
            )
          }
        : accordion
    ));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "alta": return "bg-red-500 text-white";
      case "media": return "bg-yellow-500 text-white";
      case "baixa": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const isItemSelected = (item: string, category: string) => {
    return customAccordions.some(accordion =>
      accordion.items.some(selectedItem =>
        selectedItem.title === item && selectedItem.category === category
      )
    );
  };

  const handleDragStart = (item: Omit<SelectedItem, 'subItems' | 'isExpanded'>) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, accordionId: string) => {
    e.preventDefault();
    if (draggedItem) {
      addItemToAccordion(accordionId, draggedItem);
      setDraggedItem(null);
    }
  };

  const handleUpdateProject = async () => {
    if (!projectName.trim()) {
      toast.error("Por favor, insira um nome para o projeto");
      return;
    }

    if (customAccordions.length === 0) {
      toast.error("Adicione pelo menos um acordeão com itens ao projeto");
      return;
    }

    setSavingProject(true);
    try {
      let clienteData = null;
      if (selectedClient && selectedClient !== "none") {
        const clienteDoc = clients.find(c => c.id === selectedClient);
        if (clienteDoc) {
          clienteData = {
            id: clienteDoc.id,
            nome: clienteDoc.nome,
            email: clienteDoc.email || '',
            empresa: clienteDoc.empresa || ''
          };
        }
      }

      const updateData = {
        nome: projectName,
        clienteId: selectedClient && selectedClient !== "none" ? selectedClient : null,
        cliente: clienteData,
        customAccordions: customAccordions,
        dataAtualizacao: new Date().toISOString()
      };
      
      console.log('💾 Salvando projeto com dados:', {
        nome: updateData.nome,
        clienteId: updateData.clienteId,
        cliente: updateData.cliente,
        accordionsCount: updateData.customAccordions.length
      });

      await updateDoc(doc(db, "projetos", projectId!), updateData);
      
      toast.success("Projeto atualizado com sucesso!");
      navigate("/projetos");
      
    } catch (error) {
      console.error('Erro ao atualizar projeto:', error);
      toast.error("Erro ao atualizar projeto. Tente novamente.");
    } finally {
      setSavingProject(false);
    }
  };

  const canProceedToNext = () => {
    if (currentStep === 1) {
      return projectName.trim() !== "";
    }
    if (currentStep === 2) {
      return customAccordions.length > 0;
    }
    return true;
  };

  const nextStep = () => {
    if (canProceedToNext()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const renderStep1 = () => (
    <div className="h-full flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl text-versys-primary">
            Informações Básicas do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="projectName" className="text-lg">Nome do Projeto *</Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Digite o nome do projeto"
              className="mt-2 text-lg h-12"
            />
          </div>
          
          <div>
            <Label htmlFor="clientSelect" className="text-lg">Cliente (Opcional)</Label>
            {selectedClient && selectedClient !== "none" ? (
              // Cliente já definido - mostrar apenas como informação
              <div className="mt-2 flex h-12 w-full items-center justify-between rounded-md border border-input bg-gray-50 px-3 py-2 text-lg">
                <span className="text-gray-700">
                  {(() => {
                    const client = clients.find(c => c.id === selectedClient);
                    return client ? `${client.nome} - ${client.empresa}` : "Cliente não encontrado";
                  })()}
                </span>
                <span className="text-sm text-gray-500">Cliente definido</span>
              </div>
            ) : (
              // Nenhum cliente definido - permitir seleção
              <Select 
                value={selectedClient} 
                onValueChange={setSelectedClient}
                disabled={loadingClients}
              >
                <SelectTrigger className="mt-2 h-12">
                  <SelectValue 
                    placeholder={loadingClients ? "Carregando clientes..." : "Selecione um cliente"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum cliente</SelectItem>
                  {clients.length === 0 && !loadingClients && (
                    <SelectItem value="empty" disabled>
                      Nenhum cliente encontrado
                    </SelectItem>
                  )}
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nome} - {client.empresa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {clients.length === 0 && !loadingClients && selectedClient === "none" && (
              <p className="text-sm text-red-500 mt-2">
                ⚠️ Nenhum cliente encontrado. Verifique o console para mais detalhes.
              </p>
            )}
            {selectedClient && selectedClient !== "none" && (
              <p className="text-sm text-gray-500 mt-2">
                ℹ️ O cliente não pode ser alterado após ser definido no projeto.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep2 = () => (
    <div className="h-full flex flex-col max-h-screen">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-semibold text-versys-primary">Configurar Itens do Projeto</h3>
        <div className="flex items-center space-x-2">
          <Input
            value={newAccordionTitle}
            onChange={(e) => setNewAccordionTitle(e.target.value)}
            placeholder="Título da nova categoria"
            className="w-64 h-9"
          />
          <Button onClick={addCustomAccordion} size="sm" className="bg-versys-primary hover:bg-versys-secondary h-9">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0 overflow-hidden">
        {/* Coluna 1 - Itens Selecionados */}
        <div className="flex flex-col h-full">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-versys-primary">Itens Selecionados</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 p-4">
              <div className="flex-1 min-h-0 overflow-y-auto">
                {customAccordions.length > 0 ? (
                  <div className="space-y-1">
                    <Accordion type="multiple" className="w-full space-y-1">
                      {customAccordions.map((accordion) => (
                        <AccordionItem key={accordion.id} value={accordion.id}>
                          <div className="flex items-center justify-between">
                            <AccordionTrigger className="flex-1 text-left">
                              {accordion.title}
                            </AccordionTrigger>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir a categoria "{accordion.title}" e todos os seus itens?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeCustomAccordion(accordion.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                          <AccordionContent className="pb-2">
                            <div 
                              className="space-y-2 min-h-[80px] max-h-80 overflow-y-auto p-3 border-2 border-dashed border-gray-300 rounded-lg"
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, accordion.id)}
                            >
                              {accordion.items.map((item) => (
                                <div key={item.id} className="border border-gray-200 rounded-lg p-2 bg-white">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <Collapsible 
                                        open={item.isExpanded}
                                        onOpenChange={() => toggleItemExpansion(accordion.id, item.id)}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{item.title}</p>
                                            <p className="text-xs text-gray-500">{item.category}</p>
                                            <div className="flex items-center space-x-2 mt-1">
                                              <Badge className={getPriorityColor(item.priority || "media")}>
                                                {item.priority || "media"}
                                              </Badge>
                                              <Select
                                                value={item.priority || "media"}
                                                onValueChange={(value: "alta" | "media" | "baixa") => 
                                                  updateItemPriority(accordion.id, item.id, value)
                                                }
                                              >
                                                <SelectTrigger className="w-16 h-6 text-xs">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="alta">Alta</SelectItem>
                                                  <SelectItem value="media">Média</SelectItem>
                                                  <SelectItem value="baixa">Baixa</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          </div>
                                          <div className="flex items-center space-x-1 ml-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => addSubItem(accordion.id, item.id)}
                                              className="h-8 w-8 p-0 text-versys-primary hover:text-versys-secondary"
                                            >
                                              <Plus className="h-3 w-3" />
                                            </Button>
                                            <CollapsibleTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                {item.isExpanded ? (
                                                  <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                  <ChevronRight className="h-4 w-4" />
                                                )}
                                              </Button>
                                            </CollapsibleTrigger>
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                                >
                                                  <X className="h-3 w-3" />
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    Tem certeza que deseja excluir o item "{item.title}" e todos os seus sub-itens?
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                  <AlertDialogAction
                                                    onClick={() => removeItemFromAccordion(accordion.id, item.id)}
                                                    className="bg-red-600 hover:bg-red-700"
                                                  >
                                                    Excluir
                                                  </AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          </div>
                                        </div>
                                        
                                        <CollapsibleContent>
                                          <div className="space-y-2 mt-2">
                                            {item.subItems.map((subItem) => (
                                              <div key={subItem.id} className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                                                <div className="space-y-2">
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex-1 text-sm p-1 bg-gray-100 rounded-md border border-gray-200">
                                                      {subItem.title || "Título do sub-item"}
                                                    </div>
                                                    <div className="flex items-center space-x-2 ml-2">
                                                      <div className="flex items-center space-x-1">
                                                        <input
                                                          type="checkbox"
                                                          checked={subItem.required}
                                                          onChange={(e) => updateSubItemRequired(accordion.id, item.id, subItem.id, e.target.checked)}
                                                          className="h-3 w-3"
                                                        />
                                                        <Label className="text-xs">Obrigatório</Label>
                                                      </div>
                                                      <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                          <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                                          >
                                                            <X className="h-3 w-3" />
                                                          </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                          <AlertDialogHeader>
                                                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                              Tem certeza que deseja excluir o sub-item "{subItem.title}"?
                                                            </AlertDialogDescription>
                                                          </AlertDialogHeader>
                                                          <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction
                                                              onClick={() => removeSubItem(accordion.id, item.id, subItem.id)}
                                                              className="bg-red-600 hover:bg-red-700"
                                                            >
                                                              Excluir
                                                            </AlertDialogAction>
                                                          </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                      </AlertDialog>
                                                    </div>
                                                  </div>
                                                  
                                                  <div>
                                                    <Label className="text-xs text-gray-600">Situação atual:</Label>
                                                    <Textarea
                                                      value={subItem.currentSituation || ''}
                                                      onChange={(e) => updateSubItemCurrentSituation(accordion.id, item.id, subItem.id, e.target.value)}
                                                      placeholder="Descreva a situação atual do item..."
                                                      className="text-xs mt-1"
                                                      rows={2}
                                                    />
                                                  </div>
                                                  
                                                  <div>
                                                    <Label className="text-xs text-gray-600">Descrição/Orientação para o cliente:</Label>
                                                    <Textarea
                                                      value={subItem.description || ''}
                                                      onChange={(e) => updateSubItemDescription(accordion.id, item.id, subItem.id, e.target.value)}
                                                      placeholder="Descreva o que o cliente precisa fazer para este item..."
                                                      className="text-xs mt-1"
                                                      rows={2}
                                                    />
                                                  </div>
                                                  
                                                  <div className="flex items-center space-x-4">
                                                    <div>
                                                      <Label className="text-xs text-gray-600">Avaliação padrão:</Label>
                                                      <RadioGroup
                                                        value={subItem.evaluation}
                                                        onValueChange={(value) => updateSubItemEvaluation(accordion.id, item.id, subItem.id, value as SubItem['evaluation'])}
                                                        className="flex items-center space-x-2 mt-1"
                                                      >
                                                        <div className="flex items-center space-x-1">
                                                          <RadioGroupItem value="nc" id={`${subItem.id}-nc`} className="h-3 w-3" />
                                                          <Label htmlFor={`${subItem.id}-nc`} className="text-xs">Inconforme</Label>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                          <RadioGroupItem value="r" id={`${subItem.id}-r`} className="h-3 w-3" />
                                                          <Label htmlFor={`${subItem.id}-r`} className="text-xs">R - Recomendação</Label>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                          <RadioGroupItem value="na" id={`${subItem.id}-na`} className="h-3 w-3" />
                                                          <Label htmlFor={`${subItem.id}-na`} className="text-xs">Não aplicável</Label>
                                                        </div>
                                                      </RadioGroup>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {accordion.items.length === 0 && (
                                <p className="text-sm text-gray-500 italic text-center">
                                  Arraste itens da coluna ao lado para adicionar aqui
                                </p>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-center">
                    <p className="text-gray-500">
                      Crie um acordeão primeiro para organizar seus itens
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna 2 - Itens Disponíveis */}
        <div className="flex flex-col h-full">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-versys-primary">Itens Disponíveis</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-4">
              <ScrollArea className="h-full">
                <Accordion type="multiple" className="w-full">
                  {Object.entries(categoriesData).map(([category, items]) => (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger className="text-left text-sm">
                        {category}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {items.map((item, index) => {
                            const itemId = `${category}-${index}`;
                            const isSelected = isItemSelected(item, category);
                            const selectedItem = {
                              id: itemId,
                              title: item,
                              category,
                              priority: "media" as const
                            };
                            
                            return (
                              <Card 
                                key={itemId}
                                className={`cursor-grab transition-all ${
                                  isSelected 
                                    ? "border-versys-accent bg-versys-accent/10 opacity-50" 
                                    : "hover:border-versys-secondary hover:bg-versys-secondary/5"
                                }`}
                                draggable={!isSelected}
                                onDragStart={() => !isSelected && handleDragStart(selectedItem)}
                              >
                                <CardContent className="p-3">
                                  <p className="text-sm">{item}</p>
                                  {isSelected && (
                                    <p className="text-xs text-gray-500 mt-1">Já selecionado</p>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="h-full flex items-center justify-center">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl text-versys-primary">
            Resumo das Alterações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-lg font-semibold text-versys-primary">Nome do Projeto</Label>
                <p className="text-lg mt-1">{projectName}</p>
              </div>
              <div>
                <Label className="text-lg font-semibold text-versys-primary">Cliente</Label>
                <p className="text-lg mt-1">
                  {selectedClient && selectedClient !== "none" 
                    ? clients.find(c => c.id === selectedClient)?.nome || "Cliente não encontrado"
                    : "Nenhum cliente selecionado"
                  }
                </p>
              </div>
            </div>

            <div>
              <Label className="text-lg font-semibold text-versys-primary">Resumo dos Itens</Label>
              <div className="mt-3 space-y-3">
                {customAccordions.map((accordion) => (
                  <div key={accordion.id} className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium text-versys-primary mb-2">{accordion.title}</h4>
                    <div className="space-y-2">
                      {accordion.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between">
                          <span className="text-sm">{item.title}</span>
                          <div className="flex items-center space-x-2">
                            <Badge className={getPriorityColor(item.priority || "media")}>
                              {item.priority || "media"}
                            </Badge>
                            <Badge variant="outline">
                              {item.subItems.length} {item.subItems.length === 1 ? 'item' : 'itens'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Total de categorias: {customAccordions.length}</span>
                <span>
                  Total de itens: {customAccordions.reduce((total, acc) => total + acc.items.length, 0)}
                </span>
                <span>
                  Total de sub-itens: {customAccordions.reduce((total, acc) => 
                    total + acc.items.reduce((subTotal, item) => subTotal + item.subItems.length, 0), 0
                  )}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Pronto para salvar!</strong> Verifique se todas as informações estão corretas. 
                As alterações serão aplicadas ao projeto existente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Carregando projeto...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/projetos")}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-versys-primary">Editar Projeto</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => navigate("/projetos")}
            >
              Cancelar
            </Button>
            {currentStep === steps.length && (
              <Button 
                onClick={handleUpdateProject}
                disabled={savingProject}
                className="bg-versys-primary hover:bg-versys-secondary"
              >
                {savingProject ? "Salvando..." : "Salvar Alterações"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-center space-x-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep > step.id ? 'bg-green-500 text-white' : 
                currentStep === step.id ? 'bg-versys-primary text-white' : 
                'bg-gray-200 text-gray-500'
              }`}>
                {currentStep > step.id ? <CheckCircle className="h-4 w-4" /> : step.id}
              </div>
              <div className="ml-3">
                <div className={`text-sm font-medium ${
                  currentStep === step.id ? 'text-versys-primary' : 'text-gray-500'
                }`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-400">{step.description}</div>
              </div>
              {index < steps.length - 1 && (
                <div className="w-12 h-0.5 bg-gray-200 mx-4" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 min-h-0">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>

      {/* Footer Navigation */}
      <div className="bg-white border-t p-4">
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          
          <div className="text-sm text-gray-500">
            Passo {currentStep} de {steps.length}
          </div>
          
          {currentStep < steps.length ? (
            <Button 
              onClick={nextStep}
              disabled={!canProceedToNext()}
              className="bg-versys-primary hover:bg-versys-secondary"
            >
              Próximo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <div className="w-24" />
          )}
        </div>
      </div>
    </div>
  );
};

export default EditProject; 