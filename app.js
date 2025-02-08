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

// Function to generate the code verifier
function generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
}

// Function to generate the code challenge
function generateCodeChallenge(codeVerifier) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        hash.update(codeVerifier);
        const codeChallenge = hash.digest('base64url');
        resolve(codeChallenge);
    });
}

// Route to serve the front page with login button
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to handle login and redirect to Spotify's login page
app.get('/login', async (req, res) => {
    console.log("Login route hit"); // Add a log to see if this is hit
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    req.session.codeVerifier = codeVerifier;

    const scope = 'user-library-read user-top-read';
    const authorizeUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        scope: scope,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
    }).toString()}`;

    console.log("Redirecting to Spotify"); // Log before redirect
    res.redirect(authorizeUrl);
});

// Route to handle Spotify's redirect and exchange the code for tokens
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const codeVerifier = req.session.codeVerifier;

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: code,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
            code_verifier: codeVerifier,
        }).toString());

        req.session.accessToken = response.data.access_token;
        req.session.refreshToken = response.data.refresh_token;

        res.redirect('/'); // Redirect to the homepage after login
    } catch (error) {
        console.error('Error exchanging code for token:', error);
        res.send('Error during login');
    }
});

// Route to fetch song data from Spotify API
app.post('/get_info', async (req, res) => {
    const spotifyLink = req.body.spotifyLink;
    const trackId = spotifyLink.split('/').pop(); // Extract the track ID from the URL

    if (!spotifyLink || !req.session.accessToken) {
        return res.status(400).send({ error: 'Missing song URL or access token' });
    }

    try {
        // Fetch song data from Spotify
        const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
            headers: {
                'Authorization': `Bearer ${req.session.accessToken}`,
            },
        });

        // Fetch audio features of the song
        const audioFeatures = await axios.get(`https://api.spotify.com/v1/audio-features/${trackId}`, {
            headers: {
                'Authorization': `Bearer ${req.session.accessToken}`,
            },
        });

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
        console.error('Error fetching song data:', error);
        res.status(500).send({ error: 'Error fetching song data' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
