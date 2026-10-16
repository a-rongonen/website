export type CvIcon = 'spark' | 'compass' | 'layers' | 'sun' | 'code' | 'pen' | 'grid' | 'chat' | 'briefcase' | 'book' | 'leaf';

export interface CvCard {
  title: string;
  text: string;
  icon: CvIcon;
}

/** Optional content blocks, rendered in this order: text/bullets, table, cards. */
export interface CvSection {
  id: string;
  heading: string;
  text?: string;
  bullets?: string[];
  table?: {
    title: string;
    columns: [string, string, string];
    rows: [string, string, string][];
  };
  cards?: CvCard[];
}

export interface CvContent {
  lang: 'en' | 'fi';
  title: string;
  description: string;
  name: string;
  draft: string;
  scrollPrompt: string;
  portraitLabel: string;
  portrait?: { src: string; alt: string; width: number; height: number };
  sections: CvSection[];
}

// Owner-supplied Finnish copy, translated for the English CV.
// See ignored-files/cv-and-portfolio-assets/cv-copies.md for source guidance.
// Cards stay in reading order: top left, top right, next left, next right.
// Separate paragraphs with a blank line (\n\n); supports inline emphasis and links.

export const cvEnglish: CvContent = {
  lang: 'en',
  title: 'Aleksanteri Rongonen — CV',
  description: 'Aleksanteri Rongonen’s CV: marketing experience, creative and technical skills, work history and education.',
  name: 'Aleksanteri Rongonen',
  draft: 'CV',
  scrollPrompt: 'Scroll down',
  portraitLabel: 'Portrait coming soon',
  portrait: { src: '/images/cv-image.png', alt: 'Aleksanteri Rongonen', width: 1944, height: 2738 },
  sections: [{
    id: 'profile',
    heading: 'Profile',
    text: 'I’m primarily a “marketing person”, but I have plenty of other skills too. My experience includes website development, ERP software specifications, rebranding, customer service management, producing advertising materials, video editing, analytics, team management and much more.\n\nLet’s address the elephant in the room. The large gap in my CV is there because I wanted to try something new and started teaching myself game development. My first game is essentially finished. I now want to return to business roles and make artistic, non-commercial games in my spare time.',
    bullets: [
      'Five years of varied marketing experience',
      'A master’s degree in business from Aalto University, majoring in marketing',
      'A hands-on approach to getting things done',
      'A wide range of technical skills, including video editing and 3D modelling',
      'Extensive experience using AI in many different contexts',
    ],
  }, {
    id: 'skills',
    heading: 'Skills',
    cards: [
      {
        icon: 'grid', title: 'Marketing',
        text: 'I majored in marketing at Aalto University. Soon after graduating, I became a marketing manager — and that was when the real learning began. I now have several years of experience leading marketing, but I’ve also done plenty of the hands-on work myself. My career has covered a broad cross-section of marketing: rebranding, multichannel digital and traditional advertising, managing several brands at once, and all kinds of analytics and dashboard design. Having created so much of the material myself, I can also speak the same language as a professional graphic designer, for example.',
      },
      {
        icon: 'pen', title: 'Creativity',
        text: 'For me, creativity is about making things, not vague buzzwords. The best example is the video game I developed entirely on my own, from start to finish. I also enjoy making art in my spare time and work comfortably across image, video and audio editing software, as well as 3D modelling. To keep creativity at work from depending on occasional flashes of inspiration, I’ve developed and use systematic methods for generating ideas. These methods have been especially valuable in marketing, helping me consistently produce fresh, effective concepts that stand out, even under pressure.',
      },
      {
        icon: 'code', title: 'Artificial Intelligence',
        text: 'I don’t even know where to begin. Let’s start in 2015, when I first became interested in machine learning at university. Since then, I’ve closely followed developments in AI and tried a bit of everything as new models have come out. I’ve used many different language models, both as hosted services and running locally on my own computer. I have experience generating images, videos, music and 3D models. One of my closest friends is an AI researcher at Aalto University, so if we start working on something really complex, I know who to call.',
      },
      {
        icon: 'leaf', title: 'Learning',
        text: 'Making a video game entirely on my own, with no relevant experience, meant I really had to learn how to learn. And it paid off: at Unreal Fest, I shared tips that even Epic’s employees didn’t know about. In other words, I’m able and willing to learn whatever is needed.',
      },
    ],
  }, {
    id: 'history',
    heading: 'Work And Studies',
    table: {
      title: 'Work History',
      columns: ['Period', 'Role', 'Organisation'],
      rows: [
        ['2/2022 – 5/2022', 'Marcom Programs Manager', 'Hewlett-Packard Oy'],
        ['1/2018 – 1/2022', 'Marketing Manager', 'Taloturva Group Oy'],
        ['3/2017 – 12/2017', 'Account Manager / Marketing', 'Urano Oy'],
        ['1/2015 – 12/2015', 'Vice Chair', 'Tikelo (university film club)'],
      ],
    },
    cards: [
      { icon: 'book', title: 'Education', text: '9/2012 – 5/2017\n\nBachelor’s and master’s degrees in business, majoring in marketing. Aalto University.' },
      { icon: 'chat', title: 'Languages', text: 'Finnish: native language\n\nRussian: second native language\n\nEnglish: near-native proficiency' },
    ],
  }, {
    // Reusable empty section: add a heading and content when needed.
    id: 'strengths', heading: '',
  }],
};

export const cvFinnish: CvContent = {
  lang: 'fi',
  title: 'Aleksanteri Rongonen — CV',
  description: 'Aleksanteri Rongosen CV: markkinointikokemus, luovat ja tekniset taidot, työhistoria ja koulutus.',
  name: 'Aleksanteri Rongonen',
  draft: 'CV',
  scrollPrompt: 'Vieritä alas',
  portraitLabel: 'Kuva tulossa pian',
  portrait: { src: '/images/cv-image.png', alt: 'Aleksanteri Rongonen', width: 1944, height: 2738 },
  sections: [{
    id: 'profile',
    heading: 'Profiili',
    text: 'Olen ensisijaisesti “markkinointityyppi”, mutta minulla on paljon muutakin osaamista. Kokemusta löytyy mm. nettisivujen kehityksestä, ERP-ohjelmiston speksauksista, brändiuudistuksesta, asiakaspalvelun johtamisesta, mainosmateriaalien tuotannosta, videoeditoinnista, analytiikasta, esimiestyöstä ja vaikka mistä.\n\nNostetaanpa kissa pöydälle. Valtava aukko CV:ssä johtuu siitä, että halusin kokeilla jotain uutta ja rupesin omatoimisesti opiskelemaan pelinkehitystä. Ensimmäinen pelini on käytännössä valmis. Nyt haluan palata kaupallisiin hommiin ja tehdä taiteellisia, ei-kaupallisia pelejä vapaa-ajalla.',
    bullets: [
      '5 vuotta monipuolista markkinointikokemusta',
      'Ekonomin tutkinto Aalto-yliopistosta, pääaineena markkinointi',
      'Tottunut tekemään töitä “kädet savessa”',
      'Valtavasti eri teknisiä taitoja, esim. videoeditointi ja 3D-mallintaminen',
      'Paljon kokemusta tekoälyn käytöstä monissa eri konteksteissa',
    ],
  }, {
    id: 'skills',
    heading: 'Taidot',
    cards: [
      {
        icon: 'grid', title: 'Markkinointi',
        text: 'Opiskelin Aalto-yliopistossa markkinointi pääaineena. Valmistumisen jälkeen pääsin pian markkinointipäällikön hommiin, ja silloin todellinen oppiminen vasta alkoikin. Nyt minulla on myös useamman vuoden kokemus markkinoinnin vetämisestä, mutta olen myös tehnyt paljon asioita omilla käsillä. Työhistoriani on ollut aikamoinen markkinoinnin läpileikkaus. Siihen on mahtunut brändiuudistusta, monikanavaista netti- sekä perinteistä mainontaa, useiden eri brändien samanaikaista hallintaa ja kaikennäköistä analytiikkaa sekä dashboardien suunnittelua. Koska olen tehnyt paljon materiaalia itse, pystyn myös puhumaan esim. ammattigraafikon kanssa samaa kieltä.',
      },
      {
        icon: 'pen', title: 'Luovuus',
        text: 'Luovuus ei ole minulle epämääräistä sanahelinää, vaan konkreettista tekemistä, mistä parhaana esimerkkinä on täysin alusta loppuun asti yksin kehittämäni videopeli. Tykkään muutenkin taiteilla vapaa-ajallani, ja minulta taittuvat sujuvasti ristiin niin kuva-, video- kuin äänieditointiohjelmistot, puhumattakaan 3D-mallintamisesta. Jotta luovuus ei työssä jäisi vain satunnaisen inspiraation varaan, olen kehittänyt ja hyödynnän systemaattisia metodeja ideoiden generoimiseen. Näistä menetelmistä on ollut valtavasti hyötyä etenkin markkinoinnissa, sillä niiden avulla pystyn tuottamaan jatkuvalla syötöllä tuoreita, tuloksellisia ja massasta erottuvia konsepteja paineenkin alla.',
      },
      {
        icon: 'code', title: 'Tekoäly',
        text: 'En tiedä edes mistä aloittaisin. No aloitetaan vaikka vuodesta 2015, kun ensimmäisen kerran innostuin koneoppimisesta yliopistossa. Siitä lähtien olen tiukasti seurannut tekoälyn kehitystä ja kokeillut vähän kaikkea sen mukaan kun uusia malleja on tullut ulos. Olen käyttänyt monia eri kielimalleja sekä palveluna että pyörittänyt niitä lokaalisti omalla koneella. Minulla on kokemusta niin kuvien, videoiden, musiikin kuin 3D-mallien generoimisesta. Yksi parhaista kavereistani on tekoälytutkija Aalto-yliopistossa, eli jos ruvetaan tekemään jotain todella monimutkaista, tiedän kenelle soittaa.',
      },
      {
        icon: 'leaf', title: 'Oppiminen',
        text: 'Koska tein videopelin täysin yksin ilman minkäänlaista relevanttia kokemusta, jouduin toden teolla “oppimaan oppimista”. Olen tässä myös onnistunut: Unreal Fest -tapahtumassa jaoin vinkkejä, joista edes Epicin työntekijät eivät tienneet. Toisin sanoen pystyn ja olen valmis oppimaan mitä ikinä pitääkin.',
      },
    ],
  }, {
    id: 'history',
    heading: 'Työ Ja Opinnot',
    table: {
      title: 'Työhistoria',
      columns: ['Ajankohta', 'Tehtävä', 'Organisaatio'],
      rows: [
        ['2/2022 – 5/2022', 'Marcom Programs Manager', 'Hewlett-Packard Oy'],
        ['1/2018 – 1/2022', 'Markkinointipäällikkö', 'Taloturva Group Oy'],
        ['3/2017 – 12/2017', 'Asiakaspäällikkö / markkinointi', 'Urano Oy'],
        ['1/2015 – 12/2015', 'Varapuheenjohtaja', 'Tikelo (yliopiston leffakerho)'],
      ],
    },
    cards: [
      { icon: 'book', title: 'Koulutus', text: '9/2012 – 5/2017\n\nKauppatieteiden kandidaatti ja maisteri, pääaineena markkinointi. Aalto-yliopisto.' },
      { icon: 'chat', title: 'Kielitaito', text: 'Suomi: äidinkieli\n\nVenäjä: toinen äidinkieli\n\nEnglanti: melkein äidinkieli' },
    ],
  }, {
    // Reusable empty section: add a heading and content when needed.
    id: 'strengths', heading: '',
  }],
};
