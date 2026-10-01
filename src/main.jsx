import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.jsx';
import Widget from './pages/Widget.jsx';
import Alert from './pages/Alert.jsx';
import Overlay from './pages/Overlay.jsx';
import Shame from './pages/Shame.jsx';

// Each Electron window loads the same bundle with a different hash route.
const [route, query = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
const params = new URLSearchParams(query);
const views = { widget: Widget, alert: Alert, overlay: Overlay, shame: Shame };
const View = views[route] || App;
if (route && route !== 'shame') document.body.classList.add('transparent');

createRoot(document.getElementById('root')).render(<View params={params} />);
