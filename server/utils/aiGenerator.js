const axios = require('axios');
require('dotenv').config();

// Gemini AI API endpoint and key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Generate a block title using AI
 * @param {string} prompt - User prompt for title generation
 * @param {Date} date - Block date
 * @returns {string} - Generated title
 */
async function generateBlockTitle(prompt, date) {
  try {
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const masterPrompt = process.env.BLOCK_TITLE_MASTER_PROMPT || 
      'Generate a creative title for a daily writing block. The title should be concise (5-10 words) and inspiring for writers.';
    
    const fullPrompt = `${masterPrompt}\n\nDate: ${formattedDate}\nUser Instructions: ${prompt}`;

    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: fullPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 50,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const generatedText = response.data.candidates[0].content.parts[0].text.trim();
    // Clean up the generated text, remove quotes and limit length
    return generatedText.replace(/^["']|["']$/g, '').substring(0, 100);
  } catch (error) {
    console.error('Error generating block title with AI:', error.response?.data || error.message);
    // Fallback to date format if AI generation fails
    return date.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }
}

/**
 * Generate post content using AI
 * @param {string} prompt - User prompt for content generation
 * @param {number} minWords - Minimum word count
 * @param {number} maxWords - Maximum word count
 * @returns {string} - Generated content
 */
async function generatePostContent(prompt, minWords = 50, maxWords = 1000) {
  try {
    const masterPrompt = process.env.POST_CONTENT_MASTER_PROMPT || 
      'Generate creative writing content that would be interesting to translate.';
    
    const fullPrompt = `${masterPrompt}\n\nUser Instructions: ${prompt}\n\nPlease generate content between ${minWords} and ${maxWords} words.`;

    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: fullPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: Math.min(maxWords * 5, 4096), // Rough token estimation
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const generatedText = response.data.candidates[0].content.parts[0].text.trim();
    const wordCount = generatedText.split(/\s+/).length;
    
    if (wordCount < minWords) {
      return generatedText + `\n\n[Note: Generated content (${wordCount} words) is below the minimum word count of ${minWords}.]`;
    } else if (wordCount > maxWords) {
      // Truncate to a sentence near the max word count
      const words = generatedText.split(/\s+/);
      const truncatedWords = words.slice(0, maxWords);
      let truncatedText = truncatedWords.join(' ');
      
      // Try to end at a sentence
      const lastPeriodIndex = truncatedText.lastIndexOf('.');
      if (lastPeriodIndex > truncatedText.length * 0.8) {
        truncatedText = truncatedText.substring(0, lastPeriodIndex + 1);
      }
      
      return truncatedText;
    }
    
    return generatedText;
  } catch (error) {
    console.error('Error generating post content with AI:', error.response?.data || error.message);
    // Fallback to a simple message if AI generation fails
    return `[An error occurred while generating content. Please try again later.]\n\nPrompt: ${prompt}`;
  }
}

/**
 * Score a translation using AI
 * @param {string} originalText - Original post content
 * @param {string} translatedText - Translated content
 * @param {string} originalLanguage - Original language name
 * @param {string} translationLanguage - Translation language name
 * @returns {Object} - Score and feedback
 */
async function scoreTranslation(originalText, translatedText, originalLanguage, translationLanguage) {
  try {
    const masterPrompt = process.env.TRANSLATION_SCORE_MASTER_PROMPT || 
      'You are a translation evaluator. Score the translation on a scale of 0-10 based on accuracy, fluency, and style.';
    
    const fullPrompt = `${masterPrompt}

Original (${originalLanguage}):
${originalText}

Translation (${translationLanguage}):
${translatedText}

Provide a score from 0 to 10 and detailed feedback on the translation quality.
Format your response as:
SCORE: [number between 0 and 10 with one decimal place]
FEEDBACK: [detailed evaluation]`;

    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: fullPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const generatedText = response.data.candidates[0].content.parts[0].text.trim();
    
    // Extract score and feedback from response
    const scoreMatch = generatedText.match(/SCORE:\s*(\d+\.?\d*)/i);
    const feedbackMatch = generatedText.match(/FEEDBACK:\s*([\s\S]*)/i);
    
    const score = scoreMatch ? parseFloat(scoreMatch[1]) : 5.0;
    const feedback = feedbackMatch ? feedbackMatch[1].trim() : generatedText;
    
    // Ensure score is within valid range
    const validScore = Math.min(Math.max(score, 0), 10);
    
    return {
      score: validScore,
      feedback
    };
  } catch (error) {
    console.error('Error scoring translation with AI:', error.response?.data || error.message);
    return {
      score: 5.0, // Neutral score as fallback
      feedback: 'An error occurred while evaluating the translation. Please try again later.'
    };
  }
}

module.exports = {
  generateBlockTitle,
  generatePostContent,
  scoreTranslation
}; 