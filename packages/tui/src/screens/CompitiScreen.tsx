import type { CompitoEstratto } from "@classeviva/core";
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { ErrorBox } from "../components/ErrorBox.js";
import { Header } from "../components/Header.js";
import { Loading } from "../components/Loading.js";

interface CompitiScreenProps {
  utente: string;
  fetchCompiti: (giorni: number) => Promise<CompitoEstratto[]>;
  modello?: string;
  onBack: () => void;
}

const OPZIONI_GIORNI = [7, 10, 14, 30];

export function CompitiScreen({
  utente,
  fetchCompiti,
  modello,
  onBack,
}: CompitiScreenProps) {
  const [compiti, setCompiti] = useState<CompitoEstratto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [giorni, setGiorni] = useState(10);
  const [_scroll, setScroll] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setScroll(0);
    fetchCompiti(giorni)
      .then(setCompiti)
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
    if (key.downArrow && compiti)
      setScroll((s) =>
        Math.min(s + 1, Math.max(0, compiti.length - PAGE_SIZE)),
      );
    if (key.upArrow) setScroll((s) => Math.max(0, s - 1));
    if (!loading) {
      if (key.leftArrow)
        setGiorni(
          (g) =>
            OPZIONI_GIORNI[Math.max(0, OPZIONI_GIORNI.indexOf(g) - 1)] ?? g,
        );
      if (key.rightArrow)
        setGiorni(
          (g) =>
            OPZIONI_GIORNI[
              Math.min(OPZIONI_GIORNI.length - 1, OPZIONI_GIORNI.indexOf(g) + 1)
            ] ?? g,
        );
    }
  });

  const per_materia = compiti
    ? Object.entries(
        compiti.reduce<Record<string, CompitoEstratto[]>>((acc, c) => {
          acc[c.materia] = [...(acc[c.materia] ?? []), c];
          return acc;
        }, {}),
      )
    : [];

  return (
    <Box flexDirection="column">
      <Header utente={utente} />

      <Box flexDirection="column" paddingX={2}>
        <Box gap={2} marginBottom={1} flexWrap="wrap">
          <Text bold>Compiti AI</Text>
          {modello && <Text color="cyan">[{modello}]</Text>}
          {OPZIONI_GIORNI.map((g) => (
            <Text
              key={g}
              color={g === giorni ? "cyan" : "gray"}
              bold={g === giorni}
            >
              [{g}g]
            </Text>
          ))}
          {!loading && (
            <Text color="gray" dimColor>
              ← → giorni
            </Text>
          )}
        </Box>

        {loading && (
          <Box flexDirection="column" gap={1}>
            <Loading label="Recupero lezioni..." />
            <Text color="gray" dimColor>
              (può richiedere qualche secondo)
            </Text>
          </Box>
        )}
        {error && (
          <ErrorBox
            message={error}
            hint="Verifica la variabile AI_PROVIDER e la relativa API key nel .env"
          />
        )}

        {compiti && !loading && per_materia.length === 0 && (
          <Text color="yellow">
            Nessun compito trovato negli ultimi {giorni} giorni.
          </Text>
        )}

        {compiti && !loading && per_materia.length > 0 && (
          <Box flexDirection="column">
            {per_materia.map(([materia, items]) => (
              <Box key={materia} flexDirection="column" marginBottom={1}>
                <Text color="cyan" bold>
                  {"── " + materia + " "}
                </Text>
                {items.map((c, i) => (
                  <Box
                    key={i}
                    flexDirection="column"
                    paddingLeft={2}
                    marginBottom={0}
                  >
                    <Box gap={1}>
                      <Text color="yellow" bold>
                        {i + 1}.
                      </Text>
                      <Text wrap="wrap">{c.testo}</Text>
                    </Box>
                    <Box paddingLeft={3} gap={3}>
                      <Text color="gray" dimColor>
                        Assegnato: {c.data_lezione}
                      </Text>
                      <Text color="green" dimColor>
                        Scadenza: {c.scadenza}
                      </Text>
                    </Box>
                  </Box>
                ))}
              </Box>
            ))}
            <Box marginTop={1}>
              <Text color="gray" dimColor>
                {compiti.length} compiti · ↑↓ scorre · Esc torna al menu
              </Text>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
