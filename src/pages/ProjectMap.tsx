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
                if (sub.photoData && sub.photoData.latitude && sub.photoData.longitude) {
                  pts.push({
                    lat: sub.photoData.latitude,
                    lng: sub.photoData.longitude,
                    url: sub.photoData.url,
                    createdAt: sub.photoData.createdAt,
                    title: sub.title,
                    itemTitle: item.title // novo campo para subtítulo
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
          });
          const info = new w.google.maps.InfoWindow({
            content: `<div style='min-width:160px'>
              <strong>${point.title}</strong><br/>
              <span style='color:#666;font-size:13px;'>${point.itemTitle || ''}</span><br/>
              <img src='${point.url}' style='max-width:120px;max-height:80px;border-radius:8px;margin:4px 0'/><br/>
              ${new Date(point.createdAt).toLocaleString('pt-BR')}
            </div>`
          });
          marker.addListener("click", () => info.open(map, marker));
        });
      });
    }
  }, [loading, points]);

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/projetos")} className="flex items-center space-x-1 mb-4">
        Voltar
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Locais das fotos - {projectName}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader className="animate-spin w-8 h-8 text-purple-500 mb-2" />
              <span className="text-gray-500">Carregando mapa...</span>
            </div>
          ) : points.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <span className="text-gray-500">Nenhum ponto com foto encontrado neste projeto.</span>
            </div>
          ) : (
            <div id="map" style={{ width: "100%", height: 400, borderRadius: 12 }} />
          )}
        </CardContent>
      </Card>
    </div>
  );
} 