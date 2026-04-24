import { Box, Text } from "ink";

interface HeaderProps {
  utente?: string;
}

export function Header({ utente }: HeaderProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box borderStyle="round" borderColor="cyan" paddingX={2}>
        <Text bold color="cyan">
          Classeviva TUI v2.0
        </Text>
        {utente && (
          <Text>
            {"  "}
            <Text color="gray">│</Text>
            {"  "}
            <Text color="green">{utente}</Text>
          </Text>
        )}
      </Box>
    </Box>
  );
}
