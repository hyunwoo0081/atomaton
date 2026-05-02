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
export declare const LogTable: React.FC<LogTableProps>;
export {};
