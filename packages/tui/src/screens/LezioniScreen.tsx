import type { Lezione } from "@classeviva/core";
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { ErrorBox } from "../components/ErrorBox.js";
import { Header } from "../components/Header.js";
import { Loading } from "../components/Loading.js";

interface LezioniScreenProps {
  utente: string;
  fetchLezioni: (giorni: number) => Promise<Lezione[]>;
  onBack: () => void;
}

const OPZIONI_GIORNI = [7, 10, 14, 30];

export function LezioniScreen({
  utente,
  fetchLezioni,
  onBack,
}: LezioniScreenProps) {
  const [lezioni, setLezioni] = useState<Lezione[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [giorni, setGiorni] = useState(7);
  const [scroll, setScroll] = useState(0);

  const PAGE_SIZE = 12;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setScroll(0);
    fetchLezioni(giorni)
      .then(setLezioni)
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
    if (key.downArrow && lezioni)
      setScroll((s) =>
        Math.min(s + 1, Math.max(0, lezioni.length - PAGE_SIZE)),
      );
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

  const paginate = (items: Lezione[]) =>
    items.slice(scroll, scroll + PAGE_SIZE);

  return (
    <Box flexDirection="column">
      <Header utente={utente} />

      <Box flexDirection="column" paddingX={2}>
        <Box gap={2} marginBottom={1}>
          <Text bold>Lezioni</Text>
          <Box gap={1}>
            {OPZIONI_GIORNI.map((g) => (
              <Text
                key={g}
                color={g === giorni ? "cyan" : "gray"}
                bold={g === giorni}
              >
                [{g}g]
              </Text>
            ))}
          </Box>
          <Text color="gray" dimColor>
            ← → giorni
          </Text>
        </Box>

        {loading && <Loading label="Recupero lezioni..." />}
        {error && <ErrorBox message={error} />}

        {lezioni && !loading && (
          <>
            <Box flexDirection="column" gap={0}>
              <Box borderStyle="single" borderColor="gray">
                <Text color="cyan" bold>
                  {" Data       "}
                </Text>
                <Text color="cyan" bold>
                  {"Ora  "}
                </Text>
                <Text color="cyan" bold>
                  {"Materia              "}
                </Text>
                <Text color="cyan" bold>
                  {"Argomento"}
                </Text>
              </Box>
              {paginate(lezioni).map((l) => (
                <Box key={l.evtId}>
                  <Text>{" " + l.evtDate + "  "}</Text>
                  <Text color="yellow">
                    {"h" + String(l.evtHPos).padEnd(3, " ") + " "}
                  </Text>
                  <Text color="green">
                    {l.subjectDesc.substring(0, 20).padEnd(21, " ")}
                  </Text>
                  <Text color="gray" wrap="truncate-end">
                    {l.lessonArg}
                  </Text>
                </Box>
              ))}
            </Box>
            <Box marginTop={1}>
              <Text color="gray" dimColor>
                {lezioni.length} lezioni · Esc torna al menu · ↑↓ scorre
              </Text>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
