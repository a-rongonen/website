export type CvIcon = 'spark' | 'compass' | 'layers' | 'sun' | 'code' | 'pen' | 'grid' | 'chat' | 'briefcase' | 'book' | 'leaf';

export interface CvCard {
  title: string;
  text: string;
  icon: CvIcon;
}

export interface CvContent {
  lang: 'en' | 'fi';
  title: string;
  description: string;
  name: string;
  draft: string;
  portraitLabel: string;
  portrait?: { src: string; alt: string };
  profile: { heading: string; text: string };
  strengths: { heading: string; cards: CvCard[] };
  skills: { heading: string; cards: CvCard[] };
  history: {
    heading: string;
    tableTitle: string;
    columns: [string, string, string];
    rows: [string, string, string][];
    cards: CvCard[];
  };
}

// Keep this list in reading order: top left, top right, next left, next right.
// All copy below is explicitly placeholder content, not biographical information.
const icons: CvIcon[] = ['spark', 'compass', 'layers', 'sun', 'code', 'pen', 'grid', 'chat', 'book', 'leaf'];

function placeholderCards(lang: 'en' | 'fi', start: number, count: number): CvCard[] {
  return icons.slice(start, start + count).map((icon, index) => ({
    icon,
    title: lang === 'en' ? `Heading ${index + 1}` : `Otsikko ${index + 1}`,
    text: lang === 'en'
      ? (index === 0
          ? 'Placeholder text. This space is reserved for a longer description. The final content will be added later. For now, this extra paragraph-length text shows how a taller card sits alongside a shorter one in the layout.'
          : 'Placeholder text. The final content will be added later.')
      : (index === 0
          ? 'Paikkamerkkiteksti. Tähän tulee pidempi kuvaus. Lopullinen sisältö lisätään myöhemmin. Tämä pidempi teksti havainnollistaa, miten korkea kortti asettuu lyhyemmän kortin viereen sivun rakenteessa.'
          : 'Paikkamerkkiteksti. Lopullinen sisältö lisätään myöhemmin.'),
  }));
}

export const cvEnglish: CvContent = {
  lang: 'en',
  title: 'Aleksanteri Rongonen — CV',
  description: 'Aleksanteri Rongonen’s CV. Structure preview with placeholder content.',
  name: 'Aleksanteri Rongonen',
  draft: 'CV / Content coming soon',
  portraitLabel: 'Portrait coming soon',
  profile: {
    heading: 'Profile',
    text: 'Placeholder text. This space is reserved for the profile introduction. The final content will be added later.',
  },
  strengths: { heading: 'Strengths', cards: placeholderCards('en', 0, 4) },
  skills: { heading: 'Skills', cards: placeholderCards('en', 4, 4) },
  history: {
    heading: 'Work and studies',
    tableTitle: 'Heading',
    columns: ['Period', 'Role / studies', 'Organisation'],
    rows: Array.from({ length: 4 }, () => ['Dates to follow', 'Title to follow', 'Name to follow']),
    cards: placeholderCards('en', 8, 2),
  },
};

export const cvFinnish: CvContent = {
  lang: 'fi',
  title: 'Aleksanteri Rongonen — CV',
  description: 'Aleksanteri Rongosen CV. Rakenteen esikatselu paikkamerkkisisällöllä.',
  name: 'Aleksanteri Rongonen',
  draft: 'CV / Sisältö tulossa pian',
  portraitLabel: 'Kuva tulossa pian',
  profile: {
    heading: 'Profiili',
    text: 'Paikkamerkkiteksti. Tähän tulee profiilin esittely. Lopullinen sisältö lisätään myöhemmin.',
  },
  strengths: { heading: 'Vahvuudet', cards: placeholderCards('fi', 0, 4) },
  skills: { heading: 'Taidot', cards: placeholderCards('fi', 4, 4) },
  history: {
    heading: 'Työ ja opinnot',
    tableTitle: 'Otsikko',
    columns: ['Ajankohta', 'Tehtävä / opinnot', 'Organisaatio'],
    rows: Array.from({ length: 4 }, () => ['Ajankohta tulossa', 'Nimike tulossa', 'Nimi tulossa']),
    cards: placeholderCards('fi', 8, 2),
  },
};
