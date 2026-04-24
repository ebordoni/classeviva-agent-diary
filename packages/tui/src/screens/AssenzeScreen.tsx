import type { Assenza } from "@classeviva/core";
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { ErrorBox } from "../components/ErrorBox.js";
import { Header } from "../components/Header.js";
import { Loading } from "../components/Loading.js";

interface AssenzeScreenProps {
  utente: string;
  fetchAssenze: () => Promise<Assenza[]>;
  onBack: () => void;
}

const TIPO_LABEL: Record<string, string> = {
  ABA0: "Assenza",
  ABR0: "Ritardo",
  ABU0: "Uscita anticip.",
};

const TIPO_COLORE: Record<string, string> = {
  ABA0: "red",
  ABR0: "yellow",
  ABU0: "magenta",
};

export function AssenzeScreen({
  utente,
  fetchAssenze,
  onBack,
}: AssenzeScreenProps) {
  const [assenze, setAssenze] = useState<Assenza[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scroll, setScroll] = useState(0);
  const PAGE_SIZE = 15;

  useEffect(() => {
    fetchAssenze()
      .then(setAssenze)
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
    if (key.downArrow && assenze)
      setScroll((s) =>
        Math.min(s + 1, Math.max(0, assenze.length - PAGE_SIZE)),
      );
    if (key.upArrow) setScroll((s) => Math.max(0, s - 1));
  });

  const paginate = (items: Assenza[]) =>
    items.slice(scroll, scroll + PAGE_SIZE);

  const conteggi = assenze
    ? {
        assenze: assenze.filter((a) => a.evtCode === "ABA0").length,
        ritardi: assenze.filter((a) => a.evtCode === "ABR0").length,
        uscite: assenze.filter((a) => a.evtCode === "ABU0").length,
      }
    : null;

  return (
    <Box flexDirection="column">
      <Header utente={utente} />

      <Box flexDirection="column" paddingX={2}>
        <Box gap={3} marginBottom={1}>
          <Text bold>Assenze</Text>
          {conteggi && (
            <>
              <Text color="red">Assenze: {conteggi.assenze}</Text>
              <Text color="yellow">Ritardi: {conteggi.ritardi}</Text>
              <Text color="magenta">Uscite: {conteggi.uscite}</Text>
            </>
          )}
        </Box>

        {loading && <Loading label="Recupero assenze..." />}
        {error && <ErrorBox message={error} />}

        {assenze && !loading && (
          <>
            <Box borderStyle="single" borderColor="gray">
              <Text color="cyan" bold>
                {" Data       "}
              </Text>
              <Text color="cyan" bold>
                {"Tipo              "}
              </Text>
              <Text color="cyan" bold>
                {"Giustificata  "}
              </Text>
              <Text color="cyan" bold>
                {"Note"}
              </Text>
            </Box>
            {paginate(assenze).map((a, i) => (
              <Box key={i}>
                <Text>{" " + a.evtDate + "  "}</Text>
                <Text
                  color={
                    (TIPO_COLORE[a.evtCode] ?? "white") as
                      | "red"
                      | "yellow"
                      | "magenta"
                      | "white"
                  }
                >
                  {(TIPO_LABEL[a.evtCode] ?? a.evtCode).padEnd(18, " ")}
                </Text>
                <Text color={a.isJustified ? "green" : "red"}>
                  {(a.isJustified ? "✓ Sì" : "✗ No").padEnd(14, " ")}
                </Text>
                <Text color="gray" wrap="truncate-end">
                  {a.justifReasonDesc ?? ""}
                </Text>
              </Box>
            ))}
            <Box marginTop={1}>
              <Text color="gray" dimColor>
                {assenze.length} eventi · ↑↓ scorre · Esc torna al menu
              </Text>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
