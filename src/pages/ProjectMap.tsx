import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const GOOGLE_MAPS_API_KEY = "AIzaSyCFNMHYf9WQPcFJNNs7LbOIxdc6U6aaTVA";

const loadScript = (url: string) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

export default function ProjectMap() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<any[]>([]);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      const projectRef = doc(db, "projetos", id);
      const projectDoc = await getDoc(projectRef);
      if (!projectDoc.exists()) {
        setLoading(false);
        return;
      }
      const data = projectDoc.data();
      setProjectName(data.nome || "Projeto");
      const accordions = data.customAccordions || [];
      const pts: any[] = [];
      accordions.forEach((accordion: any) => {
        if (accordion.items && Array.isArray(accordion.items)) {
          accordion.items.forEach((item: any) => {
            if (item.subItems && Array.isArray(item.subItems)) {
              item.subItems.forEach((sub: any) => {
                // Verificar se há fotos com localização
                if (sub.photos && Array.isArray(sub.photos)) {
                  sub.photos.forEach((photo: any) => {
                    if (photo.latitude && photo.longitude && 
                        photo.latitude !== 0 && photo.longitude !== 0) {
                      // Verificar se já existe um ponto com essas coordenadas
                      const existingPoint = pts.find(p => 
                        p.lat === photo.latitude && p.lng === photo.longitude
                      );
                      
                      if (!existingPoint) {
                        pts.push({
                          lat: photo.latitude,
                          lng: photo.longitude,
                          url: photo.url,
                          createdAt: photo.createdAt,
                          title: sub.title,
                          itemTitle: item.title,
                          photoIndex: pts.length + 1
                        });
                      }
                    }
                  });
                }
              });
            }
          });
        }
      });
      setPoints(pts);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!loading && points.length > 0) {
      loadScript(`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`).then(() => {
        const w = window as any;
        const map = new w.google.maps.Map(document.getElementById("map") as HTMLElement, {
          center: points[0],
          zoom: 14,
        });
        points.forEach((point) => {
          const marker = new w.google.maps.Marker({
            position: point,
            map,
            title: point.title,
            label: {
              text: point.photoIndex.toString(),
              color: 'white',
              fontWeight: 'bold'
            },
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="16" fill="#3B82F6"/>
                  <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${point.photoIndex}</text>
                </svg>
              `),
              scaledSize: new w.google.maps.Size(32, 32),
              anchor: new w.google.maps.Point(16, 16)
            }
          });
          
          const info = new w.google.maps.InfoWindow({
            content: `
              <div style='min-width:200px; padding: 8px;'>
                <div style='font-weight: bold; color: #1F2937; margin-bottom: 4px;'>
                  📸 ${point.title}
                </div>
                <div style='color: #6B7280; font-size: 12px; margin-bottom: 8px;'>
                  ${point.itemTitle || ''}
                </div>
                <img src='${point.url}' style='width: 100%; max-width: 180px; height: 120px; object-fit: cover; border-radius: 8px; margin: 8px 0;'/>
                <div style='color: #6B7280; font-size: 11px; margin-top: 8px;'>
                  📅 ${new Date(point.createdAt).toLocaleString('pt-BR')}
                </div>
                <div style='color: #6B7280; font-size: 11px;'>
                  📍 ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}
                </div>
              </div>
            `
          });
          
          marker.addListener("click", () => info.open(map, marker));
        });
      });
    }
  }, [loading, points]);

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => {
        // Verificar se o usuário é cliente ou admin para redirecionar corretamente
        const isClient = window.location.pathname.includes('/client-projects');
        navigate(isClient ? "/client-projects" : "/projetos");
      }} className="flex items-center space-x-1 mb-4">
        Voltar
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>🗺️ Mapa de Localizações - {projectName}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader className="animate-spin w-8 h-8 text-blue-500 mb-2" />
              <span className="text-gray-500">Carregando mapa...</span>
            </div>
          ) : points.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <span className="text-gray-500">Nenhuma foto com localização GPS encontrada neste projeto.</span>
              <span className="text-gray-400 text-sm mt-2">As fotos precisam ter coordenadas GPS para aparecerem no mapa.</span>
            </div>
          ) : (
            <>
              {/* Estatísticas */}
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      📸 {points.length} foto{points.length > 1 ? 's' : ''} com localização
                    </p>
                    <p className="text-xs text-blue-700">
                      Clique nos marcadores para ver os detalhes
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-600">
                      Última atualização: {new Date().toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Mapa */}
              <div id="map" style={{ width: "100%", height: 500, borderRadius: 12 }} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 