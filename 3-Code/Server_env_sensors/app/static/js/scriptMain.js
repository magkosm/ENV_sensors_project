// Fonction pour envoyer une requête au serveur
async function sendRequest(endpoint, data, method = 'POST') {
    const response = await fetch(endpoint, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    return response.json();
}

// Fonction pour charger les fichiers de configuration
async function loadConfig() {
    const configResponse = await fetch('/getConfig');
    const config = await configResponse.json();

    const sensorTypesResponse = await fetch('/getSensorTypes');
    const sensorTypes = await sensorTypesResponse.json();

    return { config, sensorTypes };
}

// Function to check password
function checkPassword() {
    console.log("checkPassword");
    const correctPassword = "Inge>Astro";// Correct password (replace with your actual password)
    const password = document.getElementById('passwordField').value;
    console.log(password);
    if (password == correctPassword) { // Replace "your_password" with the actual password
        console.log("Password correct.");
        enableDeleteButtons();
    } else {
        alert("Incorrect password.");
    }
}

// Function to show/hide password
function togglePasswordVisibility(passId, bntId) {
    const passwordInput = document.getElementById(passId);
    const toggleButton = document.getElementById(bntId);

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleButton.innerText = "🙈";
    } else {
        passwordInput.type = "password";
        toggleButton.innerText = "👁️";
    }
}

// Fonction pour activer les boutons de suppression
function enableDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.hide-config');
    const lockIcon = document.getElementById('lockIcon');

    lockIcon.textContent = '🔓';
    deleteButtons.forEach(button => {
        button.style.display = 'inline-block';
        button.disabled = false;
    });
}

// Fonction pour desactiver les boutons de suppression
function disableDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.hide-config');
    const lockIcon = document.getElementById('lockIcon');

    lockIcon.textContent = '🔒';
    deleteButtons.forEach(button => {
        button.style.display = 'none';
        button.disabled = true;
    });
}

// Function to show or hide password input field
function togglePasswordField() {
    const passwordField = document.getElementById('passwordFieldContainer');
    const checkbnt = document.getElementById('checkPasswordBtn');
    const lockIcon = document.getElementById('lockIcon');

    if(lockIcon.textContent === '🔓')  {
        lockIcon.textContent = '🔒';
        disableDeleteButtons();
    }

    passwordField.style.display = (passwordField.style.display === 'none' || passwordField.style.display === '') ? 'block' : 'none';    
    checkbnt.style.display = (checkbnt.style.display === 'none' || checkbnt.style.display === '') ? 'block' : 'none';  
}

// Fonction pour masquer le formulaire de nouveau type de capteur
function hideNewSensorTypeForm() {
    const newSensorTypeForm = document.getElementById('newSensorTypeForm');
    const saveBtn = document.getElementById('saveBtn');
    if (newSensorTypeForm) {
        newSensorTypeForm.style.display = 'none';
    }
    if (saveBtn) {
        saveBtn.style.display = 'block';
    }
}

// Fonction pour ajouter un champ de mesure
function addMeasurementField() {
    const newSensorMeasurements = document.getElementById('newSensorMeasurements');
    const measurementFieldHtml = `
        <div class="form-group measurement-group">
            <button type="button" class="remove-btn" onclick="removeField(this)">&times;</button>
            <input type="text" class="measurementKey" placeholder="Clé de la mesure (ex: Temp)">
            <input type="text" class="measurementName" placeholder="Nom de la mesure">
            <input type="text" class="measurementUnit" placeholder="Unité de la mesure">
        </div>
    `;
    newSensorMeasurements.insertAdjacentHTML('beforeend', measurementFieldHtml);
}

// Fonction pour ajouter un champ de configuration
function addConfigField() {
    const newSensorConfig = document.getElementById('newSensorConfig');
    const configFieldHtml = `
        <div class="form-group inline-group">
            <input type="text" class="configField" placeholder="Nom du paramètre">
            <button type="button" class="remove-btn" onclick="removeField(this)">&times;</button>
        </div>
    `;
    newSensorConfig.insertAdjacentHTML('beforeend', configFieldHtml);
}

// Fonction pour supprimer un champ de saisie
function removeField(button) {
    button.parentElement.remove();
}

// Fonction pour enregistrer le nouveau type de capteur
async function saveNewSensorType() {
    const newSensorTypeName = document.getElementById('newSensorTypeName').value;
    const measurementKeys = document.querySelectorAll('.measurementKey');
    const measurementNames = document.querySelectorAll('.measurementName');
    const measurementUnits = document.querySelectorAll('.measurementUnit');
    const configFields = document.querySelectorAll('.configField');

    if (!newSensorTypeName) {
        alert('Le champ "Nom" est obligatoire.');
        return;
    }

    const measurements = {};
    let valid = true;
    measurementKeys.forEach((keyField, index) => {
        const nameField = measurementNames[index];
        const unitField = measurementUnits[index];
        if (keyField.value.includes(' ')) {
            alert('La clé de la mesure ne doit pas contenir d\'espace.');
            console.log(keyField.value);
            valid = false;
            return;
        }
        measurements[keyField.value] = {
            name: nameField.value,
            unit: unitField.value
        };
    });

    if (!valid) return;

    const config = []; // Ajouter 'name' au début de la liste de configuration
    configFields.forEach(field => {
        config.push(field.value);
    });

    const newSensorType = {
        type: newSensorTypeName,
        config: config,
        measurements: measurements
    };

    console.log(newSensorType);

    const response = await sendRequest('/addSensorType', newSensorType, 'POST');
    if (response.message) {
        console.log(response.message);
        await reloadConfig(); // Recharger les configurations après l'ajout
        await generateHTML();
    } else {
        console.error(response.error);
    }
}

// Fonction pour afficher le formulaire de nouveau type de capteur
function showNewSensorTypeForm() {
    const newSensorTypeForm = document.getElementById('newSensorTypeForm');
    const saveBtn = document.getElementById('saveBtn');
    if (!newSensorTypeForm) {
        const formHtml = `
            <div id="newSensorTypeForm" class="form-group">
                <label class="FormsubTitle">Nom :</label>
                <input type="text" id="newSensorTypeName" placeholder="Nom du type de capteur">
                <label class="FormsubTitle">Paramètres de Configuration :</label>
                <div id="newSensorConfig">
                    <input type="text" class="configField" value="ip" readonly>
                    <input type="text" class="configField" value="name" readonly>
                </div>
                <button class="add-btn" onclick="addConfigField()">Ajouter un paramètre</button>
                <label class="FormsubTitle">Mesures :</label>
                <div id="newSensorMeasurements">
                    <div class="form-group measurement-group">
                        <button type="button" class="remove-btn" onclick="removeField(this)">&times;</button>
                        <input type="text" class="measurementKey" placeholder="Clé de la mesure (ex: Temp)">
                        <input type="text" class="measurementName" placeholder="Nom de la mesure">
                        <input type="text" class="measurementUnit" placeholder="Unité de la mesure">
                    </div>
                </div>
                <button class="add-btn" onclick="addMeasurementField()">Ajouter une mesure</button>
                <button class="bnt_pop_up save" onclick="saveNewSensorType()" >Enregistrer le nouveau type</button>
            </div>
        `;
        document.querySelector('.overlay-content').insertAdjacentHTML('beforeend', formHtml);
    } else {
        newSensorTypeForm.style.display = 'block';
    }
    if (saveBtn) {
        saveBtn.style.display = 'none';
    }
}

// Fonction pour masquer le formulaire de nouveau type de capteur
function hideNewSensorTypeForm() {
    const newSensorTypeForm = document.getElementById('newSensorTypeForm');
    const saveBtn = document.getElementById('saveBtn');
    if (newSensorTypeForm) {
        newSensorTypeForm.style.display = 'none';
    }
    if (saveBtn) {
        saveBtn.style.display = 'block';
    }
}

// Fonction pour mettre à jour les champs de configuration dynamiques
function updateConfigFields() {
    const sensorTypeSelect = document.getElementById('sensorType');
    const selectedType = sensorTypeSelect.value;
    const configFieldsContainer = document.getElementById('configFields');
    configFieldsContainer.innerHTML = '';

    if (selectedType !== 'Autre') {
        const sensorTypes = JSON.parse(localStorage.getItem('sensorTypes'));
        const selectedSensorType = sensorTypes.types.find(type => type.type === selectedType);

        if (selectedSensorType) {
            selectedSensorType.config.forEach(configItem => {
                let placeholder = configItem;
                if(configItem === 'name'){
                    placeholder = 'Nom';
                };
                const configFieldHtml = `
                    <div class="form-group">
                        <label class="FormsubTitle">${placeholder} :</label>
                        <input type="text" id="${configItem}" placeholder="${placeholder}">
                    </div>
                `;
                configFieldsContainer.insertAdjacentHTML('beforeend', configFieldHtml);
            });
        }
    }
}

// Fonction pour fermer l'overlay
function closeOverlay() {
    document.getElementById('overlay').style.display = 'none';
}

// Fonction pour enregistrer un capteur et fermer l'overlay
async function saveSensor() {
    await addSensor();
    closeOverlay();
}

// Fonction pour ajouter un capteur
async function addSensor() {
    const sensorTypeSelect = document.getElementById('sensorType');
    const selectedType = sensorTypeSelect.value;

    // Charger les types de capteurs depuis le localStorage
    const sensorTypes = JSON.parse(localStorage.getItem('sensorTypes'));
    const selectedSensorType = sensorTypes.types.find(type => type.type === selectedType);

    if (!selectedSensorType) {
        console.error("Type de capteur non trouvé");
        return;
    }

    const configFields = document.querySelectorAll('#configFields .form-group input');
    const configData = {};
    configFields.forEach(field => {
        configData[field.id] = field.value;
    });

    // Construire l'objet toSend en utilisant les champs de configuration spécifiques au type de capteur
    const toSend = {
        type: selectedType
    };

    selectedSensorType.config.forEach(configField => {
        if (configData[configField]) {
            toSend[configField] = configData[configField];
        } else {
            console.error(`Champ de configuration manquant: ${configField}`);
        }
    });

    console.log(toSend);
    const response = await sendRequest('/newSensor', toSend);
    if (response.message) {
        console.log(response.message);
        createPage();
    } else {
        console.error(response.error);
    }
}

// Fonction pour recharger les configurations depuis le serveur
async function reloadConfig() {
    const { sensorTypes } = await loadConfig();
    localStorage.setItem('sensorTypes', JSON.stringify(sensorTypes));
    updateConfigFields();
}

// Fonction pour supprimer un capteur
async function deleteSensor(sensorName, sensorIp) {
    const toSend = {
        name: sensorName,
        ip: sensorIp
    };

    const response = await sendRequest('/deleteSensor', toSend, 'DELETE');
    if (response.message) {
        console.log(response.message);
        await createPage();
    } else {
        console.error(response.error);
    }
}

// Fonction pour afficher ou masquer l'overlay des capteurs
function toggleSensorListOverlay(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) {
        overlay.style.display = (overlay.style.display === 'none' || overlay.style.display === '') ? 'block' : 'none';
    }
}

// Function to show or hide a measured value
function toggleSensor(sensorId, buttonId) {
    const sensorElement = document.getElementById(sensorId);
    const buttonElement = document.getElementById(buttonId);
    if (sensorElement && buttonElement) {
        if (sensorElement.style.display === 'none' || sensorElement.style.display === '') {
            sensorElement.style.display = 'block';
            buttonElement.textContent = '🙈';
            localStorage.setItem(sensorId, 'visible');
        } else {
            sensorElement.style.display = 'none';
            buttonElement.textContent = '👁️';
            localStorage.setItem(sensorId, 'hidden');
        }
    }
}

// Fonction pour restaurer l'état des capteurs et des grandeurs mesurées
function restoreSensorState() {
    const sensorElements = document.querySelectorAll('.sensor');
    sensorElements.forEach(sensorElement => {
        const sensorId = sensorElement.id;
        const state = localStorage.getItem(sensorId);
        if (state === 'hidden') {
            sensorElement.style.display = 'none';
            const buttonElement = document.getElementById(`toggle${sensorId}`);
            if (buttonElement) {
                buttonElement.textContent = '👁️';
            }
        } else {
            sensorElement.style.display = 'block';
            const buttonElement = document.getElementById(`toggle${sensorId}`);
            if (buttonElement) {
                buttonElement.textContent = '🙈';
            }
        }
    });

    const sensorBoxes = document.querySelectorAll('.box');
    sensorBoxes.forEach(sensorBox => {
        const sensorIp = sensorBox.id;
        const state = localStorage.getItem(sensorIp);
        if (state === 'hidden') {
            sensorBox.style.display = 'none';
            const buttonElement = document.getElementById(`toggleBnt_${sensorIp}`);
            if (buttonElement) {
                buttonElement.textContent = '👁️';
            }
        } 
        else {
            sensorBox.style.display = 'block';
            const buttonElement = document.getElementById(`toggleBnt_${sensorIp}`);
            if (buttonElement) {
                buttonElement.textContent = '🙈';
            }
        }
    });
}

// Fonction pour mettre à jour les capteurs
function majSensors() {
    (async () => {
        const toSend = { do: "getData" };
        const data_capts = await sendRequest('getData', toSend);
        console.log('Réponse traitée:', data_capts);

        if (data_capts != null) {
            const titreContainer = document.getElementById("titreContainer");
            if (titreContainer) {
                titreContainer.style.boxShadow = "5px 5px 15px rgba(0, 0, 0, 0.5)";
                titreContainer.style.animation = "";
            }

            for (const donnees of data_capts) {
                console.log('Réponse indiv:', donnees);
                const timeStamp = new Date();
                const receivedTS = new Date(donnees.timestamp);
                const dt = Math.abs(timeStamp - receivedTS);
                const sensorHash = `sensor_${hashString(donnees.name)}`;

                // Remplir chaque span avec la valeur correspondante
                Object.keys(donnees.measurements).forEach(measurementKey => {
                    console.log(measurementKey);
                    const element = document.getElementById(`${measurementKey.toLowerCase()}_${sensorHash}`);
                    if (element) {
                        element.textContent = parseFloat(donnees.measurements[measurementKey].LastVal).toFixed(2);
                    }
                });

                const sensorElement = document.getElementById(sensorHash);
                if (sensorElement) {
                    if (dt > 50000) {
                        console.log("CHANGED COLOR");
                        sensorElement.style.boxShadow = "10px 10px 15px rgba(255, 0, 0, 0.5)";
                    } else {
                        sensorElement.style.boxShadow = "5px 5px 15px rgba(0, 0, 0, 0.5)";
                    }
                }
            }
        }
    })();
}

// Function to generate a hash from a string
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

// Fonction pour générer dynamiquement le contenu HTML
async function generateHTML() {
    const { config, sensorTypes } = await loadConfig();

    const container = document.getElementById('container');
    container.innerHTML = '';

    const sensorListContent = document.getElementById('sensorListContent');
    sensorListContent.innerHTML = '';

    // Remplir le champ de sélection des types de capteurs
    const sensorTypeSelect = document.getElementById('sensorType');
    sensorTypeSelect.innerHTML = '';

    sensorTypes.types.forEach(type => {
        const option = document.createElement('option');
        option.value = type.type;
        option.textContent = type.type;
        sensorTypeSelect.appendChild(option);
    });

    // Ajouter l'option "Autre"
    const otherOption = document.createElement('option');
    otherOption.value = 'Autre';
    otherOption.textContent = 'Autre';
    sensorTypeSelect.appendChild(otherOption);

    // Ajouter un événement pour gérer l'option "Autre"
    sensorTypeSelect.addEventListener('change', function() {
        if (this.value === 'Autre') {
            showNewSensorTypeForm();
        } else {
            hideNewSensorTypeForm();
            updateConfigFields();
        }
    });

    config.sensors.forEach(sensor => {
        const sensorHash = `sensor_${hashString(sensor.name)}`;

        // Générer le contenu principal des capteurs
        const box = document.createElement('div');
        box.className = 'box';
        box.id = sensorHash;

        const boxTitle = document.createElement('div');
        boxTitle.className = 'boxTitle';
        boxTitle.id = 'boxTitle';
        boxTitle.innerHTML = `
            <div class="bntContainer adaptMargin">
                <button id="bnt-details" class="hamburger-btn small" aria-label="Menu" onclick="toggleSensorListOverlay('sensorMesOverlay_${sensorHash}')">
                    <div class="bar small-bar"></div>
                    <div class="bar small-bar"></div>
                    <div class="bar small-bar"></div>
                </button>
            </div>
            <div>${sensor.name}</div>
            <div class="smalladapt"></div>
        `;
        box.appendChild(boxTitle);

        const sensorMesOverlay = document.createElement('div');
        sensorMesOverlay.id = `sensorMesOverlay_${sensorHash}`;
        sensorMesOverlay.className = 'sensorMesOverlay';
        sensorMesOverlay.innerHTML = `
            <div class="sensorMesoverlay_container">
                <div class="sensorMesFormTitle">
                    <span class="sensorMesoverlayTitle">Mesures</span>
                    <span id="closeSensorMesBtn" class="sensorMesclose" onclick="toggleSensorListOverlay('sensorMesOverlay_${sensorHash}')">&times;</span>
                </div>
                <div id="sensorMesContent" class="sensorMesContent">
                    ${Object.keys(sensor.measurements).sort().map(measurement => `
                        <div class="sensor-item">
                            <span>${sensor.measurements[measurement].name}</span>
                            <button class="toggle-btn" id="toggle${measurement}_${sensorHash}" onclick="toggleSensor('${measurement}_${sensorHash}', 'toggle${measurement}_${sensorHash}')">🙈</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        box.appendChild(sensorMesOverlay);

        const sensorGrid = document.createElement('div');
        sensorGrid.className = 'sensor-grid';
        sensorGrid.innerHTML = `
            ${Object.keys(sensor.measurements).map(measurement => `
                <div class="sensor" id="${measurement}_${sensorHash}" style="display: block;">
                    <p class="dataType">${sensor.measurements[measurement].name}</p>
                    <p class="reading"><span id="${measurement.toLowerCase()}_${sensorHash}">-</span> ${sensor.measurements[measurement].unit}</p>
                </div>
            `).join('')}
        `;
        box.appendChild(sensorGrid);

        container.appendChild(box);

        // Générer le contenu de l'overlay de la liste des capteurs
        const sensorItem = document.createElement('div');
        sensorItem.className = 'sensor-item';
        sensorItem.innerHTML = `
            <span>${sensor.name}</span>
            <div>
                <button class="toggle-btn" id="toggleBnt_${sensorHash}" onclick="toggleSensor('${sensorHash}', 'toggleBnt_${sensorHash}')">🙈</button>
                <button class="close hide-config" id="deleteBtn_${sensorHash}" onclick="deleteSensor('${sensor.name}', '${sensor.ip}')" style="display: none;" disabled>&times;</button>
            </div>
            `;
        sensorListContent.appendChild(sensorItem);
    });
}

// Fonction pour générer la page en fonction des états enregistré dans le local storage 
async function createPage(){
    await reloadConfig(); // Recharger les configurations lors du chargement initial de la page
    await generateHTML();
    majSensors();
    updateConfigFields();
    restoreSensorState(); // Restaurer l'état des capteurs et des grandeurs mesurées
}

let GraphsTab = null;  // Référence de l'onglet graphs
let mainTab = window;  // Enregistrez la référence à l'onglet principal (celui qui ouvre `/Graphs`)

function openGraphPage() {
    window.mainTab = window;  // Stockez la référence de l'onglet principal
    localStorage.setItem("returnToMain", "false");  // Initialisation pour dire qu'on n'est pas encore dans l'onglet principal
    if (GraphsTab) {
        GraphsTab.focus();  // Passe à l'onglet principal
    } else {
        GraphsTab = window.open('/Graphs', '_blank');  // Ouvre la page graphs dans un nouvel onglet et enregistre la référence
    }
}

// Monitor localStorage changes to return to main tab
window.addEventListener('storage', function(event) {
    if (event.key === "returnToMain" && event.newValue === "true") {
        mainTab.focus();  // Give focus to main tab
        localStorage.removeItem("returnToMain");  // Reset key to avoid unexpected behavior
    }
});

// Initialisation de la page
document.addEventListener('DOMContentLoaded', async () => {
    await createPage();
    setInterval(majSensors, 30000); // Mettre à jour les capteurs toutes les 30 secondes
});

// Gestion des événements
document.getElementById('plus_bnt').addEventListener('click', function () {
    document.getElementById('overlay').style.display = 'flex';
});