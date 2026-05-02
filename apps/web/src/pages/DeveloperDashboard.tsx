import React from 'react';
import { Card } from '@atomaton/ui';
import { api } from '../utils/api';
import { useQuery } from '@tanstack/react-query';

interface SystemStats {
  overview: {
    totalUsers: number;
    totalWorkflows: number;
    activeWorkflows: number;
    successRate: string;
  };
  problematicWorkflows: {
    id: string;
    name: string;
    failureCount: number;
  }[];
}

export const DeveloperDashboard: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery<SystemStats>({
    queryKey: ['systemStats'],
    queryFn: () => api.get<SystemStats>('/admin/stats'),
  });

  if (isLoading) {
    return <div className="p-8 text-white">Loading stats...</div>;
  }

  if (error || !stats) {
    const message = error instanceof Error ? error.message : 'Failed to load stats';
    return <div className="p-8 text-red-500">{message}</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-white">Developer Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="text-sm font-medium text-white/50">Total Users</div>
          <div className="mt-2 text-3xl font-bold text-white">{stats.overview.totalUsers}</div>
        </Card>
        <Card>
          <div className="text-sm font-medium text-white/50">Total Workflows</div>
          <div className="mt-2 text-3xl font-bold text-white">{stats.overview.totalWorkflows}</div>
        </Card>
        <Card>
          <div className="text-sm font-medium text-white/50">Active Workflows</div>
          <div className="mt-2 text-3xl font-bold text-white">{stats.overview.activeWorkflows}</div>
        </Card>
        <Card>
          <div className="text-sm font-medium text-white/50">Success Rate</div>
          <div className="mt-2 text-3xl font-bold text-[#00F5A0]">{stats.overview.successRate}</div>
        </Card>
      </div>

      <section>
        <h2 className="text-xl font-bold text-white mb-4">Top Failing Workflows</h2>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <ul className="divide-y divide-white/5">
            {stats.problematicWorkflows.map((workflow) => (
              <li key={workflow.id} className="hover:bg-white/5 transition-colors">
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-[#8A3FFC] truncate">{workflow.name}</p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full bg-[#FF2E63]/20 text-[#FF2E63] border border-[#FF2E63]/30">
                        {workflow.failureCount} Failures
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-white/30 font-mono">ID: {workflow.id}</p>
                  </div>
                </div>
              </li>
            ))}
            {stats.problematicWorkflows.length === 0 && (
              <li className="px-6 py-8 text-center text-white/30 italic text-sm">
                No problematic workflows found.
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
};
