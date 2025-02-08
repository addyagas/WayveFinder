const express = require('express');
const session = require('express-session');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const bodyParser = require('body-parser');

const CLIENT_ID = 'ac2f2d498d0145ada68b8db0ff357943';
const CLIENT_SECRET = '31914cd9cbdf47e9aff3da89ae8c4edb';
const REDIRECT_URI = 'http://localhost:8888/callback'; // Your redirect URI

const app = express();
const port = 8888;

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Initialize session middleware
app.use(session({
    secret: 'your_session_secret',
    resave: false,
    saveUninitialized: true,
}));

// Serve static files (e.g., HTML, CSS, JS for the front end)
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the front page with login button
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to handle login and redirect to Spotify's login page
app.get('/login', async (req, res) => {
    try {
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        req.session.codeVerifier = codeVerifier;

        // define scope of what we need/want
        const scope = 'playlist-read-private user-library-read user-top-read streaming';

        const authorizeUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
            client_id: CLIENT_ID,
            response_type: 'code',
            redirect_uri: REDIRECT_URI,
            scope: scope,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
        }).toString()}`;

        console.log('Redirecting to Spotify Authorization URL:', authorizeUrl); // Debugging log

        res.redirect(authorizeUrl);
    } catch (error) {
        console.error('Error during login:', error);
        res.send('Error during login');
    }
});

// Route to handle Spotify's redirect and exchange the code for tokens
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const codeVerifier = req.session.codeVerifier;

    console.log('Callback received with code:', code); // Debugging log

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: code,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
            code_verifier: codeVerifier,
        }).toString());

        console.log('Token exchange successful:', response.data); // Debugging log
        req.session.accessToken = response.data.access_token;
        req.session.refreshToken = response.data.refresh_token;
        req.session.expiresAt = Date.now() + response.data.expires_in * 1000;

        res.redirect('/'); // Redirect to the homepage after login
    } catch (error) {
        console.error('Error exchanging code for token:', error);
        res.send('Error during login');
    }
});

// Route to fetch song data from Spotify API
// Backend (Node.js)
app.post('/get_info', async (req, res) => {
    const spotifyLink = req.body.spotifyLink;
    const trackId = spotifyLink.split('/').pop(); // Extract the track ID from the URL

    console.log('Received Spotify link:', spotifyLink); // Debugging log
    console.log('Extracted Track ID:', trackId); // Debugging log

    if (!spotifyLink || !req.session.accessToken) {
        return res.status(400).send({ error: 'Missing song URL or access token' });
    }

    try {
        // Check if the access token is expired (based on the expiration time)
        const currentTime = Date.now();
        if (req.session.expiresAt < currentTime) {
            console.log('Access token expired, refreshing...');
            await refreshAccessToken(req);
        }

        // Fetch song data from Spotify
        const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
            headers: {
                'Authorization': `Bearer ${req.session.accessToken}`,
            },
        });

        console.log(response);
        console.log();

        // Fetch audio features of the song
        const audioFeatures = await axios.get(`https://api.spotify.com/v1/audio-features/${trackId}`, {
            headers: {
                'Authorization': `Bearer ${req.session.accessToken}`,
            },
        });
        console.log(audioFeatures);

        if (!audioFeatures.data) {
            return res.status(500).send({ error: 'Audio features not available' });
        }

        // Combine song data and audio features
        const songInfo = {
            name: response.data.name,
            artist: response.data.artists[0].name,
            bpm: audioFeatures.data.tempo,
            key: audioFeatures.data.key,
            loudness: audioFeatures.data.loudness,
            danceability: audioFeatures.data.danceability,
            energy: audioFeatures.data.energy,
            valence: audioFeatures.data.valence,
        };

        // Send song data and audio features back to the frontend
        res.json(songInfo);

    } catch (error) {
        console.error('Error fetching song data:', error.response ? error.response.data : error.message); // Detailed error logging
        res.status(500).send({ error: 'Error fetching song data' });
    }
});


// Helper function to refresh access token
async function refreshAccessToken(req) {
    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: req.session.refreshToken,
        }).toString());

        console.log('Access token refreshed:', response.data); // Debugging log
        req.session.accessToken = response.data.access_token;
        req.session.expiresAt = Date.now() + response.data.expires_in * 1000;
    } catch (error) {
        console.error('Error refreshing token:', error);
        throw new Error('Error refreshing access token');
    }
}

// Helper function to generate the code verifier
function generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
}

// Helper function to generate the code challenge
function generateCodeChallenge(codeVerifier) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        hash.update(codeVerifier);
        const codeChallenge = hash.digest('base64url');
        resolve(codeChallenge);
    });
}

// Start the server
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});