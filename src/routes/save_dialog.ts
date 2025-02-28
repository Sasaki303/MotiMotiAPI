import { Hono } from 'hono';

const saveDialog = new Hono();

saveDialog.post('/save_dialog', async (c) => {
  try {
    console.log("[ログ] 会話履歴の保存リクエストを受信");

    const body = await c.req.json();
    const userId = body.user_id;
    const dialogs = body.dialogs;

    if (!userId || !dialogs || !Array.isArray(dialogs)) {
      console.error("エラー: user_id または dialogs のデータ形式が不正");
      return c.json({ type: 'failure', error: 'user_id と dialogs のリストが必要です' }, 400);
    }

    console.log(`[ログ] ユーザーID: ${userId}`);
    console.log("[ログ] 受信した会話履歴:", dialogs);

    // FastAPI `/save_dialog` にリクエスト送信
    const apiUrl = 'http://127.0.0.1:8000/save_dialog';
    const apiPayload = {
      user_id: userId,
      dialogs: dialogs
    };

    console.log("[ログ] FastAPI にリクエスト送信中...");
    const apiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiPayload)
    });

    if (!apiRes.ok) {
      const apiErrorText = await apiRes.text();
      console.error("[エラー] FastAPI からのレスポンスが不正:", apiErrorText);
      return c.json({ type: 'failure', error: 'FastAPI へのリクエストに失敗しました', details: apiErrorText }, 500);
    }

    console.log("[ログ] FastAPI のレスポンスを受信しました");
    const apiData: { message: string } = await apiRes.json();

    return c.json({ type: 'success', message: apiData.message });

  } catch (error: any) {
    console.error("[エラー] 会話履歴の保存中にエラーが発生:", error);
    return c.json({ type: 'failure', error: '内部エラー', details: error.message }, 500);
  }
});

export default saveDialog;
