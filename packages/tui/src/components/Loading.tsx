import { Box, Text } from "ink";
import Spinner from "ink-spinner";

interface LoadingProps {
  label?: string;
}

export function Loading({ label = "Caricamento..." }: LoadingProps) {
  return (
    <Box gap={1}>
      <Text color="cyan">
        <Spinner type="dots" />
      </Text>
      <Text color="gray">{label}</Text>
    </Box>
  );
}
