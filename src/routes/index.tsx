import { createFileRoute } from "@tanstack/react-router";
import { KentekenChecker } from "@/components/kenteken-checker/KentekenChecker";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kenteken checker — prijs voor jouw auto | Autoservice" },
      {
        name: "description",
        content:
          "Vul je kenteken in, wij halen je autogegevens op via de RDW en rekenen vrijblijvend uit wat APK, onderhoud of airco service kost.",
      },
      { property: "og:title", content: "Kenteken checker — prijs voor jouw auto" },
      {
        property: "og:description",
        content: "Kenteken invullen, autogegevens uit de RDW en direct een vrijblijvende prijs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-muted/40 px-4 py-12 md:py-20">
      <div className="mx-auto max-w-5xl">
        <h1 className="sr-only">Kenteken checker</h1>
        <KentekenChecker
          onSubmit={(request) => {
            console.log("Aanvraag:", request);
          }}
        />
      </div>
    </main>
  );
}
