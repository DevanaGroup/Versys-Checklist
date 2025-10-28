import { useState, useEffect, useRef } from 'react';
import { getLocationWithFallback } from '../lib/locationService';

interface GeolocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  region?: string;
  timezone?: string;
  isp?: string;
}

interface GeolocationState {
  location: GeolocationData | null;
  loading: boolean;
  error: string | null;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    loading: true,
    error: null,
  });
  const [hasFetchedDetails, setHasFetchedDetails] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const firstDetailsRef = useRef<GeolocationData | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeLocation = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        // Primeira tentativa: GPS fresco (sem cache)
        const locationData = await getLocationWithFallback(false);
        
        if (!isMounted) return;
        
        setState({
          location: locationData,
          loading: false,
          error: null,
        });
        firstDetailsRef.current = locationData;
        setHasFetchedDetails(true);
      } catch (error) {
        if (!isMounted) return;
        
        console.error('Erro ao obter localização inicial:', error);
        setState({
          location: null,
          loading: false,
          error: 'Erro ao obter localização',
        });
      }
    };

    // Obter localização inicial
    initializeLocation();

    // Configurar watch de geolocalização se disponível
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          if (!isMounted) return;
          
          const { latitude, longitude } = position.coords;
          
          setState(prev => ({
            ...prev,
            location: firstDetailsRef.current
              ? { ...firstDetailsRef.current, latitude, longitude }
              : { latitude, longitude },
            loading: false,
            error: null,
          }));
        },
        (error) => {
          if (!isMounted) return;
          
          console.warn('Erro no watch de geolocalização:', error);
          // Não definir erro aqui, pois já temos dados iniciais
        },
        {
          enableHighAccuracy: true,
          timeout: 30000, // 30 segundos
          maximumAge: 60000, // 1 minuto (permite usar cache recente no watch)
        }
      );

      // Atualização periódica a cada 2 minutos (pode usar cache)
      intervalIdRef.current = setInterval(async () => {
        if (!isMounted) return;
        
        try {
          const locationData = await getLocationWithFallback(true); // Permite cache
          if (isMounted) {
            setState(prev => ({
              ...prev,
              location: locationData,
              loading: false,
              error: null,
            }));
            firstDetailsRef.current = locationData;
          }
        } catch (error) {
          console.warn('Erro na atualização periódica de localização:', error);
        }
      }, 120000); // 2 minutos
    }

    return () => {
      isMounted = false;
      
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, []);

  const refreshLocation = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Refresh sempre busca GPS fresco (sem cache)
      const locationData = await getLocationWithFallback(false);
      
      setState({
        location: locationData,
        loading: false,
        error: null,
      });
      firstDetailsRef.current = locationData;
    } catch (error) {
      console.error('Erro ao atualizar localização:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Erro ao atualizar localização',
      }));
    }
  };

  return {
    ...state,
    refreshLocation,
  };
};
