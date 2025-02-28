import { Hono } from 'hono';
import ask from './routes/ask';
import speech from './routes/speech';
import upload from './routes/upload';

const app = new Hono();

// ルートをマウント
app.route('/api', ask);
app.route('/api', speech);
app.route('/api', upload);

// Cloudflare Workers に適した `fetch` ハンドラーをエクスポート
export default app;
