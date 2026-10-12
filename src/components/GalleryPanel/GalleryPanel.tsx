import { Gallery } from "@/components/Gallery";
import {
  GALLERY_PAGE_SIZE,
  getPageCount,
  getPosts,
} from "@/lib/instagramContent";
import { profileUrl } from "@/lib/instagramProfile";
import styles from "./GalleryPanel.module.scss";

const TITLE_ID = "gallery-panel-title";

export function GalleryPanel() {
  return (
    <section className={styles.root} aria-labelledby={TITLE_ID}>
      <h2 className="srOnly" id={TITLE_ID}>
        Gallery
      </h2>
      <div className={styles.grid}>
        <Gallery
          eagerTiles={0}
          initialPosts={getPosts().slice(0, GALLERY_PAGE_SIZE)}
          pageCount={getPageCount()}
          profileUrl={profileUrl}
        />
      </div>
    </section>
  );
}
