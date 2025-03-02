const axios = require('axios');
require('dotenv').config();
const { Setting } = require('../database/models');

/**
 * AI Service to handle interactions with Google's Gemini AI
 */
class AIService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.apiUrl = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta';
    this.model = process.env.GEMINI_MODEL || 'models/gemini-pro';
    this.scoringPrompt = process.env.AI_TRANSLATION_SCORING_PROMPT;
    this.topicPrompt = process.env.AI_TOPIC_GENERATION_PROMPT;
    this.contentPrompt = process.env.AI_POST_GENERATION_PROMPT;
  }

  /**
   * Initialize the service by loading prompts from settings
   */
  async initialize() {
    try {
      // Load prompts from settings if available
      const settings = await Setting.findAll({
        where: {
          key: {
            [Op.in]: [
              'AI_TRANSLATION_SCORING_PROMPT',
              'AI_TOPIC_GENERATION_PROMPT',
              'AI_POST_GENERATION_PROMPT'
            ]
          }
        }
      });

      settings.forEach(setting => {
        if (setting.key === 'AI_TRANSLATION_SCORING_PROMPT' && setting.value) {
          this.scoringPrompt = setting.value;
        } else if (setting.key === 'AI_TOPIC_GENERATION_PROMPT' && setting.value) {
          this.topicPrompt = setting.value;
        } else if (setting.key === 'AI_POST_GENERATION_PROMPT' && setting.value) {
          this.contentPrompt = setting.value;
        }
      });
    } catch (error) {
      console.error('Error initializing AI service:', error);
      // Fall back to environment variable prompts
    }
  }

  /**
   * Generate text using Gemini AI
   * @param {string} prompt - User prompt
   * @param {number} maxTokens - Maximum tokens to generate
   * @returns {Promise<string>} Generated text
   */
  async generateText(prompt, maxTokens = 500) {
    try {
      // Get API Key from environment
      if (!this.apiKey) {
        throw new Error('Gemini API key not found. Please set GEMINI_API_KEY in your environment.');
      }

      // Construct the request URL
      const url = `${this.apiUrl}/${this.model}:generateContent?key=${this.apiKey}`;

      // Construct request body
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: maxTokens,
          topP: 0.9,
          topK: 40
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      // Make the API request
      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Extract the generated text from the response
      if (
        response.data &&
        response.data.candidates &&
        response.data.candidates.length > 0 &&
        response.data.candidates[0].content &&
        response.data.candidates[0].content.parts &&
        response.data.candidates[0].content.parts.length > 0
      ) {
        return response.data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Unexpected response format from Gemini API');
      }
    } catch (error) {
      console.error('Error generating text with Gemini AI:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw new Error(`Failed to generate text: ${error.message}`);
    }
  }

  /**
   * Generate title from a prompt
   * @param {string} prompt - User prompt
   * @returns {Promise<string>} Generated title
   */
  async generateTitle(prompt) {
    const titlePrompt = `${prompt} 
    Please generate a short, engaging title that is no more than 10 words. 
    The title should be creative and relevant to the topic.`;
    
    return this.generateText(titlePrompt, 100);
  }

  /**
   * Generate a post from a prompt with word limits
   * @param {string} prompt - User prompt
   * @param {number} minWords - Minimum word count
   * @param {number} maxWords - Maximum word count
   * @returns {Promise<string>} Generated post
   */
  async generatePost(prompt, minWords, maxWords) {
    const postPrompt = `${prompt} 
    Please write a post between ${minWords} and ${maxWords} words.
    The post should be engaging, informative, and well-structured.`;
    
    return this.generateText(postPrompt, maxWords * 10);
  }

  /**
   * Score a translation based on the original text
   * @param {string} originalText - Original text
   * @param {string} translatedText - Translated text
   * @param {string} originalLanguage - Original language
   * @param {string} translationLanguage - Translation language
   * @returns {Promise<Object>} Score and feedback
   */
  async scoreTranslation(originalText, translatedText, originalLanguage, translationLanguage) {
    const scorePrompt = `You are a language expert in both ${originalLanguage} and ${translationLanguage}.
    
    Original text (${originalLanguage}):
    "${originalText}"
    
    Translated text (${translationLanguage}):
    "${translatedText}"
    
    Please evaluate the translation on a scale of 0 to 100, where:
    - 90-100: Perfect translation, completely captures meaning, tone, and style
    - 80-89: Excellent translation with very minor issues
    - 70-79: Good translation with a few small mistakes
    - 60-69: Acceptable translation with several errors
    - 50-59: Mediocre translation with significant issues
    - Below 50: Poor translation with major problems
    
    Provide a JSON response with the following format:
    {
      "score": (numeric score between 0-100),
      "feedback": "Detailed feedback explaining strengths and weaknesses"
    }`;
    
    try {
      const response = await this.generateText(scorePrompt, 1000);
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonString = jsonMatch[0];
        return JSON.parse(jsonString);
      } else {
        // If no valid JSON found, create a default response
        return {
          score: 50,
          feedback: "Unable to properly analyze the translation. Please try again."
        };
      }
    } catch (error) {
      console.error('Error scoring translation:', error);
      return {
        score: 50,
        feedback: "An error occurred while scoring the translation."
      };
    }
  }

  /**
   * Generate a topic title for a new block
   * @param {string} prompt - Additional user prompt
   * @returns {Promise<string>} - Generated title
   */
  async generateBlockTitle(prompt = '') {
    try {
      const fullPrompt = `${this.topicPrompt}
      
${prompt ? `Additional context: ${prompt}` : ''}

Generate a concise, engaging title for a language learning writing block. The title should be brief (3-8 words) and inspire interesting writing.`;

      const response = await this.generateText(fullPrompt);
      
      // Clean up response, remove quotes if present
      return response.replace(/^["']|["']$/g, '').trim();
    } catch (error) {
      console.error('Error generating block title:', error);
      throw error;
    }
  }

  /**
   * Generate content for a post
   * @param {string} title - The title of the post
   * @param {string} prompt - Additional user prompt
   * @param {number} minWords - Minimum word count
   * @param {number} maxWords - Maximum word count
   * @param {string} language - Target language
   * @returns {Promise<string>} - Generated content
   */
  async generatePostContent(title, prompt = '', minWords = 50, maxWords = 1000, language = 'English') {
    try {
      const fullPrompt = `${this.contentPrompt}
      
Title: "${title}"
${prompt ? `Additional context: ${prompt}` : ''}
Language: ${language}
Word count: Between ${minWords} and ${maxWords} words.

Please generate an engaging and educational post suitable for language learning practice. The content should be well-structured, informative, and include a mix of common and advanced vocabulary.`;

      return await this.generateText(fullPrompt);
    } catch (error) {
      console.error('Error generating post content:', error);
      throw error;
    }
  }
}

// Create and initialize singleton instance
const aiService = new AIService();
aiService.initialize().catch(err => console.error('Error initializing AI service:', err));

module.exports = aiService; 