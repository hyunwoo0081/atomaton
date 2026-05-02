import React from 'react';
interface NodeSelectionModalProps {
    isOpen: boolean;
    position: {
        x: number;
        y: number;
    };
    onClose: () => void;
    onSelect: (type: string) => void;
}
export declare const NodeSelectionModal: React.FC<NodeSelectionModalProps>;
export {};
