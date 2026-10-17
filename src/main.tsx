import { createRoot } from 'react-dom/client';
import { installUniversalBackendInterceptor } from './services/universalBackend';
import App from './App.tsx';
import './index.css';

// Initialize universal API interceptor before rendering so Vercel static deployments never hit 404 JSON errors
installUniversalBackendInterceptor();

createRoot(document.getElementById('root')!).render(<App />);
