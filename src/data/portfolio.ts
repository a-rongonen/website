/** Portfolio-only copy and media. Empty sources render labelled placeholders. */
export interface PortfolioMedia {
  src?: string;
  poster?: string;
  label: string;
  kind?: 'video' | 'image' | 'youtube';
}

export interface PortfolioCase {
  title: string;
  pages: { heading: string; text: string; media: PortfolioMedia }[];
}

export const portfolioDesign = {
  titleColor: '#fff2a8', // The PORTFOLIO word only; independent of the shared inline accent.
  titleScale: 1.5, // The PORTFOLIO word only; 1 = original size, 1.5 = 50% larger.
};

export const portfolio = {
  "name": "Aleksanteri's",
  "heroVideo": {
    "src": "/videos/portfolio-demo-reel.mp4",
    "label": "Portfolio demo reel"
  },
  "background": {
    "heading": "background",
    "text": "I’ve had an exciting career as a marketing manager. But now it’s time to do what I really love: **design games.**\n\nFor the past three-ish years I’ve been learning Unreal Engine.\nI have learned **a lot.** Watch my 15 seconds of fame in Unreal Fest!",
    "video": {
      "kind": "youtube",
      "src": "https://www.youtube-nocookie.com/embed/4w0PWcRwyOc?start=6441&end=6555&playsinline=1&rel=0",
      "label": "Unreal Fest Stockholm 2025: 101 Unreal Engine Tips & Tricks (1:47:21–1:49:15)"
    }
  },
  "learning": {
    "heading": [
      "Panic Lane"
    ],
    "bullets": [
      "My learning project Panic Lane got \"a bit\" out of hand",
      "It's driving game where the goal is to reach the finish line alive",
      "40+ challenging tracks across 4 worlds/biomes",
      "Each world has its own set of mechanics",
      "Sometimes the player teleports instantly **between the worlds**, requiring quick adaptation to changing mechanics"
    ],
    "video": {
      "src": "/videos/panic-lane-portfolio-trailer.mp4",
      "label": "Panic Lane portfolio trailer"
    }
  },
  "cases": [
    {
      "title": "Shattering Platforms",
      "pages": [
        {
          "heading": "The problem",
          "text": "Platforms that shatter under the car were too unforgiving. If a platform shattered and started falling, the car would crash into the side of the next platform and it would be game over. Thus this obstacle type felt “binary” and there was a lack of “hanging by a thread” vibes.",
          "media": {
            "src": "",
            "label": "Shattering Platforms: problem media coming soon"
          }
        },
        {
          "heading": "The solution",
          "text": "The platforms don’t fall all at once. The middle part falls faster than the edges, creating ramps in all directions. It’s a sort of a symmetrical hatch. This allows the car climb up onto the next platform.\n\nThis is what the platform’s collision looks like from above after it has started shattering.",
          "media": {
            "src": "",
            "label": "Shattering Platforms: solution media coming soon"
          }
        },
        {
          "heading": "The result",
          "text": "Now that there is a lot of “coyote-time”, I was able to decrease the shattering speed, creating constant “hanging by a thread” feeling for the player. I also added a boost that can be used only once during the run. It allows both epic saves from desperate situations and using shattering platforms as ramps to jump over gaps.",
          "media": {
            "src": "",
            "label": "Shattering Platforms: result media coming soon"
          }
        }
      ]
    },
    {
      "title": "A New Drifting Mechanic",
      "pages": [
        {
          "heading": "The problem",
          "text": "On icy slippery platforms, some of the test players did not drift all, although that was the point. Moreover, it was good tactic for beating the track. There was a need to make drifting obligatory but also make it easy enough so inexperienced players are not overwhelmed.",
          "media": {
            "src": "",
            "label": "A New Drifting Mechanic: problem media coming soon"
          }
        },
        {
          "heading": "The solution",
          "text": "I added special walls between the platforms that are shattered **only** if the player hits them **sideways** with a spike on the car. In order to make “aiming” at the walls relatively easy, I added a lot of counter steering.\n\nThe shattered wall also gives a boost that accelerates the car to a fixed, manageable velocity. The boost vector is calculated by taking into account both car’s direction and the walls location, automatically pushing the car in “right” direction so that it stays on the track. This way the player can **fully concentrate on only touching the wall sideways** and everything else can be forgotten.",
          "media": {
            "src": "",
            "label": "A New Drifting Mechanic: solution media coming soon"
          }
        },
        {
          "heading": "The result",
          "text": "Even less experienced players are able to hit the walls correctly (after a bit of practice). Hitting the walls feels good and gives a sense of mastery. The aids under the hood keep the difficulty in control and make sure the car doesn’t slow down. For the players for which drifting is a no-go, there are no walls on the lowest difficulty.",
          "media": {
            "src": "",
            "label": "A New Drifting Mechanic: result media coming soon"
          }
        }
      ]
    },
    {
      "title": "Driving on a Pipe",
      "pages": [
        {
          "heading": "The problem",
          "text": "One of the pipe types in the game is not magnetic, which made driving on it very challenging. Because the pipe twists and turns, it is important to keep the wheels touching the ground. However, even slight “jump” might ruin the run because you can’t turn while in air, and these tiny jumps are **visually unnoticeable.** This gives an illusion that “the car just doesn’t turn” on a track that is already in danger to become frustratingly difficult.",
          "media": {
            "src": "",
            "label": "Driving on a Pipe: problem media coming soon"
          }
        },
        {
          "heading": "The solution",
          "text": "I added a screen on the car that starts flashing red when the car is not touching the pipe. This gives instant feedback, allowing the player to learn what kind of turns are undesirable.\n\nI am also deceiving the player a bit. The pipe is slightly magnetic. This is not noticeable, but it eliminates a lot of the “micro jumps” that can ruin the run. The “magnet” is turned off when car’s up vector is pointing down, resulting in a fall if the player tries to drive on the bottom half of the pipe.",
          "media": {
            "src": "",
            "label": "Driving on a Pipe: solution media coming soon"
          }
        },
        {
          "heading": "The result",
          "text": "Driving on a “non-magnetic” pipe is a lot smoother but still not too easy. The test players intuitively guessed what the screen is trying to tell and tried to avoid jumps.",
          "media": {
            "src": "",
            "label": "Driving on a Pipe: result media coming soon"
          }
        }
      ]
    }
  ]
} satisfies {
  name: string;
  heroVideo: PortfolioMedia;
  background: { heading: string; text: string; video: PortfolioMedia };
  learning: { heading: string[]; bullets: string[]; video: PortfolioMedia };
  cases: PortfolioCase[];
};
