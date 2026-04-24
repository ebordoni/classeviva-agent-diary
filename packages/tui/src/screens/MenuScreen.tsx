import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Header } from "../components/Header.js";

export type MenuVoce =
  | "lezioni"
  | "voti"
  | "assenze"
  | "agenda"
  | "compiti"
  | "materie"
  | "esci";

interface MenuScreenProps {
  utente: string;
  onSelect: (voce: MenuVoce) => void;
}

const VOCI = [
  { label: "📚  Lezioni", value: "lezioni" as MenuVoce },
  { label: "📝  Voti", value: "voti" as MenuVoce },
  { label: "📅  Assenze", value: "assenze" as MenuVoce },
  { label: "📌  Agenda", value: "agenda" as MenuVoce },
  { label: "🤖  Compiti (AI)", value: "compiti" as MenuVoce },
  { label: "📖  Materie", value: "materie" as MenuVoce },
  { label: "🚪  Esci", value: "esci" as MenuVoce },
];

export function MenuScreen({ utente, onSelect }: MenuScreenProps) {
  return (
    <Box flexDirection="column">
      <Header utente={utente} />

      <Box flexDirection="column" paddingX={2}>
        <Box marginBottom={1}>
          <Text bold>Menu Principale</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="gray" dimColor>
            ↑↓ per navigare · Invio per selezionare
          </Text>
        </Box>
        <SelectInput
          items={VOCI}
          onSelect={(item) => onSelect(item.value)}
          indicatorComponent={({ isSelected }) => (
            <Text color="cyan">{isSelected ? "▶ " : "  "}</Text>
          )}
          itemComponent={({ isSelected, label }) => (
            <Text color={isSelected ? "cyan" : "white"} bold={isSelected}>
              {label}
            </Text>
          )}
        />
      </Box>
    </Box>
  );
}
