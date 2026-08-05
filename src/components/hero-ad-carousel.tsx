import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getHeroSlides, type HeroSlide } from "@/lib/hero.functions";
import heroImg from "@/assets/hero.jpg";

const FALLBACK: HeroSlide[] = [
  {
    id: "fallback",
    image_url: heroImg,
    title: null,
    subtitle: null,
    link_url: null,
    cta_label: null,
    sort_order: 0,
    is_active: true,
  },
];

export function HeroAdCarousel() {
  const { data } = useQuery({ queryKey: ["heroSlides"], queryFn: () => getHeroSlides(), staleTime: 60_000 });
  const slides = data && data.length > 0 ? data : FALLBACK;
  const [i, setI] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  const active = slides[Math.min(i, slides.length - 1)]!;

  const inner = (
    <div className="relative aspect-[4/3] w-full">
      {slides.map((s, idx) => (
        <img
          key={s.id}
          src={s.image_url}
          alt={s.title ?? "African market seller with handmade goods"}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${idx === i ? "opacity-100" : "opacity-0"}`}
          loading={idx === 0 ? "eager" : "lazy"}
        />
      ))}
      {(active.title || active.subtitle) && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-5 text-background">
          {active.title && <div className="font-display text-lg font-bold text-primary-foreground">{active.title}</div>}
          {active.subtitle && <div className="text-sm text-primary-foreground/80">{active.subtitle}</div>}
          {active.cta_label && (
            <span className="mt-2 inline-flex rounded-full bg-gold px-3 py-1 text-xs font-semibold text-gold-foreground">
              {active.cta_label}
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-warm opacity-20 blur-3xl" />
      <div className="overflow-hidden rounded-[2rem] border shadow-elevated">
        {active.link_url ? (
          <a href={active.link_url} aria-label={active.title ?? "Featured"}>{inner}</a>
        ) : (
          inner
        )}
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Show slide ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-primary-foreground" : "w-1.5 bg-primary-foreground/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
