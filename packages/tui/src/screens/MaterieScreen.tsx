import type { Materia } from "@classeviva/core";
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { ErrorBox } from "../components/ErrorBox.js";
import { Header } from "../components/Header.js";
import { Loading } from "../components/Loading.js";

interface MaterieScreenProps {
  utente: string;
  fetchMaterie: () => Promise<Materia[]>;
  onBack: () => void;
}

export function MaterieScreen({
  utente,
  fetchMaterie,
  onBack,
}: MaterieScreenProps) {
  const [materie, setMaterie] = useState<Materia[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMaterie()
      .then(setMaterie)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      )
      .finally(() => setLoading(false));
  }, []);

  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  return (
    <Box flexDirection="column">
      <Header utente={utente} />

      <Box flexDirection="column" paddingX={2}>
        <Box marginBottom={1}>
          <Text bold>Materie</Text>
        </Box>

        {loading && <Loading label="Recupero materie..." />}
        {error && <ErrorBox message={error} />}

        {materie && !loading && (
          <>
            <Box borderStyle="single" borderColor="gray">
              <Text color="cyan" bold>
                {" ID    "}
              </Text>
              <Text color="cyan" bold>
                {"Materia                    "}
              </Text>
              <Text color="cyan" bold>
                {"Docente"}
              </Text>
            </Box>
            {materie.map((m) => (
              <Box key={m.id}>
                <Text color="gray">{" " + String(m.id).padEnd(6)}</Text>
                <Text color="white">{m.description.padEnd(27)}</Text>
                <Text color="green">{m.teachers[0]?.teacherName ?? ""}</Text>
              </Box>
            ))}
            <Box marginTop={1}>
              <Text color="gray" dimColor>
                {materie.length} materie · Esc torna al menu
              </Text>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
