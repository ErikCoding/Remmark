"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SpeechRecognitionResultItem = {
  transcript: string;
};

type SpeechRecognitionResult = {
  0?: SpeechRecognitionResultItem;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResult>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function useSpeechRecognition(onResult: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const instance = useRef<SpeechRecognitionLike | null>(null);

  const Recognition = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const speechWindow = window as WindowWithSpeech;
    return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
  }, []);

  useEffect(() => {
    setSupported(Boolean(Recognition));
  }, [Recognition]);

  function start() {
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "pl-PL";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript)
        .filter(Boolean)
        .join(" ");
      if (transcript) onResult(transcript);
    };
    instance.current = recognition;
    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  }

  function stop() {
    instance.current?.stop();
    setListening(false);
  }

  return { supported, listening, start, stop };
}
