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
export const getLocationByGeolocation = (useCache: boolean = false): Promise<LocationData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não suportada'));
      return;
    }

    console.log('🌍 Solicitando geolocalização do navegador...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log('✅ Localização obtida:', { latitude, longitude, accuracy: `${accuracy.toFixed(0)}m` });
        resolve({
          latitude,
          longitude,
        });
      },
      (error) => {
        let errorMessage = 'Erro desconhecido ao obter localização';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '🚫 Permissão de localização negada. Por favor, permita o acesso à localização nas configurações do navegador.';
            console.error('❌ PERMISSÃO NEGADA:', errorMessage);
            console.log('💡 Para permitir:');
            console.log('   • Chrome: Clique no ícone de cadeado/informação ao lado da URL > Permissões > Localização > Permitir');
            console.log('   • Safari: Configurações > Safari > Localização > Este site > Permitir');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '📍 Localização indisponível. GPS pode estar desligado ou sinal fraco.';
            console.error('❌ LOCALIZAÇÃO INDISPONÍVEL:', errorMessage);
            break;
          case error.TIMEOUT:
            errorMessage = '⏱️ Tempo esgotado ao obter localização. Tente novamente.';
            console.error('❌ TIMEOUT:', errorMessage);
            break;
          default:
            errorMessage = `❌ Erro ao obter localização: ${error.message}`;
            console.error('❌ ERRO NA GEOLOCALIZAÇÃO:', {
              code: error.code,
              message: error.message
            });
        }
        
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 30000, // Aumentado para 30 segundos
        maximumAge: useCache ? 60000 : 0, // Se useCache=true usa 1 min, senão força GPS fresco
      }
    );
  });
};

// Função principal que usa apenas geolocalização do navegador
export const getLocation = async (useCache: boolean = false): Promise<LocationData | null> => {
  try {
    const geoLocation = await getLocationByGeolocation(useCache);
    return geoLocation;
  } catch (error) {
    console.warn('⚠️ Erro na geolocalização:', error);
    return null;
  }
};

// Função para obter localização com fallback para coordenadas padrão
export const getLocationWithFallback = async (useCache: boolean = false): Promise<LocationData> => {
  try {
    const location = await getLocation(useCache);
    if (location) {
      console.log('✅ Localização obtida com sucesso');
      return location;
    }
  } catch (error) {
    console.warn('⚠️ Erro ao obter localização, usando fallback:', error);
  }

  // Fallback: coordenadas genéricas (centro do Brasil)
  console.log('📍 Usando localização fallback');
  return {
    latitude: 0,
    longitude: 0,
    city: 'Localização não disponível',
    country: '',
    region: '',
  };
}; 