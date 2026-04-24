import type { EventoAgenda } from "@classeviva/core";
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { ErrorBox } from "../components/ErrorBox.js";
import { Header } from "../components/Header.js";
import { Loading } from "../components/Loading.js";

interface AgendaScreenProps {
  utente: string;
  fetchAgenda: (giorni: number) => Promise<EventoAgenda[]>;
  onBack: () => void;
}

const TIPO_COLORE: Record<string, string> = {
  AGNT: "cyan",
  AGHT: "yellow",
  AGCM: "green",
};

const TIPO_LABEL: Record<string, string> = {
  AGNT: "Nota",
  AGHT: "Verifica",
  AGCM: "Compito",
};

const OPZIONI_GIORNI = [7, 14, 30];

export function AgendaScreen({
  utente,
  fetchAgenda,
  onBack,
}: AgendaScreenProps) {
  const [eventi, setEventi] = useState<EventoAgenda[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [giorni, setGiorni] = useState(14);
  const [scroll, setScroll] = useState(0);
  const PAGE_SIZE = 14;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setScroll(0);
    fetchAgenda(giorni)
      .then(setEventi)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      )
      .finally(() => setLoading(false));
  }, [giorni]);

  useInput((_input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
    if (key.downArrow && eventi)
      setScroll((s) => Math.min(s + 1, Math.max(0, eventi.length - PAGE_SIZE)));
    if (key.upArrow) setScroll((s) => Math.max(0, s - 1));
    if (key.leftArrow)
      setGiorni(
        (g) => OPZIONI_GIORNI[Math.max(0, OPZIONI_GIORNI.indexOf(g) - 1)] ?? g,
      );
    if (key.rightArrow)
      setGiorni(
        (g) =>
          OPZIONI_GIORNI[
            Math.min(OPZIONI_GIORNI.length - 1, OPZIONI_GIORNI.indexOf(g) + 1)
          ] ?? g,
      );
  });

  const paginate = (items: EventoAgenda[]) =>
    items.slice(scroll, scroll + PAGE_SIZE);

  return (
    <Box flexDirection="column">
      <Header utente={utente} />

      <Box flexDirection="column" paddingX={2}>
        <Box gap={2} marginBottom={1}>
          <Text bold>Agenda</Text>
          {OPZIONI_GIORNI.map((g) => (
            <Text
              key={g}
              color={g === giorni ? "cyan" : "gray"}
              bold={g === giorni}
            >
              [{g}g]
            </Text>
          ))}
          <Text color="gray" dimColor>
            ← → giorni
          </Text>
        </Box>

        {loading && <Loading label="Recupero agenda..." />}
        {error && <ErrorBox message={error} />}

        {eventi && !loading && (
          <>
            <Box borderStyle="single" borderColor="gray">
              <Text color="cyan" bold>
                {" Data       "}
              </Text>
              <Text color="cyan" bold>
                {"Tipo      "}
              </Text>
              <Text color="cyan" bold>
                {"Materia              "}
              </Text>
              <Text color="cyan" bold>
                {"Descrizione"}
              </Text>
            </Box>
            {paginate(eventi).map((e, i) => {
              const colore = (TIPO_COLORE[e.evtCode] ?? "white") as
                | "cyan"
                | "yellow"
                | "green"
                | "white";
              return (
                <Box key={i}>
                  <Text>
                    {" " + e.evtDatetimeBegin.substring(0, 10) + "  "}
                  </Text>
                  <Text color={colore}>
                    {(TIPO_LABEL[e.evtCode] ?? e.evtCode).padEnd(10)}
                  </Text>
                  <Text color="white">
                    {(e.subjectDesc ?? "").substring(0, 20).padEnd(21)}
                  </Text>
                  <Text color="gray" wrap="truncate-end">
                    {e.notes}
                  </Text>
                </Box>
              );
            })}
            <Box marginTop={1}>
              <Text color="gray" dimColor>
                {eventi.length} eventi · ↑↓ scorre · Esc torna al menu
              </Text>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
