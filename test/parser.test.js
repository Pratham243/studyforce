const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTopics } = require('../electron/lib/topicParser');

test('parses spec-style outline', () => {
  const s = parseTopics(`Section: C1 Sprechen — 3 topics — HARD
  - Vortrag halten (giving a presentation)
  - Diskussion führen
  - Spontanes Sprechen`);
  assert.equal(s.length, 1);
  assert.equal(s[0].title, 'C1 Sprechen');
  assert.equal(s[0].difficulty, 'HARD');
  assert.equal(s[0].topics.length, 3);
});

test('parses numbered course curriculum with durations and page noise', () => {
  const s = parseTopics(`Course Curriculum
Section 34: Neural Networks
1. What is a neuron? 05:12
2. Activation functions 12min
Page 2 of 9
Section 35 - Training
Lecture 12: Optimizers 1hr 5min
• Learning rate schedules [HARD]`);
  assert.deepEqual(s.map((x) => x.title), ['Section 34: Neural Networks', 'Section 35 - Training']);
  assert.deepEqual(s[0].topics.map((t) => t.title), ['What is a neuron?', 'Activation functions']);
  assert.equal(s[1].topics[0].title, 'Optimizers');
  assert.equal(s[1].topics[1].difficulty, 'HARD');
});

test('plain lines become topics when there are no list markers', () => {
  const s = parseTopics('Module 1: Basics\nIntro\nSetup\n');
  assert.deepEqual(s[0].topics.map((t) => t.title), ['Intro', 'Setup']);
});
