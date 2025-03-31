import ChartManager from './Classes/ChartManager.js';

function formatData(measurements, timestamps) {
    if (!measurements || !timestamps || measurements.length !== timestamps.length) {
        console.error('Données ou timestamps manquants ou non correspondants dans formatData');
        return [];
    }

    return measurements.map((measurement, index) => ({
        x: new Date(timestamps[index]),
        y: measurement
    }));
}

function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/// Function to load and update charts with a date range
async function getData(startDate, endDate, sensors) {
    const response = await fetch('/getDatagraphs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
            sensors: sensors,
        })
    });
    const result = await response.json();
    return result.data;
}

function getToday() {
    const today = new Date();

    // Set seconds and milliseconds to zero
    today.setSeconds(0);
    today.setMilliseconds(0);

    // Get year, month, day, hour, minute and format according to local machine
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');  // Month from 01 to 12
    const day = String(today.getDate()).padStart(2, '0');  // Day of month
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');

    // Create string without seconds or milliseconds, in local format
    const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:00`;

    return formattedDate;
}

function getYesterday() {
    const yesterday = new Date();

    // Soustraire un jour pour obtenir hier
    yesterday.setDate(yesterday.getDate() - 1);

    // Mettre les secondes et millisecondes à zéro
    yesterday.setSeconds(0);
    yesterday.setMilliseconds(0);

    // Récupérer l'année, mois, jour, heure, minute et formater en fonction de la machine locale
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');  // Mois de 01 à 12
    const day = String(yesterday.getDate()).padStart(2, '0');  // Jour du mois
    const hours = String(yesterday.getHours()).padStart(2, '0');
    const minutes = String(yesterday.getMinutes()).padStart(2, '0');

    // Créer la chaîne sans secondes ni millisecondes, au format local
    const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:00`;

    return formattedDate;
}

function initializeDateFields() {
    const today = getToday();
    const yesterday = getYesterday();

    document.getElementById('graphStartDate').value = yesterday;
    document.getElementById('graphEndDate').value = today;
}

window.toggleSensorListOverlay = function(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) {
        overlay.style.display = (overlay.style.display === 'none' || overlay.style.display === '') ? 'block' : 'none';
    }
}

window.openMainPage = function(){
    console.log("change window clicked");
    localStorage.setItem("returnToMain", "true");  // Signaler que l'on souhaite revenir à l'onglet principal
    window.focus();  // Optionnel, pour rester actif dans l'onglet /Graphs
}

// Appeler la fonction pour initialiser les champs de date lorsque le document est prêt
document.addEventListener('DOMContentLoaded', () => {
    initializeDateFields();
});


document.addEventListener('DOMContentLoaded', async () => {
    let charts = {};
    let lastUpdate = {};
    let graphCounter = 1;
    let configData = {};

    const colors = [
        'rgba(75, 192, 192, 0.6)',  // Teal
        'rgba(255, 99, 132, 0.6)',  // Red
        'rgba(54, 162, 235, 0.6)',  // Blue
        'rgba(255, 206, 86, 0.6)',  // Yellow
        'rgba(153, 102, 255, 0.6)', // Purple
        'rgba(255, 159, 64, 0.6)',  // Orange
        'rgba(201, 203, 207, 0.6)',  // Grey
        'rgba(132, 197, 125, 0.6)',  // Green
        'rgba(206, 118, 207, 0.6)'  // Pink
    ];
    
    const borderColors = [
        'rgba(75, 192, 192, 1)',    // Teal (border)
        'rgba(255, 99, 132, 1)',    // Red (border)
        'rgba(54, 162, 235, 1)',    // Blue (border)
        'rgba(255, 206, 86, 1)',    // Yellow (border)
        'rgba(153, 102, 255, 1)',   // Purple (border)
        'rgba(255, 159, 64, 1)',    // Orange (border)
        'rgba(201, 203, 207, 1)',    // Grey (border)
        'rgba(103, 190, 94, 0.6)',  // Green
        'rgba(204, 81, 207, 0.6)'  // Pink
    ];
    
    let sensorColors = {};
    let grandeurColors = {};
    let cdr = {};

    // Charger l'état des checkboxes depuis le local storage
    Object.keys(configData).forEach(sensor => loadCheckboxState(sensor));

    async function updateChart(chartId = null, full = false) {
        const chartsToUpdate = chartId ? { [chartId]: charts[chartId] } : charts;

        for (const id in chartsToUpdate) {
            const chartManager = chartsToUpdate[id];
            const sensorData = chartManager.sensorData; // info sur les capteurs et les grandeurs sous la forme {sensor: [measurement1, measurement2, ...]}

            let startDate, endDate;

            if ((chartManager.live)) {
                if(!full){
                    startDate = chartManager.ts_end;
                }
                else{
                    startDate = chartManager.ts_start;
                }
                
                endDate = getToday();
            } else if (full) {
                startDate = chartManager.ts_start;
                endDate = chartManager.ts_end;
            } else {
                console.log(`Skipping chart: ${id} as it is not live and full update is not requested`);
                continue;
            }

            // Comparer les dates et demander uniquement les données nécessaires
            
            let data = await getData(startDate, endDate, sensorData);

            // Vérifier que data n'est pas vide
            if (!data || Object.keys(data).length === 0) {
                console.log(`No new data for chart: ${id}`);
                continue;
            }


            for (const sensor in sensorData) {
                if (!data || !data[sensor]) {
                    console.error(`No data found for sensor: ${sensor}`);
                    continue;
                }

                let dicoConfig = configData.sensors[cdr[sensor]].measurements;//dico pour accéder aux nom et unités des grandeurs
                console.log(dicoConfig);

                const raw_dataset = data[sensor];
                const timestamp = raw_dataset['timestamps'];

                if (!raw_dataset || !timestamp) {
                    console.error(`Invalid dataset for sensor: ${sensor}`);
                    continue;
                }

                var datasets = chartManager.chart.data.datasets;
                var index = 0;

                var yAxis2Title = '';
                var yAxis1Title = '';

                for (const key in raw_dataset) {
                    console.log(key);
                    if (key !== 'timestamps') {
                        index++;
                        const yAxisID = index % 2 === 0 ? 'y-axis-2' : 'y-axis-1';
                        if (yAxisID === 'y-axis-2') {
                            yAxis2Title = dicoConfig[key].name + " " + sensor + " ( " + dicoConfig[key].unit + " )" ; // Set the title for y-axis-2
                        } else {
                            yAxis1Title = dicoConfig[key].name + " " + sensor + " ( " + dicoConfig[key].unit + " )" ; // Set the title for y-axis-1
                        }

                        const newData = formatData(raw_dataset[key], timestamp);
                        const existingDatasetIndex = datasets.findIndex(ds => ds.label === dicoConfig[key].name + " " + sensor);

                        // Déterminer la couleur en fonction du type de grandeur et du capteur
                        let backgroundColor, borderColor;
                        if (datasets.some(ds => ds.label.includes(dicoConfig[key].name))) {
                            // Si la grandeur est déjà présente dans le graphique, utiliser la couleur du capteur
                            backgroundColor = sensorColors[sensor]?.backgroundColor || 'rgba(0, 0, 0, 0.6)';
                            borderColor = sensorColors[sensor]?.borderColor || 'rgba(0, 0, 0, 1)';
                        } else {
                            // Sinon, utiliser la couleur de la grandeur
                            backgroundColor = grandeurColors[key]?.backgroundColor || 'rgba(0, 0, 0, 0.6)';
                            borderColor = grandeurColors[key]?.borderColor || 'rgba(0, 0, 0, 1)';
                        }

                        if (existingDatasetIndex !== -1) {
                            // Ajouter les nouveaux points au dataset existant
                            datasets[existingDatasetIndex].data.push(...newData);
                        } else {
                            // Créer un nouveau dataset si nécessaire
                            datasets.push({
                                label: `${dicoConfig[key].name + " " + sensor}`,
                                data: newData,
                                backgroundColor: backgroundColor,
                                borderColor: borderColor,
                                pointRadius: 2.5, // Set the size of the markers
                                pointBorderWidth: 1, // Set the border width of the markers
                                showLine: true,
                                yAxisID: yAxisID,
                                borderWidth: 1, 
                                pointStyle: 'cross' // Change the markers to crosses
                            });
                        }
                    }
                }

                // Forcer l'affichage de l'échelle verticale
                chartManager.chart.options.scales = {
                    'x': {
                        type: 'time',
                        time: {
                            unit: 'minute',
                            displayFormats: {
                                minute: 'HH:mm'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Temps'
                        },
                        grid: {
                            color: 'rgba(200, 200, 200, 0.2)', // Couleur plus claire pour la grille
                            borderColor: 'rgba(200, 200, 200, 0.5)', // Bordure plus claire
                            lineWidth: 1, // Largeur de ligne plus fine
                            drawOnChartArea: true
                        }
                    },
                    'y-axis-1': {
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: yAxis1Title
                        },
                        grid: {
                            color: 'rgba(200, 200, 200, 0.2)', // Couleur plus claire pour la grille
                            borderColor: 'rgba(200, 200, 200, 0.5)', // Bordure plus claire
                            lineWidth: 1, // Largeur de ligne plus fine
                            drawOnChartArea: true // This will draw the grid lines for y-axis-1
                        }
                    }
                };

                // Vérifier s'il y a au moins deux jeux de données avec des grandeurs différentes
                const uniqueGrandeurs = new Set(datasets.map(ds => ds.label.split(' ')[0]));
                if (uniqueGrandeurs.size > 1) {
                    chartManager.chart.options.scales['y-axis-2'] = {
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: yAxis2Title
                        },
                        grid: {
                            color: 'rgba(200, 200, 200, 0.2)', // Couleur plus claire pour la grille
                            borderColor: 'rgba(200, 200, 200, 0.5)', // Bordure plus claire
                            lineWidth: 1, // Largeur de ligne plus fine
                            drawOnChartArea: false // This will not draw the grid lines for y-axis-2
                        }
                    };
                } else {
                    delete chartManager.chart.options.scales['y-axis-2'];
                }

                chartManager.chart.update();

                // Mettre à jour la date de la dernière mise à jour
                lastUpdate[sensor] = new Date();
            }

            // Mettre à jour les dates de début et de fin du graphique
            chartManager.ts_end = endDate;
        }
    }

    function saveChartConfig(chartManager, chartId) {
        console.log('Saving chart config:', chartManager, chartId);
        const chartConfig = {
            title: chartManager.title,
            ts_start: chartManager.ts_start,
            ts_end: chartManager.ts_end,
            live: chartManager.live,
            sensorData: chartManager.sensorData
        };
        localStorage.setItem(`chartConfig_${chartId}`, JSON.stringify(chartConfig));
    }

    function loadChartConfig(chartId) {
        const chartConfig = localStorage.getItem(`chartConfig_${chartId}`);
        return chartConfig ? JSON.parse(chartConfig) : null;
    }

    function loadAllCharts() {
        const chartConfigs = [];
        let maxGraphId = 0; // Variable pour suivre le plus grand ID de graphique
    
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('chartConfig_')) {
                const chartId = key.replace('chartConfig_', '');
                const chartConfig = loadChartConfig(chartId);
                if (chartConfig) {
                    chartConfigs.push({ chartId, chartConfig });
                    const graphId = parseInt(chartId.split('-')[1]);
                    if (graphId > maxGraphId) {
                        maxGraphId = graphId; // Mettre à jour le plus grand ID de graphique
                    }
                }
            }
        }
    
        // Trier les configurations de graphiques par leur identifiant
        chartConfigs.sort((a, b) => {
            const idA = parseInt(a.chartId.split('-')[1]);
            const idB = parseInt(b.chartId.split('-')[1]);
            return idA - idB;
        });
    
        // Créer les graphiques dans l'ordre trié
        chartConfigs.forEach(({ chartId, chartConfig }) => {
            createChartFromConfig(chartId, chartConfig);
        });
    
        // Initialiser graphCounter avec le plus grand ID de graphique + 1
        graphCounter = maxGraphId + 1;
    }

    function createChartFromConfig(chartId, chartConfig) {
        const container = document.getElementById('chart-container');
        const newChartContainer = document.createElement('div');
        newChartContainer.className = 'chart';
        newChartContainer.id = `chart-container-${chartId}`;
        newChartContainer.innerHTML = `
            <div class="graph-header">
                <div>
                    <button  class="config-btn" onclick="downloadCanvasImage('${chartId}', '${chartConfig.title}.png')">💾</button>
                    <button class="config-btn" onclick="openConfigModal('chart-container-${chartId}')">⚙️</button>
                </div>
                <button class="close-btn" onclick="removeChart('chart-container-${chartId}')">&times;</button>
            </div>
            <div class="graph"><canvas id="${chartId}"></canvas></div>
        `;
        container.appendChild(newChartContainer);
    
        const ctx = document.getElementById(chartId).getContext('2d');
        const chartManager = new ChartManager(ctx, chartConfig.title, 'Echelle 1', "", chartConfig.ts_start, chartConfig.ts_end, chartConfig.live);
        chartManager.sensorData = chartConfig.sensorData;
        charts[chartId] = chartManager;
    
        // Initialiser le graphique avec des données vides et sensorData
        chartManager.initChart([], chartConfig.sensorData);
    
        // Mettre à jour le graphique nouvellement créé
        updateChart(chartId, true);
    }

    // Fonction pour ajouter un nouveau graphique
    document.getElementById('addGraphForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        document.getElementById('addGraphFormContainer').style.display = 'none';
    
        const title = document.getElementById('graphTitle').value;
        const startDate = document.getElementById('graphStartDate').value;
        const endDate = document.getElementById('graphEndDate').value;
        const live = document.getElementById('graphLive').checked;
        const grandeurs = [];
        const checkboxes = document.querySelectorAll('#grandeursContainer input[type="checkbox"]');
    
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                grandeurs.push(checkbox.value);
            }
        });
    
        const container = document.getElementById('chart-container');
        const newChartContainer = document.createElement('div');
        newChartContainer.className = 'chart';
        newChartContainer.id = `chart-container-${graphCounter}`;
        newChartContainer.innerHTML = `
            <div class="graph-header">
                <div>
                    <button  class="config-btn" onclick="downloadCanvasImage('chart-${graphCounter}', '${title}.png')">💾</button>
                    <button class="config-btn" onclick="openConfigModal('chart-container-${graphCounter}')">⚙️</button>
                </div>
                <button class="close-btn" onclick="removeChart('chart-container-${graphCounter}')">&times;</button>
            </div>
            <div class="graph"><canvas id="chart-${graphCounter}"></canvas></div>
        `;
        container.appendChild(newChartContainer);
    
        const ctx = document.getElementById(`chart-${graphCounter}`).getContext('2d');
        const sensorData = {}; // Initialize sensorData for the new chart
        grandeurs.forEach(grandeur => {
            const [sensor, measurement] = grandeur.split('_');
            if (!sensorData[sensor]) {
                sensorData[sensor] = [];
            }
            sensorData[sensor].push(measurement);
        });
    
        const chartManager = new ChartManager(ctx, title, 'Echelle 1', "", startDate, endDate, live);
        charts[`chart-${graphCounter}`] = chartManager;
    
        // Initialiser le graphique avec des données vides et sensorData
        await chartManager.initChart([], sensorData);
    
        // Mettre à jour le graphique nouvellement créé
        await updateChart(`chart-${graphCounter}`, true);
    
        // Sauvegarder la configuration du graphique dans le localStorage
        saveChartConfig(chartManager, `chart-${graphCounter}`);
    
        graphCounter++;
    });

    // Fonction pour supprimer un graphique
    window.removeChart = function(chartContainerId) {
        const chartContainer = document.getElementById(chartContainerId);
        console.log(chartContainerId);
        if (chartContainer) {
            const chartId = chartContainer.querySelector('canvas').id;
            console.log(chartId);
            delete charts[chartId];
            chartContainer.remove();
            localStorage.removeItem(`chartConfig_${chartId}`);
        }
    };

    // Fonction pour recréer un graphique avec les nouvelles configurations
    async function recreateChart(chartId, title, startDate, endDate, sensorData) {
        const canvas = document.getElementById(chartId);
        const ctx = canvas.getContext('2d');
        console.log('Chart ID:', chartId);

        // Supprimer l'ancien graphique
        if (charts[chartId]) {
            charts[chartId].chart.destroy();
            delete charts[chartId];
            localStorage.removeItem(`chartConfig_${chartId}`);
            console.log('Chart removed:', chartId);
        }

        const live = document.getElementById('configLive').checked;

        // Créer un nouveau ChartManager avec les nouvelles configurations
        const chartManager = new ChartManager(ctx, title, 'Echelle 1', "", startDate, endDate, live);
        charts[chartId] = chartManager;

        // Initialiser le graphique avec des données vides et sensorData
        await chartManager.initChart([], sensorData);

        // Mettre à jour le graphique nouvellement créé
        await updateChart(chartId, true);

        // Sauvegarder la configuration du graphique dans le localStorage
        saveChartConfig(chartManager, chartId);
    }

    // Fonction pour ouvrir la fenêtre modale de configuration
    window.openConfigModal = function(chartContainerId) {
        const chartContainer = document.getElementById(chartContainerId);
        const chartId = chartContainer.querySelector('canvas').id;
        const chartManager = charts[chartId];

        // Pré-remplir les champs de la fenêtre modale avec les valeurs actuelles
        document.getElementById('configChartId').value = chartId;
        document.getElementById('configTitle').value = chartManager.title;
        document.getElementById('configStartDate').value = chartManager.ts_start;
        document.getElementById('configEndDate').value = chartManager.ts_end;
        document.getElementById('configLive').checked = chartManager.live;

        // Cocher les cases correspondant aux grandeurs actuelles
        const checkboxes = document.querySelectorAll('#configGrandeursContainer input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = chartManager.sensorData[checkbox.value.split('_')[0]]?.includes(checkbox.value.split('_')[1]) || false;
        });

        // Afficher la fenêtre modale
        document.getElementById('configModal').style.display = 'block';
    };

    window.downloadCanvasImage = function(canvasId, fileName) {
        // Obtenez l'élément canvas
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error("Canvas not found!");
            return;
        }
    
        // Convertir le canvas en URL de données (base64)
        const dataURL = canvas.toDataURL("image/png");
    
        // Créer un élément lien pour le téléchargement
        const link = document.createElement("a");
        link.href = dataURL;
        link.download = fileName || "canvas-image.png";
    
        // Déclencher le téléchargement
        link.click();
    }

    // Fonction pour appliquer les modifications de configuration
    document.getElementById('configForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        document.getElementById('configModal').style.display = 'none';

        const chartId = document.getElementById('configChartId').value;
        const title = document.getElementById('configTitle').value;
        const startDate = document.getElementById('configStartDate').value;
        const endDate = document.getElementById('configEndDate').value;
        const live = document.getElementById('configLive').checked;
        const grandeurs = [];
        const checkboxes = document.querySelectorAll('#configGrandeursContainer input[type="checkbox"]');

        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                grandeurs.push(checkbox.value);
            }
        });

        const sensorData = {};
        grandeurs.forEach(grandeur => {
            const [sensor, measurement] = grandeur.split('_');
            if (!sensorData[sensor]) {
                sensorData[sensor] = [];
            }
            sensorData[sensor].push(measurement);
        });

        // Recréer le graphique avec les nouvelles configurations
        await recreateChart(chartId, title, startDate, endDate, sensorData);

        // Fermer la fenêtre modale
        closeConfigModal();
    });

    // Récupérer la configuration et générer dynamiquement les checkboxes
    async function fetchConfig() {
        try {
            const response = await fetch('/getConfig');
            const config = await response.json();
            configData = config; // Stocker la configuration pour une utilisation ultérieure
            const grandeursContainer = document.getElementById('grandeursContainer');
            const configGrandeursContainer = document.getElementById('configGrandeursContainer');
    
            let colorIndex = 0;

            let index = 0;

            // Créer un conteneur pour chaque capteur
            config.sensors.forEach(sensor => {
                // Assigner une couleur au capteur
                sensorColors[sensor.name] = {
                    backgroundColor: colors[colorIndex % colors.length],
                    borderColor: borderColors[colorIndex % borderColors.length]
                };
                colorIndex++;

                cdr[sensor.name] = index;
                index++;
    
                // Créer une colonne pour chaque capteur
                const sensorColumn = document.createElement('div');
                sensorColumn.className = 'sensor-column';
                const sensorTitle = document.createElement('div');
                sensorTitle.innerText = sensor.name + " :";
                sensorTitle.className = 'sensor-colum-title';
                sensorColumn.appendChild(sensorTitle);
    
                Object.keys(sensor.measurements).forEach(measurement => {
                    // Assigner une couleur à chaque grandeur si elle n'a pas déjà une couleur
                    let dicoConfig = sensor.measurements[measurement];//dico pour accéder aux nom et unités des grandeurs
                    if (!grandeurColors[measurement]) {
                        grandeurColors[measurement] = {
                            backgroundColor: colors[colorIndex % colors.length],
                            borderColor: borderColors[colorIndex % borderColors.length]
                        };
                        colorIndex++;
                    }
    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `newGraph_${sensor.ip}_${measurement}`;
                    checkbox.value = `${sensor.name}_${measurement}`;
                    const label = document.createElement('label');
                    label.className = 'senror-colum-label';
                    label.htmlFor = checkbox.id;
                    label.innerText = `${dicoConfig.name}`;
                    sensorColumn.appendChild(checkbox);
                    sensorColumn.appendChild(label);
                    sensorColumn.appendChild(document.createElement('br'));
                });
    
                // Ajouter la colonne du capteur au conteneur principal
                grandeursContainer.appendChild(sensorColumn);
    
                // Cloner la colonne pour la fenêtre modale de configuration
                const configSensorColumn = sensorColumn.cloneNode(true);
                configGrandeursContainer.appendChild(configSensorColumn);
            });
    
            // Décocher toutes les checkboxes
            const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
            allCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
    
            console.log('Sensor Colors:', sensorColors);
            console.log('Grandeur Colors:', grandeurColors);
        } catch (error) {
            console.error('Error fetching config:', error);
        }

    }

    initializeDateFields()
    fetchConfig();
    loadAllCharts();// Charger tous les graphiques depuis le localStorage

    // Fonction de mise à jour automatique des graphiques toutes les 30 secondes
    setInterval(() => { updateChart(); }, 30000); // Mise à jour toutes les 30 secondes
});