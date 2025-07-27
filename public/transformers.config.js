// Configuração para Transformers.js
self.addEventListener('message', async (event) => {
  const { data } = event;
  
  if (data.type === 'LOAD_MODEL') {
    try {
      // Importar dinamicamente o Transformers.js
      const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1/dist/transformers.min.js');
      
      // Configurar cache local
      const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', {
        cache_dir: '/models/',
        local_files_only: false,
      });
      
      self.postMessage({ type: 'MODEL_LOADED', transcriber });
    } catch (error) {
      self.postMessage({ type: 'MODEL_ERROR', error: error.message });
    }
  }
  
  if (data.type === 'TRANSCRIBE') {
    try {
      const result = await data.transcriber(data.audioBlob);
      self.postMessage({ type: 'TRANSCRIPTION_RESULT', result });
    } catch (error) {
      self.postMessage({ type: 'TRANSCRIPTION_ERROR', error: error.message });
    }
  }
});
