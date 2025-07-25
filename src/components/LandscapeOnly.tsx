import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

interface LandscapeOnlyProps {
  children: React.ReactNode;
}

const LandscapeOnly: React.FC<LandscapeOnlyProps> = ({ children }) => {
  const [isLandscape, setIsLandscape] = useState(true);

  useEffect(() => {
    const checkOrientation = () => {
      const isCurrentlyLandscape = window.innerWidth > window.innerHeight;
      setIsLandscape(isCurrentlyLandscape);
    };

    // Check initial orientation
    checkOrientation();

    // Listen for orientation changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Show landscape-only message for mobile/tablet in portrait
  if (!isLandscape && window.innerWidth <= 1024) {
    return (
      <div className="landscape-only-warning fixed inset-0 bg-versys-primary flex items-center justify-center z-50">
        <div className="text-center text-white p-8 max-w-md mx-4">
          <div className="mb-8">
            <div className="relative">
              <RotateCcw className="w-20 h-20 mx-auto mb-4 animate-bounce text-white" />
              <div className="absolute inset-0 w-20 h-20 mx-auto border-4 border-white/30 rounded-full animate-ping"></div>
            </div>
          </div>
          
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2 text-white">
              VERSYS
            </h1>
            <p className="text-sm text-blue-200 font-medium">
              Consultoria em Segurança Portuária
            </p>
          </div>
          
          <h2 className="text-xl font-semibold mb-6 text-yellow-300">
            🔄 Rotacione seu dispositivo
          </h2>
          
          <p className="text-base mb-6 leading-relaxed text-blue-100">
            Este sistema foi otimizado para funcionar <strong>apenas na orientação horizontal</strong> (paisagem) em dispositivos móveis e tablets.
          </p>
          
          <div className="bg-white/15 rounded-lg p-4 backdrop-blur-sm border border-white/20">
            <p className="text-sm text-white font-medium">
              📱 Gire seu dispositivo para o modo horizontal para continuar
            </p>
          </div>
          
          <div className="mt-6 text-xs text-blue-200">
            Melhor experiência garantida em landscape
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default LandscapeOnly;
