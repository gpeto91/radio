import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import queue from './entities/Queue';
import media from './entities/Media';

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());


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
  
  app.post('/insert', async (req: Request, res: Response) => {
    const url = req.body.url;
    const user = req.body.user;
    const title = req.body.title;
    const artist = req.body.artist;
  
    if (!url) return res.status(400).send({ message: "URL do vídeo não fornecida" });
  
    try {
      const queueLength = await media.downloadVideo(url, title, artist, user);

      const message = queueLength === 0 ? "Música adiciona à lista. Sua música será a próxima!" : queueLength === 1 ? "Música adiciona à lista. Tem uma música a frente da sua." : `Música adicionada à lista. Tem ${queueLength} músicas na frente da sua.`
  
      res.status(200).send({ message });
    } catch(err) {
      res.status(500).send({ message: err });
    }
    
  });
  
  app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  });

})();
