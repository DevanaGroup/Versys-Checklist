import React, { createContext, useContext, useState, useEffect } from "react";

interface TabletModeContextProps {
  tabletMode: boolean;
  toggleTabletMode: () => void;
  setTabletMode: (val: boolean) => void;
}

const TabletModeContext = createContext<TabletModeContextProps | undefined>(undefined);

export const TabletModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tabletMode, setTabletMode] = useState(false);

  // Adiciona ou remove classe global no body
  useEffect(() => {
    if (tabletMode) {
      document.body.classList.add("tablet-mode");
    } else {
      document.body.classList.remove("tablet-mode");
    }
  }, [tabletMode]);

  const toggleTabletMode = () => setTabletMode((prev) => !prev);

  return (
    <TabletModeContext.Provider value={{ tabletMode, toggleTabletMode, setTabletMode }}>
      {children}
    </TabletModeContext.Provider>
  );
};

export function useTabletMode() {
  const context = useContext(TabletModeContext);
  if (!context) throw new Error("useTabletMode must be used within TabletModeProvider");
  return context;
}
