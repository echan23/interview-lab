import axios from "axios";
import LANGUAGE_VERSIONS from "../data/LANGUAGE_VERSIONS.json";

const API = axios.create({
  baseURL: import.meta.env.VITE_PISTON_URL
});

/*
Piston names unnamed files `file0.code`. Interpreters (python/node) don't care
about the extension, but gcc/g++/go/javac reject files without the proper one,
so compiled languages need an explicit file name. Java's single-file launcher
additionally requires the public class to be named like the file (Main).
*/
const FILE_NAMES: Record<string, string> = {
  python: "main.py",
  javascript: "main.js",
  java: "Main.java",
  c: "main.c",
  cpp: "main.cpp",
  go: "main.go",
};

export const executeCode = async (language: string, sourceCode: string) => {
  console.log("Attempting to compile input: ", sourceCode);
  const response = await API.post("/execute", {
    language: language,
    version: LANGUAGE_VERSIONS[language as keyof typeof LANGUAGE_VERSIONS],
    files: [
      {
        name: FILE_NAMES[language],
        content: sourceCode,
      },
    ],
  });
  console.log(response.data);
  return response.data;
};
