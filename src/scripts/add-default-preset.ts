import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

const defaultPreset = {
  nome: "Checklist ISPS Code - Auditoria Completa",
  descricao: "Checklist padrão para auditoria de conformidade com o Código Internacional para Proteção de Navios e Instalações Portuárias (ISPS Code)",
  areas: [
    {
      id: "area-1",
      name: "1 - DOCUMENTAÇÃO PRELIMINAR",
      order: 0,
      items: [
        {
          id: "item-1-1",
          title: "1.1 - Instalação Portuária: Razão Social e CNPJ",
          description: "Verificar documentação da instalação portuária",
          order: 0
        },
        {
          id: "item-1-2",
          title: "1.2 - Sócios, Proprietários ou Representantes",
          description: "Documentação dos sócios e representantes legais",
          order: 1
        },
        {
          id: "item-1-2-1",
          title: "1.2.1 - Carteira de Identidade",
          description: "RG dos sócios e representantes",
          order: 2
        },
        {
          id: "item-1-2-2",
          title: "1.2.2 - Cadastro de Pessoa Física (CPF)",
          description: "CPF dos sócios e representantes",
          order: 3
        },
        {
          id: "item-1-2-3",
          title: "1.2.3 - Estatuto, com comprovação de quem são os representantes legais",
          description: "Verificar estatuto social e representação legal",
          order: 4
        },
        {
          id: "item-1-3",
          title: "1.3 - Supervisores de Segurança Portuária",
          description: "Documentação dos supervisores de segurança",
          order: 5
        },
        {
          id: "item-1-3-1",
          title: "1.3.1 - Carteira de Identidade",
          description: "RG dos supervisores",
          order: 6
        },
        {
          id: "item-1-3-2",
          title: "1.3.2 - Cadastro de Pessoa Física (CPF)",
          description: "CPF dos supervisores",
          order: 7
        },
        {
          id: "item-1-3-3",
          title: "1.3.3 - Certidão Negativa de Antecedentes Criminais expedida pela Justiça Federal",
          description: "Verificar certidão negativa federal",
          order: 8
        },
        {
          id: "item-1-3-4",
          title: "1.3.4 - Certidão Negativa de Antecedentes Criminais expedida pela Justiça Estadual",
          description: "Verificar certidão negativa estadual",
          order: 9
        },
        {
          id: "item-1-3-5",
          title: "1.3.5 - Certificados do Curso de Especialização em Supervisão de Segurança Portuária (CESSP) e do Curso Avançado de Supervisão de Segurança Portuária (CASSP), informando as edições dos cursos",
          description: "Verificar certificações CESSP e CASSP",
          order: 10
        },
        {
          id: "item-1-3-6",
          title: "1.3.6 - Informações contidas no Sistema Integrado Global de Informações sobre Navegação (Global Integrated Shipping Information System – GISIS). Caso estejam desatualizadas, indicar quais necessitam atualização",
          description: "Verificar informações no sistema GISIS",
          order: 11
        }
      ]
    },
    {
      id: "area-2",
      name: "2 - ESTUDO DE AVALIAÇÃO DE RISCOS (EAR)",
      order: 1,
      items: [
        {
          id: "item-2-1",
          title: "2.1 - Possui Estudo de Avaliação de Riscos aprovado e atualizado",
          description: "Verificar existência e atualização do EAR",
          order: 0
        },
        {
          id: "item-2-2",
          title: "2.2 - O Estudo de Avaliação de Riscos considera como área de abrangência do Código Internacional para a Proteção de Navios e Instalações Portuárias (ISPS Code) a área outorgada integralmente como instalação portuária",
          description: "Verificar se o EAR contempla toda a área outorgada",
          order: 1
        },
        {
          id: "item-2-3",
          title: "2.3 - O Estudo de Avaliação de Riscos considera os ativos de interesse para o Código Internacional para a Proteção de Navios e Instalações Portuárias localizados fora da área outorgada. Quais?",
          description: "Identificar ativos de interesse fora da área outorgada",
          order: 2
        }
      ]
    },
    {
      id: "area-3",
      name: "3 - PLANO DE SEGURANÇA PORTUÁRIA (PSP)",
      order: 2,
      items: [
        {
          id: "item-3-1",
          title: "3.1 - Possui Plano de Segurança Portuária aprovado e atualizado",
          description: "Verificar existência e atualização do PSP",
          order: 0
        },
        {
          id: "item-3-2",
          title: "3.2 - O Plano de Segurança Portuária considera como área de abrangência do Código Internacional para a Proteção de Navios e Instalações Portuárias a área outorgada integralmente como instalação portuária",
          description: "Verificar se o PSP contempla toda a área outorgada",
          order: 1
        },
        {
          id: "item-3-3",
          title: "3.3 - Há ativos de interesse localizados fora da área outorgada. Quais?",
          description: "Identificar ativos de interesse fora da área outorgada",
          order: 2
        }
      ]
    },
    {
      id: "area-4",
      name: "4 - SEGURANÇA",
      order: 3,
      items: [
        {
          id: "item-4-1",
          title: "4.1 - O perímetro da instalação está devidamente iluminado e protegido por muros, cercas, ofendículos, barreiras ou outros",
          description: "Verificar proteção perimetral",
          order: 0
        },
        {
          id: "item-4-2",
          title: "4.2 - Os recursos indicados são adequados para prevenir o acesso não autorizado às instalações",
          description: "Avaliar adequação dos recursos de proteção",
          order: 1
        },
        {
          id: "item-4-3",
          title: "4.3 - O procedimento definido para cadastramento e autorização de acesso cumpre o seu propósito de controle e cadastramento de pessoas, cargas e veículos",
          description: "Verificar procedimentos de controle de acesso",
          order: 2
        },
        {
          id: "item-4-4",
          title: "4.4 - O material de proteção do perímetro está em bom estado, sendo adequado para prevenir acessos não autorizados",
          description: "Avaliar estado de conservação do perímetro",
          order: 3
        },
        {
          id: "item-4-5",
          title: "4.5 - Existe inspeção periódica para verificar falhas nas defesas do perímetro",
          description: "Verificar inspeções periódicas",
          order: 4
        },
        {
          id: "item-4-6",
          title: "4.6 - A instalação portuária é coberta por outros meios de proteção complementares aos do perímetro. Quais?",
          description: "Identificar meios complementares de proteção",
          order: 5
        },
        {
          id: "item-4-7",
          title: "4.7 - Existe sistema de Circuito Fechado de Televisão (CFTV) ou outro similar",
          description: "Verificar existência de CFTV",
          order: 6
        },
        {
          id: "item-4-8",
          title: "4.8 - O sistema de CFTV possui sistema de gravação de vídeos e diagramação informatizada da localização de suas câmeras",
          description: "Verificar sistema de gravação e mapeamento do CFTV",
          order: 7
        },
        {
          id: "item-4-9",
          title: "4.9 - O sistema de gravação de vídeos do CFTV armazena os dados de interesse à proteção da instalação por um período mínimo de noventa dias",
          description: "Verificar período de armazenamento (mínimo 90 dias)",
          order: 8
        },
        {
          id: "item-4-10",
          title: "4.10 - A qualidade dos vídeos armazenados é adequada para eventual apuração de incidente de proteção, permitindo a identificação de pessoas, veículos e outros meios envolvidos, inclusive à noite",
          description: "Avaliar qualidade de imagem do CFTV",
          order: 9
        },
        {
          id: "item-4-11",
          title: "4.11 - O sistema de gravação de vídeos do CFTV contempla todas as câmeras contidas no Plano de Segurança Portuária",
          description: "Verificar cobertura de todas as câmeras previstas",
          order: 10
        },
        {
          id: "item-4-12",
          title: "4.12 - Existe sistema de redundância (cópia de segurança) da gravação dos vídeos do CFTV. Qual o período de armazenamento deste sistema?",
          description: "Verificar backup do sistema de gravação",
          order: 11
        },
        {
          id: "item-4-13",
          title: "4.13 - O sistema de redundância (cópia de segurança) está localizado em local distinto do sistema de gravação primário",
          description: "Verificar localização do backup",
          order: 12
        },
        {
          id: "item-4-14",
          title: "4.14 - O CFTV está adequado, com perímetro coberto por câmeras fixas, sem pontos cegos relevantes e com funcionamento, nitidez e resolução adequados",
          description: "Avaliar adequação geral do CFTV",
          order: 13
        },
        {
          id: "item-4-15",
          title: "4.15 - O CFTV monitora o bordo do mar dos navios atracados e a área marítima adjacente à instalação",
          description: "Verificar monitoramento da área marítima",
          order: 14
        },
        {
          id: "item-4-16",
          title: "4.16 - Os operadores do CFTV e seus eventuais substitutos estão devidamente treinados para operação eficiente do sistema. Há procedimentos para os operadores do CFTV no caso de detecção de intrusão ou outra ocorrência anormal na instalação portuária?",
          description: "Verificar treinamento dos operadores e procedimentos",
          order: 15
        },
        {
          id: "item-4-17",
          title: "4.17 - Existem postos de controle de acesso em número adequado e devidamente guarnecidos permanentemente",
          description: "Verificar postos de controle",
          order: 16
        },
        {
          id: "item-4-18",
          title: "4.18 - Todos os funcionários, prestadores de serviço, visitantes e demais pessoas que tenham acesso à instalação portuária são obrigados a exibir permanentemente sua identificação enquanto estiverem nas áreas restritas e controladas",
          description: "Verificar uso obrigatório de identificação",
          order: 17
        },
        {
          id: "item-4-19",
          title: "4.19 - Existe meio eficaz de identificação do nível de proteção em todos os acessos de pedestres, veículos e embarcações",
          description: "Verificar sinalização de níveis de proteção",
          order: 18
        },
        {
          id: "item-4-20",
          title: "4.20 - Há solicitação de identificação pessoal em outros locais além do de ingresso à instalação",
          description: "Verificar controle interno de identificação",
          order: 19
        },
        {
          id: "item-4-21",
          title: "4.21 - É procedimento normal a solicitação de identificação pessoal no interior da instalação",
          description: "Verificar procedimento de solicitação de identificação",
          order: 20
        },
        {
          id: "item-4-22",
          title: "4.22 - Existe verificação efetiva da identificação pessoal nos pontos de controle de acesso",
          description: "Verificar efetividade do controle",
          order: 21
        },
        {
          id: "item-4-23",
          title: "4.23 - Existe controle de acesso informatizado em todos os pontos de acesso",
          description: "Verificar sistema informatizado de controle",
          order: 22
        },
        {
          id: "item-4-24",
          title: "4.24 - A identificação pessoal é registrada com número serial e código de barras, fornecendo controle irrestrito de pessoal à instalação, sem múltiplos acessos contínuos",
          description: "Verificar sistema de identificação",
          order: 23
        },
        {
          id: "item-4-25",
          title: "4.25 - O crachá extraviado é substituído por outro com número diferente. É feita a baixa para negativa de acesso do extraviado e existe sistema de comunicação aos postos de controle sobre o extravio",
          description: "Verificar procedimento de extravio de crachá",
          order: 24
        },
        {
          id: "item-4-26",
          title: "4.26 - O procedimento de identificação de visitantes e de fornecimento de crachá aos funcionários que tiverem esquecido sua identificação é separado e controlado de forma universal",
          description: "Verificar controle de visitantes e esquecidos",
          order: 25
        },
        {
          id: "item-4-27",
          title: "4.27 - As identificações pessoais são diferenciadas por cor ou forma em função dos diversos locais com autorizações próprias, para facilitar a identificação",
          description: "Verificar diferenciação visual de crachás",
          order: 26
        },
        {
          id: "item-4-28",
          title: "4.28 - O recolhimento das identificações pessoais possui procedimento eficiente",
          description: "Verificar recolhimento de crachás",
          order: 27
        },
        {
          id: "item-4-29",
          title: "4.29 - Existe previsão e efetivo para acompanhamento de pessoas na instalação portuária quando necessário (visitantes, vendedores, motoristas etc.)",
          description: "Verificar escolta de visitantes",
          order: 28
        },
        {
          id: "item-4-30",
          title: "4.30 - Há procedimento específico para controle de acesso e movimentação de tripulantes. Há previsão de escolta de membros da tripulação das embarcações atracadas",
          description: "Verificar controle de tripulantes",
          order: 29
        },
        {
          id: "item-4-31",
          title: "4.31 - Há procedimento específico para controle de acesso de familiares e visitantes de tripulantes das embarcações atracadas ou fundeadas. O registro de visitantes é eficiente e acessível",
          description: "Verificar controle de visitantes de tripulantes",
          order: 30
        },
        {
          id: "item-4-32",
          title: "4.32 - O controle de acesso de veículos é eficiente",
          description: "Verificar controle de veículos",
          order: 31
        },
        {
          id: "item-4-33",
          title: "4.33 - O estacionamento é supervisionado e restrito a veículos próprios e controlados. Há sistema de vigilância no estacionamento",
          description: "Verificar controle de estacionamento",
          order: 32
        },
        {
          id: "item-4-34",
          title: "4.34 - O procedimento de controle de tráfego na instalação é eficaz",
          description: "Verificar controle de tráfego interno",
          order: 33
        },
        {
          id: "item-4-35",
          title: "4.35 - Os veículos não autorizados possuem área própria de estacionamento",
          description: "Verificar área para veículos não autorizados",
          order: 34
        },
        {
          id: "item-4-36",
          title: "4.36 - Os postos de controle de acesso às áreas restritas e controladas estão devidamente estruturados",
          description: "Verificar estrutura dos postos de controle",
          order: 35
        },
        {
          id: "item-4-37",
          title: "4.37 - As áreas restritas e controladas estão devidamente cercadas e sinalizadas",
          description: "Verificar cercamento e sinalização",
          order: 36
        },
        {
          id: "item-4-38",
          title: "4.38 - A equipe de segurança realiza patrulhas rotineiras em todas as áreas, especialmente nas controladas e restritas",
          description: "Verificar patrulhamento",
          order: 37
        },
        {
          id: "item-4-39",
          title: "4.39 - Quantos colaboradores fazem parte da equipe de segurança? Em que escala de turno trabalham? As quantidades e escalas são adequadas?",
          description: "Verificar efetivo e escalas de segurança",
          order: 38
        },
        {
          id: "item-4-40",
          title: "4.40 - A equipe de segurança tem identificação própria, com uniforme e autorização para acesso às áreas específicas necessárias ao desempenho da função",
          description: "Verificar identificação da equipe de segurança",
          order: 39
        },
        {
          id: "item-4-41",
          title: "4.41 - O Supervisor de Segurança Portuária realiza reuniões com a equipe da unidade de segurança. Qual a frequência? Há evidências? A frequência é suficiente?",
          description: "Verificar reuniões do SSP",
          order: 40
        },
        {
          id: "item-4-42",
          title: "4.42 - Os equipamentos de comunicação do Supervisor de Segurança Portuária com a equipe, demais funcionários e órgãos de segurança pública e defesa são eficazes. Quais são os meios utilizados?",
          description: "Verificar sistemas de comunicação",
          order: 41
        },
        {
          id: "item-4-43",
          title: "4.43 - Em caso de crise ou emergência, existe previsão de procedimentos a serem adotados",
          description: "Verificar procedimentos de emergência",
          order: 42
        },
        {
          id: "item-4-44",
          title: "4.44 - Há registro de passagem da equipe de segurança em pontos de controle. As rondas possuem itinerário variado para evitar rotinas previsíveis",
          description: "Verificar registros de ronda",
          order: 43
        },
        {
          id: "item-4-45",
          title: "4.45 - A equipe de segurança possui treinamento e certificado válido para portar arma de fogo",
          description: "Verificar certificação para porte de arma",
          order: 44
        },
        {
          id: "item-4-46",
          title: "4.46 - A equipe de segurança possui equipamentos adequados e dentro da validade requerida. Há caixa de areia para passagem de serviço armado",
          description: "Verificar equipamentos de segurança",
          order: 45
        },
        {
          id: "item-4-47",
          title: "4.47 - A equipe de segurança recebe treinamento frequente. Mencionar a frequência",
          description: "Verificar treinamentos da equipe",
          order: 46
        },
        {
          id: "item-4-48",
          title: "4.48 - A equipe de segurança realiza exercícios. Mencionar a frequência e a data do último exercício",
          description: "Verificar exercícios práticos",
          order: 47
        },
        {
          id: "item-4-49",
          title: "4.49 - O sistema de detecção de invasão é sinalizado e monitorado de um ponto central, permitindo acionar a força de resposta",
          description: "Verificar sistema de detecção de invasão",
          order: 48
        },
        {
          id: "item-4-50",
          title: "4.50 - Os pontos de acesso de veículos e pedestres são fechados quando não utilizados ou em elevação do nível de proteção para 2 ou 3",
          description: "Verificar fechamento de acessos",
          order: 49
        },
        {
          id: "item-4-51",
          title: "4.51 - As lâmpadas ou iluminação impróprias são imediatamente substituídas",
          description: "Verificar manutenção de iluminação",
          order: 50
        },
        {
          id: "item-4-52",
          title: "4.52 - Há atualização dos registros de exercícios, incidentes e dados exigidos no Plano de Segurança Portuária. Existem auditorias internas e registros específicos. Qual a frequência?",
          description: "Verificar registros e auditorias",
          order: 51
        },
        {
          id: "item-4-53",
          title: "4.53 - O pessoal responsável pelo controle de acesso e atendimento telefônico conhece os procedimentos em caso de ameaça terrorista, sequestro com reféns ou distúrbios civis",
          description: "Verificar conhecimento de procedimentos de emergência",
          order: 52
        },
        {
          id: "item-4-54",
          title: "4.54 - O pessoal da Unidade de Segurança sabe como proceder para contatar órgãos de segurança pública, defesa civil, autoridade marítima e outros de interesse",
          description: "Verificar conhecimento de contatos de emergência",
          order: 53
        },
        {
          id: "item-4-55",
          title: "4.55 - Os procedimentos previstos no Plano de Segurança Portuária para elevação de nível de proteção são adequados",
          description: "Verificar procedimentos de elevação de nível",
          order: 54
        },
        {
          id: "item-4-56",
          title: "4.56 - Os Registros de Ocorrência de Incidente de Proteção são emitidos em até 24 horas e mantidos arquivados por cinco anos",
          description: "Verificar registros de incidentes",
          order: 55
        },
        {
          id: "item-4-57",
          title: "4.57 - A contratação de novos colaboradores é precedida de avaliação prévia de antecedentes criminais",
          description: "Verificar procedimento de contratação",
          order: 56
        },
        {
          id: "item-4-58",
          title: "4.58 - O Estudo de Avaliação de Riscos e o Plano de Segurança Portuária estão protegidos contra acesso não autorizado",
          description: "Verificar proteção de documentos sensíveis",
          order: 57
        },
        {
          id: "item-4-59",
          title: "4.59 - A instalação portuária conhece os procedimentos para responder aos sinais de alarme das embarcações atracadas ou fundeadas",
          description: "Verificar procedimentos de resposta a alarmes",
          order: 58
        },
        {
          id: "item-4-60",
          title: "4.60 - A Unidade de Segurança é capaz de efetuar contato imediato com os funcionários durante e fora do expediente",
          description: "Verificar sistema de comunicação interna",
          order: 59
        },
        {
          id: "item-4-61",
          title: "4.61 - O pessoal da Unidade de Segurança possui acesso à relação de deveres e atribuições contida no Plano de Segurança Portuária",
          description: "Verificar acesso a documentação",
          order: 60
        },
        {
          id: "item-4-62",
          title: "4.62 - O sistema de cadastramento, movimentação, armazenamento e manuseio de veículos, embarcações, equipamentos, cargas, mercadorias perigosas e substâncias nocivas funciona adequadamente",
          description: "Verificar sistema de controle de movimentação",
          order: 61
        },
        {
          id: "item-4-63",
          title: "4.63 - A instalação portuária possui sistema informatizado de registro de dados de segurança, incluindo controle de acessos e chaves, com retenção mínima de noventa dias",
          description: "Verificar sistema informatizado de segurança",
          order: 62
        },
        {
          id: "item-4-64",
          title: "4.64 - Os sistemas de alarme e comunicação previstos no Plano de Segurança Portuária funcionam adequadamente",
          description: "Verificar sistemas de alarme e comunicação",
          order: 63
        }
      ]
    },
    {
      id: "area-5",
      name: "5 - COMUNICAÇÕES E TECNOLOGIA DA INFORMAÇÃO (TI)",
      order: 4,
      items: [
        {
          id: "item-5-1",
          title: "5.1 - Controle de Acesso Digital",
          description: "Verificar políticas de controle de acesso aos sistemas",
          order: 0
        },
        {
          id: "item-5-2",
          title: "5.2 - Administração de Sistemas",
          description: "Verificar procedimentos de administração de sistemas",
          order: 1
        },
        {
          id: "item-5-3",
          title: "5.3 - Backups",
          description: "Verificar política e execução de backups",
          order: 2
        },
        {
          id: "item-5-4",
          title: "5.4 - Segurança de Rede",
          description: "Verificar segurança da infraestrutura de rede",
          order: 3
        },
        {
          id: "item-5-5",
          title: "5.5 - Antivírus",
          description: "Verificar sistema de proteção contra malware",
          order: 4
        },
        {
          id: "item-5-6",
          title: "5.6 - Firewalls",
          description: "Verificar configuração e funcionamento de firewalls",
          order: 5
        },
        {
          id: "item-5-7",
          title: "5.7 - Políticas de Uso",
          description: "Verificar políticas de uso de sistemas e recursos de TI",
          order: 6
        },
        {
          id: "item-5-8",
          title: "5.8 - Auditorias de TI",
          description: "Verificar auditorias de segurança da informação",
          order: 7
        },
        {
          id: "item-5-9",
          title: "5.9 - Treinamento em TI",
          description: "Verificar treinamento de usuários em segurança da informação",
          order: 8
        },
        {
          id: "item-5-10",
          title: "5.10 - Registros de Incidentes de TI",
          description: "Verificar registro e tratamento de incidentes de segurança",
          order: 9
        }
      ]
    },
    {
      id: "area-6",
      name: "6 - OUTROS ITENS JULGADOS NECESSÁRIOS",
      order: 5,
      items: [
        {
          id: "item-6-1",
          title: "6.1 - Descrever detalhadamente conforme constatação de impacto relevante à segurança",
          description: "Registrar observações adicionais identificadas durante a auditoria",
          order: 0
        }
      ]
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};

export async function addDefaultPreset() {
  try {
    console.log("Adicionando preset padrão...");
    const docRef = await addDoc(collection(db, "presets"), defaultPreset);
    console.log("Preset adicionado com sucesso! ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao adicionar preset:", error);
    throw error;
  }
}

