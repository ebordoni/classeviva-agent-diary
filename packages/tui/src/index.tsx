#!/usr/bin/env node
import { config as loadEnv } from "dotenv";
import { render } from "ink";
import { App } from "./App.js";

loadEnv();

render(
  <App
    initialStudentId={
      process.env.CLASSEVIVA_STUDENT_ID ?? process.env.STUDENT_ID
    }
    initialPassword={process.env.CLASSEVIVA_PASSWORD ?? process.env.PASSWORD}
    aiProvider={process.env.AI_PROVIDER}
    aiModel={process.env.AI_MODEL}
    aiApiKey={process.env.AI_API_KEY}
  />,
);
