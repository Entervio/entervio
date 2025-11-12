import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import type { Route } from "./+types/interview";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Entretien en cours - Entretien d'Embauche IA" },
    { name: "description", content: "Entretien d'embauche avec recruteur IA" },
  ];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

type InterviewerType = "nice" | "neutral" | "mean";

const API_BASE_URL = `http://${window.location.hostname}:8000/api/v1/voice`;

const interviewerLabels = {
  nice: { name: "Bienveillant", icon: "😊", color: "text-green-700", bg: "bg-green-50" },
  neutral: { name: "Neutre", icon: "😐", color: "text-blue-700", bg: "bg-blue-50" },
  mean: { name: "Exigeant", icon: "😤", color: "text-red-700", bg: "bg-red-50" },
};

export default function Interview() {
  const { interviewId } = useParams();
  const navigate = useNavigate();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [candidateName, setCandidateName] = useState<string>("");
  const [interviewerType, setInterviewerType] = useState<InterviewerType>("neutral");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load interview data on mount
  useEffect(() => {
    if (interviewId) {
      loadInterviewData();
    } else {
      navigate("/");
    }
  }, [interviewId, navigate]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadInterviewData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get session info
      const response = await fetch(`${API_BASE_URL}/interview/${interviewId}/info`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("Session non trouvée. Redirection...");
          setTimeout(() => navigate("/"), 2000);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setSessionId(data.session_id);
      setCandidateName(data.candidate_name);
      setInterviewerType(data.interviewer_style);
      setQuestionCount(data.question_count);
      setInterviewStarted(true);

      // Load conversation history
      await loadConversationHistory();

      setIsLoading(false);
    } catch (err) {
      console.error("Error loading interview:", err);
      setError("Impossible de charger l'entretien.");
      setIsLoading(false);
    }
  };

  const loadConversationHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/interview/${interviewId}/history`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Convert history to messages
      const loadedMessages: Message[] = data.history.map((msg: any, index: number) => ({
        id: `${Date.now()}-${index}`,
        role: msg.role === "assistant" ? "assistant" : "user",
        text: msg.content,
        timestamp: new Date(),
      }));

      setMessages(loadedMessages);

      // Play the last assistant message if it exists
      if (loadedMessages.length > 0) {
        const lastMessage = loadedMessages[loadedMessages.length - 1];
        if (lastMessage.role === "assistant" && interviewId) {
          await playAudio(interviewId, lastMessage.text);
        }
      }
    } catch (err) {
      console.error("Error loading conversation history:", err);
      // Don't show error - history is optional
    }
  };

  const playAudio = async (sid: string, text: string) => {
    try {
      setIsPlayingAudio(true);

      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      // Create audio element
      const audio = new Audio(
        `${API_BASE_URL}/interview/${sid}/audio?text=${encodeURIComponent(text)}`
      );

      currentAudioRef.current = audio;

      // Play audio
      await audio.play();

      // Wait for audio to finish
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          setIsPlayingAudio(false);
          resolve();
        };
        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          setIsPlayingAudio(false);
          reject(e);
        };
      });
    } catch (err) {
      console.error("Error playing audio:", err);
      setIsPlayingAudio(false);
      // Don't show error to user - audio is optional
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await processRecording();
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error("Microphone error:", err);
      setError("Impossible d'accéder au microphone. Veuillez autoriser l'accès.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processRecording = async () => {
    if (!sessionId || audioChunksRef.current.length === 0) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create blob from recorded chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

      // Create form data
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("language", "fr");

      // Send to API
      const response = await fetch(
        `${API_BASE_URL}/interview/${sessionId}/respond`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Update question count
      setQuestionCount(data.question_count);

      // Add user message
      const userMessage: Message = {
        id: `${Date.now()}-user`,
        role: "user",
        text: data.transcription,
        timestamp: new Date(),
      };

      // Add assistant response
      const assistantMessage: Message = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        text: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      // Play response audio
      if (sessionId) {
        await playAudio(sessionId, data.response);
      }

      setIsProcessing(false);
    } catch (err) {
      console.error("Error processing recording:", err);
      setError("Erreur lors du traitement de votre réponse. Veuillez réessayer.");
      setIsProcessing(false);
    }
  };

  const endInterview = async () => {
    if (!sessionId) return;

    try {
      setIsProcessing(true);

      const response = await fetch(
        `${API_BASE_URL}/interview/${sessionId}/end`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Add summary message
      const summaryMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        text: data.summary,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, summaryMessage]);

      // Play summary audio
      if (sessionId) {
        await playAudio(sessionId, data.summary);
      }

      setInterviewStarted(false);
      setIsProcessing(false);
    } catch (err) {
      console.error("Error ending interview:", err);
      setError("Erreur lors de la fin de l'entretien.");
      setIsProcessing(false);
    }
  };

  const restartInterview = () => {
    // Stop any playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    // Navigate back to setup
    navigate("/");
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin w-16 h-16 mx-auto mb-4 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-lg text-gray-600">Chargement de l'entretien...</p>
        </div>
      </div>
    );
  }

  // Handle missing data
  if (!interviewId || !sessionId || !candidateName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-lg p-8 max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Session introuvable</h2>
          <p className="text-gray-600 mb-6">
            Cette session d'entretien n'existe pas ou a expiré.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // Get interviewer info (with fallback)
  const interviewerInfo = interviewerLabels[interviewerType] || interviewerLabels.neutral;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🎯 Entretien d'Embauche
              </h1>
              <div className="flex items-center gap-3 text-gray-600">
                <span className="font-medium">Candidat: {candidateName}</span>
                <span className="text-gray-400">•</span>
                <div className={`flex items-center gap-1 ${interviewerInfo.color}`}>
                  <span className="text-lg">{interviewerInfo.icon}</span>
                  <span className="font-medium">{interviewerInfo.name}</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500 font-mono">
                ID: {interviewId}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    sessionId ? "bg-green-500" : "bg-gray-400"
                  } animate-pulse`}
                ></div>
                <span className="text-sm text-gray-600">
                  {sessionId ? "Actif" : "Inactif"}
                </span>
              </div>
              {interviewStarted && (
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                    Question {questionCount}/5
                  </span>
                  {isPlayingAudio && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                      <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" />
                      </svg>
                      Audio
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900"
            >
              ✕
            </button>
          </div>
        )}

        {/* Messages Container */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 h-[500px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <svg
                className="w-20 h-20 mb-4 animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="text-lg font-medium">Chargement de l'entretien...</p>
              <p className="text-sm text-center mt-2">
                Le recruteur {interviewerInfo.name.toLowerCase()} vous attend
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-6 py-3 ${
                      message.role === "user"
                        ? "bg-indigo-600 text-white"
                        : `${interviewerInfo.bg} text-gray-800 border-2 ${interviewerInfo.color.replace(
                            "text-",
                            "border-"
                          )}`
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium opacity-75">
                        {message.role === "user"
                          ? `👤 ${candidateName}`
                          : `${interviewerInfo.icon} Recruteur`}
                      </span>
                      <span className="text-xs opacity-50">
                        {message.timestamp.toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.text}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Record Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={
                !sessionId || isProcessing || !interviewStarted || isPlayingAudio
              }
              className={`flex-1 py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                isRecording
                  ? "bg-red-500 hover:bg-red-600 animate-pulse"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {isRecording ? (
                  <>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                    <span>Arrêter</span>
                  </>
                ) : isProcessing ? (
                  <>
                    <svg
                      className="animate-spin w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Traitement...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                    </svg>
                    <span>Répondre</span>
                  </>
                )}
              </div>
            </button>

            {/* End Interview Button */}
            <button
              onClick={endInterview}
              disabled={
                !sessionId ||
                !interviewStarted ||
                messages.length < 2 ||
                isProcessing
              }
              className="sm:w-auto px-6 py-4 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="hidden sm:inline">Terminer</span>
              </div>
            </button>

            {/* Restart Button */}
            {!interviewStarted && messages.length > 0 && (
              <button
                onClick={restartInterview}
                className="sm:w-auto px-6 py-4 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 transition-all duration-200"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span className="hidden sm:inline">Nouvel entretien</span>
                </div>
              </button>
            )}
          </div>

          {/* Instructions */}
          <div
            className={`mt-4 p-4 rounded-lg border-2 ${interviewerInfo.bg} ${interviewerInfo.color.replace(
              "text-",
              "border-"
            )}`}
          >
            <p className="text-sm text-gray-700">
              <strong>💡 Instructions :</strong> Attendez que le recruteur termine sa
              question (l'audio doit finir de jouer), puis cliquez sur "Répondre" pour
              parler. Cliquez sur "Arrêter" quand vous avez fini de parler.
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>🤖 Propulsé par Groq Whisper • Google Gemini • Edge TTS</p>
          <p className="mt-1 text-xs">
            Simulation d'entretien 100% IA pour améliorer vos compétences
          </p>
        </div>
      </div>
    </div>
  );
}