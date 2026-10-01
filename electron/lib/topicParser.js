// Turns the text of a course PDF (or pasted outline) into sections and topics.
//
// Recognised section headers:
//   Section 12: Title        Section 12 - Title       Module 3. Title
//   Chapter 4 Title          Section: Title — 3 topics — HARD
//   Part II: Title           Unit 5: Title
// Recognised topics (inside a section):
//   1. Title   12) Title   - Title   • Title   Lecture 5: Title   Lesson 3 - Title
//   Any other non-empty line, when the document has no list markers at all.
// A topic's difficulty is null unless tagged ("[HARD]"); it then inherits its section's.
// Trailing durations ("12:34", "5min", "1hr 20min") and page numbers are stripped.

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

const SECTION_RE = /^(?:section|module|chapter|part|unit|phase)\b\s*:?\s*([0-9]+|[ivxlc]+)?\s*[:.\-–—)]?\s*(.*)$/i;
const TOPIC_RE = /^(?:(?:\d{1,3}[.)]|[-•*–▪◦●])\s+|(?:lecture|lesson|video|topic|class)\s*\d+\s*[:.\-–—]\s*)(.+)$/i;
const DURATION_RE = /\s*(?:\(?\b\d{1,2}:\d{2}(?::\d{2})?\)?|\b\d+\s*(?:hr|hrs|h|min|mins|m)\b(?:\s*\d+\s*(?:min|mins|m)\b)?)\s*$/i;
const PAGE_NOISE_RE = /^(?:page\s*\d+(\s*of\s*\d+)?|\d+\s*\/\s*\d+|\d+)$/i;

function findDifficulty(text) {
  const m = text.toUpperCase().match(/\b(EASY|MEDIUM|HARD)\b/);
  return m ? m[1] : null;
}

function cleanTitle(text) {
  let t = text;
  for (let i = 0; i < 2; i++) t = t.replace(DURATION_RE, '');
  return t
    .replace(/\s*[—–-]\s*\d+\s*(?:topics?|lectures?|lessons?)\b.*$/i, '')
    .replace(/\s*[—–-]\s*(EASY|MEDIUM|HARD)\s*$/i, '')
    .replace(/\s*\[(EASY|MEDIUM|HARD)\]\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTopics(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\u00a0/g, ' ').trim())
    .filter((l) => l && !PAGE_NOISE_RE.test(l));

  const hasListMarkers = lines.some((l) => TOPIC_RE.test(l));
  const sections = [];
  let current = null;

  for (const line of lines) {
    if (SECTION_RE.test(line) && !TOPIC_RE.test(line)) {
      const title = cleanTitle(line.replace(/^section\s*:\s*/i, '')) || line;
      current = { title, difficulty: findDifficulty(line) || 'MEDIUM', topics: [] };
      sections.push(current);
      continue;
    }
    const tm = line.match(TOPIC_RE);
    if (!tm && hasListMarkers) continue;
    const raw = tm ? tm[1] : line;
    const title = cleanTitle(raw);
    if (!title || title.length < 2) continue;
    if (!current) {
      current = { title: 'Imported', difficulty: 'MEDIUM', topics: [] };
      sections.push(current);
    }
    const own = raw.match(/\[(EASY|MEDIUM|HARD)\]/i);
    current.topics.push({ title, difficulty: own ? own[1].toUpperCase() : null });
  }

  return sections.filter((s) => s.topics.length > 0);
}

module.exports = { parseTopics, cleanTitle, DIFFICULTIES };
