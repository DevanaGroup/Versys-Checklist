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

  if (error || !location) {
    return (
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-2 text-white/40 text-xs">
          <MapPin className="h-3 w-3" />
          <span>Localização não disponível</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-white/10 space-y-2">
      <div className="text-white/80 text-xs font-medium mb-2">Localização</div>
      
      {/* Cidade e País */}
      {(location.city || location.country) && (
        <div className="flex items-center gap-2 text-white/60 text-xs">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">
            {location.city && location.country 
              ? `${location.city}, ${location.country}`
              : location.city || location.country
            }
          </span>
        </div>
      )}

      {/* Região */}
      {location.region && (
        <div className="flex items-center gap-2 text-white/60 text-xs">
          <Globe className="h-3 w-3 flex-shrink-0" />
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

      {/* Coordenadas (sempre disponíveis) */}
      <div className="flex items-center gap-2 text-white/50 text-xs">
        <span className="truncate">
          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </span>
      </div>
    </div>
  );
}
