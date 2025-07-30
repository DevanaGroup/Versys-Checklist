import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Calendar, User, MapPin, FileText, CheckCircle, AlertCircle, Clock, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { RelatorioService } from '@/lib/relatorioService';
import { RelatorioItem } from '@/lib/types';

const ClientRelatorioEdit = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { userData } = useAuthContext();
  const [relatorios, setRelatorios] = useState<RelatorioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadRelatorios();
    }
  }, [projectId]);

  const loadRelatorios = async () => {
    try {
      setLoading(true);
      const relatoriosData = await RelatorioService.getRelatorioByProject(projectId!);
      
      // Verificar permissões
      if (userData?.type === 'client') {
        const hasPermission = relatoriosData.some(r => r.clientId === userData.uid);
        if (!hasPermission) {
          toast.error('Você não tem permissão para acessar este relatório');
          navigate('/client-projects');
          return;
        }
      }

      setRelatorios(relatoriosData);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const updateRelatorioItem = async (itemId: string, updates: Partial<RelatorioItem>) => {
    try {
      await RelatorioService.updateRelatorioItem(itemId, updates, userData!.uid);
      toast.success('Item atualizado com sucesso!');
      
      // Recarregar relatórios
      await loadRelatorios();
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast.error('Erro ao atualizar item');
    }
  };

  const handleFieldChange = async (itemId: string, field: keyof RelatorioItem, value: any) => {
    setSaving(true);
    try {
      await updateRelatorioItem(itemId, { [field]: value });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      in_progress: { label: 'Em Andamento', className: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Concluído', className: 'bg-green-100 text-green-800' },
      approved: { label: 'Aprovado', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejeitado', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, className: 'bg-gray-100 text-gray-800' };
    
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getEvaluationBadge = (evaluation: string) => {
    const evaluationConfig = {
      nc: { label: 'NC', className: 'bg-red-100 text-red-800' },
      r: { label: 'R', className: 'bg-yellow-100 text-yellow-800' },
      na: { label: 'NA', className: 'bg-green-100 text-green-800' }
    };

    const config = evaluationConfig[evaluation as keyof typeof evaluationConfig] || { label: evaluation, className: 'bg-gray-100 text-gray-800' };
    
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-versys-primary">
              Editar Relatório
            </h2>
            <p className="text-gray-600 mt-2">
              Adicione informações sobre as adequações realizadas
            </p>
          </div>
        </div>
        
        {saving && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Salvando...</span>
          </div>
        )}
      </div>

      {/* Lista de itens do relatório */}
      <div className="space-y-6">
        {relatorios.map((item) => (
          <Card key={item.id} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span>{item.subItemTitle}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center space-x-4 mt-2">
                    <span className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{item.local}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{item.category}</span>
                    </span>
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(item.status)}
                  {getEvaluationBadge(item.evaluation)}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Situação Atual */}
              <div>
                <Label htmlFor={`situation-${item.id}`} className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <span>Situação Atual</span>
                </Label>
                <Textarea
                  id={`situation-${item.id}`}
                  placeholder="Descreva a situação atual..."
                  value={item.currentSituation || ''}
                  onChange={(e) => handleFieldChange(item.id, 'currentSituation', e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>

              {/* Orientação */}
              <div>
                <Label htmlFor={`guidance-${item.id}`} className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Orientação Recebida</span>
                </Label>
                <Textarea
                  id={`guidance-${item.id}`}
                  placeholder="Orientações recebidas..."
                  value={item.clientGuidance || ''}
                  onChange={(e) => handleFieldChange(item.id, 'clientGuidance', e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>

              {/* Responsável */}
              <div>
                <Label htmlFor={`responsible-${item.id}`} className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span>Responsável pela Adequação</span>
                </Label>
                <Input
                  id={`responsible-${item.id}`}
                  placeholder="Nome do responsável..."
                  value={item.responsible || ''}
                  onChange={(e) => handleFieldChange(item.id, 'responsible', e.target.value)}
                  className="mt-2"
                />
              </div>

              {/* O que foi feito */}
              <div>
                <Label htmlFor={`whatWasDone-${item.id}`} className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>O que foi feito?</span>
                </Label>
                <Textarea
                  id={`whatWasDone-${item.id}`}
                  placeholder="Descreva o que foi realizado para adequação..."
                  value={item.whatWasDone || ''}
                  onChange={(e) => handleFieldChange(item.id, 'whatWasDone', e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>

              {/* O que foi alterado */}
              <div>
                <Label htmlFor={`changesDescription-${item.id}`} className="flex items-center space-x-2">
                  <Edit className="h-4 w-4 text-orange-600" />
                  <span>O que foi alterado?</span>
                </Label>
                <Textarea
                  id={`changesDescription-${item.id}`}
                  placeholder="Descreva as alterações realizadas..."
                  value={item.changesDescription || ''}
                  onChange={(e) => handleFieldChange(item.id, 'changesDescription', e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>

              {/* Prazo para tratar */}
              <div>
                <Label htmlFor={`treatmentDeadline-${item.id}`} className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-red-600" />
                  <span>Prazo para tratar</span>
                </Label>
                <Input
                  id={`treatmentDeadline-${item.id}`}
                  type="date"
                  value={item.treatmentDeadline || ''}
                  onChange={(e) => handleFieldChange(item.id, 'treatmentDeadline', e.target.value)}
                  className="mt-2"
                />
              </div>

              {/* Datas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`startDate-${item.id}`} className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>Data Inicial</span>
                  </Label>
                  <Input
                    id={`startDate-${item.id}`}
                    type="date"
                    value={item.startDate || ''}
                    onChange={(e) => handleFieldChange(item.id, 'startDate', e.target.value)}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor={`endDate-${item.id}`} className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span>Data Final</span>
                  </Label>
                  <Input
                    id={`endDate-${item.id}`}
                    type="date"
                    value={item.endDate || ''}
                    onChange={(e) => handleFieldChange(item.id, 'endDate', e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Status da Adequação */}
              <div>
                <Label htmlFor={`adequacyStatus-${item.id}`} className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Status da Adequação</span>
                </Label>
                <select
                  id={`adequacyStatus-${item.id}`}
                  value={item.adequacyStatus || 'pending'}
                  onChange={(e) => handleFieldChange(item.id, 'adequacyStatus', e.target.value)}
                  className="mt-2 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">Pendente</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="completed">Concluído</option>
                </select>
              </div>

              {/* Detalhes da Adequação */}
              <div>
                <Label htmlFor={`adequacyDetails-${item.id}`} className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span>Detalhes da Adequação</span>
                </Label>
                <Textarea
                  id={`adequacyDetails-${item.id}`}
                  placeholder="Detalhes adicionais sobre a adequação..."
                  value={item.adequacyDetails || ''}
                  onChange={(e) => handleFieldChange(item.id, 'adequacyDetails', e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {relatorios.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum item encontrado
            </h3>
            <p className="text-gray-600">
              Este projeto ainda não possui itens de relatório para editar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientRelatorioEdit;