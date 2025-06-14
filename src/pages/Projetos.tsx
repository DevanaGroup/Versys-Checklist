
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building } from "lucide-react";

const projetos = [
  { id: 1, nome: "BUNGE", status: "Ativo", progresso: 75 },
  { id: 2, nome: "AMAGGI", status: "Em Análise", progresso: 45 },
  { id: 3, nome: "ECOPORTO", status: "Concluído", progresso: 100 },
  { id: 4, nome: "ADM", status: "Iniciado", progresso: 20 },
];

const Projetos = () => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ativo": return "bg-green-100 text-green-800";
      case "Em Análise": return "bg-yellow-100 text-yellow-800";
      case "Concluído": return "bg-blue-100 text-blue-800";
      case "Iniciado": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-versys-primary">Projetos</h2>
        <p className="text-gray-600 mt-2">
          Gerencie seus projetos de segurança portuária
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card Novo Projeto */}
        <Card 
          className="border-2 border-dashed border-versys-secondary hover:border-versys-primary transition-colors cursor-pointer group"
          onClick={() => navigate("/projetos/new")}
        >
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-16 h-16 bg-versys-secondary/20 rounded-full flex items-center justify-center mb-4 group-hover:bg-versys-primary/20 transition-colors">
              <Plus className="h-8 w-8 text-versys-secondary group-hover:text-versys-primary" />
            </div>
            <h3 className="text-lg font-semibold text-versys-primary group-hover:text-versys-secondary">
              Novo Projeto
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              Clique para criar um novo projeto
            </p>
          </CardContent>
        </Card>

        {/* Cards dos Projetos */}
        {projetos.map((projeto) => (
          <Card key={projeto.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-versys-primary" />
                  <span className="text-versys-primary">{projeto.nome}</span>
                </CardTitle>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(projeto.status)}`}>
                  {projeto.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progresso</span>
                    <span className="text-versys-primary font-medium">{projeto.progresso}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-versys-secondary to-versys-accent h-2 rounded-full transition-all"
                      style={{ width: `${projeto.progresso}%` }}
                    ></div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full border-versys-secondary text-versys-primary hover:bg-versys-secondary hover:text-white"
                >
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Projetos;
