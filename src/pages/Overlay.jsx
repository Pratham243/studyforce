import { useSnapshot } from '../lib/useSnapshot';
import Owl from '../components/Owl';

// Level 2 translucent strip across the bottom of the screen (click-through).
export default function Overlay() {
  const [snap] = useSnapshot();
  if (!snap) return null;
  const pending = snap.tracks.filter((t) => t.left > 0);
  return (
    <div className="overlay-strip">
      <Owl mood="angry" size={90} />
      <div>
        <h1>FINISH YOUR TASKS</h1>
        <div style={{ fontSize: '2.4vh', fontWeight: 600 }}>
          {pending.map((t) => `${t.name}: ${t.left} left`).join('   ·   ')}
        </div>
      </div>
    </div>
  );
}
