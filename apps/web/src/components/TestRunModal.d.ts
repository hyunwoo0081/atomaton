import React from 'react';
interface TestResult {
    status?: string;
    logs?: any[];
    error?: string;
    [key: string]: any;
}
interface TestRunModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRun: (inputData: Record<string, any>) => Promise<TestResult>;
}
export declare const TestRunModal: React.FC<TestRunModalProps>;
export {};
