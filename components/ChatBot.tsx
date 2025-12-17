import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { SchoolData } from '../types';

interface ChatBotProps {
  onUpdateForm?: (data: Partial<SchoolData>) => void;
  onSubmitForm?: () => void;
  currentData?: SchoolData;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string; // Base64 data URL
}

interface AudioData {
  data: string;
  mimeType: string;
}

const SUPPORT_MSG = "For more support Please call +918974257871";

// Ordered list of fields to guide the "Interview" mode
const INTERVIEW_ORDER: { key: keyof SchoolData; label: string }[] = [
  { key: 'schoolName', label: 'School Name' },
  { key: 'udiseCode', label: 'UDISE Code' },
  { key: 'block', label: 'Block (e.g., Khowai, Teliamura)' },
  { key: 'district', label: 'District' },
  { key: 'level', label: 'Level (Primary, Upper Primary)' },
  { key: 'principalName', label: 'Principal Name' },
  { key: 'societyTrustName', label: 'Name of Society or Trust' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'email', label: 'Email Address' },
];

const getNextMissingField = (data: SchoolData | undefined) => {
  if (!data) return INTERVIEW_ORDER[0].label;
  for (const field of INTERVIEW_ORDER) {
    if (!data[field.key]) {
      return field.label;
    }
  }
  // Check files specifically since they aren't easy to "speak"
  if (!data.schoolPicture) return "School Picture (Please upload via UI)";
  if (!data.principalPicture) return "Principal Picture (Please upload via UI)";
  if (!data.registrationCertificatePrimary) return "Primary Registration PDF (Please upload via UI)";
  
  // Conditional check for Upper Primary Certificate
  if (data.level === 'Upper Primary (1-8)' && !data.registrationCertificateUpper) {
    return "Upper Primary Registration PDF (Please upload via UI)";
  }
  
  return "All fields are filled. Ready to submit?";
};

const BASE_SYSTEM_INSTRUCTION = `
You are a proactive Voice Data Entry Interviewer for a School Registration Form.

**YOUR MISSION:**
1.  **SPEAK FIRST**: Immediately upon connection, greet the user and ask for the "Next Missing Field" identified below.
2.  **INTERVIEW**: Ask one question at a time. Wait for the answer.
3.  **UPDATE**: When the user answers, call \`update_school_data\`.
4.  **NEXT**: The tool result will tell you the *next* missing field. Ask for that immediately.
5.  **FILES**: If the next missing field is a Picture or PDF, instruct the user to use the screen to upload it, as voice cannot handle file uploads.
6.  **SUBMIT**: If the tool result says "Ready to submit", ask the user "Shall I submit the form now?".

**TONE**: Professional, efficient, and clear.
`;

const updateSchoolDataTool: FunctionDeclaration = {
  name: 'update_school_data',
  description: 'Updates form fields. Call this whenever the user provides data.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      schoolName: { type: Type.STRING, description: "Full name of the school" },
      udiseCode: { type: Type.STRING, description: "UDISE Code" },
      block: { type: Type.STRING, description: "Block name (Khowai, Tulashikhar, Teliamura, Mungiakami, Padmabil, Kalyanpur)" },
      district: { type: Type.STRING, description: "District name" },
      level: { type: Type.STRING, description: "School Level" },
      principalName: { type: Type.STRING, description: "Name of the Principal" },
      societyTrustName: { type: Type.STRING, description: "Name of Society or Trust" },
      phone: { type: Type.STRING, description: "Phone number" },
      email: { type: Type.STRING, description: "Email address" },
      registrationCertificatePrimary: { type: Type.STRING, description: "Primary Registration Certificate (PDF)" },
      registrationCertificateUpper: { type: Type.STRING, description: "Upper Primary Registration Certificate (PDF)" },
    },
  },
};

const submitReportTool: FunctionDeclaration = {
  name: 'submit_report',
  description: 'Submits the completed school registration form.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const ChatBot: React.FC<ChatBotProps> = ({ onUpdateForm, onSubmitForm, currentData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello, I am Arup Kumar AI Assistant. I can help you fill out the School Registration. What is the name of your school?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [liveCaption, setLiveCaption] = useState<string>("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Refs to hold latest callback functions and data
  const onUpdateFormRef = useRef(onUpdateForm);
  const onSubmitFormRef = useRef(onSubmitForm);
  const currentDataRef = useRef(currentData);

  useEffect(() => {
    onUpdateFormRef.current = onUpdateForm;
    onSubmitFormRef.current = onSubmitForm;
    currentDataRef.current = currentData;
  }, [onUpdateForm, onSubmitForm, currentData]);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, selectedImage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // --- Audio Utils ---
  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const createBlob = (data: Float32Array): AudioData => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  // --- Live API Setup ---
  const startLiveSession = async () => {
    if (isLiveConnected) {
      disconnectLiveSession();
      return;
    }

    if (isConnecting) return;

    setIsConnecting(true);
    setLiveCaption("Connecting...");

    try {
      if (!process.env.API_KEY) {
        throw new Error("API Key is missing. Please check your environment variables.");
      }
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access is not supported in this context. Ensure you are using HTTPS.");
      }

      const missingField = getNextMissingField(currentDataRef.current);
      const dynamicInstruction = `${BASE_SYSTEM_INSTRUCTION}\n\n**CURRENT STATUS**: The next missing field is "${missingField}". You MUST ask the user for this immediately.\n\nNOTE: If you provide a troubleshooting solution, please verbally add "For more support Please call +918974257871" at the end.`;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: async () => {
            console.log("Live Session Connected");
            setIsLiveConnected(true);
            setIsConnecting(false);
            setIsOpen(false); 
            setLiveCaption("Listening...");
            
            if (audioContextRef.current?.state === 'suspended') {
              await audioContextRef.current.resume();
            }

            const inputCtx = inputAudioContextRef.current!;
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                 session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
                setLiveCaption(prev => {
                   const text = message.serverContent?.outputTranscription?.text || "";
                   return (prev.length > 100 ? "..." : prev) + text; 
                });
            }
            
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
               const ctx = audioContextRef.current;
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
               
               const audioBytes = decode(base64Audio);
               const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
               
               const source = ctx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(ctx.destination);
               source.addEventListener('ended', () => sourcesRef.current.delete(source));
               source.start(nextStartTimeRef.current);
               sourcesRef.current.add(source);
               
               nextStartTimeRef.current += audioBuffer.duration;
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                let responseResult = {};
                
                if (fc.name === 'update_school_data') {
                    if (onUpdateFormRef.current) {
                        onUpdateFormRef.current(fc.args as any);
                        
                        const updated = { ...currentDataRef.current, ...(fc.args as any) };
                        const next = getNextMissingField(updated);
                        
                        responseResult = { result: `Form updated. Next missing field is "${next}".` };
                        setLiveCaption(""); 
                    }
                } else if (fc.name === 'submit_report') {
                    if (onSubmitFormRef.current) {
                        onSubmitFormRef.current();
                        responseResult = { result: "Submission triggered." };
                    }
                }

                sessionPromise.then(session => {
                  session.sendToolResponse({
                    functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: responseResult
                    }
                  });
                });
              }
            }
          },
          onclose: () => {
             console.log("Live Session Closed");
             setIsLiveConnected(false);
             setIsConnecting(false);
          },
          onerror: (err) => {
             console.error("Live Session Error", err);
             setIsLiveConnected(false);
             setIsConnecting(false);
             setIsOpen(true);
             setMessages(prev => [
                ...prev, 
                { role: 'model' as const, text: "Connection Error: " + err.message },
                { role: 'model' as const, text: SUPPORT_MSG }
             ]);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
             voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: dynamicInstruction,
          tools: [{ functionDeclarations: [updateSchoolDataTool, submitReportTool] }],
          outputAudioTranscription: {},
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (e: any) {
      setIsLiveConnected(false);
      setIsConnecting(false);
      disconnectLiveSession();
      setIsOpen(true);
      
      let errorMessage = "⚠️ Unable to start voice mode.";
      const errMsg = e.message || '';
      
      if (errMsg.includes("API Key")) errorMessage = "⚠️ API Key is missing.";
      else if (e.name === 'NotAllowedError') errorMessage = "⚠️ Microphone access denied.";
      else if (errMsg) errorMessage = `⚠️ Error: ${errMsg}`;

      setMessages(prev => [
        ...prev, 
        { role: 'model' as const, text: errorMessage },
        { role: 'model' as const, text: SUPPORT_MSG }
      ]);
    }
  };

  const disconnectLiveSession = () => {
    try {
        if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(track => track.stop());
        if (sessionRef.current) sessionRef.current.then((s: any) => s.close());
        if (audioContextRef.current) audioContextRef.current.close();
        if (inputAudioContextRef.current) inputAudioContextRef.current.close();
    } catch (e) {}
    setIsLiveConnected(false);
    setIsConnecting(false);
    setLiveCaption("");
    mediaStreamRef.current = null;
    sessionRef.current = null;
    audioContextRef.current = null;
    inputAudioContextRef.current = null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => setSelectedImage(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if ((!inputValue.trim() && !selectedImage) || isLoading) return;

    const userMessageText = inputValue.trim();
    const userImage = selectedImage;

    setInputValue('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setMessages(prev => [...prev, { role: 'user' as const, text: userMessageText, image: userImage || undefined }]);
    setIsLoading(true);

    try {
      if (!process.env.API_KEY) throw new Error("API Key is missing.");

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const contents = messages.map(m => {
        const parts: any[] = [];
        if (m.image) {
            const [mimeMetadata, base64Data] = m.image.split(',');
            const mimeType = mimeMetadata.match(/:(.*?);/)?.[1] || 'image/jpeg';
            parts.push({ inlineData: { mimeType, data: base64Data } });
        }
        if (m.text) parts.push({ text: m.text });
        return { role: m.role, parts };
      });

      const currentParts: any[] = [];
      if (userImage) {
        const [mimeMetadata, base64Data] = userImage.split(',');
        const mimeType = mimeMetadata.match(/:(.*?);/)?.[1] || 'image/jpeg';
        currentParts.push({ inlineData: { mimeType, data: base64Data } });
      }
      if (userMessageText) currentParts.push({ text: userMessageText });
      contents.push({ role: 'user', parts: currentParts });

      const textSystemInstruction = BASE_SYSTEM_INSTRUCTION + '\n\nIMPORTANT: If you provide a troubleshooting solution, strictly end the response with the text string: "[CONTACT_SUPPORT]". Do not write the phone number yourself.';

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: { 
            systemInstruction: textSystemInstruction,
            tools: [{ functionDeclarations: [updateSchoolDataTool, submitReportTool] }],
        },
      });

      const toolCalls = response.functionCalls;
      if (toolCalls && toolCalls.length > 0) {
        for (const fc of toolCalls) {
             if (fc.name === 'update_school_data') {
                 if (onUpdateFormRef.current) {
                     onUpdateFormRef.current(fc.args as any);
                     setMessages(prev => [...prev, { role: 'model' as const, text: `Updated fields: ${Object.keys(fc.args).join(', ')}` }]);
                 }
             } else if (fc.name === 'submit_report') {
                 if (onSubmitFormRef.current) {
                     onSubmitFormRef.current();
                     setMessages(prev => [...prev, { role: 'model' as const, text: "Submitting report..." }]);
                 }
             }
        }
      }

      let text = response.text || "Processed.";
      const hasSupportTag = text.includes("[CONTACT_SUPPORT]");
      text = text.replace("[CONTACT_SUPPORT]", "").trim();

      setMessages(prev => {
          const newMsgs: Message[] = [...prev, { role: 'model' as const, text }];
          if (hasSupportTag) {
              newMsgs.push({ role: 'model' as const, text: SUPPORT_MSG });
          }
          return newMsgs;
      });

    } catch (error: any) {
        let errorMsg = "Connection error.";
        if (error.message && error.message.includes("API Key")) errorMsg = "API Key Error.";
        setMessages(prev => [
            ...prev, 
            { role: 'model' as const, text: errorMsg },
            { role: 'model' as const, text: SUPPORT_MSG }
        ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="relative z-50">
      
      {/* Chat Window */}
      <div 
        className={`
            absolute bottom-full left-0 mb-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700
            w-80 sm:w-96 overflow-hidden transition-all duration-300 origin-bottom-left flex flex-col
            ${isOpen ? 'opacity-100 scale-100 translate-y-0 h-[500px]' : 'opacity-0 scale-90 translate-y-10 h-0 pointer-events-none'}
        `}
      >
        <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 flex justify-between items-center flex-shrink-0">
            <h3 className="text-white font-bold flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                AI Assistant
            </h3>
            <div className="flex items-center gap-2">
                 <button onClick={startLiveSession} disabled={isConnecting} className={`p-1.5 rounded-full text-white hover:bg-white/20 transition-all ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                   {isConnecting ? <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
                 </button>
                <button type="button" onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 scrollbar-thin">
            {messages.map((msg, idx) => (
                <div key={idx} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm overflow-hidden ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-bl-none'}`}>
                        {msg.image && <div className="mb-2"><img src={msg.image} alt="Uploaded" className="max-w-full rounded-lg border border-white/20" /></div>}
                        {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                    </div>
                </div>
            ))}
            {isLoading && <div className="flex justify-start mb-3"><div className="bg-white dark:bg-gray-700 rounded-2xl rounded-bl-none px-4 py-3 border border-gray-200 dark:border-gray-600"><div className="flex space-x-1"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div></div></div></div>}
            <div ref={messagesEndRef} />
        </div>

        <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            {selectedImage && <div className="mb-2 relative inline-block"><img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-gray-300 dark:border-gray-600" /><button type="button" onClick={() => { setSelectedImage(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-sm"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>}

            <div className="flex items-center gap-2">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg></button>
                <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type..." className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => handleSendMessage()} disabled={(!inputValue.trim() && !selectedImage) || isLoading} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"><svg className="w-4 h-4 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
            </div>
        </div>
      </div>

      <button
        type="button"
        onClick={isLiveConnected ? disconnectLiveSession : (isConnecting ? undefined : () => setIsOpen(!isOpen))}
        disabled={isConnecting}
        className={`shadow-lg transform transition-all duration-300 ${isLiveConnected ? 'bg-red-600 hover:bg-red-700 px-6 py-3 rounded-full hover:-translate-y-1' : isOpen ? 'bg-gray-500 rotate-90 rounded-full p-4' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:-translate-y-1 rounded-full p-4 hover:shadow-blue-500/40'} text-white flex items-center justify-center relative max-w-[90vw] overflow-hidden ${isConnecting ? 'opacity-80 cursor-wait' : ''}`}
      >
        {isLiveConnected ? (
            <div className="flex items-center space-x-3 px-2">
                 <div className="flex space-x-1 h-4 items-center flex-shrink-0"><div className="w-1 h-3 bg-white animate-bounce"></div><div className="w-1 h-4 bg-white animate-bounce delay-75"></div><div className="w-1 h-2 bg-white animate-bounce delay-150"></div></div>
                <div className="flex flex-col items-start overflow-hidden"><span className="font-bold text-xs opacity-75 uppercase tracking-wider">Voice Active</span><span className="text-sm font-medium truncate max-w-[200px] sm:max-w-[300px]">{liveCaption || "Listening..."}</span></div>
                <div className="bg-red-800 rounded-full p-1 ml-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></div>
            </div>
        ) : isConnecting ? (
             <svg className="animate-spin w-7 h-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        ) : isOpen ? (
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
             <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        )}
      </button>

    </div>
  );
};