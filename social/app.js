document.addEventListener("DOMContentLoaded", function() {
    const instructionsDiv = document.getElementById('instructions');
    const nameButtonsContainer = document.getElementById('nameButtonsContainer');
    const finishButton = document.getElementById('finishButton');
    const networkContainer = document.getElementById('network');

    // Haal de workshopnaam op uit de URL-queryparameters
    const urlParams = new URLSearchParams(window.location.search);
    const workshopName = urlParams.get('workshop') || 'Workshop';

    // Werk de paginatitel bij met de workshopnaam
    document.title = `${workshopName} Netwerk Grafiek`;

    // Werk de titel op de pagina bij
    document.querySelector('h1').textContent = `${workshopName} Netwerk Grafiek`;    

    // Vis.js Gegevens
    const nodes = new vis.DataSet([]);
    const edges = new vis.DataSet([]);

    // Maak een netwerk
    const network = new vis.Network(networkContainer, { nodes, edges }, {});

    // Definieer constanten voor de API-URL en token
    const databaseUrl = `https://api.baserow.io/api/database/rows/table/338107/?user_field_names=true&filter__field_2494180__contains=${encodeURIComponent(workshopName)}`;
    const token = 'mZ33D9oiP9PdxPaMbYRZxogAN2D5qjOo';
    const baserowTableUrl = `https://api.baserow.io/api/database/rows/table/338807/?user_field_names=true&filter__field_2499943__contains=${workshopName}`;

    let selectedUserName = null;

    // Haal en vul de netwerkdiagram met bestaande naamparen uit de Baserow-tabel
    async function fetchAndPopulatePairs() {
        try {
            const response = await fetch(baserowTableUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Fout: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const pairs = data.results;

            // Vul de netwerkdiagram met bestaande paren
            pairs.forEach(pair => {
                updateGraph({
                    user: pair.user,
                    other: pair.other
                });
            });

        } catch (error) {
            console.error('Fout bij het ophalen van naamparen van Baserow:', error);
            alert('Het laden van bestaande naamparen is mislukt. Probeer het later opnieuw.');
        }
    }

    // Haal namen op van de opgegeven API met try-catch voor foutafhandeling
    async function fetchNames() {
        try {
            const response = await fetch(databaseUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${token}`
                }
            });
    
            if (!response.ok) {
                throw new Error(`Fout: ${response.status} ${response.statusText}`);
            }
    
            const data = await response.json();
    
            // Zorg ervoor dat 'results' bestaat in de respons en inhoud heeft
            if (data.results && data.results.length > 0) {
                const names = data.results.map(record => record.voornaam);
                const uniqueNames = [...new Set(names)];
    
                // Maak een enkele set knoppen voor naamselectie
                uniqueNames.forEach(name => {
                    const button = document.createElement('button');
                    button.textContent = name;
                    button.className = 'name-button bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded-full';
                    button.addEventListener('click', function() {
                        if (!selectedUserName) {
                            // De eerste klik stelt de naam van de gebruiker in
                            selectedUserName = name;
                            instructionsDiv.innerHTML = `
                                <p class="font-bold">Hallo ${selectedUserName}!</p>
                                <p>Klik op de namen van de personen waarmee je hebt samengewerkt. Druk daarna op 'Klaar'.</p>
                            `;
                            // Verander de kleur van de eerste aangeklikte knop naar 'HotPink'
                            button.style.backgroundColor = 'deeppink';
                            button.style.color = 'white';
                        } else {
                            // Latere klikken zijn koppelingsselecties
                            savePair(selectedUserName, name);
                        }
                        // Schakel de aangeklikte knop uit
                        button.disabled = true;
                        button.className = 'bg-blue-500 text-white font-bold py-2 px-4 rounded opacity-50 cursor-not-allowed';
                    });
                    nameButtonsContainer.appendChild(button);
                });

                if (uniqueNames.length === 0) {
                    console.log('Geen unieke namen gevonden om knoppen te genereren.');
                }
    
            } else {
                console.log('Geen resultaten gevonden in de API-respons.');
            }
    
        } catch (error) {
            console.error('Fout bij het ophalen van namen:', error);
            alert('Het laden van namen is mislukt. Probeer het later opnieuw.');
        }
    }
    

    // Sla het naamkoppel op, werk de grafiek bij en schrijf naar Baserow
    function savePair(user, other) {
        const pair = { user, other };
        updateGraph(pair);
        writePairToBaserow(pair);
    }

    // Werk de netwerkdiagram bij met het nieuwe paar
    function updateGraph(pair) {
        // Voeg knooppunten toe als ze nog niet bestaan
        if (!nodes.get(pair.user)) {
            nodes.add({ id: pair.user, label: pair.user });
        }
        if (!nodes.get(pair.other)) {
            nodes.add({ id: pair.other, label: pair.other });
        }

        // Controleer of er al een rand bestaat tussen de twee knooppunten
        const existingEdge = edges.get({
            filter: (edge) => (
                (edge.from === pair.user && edge.to === pair.other) ||
                (edge.from === pair.other && edge.to === pair.user)
            )
        });

        // Als er geen rand bestaat, voeg een nieuwe toe
        if (existingEdge.length === 0) {
            edges.add({ from: pair.user, to: pair.other });
        }
    }

    // Schrijf het naamkoppel naar de Baserow-tabel
    async function writePairToBaserow(pair) {
        // Verstuur gegevens naar de Baserow-database
        try {
            const response = await fetch(baserowTableUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    course: workshopName, // Aannemende dat "course" de juiste veldnaam is voor de workshopnaam
                    user: pair.user, // Stuur de daadwerkelijke gebruikersnaam
                    other: pair.other // Stuur de daadwerkelijke andere naam
                })
            });

            if (!response.ok) {
                throw new Error('Netwerkrespons was niet ok');
            }

            const data = await response.json();
            console.log('Gegevens succesvol naar de database verzonden:', data);

        } catch (error) {
            console.error('Fout bij het schrijven naar Baserow:', error);
            alert('Het opslaan van het koppel is mislukt. Probeer het later opnieuw.');
        }
    }

    // Event listener for the "Finish" button
    finishButton.addEventListener('click', function() {
        // Clear all name buttons
        nameButtonsContainer.innerHTML = '';
        instructionsDiv.innerHTML = `
            <p class="font-bold">Klaar!</p>
            <p>Alle namen zijn opgeslagen.</p>
        `;
    });

    // Roep de functies aan om bestaande paren op te halen en vervolgens namen te laden wanneer de pagina wordt geladen
    fetchAndPopulatePairs();
    fetchNames();
});
