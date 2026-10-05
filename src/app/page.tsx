import { CallingCard } from "@/components/CallingCard";
import { Clouds } from "@/components/Clouds";
import { Descent } from "@/components/Descent";
import { MasterKey } from "@/components/MasterKey";
import { SiteFooter } from "@/components/SiteFooter";
import { Sky } from "@/components/Sky";
import { Skyline } from "@/components/Skyline";

const CARD_ID = "card";

export default function Home() {
  return (
    <>
      <Sky targetId={CARD_ID} />
      <Descent id={CARD_ID} backdrop={<Skyline />} overlay={<Clouds />}>
        <MasterKey targetId={CARD_ID} />
        <CallingCard />
      </Descent>
      <SiteFooter />
    </>
  );
}
