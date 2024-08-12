document.addEventListener('DOMContentLoaded', async () => {
    const ctx = document.getElementById('feedbackChart').getContext('2d');
    const feedbackForm = document.getElementById('feedbackForm');

    // Function to generate a random jitter value within a specified range
    function getJitter() {
        return (Math.random() - 0.5) * 0.2; // Jitter value between -0.1 and 0.1
    }

    // Function to clamp a value between a minimum and maximum
    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    // Extract the workshop name from the URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const workshopName = urlParams.get('workshop') || 'Workshop';

    // Update the page title with the workshop name
    document.title = `${workshopName} Retrospective`;

    // Update the title on the page
    document.querySelector('h1').textContent = `${workshopName} Retrospective`;

    let chartData = {
        datasets: [{
            data: [],
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
        }]
    };

    const feedbackChart = new Chart(ctx, {
        type: 'bubble',
        data: chartData,
        options: {
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Information'
                    },
                    min: 0,
                    max: 5,
                    ticks: {
                        stepSize: 1,
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Interaction'
                    },
                    min: 0,
                    max: 5,
                    ticks: {
                        stepSize: 1,
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // Hides the legend
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const { originalX, originalY, originalR } = context.raw;
                            const voornaam = context.raw.voornaam;
                            return `${voornaam}: Information=${originalX}, Interaction=${originalY}, Inspiration=${originalR}`;
                        }
                    }
                }
            }
        }
    });

    // Fetch data from the Baserow database and populate the chart
    const databaseUrl = `https://api.baserow.io/api/database/rows/table/338107/?user_field_names=true&filter__field_2494180__contains=${workshopName}`;
    const token = 'mZ33D9oiP9PdxPaMbYRZxogAN2D5qjOo'; // Replace with your actual token

    try {
        const response = await fetch(databaseUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log('Fetched data from database:', data);

        data.results.forEach(item => {
            // Convert string values to numbers before adding to the chart
            const informatie = parseFloat(item.informatie);
            const interactie = parseFloat(item.interactie);
            let inspiratie = parseFloat(item.inspiratie);

            // If inspiration is zero, set radius to 2
            let radius = inspiratie === 0 ? 4 : inspiratie * 5;

            // Apply jitter to the values to avoid overlapping points
            let jitteredInformatie = informatie + getJitter();
            let jitteredInteractie = interactie + getJitter();

            // Ensure the values remain between 0 and 5
            jitteredInformatie = clamp(jitteredInformatie, 0, 5);
            jitteredInteractie = clamp(jitteredInteractie, 0, 5);

            chartData.datasets[0].data.push({
                x: jitteredInformatie,
                y: jitteredInteractie,
                r: radius,
                originalX: informatie,
                originalY: interactie,
                originalR: inspiratie, // Keep original inspiration score
                voornaam: item.voornaam
            });
        });

        feedbackChart.update();
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }

    feedbackForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const voornaam = document.getElementById('voornaam').value;
        const informatie = parseFloat(document.querySelector('input[name="informatie"]:checked').value);
        const interactie = parseFloat(document.querySelector('input[name="interactie"]:checked').value);
        let inspiratie = parseFloat(document.querySelector('input[name="inspiratie"]:checked').value);

        // Set radius to 2 if inspiration is zero
        let radius = inspiratie === 0 ? 4 : inspiratie * 5;

        // Apply jitter to the values to avoid overlapping points
        let jitteredInformatie = informatie + getJitter();
        let jitteredInteractie = interactie + getJitter();

        // Ensure the values remain between 0 and 5
        jitteredInformatie = clamp(jitteredInformatie, 0, 5);
        jitteredInteractie = clamp(jitteredInteractie, 0, 5);

        // Send data to the Baserow database
        try {
            const response = await fetch(databaseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    voornaam: voornaam,
                    informatie: informatie,
                    interactie: interactie,
                    inspiratie: inspiratie,
                    course: workshopName // Include the workshop name as "course"
                })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            console.log('Data successfully sent to the database:', data);

            // After successful POST, add the data to the chart
            chartData.datasets[0].data.push({
                x: jitteredInformatie,
                y: jitteredInteractie,
                r: radius, // Use calculated radius
                originalX: informatie,
                originalY: interactie,
                originalR: inspiratie, // Keep original inspiration score
                voornaam: voornaam
            });

            feedbackChart.update();

            // Reset the form to the first available option and clear the radio buttons
            feedbackForm.reset();
        } catch (error) {
            console.error('There was a problem with the fetch operation:', error);
        }
    });
});
