interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
}
export declare const api: {
    get: <T>(url: string, options?: RequestOptions) => Promise<T>;
    post: <T>(url: string, body: unknown, options?: RequestOptions) => Promise<T>;
    put: <T>(url: string, body: unknown, options?: RequestOptions) => Promise<T>;
    delete: <T>(url: string, options?: RequestOptions) => Promise<T>;
};
export {};
