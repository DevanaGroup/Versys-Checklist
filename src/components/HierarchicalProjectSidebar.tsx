import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetOverlay, SheetPortal } from "@/components/ui/sheet";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { ChevronDown, ChevronRight, FileText, Folder, CheckCircle, Clock, AlertCircle, Menu, X } from "lucide-react";
import { ProjectModule } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface HierarchicalProjectSidebarProps {
  modules: ProjectModule[];
  currentModuleId?: string;
  currentItemId?: string;
  currentNcId?: string;
  onNavigate: (moduleId: string, itemId: string, ncId?: string) => void;
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  showMobileButton?: boolean;
}

export const HierarchicalProjectSidebar = ({
  modules,
  currentModuleId,
  currentItemId,
  currentNcId,
  onNavigate,
  className,
  isOpen: externalIsOpen,
  onOpenChange,
  showMobileButton = true
}: HierarchicalProjectSidebarProps) => {
  const isMobile = useIsMobile();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Usar estado externo se fornecido, senão usar interno
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(currentModuleId ? [currentModuleId] : [])
  );
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set(currentItemId ? [currentItemId] : [])
  );

  // Garante que apenas o módulo atual fique expandido
  useEffect(() => {
    if (currentModuleId) {
      setExpandedModules(new Set([currentModuleId]));
    }
  }, [currentModuleId]);

  // Garante que apenas o item atual fique expandido
  useEffect(() => {
    if (currentItemId) {
      setExpandedItems(new Set([currentItemId]));
    }
  }, [currentItemId]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      // Se o módulo clicado já está expandido, colapsa ele
      if (prev.has(moduleId)) {
        return new Set();
      }
      // Caso contrário, expande apenas ele (colapsa os outros)
      return new Set([moduleId]);
    });
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      // Se o item clicado já está expandido, colapsa ele
      if (prev.has(itemId)) {
        return new Set();
      }
      // Caso contrário, expande apenas ele (colapsa os outros)
      return new Set([itemId]);
    });
  };

  const getStatusIcon = (status: 'pending' | 'in_progress' | 'completed') => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-3 w-3 text-yellow-600" />;
      default:
        return <AlertCircle className="h-3 w-3 text-gray-400" />;
    }
  };

  // Função para fechar o drawer após navegação no mobile - fecha apenas quando NC é selecionada
  const handleNavigateAndClose = (moduleId: string, itemId: string, ncId?: string) => {
    onNavigate(moduleId, itemId, ncId);
    // Só fecha o drawer se uma NC foi selecionada (ncId definido)
    if (isMobile && ncId) {
      setIsOpen(false);
    }
  };

  // Conteúdo da Sidebar (compartilhado entre desktop e mobile)
  const SidebarContent = ({ hideHeader = false }: { hideHeader?: boolean }) => (
    <>
      {/* Header - Oculto no mobile (já existe no SheetHeader) */}
      {!hideHeader && (
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-versys-primary" />
          <h2 className="text-lg font-semibold">Estrutura do Projeto</h2>
        </div>
      )}

      {/* Mensagem quando não há módulos */}
      {modules.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-sm text-gray-500 mb-2">Nenhum módulo adicionado</p>
          <p className="text-xs text-gray-400">Importe um preset ou crie manualmente</p>
        </div>
      ) : (
        /* Hierarquia: MÓDULO → ARTIGO → NCS */
        <div className="space-y-3">
            {modules.map((module) => {
            const isModuleExpanded = expandedModules.has(module.id);
            const isModuleActive = currentModuleId === module.id;
            const totalItens = module.itens.length;

            return (
              <div key={module.id} className="space-y-2">
                {/* ========== NÍVEL 1: MÓDULO ========== */}
                <button
                  onClick={() => toggleModule(module.id)}
                  className={cn(
                    "w-full flex items-center gap-2 p-3 rounded-lg text-left transition-all shadow-sm",
                    isModuleActive 
                      ? "bg-versys-primary text-white font-semibold" 
                      : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                  )}
                >
                  {isModuleExpanded ? (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                  )}
                  <Folder className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate uppercase">{module.titulo}</div>
                    <div className={cn(
                      "text-xs",
                      isModuleActive ? "text-white/80" : "text-gray-500"
                    )}>
                      {totalItens} {totalItens === 1 ? 'artigo' : 'artigos'}
                    </div>
                  </div>
                </button>

                {/* ========== NÍVEL 2: ARTIGOS ========== */}
                {isModuleExpanded && (
                  <div className="ml-4 pl-3 border-l-2 border-gray-200 space-y-2 max-h-[400px] overflow-y-auto">
                    {module.itens.map((item) => {
                      const isItemExpanded = expandedItems.has(item.id);
                      const isItemActive = currentItemId === item.id;
                      const hasNCs = item.ncs && item.ncs.length > 0;
                      const totalNCs = item.ncs.length;

                      return (
                        <div key={item.id} className="space-y-1">
                          {/* ARTIGO */}
                          <button
                            onClick={() => {
                              // Expande/colapsa o item para mostrar as NCs
                              toggleItem(item.id);
                              // No mobile, ao expandir, seleciona o primeiro NC automaticamente (mas não fecha o drawer)
                              if (isMobile && item.ncs && item.ncs.length > 0) {
                                onNavigate(module.id, item.id, item.ncs[0].id);
                              } else {
                                // Desktop: navega sem passar ncId
                                onNavigate(module.id, item.id);
                              }
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 p-2.5 rounded-lg text-left transition-colors",
                              isItemActive
                                ? "bg-blue-50 border-l-4 border-versys-primary"
                                : "hover:bg-gray-50"
                            )}
                          >
                            {hasNCs ? (
                              isItemExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-gray-600" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-600" />
                              )
                            ) : (
                              <div className="h-3.5 w-3.5" />
                            )}
                            <FileText className="h-4 w-4 flex-shrink-0 text-blue-600" />
                            <div className="flex-1 min-w-0">
                              <div className={cn(
                                "text-xs font-semibold text-gray-900 leading-tight",
                                isItemActive ? "break-words" : "truncate"
                              )}>
                                {item.titulo}
                              </div>
                            </div>
                            {hasNCs && (
                              <Badge 
                                variant={isItemActive ? "default" : "secondary"} 
                                className="text-[10px] px-2 py-0.5"
                              >
                                {totalNCs} NC{totalNCs > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </button>

                          {/* ========== NÍVEL 3: NCs ========== */}
                          {isItemExpanded && hasNCs && (
                            <div className="ml-6 pl-3 border-l-2 border-dashed border-gray-300 space-y-1">
                              {item.ncs.map((nc) => {
                                const isNcActive = currentNcId === nc.id;
                                const totalQuestions = nc.perguntas.length;
                                const answeredQuestions = nc.perguntas.filter(q => q.response !== null).length;
                                const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

                                return (
                                  <button
                                    key={nc.id}
                                    onClick={() => handleNavigateAndClose(module.id, item.id, nc.id)}
                                    className={cn(
                                      "w-full flex items-center gap-2 p-2 rounded-md text-left transition-all",
                                      isNcActive
                                        ? "bg-versys-primary text-white shadow-md"
                                        : "bg-white hover:bg-gray-50 border border-gray-200"
                                    )}
                                  >
                                    {getStatusIcon(nc.status)}
                                    <div className="flex-1 min-w-0">
                                      <div className={cn(
                                        "text-xs font-bold truncate",
                                        isNcActive ? "text-white" : "text-gray-900"
                                      )}>
                                        {nc.ncTitulo}
                                      </div>
                                    </div>
                                    <div className={cn(
                                      "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                                      isNcActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                                    )}>
                                      {answeredQuestions}/{totalQuestions}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
    </>
  );

  // Renderização diferente para mobile e desktop
  if (isMobile) {
    return (
      <>
        {/* Botão Flutuante no Mobile - Opcional */}
        {showMobileButton && (
          <Button
            onClick={() => setIsOpen(true)}
            className="fixed top-4 right-4 z-50 h-12 w-12 rounded-full bg-versys-primary hover:bg-versys-secondary shadow-lg md:hidden p-0"
            size="icon"
          >
            <Menu className="h-6 w-6" />
          </Button>
        )}

        {/* Drawer (Sheet) no Mobile */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetPortal>
            <SheetOverlay className="top-14" />
            <SheetPrimitive.Content
              className="fixed top-14 right-0 z-50 h-[calc(100vh-3.5rem)] w-[85vw] gap-4 border-l bg-background p-0 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right overflow-y-auto"
            >
            {/* Header do Drawer */}
            <div className="sticky top-0 bg-white z-10 px-6 pt-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-versys-primary" />
                <h2 className="text-lg font-semibold">Estrutura do Projeto</h2>
              </div>
            </div>
            
            {/* Conteúdo da Lista */}
            <div className="px-6 py-6">
              <SidebarContent hideHeader={true} />
            </div>
            
            {/* Botão Close */}
            <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
          </SheetPrimitive.Content>
        </SheetPortal>
        </Sheet>
      </>
    );
  }

  // Desktop: Sidebar normal
  return (
    <div className={cn("w-80 bg-white", className)}>
      <div className="p-6 m-4 border border-gray-350 rounded-lg shadow-md bg-white h-[calc(100vh-8rem)] overflow-y-auto">
        <SidebarContent />
      </div>
    </div>
  );
};
