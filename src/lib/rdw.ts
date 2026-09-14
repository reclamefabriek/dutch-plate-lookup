export type VehicleInfo = {
  kenteken: string;
  merk: string;
  model: string;
  kleur: string;
  bouwjaar: string;
  apkTot: string | null;
  brandstof: string | null;
};

/** Strip everything but letters/digits and uppercase it. */
export function normalizePlate(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
}

/** Group into letter/digit blocks and join with dashes (NL sidecode look). */
export function formatPlate(value: string) {
  const raw = normalizePlate(value);
  const groups = raw.match(/\d+|[A-Z]+/g);
  return groups ? groups.join("-") : raw;
}

function titleCase(input: string) {
  return input
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** RDW dates come as YYYYMMDD. */
function parseRdwDate(value?: string) {
  if (!value || value.length < 8) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDutchDate(date: Date) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

type RdwVehicle = {
  kenteken?: string;
  merk?: string;
  handelsbenaming?: string;
  eerste_kleur?: string;
  datum_eerste_toelating?: string;
  vervaldatum_apk?: string;
};

type RdwFuel = { brandstof_omschrijving?: string };

const BASE = "https://opendata.rdw.nl/resource";

export async function fetchVehicle(plate: string): Promise<VehicleInfo> {
  const kenteken = normalizePlate(plate);
  if (kenteken.length < 6) {
    throw new Error("Vul een volledig kenteken in.");
  }

  const res = await fetch(`${BASE}/m9d7-ebf2.json?kenteken=${kenteken}`);
  if (!res.ok) throw new Error("De kentekenservice is even niet bereikbaar. Probeer het opnieuw.");

  const rows = (await res.json()) as RdwVehicle[];
  const car = rows[0];
  if (!car) throw new Error("Ik kan dit kenteken niet vinden. Klopt hij helemaal?");

  let brandstof: string | null = null;
  try {
    const fuelRes = await fetch(`${BASE}/8ys7-d773.json?kenteken=${kenteken}`);
    if (fuelRes.ok) {
      const fuelRows = (await fuelRes.json()) as RdwFuel[];
      brandstof = fuelRows[0]?.brandstof_omschrijving
        ? titleCase(fuelRows[0].brandstof_omschrijving)
        : null;
    }
  } catch {
    brandstof = null;
  }

  const firstAdmission = parseRdwDate(car.datum_eerste_toelating);
  const apk = parseRdwDate(car.vervaldatum_apk);

  return {
    kenteken: formatPlate(kenteken),
    merk: titleCase(car.merk ?? "Onbekend"),
    model: titleCase(car.handelsbenaming ?? ""),
    kleur: (car.eerste_kleur ?? "").toLowerCase(),
    bouwjaar: firstAdmission ? String(firstAdmission.getUTCFullYear()) : "",
    apkTot: apk ? formatDutchDate(apk) : null,
    brandstof,
  };
}
