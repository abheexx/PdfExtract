'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, FileText, MessageCircle, Bot, User, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
  chunks?: string[];
}

interface Document {
  doc_id: number;
  filename: string;
  chunks_count: number;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatHistories, setChatHistories] = useState<{ [docId: number]: Message[] }>({});
  const [darkMode, setDarkMode] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (selectedDocId) {
      setMessages(chatHistories[selectedDocId] || []);
    }
  }, [selectedDocId, chatHistories]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('http://localhost:8000/documents');
      const data = await response.json();
      setDocuments(data.documents);
      if (data.documents.length > 0 && !selectedDocId) {
        setSelectedDocId(data.documents[0].doc_id);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedDocId(data.doc_id);
        await fetchDocuments();
        setMessages([{
          role: 'assistant',
          content: `✅ Document "${data.filename}" uploaded successfully! You can now ask questions about it.`
        }]);
        setChatHistories(prev => ({ ...prev, [data.doc_id]: [{ role: 'assistant', content: `✅ Document "${data.filename}" uploaded successfully! You can now ask questions about it.` }] }));
      } else {
        const error = await response.json();
        setMessages([{
          role: 'assistant',
          content: `❌ Error: ${error.detail}`
        }]);
      }
    } catch (error) {
      setMessages([{
        role: 'assistant',
        content: '❌ Error uploading document. Please try again.'
      }]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedDocId) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatHistories(prev => ({
      ...prev,
      [selectedDocId]: [...(prev[selectedDocId] || []), { role: 'user', content: userMessage }]
    }));

    try {
      const formData = new FormData();
      formData.append('doc_id', selectedDocId.toString());
      formData.append('message', userMessage);

      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.answer,
          citations: data.citations,
          chunks: data.chunks
        }]);
        setChatHistories(prev => ({
          ...prev,
          [selectedDocId]: [
            ...(prev[selectedDocId] || []),
            { role: 'assistant', content: data.answer, citations: data.citations, chunks: data.chunks }
          ]
        }));
      } else {
        const error = await response.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ Error: ${error.detail}`
        }]);
        setChatHistories(prev => ({
          ...prev,
          [selectedDocId]: [
            ...(prev[selectedDocId] || []),
            { role: 'assistant', content: `❌ Error: ${error.detail}` }
          ]
        }));
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Error sending message. Please try again.'
      }]);
      setChatHistories(prev => ({
        ...prev,
        [selectedDocId]: [
          ...(prev[selectedDocId] || []),
          { role: 'assistant', content: '❌ Error sending message. Please try again.' }
        ]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {/* Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">PDF QA Agent</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Ask questions about your documents</p>
            </div>
            <button
              onClick={() => setDarkMode((d) => !d)}
              className="ml-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-gray-700 dark:text-gray-200" />}
            </button>
          </div>

          {/* File Upload */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Upload Document
              </label>
              <div className="flex items-center space-x-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  <Upload size={16} />
                  <span>{isUploading ? 'Uploading...' : 'Upload PDF'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Document List */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Documents</h3>
            <div className="space-y-2">
              {documents.map((doc) => (
                <button
                  key={doc.doc_id}
                  onClick={() => setSelectedDocId(doc.doc_id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedDocId === doc.doc_id
                      ? 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900 dark:border-blue-700 dark:text-white'
                      : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FileText size={16} className="text-gray-500 dark:text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{doc.filename}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{doc.chunks_count} chunks</p>
                    </div>
                  </div>
                </button>
              ))}
              {documents.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No documents uploaded yet
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center space-x-3">
              <MessageCircle className="text-blue-600 dark:text-blue-400" size={20} />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Chat</h2>
                {selectedDocId && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {documents.find(d => d.doc_id === selectedDocId)?.filename}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence initial={false}>
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Bot size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Welcome to PDF QA Agent
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Upload a PDF document and start asking questions!
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.25 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-end space-x-2 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {message.role === 'assistant' ? (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-md dark:from-blue-600 dark:to-purple-700">
                            <Bot size={20} className="text-white dark:text-white" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-yellow-400 flex items-center justify-center shadow-md dark:from-pink-600 dark:to-yellow-500">
                            <User size={20} className="text-white dark:text-white" />
                          </div>
                        )}
                      </div>
                      {/* Bubble */}
                      <div
                        className={`rounded-2xl px-5 py-3 shadow-md transition-colors text-sm whitespace-pre-wrap ${
                          message.role === 'user'
                            ? 'bg-gradient-to-br from-pink-500 to-yellow-400 text-white dark:from-pink-600 dark:to-yellow-500'
                            : 'bg-gradient-to-br from-blue-100 to-purple-100 text-gray-900 dark:text-gray-100 border border-blue-200 dark:border-blue-700'
                        }`}
                        style={{ maxWidth: '80%' }}
                      >
                        {message.content}
                        {message.citations && message.chunks && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                              View citations ({message.citations.length})
                            </summary>
                            <div className="mt-2 space-y-2">
                              {message.chunks.map((chunk, i) => (
                                <div key={i} className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded border dark:border-gray-700">
                                  <p className="font-medium text-gray-700 dark:text-gray-300">Chunk {message.citations?.[i]}:</p>
                                  <p className="text-gray-600 dark:text-gray-400 mt-1">{chunk}</p>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <Bot size={16} className="text-gray-500 dark:text-gray-400" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce dark:bg-gray-500"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce dark:bg-gray-500" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce dark:bg-gray-500" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
            <div className="flex space-x-4">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={selectedDocId ? "Ask a question about your document..." : "Upload a document first..."}
                  disabled={!selectedDocId || isLoading}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || !selectedDocId || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface; 