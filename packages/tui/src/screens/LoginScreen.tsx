import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useState } from "react";
import { ErrorBox } from "../components/ErrorBox.js";
import { Header } from "../components/Header.js";
import { Loading } from "../components/Loading.js";

interface LoginScreenProps {
  initialStudentId?: string;
  initialPassword?: string;
  onLogin: (studentId: string, password: string) => Promise<void>;
}

type Field = "studentId" | "password";

export function LoginScreen({
  initialStudentId = "",
  initialPassword = "",
  onLogin,
}: LoginScreenProps) {
  const [studentId, setStudentId] = useState(initialStudentId);
  const [password, setPassword] = useState(initialPassword);
  const [focused, setFocused] = useState<Field>("studentId");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useInput((_input, key) => {
    if (loading) return;
    if (key.tab || key.downArrow) {
      setFocused((f) => (f === "studentId" ? "password" : "studentId"));
    }
    if (key.upArrow) {
      setFocused((f) => (f === "password" ? "studentId" : "password"));
    }
    if (key.return && focused === "password") {
      void handleSubmit();
    }
  });

  async function handleSubmit() {
    if (!studentId || !password) {
      setError("Inserisci Student ID e password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onLogin(studentId, password);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Box flexDirection="column">
        <Header />
        <Loading label="Accesso in corso..." />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header />

      <Box flexDirection="column" paddingX={2} gap={1}>
        <Text bold>Accedi a Classeviva</Text>
        <Text color="gray" dimColor>
          Tab / ↑↓ per spostarsi · Invio per accedere
        </Text>

        <Box flexDirection="column" gap={1} marginTop={1}>
          <Box gap={2} alignItems="center">
            <Text color={focused === "studentId" ? "cyan" : "gray"}>
              Student ID:
            </Text>
            <TextInput
              value={studentId}
              onChange={setStudentId}
              onSubmit={() => setFocused("password")}
              focus={focused === "studentId"}
              placeholder="es. G12345678A"
            />
          </Box>

          <Box gap={2} alignItems="center">
            <Text color={focused === "password" ? "cyan" : "gray"}>
              {"  Password:"}
            </Text>
            <TextInput
              value={password}
              onChange={setPassword}
              onSubmit={() => void handleSubmit()}
              focus={focused === "password"}
              placeholder="password"
              mask="*"
            />
          </Box>
        </Box>

        {error && <ErrorBox message={error} />}

        <Box marginTop={1}>
          <Text color="gray" dimColor>
            Le credenziali vengono lette anche da <Text color="cyan">.env</Text>
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
