// Seed curriculum loaded on first run.
//
// AI course: Apna College, Sections 34–62 (the sections still ahead).
// German: diagnostic + three phases, A2 → B1 → B2 → C1.
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

const germanSections = [
  ['Diagnostic: Einstufung', 'EASY', [
    'Einstufungstest Grammatik', 'Einstufungstest Lesen und Hören', 'Schreibprobe', 'Sprechprobe', 'Lernplan erstellen'
  ]],
  // Phase 1 — A2 → B1
  ['B1 Grammatik', 'MEDIUM', [
    'Perfekt vs Präteritum', 'Präteritum der Modalverben', 'Nebensätze mit weil, dass, wenn',
    'Nebensätze mit obwohl, damit, als', 'Relativsätze im Nominativ und Akkusativ', 'Relativsätze im Dativ',
    'Reflexive Verben', 'Verben mit Präpositionen', 'Wechselpräpositionen', 'Komparativ und Superlativ',
    'Adjektivdeklination', 'Konjunktiv II: würde, hätte, wäre', 'Indirekte Fragen', 'Futur I',
    'Infinitiv mit zu', 'Passiv Präsens', 'Genitiv', 'Temporale Präpositionen'
  ]],
  ['B1 Lesen', 'EASY', [
    'Alltagstexte und Anzeigen', 'E-Mails und Briefe', 'Kurze Zeitungsartikel', 'Meinungstexte im Forum', 'Kurzgeschichten'
  ]],
  ['B1 Hören', 'MEDIUM', [
    'Durchsagen und Ansagen', 'Alltagsgespräche', 'Radiointerviews', 'Telefonnachrichten', 'Podcasts für Lernende'
  ]],
  ['B1 Schreiben', 'MEDIUM', [
    'Persönliche E-Mail', 'Halbformelle E-Mail', 'Forumsbeitrag mit Meinung', 'Bitte und Entschuldigung'
  ]],
  ['B1 Sprechen', 'MEDIUM', [
    'Gemeinsam etwas planen', 'Ein Thema präsentieren', 'Über eine Präsentation sprechen', 'Sich vorstellen und Small Talk'
  ]],
  // Phase 2 — B1 → B2
  ['B2 Grammatik', 'HARD', [
    'Passiv in allen Zeiten', 'Passiv mit Modalverben', 'Zustandspassiv', 'Konjunktiv II der Vergangenheit',
    'Konjunktiv I und indirekte Rede', 'Plusquamperfekt', 'Temporale Nebensätze (nachdem, bevor, seitdem)',
    'Konzessive Sätze (obwohl, trotzdem, dennoch)', 'Zweiteilige Konnektoren (sowohl … als auch, weder … noch)',
    'Partizip I und II als Adjektiv', 'Nominalisierung von Verben', 'Präpositionen mit Genitiv',
    'n-Deklination', 'Modalverben subjektiv', 'Futur II', 'Verben mit festen Präpositionen II'
  ]],
  ['B2 Lesen', 'MEDIUM', [
    'Sachtexte und Berichte', 'Kommentare und Leserbriefe', 'Anleitungen und Regeln', 'Texte mit Meinungen vergleichen',
    'Lückentexte (Sprachbausteine)'
  ]],
  ['B2 Hören', 'HARD', [
    'Nachrichten und Reportagen', 'Diskussionsrunden', 'Vorträge verstehen', 'Interviews mit Expert:innen', 'Hörspiele'
  ]],
  ['B2 Schreiben', 'HARD', [
    'Formelle Beschwerde', 'Forumsbeitrag argumentativ', 'Bewerbungsschreiben', 'Erörterung', 'Zusammenfassung schreiben'
  ]],
  ['B2 Sprechen', 'HARD', [
    'Vortrag mit Folien', 'Argumentieren und Diskutieren', 'Gemeinsam eine Lösung finden', 'Meinung äußern und begründen'
  ]],
  // Phase 3 — B2 → C1
  ['C1 Grammatik', 'HARD', [
    'Erweiterte Partizipialattribute', 'Nominalstil vs Verbalstil', 'Konnektoren für komplexe Sätze',
    'Konjunktiv I in Medientexten', 'Modalpartikeln', 'Funktionsverbgefüge', 'Passiversatzformen',
    'Subjektive Modalverben in der Vergangenheit', 'Wortbildung: Präfixe und Suffixe', 'Satzbau und Informationsstruktur',
    'Irreale Vergleichssätze (als ob)', 'Feste Redewendungen'
  ]],
  ['C1 Hören', 'HARD', [
    'Wissenschaftliche Vorträge', 'Radiofeatures', 'Diskussionen mit mehreren Sprecher:innen', 'Implizite Aussagen erkennen', 'Dialekte und Umgangssprache'
  ]],
  ['C1 Lesen', 'HARD', [
    'Lange Sachtexte überfliegen', 'Argumentationsstruktur analysieren', 'Die Zeit / Spiegel articles (real press)',
    'Literarische Texte (short literary excerpts)', 'Wissenschaftliche Texte (academic reading)',
    'Podcast/Audio comprehension (advanced)'
  ]],
  ['C1 Schreiben', 'HARD', [
    'Stellungnahme (position paper)', 'Freies Schreiben / Kreatives Schreiben', 'Textoptimierung (revising own writing for style)'
  ]],
  ['C1 Sprechen', 'HARD', [
    'Vortrag halten (giving a presentation)', 'Diskussion führen (leading a discussion, debate)',
    'Spontanes Sprechen (impromptu speaking practice)'
  ]]
];

const toSections = (list) => list.map(([title, difficulty, topics, opts = {}]) => ({ title, difficulty, topics, optional: !!opts.optional }));

// Bump when the seed changes; untouched tracks in existing databases are re-seeded.
const VERSION = 2;

module.exports = {
  version: VERSION,
  tracks: [
    {
      id: 'ai', name: 'AI Course', kind: 'topics', pace: 'normal', deadline: '14:00',
      color: '#E85D1F', sections: toSections(aiSections)
    },
    {
      id: 'german', name: 'German', kind: 'topics', pace: 'normal', deadline: '20:00',
      color: '#3BA7FF', sections: toSections(germanSections)
    },
    {
      id: 'apps', name: 'Job Applications', kind: 'count', dailyTarget: 5, deadline: '23:00',
      color: '#2FBF71', sections: []
    }
  ]
};
