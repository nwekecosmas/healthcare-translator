import React from 'react';
//console.log('VITE_TEST_VAR:', import.meta.env.VITE_TEST_VAR);
//console.log('VITE_TEST_VAR2:', import.meta.env.VITE_TEST_VAR2);
import Translator from './components/Translator';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Healthcare Translator
          </h1>
          <p className="text-gray-600 text-lg">
            Real-time multilingual translation for healthcare communication
          </p>
        </header>
        
        <Translator />
        
        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>Built with AI-powered translation for accurate medical communication</p>
          <p className="mt-2">Patient data is processed securely and not stored</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
