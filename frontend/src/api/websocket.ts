import * as monaco from "monaco-editor";
import type { Edit, Init } from "../data/types.ts";
import { useNavigate } from "react-router-dom";

const domainName = import.meta.env.VITE_WS_URL as string;

export type StopwatchState = {
  startTime: number;
  elapsedTime: number;
  running: boolean;
};

let socket: WebSocket;
const connect = (
  roomID: string,
  onReceiveUpdate: (update: Edit[]) => void, //Callback that handles editor updates from other clients
  onReceiveInit: (update: Init) => void, //Callback that initializes local editor with codefile content when joining
  setUserCount: (count: number) => void,
  onStopwatchUpdate: (state: StopwatchState) => void,
  onQuestionUpdate: (value: string, isInit: boolean) => void, //Callback that syncs the question board from other clients
  navigate: ReturnType<typeof useNavigate>
) => {
  socket = new WebSocket(`${domainName}/ws/${roomID}`);
  socket.onopen = () => {
    console.log("socket opened successfully");
  };

  socket.onmessage = (message) => {
    console.log("Received message from websocket:", message.data);
    const raw = JSON.parse(message.data);
    //Note: Edit[] objects don't have a type field
    if (raw.type === "init") {
      onReceiveInit(raw);
    } else if (raw.type == "userCountUpdate") {
      console.log("received usercount update");
      setUserCount(raw.count);
    } else if (raw.type === "stopwatchUpdate") {
      onStopwatchUpdate({
        startTime: raw.startTime,
        elapsedTime: raw.elapsedTime,
        running: raw.running,
      });
    } else if (raw.type === "questionUpdate") {
      onQuestionUpdate(raw.value, false);
    } else if (raw.type === "questionInit") {
      onQuestionUpdate(raw.value, true);
    } else {
      onReceiveUpdate(raw);
    }
  };
  socket.onclose = (event) => {
    console.log("Socket connection closing");
    if (event.code === 1006) {
      console.log("Socket closed by server");
      navigate("/", { replace: true });
    }
  };

  socket.onerror = (error) => {
    console.log("Error:", error);
  };

  return socket;
};

//Convert update object to json
const sendUpdate = (update: monaco.editor.IModelContentChangedEvent) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log(
      "Sending update :" + update,
      "readystate: " + socket.readyState
    );
    socket.send(JSON.stringify(update.changes));
  } else {
    console.error(
      "Wesocket not open: Readystate: " + (socket?.readyState ?? "unddefined")
    );
  }
};

const sendStopwatchEvent = (eventType: "start" | "stop" | "reset") => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(
      JSON.stringify({ type: "stopwatch", eventType, eventTime: Date.now() })
    );
  }
};

const sendQuestionUpdate = (value: string) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "question", value }));
  }
};

const disconnect = () => {
  if (socket) {
    socket.close();
  }
};

export default connect;
export { sendUpdate, disconnect, sendStopwatchEvent, sendQuestionUpdate };
