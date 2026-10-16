/** Portfolio-only copy and media. Empty sources render labelled placeholders. */
export interface PortfolioMedia {
  src?: string;
  poster?: string;
  label: string;
  kind?: 'video' | 'image';
}

export interface PortfolioCase {
  title: string;
  pages: { text: string; media: PortfolioMedia }[];
}

// Replace each page's placeholders independently as the case content is supplied.
const placeholderPages = () => Array.from({ length: 3 }, (_, index) => ({
  text: `Page ${index + 1} content coming soon.`,
  media: { src: '', label: `Page ${index + 1} media coming soon` },
}));

export const portfolioDesign = {
  titleColor: '#fff2a8', // The PORTFOLIO word only; independent of the shared inline accent.
  titleScale: 1.5, // The PORTFOLIO word only; 1 = original size, 1.5 = 50% larger.
};

export const portfolio = {
  name: "Aleksanteri's",
  heroVideo: { src: '/videos/portfolio-demo-reel.mp4', label: 'Portfolio demo reel' } satisfies PortfolioMedia,
  background: {
    heading: 'background',
    text: 'Background text coming soon.',
    video: { src: '', label: 'Background video coming soon' } satisfies PortfolioMedia,
  },
  learning: {
    heading: ['Panic Lane'],
    bullets: Array.from({ length: 5 }, () => 'Bullet point coming soon'),
    video: { src: '', label: 'Project video coming soon' } satisfies PortfolioMedia,
  },
  cases: [
    { title: 'Shattering Platforms', pages: placeholderPages() },
    { title: 'A New Drifting Mechanic', pages: placeholderPages() },
    { title: 'Driving on a Pipe', pages: placeholderPages() },
  ] satisfies PortfolioCase[],
};
