import express, { Express, Request, Response } from 'express';
import { Server } from "socket.io";
import https from "https";
import http from "http";
import fs from "fs";
import cors from 'cors';
import dotenv from 'dotenv';
import queue from './entities/Queue';
import processor from './entities/Processor';

const IS_LOCAL = process.argv.includes('--local');

dotenv.config();

const options = {
  cert: fs.readFileSync("/home/ec2-user/radio/certs/fullchain.pem"),
  key: fs.readFileSync("/home/ec2-user/radio/certs/privkey.pem")
}

const app: Express = express();
const port = process.env.PORT;
const server = IS_LOCAL ?  http.createServer(app) : https.createServer(options, app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

(async () => {
  queue.loadTracks("tracks");
  queue.loadIo(io);
  processor.setLoadIo(io);

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

  if (IS_LOCAL) {
    server.listen(port, () => {
      console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
    });
  } else {
    server.listen(443, () => {
      console.log(`⚡️[server]: Server is running at https://guarani-radio.ddns.net:443`);
    });
  }
  

})();
