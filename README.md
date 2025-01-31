# Disclaimer

This project is a work in progress that will change, feature and code wise, trying to improve experience both for listeners and developers willing to help ;)

# HOW TO RUN

`git clone https://github.com/gpeto91/radio.git`

`npm install`

create a folder called `tracks` on the root directory

inside folder `tracks`, create a file with the name `playlist.json` with below content:

```json
{
  "tracks": []
}
```

create a `.env` file in the root directory with the following content:

```properties
PORT=8000
YT_COOKIE=<your_youtube_cookies>
YT_TOKEN=<your_youtube_identifier_token>
```

### How to obtain YouTube cookies and identifier token

1. Open your browser and go to [YouTube](https://www.youtube.com).
2. Log in to your YouTube account.
3. Open the browser's developer tools (F12 or right-click and select "Inspect").
4. Go to the "Network" tab.
5. Refresh the YouTube page.
6. Look for a request to `youtube.com` in the list of network requests.
7. Click on the request and go to the "Headers" tab.
8. Scroll down to the "Request Headers" section.
9. Copy the value of the `cookie` header and paste it into the `YT_COOKIE` field in your `.env` file.
10. Copy the value of the `x-youtube-identity-token` header and paste it into the `YT_TOKEN` field in your `.env` file.

`npm run dev` - starts a development server that refreshes on change

`npm run start` - starts the web service

# HOW TO USE

`GET http://localhost:[PORT]/stream` - radio streaming

`POST http://localhost:[PORT]/insert` - add new song to the radio playlist (must be a link from a youtube video/music)

```json
{
  "url": "https://www.youtube.com/watch?v=EL_pBJN_O3M",
  "name": "<name of who is adding the music>",
  "artist": "El Huervo",
  "title": "Daisuke"
}
```

# HOW THE QUEUE WORKS

All tracks has a 'queue' property that is false when loaded for the first time when the service is started. Then after a user add a new song, it will have the property 'queue' as true. After this music is played, its queue property turns to false.

When a user adds a new song it will be queued right before the first non queued music. If there's no other music queued, it will play as soon as the current music ends. If there's a queue then it will play in its correct order. After all songs are played, the playlist will start over in a infinite loop.
