export type SiteLink = {
  label: string;
  href: string;
};

export type SocialIcon =
  | "discord"
  | "github"
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "twitch"
  | "twitter";

export type SocialLink = SiteLink & {
  icon: SocialIcon;
};

export const site = {
  greeting: "Hello World",
  handle: "johnKeysCloud",
  mark: "ジKC",
  role: "Software Engineer",
  studio: {
    name: "Cyclone Studios",
    href: "https://www.cyclonestud.io/",
  },
  location: {
    name: "New York City",
    short: "NYC",
  },
  portrait: {
    alt: "johnKeysCloud looking down in a knit beanie, headphones, and a sherpa fleece jacket",
  },
  statement: "Devising & implementing avant-garde software.",
  signature: {
    text: "As above, so billow",
    href: "https://www.windows93.net/",
  },
  socials: [
    {
      label: "Discord",
      href: "https://discord.gg/sMuXrzpKv3",
      icon: "discord",
    },
    {
      label: "Twitch",
      href: "https://www.twitch.tv/johnkeyscloud",
      icon: "twitch",
    },
    {
      label: "GitHub",
      href: "https://github.com/JohnKeysCloud",
      icon: "github",
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/johnkeyscloud",
      icon: "linkedin",
    },
    { label: "X", href: "https://x.com/kizukuraudo", icon: "twitter" },
    {
      label: "TikTok",
      href: "https://www.tiktok.com/@kizukuraudo",
      icon: "tiktok",
    },
    {
      label: "Instagram",
      href: "https://www.instagram.com/kizukuraudo",
      icon: "instagram",
    },
  ] satisfies SocialLink[],
} as const;
