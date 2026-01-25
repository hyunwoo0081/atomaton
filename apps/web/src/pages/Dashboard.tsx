import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@atomaton/ui';
import { api } from '../utils/api';
import { LogTable } from '../components/LogTable';
import { useQuery } from '@tanstack/react-query';

interface Workflow {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface Log {
  id: string;
  workflowId: string;
  triggerId: string;
  actionId?: string;
  status: 'SUCCESS' | 'FAILURE' | 'SKIPPED' | 'ENQUEUED';
  message: string;
  created_at: string;
}

export const Dashboard: React.FC = () => {
  const { data: workflows = [], isLoading: isLoadingWorkflows } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => api.get<Workflow[]>('/workflows'),
  });

  const { data: logsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['logs'],
    queryFn: () => api.get<{ logs: Log[] }>('/logs?limit=10'),
  });

  const logs = logsData?.logs || [];
  const isLoading = isLoadingWorkflows || isLoadingLogs;

  const createWorkflow = async () => {
    const name = prompt('Enter workflow name:');
    if (!name) return;

    try {
      await api.post('/workflows', { name });
      window.location.reload(); 
    } catch (error) {
      console.error('Failed to create workflow:', error);
      alert('Failed to create workflow');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-white">Loading...</div>;
  }

  return (
    <div className="space-y-12">
      <section>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Workflows</h1>
          <Button onClick={createWorkflow}>+ New Workflow</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow) => (
            <Link key={workflow.id} to={`/workflow/${workflow.id}`} className="block group">
              <Card className="h-full transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_0_30px_rgba(138,63,252,0.2)]">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{workflow.name}</h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        workflow.is_active 
                          ? 'bg-[#00F5A0]/20 text-[#00F5A0] border-[#00F5A0]/30' 
                          : 'bg-white/10 text-white/50 border-white/20'
                      }`}
                    >
                      {workflow.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <span className="text-sm text-white/40 font-mono">
                    {new Date(workflow.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
          
          {workflows.length === 0 && (
            <div className="col-span-full text-center py-12 text-white/50 border border-dashed border-white/10 rounded-3xl">
              No workflows found. Create your first one!
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
        <LogTable logs={logs} />
      </section>
    </div>
  );
};
