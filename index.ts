import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import queue from './entities/Queue';
import media from './entities/Media';

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

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
    const url = req.body?.url;
  
    if (!url) return res.status(400).send({ message: "URL do vídeo não fornecida" });
  
    try {
      await media.downloadVideo(url);
  
      res.status(200).send({ message: "Vídeo convertido com sucesso" });
    } catch(err) {
      res.status(500).send({ message: "Não foi possível baixar o vídeo fornecido" });
    }
    
  });
  
  app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  });

})();
