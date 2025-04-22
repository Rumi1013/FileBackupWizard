
import { Configuration, OpenAIApi } from 'openai';
import { prisma } from '../db';

export interface EmotionalPattern {
  mainEmotion: string;
  intensity: number;
  date: Date;
}

class JournalAnalysisService {
  private patterns: EmotionalPattern[] = [];
  private openai: OpenAIApi;

  constructor() {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
  }

  async analyzeEntry(content: string) {
    const completion = await this.openai.createChatCompletion({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: "Analyze this journal entry for emotional themes, key insights, and generate a supportive affirmation."
      }, {
        role: "user",
        content
      }]
    });

    return completion.data.choices[0].message?.content;
  }

  async generatePrompt(moonPhase: string) {
    const completion = await this.openai.createChatCompletion({
      model: "gpt-4",
      messages: [{
        role: "system",

  async trackEmotionalPattern(content: string) {
    const completion = await this.openai.createChatCompletion({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: "Analyze this journal entry and return JSON with mainEmotion and intensity (0-10)"
      }, {
        role: "user",
        content
      }]
    });

    const analysis = JSON.parse(completion.data.choices[0].message?.content || "{}");
    this.patterns.push({
      ...analysis,
      date: new Date()
    });
    
    return analysis;
  }

  getEmotionalTrends() {
    return this.patterns;
  }

        content: "Generate a southern-inspired journaling prompt based on the current moon phase."
      }, {
        role: "user",
        content: moonPhase
      }]
    });

    return completion.data.choices[0].message?.content;
  }
}
