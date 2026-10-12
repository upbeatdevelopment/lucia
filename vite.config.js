// Optional compatibility for an already-running Vite preview, not an app build step.
export default { server: { proxy: { '/api': 'http://127.0.0.1:4173' } } };
