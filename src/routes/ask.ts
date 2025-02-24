import { Hono } from 'hono';
import { arrayBufferToBase64 } from '../utils/arrayBufferToBase64';

const ask = new Hono();

const defaultPrompt = "あなたはツンデレなチャットボットです。１００文字以内で回答してください。";

ask.post('/ask', async (c) => {
  try {
    console.log("リクエストを受信しました");

    const body = await c.req.json();
    const inputMessages = body.messages;

    if (!inputMessages || !Array.isArray(inputMessages)) {
      console.error("エラー: messages が送信されていない、または不正な形式");
      return c.json({ type: 'failure', error: 'messages のリストが必要です' }, 400);
    }

    console.log("受信したメッセージ:", inputMessages);

    const chatApiUrl = 'http://localhost:11434/api/chat';
    const chatPayload = {
      model: "hf.co/elyza/Llama-3-ELYZA-JP-8B-GGUF:latest",
      stream: false,
      messages: [{ role: "system", content: defaultPrompt }, ...inputMessages]
    };

    console.log("チャット API にリクエスト送信中...");
    const chatRes = await fetch(chatApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatPayload)
    });

    if (!chatRes.ok) {
      const chatErrorText = await chatRes.text();
      console.error("エラー: チャット API からのレスポンスが不正", chatErrorText);
      return c.json({ type: 'failure', error: 'チャット API へのリクエストに失敗しました', details: chatErrorText }, 500);
    }

    console.log("チャット API のレスポンスを受信しました");
    interface ChatResponse {
      message: { content: string };
    }
    const chatData: ChatResponse = await chatRes.json();
    const answerText = chatData.message.content;

    if (!answerText) {
      return c.json({ type: 'failure', error: 'チャット API の返答が不正です' }, 500);
    }
    console.log(`チャット API の返答: ${answerText}`);

    const ttsApiUrl = 'http://127.0.0.1:7860/run/tts';
    const ttsPayload = {
      data: [
        body.model || "takumaModel", // body.model が空なら "takumaModel"
        0,
        answerText,
        body.base === "male" ? "ja-JP-KeitaNeural-Male" : "ja-JP-NanamiNeural-Female",
        0,
        "rmvpe",
        1,
        0.33
      ]
    };    
    

    console.log("音声合成 API にリクエスト送信中...");
    const ttsRes = await fetch(ttsApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ttsPayload)
    });

    if (!ttsRes.ok) {
      const ttsErrorText = await ttsRes.text();
      console.error("エラー: 音声合成 API からのレスポンスが不正", ttsErrorText);
      return c.json({ type: 'failure', error: '音声合成 API へのリクエストに失敗しました', details: ttsErrorText }, 500);
    }

    console.log("音声合成 API のレスポンスを受信しました");
    const ttsData = await ttsRes.json() as { data: { url: string }[] };

    let audioUrl = ttsData.data[2]?.url;
    if (!audioUrl) {
      console.error("エラー: 音声ファイルの取得に失敗");
      return c.json({ type: 'failure', error: '音声ファイルの取得に失敗しました' }, 500);
    }
    if (audioUrl.startsWith("/")) {
      audioUrl = `http://127.0.0.1:7860${audioUrl}`;
    }
    console.log(`音声ファイル URL: ${audioUrl}`);

    console.log("音声ファイルをダウンロード中...");
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      const audioErrorText = await audioRes.text();
      console.error("エラー: 音声ファイルのダウンロードに失敗", audioErrorText);
      return c.json({ type: 'failure', error: '音声ファイルのダウンロードに失敗しました', details: audioErrorText }, 500);
    }
    console.log("音声ファイルのダウンロード完了");
    const audioBuffer = await audioRes.arrayBuffer();

    const audioBase64 = arrayBufferToBase64(audioBuffer);

    const updatedMessages = [...inputMessages, { role: "assistant", content: answerText }];

    return c.json({
      type: 'success',
      text: updatedMessages,
      audio: `data:audio/wav;base64,${audioBase64}`
    });
    
  } catch (error: any) {
    console.error("内部エラーが発生しました:", error);
    return c.json({ type: 'failure', error: '内部エラーが発生しました', details: error.message }, 500);
  }
});

export default ask;