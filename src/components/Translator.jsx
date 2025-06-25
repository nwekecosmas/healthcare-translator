import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Languages, AlertCircle } from 'lucide-react';
import translationService from '../services/translationService';

const Translator = () => {
  const [isListening, setIsListening] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [translationHistory, setTranslationHistory] = useState([]);

  const recognitionRef = useRef(null);
  const speechSynthesisRef = useRef(null);

  // Get supported languages from service
  const languages = translationService.getSupportedLanguages();

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = sourceLanguage;

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setOriginalText(finalTranscript || interimTranscript);
        
        // Auto-translate when we have final results
        if (finalTranscript) {
          translateText(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [sourceLanguage]);

  // Initialize speech synthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      speechSynthesisRef.current = window.speechSynthesis;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not available');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError('');
      setOriginalText('');
      setTranslatedText('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const translateText = async (text) => {
    if (!text.trim()) return;

    setIsTranslating(true);
    setError('');

    try {
      const translation = await translationService.translateWithContext(
        text, 
        sourceLanguage, 
        targetLanguage, 
        'healthcare'
      );
      
      setTranslatedText(translation);
      
      // Add to translation history
      const historyItem = {
        id: Date.now(),
        original: text,
        translated: translation,
        sourceLang: sourceLanguage,
        targetLang: targetLanguage,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setTranslationHistory(prev => [historyItem, ...prev.slice(0, 9)]); // Keep last 10
    } catch (err) {
      setError('Translation failed. Please try again.');
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const speakTranslatedText = () => {
    if (!speechSynthesisRef.current || !translatedText || isMuted) return;

    // Cancel any ongoing speech
    speechSynthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(translatedText);
    utterance.lang = targetLanguage;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesisRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const handleManualTranslate = () => {
    if (originalText.trim()) {
      translateText(originalText);
    }
  };

  const clearHistory = () => {
    setTranslationHistory([]);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
      console.log('Copied to clipboard');
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Language Selection */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Languages className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Language Settings</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Language
            </label>
            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Language
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Voice Control */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Voice Control</h2>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5 text-green-500" />}
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={toggleListening}
            className={`p-6 rounded-full transition-all duration-300 ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg scale-110 listening-animation'
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:scale-105'
            }`}
            disabled={!recognitionRef.current}
          >
            {isListening ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </button>
        </div>
        
        <p className="text-center mt-4 text-gray-600">
          {isListening ? 'Listening... Click to stop' : 'Click to start voice input'}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Translation Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Original Text */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Original Text
          </h3>
          <textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            placeholder="Speak or type your message here..."
            className="w-full h-48 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent custom-scrollbar"
          />
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleManualTranslate}
              disabled={!originalText.trim() || isTranslating}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTranslating ? 'Translating...' : 'Translate'}
            </button>
            {originalText && (
              <button
                onClick={() => copyToClipboard(originalText)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Copy
              </button>
            )}
          </div>
        </div>

        {/* Translated Text */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Translation
            </h3>
            <div className="flex gap-2">
              <button
                onClick={isSpeaking ? stopSpeaking : speakTranslatedText}
                disabled={!translatedText || isMuted}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={isSpeaking ? "Stop speaking" : "Speak translation"}
              >
                {isSpeaking ? (
                  <VolumeX className="w-5 h-5 text-red-500" />
                ) : (
                  <Volume2 className="w-5 h-5 text-green-500" />
                )}
              </button>
              {translatedText && (
                <button
                  onClick={() => copyToClipboard(translatedText)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Copy translation"
                >
                  📋
                </button>
              )}
            </div>
          </div>
          
          <div className="w-full h-48 p-4 border border-gray-300 rounded-lg bg-gray-50 overflow-y-auto custom-scrollbar">
            {translatedText ? (
              <p className="text-gray-800 leading-relaxed">{translatedText}</p>
            ) : (
              <p className="text-gray-500 italic">
                {isTranslating ? 'Translating...' : 'Translation will appear here'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Translation History */}
      {translationHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Recent Translations</h3>
            <button
              onClick={clearHistory}
              className="text-sm text-red-600 hover:text-red-800 transition-colors"
            >
              Clear History
            </button>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
            {translationHistory.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-gray-500">{item.timestamp}</span>
                  <span className="text-xs text-gray-500">
                    {languages.find(l => l.code === item.sourceLang)?.name} → {languages.find(l => l.code === item.targetLang)?.name}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-1"><strong>Original:</strong> {item.original}</p>
                <p className="text-sm text-gray-800"><strong>Translation:</strong> {item.translated}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Healthcare Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">
          Healthcare Translation Tips
        </h3>
        <ul className="text-blue-700 space-y-2 text-sm">
          <li>• Speak clearly and at a moderate pace for better transcription</li>
          <li>• Use simple, clear language when describing symptoms</li>
          <li>• This tool is for communication assistance only, not medical diagnosis</li>
          <li>• Always consult with healthcare professionals for medical advice</li>
          <li>• Patient data is processed securely and not stored</li>
        </ul>
      </div>
    </div>
  );
};

export default Translator; 