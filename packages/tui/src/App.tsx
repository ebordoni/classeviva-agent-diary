import type { AIProvider } from "@classeviva/core";
import { AIService, ClassevivaClient, ultimiNGiorni } from "@classeviva/core";
import { useApp } from "ink";
import { useState } from "react";
import { AgendaScreen } from "./screens/AgendaScreen.js";
import { AssenzeScreen } from "./screens/AssenzeScreen.js";
import { CompitiScreen } from "./screens/CompitiScreen.js";
import { LezioniScreen } from "./screens/LezioniScreen.js";
import { LoginScreen } from "./screens/LoginScreen.js";
import { MaterieScreen } from "./screens/MaterieScreen.js";
import type { MenuVoce } from "./screens/MenuScreen.js";
import { MenuScreen } from "./screens/MenuScreen.js";
import { VotiScreen } from "./screens/VotiScreen.js";

type Schermata =
  | "login"
  | "menu"
  | "lezioni"
  | "voti"
  | "assenze"
  | "agenda"
  | "compiti"
  | "materie";

interface AppProps {
  initialStudentId?: string;
  initialPassword?: string;
  aiProvider?: string;
  aiModel?: string;
  aiApiKey?: string;
}

export function App({
  initialStudentId,
  initialPassword,
  aiProvider,
  aiModel,
  aiApiKey,
}: AppProps) {
  const { exit } = useApp();
  const [schermata, setSchermata] = useState<Schermata>("login");
  const [client, setClient] = useState<ClassevivaClient | null>(null);
  const [nomeUtente, setNomeUtente] = useState("");

  async function handleLogin(studentId: string, password: string) {
    const c = new ClassevivaClient(studentId, password);
    await c.accedi();
    setClient(c);
    setNomeUtente(c.nomeCompleto ?? "");
    setSchermata("menu");
  }

  function handleMenuSelect(voce: MenuVoce) {
    if (voce === "esci") {
      exit();
      return;
    }
    setSchermata(voce);
  }

  const goMenu = () => setSchermata("menu");

  if (schermata === "login") {
    return (
      <LoginScreen
        initialStudentId={initialStudentId}
        initialPassword={initialPassword}
        onLogin={handleLogin}
      />
    );
  }

  if (!client) return null;

  if (schermata === "menu") {
    return <MenuScreen utente={nomeUtente} onSelect={handleMenuSelect} />;
  }

  if (schermata === "lezioni") {
    return (
      <LezioniScreen
        utente={nomeUtente}
        fetchLezioni={async (giorni) => {
          const { inizio, fine } = ultimiNGiorni(giorni);
          const r = await client.lezioniDaA(inizio, fine);
          return r.lessons;
        }}
        onBack={goMenu}
      />
    );
  }

  if (schermata === "voti") {
    return (
      <VotiScreen
        utente={nomeUtente}
        fetchVoti={async () => {
          const r = await client.voti();
          return r.grades;
        }}
        onBack={goMenu}
      />
    );
  }

  if (schermata === "assenze") {
    return (
      <AssenzeScreen
        utente={nomeUtente}
        fetchAssenze={async () => {
          const r = await client.assenze();
          return r.events;
        }}
        onBack={goMenu}
      />
    );
  }

  if (schermata === "agenda") {
    return (
      <AgendaScreen
        utente={nomeUtente}
        fetchAgenda={async (giorni) => {
          const { inizio, fine } = ultimiNGiorni(giorni);
          const r = await client.agendaDaA(inizio, fine);
          return r.agenda;
        }}
        onBack={goMenu}
      />
    );
  }

  if (schermata === "compiti") {
    const ai = new AIService({
      provider: aiProvider as AIProvider | undefined,
      model: aiModel,
      apiKey: aiApiKey,
    });
    return (
      <CompitiScreen
        utente={nomeUtente}
        fetchCompiti={async (giorni) => {
          const { inizio, fine } = ultimiNGiorni(giorni);
          const lezioni = await client.lezioniDaA(inizio, fine);
          const res = await ai.estraiCompiti(lezioni);
          return res.compiti;
        }}
        modello={aiModel ?? aiProvider}
        onBack={goMenu}
      />
    );
  }

  if (schermata === "materie") {
    return (
      <MaterieScreen
        utente={nomeUtente}
        fetchMaterie={async () => {
          const r = await client.materie();
          return r.subjects;
        }}
        onBack={goMenu}
      />
    );
  }

  return null;
}
