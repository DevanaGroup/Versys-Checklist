
const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-versys-primary">Dashboard</h2>
        <p className="text-gray-600 mt-2">
          Bem-vindo ao sistema VERSYS de Consultoria em Segurança Portuária
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-versys-primary mb-2">Projetos Ativos</h3>
          <p className="text-3xl font-bold text-versys-secondary">4</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-versys-primary mb-2">Relatórios</h3>
          <p className="text-3xl font-bold text-versys-secondary">12</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-versys-primary mb-2">Pendências</h3>
          <p className="text-3xl font-bold text-versys-accent">3</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-versys-primary mb-2">Concluídos</h3>
          <p className="text-3xl font-bold text-green-600">8</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
