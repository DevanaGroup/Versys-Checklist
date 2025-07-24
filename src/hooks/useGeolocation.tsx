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
  const [hasFetchedDetails, setHasFetchedDetails] = useState(false);

  useEffect(() => {
    let watchId: number | null = null;
    let intervalId: NodeJS.Timeout | null = null;
    let firstUpdate = true;
    let firstDetails: GeolocationData | null = null;

    const fetchDetails = async (latitude: number, longitude: number) => {
      try {
        const response = await fetch(`https://ipapi.co/json/`);
        const data = await response.json();
        if (data && !data.error) {
          return {
            latitude,
            longitude,
            city: data.city,
            country: data.country_name,
            region: data.region,
            timezone: data.timezone,
            isp: data.org,
          };
        }
      } catch {}
      return { latitude, longitude };
    };

    const updatePosition = (latitude: number, longitude: number) => {
      setState(prev => ({
        ...prev,
        location: prev.location
          ? { ...prev.location, latitude, longitude }
          : { latitude, longitude },
        loading: false,
        error: null,
      }));
    };

    if (navigator.geolocation) {
      setState(prev => ({ ...prev, loading: true, error: null }));
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          if (firstUpdate && !hasFetchedDetails) {
            const details = await fetchDetails(latitude, longitude);
            setState({ location: details, loading: false, error: null });
            setHasFetchedDetails(true);
            firstDetails = details;
            firstUpdate = false;
          } else {
            // Só atualiza lat/lng, mantém os dados extras da primeira vez
            setState(prev => ({
              ...prev,
              location: firstDetails
                ? { ...firstDetails, latitude, longitude }
                : { latitude, longitude },
              loading: false,
              error: null,
            }));
          }
        },
        (error) => {
          setState({ location: null, loading: false, error: 'Não foi possível obter a localização' });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
      // Atualização forçada a cada 1 segundo
      intervalId = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            // Só atualiza lat/lng, mantém os dados extras da primeira vez
            setState(prev => ({
              ...prev,
              location: firstDetails
                ? { ...firstDetails, latitude, longitude }
                : { latitude, longitude },
              loading: false,
              error: null,
            }));
          },
          () => {},
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      }, 1000);
    } else {
      // Fallback: usar apenas IP
      (async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
          const response = await fetch(`https://ipapi.co/json/`);
          const data = await response.json();
          if (data && !data.error) {
            setState({
              location: {
                latitude: data.latitude,
                longitude: data.longitude,
                city: data.city,
                country: data.country_name,
                region: data.region,
                timezone: data.timezone,
                isp: data.org,
              },
              loading: false,
              error: null,
            });
          } else {
            setState({ location: null, loading: false, error: 'Geolocalização não suportada' });
          }
        } catch {
          setState({ location: null, loading: false, error: 'Geolocalização não suportada' });
        }
      })();
    }
    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [hasFetchedDetails]);

  return state;
};
