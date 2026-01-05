import { useInterviewStore } from "./store/interviewStore";

export const speakTextWithTTS = (text: string) => {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  const store = useInterviewStore.getState();

  // Stop any ongoing speech
  speechSynthesis.cancel();

  store.setIsAISpeaking(true);

  const utterance = new SpeechSynthesisUtterance(text);

  // Optional tuning
  utterance.rate = 1;
  utterance.pitch = 1;

  store.setBrowserUtterance(utterance);

  utterance.onend = () => {
    store.setIsAISpeaking(false);
    store.setBrowserUtterance(null);
  };

  speechSynthesis.speak(utterance);
};
