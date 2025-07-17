import { useState, useEffect } from 'react';

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

  useEffect(() => {
    const getLocation = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Primeiro, tentar obter coordenadas do navegador
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              
              try {
                // Usar um serviço gratuito para obter informações da localização
                const response = await fetch(`https://ipapi.co/json/`);
                const data = await response.json();
                
                if (data && !data.error) {
                  const locationData: GeolocationData = {
                    latitude: latitude,
                    longitude: longitude,
                    city: data.city,
                    country: data.country_name,
                    region: data.region,
                    timezone: data.timezone,
                    isp: data.org,
                  };
                  
                  setState({
                    location: locationData,
                    loading: false,
                    error: null,
                  });
                } else {
                  // Fallback: usar apenas coordenadas
                  setState({
                    location: { latitude, longitude },
                    loading: false,
                    error: null,
                  });
                }
              } catch (apiError) {
                // Se a API falhar, usar apenas coordenadas
                setState({
                  location: { latitude, longitude },
                  loading: false,
                  error: null,
                });
              }
            },
            async (error) => {
              console.warn('Geolocation error:', error);
              
              // Fallback: usar apenas IP para localização aproximada
              try {
                const response = await fetch(`https://ipapi.co/json/`);
                const data = await response.json();
                
                if (data && !data.error) {
                  const locationData: GeolocationData = {
                    latitude: data.latitude,
                    longitude: data.longitude,
                    city: data.city,
                    country: data.country_name,
                    region: data.region,
                    timezone: data.timezone,
                    isp: data.org,
                  };
                  
                  setState({
                    location: locationData,
                    loading: false,
                    error: null,
                  });
                } else {
                  setState({
                    location: null,
                    loading: false,
                    error: 'Não foi possível obter a localização',
                  });
                }
              } catch (apiError) {
                setState({
                  location: null,
                  loading: false,
                  error: 'Não foi possível obter a localização',
                });
              }
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000, // 5 minutos
            }
          );
        } else {
          // Navegador não suporta geolocalização - usar apenas IP
          try {
            const response = await fetch(`https://ipapi.co/json/`);
            const data = await response.json();
            
            if (data && !data.error) {
              const locationData: GeolocationData = {
                latitude: data.latitude,
                longitude: data.longitude,
                city: data.city,
                country: data.country_name,
                region: data.region,
                timezone: data.timezone,
                isp: data.org,
              };
              
              setState({
                location: locationData,
                loading: false,
                error: null,
              });
            } else {
              setState({
                location: null,
                loading: false,
                error: 'Geolocalização não suportada',
              });
            }
          } catch (apiError) {
            setState({
              location: null,
              loading: false,
              error: 'Geolocalização não suportada',
            });
          }
        }
      } catch (error) {
        setState({
          location: null,
          loading: false,
          error: 'Erro ao obter localização',
        });
      }
    };

    getLocation();
  }, []);

  return state;
};
