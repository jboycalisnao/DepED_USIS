import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { DEPED_SEAL_URL } from '../constants';
import { Candidate } from '../types';

const AI_SYSTEM_INSTRUCTION = `You are the E-Boto AI Assistant for Leon National High School. 
Your goal is to help students understand the election process and the platforms of the candidates. 
Be non-partisan, encouraging, and clear. 
Always use professional but friendly language suitable for high school students. 
Reference DepEd values: Maka-Diyos, Makatao, Makakalikasan, at Makabansa.`;

interface AIAssistantProps {
  candidates: Candidate[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ candidates }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Hello learner! I am your E-Boto AI Assistant. How can I help you today regarding the upcoming LG elections?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // Guideline check: API Key must be obtained exclusively from process.env.API_KEY
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const candidateInfo = candidates.map(c => 
        `Candidate: ${c.name}, Position: ${c.position}, Party: ${c.party}, Vision: ${c.vision}`
      ).join('\n');

      const prompt = `
        Candidate Data:
        ${candidateInfo}

        User Question: ${userMessage}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: AI_SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });

      const aiText = response.text || "I'm sorry, I couldn't process that request right now.";
      setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: "Apologies, the election cloud is busy. Please try asking again in a moment." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-[#034F8B] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-[150] group border-4 border-white"
        title="Ask E-Boto AI"
      >
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
        {isOpen ? (
          <i className="fa-solid fa-xmark text-2xl"></i>
        ) : (
          <i className="fa-solid fa-robot text-2xl group-hover:rotate-12 transition-transform"></i>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[90vw] max-w-sm h-[500px] bg-white rounded-3xl shadow-2xl z-[150] flex flex-col overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-[#034F8B] p-5 text-white flex items-center space-x-4">
            <img src={DEPED_SEAL_URL} className="h-10 w-auto" alt="AI" />
            <div>
              <h4 className="font-black text-sm uppercase tracking-tighter">E-Boto AI Assistant</h4>
              <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest">Powered by Gemini AI</p>
            </div>
          </div>

          <div className="flex-grow p-4 overflow-y-auto bg-gray-50 space-y-4 no-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-[#E11C38] text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm">
                  <div className="flex space-x-2">
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-100">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your question..."
                className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#034F8B] transition-all text-sm"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#034F8B] text-white rounded-lg flex items-center justify-center hover:bg-blue-800 transition-colors disabled:opacity-50"
              >
                <i className="fa-solid fa-paper-plane text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;