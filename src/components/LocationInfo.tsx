import { MapPin, Globe, Clock, Wifi } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';

export function LocationInfo() {
  const { location, loading, error } = useGeolocation();

  if (loading) {
    return (
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-2 text-white/60 text-xs">
          <MapPin className="h-3 w-3 animate-pulse" />
          <span>Obtendo localização...</span>
        </div>
      </div>
    );
  }

  // Verificar se a localização é válida (não é 0,0 e não é fallback)
  const isValidLocation = location && location.latitude !== 0 && location.longitude !== 0;
  
  if (error || !location || !isValidLocation) {
    return (
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-2 text-white/40 text-xs">
          <MapPin className="h-3 w-3" />
          <span>
            {error ? 'Erro ao obter localização' : 
             !location ? 'Localização não disponível' :
             'Aguardando GPS...'}
          </span>
        </div>
        {!isValidLocation && location && (
          <div className="text-white/30 text-[10px] mt-1">
            💡 Permita o acesso à localização no navegador
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-white/10 space-y-2 mt-auto">
      <div className="text-white/80 text-xs font-medium mb-2">
        📍 Localização GPS
      </div>
      
      {/* Coordenadas GPS */}
      <div className="flex items-center gap-2 text-white/70 text-xs font-mono">
        <MapPin className="h-3 w-3 flex-shrink-0 text-green-400" />
        <span className="truncate">
          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
        </span>
      </div>

      {/* Cidade e País (se disponível) */}
      {(location.city || location.country) && location.city !== 'Localização não disponível' && (
        <div className="flex items-center gap-2 text-white/60 text-xs">
          <Globe className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">
            {location.city && location.country 
              ? `${location.city}, ${location.country}`
              : location.city || location.country
            }
          </span>
        </div>
      )}

      {/* Região */}
      {location.region && location.region.trim() !== '' && (
        <div className="flex items-center gap-2 text-white/60 text-xs">
          <span className="truncate">{location.region}</span>
        </div>
      )}

      {/* Timezone */}
      {location.timezone && (
        <div className="flex items-center gap-2 text-white/60 text-xs">
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{location.timezone}</span>
        </div>
      )}

      {/* ISP */}
      {location.isp && (
        <div className="flex items-center gap-2 text-white/60 text-xs">
          <Wifi className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{location.isp}</span>
        </div>
      )}
    </div>
  );
}
