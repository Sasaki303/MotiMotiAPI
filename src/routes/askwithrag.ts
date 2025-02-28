import { Hono } from 'hono';
import { arrayBufferToBase64 } from '../utils/arrayBufferToBase64';

const askWithRag = new Hono();

askWithRag.post('/askwithrag', async (c) => {
    try {
        console.log("リクエストを受信しました");

        const body = await c.req.json();
        const userId = body.user_id;
        const userMessage = body.message;

        if (!userId || !userMessage) {
            console.error("エラー: user_id または message が送信されていない");
            return c.json({ type: 'failure', error: 'user_id と message が必要です' }, 400);
        }

        console.log(`ユーザーID: ${userId}, メッセージ: ${userMessage}`);

        // FastAPI の `/ask` にリクエスト送信 (RAG を使用)
        const ragApiUrl = 'http://127.0.0.1:8000/ask';
        const ragPayload = {
            user_id: userId,
            message: userMessage
        };

        console.log("RAG API にリクエスト送信中...");
        const ragRes = await fetch(ragApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ragPayload)
        });

        if (!ragRes.ok) {
            const ragErrorText = await ragRes.text();
            console.error("エラー: RAG API からのレスポンスが不正", ragErrorText);
            return c.json({ type: 'failure', error: 'RAG API へのリクエストに失敗しました', details: ragErrorText }, 500);
        }

        console.log("RAG API のレスポンスを受信しました");
        const ragData = await ragRes.json() as { response: string };
        const answerText = ragData.response;

        if (!answerText) {
            return c.json({ type: 'failure', error: 'RAG API の返答が不正です' }, 500);
        }
        console.log(`RAG API の返答: ${answerText}`);

        // 音声合成 API にリクエスト送信
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

        return c.json({
            type: 'success',
            text: answerText,
            audio: `data:audio/wav;base64,${audioBase64}`
        });

    } catch (error: any) {
        console.error("内部エラーが発生しました:", error);
        return c.json({ type: 'failure', error: '内部エラーが発生しました', details: error.message }, 500);
    }
});

export default askWithRag;
