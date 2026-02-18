// src/common/services/gemini.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    
    // Gemini 2.0 Flash 모델 사용 (빠르고 안정적)
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      } as any,
    });
  }

  /**
   * Gemini API로 텍스트 생성
   * @param prompt 프롬프트
   * @returns 생성된 텍스트
   */
  async generateContent(prompt: string): Promise<string> {
    try {
      this.logger.log('Gemini API 호출 시작');
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      this.logger.log(`Gemini API 응답 성공 (${text.length} chars)`);
      
      return text;
    } catch (error) {
      this.logger.error('Gemini API 호출 실패:', error);
      throw new Error(`Gemini API Error: ${error.message}`);
    }
  }

  /**
   * JSON 형식으로 응답 요청 (파싱 포함)
   * @param prompt 프롬프트
   * @returns 파싱된 JSON 객체
   */
  async generateJSON<T = any>(prompt: string): Promise<T> {
    let text = '';
    try {
      text = await this.generateContent(prompt);

      // responseMimeType이 application/json이면 바로 파싱 가능
      // fallback: ```json ... ``` 블록 추출
      let jsonText = text;
      const jsonMatch = text.match(/```json\s*\n([\s\S]*?)(?:\n```|$)/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonText.trim());

      return parsed as T;
    } catch (error) {
      this.logger.error('JSON 파싱 실패:', error);
      this.logger.error('원본 텍스트:', text.substring(0, 500));
      throw new Error(`Failed to parse Gemini response as JSON: ${error.message}`);
    }
  }

  /**
   * 토큰 수 추정 (대략적)
   * 1 토큰 ≈ 4 characters (영어 기준)
   * 한글은 1 토큰 ≈ 2 characters
   */
  estimateTokens(text: string): number {
    // 한글 비율 계산
    const koreanChars = text.match(/[가-힣]/g)?.length || 0;
    const totalChars = text.length;
    const koreanRatio = koreanChars / totalChars;
    
    // 토큰 추정
    const avgCharsPerToken = 4 * (1 - koreanRatio) + 2 * koreanRatio;
    return Math.ceil(totalChars / avgCharsPerToken);
  }

  /**
   * 비용 추정 (USD)
   * Input: $0.075 / 1M tokens
   * Output: $0.30 / 1M tokens
   */
  estimateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * 0.075;
    const outputCost = (outputTokens / 1_000_000) * 0.30;
    return inputCost + outputCost;
  }
}