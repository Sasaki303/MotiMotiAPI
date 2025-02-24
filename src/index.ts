import { Hono } from 'hono';
import ask from './routes/ask';
import speech from './routes/speech';

const app = new Hono();

// ルートをマウント
app.route('/api', ask);
app.route('/api', speech);

// Cloudflare Workers に適した `fetch` ハンドラーをエクスポート
export default app;
