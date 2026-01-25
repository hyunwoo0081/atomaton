import React from 'react';

interface Log {
  id: string;
  workflowId: string;
  triggerId: string;
  actionId?: string;
  status: 'SUCCESS' | 'FAILURE' | 'SKIPPED' | 'ENQUEUED';
  message: string;
  created_at: string;
}

interface LogTableProps {
  logs: Log[];
}

export const LogTable: React.FC<LogTableProps> = ({ logs }) => {
  return (
    <div className="flex flex-col">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow-2xl overflow-hidden border border-white/10 rounded-[24px] backdrop-blur-xl bg-white/5">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-bold text-white/70 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-bold text-white/70 uppercase tracking-wider"
                  >
                    Message
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-bold text-white/70 uppercase tracking-wider"
                  >
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                          log.status === 'SUCCESS'
                            ? 'bg-[#00F5A0]/20 text-[#00F5A0] border border-[#00F5A0]/30'
                            : log.status === 'FAILURE'
                            ? 'bg-[#FF2E63]/20 text-[#FF2E63] border border-[#FF2E63]/30'
                            : log.status === 'SKIPPED'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/90">
                      {log.message}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-white/50">
                      No logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
