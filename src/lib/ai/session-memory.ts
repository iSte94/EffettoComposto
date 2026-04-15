import type { AiChatMessage, AiToolTraceEntry } from "@/lib/ai/providers";

export interface ChatTurn {
    message: AiChatMessage;
    tools?: AiToolTraceEntry[];
}

interface SessionState {
    turns: ChatTurn[];
    userDataJson: string | null;
    dataBytes: number;
}

let state: SessionState = {
    turns: [],
    userDataJson: null,
    dataBytes: 0,
};

const listeners = new Set<() => void>();

export function getSessionState(): SessionState {
    return state;
}

export function setSessionTurns(turns: ChatTurn[]) {
    state = { ...state, turns };
    listeners.forEach((l) => l());
}

export function appendTurn(turn: ChatTurn) {
    setSessionTurns([...state.turns, turn]);
}

export function clearSessionMessages() {
    setSessionTurns([]);
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

// Helper: estrae i soli AiChatMessage dalla lista turni (per il prossimo invio).
export function turnsToMessages(turns: ChatTurn[]): AiChatMessage[] {
    return turns.map((t) => t.message);
}
