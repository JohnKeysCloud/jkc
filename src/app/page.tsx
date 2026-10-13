import { CallingCard } from "@/components/CallingCard";
import { Chase } from "@/components/Chase";
import { Clouds } from "@/components/Clouds";
import { Descent } from "@/components/Descent";
import { GalleryPanel } from "@/components/GalleryPanel";
import { MasterKey } from "@/components/MasterKey";
import { SiteFooter } from "@/components/SiteFooter";
import { Sky } from "@/components/Sky";
import { Skyline } from "@/components/Skyline";

const CARD_ID = "card";
const GALLERY_ID = "gallery";

export default function Home() {
  return (
    <>
      <Sky targetId={CARD_ID} />
      <Descent
        id={CARD_ID}
        aside={<GalleryPanel />}
        asideId={GALLERY_ID}
        backdrop={<Skyline />}
        lock={<MasterKey targetId={CARD_ID} />}
        overlay={<Clouds />}
      >
        <CallingCard />
      </Descent>
      <Chase />
      <SiteFooter descentId={CARD_ID} galleryId={GALLERY_ID} />
    </>
  );
}
