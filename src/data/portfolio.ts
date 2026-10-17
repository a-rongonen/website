/** Portfolio-only copy and media. Empty sources render labelled placeholders. */
export interface PortfolioMedia {
  src?: string;
  poster?: string;
  width?: number;
  height?: number;
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
    "width": 1280,
    "height": 720,
    "label": "Portfolio demo reel"
  },
  "background": {
    "heading": "Background",
    "text": "I’ve had an exciting career as a marketing manager. But now it’s time to do what I really love: *design games.*\n\nFor the past three-ish years I’ve been learning Unreal Engine.\nI have learned *a lot.* Watch my 15 seconds of fame in Unreal Fest!",
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
    "video": {
      "src": "/videos/panic-lane-portfolio-trailer.mp4",
      "width": 960,
      "height": 540,
      "label": "Panic Lane portfolio trailer"
    },
    "text": "Panic Lane is my UE learning project that got 'a bit' out of hand. It's a driving game where the goal is to reach the finish line alive.\n\nThe game has 40+ tracks across 4 biomes. Occasional teleportation *between the biomes* requires quick reactions to changing mechanics."
  },
  "cases": [
    {
      "title": "Shattering Platforms",
      "pages": [
        {
          "heading": "The Problem",
          "text": "Platforms that shatter under the car were too unforgiving. If a platform shattered and started falling, the car would crash into the side of the next platform and it would be game over. Thus this obstacle type felt “binary” and there was a lack of “hanging by a thread” vibes.\n\n*Drag/click on the slider!* 👆",
          "media": {
            "src": "/images/falling platform.png",
            "width": 1187,
            "height": 950,
            "kind": "image",
            "label": "Shattering Platforms: falling platform"
          }
        },
        {
          "heading": "The Solution",
          "text": "The platforms don’t fall all at once. The middle part falls faster than the edges, creating ramps in all directions. It’s a sort of a symmetrical hatch. This allows the car climb up onto the next platform.",
          "media": {
            "src": "/images/glass hatch.png",
            "width": 1600,
            "height": 1281,
            "kind": "image",
            "label": "Shattering Platforms: hatch-shaped platform collision"
          }
        },
        {
          "heading": "The Result",
          "text": "Now that there is a lot of “coyote-time”, I was able to decrease the shattering speed, creating constant “hanging by a thread” feeling for the player. I also added a boost that can be used only once during the run. It allows both epic saves from desperate situations and using shattering platforms as ramps to jump over gaps.",
          "media": {
            "src": "/videos/glass-demo.mp4",
            "width": 960,
            "height": 540,
            "kind": "video",
            "label": "Shattering Platforms: gameplay demonstration"
          }
        }
      ]
    },
    {
      "title": "A New Drifting Mechanic",
      "pages": [
        {
          "heading": "The Problem",
          "text": "On icy slippery platforms, some of the test players did not drift all, although that was the point. Moreover, it was good tactic for beating the track. There was a need to make drifting obligatory but also make it easy enough so inexperienced players are not overwhelmed.\n\n*Drag/click on the slider!* 👆",
          "media": {
            "src": "/videos/careful-driving-demo.mp4",
            "width": 960,
            "height": 540,
            "kind": "video",
            "label": "A New Drifting Mechanic: careful driving without drifting"
          }
        },
        {
          "heading": "The Solution",
          "text": "I added special walls between the platforms that are shattered *only* if the player hits them *sideways* with a spike on the car. In order to make “aiming” at the walls relatively easy, I added a lot of counter steering.\n\nThe shattered wall also gives a boost that accelerates the car to a fixed, manageable velocity. The boost vector is calculated by taking into account both car’s direction and the walls location, automatically pushing the car in “right” direction so that it stays on the track. This way the player can *fully concentrate on only touching the wall sideways* and everything else can be forgotten.",
          "media": {
            "src": "/images/drift wall.png",
            "width": 990,
            "height": 792,
            "kind": "image",
            "label": "A New Drifting Mechanic: drift wall"
          }
        },
        {
          "heading": "The Result",
          "text": "Even less experienced players are able to hit the walls correctly (after a bit of practice). Hitting the walls feels good and gives a sense of mastery. The aids under the hood keep the difficulty in control and make sure the car doesn’t slow down. For the players for which drifting is a no-go, there are no walls on the lowest difficulty.",
          "media": {
            "src": "/videos/drift-wall-demo.mp4",
            "width": 960,
            "height": 540,
            "kind": "video",
            "label": "A New Drifting Mechanic: gameplay demonstration"
          }
        }
      ]
    },
    {
      "title": "Driving On A Pipe",
      "pages": [
        {
          "heading": "The Problem",
          "text": "One of the pipe types in the game is not magnetic, which made driving on it very challenging. Because the pipe twists and turns, it is important to keep the wheels touching the ground. However, even slight “jump” might ruin the run because you can’t turn while in air, and these tiny jumps are *visually unnoticeable.* This gives an illusion that “the car just doesn’t turn” on a track that is already in danger to become frustratingly difficult.\n\n*Drag/click on the slider!* 👆",
          "media": {
            "src": "/images/pipe micro jump.png",
            "width": 1200,
            "height": 960,
            "kind": "image",
            "label": "Driving on a Pipe: micro jump"
          }
        },
        {
          "heading": "The Solution",
          "text": "I added a screen on the car that starts flashing red when the car is not touching the pipe. This gives instant feedback, allowing the player to learn what kind of turns are undesirable.\n\nI am also deceiving the player a bit. The pipe is slightly magnetic. This is not noticeable, but it eliminates a lot of the “micro jumps” that can ruin the run. The “magnet” is turned off when car’s up vector is pointing down, resulting in a fall if the player tries to drive on the bottom half of the pipe.",
          "media": {
            "src": "/images/pipe screen.jpg",
            "width": 800,
            "height": 640,
            "kind": "image",
            "label": "Driving on a Pipe: feedback screen on the car"
          }
        },
        {
          "heading": "The Result",
          "text": "Driving on a “non-magnetic” pipe is a lot smoother but still not too easy. The test players intuitively guessed what the screen is trying to tell and tried to avoid jumps.",
          "media": {
            "src": "/videos/pipe-jump-demo.mp4",
            "width": 960,
            "height": 540,
            "kind": "video",
            "label": "Driving on a Pipe: gameplay demonstration"
          }
        }
      ]
    }
  ]
} satisfies {
  name: string;
  heroVideo: PortfolioMedia;
  background: { heading: string; text: string; video: PortfolioMedia };
  learning: { heading: string[]; text: string; video: PortfolioMedia };
  cases: PortfolioCase[];
};
