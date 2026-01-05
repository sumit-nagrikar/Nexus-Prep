import { useInterviewStore } from "./store/interviewStore";

export const speakTextWithTTS = (text: string): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }

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
      resolve();
    };

    utterance.onerror = () => {
      store.setIsAISpeaking(false);
      store.setBrowserUtterance(null);
      resolve();
    };

    speechSynthesis.speak(utterance);
  });
};
