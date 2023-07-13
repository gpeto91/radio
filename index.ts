import express, { Express, Request, Response } from 'express';
import { Server } from "socket.io";
import http from "http";
import cors from 'cors';
import dotenv from 'dotenv';
import queue from './entities/Queue';
import media from './entities/Media';
import processor from './entities/Processor';

dotenv.config();

const app: Express = express();
const port = process.env.PORT;
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

(async () => {
  queue.loadTracks("tracks");
  queue.loadIo(io);
  processor.setLoadIo(io);
  media.loadYtDlp();

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
    const socketId = req.body.socketId;
  
    if (!url) return res.status(400).send({ message: "URL do vídeo não fornecida" });
    if (!title) return res.status(400).send({ message: "Título da música não fornecida" });
    if (!artist) return res.status(400).send({ message: "Artista da música não fornecido" });
    if (!socketId) return res.status(400).send({ message: "Houve um problema com o socket. Você precisa recarregar a página" });
  
    processor.add({url, socketId, title, artist, user});

    res.status(200).send({ message: "Obrigado por participar! 🎉 Em breve receberá notificação da sua música" });
  });

  io.on("connection", (socket) => {
    console.log("socket user connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("socket user disconnected:", socket.id);
    })

    socket.emit("socket-id", socket.id);

    if (queue.currentTrack) {
      const { user, metadata } = queue.currentTrack;
      socket.emit("new-track", { user, metadata });
    }
    
  });
  
  server.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  });

})();
