import { Hono } from 'hono';
import ask from './routes/ask';
import speech from './routes/speech';
import upload from './routes/upload';
import askWithRag from './routes/askwithrag';
import saveDialog from './routes/save_dialog';


const app = new Hono();

// ルートをマウント
app.route('/api', ask);
app.route('/api', speech);
app.route('/api', upload); //音声アップロード
app.route('/api', askWithRag); //RAGで生成
app.route('/api', saveDialog); //会話保存

// Cloudflare Workers に適した `fetch` ハンドラーをエクスポート
export default app;
