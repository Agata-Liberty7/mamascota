import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const seoJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://mamascota.com/#app",
      name: "Mamascota",
      url: "https://mamascota.com/",
      applicationCategory: "HealthApplication",
      operatingSystem: "Web, iOS, Android",
      description:
        "Mamascota helps people caring for animals prepare for a veterinary visit by collecting observations, asking structured questions, and creating a veterinary report. Mamascota does not diagnose or prescribe treatment.",
      availableLanguage: ["en", "es", "ru", "fr", "de", "it", "he"],
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
              "Mamascota is a digital assistant for people caring for pets. It helps structure observations before a veterinary visit and creates a report that can be shared with a veterinarian.",
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
              "Mamascota is based on a specialized veterinary knowledge base prepared for pre-visit support, including veterinary guidelines, textbooks, clinical decision-making algorithms, and professional reference materials.",
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

        <title>Mamascota — veterinary visit preparation assistant</title>
        <meta
          name="description"
          content="Mamascota helps people caring for animals prepare for a veterinary visit, structure observations, and create a report for the veterinarian. It does not diagnose or prescribe treatment."
        />
        <link rel="canonical" href="https://mamascota.com/" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="Mamascota" />
        <meta
          property="og:description"
          content="A multilingual assistant that helps prepare for a veterinary visit and create a structured report for the veterinarian."
        />
        <meta property="og:url" content="https://mamascota.com/" />
        <meta name="twitter:card" content="summary" />

        <meta
          name="keywords"
          content="pet health assistant, veterinary visit preparation, pet symptoms, veterinary report, multilingual veterinary assistant, Mamascota"
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
      <body>{children}</body>
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
