import axios from "axios";
import LANGUAGE_VERSIONS from "../data/LANGUAGE_VERSIONS.json";

const pistonDomain = import.meta.env.VITE_PISTON_URL;
const API = axios.create({
  baseURL: `http://${pistonDomain}/api/v2`,
});

export const executeCode = async (language: string, sourceCode: string) => {
  console.log("Attempting to compile input: ", sourceCode);
  const response = await API.post("/execute", {
    language: language,
    version: LANGUAGE_VERSIONS[language as keyof typeof LANGUAGE_VERSIONS],
    files: [
      {
        content: sourceCode,
      },
    ],
  });
  console.log(response.data);
  return response.data;
};
