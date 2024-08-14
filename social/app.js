document.addEventListener("DOMContentLoaded", function() {
    const nameButtonsContainer = document.getElementById('nameButtonsContainer');
    const pairingList = document.getElementById('pairing-list');
    const networkContainer = document.getElementById('network');

    // Extract the workshop name from the URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const workshopName = urlParams.get('workshop') || 'Workshop';

    // Vis.js Data
    const nodes = new vis.DataSet([]);
    const edges = new vis.DataSet([]);

    // Create a network
    const network = new vis.Network(networkContainer, { nodes, edges }, {});

    // Define constants for the API URL and token
    const databaseUrl = `https://api.baserow.io/api/database/rows/table/338107/?user_field_names=true&filter__field_2494180__contains=${workshopName}`;
    console.log(databaseUrl)
    const token = 'mZ33D9oiP9PdxPaMbYRZxogAN2D5qjOo';  // Replace with your actual token
    const baserowTableUrl = `https://api.baserow.io/api/database/rows/table/338807/?user_field_names=true&filter__field_2499943__contains=${workshopName}`;

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
    
            // Log the entire API response to see what's being returned
            console.log('API Response Data:', data);
    
            // Ensure 'results' exists in the response and has content
            if (data.results && data.results.length > 0) {
                const names = data.results.map(record => record.voornaam);
                const uniqueNames = [...new Set(names)];
    
                // Log uniqueNames to verify names are being retrieved
                console.log('Unique Names:', uniqueNames);
    
                uniqueNames.forEach(name => {
                    const button = document.createElement('button');
                    button.textContent = name;
                    button.className = 'name-button bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition';
                    button.addEventListener('click', function() {
                        const userName = document.getElementById('userName').value;
                        if (userName) {
                            savePair(userName, name);
                            button.style.display = 'none'; // Hide the button after it's clicked
                        } else {
                            alert("Please enter your name.");
                        }
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
    

    // Save the name pair, display it, update the graph, and write to Baserow
    function savePair(user, other) {
        const pair = { user, other };
        displayPair(pair);
        updateGraph(pair);
        writePairToBaserow(pair);
    }

    // Display the name pair
    function displayPair(pair) {
        const pairElement = document.createElement('div');
        pairElement.textContent = `Pair: { user: "${pair.user}", other: "${pair.other}" }`;
        pairElement.className = "bg-gray-200 p-3 rounded";
        pairingList.appendChild(pairElement);
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

        // Add an edge between the two nodes
        edges.add({ from: pair.user, to: pair.other });
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
