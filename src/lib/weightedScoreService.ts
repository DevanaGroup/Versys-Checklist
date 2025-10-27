import { RESPONSE_VALUES, NC, ProjectModule, WeightedQuestion } from './types';

/**
 * Serviço para calcular pontuações ponderadas de projetos
 */

interface ScoreResult {
  pontuacaoAtual: number;
  pontuacaoMaxima: number;
  percentual: number;
  ncsCompleted: number;
  ncsTotal: number;
}

interface ModuleScore {
  id: string;
  titulo: string;
  pontuacaoAtual: number;
  pontuacaoMaxima: number;
  percentual: number;
  itens: ItemScore[];
}

interface ItemScore {
  id: string;
  titulo: string;
  pontuacaoAtual: number;
  pontuacaoMaxima: number;
  percentual: number;
  ncs: NCScore[];
}

interface NCScore {
  id: string;
  numero: number;
  ncTitulo: string;
  pontuacaoAtual: number;
  pontuacaoMaxima: number;
  percentual: number;
  status: 'pending' | 'in_progress' | 'completed';
}

/**
 * Calcula a pontuação de uma pergunta individual
 */
export function calculateQuestionScore(question: WeightedQuestion): number {
  if (!question.response || !question.response.selectedOption) {
    return 0;
  }

  const responseValue = RESPONSE_VALUES[question.response.selectedOption];
  return question.weight * responseValue;
}

/**
 * Calcula a pontuação máxima de uma pergunta
 */
export function calculateQuestionMaxScore(question: WeightedQuestion): number {
  return question.weight;
}

/**
 * Calcula a pontuação de uma NC (Não Conformidade)
 */
export function calculateNCScore(nc: NC): NCScore {
  let pontuacaoAtual = 0;
  let pontuacaoMaxima = 0;

  nc.perguntas.forEach((pergunta) => {
    pontuacaoAtual += calculateQuestionScore(pergunta);
    pontuacaoMaxima += calculateQuestionMaxScore(pergunta);
  });

  const percentual = pontuacaoMaxima > 0 ? (pontuacaoAtual / pontuacaoMaxima) * 100 : 0;

  return {
    id: nc.id,
    numero: nc.numero,
    ncTitulo: nc.ncTitulo,
    pontuacaoAtual: Math.round(pontuacaoAtual * 100) / 100,
    pontuacaoMaxima: Math.round(pontuacaoMaxima * 100) / 100,
    percentual: Math.round(percentual * 100) / 100,
    status: nc.status,
  };
}

/**
 * Calcula a pontuação de um item (que contém múltiplas NCs)
 */
export function calculateItemScore(item: any): ItemScore {
  let pontuacaoAtual = 0;
  let pontuacaoMaxima = 0;
  const ncsScores: NCScore[] = [];

  if (item.ncs && Array.isArray(item.ncs)) {
    item.ncs.forEach((nc: NC) => {
      const ncScore = calculateNCScore(nc);
      ncsScores.push(ncScore);
      pontuacaoAtual += ncScore.pontuacaoAtual;
      pontuacaoMaxima += ncScore.pontuacaoMaxima;
    });
  }

  const percentual = pontuacaoMaxima > 0 ? (pontuacaoAtual / pontuacaoMaxima) * 100 : 0;

  return {
    id: item.id,
    titulo: item.titulo,
    pontuacaoAtual: Math.round(pontuacaoAtual * 100) / 100,
    pontuacaoMaxima: Math.round(pontuacaoMaxima * 100) / 100,
    percentual: Math.round(percentual * 100) / 100,
    ncs: ncsScores,
  };
}

/**
 * Calcula a pontuação de um módulo (que contém múltiplos itens)
 */
export function calculateModuleScore(module: ProjectModule): ModuleScore {
  let pontuacaoAtual = 0;
  let pontuacaoMaxima = 0;
  const itensScores: ItemScore[] = [];

  if (module.itens && Array.isArray(module.itens)) {
    module.itens.forEach((item) => {
      const itemScore = calculateItemScore(item);
      itensScores.push(itemScore);
      pontuacaoAtual += itemScore.pontuacaoAtual;
      pontuacaoMaxima += itemScore.pontuacaoMaxima;
    });
  }

  const percentual = pontuacaoMaxima > 0 ? (pontuacaoAtual / pontuacaoMaxima) * 100 : 0;

  return {
    id: module.id,
    titulo: module.titulo,
    pontuacaoAtual: Math.round(pontuacaoAtual * 100) / 100,
    pontuacaoMaxima: Math.round(pontuacaoMaxima * 100) / 100,
    percentual: Math.round(percentual * 100) / 100,
    itens: itensScores,
  };
}

/**
 * Calcula a pontuação total do projeto baseado nos módulos
 */
export function calculateProjectScore(modules: ProjectModule[]): ScoreResult {
  let pontuacaoAtual = 0;
  let pontuacaoMaxima = 0;
  let ncsCompleted = 0;
  let ncsTotal = 0;

  if (modules && Array.isArray(modules)) {
    modules.forEach((module) => {
      const moduleScore = calculateModuleScore(module);
      pontuacaoAtual += moduleScore.pontuacaoAtual;
      pontuacaoMaxima += moduleScore.pontuacaoMaxima;

      // Contar NCs
      module.itens?.forEach((item) => {
        item.ncs?.forEach((nc) => {
          ncsTotal++;
          if (nc.status === 'completed') {
            ncsCompleted++;
          }
        });
      });
    });
  }

  const percentual = pontuacaoMaxima > 0 ? (pontuacaoAtual / pontuacaoMaxima) * 100 : 0;

  return {
    pontuacaoAtual: Math.round(pontuacaoAtual * 100) / 100,
    pontuacaoMaxima: Math.round(pontuacaoMaxima * 100) / 100,
    percentual: Math.round(percentual * 100) / 100,
    ncsCompleted,
    ncsTotal,
  };
}

/**
 * Calcula pontuação detalhada do projeto incluindo todos os módulos
 */
export function calculateDetailedProjectScore(modules: ProjectModule[]): {
  overall: ScoreResult;
  modules: ModuleScore[];
} {
  const modulesScores: ModuleScore[] = [];
  let pontuacaoAtualTotal = 0;
  let pontuacaoMaximaTotal = 0;
  let ncsCompleted = 0;
  let ncsTotal = 0;

  if (modules && Array.isArray(modules)) {
    modules.forEach((module) => {
      const moduleScore = calculateModuleScore(module);
      modulesScores.push(moduleScore);
      pontuacaoAtualTotal += moduleScore.pontuacaoAtual;
      pontuacaoMaximaTotal += moduleScore.pontuacaoMaxima;

      // Contar NCs
      module.itens?.forEach((item) => {
        item.ncs?.forEach((nc) => {
          ncsTotal++;
          if (nc.status === 'completed') {
            ncsCompleted++;
          }
        });
      });
    });
  }

  const percentual =
    pontuacaoMaximaTotal > 0 ? (pontuacaoAtualTotal / pontuacaoMaximaTotal) * 100 : 0;

  return {
    overall: {
      pontuacaoAtual: Math.round(pontuacaoAtualTotal * 100) / 100,
      pontuacaoMaxima: Math.round(pontuacaoMaximaTotal * 100) / 100,
      percentual: Math.round(percentual * 100) / 100,
      ncsCompleted,
      ncsTotal,
    },
    modules: modulesScores,
  };
}

/**
 * Determina a cor baseada no percentual
 */
export function getScoreColor(percentual: number): string {
  if (percentual >= 90) return 'text-green-600';
  if (percentual >= 75) return 'text-blue-600';
  if (percentual >= 60) return 'text-yellow-600';
  if (percentual >= 40) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Determina a cor de fundo baseada no percentual
 */
export function getScoreBgColor(percentual: number): string {
  if (percentual >= 90) return 'bg-green-100 text-green-800';
  if (percentual >= 75) return 'bg-blue-100 text-blue-800';
  if (percentual >= 60) return 'bg-yellow-100 text-yellow-800';
  if (percentual >= 40) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

/**
 * Retorna label de desempenho baseado no percentual
 */
export function getPerformanceLabel(percentual: number): string {
  if (percentual >= 90) return 'Excelente';
  if (percentual >= 75) return 'Bom';
  if (percentual >= 60) return 'Regular';
  if (percentual >= 40) return 'Insatisfatório';
  return 'Crítico';
}

export type { ScoreResult, ModuleScore, ItemScore, NCScore };

