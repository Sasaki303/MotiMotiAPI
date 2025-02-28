import { Hono } from 'hono';
import multer from 'multer';
import { promisify } from 'util';
import { writeFile } from 'fs';
import path from 'path';

const upload = new Hono();

// `multer` を使用してファイルの保存設定
const storage = multer.memoryStorage();
const uploadMiddleware = multer({ storage: storage }).single('audio');

upload.post('/upload', async (c) => {
    return new Promise((resolve) => {
        uploadMiddleware(c.req as any, c.res as any, async (err) => {
            if (err) {
                console.error('エラー: ファイルアップロードに失敗', err);
                return resolve(c.json({ type: 'failure', error: 'ファイルアップロードに失敗しました' }, 500));
            }

            const file = (c.req.raw as any).file;
            if (!file) {
                return resolve(c.json({ type: 'failure', error: '音声ファイルが必要です' }, 400));
            }

            const fileName = `audio_${Date.now()}.wav`;
            const filePath = path.join(__dirname, '../uploads', fileName);
            const writeFileAsync = promisify(writeFile);

            try {
                await writeFileAsync(filePath, file.buffer);
                console.log(`音声ファイルを保存しました: ${filePath}`);
                const fileUrl = `http://localhost:7897/uploads/${fileName}`;
                return resolve(c.json({ type: 'success', url: fileUrl }));
            } catch (error) {
                console.error('エラー: 音声ファイルの保存に失敗', error);
                return resolve(c.json({ type: 'failure', error: '音声ファイルの保存に失敗しました' }, 500));
            }
        });
    });
});

export default upload;
