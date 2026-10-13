import assert from 'node:assert/strict';
import test from 'node:test';
import { visibleCvSections } from '../src/data/cv-sections.ts';
import { networkContentPalette, networkSectionStyle, networkTransitionNeighbors } from '../src/data/cv-network.ts';

test('empty sections and blank blocks do not occupy slots; input stays editable', () => {
  const sections = [
    { id: 'empty', heading: 'A heading alone', text: ' \n ', bullets: [' '], cards: [{ title: 'Title only', icon: 'book', text: '' }], table: { title: 'Empty', columns: ['A', 'B', 'C'], rows: [['', ' ', '']] } },
    { id: 'text', heading: 'Text', text: 'Content' },
    { id: 'gap', heading: '' },
    { id: 'bullets', heading: '', bullets: [' ', 'A point'] },
    { id: 'table', heading: 'Table', table: { title: '', columns: ['A', 'B', 'C'], rows: [['Date', '', '']] } },
    { id: 'cards', heading: 'Cards', cards: [{ title: '', icon: 'book', text: 'Content' }] },
  ];
  const original = structuredClone(sections);
  const visible = visibleCvSections(sections);
  assert.deepEqual(visible.map(section => section.id), ['text', 'bullets', 'table', 'cards']);
  assert.deepEqual(visible[1].bullets, ['A point']);
  assert.deepEqual(sections, original);
  assert.deepEqual(visibleCvSections([]), []);
  sections[0].text = 'Added later';
  assert.equal(visibleCvSections(sections)[0].id, 'empty');
});

test('palettes follow visible positions and support more than four sections', () => {
  assert.deepEqual(Array.from({ length: 6 }, (_, index) => networkContentPalette(index)),
    ['profile', 'strengths', 'skills', 'history', 'profile', 'strengths']);
  const palettes = ['hero', 'profile', 'strengths', 'skills'];
  assert.deepEqual(networkTransitionNeighbors('profile', palettes, 1), { previous: 'profile', next: 'strengths' });
  assert.deepEqual(networkTransitionNeighbors('skills', palettes, 3), { previous: 'strengths', next: 'skills' });
  assert.match(networkSectionStyle('skills', palettes, 3), /--network-transition-out: 0px/);
  assert.match(networkSectionStyle('profile', ['hero', 'profile'], 1), /--network-transition-in: 0px/);
  assert.match(networkSectionStyle('profile', ['hero', 'profile'], 1), /--network-transition-out: 0px/);
  const repeated = ['hero', 'profile', 'strengths', 'skills', 'history', 'profile'];
  assert.deepEqual(networkTransitionNeighbors('profile', repeated, 5), { previous: 'history', next: 'profile' });
});
