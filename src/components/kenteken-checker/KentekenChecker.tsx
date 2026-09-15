import { useState } from "react";
import {
  ArrowRight,
  ClipboardCheck,
  Wrench,
  Snowflake,
  Volume2,
  AlertTriangle,
  HelpCircle,
  Loader2,
  Check,
} from "lucide-react";
import { fetchVehicle, formatPlate, normalizePlate, type VehicleInfo } from "@/lib/rdw";
import { cn } from "@/lib/utils";

export type KentekenRequest = {
  plate: string;
  vehicle: VehicleInfo;
  service: string;
  name: string;
  phone: string;
  note: string;
};

type Props = {
  /** Optionele handler die ook wordt aangeroepen na een geslaagde verzending. */
  onSubmit?: (request: KentekenRequest) => Promise<void> | void;
  /** Basis-URL van de API, bijv. wanneer de component op een ander domein staat. */
  apiBase?: string;
  className?: string;
};


type Service = { id: string; title: string; subtitle: string; icon: typeof Wrench };

const KNOWN: Service[] = [
  { id: "apk", title: "APK-keuring", subtitle: "De wettelijke keuring", icon: ClipboardCheck },
  { id: "onderhoud", title: "Onderhoudsbeurt", subtitle: "Kleine of grote beurt", icon: Wrench },
  { id: "airco", title: "Airco service", subtitle: "Bijvullen en nakijken", icon: Snowflake },
];

const ISSUES: Service[] = [
  { id: "geluid", title: "Een vreemd geluid", subtitle: "Gerammel, gepiep of getik", icon: Volume2 },
  {
    id: "lampje",
    title: "Lampje op mijn dashboard",
    subtitle: "Ik weet niet wat het betekent",
    icon: AlertTriangle,
  },
  { id: "anders", title: "Iets anders", subtitle: "Ik leg het je zelf even uit", icon: HelpCircle },
];

function ServiceCard({ service, onClick }: { service: Service; onClick: () => void }) {
  const Icon = service.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 text-left transition-all hover:border-primary/40 hover:shadow-[0_8px_24px_-16px_oklch(0_0_0/0.35)]"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-primary transition-colors group-hover:bg-primary/10">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-foreground">{service.title}</span>
        <span className="block truncate text-sm text-muted-foreground">{service.subtitle}</span>
      </span>
    </button>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

export function KentekenChecker({ onSubmit, apiBase = "", className }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [plate, setPlate] = useState("");
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const found = await fetchVehicle(plate);
      setVehicle(found);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep(1);
    setVehicle(null);
    setService(null);
    setError(null);
    setFormError(null);
    setName("");
    setPhone("");
    setNote("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!vehicle || !service) return;
    if (name.trim().length < 2) return setFormError("Vul je voornaam in.");
    if (phone.replace(/\D/g, "").length < 9) return setFormError("Vul een geldig mobiel nummer in.");
    setFormError(null);
    setLoading(true);
    try {
      const request: KentekenRequest = {
        plate: vehicle.kenteken,
        vehicle,
        service: service.title,
        name: name.trim(),
        phone: phone.trim(),
        note: note.trim(),
      };

      const response = await fetch(`${apiBase}/api/public/kenteken-aanvraag`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plate: vehicle.kenteken,
          car: `${vehicle.merk} ${vehicle.model}`.trim(),
          bouwjaar: vehicle.bouwjaar,
          kleur: vehicle.kleur,
          brandstof: vehicle.brandstof ?? "",
          apkTot: vehicle.apkTot ?? "",
          service: service.title,
          name: request.name,
          phone: request.phone,
          note: request.note,
        }),
      });
      if (!response.ok) throw new Error("send failed");

      await onSubmit?.(request);
      setStep(4);
    } catch {
      setFormError("Het versturen lukte niet. Probeer het nog een keer.");
    } finally {
      setLoading(false);
    }
  }


  const carName = vehicle ? `${vehicle.merk} ${vehicle.model}`.trim() : "";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border-t-4 border-primary bg-card shadow-[0_24px_60px_-40px_oklch(0_0_0/0.45)]",
        className,
      )}
    >
      {step === 1 && (
        <form onSubmit={lookup} className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:gap-10 md:p-9">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              Wat kost dat voor jouw auto?
            </h2>
            <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-0.5 inline-block size-3.5 shrink-0 rounded-full border-2 border-primary" />
              Vul je kenteken in, dan zoek ik je auto erbij. Duurt geen halve minuut.
            </p>
            {error && <p className="mt-3 text-sm font-medium text-primary">{error}</p>}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex h-14 items-stretch overflow-hidden rounded-lg border-2 border-plate-border bg-plate">
              <span className="flex w-11 flex-col items-center justify-center gap-1 bg-plate-blue text-[9px] font-bold text-plate-blue-foreground">
                <span className="block size-2 rounded-full border border-plate-blue-foreground" />
                NL
              </span>
              <input
                value={plate}
                onChange={(event) => setPlate(formatPlate(event.target.value))}
                placeholder="XX-431-N"
                aria-label="Kenteken"
                inputMode="text"
                autoCapitalize="characters"
                spellCheck={false}
                className="w-full min-w-0 bg-transparent px-4 text-center text-2xl font-extrabold tracking-[0.15em] text-plate-foreground placeholder:text-plate-foreground/35 focus:outline-none sm:w-56"
              />
            </label>
            <button
              type="submit"
              disabled={loading || normalizePlate(plate).length < 6}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-5 animate-spin" /> : null}
              Zoek mijn auto
              {!loading && <ArrowRight className="size-5" />}
            </button>
          </div>
        </form>
      )}

      {step === 2 && vehicle && (
        <div className="p-6 md:p-9">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-5">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              Een {vehicle.kleur || "onbekende"} {carName} uit {vehicle.bouwjaar}.
            </h2>
            {vehicle.apkTot && (
              <p className="text-sm text-muted-foreground">
                Je APK is nog geldig tot <strong className="text-foreground">{vehicle.apkTot}</strong>.
              </p>
            )}
          </div>

          <h3 className="mt-7 text-xl font-extrabold tracking-tight text-foreground">
            Waarmee mag ik je helpen met je {carName}?
          </h3>

          <div className="mt-6">
            <GroupLabel>Ik weet wat er moet gebeuren</GroupLabel>
            <div className="grid gap-4 md:grid-cols-3">
              {KNOWN.map((item) => (
                <ServiceCard
                  key={item.id}
                  service={item}
                  onClick={() => {
                    setService(item);
                    setStep(3);
                  }}
                />
              ))}
            </div>
          </div>

          <div className="mt-7">
            <GroupLabel>Er is iets aan de hand</GroupLabel>
            <div className="grid gap-4 md:grid-cols-3">
              {ISSUES.map((item) => (
                <ServiceCard
                  key={item.id}
                  service={item}
                  onClick={() => {
                    setService(item);
                    setStep(3);
                  }}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={reset}
            className="mt-7 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Ander kenteken
          </button>
        </div>
      )}

      {step === 3 && vehicle && service && (
        <form onSubmit={submit} className="mx-auto max-w-xl p-6 text-center md:p-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            Waar kan ik je bereiken?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Dan reken ik uit wat een {service.title.toLowerCase()} voor je {carName} kost en stuur ik
            het je toe. Vrijblijvend.
          </p>

          <div className="mt-8 grid gap-5 text-left sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Je voornaam
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Bijvoorbeeld Sanne"
                maxLength={60}
                className="h-13 w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Je mobiele nummer
              </span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="06 12 34 56 78"
                inputMode="tel"
                maxLength={20}
                className="h-13 w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
              />
            </label>
          </div>

          <label className="mt-5 block text-left">
            <span className="mb-2 block text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Nog iets wat ik moet weten?{" "}
              <span className="font-normal tracking-normal lowercase">optioneel</span>
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Bijvoorbeeld: hij moet er voor het weekend uit."
              className="w-full resize-none rounded-lg border border-primary/40 bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
            />
          </label>

          {formError && <p className="mt-4 text-sm font-medium text-primary">{formError}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : null}
            Vraag de prijs aan
            {!loading && <ArrowRight className="size-5" />}
          </button>

          <p className="mt-4 text-xs text-muted-foreground">
            Ik gebruik je nummer alleen om hierop terug te komen. Verder niets.
          </p>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="mt-4 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Terug
          </button>
        </form>
      )}

      {step === 4 && vehicle && service && (
        <div className="mx-auto max-w-xl p-8 text-center md:p-12">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="size-7" />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-foreground">
            Dankjewel, {name.split(" ")[0]}!
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Ik kijk naar de {service.title.toLowerCase()} voor je {carName} ({vehicle.kenteken}) en
            bel of app je op {phone}.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Nog een auto checken
          </button>
        </div>
      )}
    </section>
  );
}

export default KentekenChecker;
