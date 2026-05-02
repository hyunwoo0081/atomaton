import React from 'react';
interface BaseNodeProps {
    id: string;
    label: string;
    icon?: React.ReactNode;
    isValid?: boolean;
    selected?: boolean;
    children?: React.ReactNode;
}
export declare const BaseNode: React.FC<BaseNodeProps>;
export {};
