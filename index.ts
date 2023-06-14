import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import queue from './entities/Queue';

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

(async () => {
  await queue.loadTracks("tracks");

  queue.play();

  app.get('/', (req: Request, res: Response) => {
    res.send('Guarani Radio API is running');
  });
  
  app.get('/stream', (req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'audio/mp3',
      'Transfer-Encoding': 'chunked',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
    });
  
    const { id, client } = queue.addClient();
  
    client.pipe(res);
  
    req.on('close', () => {
      queue.removeClient(id);
    });
  });
  
  app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  });
})();
