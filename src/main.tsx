import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './styles/dashboard.css';
import './styles/trainer.css';
import './styles/browse.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

createRoot(container).render(<App />);
