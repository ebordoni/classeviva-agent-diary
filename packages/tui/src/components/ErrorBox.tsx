import { Box, Text } from "ink";

interface ErrorBoxProps {
  message: string;
  hint?: string;
}

export function ErrorBox({ message, hint }: ErrorBoxProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="red"
      paddingX={1}
      marginY={1}
    >
      <Text color="red" bold>
        ✗ {message}
      </Text>
      {hint && (
        <Text color="gray" dimColor>
          {hint}
        </Text>
      )}
    </Box>
  );
}
