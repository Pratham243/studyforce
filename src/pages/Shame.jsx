import { useSnapshot } from '../lib/useSnapshot';
import Owl from '../components/Owl';

// Rendered off-screen and captured as the shame wallpaper.
export default function Shame() {
  const [snap] = useSnapshot();
  const behind = snap ? snap.totals.left : 0;
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3vh',
      background: 'radial-gradient(circle at 50% 40%, #5A0F16 0%, #1A0507 70%)', color: '#fff', textAlign: 'center'
    }}>
      <Owl mood="crying" size={Math.round(window.innerHeight * 0.22)} />
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '11vh', letterSpacing: '-0.02em', lineHeight: 1 }}>
        GET BACK TO WORK
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '3vh', opacity: 0.85 }}>
        Streak: 0 · {behind} tasks waiting · StudyForce is watching
      </div>
    </div>
  );
}
