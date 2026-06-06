export class LocalProvider {
  async translate(texts, sourceLang, targetLang) {
    // Return empty translations to allow manual edit
    const result = {};
    for (const text of texts) {
      result[text] = "";
    }
    return result;
  }
}

export class DeepLProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async translate(texts, sourceLang, targetLang) {
    if (!this.apiKey) {
      throw new Error("DeepL API key is required but missing. Configure FORGEWP_DEEPL_API_KEY in your env.");
    }

    const isFreeKey = this.apiKey.endsWith(':fx');
    const endpoint = isFreeKey 
      ? 'https://api-free.deepl.com/v2/translate' 
      : 'https://api.deepl.com/v2/translate';

    let target = targetLang.toUpperCase();
    if (target === 'EN') target = 'EN-US';

    const source = sourceLang.toUpperCase();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: texts,
          source_lang: source,
          target_lang: target,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`DeepL API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const translations = {};
      if (data && Array.isArray(data.translations)) {
        texts.forEach((text, index) => {
          translations[text] = data.translations[index]?.text || "";
        });
      }
      return translations;
    } catch (err) {
      throw new Error(`DeepL translation failed: ${err.message}`);
    }
  }
}

export class LibreTranslateProvider {
  constructor(endpoint) {
    this.endpoint = endpoint || 'http://localhost:5000';
  }

  async translate(texts, sourceLang, targetLang) {
    const url = `${this.endpoint.replace(/\/$/, '')}/translate`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: texts,
          source: sourceLang.toLowerCase(),
          target: targetLang.toLowerCase(),
          format: 'text',
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`LibreTranslate error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const translations = {};
      
      if (data && Array.isArray(data.translatedText)) {
        texts.forEach((text, index) => {
          translations[text] = data.translatedText[index] || "";
        });
      } else if (data && typeof data.translatedText === 'string') {
        translations[texts[0]] = data.translatedText;
      }
      return translations;
    } catch (err) {
      throw new Error(`LibreTranslate translation failed: ${err.message}`);
    }
  }
}

export class GoogleProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async translate(texts, sourceLang, targetLang) {
    if (!this.apiKey) {
      throw new Error("Google Translation API key is required but missing.");
    }

    const url = `https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: texts,
          source: sourceLang.toLowerCase(),
          target: targetLang.toLowerCase(),
          format: 'text',
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google Translate error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const translations = {};
      if (data && data.data && Array.isArray(data.data.translations)) {
        texts.forEach((text, index) => {
          translations[text] = data.data.translations[index]?.translatedText || "";
        });
      }
      return translations;
    } catch (err) {
      throw new Error(`Google translation failed: ${err.message}`);
    }
  }
}

export function getProvider(name, config = {}) {
  switch (name) {
    case 'deepl':
      return new DeepLProvider(config.apiKey || process.env.FORGEWP_DEEPL_API_KEY);
    case 'libretranslate':
      return new LibreTranslateProvider(config.endpoint);
    case 'google':
      return new GoogleProvider(config.apiKey || process.env.FORGEWP_GOOGLE_API_KEY);
    case 'local':
    case 'manual':
    default:
      return new LocalProvider();
  }
}
