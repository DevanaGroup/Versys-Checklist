
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';

export const PWAInstallButton = () => {
  const { isInstallable, isInstalled, installPWA } = usePWA();

  if (isInstalled || !isInstallable) {
    return null;
  }

  return (
    <Button
      onClick={installPWA}
      variant="outline"
      size="sm"
      className="fixed bottom-4 right-4 bg-white shadow-lg hover:shadow-xl z-50"
    >
      <Download className="h-4 w-4 mr-2" />
      Instalar App
    </Button>
  );
};
