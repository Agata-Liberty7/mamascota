import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const seoJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://mamascota.com/#organization",
      name: "Mamascota",
      url: "https://mamascota.com/",
      logo: "https://mamascota.com/apple-touch-icon.png"
    },
    {
      "@type": "WebApplication",
      "@id": "https://mamascota.com/#app",
      name: "Mamascota",
      url: "https://mamascota.com/",
      publisher: {
        "@id": "https://mamascota.com/#organization"
      },
      applicationCategory: "HealthApplication",
      operatingSystem: "Web, iOS, Android",
      description:
        "Mamascota helps people caring for pets observe changes more accurately, organize symptoms, communicate clearly with veterinary professionals across language barriers, and prepare structured information for veterinary care. Mamascota does not diagnose, prescribe medication, or replace professional veterinary care.",
      inLanguage: ["bg", "de", "en", "es", "fr", "he", "it", "ka", "pl", "pt", "ru", "sr", "tr", "uk"],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
      },
    },
    {
      "@type": "FAQPage",
      "@id": "https://mamascota.com/#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Mamascota?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "Mamascota is an AI assistant that helps people caring for pets observe changes more accurately, organize symptoms, communicate more clearly with veterinary professionals, overcome language barriers, and prepare a structured veterinary report.",
          },
        },
        {
          "@type": "Question",
          name: "Does Mamascota diagnose animals?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "No. Mamascota does not diagnose, prescribe medication, or replace professional veterinary care. It helps prepare information for a veterinary consultation.",
          },
        },
        {
          "@type": "Question",
          name: "What knowledge does Mamascota use?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "Mamascota uses a specialized veterinary knowledge base that supports structured observation, symptom clarification, urgent-sign navigation, clearer communication with veterinary professionals, and preparation of veterinary reports.",
          },
        },
      ],
    },
  ],
};

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-5TWMPXB7');`,
          }}
        />

        <title>Mamascota — AI for clearer veterinary communication</title>
        <meta
          name="description"
          content="Mamascota helps people caring for pets observe changes, organize symptoms, communicate across language barriers, and prepare for veterinary care. It does not diagnose."
        />
        <link rel="canonical" href="https://mamascota.com/" />

        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="Mamascota — Better observation and clearer veterinary communication"
        />
        <meta
          property="og:description"
          content="An AI assistant that helps people observe changes, organize symptoms, communicate across language barriers, and prepare clear information for veterinary care."
        />
        <meta property="og:url" content="https://mamascota.com/" />
        <meta name="twitter:card" content="summary" />

        <meta
          name="keywords"
          content="veterinary communication, pet observation, structured symptom consultation, multilingual veterinary communication, veterinary report, language barrier support, Mamascota"
        />

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4285F4" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(seoJsonLd) }}
        />

        <script dangerouslySetInnerHTML={{ __html: sw }} />

        <ScrollViewStyleReset />
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5TWMPXB7"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}

const sw = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function (error) {
      console.error('Service Worker registration failed:', error);
    });
  });
}
`;
