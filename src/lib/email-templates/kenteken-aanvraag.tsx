import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  plate?: string;
  car?: string;
  bouwjaar?: string;
  kleur?: string;
  brandstof?: string;
  apkTot?: string;
  service?: string;
  name?: string;
  phone?: string;
  note?: string;
}

const Row = ({ label, value }: { label: string; value: string | undefined }) =>
  value ? (
    <Text style={row}>
      <span style={rowLabel}>{label}</span>
      <span style={rowValue}>{value}</span>
    </Text>
  ) : null;


const Email = ({
  plate,
  car,
  bouwjaar,
  kleur,
  brandstof,
  apkTot,
  service,
  name,
  phone,
  note,
}: Props) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>
      {`Nieuwe aanvraag${name ? ` van ${name}` : ""}${plate ? ` — ${plate}` : ""}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Nieuwe aanvraag via de kenteken checker</Heading>
        <Text style={intro}>
          {name ? `${name} heeft` : "Iemand heeft"} het formulier ingevuld
          {service ? ` voor: ${service}.` : "."}
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>Contact</Text>
          <Row label="Naam" value={name} />
          <Row label="Telefoon" value={phone} />
          <Row label="Onderwerp" value={service} />
          {note ? (
            <>
              <Hr style={hr} />
              <Text style={rowLabel}>Toelichting</Text>
              <Text style={noteStyle}>{note}</Text>
            </>
          ) : null}
        </Section>

        <Section style={card}>
          <Text style={cardTitle}>Auto</Text>
          <Row label="Kenteken" value={plate} />
          <Row label="Auto" value={car} />
          <Row label="Bouwjaar" value={bouwjaar} />
          <Row label="Kleur" value={kleur} />
          <Row label="Brandstof" value={brandstof} />
          <Row label="APK tot" value={apkTot} />
        </Section>

        <Text style={footer}>
          Deze melding is automatisch verstuurd vanuit de kenteken checker.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Nieuwe aanvraag: ${data['service'] ?? "kenteken checker"}${data['plate'] ? ` (${data['plate']})` : ""}`,
  displayName: "Kenteken aanvraag (intern)",
  previewData: {
    plate: "XX-431-N",
    car: "Volkswagen Golf",
    bouwjaar: "2016",
    kleur: "Grijs",
    brandstof: "Benzine",
    apkTot: "12-03-2027",
    service: "APK-keuring",
    name: "Sanne",
    phone: "06 12345678",
    note: "Graag in de ochtend bellen.",
  },
} satisfies TemplateEntry;

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
  color: "#18181b",
};
const container = { padding: "28px 24px", maxWidth: "560px" };
const heading = { fontSize: "22px", fontWeight: 800 as const, margin: "0 0 8px" };
const intro = { fontSize: "15px", lineHeight: "24px", color: "#52525b", margin: "0 0 20px" };
const card = {
  border: "1px solid #e4e4e7",
  borderRadius: "12px",
  padding: "16px 18px",
  marginBottom: "16px",
};
const cardTitle = {
  fontSize: "11px",
  letterSpacing: "1.5px",
  textTransform: "uppercase" as const,
  fontWeight: 700 as const,
  color: "#71717a",
  margin: "0 0 10px",
};
const row = { fontSize: "15px", lineHeight: "22px", margin: "0 0 6px" };
const rowLabel = { color: "#71717a", display: "inline-block", minWidth: "110px" };
const rowValue = { fontWeight: 600 as const, color: "#18181b" };
const noteStyle = { fontSize: "15px", lineHeight: "22px", margin: "4px 0 0", whiteSpace: "pre-wrap" as const };
const hr = { borderColor: "#e4e4e7", margin: "12px 0" };
const footer = { fontSize: "12px", color: "#a1a1aa", margin: "8px 0 0" };
