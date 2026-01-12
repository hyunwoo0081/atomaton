import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@atomaton/ui';
import { api } from '../utils/api';
import { LogTable } from '../components/LogTable';

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
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [workflowsData, logsResponse] = await Promise.all([
        api.get<Workflow[]>('/workflows'),
        api.get<{ logs: Log[] }>('/logs?limit=10'),
      ]);
      setWorkflows(workflowsData);
      setLogs(logsResponse.logs);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWorkflow = async () => {
    const name = prompt('Enter workflow name:');
    if (!name) return;

    try {
      await api.post('/workflows', { name });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Failed to create workflow:', error);
      alert('Failed to create workflow');
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      <section>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
          <Button onClick={createWorkflow}>+ New Workflow</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow) => (
            <Link key={workflow.id} to={`/workflow/${workflow.id}`} className="block">
              <Card className="hover:shadow-lg transition-shadow duration-200 h-full">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{workflow.name}</h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        workflow.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {workflow.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(workflow.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
          
          {workflows.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No workflows found. Create your first one!
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
        <LogTable logs={logs} />
      </section>
    </div>
  );
};
