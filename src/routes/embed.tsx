import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { KentekenChecker } from "@/components/kenteken-checker/KentekenChecker";

export const Route = createFileRoute("/embed")({
  head: () => ({
    meta: [
      { title: "Kenteken checker — embed" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Embed,
});

function Embed() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const post = () => {
      window.parent?.postMessage(
        {
          type: "kenteken-checker:height",
          height: Math.ceil(el.getBoundingClientRect().height),
        },
        "*",
      );
    };
    const observer = new ResizeObserver(post);
    observer.observe(el);
    post();
    return () => observer.disconnect();
  }, []);

  return (
    <main ref={ref} className="px-2 py-2">
      <KentekenChecker
        onSubmit={(request) => {
          console.log("Aanvraag:", request);
        }}
      />
    </main>
  );
}
