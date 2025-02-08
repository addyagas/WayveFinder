// This function handles the form submission
document.getElementById('spotify-form').addEventListener('submit', function(event) {
    event.preventDefault();  // Prevent the default form submission

    // Get the Spotify track link from the input field
    const spotifyLink = document.getElementById('spotify-link').value;

    // Send the Spotify link to the backend
    axios.post('/get_info', { spotifyLink: spotifyLink })
        .then(response => {
            // Display the song data in the #track-info div
            const trackInfo = response.data;
            const trackInfoDiv = document.getElementById('track-info');
            trackInfoDiv.innerHTML = `
                <h2>Song Info</h2>
                <p><strong>Name:</strong> ${trackInfo.name}</p>
                <p><strong>Artist:</strong> ${trackInfo.artist}</p>
                <p><strong>BPM:</strong> ${trackInfo.bpm}</p>
                <p><strong>Key:</strong> ${trackInfo.key}</p>
                <p><strong>Loudness:</strong> ${trackInfo.loudness}</p>
                <p><strong>Danceability:</strong> ${trackInfo.danceability}</p>
                <p><strong>Energy:</strong> ${trackInfo.energy}</p>
                <p><strong>Valence:</strong> ${trackInfo.valence}</p>
            `;
        })
        .catch(error => {
            console.error('Error:', error);
            const trackInfoDiv = document.getElementById('track-info');
            trackInfoDiv.innerHTML = '<p>Error fetching song data. Please try again.</p>';
        });
});
