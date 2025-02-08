document.getElementById('spotify-form').addEventListener('submit', async function (event) {
    event.preventDefault();

    const spotifyLink = document.getElementById('spotify-link').value;
    const trackInfoDiv = document.getElementById('track-info');

    if (!spotifyLink) {
        trackInfoDiv.innerHTML = 'Please enter a valid Spotify track link.';
        return;
    }

    trackInfoDiv.innerHTML = 'Loading...'; // Show loading message

    try {
        const response = await fetch('/get_info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ spotifyLink: spotifyLink }),
        });

        const data = await response.json();

        if (data.error) {
            trackInfoDiv.innerHTML = `Error: ${data.error}`;
        } else {
            trackInfoDiv.innerHTML = `
                <h3>${data.name} by ${data.artist}</h3>
                <p><strong>BPM:</strong> ${data.bpm}</p>
                <p><strong>Key:</strong> ${data.key}</p>
                <p><strong>Loudness:</strong> ${data.loudness} dB</p>
                <p><strong>Danceability:</strong> ${data.danceability}</p>
                <p><strong>Energy:</strong> ${data.energy}</p>
                <p><strong>Valence:</strong> ${data.valence}</p>
            `;
        }
    } catch (error) {
        trackInfoDiv.innerHTML = `Error: ${error.message}`;
    }
});
