import type { Metadata } from "next";
import Link from "next/link";
import { Gallery } from "@/components/Gallery";
import { site } from "@/content/site";
import {
  GALLERY_PAGE_SIZE,
  getPageCount,
  getPosts,
} from "@/lib/instagramContent";
import styles from "./page.module.scss";

const instagram = site.socials.find((social) => social.icon === "instagram");
const profileUrl = instagram?.href ?? "https://www.instagram.com/";
const handle = new URL(profileUrl).pathname.replaceAll("/", "");

export const metadata: Metadata = {
  title: `Gallery · ${site.handle}`,
  description: `${site.handle}'s Instagram, mirrored.`,
};

export default function GalleryPage() {
  const posts = getPosts();

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <Link className={styles.home} href="/">
          Home
        </Link>
        <h1 className={styles.title}>Gallery</h1>
        <a
          className={styles.profile}
          href={profileUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          @{handle}
          <span className="srOnly"> on Instagram (opens in a new tab)</span>
        </a>
      </header>

      <Gallery
        initialPosts={posts.slice(0, GALLERY_PAGE_SIZE)}
        pageCount={getPageCount()}
        profileUrl={profileUrl}
      />
    </main>
  );
}
