document.addEventListener("DOMContentLoaded", function() {
    const instructionsDiv = document.getElementById('instructions');
    const nameButtonsContainer = document.getElementById('nameButtonsContainer');
    const networkContainer = document.getElementById('network');

    // Extract the workshop name from the URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const workshopName = urlParams.get('workshop') || 'Workshop';

    // Update the page title with the workshop name
    document.title = `${workshopName} Social Graph`;

    // Update the title on the page
    document.querySelector('h1').textContent = `${workshopName} Social Graph`;    

    // Vis.js Data
    const nodes = new vis.DataSet([]);
    const edges = new vis.DataSet([]);

    // Create a network
    const network = new vis.Network(networkContainer, { nodes, edges }, {});

    // Define constants for the API URL and token
    const databaseUrl = `https://api.baserow.io/api/database/rows/table/338107/?user_field_names=true&filter__field_2494180__contains=${encodeURIComponent(workshopName)}`;
    const token = 'mZ33D9oiP9PdxPaMbYRZxogAN2D5qjOo';
    const baserowTableUrl = `https://api.baserow.io/api/database/rows/table/338807/?user_field_names=true&filter__field_2499943__contains=${workshopName}`;

    let selectedUserName = null;

    // Fetch and populate the network graph with existing name pairs from the Baserow table
    async function fetchAndPopulatePairs() {
        try {
            const response = await fetch(baserowTableUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const pairs = data.results;

            // Populate the network graph with existing pairs
            pairs.forEach(pair => {
                updateGraph({
                    user: pair.user,
                    other: pair.other
                });
            });

        } catch (error) {
            console.error('Error fetching name pairs from Baserow:', error);
            alert('Failed to load existing name pairs. Please try again later.');
        }
    }

    // Fetch names from the provided API with try-catch for error handling
    async function fetchNames() {
        try {
            const response = await fetch(databaseUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${token}`
                }
            });
    
            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }
    
            const data = await response.json();
    
            // Ensure 'results' exists in the response and has content
            if (data.results && data.results.length > 0) {
                const names = data.results.map(record => record.voornaam);
                const uniqueNames = [...new Set(names)];
    
                // Create a single set of buttons for name selection
                uniqueNames.forEach(name => {
                    const button = document.createElement('button');
                    button.textContent = name;
                    button.className = 'name-button bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded-full';
                    button.addEventListener('click', function() {
                        if (!selectedUserName) {
                            // The first click sets the user's name
                            selectedUserName = name;
                            instructionsDiv.innerHTML = `
                                <p class="font-bold">Great!</p>
                                <p>Now click on the names of the persons you've interacted with.</p>
                            `;
                            // Change the color of the first clicked button to 'HotPink'
                            button.style.backgroundColor = 'deeppink';
                            button.style.color = 'white';
                        } else {
                            // Subsequent clicks are pairing selections
                            savePair(selectedUserName, name);
                        }
                        // Disable the clicked button
                        button.disabled = true;
                        button.className = 'bg-blue-500 text-white font-bold py-2 px-4 rounded opacity-50 cursor-not-allowed';
                    });
                    nameButtonsContainer.appendChild(button);
                });

                if (uniqueNames.length === 0) {
                    console.log('No unique names found to generate buttons.');
                }
    
            } else {
                console.log('No results found in API response.');
            }
    
        } catch (error) {
            console.error('Error fetching names:', error);
            alert('Failed to load names. Please try again later.');
        }
    }
    

    // Save the name pair, update the graph, and write to Baserow
    function savePair(user, other) {
        const pair = { user, other };
        updateGraph(pair);
        writePairToBaserow(pair);
    }

    // Update the network graph with the new pair
    function updateGraph(pair) {
        // Add nodes if they don't already exist
        if (!nodes.get(pair.user)) {
            nodes.add({ id: pair.user, label: pair.user });
        }
        if (!nodes.get(pair.other)) {
            nodes.add({ id: pair.other, label: pair.other });
        }

        // Check if an edge already exists between the two nodes
        const existingEdge = edges.get({
            filter: (edge) => (
                (edge.from === pair.user && edge.to === pair.other) ||
                (edge.from === pair.other && edge.to === pair.user)
            )
        });

        // If no edge exists, add a new one
        if (existingEdge.length === 0) {
            edges.add({ from: pair.user, to: pair.other });
        }
    }

    // Write the name pair to the Baserow table
    async function writePairToBaserow(pair) {
        // Send data to the Baserow database
        try {
            const response = await fetch(baserowTableUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    course: workshopName, // Assuming "course" is the correct field name for the workshop name
                    user: pair.user, // Send the actual user name
                    other: pair.other // Send the actual other name
                })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            console.log('Data successfully sent to the database:', data);

        } catch (error) {
            console.error('Error writing to Baserow:', error);
            alert('Failed to save the pair. Please try again later.');
        }
    }

    // Call the functions to fetch existing pairs and then load names when the page loads
    fetchAndPopulatePairs();
    fetchNames();
});
