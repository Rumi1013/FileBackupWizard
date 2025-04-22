
import { OpenAIApi, Configuration } from 'openai';

export class CommunityWisdomService {
  private openai: OpenAIApi;

  constructor() {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
  }

  async transcribeAudio(audioBuffer: Buffer) {
    // Implement audio transcription
    const transcript = await this.openai.createTranscription(
      audioBuffer,
      "whisper-1"
    );
    return transcript.data.text;
  }

  async categorizeStory(content: string) {
    const completion = await this.openai.createChatCompletion({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: "Categorize this southern wisdom story by topic and region"
      }, {
        role: "user",
        content
      }]
    });

    return completion.data.choices[0].message?.content;
  }
}
