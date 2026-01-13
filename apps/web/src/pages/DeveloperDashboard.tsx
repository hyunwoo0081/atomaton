import React, { useEffect, useState } from 'react';
import { Card } from '@atomaton/ui';
import { api } from '../utils/api';

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
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await api.get<SystemStats>('/admin/stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading stats...</div>;
  }

  if (!stats) {
    return <div className="p-8">Failed to load stats.</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Developer Dashboard</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="text-sm font-medium text-gray-500">Total Users</div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">{stats.overview.totalUsers}</div>
        </Card>
        <Card>
          <div className="text-sm font-medium text-gray-500">Total Workflows</div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">{stats.overview.totalWorkflows}</div>
        </Card>
        <Card>
          <div className="text-sm font-medium text-gray-500">Active Workflows</div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">{stats.overview.activeWorkflows}</div>
        </Card>
        <Card>
          <div className="text-sm font-medium text-gray-500">Success Rate</div>
          <div className="mt-2 text-3xl font-semibold text-green-600">{stats.overview.successRate}</div>
        </Card>
      </div>

      {/* Problematic Workflows */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Top Failing Workflows</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {stats.problematicWorkflows.map((workflow) => (
              <li key={workflow.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-indigo-600 truncate">{workflow.name}</p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        {workflow.failureCount} Failures
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        ID: {workflow.id}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {stats.problematicWorkflows.length === 0 && (
              <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                No problematic workflows found.
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
};
