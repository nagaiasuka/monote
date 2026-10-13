import { NativeModule, requireOptionalNativeModule } from 'expo';
import type { Draft } from './domain';
type SpeechEvents = {
  onTranscript: (event: { content: string }) => void;
  onLevel: (event: { level: number }) => void;
  onEnd: (event: { id: string; content: string; reason: string; error: string }) => void;
};
declare class SpeechModule extends NativeModule<SpeechEvents> {
  status(): Promise<{ onDevice: boolean; speech: number; microphone: number }>;
  start(
    id: string,
    bookId: string,
    createdAt: string,
    silenceEnabled: boolean,
    silenceSeconds: number,
  ): Promise<void>;
  stop(): Promise<void>;
  recover(): Promise<Draft[]>;
  discard(id: string): Promise<void>;
  announce(text: string): Promise<void>;
  consumeStartRequest(): Promise<{ id: string; createdAt: number } | null>;
  ackStartRequest(id: string): Promise<void>;
  markStartStage(id: string, stage: string): Promise<void>;
  diagnostics(): Promise<{
    active: boolean;
    applicationState: number;
    input: string[];
    output: string[];
    sampleRate: number;
    category: string;
    siriStage: string;
  }>;
}
export const speech = requireOptionalNativeModule<SpeechModule>('MonoteSpeech');
