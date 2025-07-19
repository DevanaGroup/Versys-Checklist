import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export interface Step {
  label: string;
  subtitle?: string;
  completed?: boolean;
}

interface WizardNavigationProps {
  /** Exibir indicadores de passo no topo */
  showIndicators?: boolean;
  /** Exibir barra de navegação inferior */
  showNav?: boolean;
  /** Array de passos do wizard */
  steps: Step[];
  /** Índice do passo atual (0-based) */
  currentStep: number;
  /** Callback para avançar */
  onNext: () => void;
  /** Callback para voltar */
  onPrev: () => void;
  /** Classe opcional para estilização extra */
  className?: string;
}

/**
 * Componente reutilizável de navegação do wizard (stepper).
 * Renderiza indicadores de passos no topo e botões Anterior/Próximo na base, com contador de passos.
 *
 * Usado em visualizações de projetos (Admin & Cliente).
 */
export const WizardNavigation: React.FC<WizardNavigationProps> = ({
  steps,
  currentStep,
  onNext,
  onPrev,
  className = "",
  showIndicators = true,
  showNav = true,
}) => {
  return (
    <div className={`space-y-6 ${className}`.trim()}>
      {/* Indicadores do topo */}
      <div className="flex items-center justify-center space-x-8 py-4 border-b border-gray-100 overflow-x-auto">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          return (
            <div key={index} className="flex flex-col items-center min-w-[120px]">
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg"
                      : isCompleted
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {index + 1}
                </div>
                {/* linha conectando com próximo passo */}
                {index !== steps.length - 1 && (
                  <div
                    className={`w-16 h-0.5 ml-2 transition-all duration-200 ${
                      isCompleted ? "bg-green-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
              <div className="mt-2 text-center w-28 truncate">
                <p
                  className={`text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "text-blue-600"
                      : isCompleted
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}
                >
                  {step.label}
                </p>
                {step.subtitle && (
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                    {step.subtitle}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navegação inferior */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={currentStep === 0}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Anterior</span>
        </Button>

        <p className="text-sm text-gray-500">
          Passo {currentStep + 1} de {steps.length}
        </p>

        <Button
          size="sm"
          onClick={onNext}
          disabled={currentStep === steps.length - 1}
          className="flex items-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <span>Próximo</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default WizardNavigation;
