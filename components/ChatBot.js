"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  GraduationCap, 
  BookOpen, 
  Code, 
  Compass,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  User,
  Bot
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const LearnovaChatbot = () => {
  // --- State Management ---
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am **Learnova AI**, your dedicated learning companion. Select a category below or ask me anything to get started!"
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentCategory, setCurrentCategory] = useState("general");
  const [activeTab, setActiveTab] = useState("all");
  const [hasApiKey, setHasApiKey] = useState(true);

  // --- Refs ---
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // --- Static Configuration ---
  const categories = [
    { id: "all", label: "General", icon: MessageSquare },
    { id: "academics", label: "Academics", icon: GraduationCap },
    { id: "coding", label: "Coding Help", icon: Code },
    { id: "career", label: "Career Guidance", icon: Compass }
  ];

  const fallbackResponses = {
    academics: "To understand complex academic topics, it's best to break them down into foundational principles. Could you specify which subject or concept you're analyzing?",
    coding: "When debugging code, always start by isolating the error message and verifying your environment variables. What language or framework are we working with?",
    career: "Navigating your career path involves mapping your technical skills against current market demands. Are you looking to explore industry trends, resume building, or interview prep?",
    all: "I'm here to assist with any questions you have. Could you provide a bit more detail or context so I can give you a precise answer?"
  };

  // --- Auto-scroll to Latest Message ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // --- API Configuration Check on Mount ---
  useEffect(() => {
    let isMounted = true;

    fetch("/api/check-groq-config")
      .then((res) => {
        if (!res.ok) throw new Error("Validation check failed");
        return res.json();
      })
      .then((data) => {
        if (isMounted) setHasApiKey(!!data.hasKey);
      })
      .catch(() => {
        if (isMounted) setHasApiKey(false); // Fallback gracefully to client handling if route is missing
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // --- Dynamic Textarea Height Adjuster ---
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // --- Message Processing & API Interaction ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userQuery = inputMessage.trim();
    setInputMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Append User Message Locally
    const updatedMessages = [...messages, { role: "user", content: userQuery }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          category: activeTab
        })
      });

      if (!response.ok) throw new Error("Network response encountered an error");
      
      const data = await response.json();
      
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.choices[0].message.content }
      ]);

      // Background tracking sync
      saveToMongoDB(userQuery, data.choices[0].message.content);

    } catch (error) {
      console.error("Chat Error:", error);
      
      // Client-side fallback response generation
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { 
            role: "assistant", 
            content: `**System Note:** I'm currently running in offline simulation mode. \n\n${fallbackResponses[activeTab]}` 
          }
        ]);
        setIsLoading(false);
      }, 800);
      return;
    }

    setIsLoading(false);
  };

  // --- Helper: MongoDB Synchronization ---
  const saveToMongoDB = async (userMessage, botMessage) => {
    try {
      await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: userMessage,
          botReply: botMessage,
          timestamp: new Date(),
          categoryTag: activeTab
        })
      });
    } catch (err) {
      console.warn("Database sync deferred:", err.message);
    }
  };

  // --- Render Layout ---
  return (
    <div className="flex flex-col h-screen w-[calc(100vw-1rem)] sm:w-full max-w-4xl mx-auto bg-slate-950/90 backdrop-blur-xl border-x border-purple-500/20 shadow-[0_0_60px_-15px_rgba(139,92,246,0.3)]">
      
      {/* Header Panel */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-slate-900/80 backdrop-blur-xl border-b border-purple-500/20">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="p-1.5 sm:p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg text-white shadow-lg shadow-purple-500/25">
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Nova AI</h1>
            <p className="text-[10px] sm:text-xs text-purple-300/70 font-medium">Next-Gen Learning Assistant</p>
          </div>
        </div>
        
        {/* Environment Banner */}
        <div className="flex items-center">
          {hasApiKey ? (
            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold backdrop-blur-sm">
              <CheckCircle2 size={12} /> Live
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold backdrop-blur-sm">
              <AlertCircle size={12} /> Sandbox
            </span>
          )}
        </div>
      </header>

      {/* Category Selection Tabs */}
      <nav className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-900/60 backdrop-blur-lg border-b border-white/5 overflow-x-auto scrollbar-none">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          const isSelected = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                isSelected 
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm shadow-purple-500/10" 
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
              }`}
            >
              <IconComponent size={14} className={isSelected ? "text-purple-400" : "text-slate-500"} />
              {cat.label}
            </button>
          );
        })}
      </nav>

      {/* Main Message Interface */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          return (
            <div key={index} className={`flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
              <div className={`p-1.5 sm:p-2 h-7 w-7 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center shrink-0 ${
                isUser 
                  ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25" 
                  : "bg-slate-800/80 border border-purple-500/20 text-purple-400 backdrop-blur-sm"
              }`}>
                {isUser ? <User size={14} /> : <Bot size={14} />}
              </div>
              
              <div className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                isUser 
                  ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-tr-none shadow-lg shadow-purple-500/20" 
                  : "bg-slate-800/60 text-slate-200 border border-white/10 rounded-tl-none backdrop-blur-sm prose prose-invert prose-sm max-w-none"
              }`}>
                {isUser ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Visual Indicator */}
        {isLoading && (
          <div className="flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] mr-auto items-center">
            <div className="p-1.5 sm:p-2 h-7 w-7 sm:h-9 sm:w-9 rounded-lg bg-slate-800/80 border border-purple-500/20 text-purple-400 flex items-center justify-center animate-pulse backdrop-blur-sm">
              <Bot size={14} />
            </div>
            <div className="bg-slate-800/60 border border-white/10 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Form Panel */}
      <footer className="p-2.5 sm:p-4 bg-slate-900/80 backdrop-blur-xl border-t border-purple-500/20">
        <form onSubmit={handleSendMessage} className="relative flex items-end gap-2 bg-slate-800/60 border border-white/10 rounded-xl p-1.5 sm:p-2 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/30 focus-within:shadow-lg focus-within:shadow-purple-500/10 transition-all backdrop-blur-sm">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder={`Ask a question in ${categories.find(c => c.id === activeTab)?.label}...`}
            className="flex-1 bg-transparent border-0 outline-none resize-none max-h-32 text-xs sm:text-sm text-slate-200 pl-2 py-1.5 placeholder-slate-500 focus:ring-0"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className={`p-2 sm:p-2.5 rounded-lg transition-all ${
              inputMessage.trim() && !isLoading
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105"
                : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Send size={14} />
          </button>
        </form>
        <p className="text-[10px] sm:text-[11px] text-center text-slate-500 mt-1.5 sm:mt-2 font-medium">
          Powered by Groq Cloud API • Shift + Enter for new lines
        </p>
      </footer>

    </div>
  );
};

export default LearnovaChatbot;
