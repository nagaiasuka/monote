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
}
export const speech = requireOptionalNativeModule<SpeechModule>('MonoteSpeech');
