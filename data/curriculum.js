// Seed curriculum loaded on first run.
//
// AI course: Apna College, Sections 34–62 (the sections still ahead).
// German: Goethe C1 track in three phases (A2 → B1 → B2 → C1), 625 hours.
// Weights set each track's share of the overall daily score.
//
// Shape: [title, difficulty: 'EASY' | 'MEDIUM' | 'HARD', topics: [string], options]
// A topic can override its section difficulty with a trailing " [HARD]" etc.
// Sections with { optional: true } can be checked off but never count toward
// daily quotas, progress or projected finish dates.

const lessons = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix} · Lesson ${i + 1}`);
const OPTIONAL = { optional: true };

const aiSections = [
  ['Section 34: Supervised ML (Part 6)', 'MEDIUM', [
    'AdaBoost', 'XGBoost', 'Gradient Boosting', 'Boosting Wrap-up'
  ]],
  ['Section 35: Unsupervised ML (Part 1)', 'MEDIUM', [
    'K-Means', 'Elbow Method', 'Silhouette Score', 'Clustering', 'Hierarchical Clustering', 'Dendrogram',
    'Agglomerative Clustering', 'Clustering Project'
  ]],
  ['Section 36: Unsupervised ML (Part 2)', 'HARD', [
    'PCA intro', 'PCA math', 'Dimensionality Reduction', 'DBSCAN intro', 'DBSCAN implementation', 'Anomaly Detection',
    'Feature Encoding (One-Hot)', 'Feature Encoding (Label/Ordinal)', 'Feature Scaling', 'Feature Selection',
    'Feature Engineering', 'Unsupervised ML Wrap-up'
  ]],
  ['Section 37: Unsupervised ML / Project', 'MEDIUM', [
    'Customer Profiling intro', 'Data Preparation', 'EDA', 'Clustering Analysis', 'Project Wrap-up'
  ]],
  ['Section 38: Linux & Terminal', 'EASY', [
    'Terminal intro', 'Directories', 'File operations', 'Flags', 'Permissions', 'Grep/Find', 'Piping', 'Linux wrap-up'
  ]],
  ['Section 39: Git & GitHub', 'EASY', [
    'Git intro', 'Init/Add/Commit', 'Branches', 'Merge', 'Remote repos', 'Push/Pull', 'Forking', 'Pull Requests',
    'Merge Conflicts', 'Git wrap-up'
  ]],
  ['Section 40: Deep Learning (Part 1)', 'MEDIUM', [
    'ANN introduction', 'Perceptrons', 'Activation Functions', 'Multi-layer Networks', 'Forward Propagation intro',
    'DL Part 1 wrap-up'
  ]],
  ['Section 41: Deep Learning (Part 2)', 'HARD', [
    'Forward Propagation', 'Backward Propagation', 'Loss Functions (Regression)', 'Loss Functions (Classification)',
    'Vanishing Gradient Problem', 'ReLU & variants', 'Weight Initialization', 'DL Part 2 wrap-up'
  ]],
  ['Section 42: Deep Learning (Part 3)', 'HARD', [
    'Optimizers intro', 'SGD', 'Momentum', 'Adam', 'Regularization', 'Dropout', 'Batch Normalization', 'DL Part 3 wrap-up'
  ]],
  ['Section 43: Deep Learning (Part 4)', 'HARD', [
    'Training ANN', 'Hyperparameter Tuning', 'Saving/Loading Models', 'Classification Project', 'Regression Project',
    'DL Part 4 wrap-up'
  ]],
  ['Section 44: Deep Learning (Part 5 — CNNs)', 'HARD', [
    'CNN intro', 'Convolution Layer', 'Pooling', 'Fully Connected Layer', 'CNN Architecture', 'Image Classification Project',
    'DL Part 5 wrap-up'
  ]],
  ['Section 45: Deep Learning (Part 6 — RNN/LSTM)', 'HARD', [
    'Text Processing', 'TF-IDF', 'RNN Architecture', 'Vanishing Gradient in RNN', 'LSTM intro', 'LSTM Gates',
    'Backpropagation in RNN', 'DL Part 6 wrap-up'
  ]],
  ['Section 46: Reinforcement Learning (Part 1)', 'HARD', [
    'RL intro', 'MDP', 'RL Components', 'Reward', 'Policy', 'Value Functions', 'Q-Functions', 'Exploration vs Exploitation',
    'RL Part 1 wrap-up'
  ]],
  ['Section 47: Reinforcement Learning (Part 2)', 'HARD', [
    'TD Learning', 'SARSA intro', 'SARSA algorithm', 'Q-Learning intro', 'Q-Learning algorithm', 'Cliff-Walking Problem',
    'On-policy vs Off-policy', 'RL Part 2 wrap-up'
  ]],
  ['Section 48: Reinforcement Learning (Part 3)', 'HARD', [
    'SARSA Implementation', 'Grid World', 'Agent Training', 'Agent Evaluation', 'Q-Learning Implementation', 'Comparison',
    'RL Part 3 wrap-up'
  ]],
  ['Section 49: Reinforcement Learning (Part 4 — DQN)', 'HARD', [
    'Deep RL intro', 'DQN', 'Experience Replay', 'Target Network', 'Policy Network', 'Flappy Bird Project', 'DQN Training',
    'RL Part 4 wrap-up'
  ]],
  ['Section 50: Deep Learning (Part 7 — GenAI & LLMs)', 'MEDIUM', [
    'GenAI intro', 'LLMs intro', 'Transformer overview', 'Word Embeddings', 'Contextual Embeddings', 'GPT Architecture',
    'BERT overview', 'DL Part 7 wrap-up'
  ]],
  ['Section 51: Deep Learning (Part 8 — Transformer Architecture)', 'HARD', [
    'Self-Attention', 'Multi-Head Attention', 'Positional Encoding', 'Residual Connections', 'Layer Normalization',
    'Cross-Attention', 'Decoder', 'DL Part 8 wrap-up'
  ]],
  ['Section 52: HuggingFace & NLP Project + Deployment', 'HARD', [
    'HuggingFace intro', 'Fine-tuning Transformer', 'Text Summarization', 'NLP Pipeline', 'FastAPI intro', 'API Deployment',
    'HTML/JS Frontend', 'Full-stack Integration', 'Project wrap-up'
  ]],
  ['Section 53: CSS — Part 1', 'EASY', lessons('CSS Part 1', 14), OPTIONAL],
  ['Section 54: CSS — Part 2', 'EASY', lessons('CSS Part 2', 12), OPTIONAL],
  ['Section 55: Deep Learning (Part 9 — RAG)', 'MEDIUM', [
    'RAG intro', 'RAG Pipeline', 'LangChain intro', 'Document Ingestion', 'Vector Store', 'Retrieval Chain',
    'GPT Integration', 'Groq Integration', 'RAG Project', 'DL Part 9 wrap-up'
  ]],
  ['Section 56: Deep Learning (Part 10)', 'MEDIUM', [
    'Fine-tuning LLMs', 'LoRA', 'QLoRA', 'Advanced LLM Topics', 'DL Part 10 wrap-up'
  ]],
  ['Section 57: OpenAI APIs', 'EASY', [
    'Responses API', 'API Parameters', 'Text Generation', 'System/User/Assistant Roles', 'Structured Output',
    'Function Calling', 'APIs wrap-up'
  ]],
  ['Section 58: CSS — Part 3', 'EASY', lessons('CSS Part 3', 10), OPTIONAL],
  ['Section 59: CSS — Part 4', 'EASY', lessons('CSS Part 4', 8), OPTIONAL],
  ['Section 60: Working with Flask', 'MEDIUM', [
    'Flask intro', 'Routes', 'Templates', 'Jinja2', 'Forms', 'Query Strings', 'POST/GET', 'Flask Project', 'Flask wrap-up'
  ]],
  ['Section 61: Deep Learning (Part 11 — GANs)', 'HARD', [
    'GAN intro', 'Generator', 'Discriminator', 'Training GANs', 'DCGAN', 'CelebA Dataset', 'GAN Project', 'DL Part 11 wrap-up'
  ]],
  ['Section 62: Agentic AI', 'MEDIUM', [
    'Agentic AI intro', 'Agent Frameworks', 'Agno Framework', 'Finance Agent', 'Multi-Agent Teams', 'Agent Memory',
    'YouTube Agent', 'Agent Deployment', 'Advanced Agents', 'Course Finale'
  ]]
];

// German A2 → C1 (Goethe-Zertifikat C1). Topics are grouped into three
// phases; each phase needs its topics done + minimum hours + a passed mock exam.
const germanPhases = [
  {
    n: 1, title: 'Phase 1: A2 → B1', level: 'B1', hours: 150,
    source: 'Grammatik aktiv, Chapters 49–80', exam: 'Goethe B1 Mock Exam',
    sections: [
      ['Verben 3 (Verbs Advanced)', 'MEDIUM', [
        'Konjunktiv II (wishes, polite requests)', 'Passiv (Vorgangspassiv: werden + Partizip II)', 'Passiv with modal verbs',
        'Verben mit Präpositionen (verbs with fixed prepositions)', 'Reflexive Verben & Reziproke Verben'
      ]],
      ['Nomen & Artikel 2 (Nouns Advanced)', 'MEDIUM', [
        'n-Deklination (weak nouns)', 'Genitivattribute (possession with Genitiv)',
        'Relativsätze (relative clauses with der/die/das)', 'Relativpronomen im Genitiv (dessen/deren)'
      ]],
      ['Sätze verbinden 2 (Linking Sentences)', 'MEDIUM', [
        'Zweiteilige Konnektoren (nicht nur...sondern auch, sowohl...als auch)',
        'Kausale/konzessive Konnektoren (obwohl, trotzdem, deshalb)',
        'Temporale Nebensätze (als, wenn, bevor, nachdem, seit)', 'Finalsätze (um...zu, damit)', 'Indirekte Fragen (ob, W-Wort)'
      ]],
      ['Präpositionen 2 (Prepositions Advanced)', 'MEDIUM', [
        'Präpositionen mit Genitiv (wegen, trotz, während)', 'Lokale Präpositionen (entlang, gegenüber, durch)',
        'Feste Wendungen mit Präpositionen', 'Pronominaladverbien (darauf, dafür, worauf, wofür)'
      ]],
      ['Adjektive 2 (Adjectives Advanced)', 'MEDIUM', [
        'Adjektivdeklination nach Nullartikel', 'Partizip I und II als Adjektive',
        'Adjektive mit Präpositionen (stolz auf, zufrieden mit)', 'Komparation im Satz (je...desto)'
      ]],
      ['Wortbildung 2 (Word Formation)', 'EASY', [
        'Nominalisierung (verbs/adjectives → nouns)', 'Vorsilben bei Verben (ver-, be-, ent-, er-, zer-)',
        'Nachsilben (-ung, -keit, -heit, -tion, -lich, -bar)'
      ]],
      ['B1 Sprechen & Schreiben (Speaking & Writing)', 'MEDIUM', [
        'Meinung äußern (expressing opinions)', 'Beschwerdebrief / formeller Brief',
        'Diskussion & Argumentation (Redemittel)', 'Bildbeschreibung (picture description for exam)'
      ]],
      ['B1 Lesen & Hören (Reading & Listening)', 'EASY', [
        'Nachrichtenleicht articles (simplified news)', 'DW Top-Thema comprehension', 'Listening strategies for Goethe B1'
      ]]
    ]
  },
  {
    n: 2, title: 'Phase 2: B1 → B2', level: 'B2', hours: 225,
    source: 'Claude-written grammar explanations', exam: 'Goethe B2 Mock Exam',
    sections: [
      ['Konjunktiv I & Indirekte Rede', 'HARD', [
        'Konjunktiv I Bildung (formation)', 'Indirekte Rede in der Presse (reported speech)', 'Konjunktiv I vs II Unterschiede'
      ]],
      ['Nominalstil (Nominal Style)', 'HARD', [
        'Verbal → Nominal Umformung', 'Funktionsverbgefüge (geben → Auskunft geben)',
        'Nominalstil in Fachtexten (academic/formal style)'
      ]],
      ['Erweiterte Partizipialattribute', 'HARD', [
        'Partizip I Attribute (die in Berlin lebende Frau)', 'Partizip II Attribute (das gestern gelesene Buch)'
      ]],
      ['Komplexe Satzstrukturen', 'HARD', [
        'Infinitivkonstruktionen (ohne...zu, statt...zu)', 'Subjektlose Passivsätze (Es wird getanzt)',
        'Modalsätze (indem, dadurch dass)', 'Konsekutivsätze (so...dass, sodass)'
      ]],
      ['B2 Textkompetenz', 'MEDIUM', [
        'Zusammenfassung schreiben (text summary)', 'Erörterung (argumentative essay)',
        'Grafik/Diagramm beschreiben (chart description)', 'Formelle E-Mail / Geschäftsbrief'
      ]],
      ['B2 Wortschatz & Register', 'MEDIUM', [
        'Redewendungen & Kollokationen', 'Formal vs informal register', 'Fachsprache: Wirtschaft, Technik, Wissenschaft'
      ]]
    ]
  },
  {
    n: 3, title: 'Phase 3: B2 → C1', level: 'C1', hours: 250,
    source: 'Real German press + Claude exercises', exam: 'Goethe C1 Mock Exam',
    sections: [
      ['C1 Grammatik-Feinheiten', 'HARD', [
        'Modalpartikeln (doch, mal, ja, halt, eben)', 'Nomen-Verb-Verbindungen (C1 level)', 'Konnektoren-Übersicht (full connector map)'
      ]],
      ['C1 Lesen & Medien', 'MEDIUM', [
        'Die Zeit / Spiegel articles (real press)', 'Literarische Texte (short literary excerpts)',
        'Wissenschaftliche Texte (academic reading)', 'Podcast/Audio comprehension (advanced)'
      ]],
      ['C1 Schreiben', 'HARD', [
        'Stellungnahme (position paper)', 'Freies Schreiben / Kreatives Schreiben', 'Textoptimierung (revising own writing)'
      ]],
      ['C1 Sprechen', 'HARD', [
        'Vortrag halten (giving a presentation)', 'Diskussion führen (leading a debate)', 'Spontanes Sprechen (impromptu speaking)'
      ]]
    ]
  }
];

const germanSections = germanPhases.flatMap((p) => p.sections.map(([title, difficulty, topics]) => ({ title, difficulty, topics, phase: p.n })));
const germanMeta = {
  target: 'Goethe-Zertifikat C1',
  startDate: '2026-10-02',
  phases: germanPhases.map(({ sections, ...p }) => p)
};

const toSections = (list) => list.map(([title, difficulty, topics, opts = {}]) => ({ title, difficulty, topics, optional: !!opts.optional }));

// Bump when the seed changes; untouched tracks in existing databases are re-seeded.
const VERSION = 3;

module.exports = {
  version: VERSION,
  tracks: [
    {
      id: 'ai', name: 'AI Course', kind: 'topics', pace: 'normal', deadline: '14:00',
      weight: 0.35, color: '#E85D1F', sections: toSections(aiSections)
    },
    {
      id: 'german', name: 'German', kind: 'phased', pace: 'normal', deadline: '20:00', weight: 0.3,
      startDate: germanMeta.startDate, meta: germanMeta, color: '#3BA7FF', sections: germanSections
    },
    {
      id: 'apps', name: 'Job Applications', kind: 'count', dailyTarget: 5, deadline: '23:00', weight: 0.35,
      color: '#2FBF71', sections: []
    }
  ]
};
