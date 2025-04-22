
import { OpenAIApi, Configuration } from 'openai';

export class RecipeManager {
  private openai: OpenAIApi;

  constructor() {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
  }

  async suggestSubstitutions(ingredients: string[]) {
    const completion = await this.openai.createChatCompletion({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: "Suggest southern-inspired ingredient substitutions"
      }, {
        role: "user",
        content: ingredients.join(", ")
      }]
    });

    return completion.data.choices[0].message?.content;
  }
}
