/**
 * A service for handling language translation, particularly for healthcare communication.
 * It uses a configurable backend (e.g., Groq, OpenAI) and includes features like
 * caching, request cancellation, and a mock fallback for development.
 *
 * @exports TranslationService
 */
class TranslationService {
  #apiKey;
  #baseUrl;
  #model;
  #cache = new Map();
  #supportedLanguages;
  #supportedLanguageCodes;

  /**
   * Initializes the Translation Service.
   * Reads configuration from environment variables but can be overridden.
   */
  constructor() {
    this.#apiKey = import.meta.env.VITE_GROQ_API_KEY;
    this.#baseUrl = 'https://api.groq.com/openai/v1';
    // CORRECTED: Using a current, high-performance model from Groq.
    this.#model = 'llama3-8b-8192';

    this.#supportedLanguages = this.#initializeLanguages();
    this.#supportedLanguageCodes = new Set(this.#supportedLanguages.map(lang => lang.code));
  }

  /**
   * Translates text using a specified context for better accuracy.
   * Caches results and supports request cancellation.
   *
   * @param {string} text - The text to translate.
   * @param {string} sourceLang - The source language code (e.g., 'en').
   * @param {string} targetLang - The target language code (e.g., 'es').
   * @param {object} [options={}] - Additional options for the request.
   * @param {string} [options.context='healthcare'] - The domain context for the translation.
   * @param {AbortSignal} [options.signal] - An AbortSignal to cancel the request.
   * @returns {Promise<string>} The translated text.
   */
  async translateWithContext(text, sourceLang, targetLang, options = {}) {
    const { context = 'healthcare', signal } = options;
    const cacheKey = `${sourceLang}:${targetLang}:${context}:${text}`;

    if (this.#cache.has(cacheKey)) {
      console.log('Returning translation from cache.');
      return this.#cache.get(cacheKey);
    }

    if (!this.#apiKey) {
      console.warn('API key is missing. Falling back to mock translation.');
      return this.#mockTranslate(text, sourceLang, targetLang);
    }

    try {
      const response = await fetch(`${this.#baseUrl}/chat/completions`, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.#apiKey}`
        },
        body: JSON.stringify({
          model: this.#model,
          messages: [
            {
              role: 'system',
              content: `You are an expert translator specializing in ${context} terminology. Translate the user's text from ${sourceLang} to ${targetLang}. Provide only the direct translation, with no additional explanations, introductions, or commentary.`
            },
            {
              role: 'user',
              content: text
            }
          ],
          max_tokens: 1024,
          temperature: 0.1,
          stream: false
        })
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`API request failed with status ${response.status}: ${errorBody.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const translation = data.choices[0]?.message?.content?.trim();

      if (!translation) {
        throw new Error('Received an empty or malformed translation from the API.');
      }

      this.#cache.set(cacheKey, translation);
      return translation;

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Translation request was aborted.');
        return 'Translation cancelled.';
      }

      console.error('Translation API error:', error.message);
      console.error('Falling back to mock translation due to API error.');
      return this.#mockTranslate(text, sourceLang, targetLang);
    }
  }

  /**
   * Private mock translation method.
   * @private
   */
  #mockTranslate(text, sourceLang, targetLang) {
    const translations = {
      'en-es': { 'hello': 'hola', 'how are you': '¿cómo estás?', 'pain': 'dolor', 'headache': 'dolor de cabeza', 'fever': 'fiebre', 'medicine': 'medicina', 'doctor': 'médico', 'patient': 'paciente' },
      'es-en': { 'hola': 'hello', '¿cómo estás?': 'how are you', 'dolor': 'pain', 'dolor de cabeza': 'headache', 'fiebre': 'fever', 'medicina': 'medicine', 'médico': 'doctor', 'paciente': 'patient' },
      'en-fr': { 'hello': 'bonjour', 'pain': 'douleur', 'headache': 'mal de tête', 'fever': 'fièvre' },
      'fr-en': { 'bonjour': 'hello', 'douleur': 'pain', 'mal de tête': 'headache', 'fièvre': 'fever' },
    };
    const key = `${sourceLang}-${targetLang}`;
    const translationMap = translations[key];
    if (!translationMap) {
      return `(Mock) Translation for ${sourceLang} to ${targetLang} is not available.`;
    }
    const lowerCaseText = text.toLowerCase().trim();
    if (translationMap[lowerCaseText]) return translationMap[lowerCaseText];
    const words = lowerCaseText.split(' ');
    const translatedWords = words.map(word => translationMap[word] || `[${word}]`);
    return translatedWords.join(' ');
  }

  /**
   * Retrieves the list of supported languages.
   * @returns {Array<Object>}
   */
  getSupportedLanguages() {
    return this.#supportedLanguages;
  }

  /**
   * Validates if a language code is supported.
   * @param {string} code
   * @returns {boolean}
   */
  isValidLanguageCode(code) {
    return this.#supportedLanguageCodes.has(code);
  }
  
  /**
   * Clears the translation cache.
   */
  clearCache() {
    this.#cache.clear();
    console.log('Translation cache cleared.');
  }

  /**
   * Initializes the list of supported languages.
   * @private
   */
  #initializeLanguages() {
     return [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Spanish', flag: '🇪🇸' },
      { code: 'fr', name: 'French', flag: '🇫🇷' },
      { code: 'de', name: 'German', flag: '🇩🇪' },
      { code: 'it', name: 'Italian', flag: '🇮🇹' },
      { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
      { code: 'ru', name: 'Russian', flag: '🇷🇺' },
      { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
      { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
      { code: 'ko', name: 'Korean', flag: '🇰🇷' },
      { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
      { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
      { code: 'yo', name: 'Yoruba', flag: '🇳🇬' },
      { code: 'ig', name: 'Igbo', flag: '🇳🇬' },
      { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
    ];
  }
}

export default new TranslationService();