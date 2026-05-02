import React from 'react';
import type { NodeConfig } from '../types/workflow';
interface ConfigPanelProps {
    nodeId: string;
    nodeType: string;
    initialConfig: NodeConfig;
    onSave: (config: NodeConfig) => void;
    onClose: () => void;
}
export declare const ConfigPanel: React.FC<ConfigPanelProps>;
export {};
