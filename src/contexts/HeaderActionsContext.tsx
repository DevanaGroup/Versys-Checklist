import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HeaderActionsContextType {
  rightAction: ReactNode;
  setRightAction: (action: ReactNode) => void;
}

const HeaderActionsContext = createContext<HeaderActionsContextType | undefined>(undefined);

export const HeaderActionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [rightAction, setRightAction] = useState<ReactNode>(null);

  return (
    <HeaderActionsContext.Provider value={{ rightAction, setRightAction }}>
      {children}
    </HeaderActionsContext.Provider>
  );
};

export const useHeaderActions = () => {
  const context = useContext(HeaderActionsContext);
  if (context === undefined) {
    throw new Error('useHeaderActions must be used within a HeaderActionsProvider');
  }
  return context;
};

