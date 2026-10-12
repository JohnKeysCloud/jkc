import { site } from "@/content/site";

const instagram = site.socials.find((social) => social.icon === "instagram");

export const profileUrl = instagram?.href ?? "https://www.instagram.com/";
export const profileHandle = new URL(profileUrl).pathname.replaceAll("/", "");
