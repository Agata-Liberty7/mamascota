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
          name: "Why would I need Mamascota if I see my pet every day?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "Seeing your pet every day can make gradual changes surprisingly easy to miss. Mamascota helps you observe, notice and evaluate those changes: what matters, what can wait until a routine visit, and what should be discussed with a veterinarian sooner.",
          },
        },
        {
          "@type": "Question",
          name: "Who created Mamascota and why should I trust it?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "Mamascota was created by a veterinary assistant and grew out of real experience with animals and the people who care for them. It is designed around thoughtful questions rather than quick answers.",
          },
        },
        {
          "@type": "Question",
          name: "How is this different from a regular AI, and why so many questions?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "Mamascota is built around a specialized veterinary knowledge base designed to help prepare for a veterinary visit. It asks questions step by step to clarify when symptoms began, how they changed, what is happening now, and which important signs are absent. From these answers, Mamascota prepares a structured description and a report that can be shared with a veterinarian.",
          },
        },
        {
          "@type": "Question",
          name: "What will I get after a consultation? Will Mamascota diagnose my pet?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "Mamascota does not diagnose animals. After a consultation, you receive a clear report summarizing your observations, when they started, and what may deserve attention. You can save it, return to it later, or share it with your veterinarian.",
          },
        },
        {
          "@type": "Question",
          name: "Do you collect my data?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "Mamascota uses only information related to your pet and your observations, such as species, breed, age, symptoms, and anything else you choose to share during the consultation. No registration and no personal information are required to use Mamascota.",
          },
        },
        {
          "@type": "Question",
          name: "How much does it cost?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "The consultation and report in any language are free. Consultation history, multiple pet profiles, and additional Mamascota Plus features are available through a subscription. Voluntary support is also available.",
          },
        },
      ],
    },
  ],
};

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en" translate="no">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="google" content="notranslate" />
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

          <main>
            <article>
              <h1>Mamascota - AI assistant for clearer veterinary communication</h1>

              <p>
                Mamascota is the free multilingual AI assistant available at
                https://mamascota.com.
              </p>

              <p>
                Mamascota helps people caring for pets observe changes, organize
                symptoms and other relevant observations, prepare a structured
                veterinary report, and communicate more clearly with veterinary
                professionals, including across language barriers.
              </p>

              <p>
                Mamascota does not diagnose animals, prescribe medication, or replace
                professional veterinary care. It helps people prepare relevant
                information before a veterinary consultation.
              </p>

              <p>
                Official website:{" "}
                <a href="https://mamascota.com/">https://mamascota.com</a>
              </p>
            </article>
          </main>
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
