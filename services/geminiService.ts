
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // Always use process.env.API_KEY directly when initializing the GoogleGenAI client instance.
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async getProfitInsights(data: any) {
    const prompt = `
      作为一名亚马逊跨境电商专家，分析以下产品的各项成本并提供3个简明且可操作的优化建议。请务必使用中文回答。
      
      数据如下：
      - 售价: $${data.price}
      - 采购成本(到岸): $${data.unitCost}
      - FBA费用: $${data.fbaFee}
      - 佣金比例: ${data.referralRate}%
      - 广告占比(ACOS): ${data.acos}%
      
      请以清晰的要点形式返回。重点关注利润提升和风险管理。
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          temperature: 0.7,
          // Removed maxOutputTokens to prevent response truncation since no thinkingBudget was set.
        }
      });
      // Extract generated text directly from the .text property of GenerateContentResponse.
      return response.text || "暂时无法生成建议。";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "连接AI顾问出错。";
    }
  }

  async analyzeAdPerformance(campaigns: any[]) {
    const prompt = `
      分析以下亚马逊PPC广告系列，识别表现最佳的一个 and 最需要关注的一个。请用中文回答。
      数据: ${JSON.stringify(campaigns)}
      请为表现最差的广告系列提供一句简短的改进策略。
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      // Extract generated text directly from the .text property of GenerateContentResponse.
      return response.text;
    } catch (error) {
      return "AI分析不可用。";
    }
  }
}

export const gemini = new GeminiService();
