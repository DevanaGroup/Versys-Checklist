interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  region?: string;
  timezone?: string;
  isp?: string;
}

// Função para obter localização via geolocalização do navegador
export const getLocationByGeolocation = (): Promise<LocationData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não suportada'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve({
          latitude,
          longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutos
      }
    );
  });
};

// Função principal que usa apenas geolocalização do navegador
export const getLocation = async (): Promise<LocationData | null> => {
  try {
    const geoLocation = await getLocationByGeolocation();
    return geoLocation;
  } catch (error) {
    console.warn('Erro na geolocalização:', error);
    return null;
  }
};

// Função para obter localização com fallback para coordenadas padrão
export const getLocationWithFallback = async (): Promise<LocationData> => {
  try {
    const location = await getLocation();
    if (location) {
      return location;
    }
  } catch (error) {
    console.warn('Erro ao obter localização, usando fallback:', error);
  }

  // Fallback: coordenadas de São Paulo (ou outra cidade padrão)
  return {
    latitude: -23.5505,
    longitude: -46.6333,
    city: 'São Paulo',
    country: 'Brasil',
    region: 'SP',
  };
}; 