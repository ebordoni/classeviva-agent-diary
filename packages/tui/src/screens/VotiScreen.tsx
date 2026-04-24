import type { Voto } from "@classeviva/core";
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { ErrorBox } from "../components/ErrorBox.js";
import { Header } from "../components/Header.js";
import { Loading } from "../components/Loading.js";

interface VotiScreenProps {
  utente: string;
  fetchVoti: () => Promise<Voto[]>;
  onBack: () => void;
}

function coloreVoto(valore: number): string {
  if (valore >= 7) return "green";
  if (valore >= 6) return "yellow";
  return "red";
}

export function VotiScreen({ utente, fetchVoti, onBack }: VotiScreenProps) {
  const [voti, setVoti] = useState<Voto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scroll, setScroll] = useState(0);
  const PAGE_SIZE = 14;

  useEffect(() => {
    fetchVoti()
      .then(setVoti)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      )
      .finally(() => setLoading(false));
  }, []);

  useInput((_input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
    if (key.downArrow && voti)
      setScroll((s) => Math.min(s + 1, Math.max(0, voti.length - PAGE_SIZE)));
    if (key.upArrow) setScroll((s) => Math.max(0, s - 1));
  });

  // Calcola medie per materia
  const medie = voti
    ? Object.entries(
        voti.reduce<Record<string, number[]>>((acc, v) => {
          const materia = v.subjectDesc;
          const val = v.decimalValue;
          if (!isNaN(val)) {
            acc[materia] = [...(acc[materia] ?? []), val];
          }
          return acc;
        }, {}),
      ).map(([materia, vals]) => ({
        materia,
        media: vals.reduce((a, b) => a + b, 0) / vals.length,
        num: vals.length,
      }))
    : [];

  const paginate = (items: Voto[]) => items.slice(scroll, scroll + PAGE_SIZE);

  return (
    <Box flexDirection="column">
      <Header utente={utente} />

      <Box paddingX={2} gap={4} flexDirection="row">
        {/* Colonna voti */}
        <Box flexDirection="column" flexGrow={1}>
          <Box marginBottom={1}>
            <Text bold>Voti</Text>
          </Box>

          {loading && <Loading label="Recupero voti..." />}
          {error && <ErrorBox message={error} />}

          {voti && !loading && (
            <>
              <Box borderStyle="single" borderColor="gray">
                <Text color="cyan" bold>
                  {" Data       "}
                </Text>
                <Text color="cyan" bold>
                  {"Materia              "}
                </Text>
                <Text color="cyan" bold>
                  {"Voto "}
                </Text>
                <Text color="cyan" bold>
                  {"Tipo"}
                </Text>
              </Box>
              {paginate(voti).map((v, i) => {
                const val = v.decimalValue;
                return (
                  <Box key={i}>
                    <Text>{" " + v.evtDate + "  "}</Text>
                    <Text color="white">
                      {v.subjectDesc.substring(0, 20).padEnd(21, " ")}
                    </Text>
                    <Text color={isNaN(val) ? "white" : coloreVoto(val)} bold>
                      {v.displayValue.padEnd(5, " ")}
                    </Text>
                    <Text color="gray">{v.evtCode}</Text>
                  </Box>
                );
              })}
              <Box marginTop={1}>
                <Text color="gray" dimColor>
                  {voti.length} voti · ↑↓ scorre · Esc torna al menu
                </Text>
              </Box>
            </>
          )}
        </Box>

        {/* Colonna medie */}
        {medie.length > 0 && (
          <Box flexDirection="column" minWidth={28}>
            <Box marginBottom={1}>
              <Text bold>Medie per materia</Text>
            </Box>
            {medie
              .sort((a, b) => b.media - a.media)
              .map(({ materia, media, num }) => (
                <Box key={materia} gap={1}>
                  <Text color="gray">
                    {materia.substring(0, 16).padEnd(17)}
                  </Text>
                  <Text color={coloreVoto(media)} bold>
                    {media.toFixed(2)}
                  </Text>
                  <Text color="gray" dimColor>
                    ({num})
                  </Text>
                </Box>
              ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
