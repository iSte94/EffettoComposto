import type { AiChatMessage } from "@/lib/ai/providers";

interface SessionState {
    messages: AiChatMessage[];
    userDataJson: string | null;
    dataBytes: number;
}

let state: SessionState = {
    messages: [],
    userDataJson: null,
    dataBytes: 0,
};

const listeners = new Set<() => void>();

export function getSessionState(): SessionState {
    return state;
}

export function setSessionMessages(messages: AiChatMessage[]) {
    state = { ...state, messages };
    listeners.forEach((l) => l());
}

export function clearSessionMessages() {
    setSessionMessages([]);
}

export function setSessionUserData(json: string | null, bytes: number) {
    state = { ...state, userDataJson: json, dataBytes: bytes };
    listeners.forEach((l) => l());
}

export function subscribeSessionState(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
