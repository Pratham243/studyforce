// The StudyForce owl. Moods: neutral, happy, worried, angry, crying, disappointed.

const PALETTE = {
  neutral: { body: '#8A5A3B', belly: '#E9D3B4', face: '#F4E6CF' },
  happy: { body: '#9A6440', belly: '#F2DCBC', face: '#FFF0D9' },
  worried: { body: '#8A5A3B', belly: '#E9D3B4', face: '#F4E6CF' },
  angry: { body: '#9B3B2A', belly: '#E9C1A6', face: '#F6D7C2' },
  crying: { body: '#6E5A73', belly: '#D9CCD9', face: '#ECE3EC' },
  disappointed: { body: '#5E5A57', belly: '#C9C2B8', face: '#DEDAD3' }
};

function Eye({ cx, mood, side }) {
  const cy = 62;
  const pupilR = mood === 'angry' ? 6 : mood === 'worried' ? 5 : mood === 'happy' ? 9 : 8;
  const look = mood === 'disappointed' ? 4 : mood === 'crying' ? 3 : 0;
  return (
    <g>
      <circle cx={cx} cy={cy} r="17" fill="#fff" stroke="#3A2618" strokeWidth="2" />
      {mood === 'happy' ? (
        <path d={`M${cx - 10} ${cy + 3} Q${cx} ${cy - 10} ${cx + 10} ${cy + 3}`} fill="none" stroke="#1B120C" strokeWidth="4" strokeLinecap="round" />
      ) : (
        <g className="blink">
          <circle cx={cx + (side === 'l' ? 2 : -2)} cy={cy + look} r={pupilR} fill="#1B120C" />
          <circle cx={cx + (side === 'l' ? 4 : 0)} cy={cy - 3 + look} r="2.4" fill="#fff" />
        </g>
      )}
      {mood === 'disappointed' && (
        <path d={`M${cx - 17} ${cy} A17 17 0 0 1 ${cx + 17} ${cy} Z`} fill="#BDB5AA" stroke="#3A2618" strokeWidth="2" />
      )}
      {mood === 'crying' && (
        <path d={`M${cx - 17} ${cy - 2} A17 17 0 0 1 ${cx + 17} ${cy - 2} Z`} fill="#CBBFCB" stroke="#3A2618" strokeWidth="2" />
      )}
    </g>
  );
}

function Brows({ mood }) {
  const stroke = { stroke: '#3A2618', strokeWidth: 4, strokeLinecap: 'round', fill: 'none' };
  if (mood === 'angry') return <g {...stroke}><path d="M30 38 L52 48" /><path d="M90 38 L68 48" /></g>;
  if (mood === 'worried' || mood === 'crying') return <g {...stroke}><path d="M32 46 L52 38" /><path d="M88 46 L68 38" /></g>;
  if (mood === 'disappointed') return <g {...stroke}><path d="M30 44 L52 44" /><path d="M68 44 L90 44" /></g>;
  return null;
}

export default function Owl({ mood = 'neutral', size = 120 }) {
  const c = PALETTE[mood] || PALETTE.neutral;
  return (
    <svg className={`owl ${mood}`} width={size} height={size * 1.12} viewBox="0 0 120 134" role="img" aria-label={`Owl looking ${mood}`}>
      <ellipse cx="60" cy="128" rx="34" ry="5" fill="rgba(0,0,0,0.25)" />
      <g className="owl-body">
        {/* ear tufts */}
        <path d="M22 30 L30 6 L44 26 Z" fill={c.body} />
        <path d="M98 30 L90 6 L76 26 Z" fill={c.body} />
        {/* body */}
        <ellipse cx="60" cy="74" rx="44" ry="50" fill={c.body} />
        <ellipse cx="60" cy="92" rx="28" ry="30" fill={c.belly} />
        <g stroke={c.body} strokeWidth="2" fill="none" opacity="0.45">
          <path d="M48 86 q4 4 8 0" /><path d="M62 86 q4 4 8 0" /><path d="M54 98 q4 4 8 0" /><path d="M48 110 q4 4 8 0" /><path d="M62 110 q4 4 8 0" />
        </g>
        {/* wings */}
        <path d={mood === 'happy' ? 'M17 70 Q0 48 8 38 Q22 52 24 76 Z' : 'M18 62 Q6 88 22 108 Q26 86 26 66 Z'} fill={c.body} stroke="#3A2618" strokeWidth="1.5" />
        <path d={mood === 'happy' ? 'M103 70 Q120 48 112 38 Q98 52 96 76 Z' : 'M102 62 Q114 88 98 108 Q94 86 94 66 Z'} fill={c.body} stroke="#3A2618" strokeWidth="1.5" />
        {/* face disc */}
        <path d="M60 36 C40 30 20 40 22 62 C24 82 44 86 60 78 C76 86 96 82 98 62 C100 40 80 30 60 36 Z" fill={c.face} />
        <Eye cx={42} mood={mood} side="l" />
        <Eye cx={78} mood={mood} side="r" />
        <Brows mood={mood} />
        {/* beak */}
        <path d={mood === 'angry' || mood === 'crying' ? 'M53 76 L67 76 L60 88 Z' : 'M54 74 L66 74 L60 86 Z'} fill="#F2A33A" stroke="#7A4A12" strokeWidth="1.5" strokeLinejoin="round" />
        {mood === 'happy' && <g fill="#FF8A8A" opacity="0.55"><circle cx="30" cy="76" r="5" /><circle cx="90" cy="76" r="5" /></g>}
        {mood === 'angry' && <path d="M100 18 l6 -6 m-2 10 l9 -2 m-15 -6 l2 -9" stroke="#E5484D" strokeWidth="3" strokeLinecap="round" />}
        {mood === 'worried' && <path d="M100 30 q4 8 0 12 q-4 -4 0 -12 Z" fill="#7CC4FF" />}
        {mood === 'crying' && (
          <g fill="#7CC4FF">
            <path className="tear" d="M36 80 q4 7 0 10 q-4 -3 0 -10 Z" />
            <path className="tear b" d="M84 80 q4 7 0 10 q-4 -3 0 -10 Z" />
          </g>
        )}
        {/* feet */}
        <g fill="#F2A33A"><path d="M44 120 l-6 6 h16 Z" /><path d="M76 120 l-6 6 h16 Z" /></g>
      </g>
    </svg>
  );
}
