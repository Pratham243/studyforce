// Seed curriculum loaded on first run.
//
// The AI course list is a stand-in for Sections 34–62 of your course: the spec
// this was built from didn't include the real titles. Replace the sections
// below with your course's real ones (keep the same shape), or use
// Import → PDF in the app to load them from your course PDF.
//
// Shape: { title, difficulty: 'EASY' | 'MEDIUM' | 'HARD', topics: [string] }
// A topic can override its section difficulty with a trailing " [HARD]" etc.

const aiSections = [
  ['Section 34: Neural Network Foundations', 'MEDIUM', [
    'Perceptron and the biological neuron', 'Activation functions', 'Forward propagation',
    'Loss functions for regression and classification', 'Gradient descent intuition',
    'Backpropagation step by step [HARD]', 'Building a network from scratch in NumPy'
  ]],
  ['Section 35: Training Deep Networks', 'MEDIUM', [
    'Mini-batch and stochastic gradient descent', 'Momentum, RMSProp and Adam',
    'Learning rate schedules', 'Weight initialization', 'Vanishing and exploding gradients',
    'Batch normalization', 'Debugging training curves'
  ]],
  ['Section 36: Regularization', 'MEDIUM', [
    'Bias–variance trade-off', 'L1 and L2 regularization', 'Dropout', 'Early stopping',
    'Data augmentation', 'Hyperparameter tuning strategies'
  ]],
  ['Section 37: PyTorch Essentials', 'EASY', [
    'Tensors and operations', 'Autograd', 'nn.Module and layers', 'Datasets and DataLoaders',
    'Training loop template', 'Saving and loading models', 'GPU training'
  ]],
  ['Section 38: TensorFlow & Keras', 'EASY', [
    'Keras Sequential API', 'Functional API', 'Callbacks', 'tf.data pipelines',
    'Custom training loops', 'TensorBoard'
  ]],
  ['Section 39: Convolutional Neural Networks', 'HARD', [
    'Convolution and filters', 'Padding, stride and pooling', 'LeNet and AlexNet',
    'VGG and deeper networks', 'Building a CNN image classifier', 'Visualizing feature maps',
    'CNN project: CIFAR-10'
  ]],
  ['Section 40: Modern CNN Architectures', 'HARD', [
    'Inception modules', 'ResNet and skip connections', 'DenseNet', 'MobileNet and EfficientNet',
    'Choosing an architecture', 'Benchmarking models'
  ]],
  ['Section 41: Transfer Learning', 'MEDIUM', [
    'Why transfer learning works', 'Feature extraction', 'Fine-tuning pretrained models',
    'Transfer learning with small datasets', 'Model hubs', 'Transfer learning project',
    'Domain adaptation basics'
  ]],
  ['Section 42: Object Detection', 'HARD', [
    'Bounding boxes and IoU', 'R-CNN family', 'YOLO', 'SSD', 'Non-max suppression',
    'Training a detector on custom data'
  ]],
  ['Section 43: Image Segmentation', 'HARD', [
    'Semantic vs instance segmentation', 'Fully convolutional networks', 'U-Net', 'Mask R-CNN',
    'Segmentation metrics', 'Segmentation project'
  ]],
  ['Section 44: Recurrent Neural Networks', 'HARD', [
    'Sequence data', 'Vanilla RNNs', 'Backpropagation through time', 'LSTM', 'GRU',
    'Bidirectional and stacked RNNs', 'Time-series forecasting with RNNs'
  ]],
  ['Section 45: NLP Fundamentals', 'MEDIUM', [
    'Text preprocessing and tokenization', 'Bag of words and TF-IDF', 'N-gram language models',
    'Text classification', 'Named entity recognition', 'Sentiment analysis project',
    'Evaluation metrics for NLP'
  ]],
  ['Section 46: Word Embeddings', 'MEDIUM', [
    'Distributed representations', 'Word2Vec', 'GloVe', 'FastText', 'Visualizing embeddings',
    'Using pretrained embeddings'
  ]],
  ['Section 47: Sequence-to-Sequence & Attention', 'HARD', [
    'Encoder–decoder architecture', 'Machine translation with seq2seq', 'Attention mechanism',
    'Bahdanau vs Luong attention', 'Beam search', 'Seq2seq project', 'BLEU score'
  ]],
  ['Section 48: Transformers', 'HARD', [
    'Self-attention', 'Multi-head attention', 'Positional encoding', 'The Transformer block',
    'Implementing a Transformer from scratch', 'Training tricks for Transformers',
    'Efficient attention variants'
  ]],
  ['Section 49: Pretrained Language Models', 'HARD', [
    'BERT and masked language modelling', 'GPT and autoregressive models', 'T5 and encoder–decoder LMs',
    'Hugging Face Transformers library', 'Fine-tuning BERT for classification',
    'Tokenizers: BPE and WordPiece'
  ]],
  ['Section 50: Large Language Models', 'HARD', [
    'Scaling laws', 'Instruction tuning', 'RLHF overview', 'Prompt engineering',
    'Parameter-efficient fine-tuning (LoRA)', 'Evaluating LLMs', 'Running LLMs locally'
  ]],
  ['Section 51: Retrieval-Augmented Generation', 'MEDIUM', [
    'Why RAG', 'Embeddings and vector databases', 'Chunking strategies', 'Building a RAG pipeline',
    'Re-ranking', 'Evaluating RAG systems', 'RAG project: document Q&A'
  ]],
  ['Section 52: Autoencoders', 'MEDIUM', [
    'Undercomplete autoencoders', 'Denoising autoencoders', 'Sparse autoencoders',
    'Anomaly detection with autoencoders', 'Variational autoencoders [HARD]', 'Latent space exploration'
  ]],
  ['Section 53: Generative Adversarial Networks', 'HARD', [
    'GAN intuition', 'Generator and discriminator', 'Training instability', 'DCGAN',
    'Conditional GANs', 'CycleGAN and StyleGAN', 'GAN project'
  ]],
  ['Section 54: Diffusion Models', 'HARD', [
    'Forward and reverse diffusion', 'Denoising score matching', 'DDPM', 'Classifier-free guidance',
    'Latent diffusion and Stable Diffusion', 'Text-to-image pipelines'
  ]],
  ['Section 55: Reinforcement Learning Foundations', 'HARD', [
    'Agents, environments and rewards', 'Markov decision processes', 'Bellman equations',
    'Dynamic programming', 'Monte Carlo methods', 'Temporal difference learning',
    'Exploration vs exploitation'
  ]],
  ['Section 56: Q-Learning & Deep Q-Networks', 'HARD', [
    'Tabular Q-learning', 'SARSA', 'Deep Q-Networks', 'Experience replay and target networks',
    'Double and Dueling DQN', 'DQN project: Atari / CartPole'
  ]],
  ['Section 57: Policy Gradient Methods', 'HARD', [
    'Policy-based vs value-based methods', 'REINFORCE', 'Actor–critic', 'A2C and A3C',
    'Proximal Policy Optimization (PPO)', 'Continuous control', 'Gymnasium environments'
  ]],
  ['Section 58: Graph Neural Networks', 'HARD', [
    'Graphs as data', 'Message passing', 'Graph convolutional networks', 'Graph attention networks',
    'Node and graph classification', 'PyTorch Geometric'
  ]],
  ['Section 59: Model Deployment', 'MEDIUM', [
    'Exporting models (ONNX, TorchScript)', 'Serving with FastAPI', 'Docker for ML',
    'Model optimization and quantization', 'Edge deployment', 'Monitoring models in production',
    'Deployment project'
  ]],
  ['Section 60: MLOps', 'MEDIUM', [
    'Experiment tracking', 'Data and model versioning', 'CI/CD for ML', 'Feature stores',
    'Pipeline orchestration', 'Model registry'
  ]],
  ['Section 61: AI Ethics & Responsible AI', 'EASY', [
    'Bias and fairness', 'Explainability (SHAP, LIME)', 'Privacy and differential privacy',
    'AI safety basics', 'Regulation and governance', 'Responsible AI checklist'
  ]],
  ['Section 62: Capstone Project', 'HARD', [
    'Choosing a capstone problem', 'Data collection and EDA', 'Baseline model',
    'Iterating on the model', 'Deploying the capstone', 'Writing the project report',
    'Presenting your work'
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

const toSections = (list) => list.map(([title, difficulty, topics]) => ({ title, difficulty, topics }));

module.exports = {
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
