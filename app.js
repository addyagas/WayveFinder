
//////////////////////
// CHATGPT CODE - TESTING ONLY

const express = require('express');
const axios = require('axios');
const app = express();

// Serve static files (like the HTML page) from the 'public' directory
app.use(express.static('public'));

// Serve the index.html page when visiting the root URL
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Endpoint to get the song data from Spotify
app.post('/get_info', async (req, res) => {
    const spotifyLink = req.body.spotifyLink;  // Get the Spotify URL from the request

    // Extract track ID from the Spotify URL (assuming it's a Spotify track link)
    const trackId = extractTrackId(spotifyLink);

    // Fetch track details and features from Spotify API
    const trackData = await fetchSpotifyData(trackId);

    res.json(trackData);
});

// Start the server on port 5000
app.listen(5000, () => {
    console.log('Server is running on http://localhost:5000');
});

// Function to extract track ID from the Spotify URL
function extractTrackId(spotifyLink) {
    // Example Spotify track URL: https://open.spotify.com/track/{track_id}
    const regex = /https:\/\/open.spotify.com\/track\/([a-zA-Z0-9]+)\?/;
    const match = spotifyLink.match(regex);
    return match ? match[1] : null;
}

// Function to fetch track details and audio features from Spotify API
async function fetchSpotifyData(trackId) {
    // Spotify API endpoint to get track details
    const trackUrl = `https://api.spotify.com/v1/tracks/${trackId}`;
    const featuresUrl = `https://api.spotify.com/v1/audio-features/${trackId}`;

    try {
        const trackResponse = await axios.get(trackUrl, {
            headers: { Authorization: `Bearer BQCPOG8v7IrnfGAcUpOAm4JOjjNG_j3wdMv3X-WX-cS9cg6Cv57pwvqmMIWoapN0Nv0scyn5mIqZMifevblIohVgwayP6sP6f79Z5E2BHONLGgxvehMVkdF5cpDtdoeBvcZLNnN-UJc` }
        });
        const featuresResponse = await axios.get(featuresUrl, {
            headers: { Authorization: `Bearer BQCPOG8v7IrnfGAcUpOAm4JOjjNG_j3wdMv3X-WX-cS9cg6Cv57pwvqmMIWoapN0Nv0scyn5mIqZMifevblIohVgwayP6sP6f79Z5E2BHONLGgxvehMVkdF5cpDtdoeBvcZLNnN-UJc` }
        });

        return {
            trackName: trackResponse.data.name,
            artist: trackResponse.data.artists[0].name,
            album: trackResponse.data.album.name,
            bpm: featuresResponse.data.tempo,
            key: featuresResponse.data.key,
            loudness: featuresResponse.data.loudness,
            danceability: featuresResponse.data.danceability,
            energy: featuresResponse.data.energy,
            valence: featuresResponse.data.valence
        };
    } catch (error) {
        console.error('Error fetching data from Spotify:', error);
        return null;
    }
}
