import Script from "next/script";
import type { SiteSettings } from "@/lib/settings";

// IDs end up inside inline scripts, so only allow the characters real tag IDs use.
const clean = (id: string) => (/^[A-Za-z0-9_-]{4,40}$/.test(id.trim()) ? id.trim() : "");

/** Loads GTM and/or gtag (GA4 + Google Ads) and the Meta pixel — only for IDs set in Admin → Settings. */
export function Analytics({ s: raw }: { s: SiteSettings }) {
  const s = { gtmId: clean(raw.gtmId), ga4Id: clean(raw.ga4Id), googleAdsId: clean(raw.googleAdsId), metaPixelId: clean(raw.metaPixelId) };
  const gtagIds = [s.ga4Id, s.googleAdsId].filter(Boolean);
  return (
    <>
      {s.gtmId && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${s.gtmId}');`}
        </Script>
      )}
      {gtagIds.length > 0 && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gtagIds[0]}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());${gtagIds
              .map((id) => `gtag('config','${id}');`)
              .join("")}`}
          </Script>
        </>
      )}
      {s.metaPixelId && (
        <Script id="meta-pixel" strategy="lazyOnload">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${s.metaPixelId}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
