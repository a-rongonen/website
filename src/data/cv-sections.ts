import type { CvSection } from './cv';

/** Empty headings, icons and table headers alone are not section content. */
export function visibleCvSections(sections: CvSection[]) {
  return sections.map(section => ({
    ...section,
    text: section.text?.trim() ?? '',
    bullets: (section.bullets ?? []).map(text => text.trim()).filter(Boolean),
    cards: (section.cards ?? []).filter(card => card.text.trim()),
    table: section.table ? {
      ...section.table,
      rows: section.table.rows.filter(row => row.some(cell => cell.trim())),
    } : undefined,
  })).filter(section => section.text || section.bullets.length || section.cards.length || section.table?.rows.length);
}
