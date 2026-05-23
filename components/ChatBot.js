"use client"
import React, { useState, useRef, useEffect } from "react";
import { CONTACT_INFO } from '../constants/contact'; // Note: Adjust path if needed
import { FixedSizeList as List } from 'react-window';

import {
  Send,
  Bot,
  User,
  Bot
} from "lucide-react";
import ReactMarkdown from "react-markdown";

// Row component for virtual scrolling
const MessageRow = ({ index, style, data }) => {
  const { messages, isDarkMode, markdownComponents, themeClasses } = data;
  const message = messages[index];

  return (
    <div style={style} className="px-3 py-2">
      <div
        className={`flex ${message.isBot ? "justify-start" : "justify-end"}`}
      >
        <div
          className={`flex max-w-sm lg:max-w-md ${message.isBot ? "flex-row" : "flex-row-reverse"
            } items-end space-x-2`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.isBot
              ? themeClasses.message.avatar.bot
              : themeClasses.message.avatar.user
              }`}
          >
            {message.isBot ? <Bot size={16} /> : <User size={16} />}
          </div>
          <div
            className={`px-4 py-3 rounded-2xl shadow-sm ${message.isBot
              ? themeClasses.message.bot
              : themeClasses.message.user
              }`}
          >
            {message.isBot ? (
              <ReactMarkdown
                components={markdownComponents}
              >
                {message.text}
              </ReactMarkdown>
            ) : (
              <p className="text-sm whitespace-pre-line leading-relaxed">
                {message.text}
              </p>
            )}
            <p className="text-xs mt-2 opacity-70">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [hasApiKey, setHasApiKey] = useState(false);

  const listRef = useRef(null);

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
    if (listRef.current) {
      listRef.current.scrollToItem(messages.length - 1);
    }
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
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-slate-50 border-x border-slate-200 shadow-sm">
      
      {/* Header Panel */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Learnova AI</h1>
            <p className="text-xs text-slate-500 font-medium">Next-Gen Learning Assistant</p>
          </div>
        </div>
        
        {/* Environment Banner */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold">
          {hasApiKey ? (
            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              <CheckCircle2 size={13} /> Live Engine
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
              <AlertCircle size={13} /> Sandbox Mode
            </span>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Category Tabs */}
          <div className={`p-2 border-b ${themeClasses.border} bg-opacity-50`}>
            <div className="flex space-x-1 overflow-x-auto scrollbar-none">
              {categories.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setCurrentCategory(id)}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${currentCategory === id
                    ? themeClasses.categoryButtonActive
                    : themeClasses.categoryButton
                    }`}
                >
                  <Icon size={12} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 h-96 overflow-hidden">
            {messages.length > 1 ? (
              <List
                ref={listRef}
                height={384}
                itemCount={messages.length}
                itemSize={120}
                itemData={{ messages, isDarkMode, markdownComponents, themeClasses }}
                width="100%"
              >
                {MessageRow}
              </List>
            ) : (
              <div className="p-3 h-full overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isBot ? "justify-start" : "justify-end"
                      } mb-4`}
                  >
                    <div
                      className={`flex max-w-sm lg:max-w-md ${message.isBot ? "flex-row" : "flex-row-reverse"
                        } items-end space-x-2`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.isBot
                          ? themeClasses.message.avatar.bot
                          : themeClasses.message.avatar.user
                          }`}
                      >
                        {message.isBot ? <Bot size={16} /> : <User size={16} />}
                      </div>
                      <div
                        className={`px-4 py-3 rounded-2xl shadow-sm ${message.isBot
                          ? themeClasses.message.bot
                          : themeClasses.message.user
                          }`}
                      >
                        {message.isBot ? (
                          <ReactMarkdown
                            components={markdownComponents}
                          >
                            {message.text}
                          </ReactMarkdown>
                        ) : (
                          <p className="text-sm whitespace-pre-line leading-relaxed">
                            {message.text}
                          </p>
                        )}
                        <p className="text-xs mt-2 opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Enhanced Suggested Questions */}
                {messages.length === 1 && (
                  <div className="space-y-4 mt-4">
                    <div className="text-center">
                      <p
                        className={`text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"
                          }`}
                      >
                        💡 Popular questions about{" "}
                        {categories.find((c) => c.id === currentCategory)?.label}:
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {suggestedQuestions[currentCategory]?.map(
                          (question, index) => (
                            <button
                              key={index}
                              onClick={() => handleSendMessage(question)}
                              className={`text-xs px-3 py-2 rounded-lg transition-all duration-200 transform hover:scale-[1.02] text-left ${themeClasses.suggestion}`}
                            >
                              {question}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start mb-4">
                <div
                  className={`${themeClasses.loading} rounded-2xl p-4 shadow-sm`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span
                      className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                    >
                      Nova is thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Contact Info */}
          <div className={`px-4 py-2 border-t ${themeClasses.border}`}>
            <div className="flex items-center justify-center space-x-4 text-xs">
              <a
                href={`mailto:${contactInfo.email}`}
                className={`flex items-center space-x-1 hover:underline ${isDarkMode ? "text-blue-400" : "text-blue-600"
                  }`}
              >
                <Mail size={12} />
                <span>Email Support</span>
              </a>
              <a
                href={`tel:${contactInfo.phone}`}
                className={`flex items-center space-x-1 hover:underline ${isDarkMode ? "text-green-400" : "text-green-600"
                  }`}
              >
                <Phone size={12} />
                <span>Call Us</span>
              </a>
              <a
                href={contactInfo.demo}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center space-x-1 hover:underline ${isDarkMode ? "text-purple-400" : "text-purple-600"
                  }`}
              >
                <ExternalLink size={12} />
                <span>Live Demo</span>
              </a>
            </div>
          );
        })}

        {/* Loading Visual Indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%] mr-auto items-center">
            <div className="p-2 h-9 w-9 rounded-lg bg-white border border-slate-200 text-indigo-600 flex items-center justify-center animate-pulse">
              <Bot size={16} />
            </div>
<div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-xs">
  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Form Panel */}
      <footer className="p-4 bg-white border-t border-slate-200">
        <form onSubmit={handleSendMessage} className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
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
            className="flex-1 bg-transparent border-0 outline-none resize-none max-h-32 text-sm text-slate-800 pl-2 py-1.5 placeholder-slate-400 focus:ring-0"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className={`p-2.5 rounded-lg transition-all ${
              inputMessage.trim() && !isLoading
                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Send size={16} />
          </button>
        </form>
        <p className="text-[11px] text-center text-slate-400 mt-2 font-medium">
          Powered by Groq Cloud API Engine • Shift + Enter for new lines
        </p>
      </footer>

    </div>
  );
};

export default LearnovaChatbot;
