import { cacheLife } from "next/cache";
import { getAreas, getServices } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { businessJsonLd, websiteJsonLd } from "@/lib/seo";
import { Header } from "@/components/site/Header";
import { Footer, MobileCallBar } from "@/components/site/Footer";
import { Tracker } from "@/components/site/Tracker";
import { Analytics } from "@/components/site/Analytics";
import { JsonLd } from "@/components/site/ui";

export async function SiteChrome({ children }: { children: React.ReactNode }) {
  "use cache";
  cacheLife("days");
  const [s, services, areas] = await Promise.all([getSettings(), getServices(), getAreas()]);
  const hubs = areas.filter((a) => a.isHub);
  const adsLead = s.googleAdsId && s.googleAdsLeadLabel ? `${s.googleAdsId}/${s.googleAdsLeadLabel}` : undefined;
  const adsCall = s.googleAdsId && s.googleAdsCallLabel ? `${s.googleAdsId}/${s.googleAdsCallLabel}` : undefined;
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <Header s={s} services={services} hubs={hubs} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer s={s} services={services} hubs={hubs} />
      <MobileCallBar s={s} />
      <JsonLd data={businessJsonLd(s, hubs, services)} />
      <JsonLd data={websiteJsonLd(s)} />
      <Tracker adsLead={adsLead} adsCall={adsCall} />
      <Analytics s={s} />
    </>
  );
}
