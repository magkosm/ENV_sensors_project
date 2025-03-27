function majSensors() {   
    (async () => {
        const toSend = { do: "getMesurements" }; // Remplace par les données à envoyer
        const donnees = await sendRequest('getMesurements', toSend); // Remplace 'endpoint' par le nom de la requête
        console.log('Réponse traitée:', donnees); // Utilise les données JSON reçues
        
        // Remplir chaque span avec la valeur correspondante
        document.getElementById("temp").textContent = parseFloat(donnees.Temp.LastVal).toFixed(2);
        document.getElementById("hum").textContent = parseFloat(donnees.Hum.LastVal).toFixed(2);
        document.getElementById("press").textContent = (parseFloat(donnees.Pres.LastVal)/100.0).toFixed(2);
        document.getElementById("lum").textContent = parseFloat(donnees.Lum.LastVal).toFixed(2);
        document.getElementById("CO2").textContent = parseFloat(donnees.CO2.LastVal).toFixed(2);
        document.getElementById("VOC").textContent = parseFloat(donnees.VOC.LastVal).toFixed(2);
    })();
}

function deleteNetwork() {
    console.log("Deletefunction");
    // Récupérer les div 
    const liste = document.getElementById('savedNetworks');

    const items = liste.querySelectorAll(".network-item");

    console.log("Taille de la liste : " + items.length);
   
    var SSIDToDelete = {};

    // Parcourir chaque élément de la liste

    items.forEach(function(item) {
        const checkBox = item.querySelector(".check");
        const txt = item.querySelector(".netName");
        if (checkBox.checked) {
        
            const ssid = txt.textContent; // Récupérer l'ID de l'élément
            SSIDToDelete[ssid] = "true";
        }
    });

    // Si des éléments ont été cochés, envoyer la requête au serveur
    if (Object.keys(SSIDToDelete).length > 0) {
        console.log("Sending request");
        (async () => {
            const resp = await sendRequest('deleteNetwork', SSIDToDelete, true); 
            console.log('Réponse traitée:', resp); // Utilise les données JSON reçues
            
            if(resp.status == "success"){
                items.forEach(function(item) {
                    const checkBox = item.querySelector(".check");
                    if (checkBox.checked) {
                        checkBox.checked = false;
                        item.remove();
                    }
                });
                const success = createMsg("Réseaux supprimé", "success_del", "green");
                document.getElementById("delForm").insertBefore(success, document.getElementById("Suppr"));
                deleteMessage("success_del", 2,3000);
            }
            else{
                const failure = createMsg("Un problème s'est produit lors de l'enregistrement", "pbs", "red");
                document.getElementById("delForm").insertBefore(failure, document.getElementById("Suppr"));
                deleteMessage("pbs", 2,3000);
            }

        })();
       
    }
    else{
        if(!exist("fail_del")){
            const msg = createMsg("Aucun réseau sélectionné", "fail_del", "red");
            document.getElementById("delForm").insertBefore(msg, document.getElementById("Suppr"));
            deleteMessage("fail_del", 2,3000);
        }
    }


}

async function sendRequest(requestName, data) {
    try {
        // Envoyer une requête POST au serveur
        const response = await fetch('/' + requestName, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data), // Convertir les données en JSON
        });

        // Vérifier si la réponse est OK
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const text = await response.text(); // Récupérer la réponse sous forme de texte
        console.log('Réponse brute:', text); // Affiche la réponse pour inspection
        
        let jsonData;

        try {
            jsonData = JSON.parse(text); // Tente de parser en JSON
        } catch (error) {
            console.error('Erreur de parsing JSON:', error);
            return null; // Retourne null si le parsing échoue
        }

        console.log('Données JSON:', jsonData); // Affiche les données JSON si le parsing réussit
        return jsonData; // Retourne les données JSON
    } 
    catch (error) {
        console.error('Erreur lors de la requête :', error);
        return null; // Retourne null en cas d'erreur
    }
}

function createMsg(label, id, color){
    const msg = document.createElement("div");

    msg.id = id;
                
    msg.style.backgroundColor = color;
    msg.style.width = "auto";
    msg.style.margin = "5px";
    msg.style.marginTop = "1px";
    msg.style.marginBottom = "1px";
    msg.style.padding = "2px";
    msg.style.opacity = "0.5";
    msg.style.fontSize = "17px";
    msg.style.color = "white";
    msg.style.textAlign = "center";
    msg.style.alignItems = "center";
    msg.style.position = "relative";

    msg.textContent = label;

    return msg;
}

function fadeOut(element, duration) {
    var opacity = 0.5; // Opacité initiale pleine
    const interval = 0.05; // Intervalle de temps en ms entre chaque diminution
    const step = opacity/(duration/interval);

    const fadeEffect = setInterval(function() {
        if (opacity > 0) {
            opacity -= step; // Réduit l'opacité progressivement
            element.style.opacity = String(opacity);
        } else {
            clearInterval(fadeEffect); // Arrête l'effet une fois à 0
            element.remove();
        }
    }, interval);
}

function deleteMessage(id, fadeTime = 0, timeout = 0){
    const msg = document.getElementById(id);
    
    if((fadeTime == 0) && (timeout == 0)){
        if(msg != null){
            msg.remove();
        }
        
    }

    else if(msg != null){
        setTimeout(function() {
            fadeOut(msg, fadeTime)
        }, timeout);     
        return true;
    }

    return false;
}

function exist(id){
    return (document.getElementById(id) != null);
}

function checkLenght(value, min){
    return (value.length >= min );
}

function AddNetwork(){
    //const liste = document.getElementById('savednet');
    const SSID = document.getElementById('SSID_input').value;
    const pass = document.getElementById('Pass_input').value;
    const secu = document.getElementById('Secu_input').value;
    const user = document.getElementById('User_input').value;

    console.log("Data retreived : ");
    console.log(SSID);
    console.log(pass);

    closePopup();

    (async () => {
            
        const toSend = {
            SSID : SSID,
            pass : pass,
            SECU_TYPE : secu
        };

        if (secu === "WPA2_Enterprise") {
            toSend.USER = user;
        }

        const resp = await sendRequest('NewNetwork', toSend); // Remplace 'endpoint' par le nom de la requête
        console.log('Réponse traitée:', resp); // Utilise les données JSON reçues
        
        if(resp.status == "success"){
            document.getElementById('SSID_input').value = "";
            document.getElementById('Pass_input').value = "";
            storedNetworks();
        }
        else{
            const success = createMsg("Un problème s'est produit lors de l'enregistrement", "pbe", "red");
            document.getElementById("passForm").insertBefore(success, document.getElementById("Connect"));
            deleteMessage("pbe", 2,3000);
        }
    })();
}

function ChangeInfos(){
    const Name = document.getElementById('Name').value;
    const AP_SSID = document.getElementById('AP_SSID').value;
    const AP_Pass = document.getElementById('AP_Pass').value;

    console.log("changing settings");
    console.log(Name.length);
    console.log(AP_SSID.length);
    console.log(AP_Pass.length);

    if(checkLenght(Name,2) && checkLenght(AP_SSID, 2) && checkLenght(AP_Pass, 8)){//everything ok
        console.log("correct Lenght");
        (async () => {

            const toSend = {
                AP_SSID : AP_SSID,
                AP_Pass : AP_Pass,
                Name : Name
            };
            console.log(JSON.stringify(toSend));
            const resp = await sendRequest('NewInfos', toSend); // Remplace 'endpoint' par le nom de la requête
            console.log('Réponse traitée:', resp); // Utilise les données JSON reçues
        
            if(resp.status == "success"){
                deleteMessage("fail_name",0,0);
                deleteMessage("fail_ssid",0,0);
                deleteMessage("fail_pass",0,0);
                
                if(!exist("success_param")){
                    const msg = createMsg("Changements enregistrés", "success_param", "green");
                    document.getElementById("paramForm").insertBefore(msg, document.getElementById("enregistrer"));
                    deleteMessage("success_param",2, 3000);
                }

            }
            else{
                const msg = createMsg("Problème d'enregistrement, réessayer", "fail_param", "red");
                document.getElementById("paramForm").insertBefore(msg, document.getElementById("enregistrer"));

                deleteMessage("fail_param",2, 3000);
            }
        })();
       
    }
    else{

        deleteMessage("success_param", 0, 0);

        if(!checkLenght(Name,2)){
            if(!exist("fail_name")){
                const msg1 = createMsg("Le nom doit contenir au moins 2 caractères", "fail_name", "red");
                document.getElementById("paramForm").insertBefore(msg1, document.getElementById("enregistrer"));
            }
        }
        else{
            deleteMessage("fail_name",0.5,0);
        }

        if(!checkLenght(AP_SSID,2)){
            if(!exist("fail_ssid")){
                const msg2 = createMsg("Le nom du hot spot doit contenir au moins 2 caractères", "fail_ssid", "red");
                document.getElementById("paramForm").insertBefore(msg2, document.getElementById("enregistrer"));
            }
        }
        else{
            deleteMessage("fail_ssid",0.5,0);
        }

        if(!checkLenght(AP_Pass,8)){
            if(!exist("fail_pass")){
                const msg3 = createMsg("Le mot de passe doit contenir au moins 8 caractères", "fail_pass", "red");
                document.getElementById("paramForm").insertBefore(msg3, document.getElementById("enregistrer"));
            }
        }
        else{
            deleteMessage("fail_pass",0.5,0);
        }
    }


}

function scanNetworks() {
    const loading = document.getElementById("scanning");

    if (loading == null) {
        const networkContainer = document.getElementById("networks");
        networkContainer.innerHTML = "";

        const msg = createMsg("Scan en cours", "scanning", "green");
        document.getElementById("scanBox").insertBefore(msg, document.getElementById("Scanner"));

        (async () => {
            // Demander à l'ESP de démarrer le scan
            const toSend = { do: "scan" };
            console.log("Sending request to server");

            const response = await sendRequest('NetScan', toSend); // Envoi de la requête NetScan

            console.log('Réponse reçue:', response);

            if (response.s === "success") {
                console.log("starting to ask for the response");
                // Vérifier si le scan est terminé
                let scanResults;
                const startTime = Date.now();  // Temps de départ pour vérifier le délai

                while (true) {
                    // Vérifier le délai d'attente (60 secondes max)
                    if (Date.now() - startTime > 60000) {
                        console.log("Scan trop long, échec du scan après 1 minute");
                        deleteMessage("scanning", 0, 0);
                        const msg = createMsg("Temps de scan trop long. Échec.", "fail_scan", "red");
                        document.getElementById("scanBox").insertBefore(msg, document.getElementById("Scanner"));
                        deleteMessage("fail_scan", 3, 3000);
                        scanInProgress = false;
                        break;
                    }

                    scanResults = await sendRequest('GetScanResults', {}); // Demander les résultats du scan
                    if (scanResults.s === "in_progress") {
                        console.log("Scan en cours, réessai dans 1 seconde...");
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde avant de réessayer
                    } 
                    else if (scanResults.s === "success") {
                        // Le scan est terminé, traiter les résultats
                        const keys = Object.keys(scanResults);
                        keys.forEach(function(SSID) {
                            if (SSID !== "s") { // Ignorer la clé "s" contenant le message de succès
                                const RSSI = scanResults[SSID]["RSSI"];
                                const secuType = scanResults[SSID]["SECU_TYPE"];

                                const li = document.createElement("div");
                                li.className = "network-item";

                                let safe = '\uD83D\uDD13'; // Cadena ouvert
                                if (secuType !== "Open") {
                                    safe = '\uD83D\uDD12'; // Cadena sécurisé
                                }

                                li.innerHTML = `
                                    <div class="network-name">
                                        <span>${SSID}</span>
                                        <button class="connect-btn" onclick="showPopup('${SSID}', '${secuType}')">Se connecter</button>
                                    </div>
                                    <div class="signal-strength">
                                        ${safe} 
                                        <div class="signal-bars">${generateSignalBars(Number(RSSI))}</div>
                                    </div>
                                `;
                                networkContainer.append(li);
                            }
                        });
                        break; // Sortir de la boucle après avoir traité les résultats
                    } 
                    else {
                        // Si un autre état d'erreur est retourné
                        console.log("Erreur durant le scan:", scanResults.message);
                        deleteMessage("scanning", 0, 0);
                        const msg = createMsg("Echec du scan", "fail_scan", "red");
                        document.getElementById("scanBox").insertBefore(msg, document.getElementById("Scanner"));
                        deleteMessage("fail_scan", 3, 3000);
                        scanInProgress = false;
                        break;
                    }
                }
            } 
            else {
                // Gestion de l'erreur de démarrage du scan
                const msg = createMsg("Echec du démarrage du scan", "fail_scan", "red");
                document.getElementById("scanBox").insertBefore(msg, document.getElementById("Scanner"));
                deleteMessage("fail_scan", 3, 3000);
                scanInProgress = false;
            }

            // Retirer le message de scan en cours
            deleteMessage("scanning", 0, 0);
        })();
    }
}

function generateSignalBars(rssi) {
    const bars = [0, 0, 0, 0, 0];
    /*Recep max -30dBm, Recep min -100 dBm  */
    const level = Math.min(5, Math.max(0,Math.ceil((5.0/60.0)*rssi + (50.0/6.0))));//Math.min(5, Math.max(0, Math.ceil((rssi + 90) / 20)));
    
    console.log("RSSI : " + rssi);
    console.log("Level : " + level);
    for (let i = 0; i < level; i++) {
        bars[i] = 1;
    }

    return bars.map(bar => `<div class="bar ${bar ? 'active' : ''}"></div>`).join('');
}

function showPopup(networkName, security) {
    console.log(security);
    document.getElementById("popupTitle").innerText = `Connexion à ${networkName}`;
    document.getElementById("User_input").style.display = security === "WPA2_Enterprise" ? "block" : "none";
    document.getElementById("popupOverlay").style.display = "flex";
    document.getElementById("Secu_input").value = security;
    document.getElementById("SSID_input").value = networkName;
}

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

function closePopup() {
    document.getElementById("popupOverlay").style.display = "none";
}

function storedNetworks(){
    const netList = document.getElementById("savedNetworks");

    netList.innerHTML = "";
    console.log("Deleting old list");

    const msg = createMsg("récupération des réseaux enregitrés en cours", "reading", "green");
    document.getElementById("delForm").insertBefore(msg, document.getElementById("Suppr"));
    
    (async () => {
        const toSend = {
            do : "loadNetworks"
        };
        console.log("Sending request to server");
        const networks = await sendRequest('NetLoad', toSend);
         /*{
                "Network_1": {
                    "Pass": blablabla,
                    "SECU_TYPE": "WPA2_PSK",
                    "USER" : blabla,
                    "Ip" : 10.0.0.14,
                    "Default_Gateway" : 10.0.0.1,
                    "Subnet_mask" : 255.255.255.0
                },
                "Network_2": {
                    ....
                },
                "s": "success"
              }
            */
        console.log('Réponse traitée:', networks); // Utilise les données JSON reçues

        deleteMessage("reading",0,0);

        if(networks.s == "success"){

            const keys = Object.keys(networks);
            //const networks = espGetData();

            keys.forEach(function(SSID) {
                console.log("Running");
                //const SSID = network;
                if(SSID != "s"){//skip first keys wich is success message
                    const Rpass = networks[SSID]["Pass"];
                    const Rsecu = networks[SSID]["SECU_TYPE"];
                    var Ruser = "";
                    if(Rsecu == "WPA2_Entreprise"){
                        Ruser = networks[SSID]["USER"];
                    }
                    
                    const RIp = networks[SSID]["Ip"];
                    const Rdefgat = networks[SSID]["Default_Gateway"];
                    const Rsubnet = networks[SSID]["Subnet_mask"];
                    
                    console.log("Rpass : " + Rpass);
                    console.log("Rsecu : " + Rsecu);
                    console.log("RIp : " + RIp);
                    console.log("Rdefgat : " + Rdefgat);
                    console.log("Rsubnet : " + Rsubnet);
            

                    const networkDiv = document.createElement("div");
                    networkDiv.className = "network-item saved";
                    networkDiv.innerHTML = `
                        <div class="network-header">
                            <div class="network-name-saved">
                                <button class="details-button" onclick="toggleDetails('${SSID}_Details', this)">🔽</button>
                                <span class = "netName">${SSID}</span>
                            </div>
                    
                            <div>
                                <input type = "checkbox" class = "check">
                            </div>
                        </div>
                        <div class="network-details" id="${SSID}_Details">
                            <div class="column">
                                ${Rsecu == "WPA2_Entreprise" ? `<p>Nom d'utilisateur :<br><i>${Ruser}</i></p>` : ""}
                                <p>Mot de passe :<br><i>
                                <span class="password-container">
                                    <button class="toggle-password" onclick="togglePassword('${SSID}_Pass', this)">👁️</button>
                                    <span class="password" id="${SSID}_Pass" class="hidden-password" data-password="${Rpass}">••••••••••••</span>
                                </span>
                                </i>
                                </p>
                                <p>IP du capteur :<br><i> ${RIp}</i></p>
                            </div>
                            <div class="column center-ligne">
                                <p>Type de sécurité :<br><i>${Rsecu}</i></p>
                                <p>Default Gateway :<br><i> ${Rdefgat}</i></p>
                                <p>Subnet Mask :<br><i> ${Rsubnet}</i></p>
                
                                
                            </div>
                        </div>

                    `;
                    netList.appendChild(networkDiv);
                }
            });
        }
        else{//error during the scan
            const msg = createMsg("Echec du chargement", "fail_load", "red");
            document.getElementById("delForm").insertBefore(msg, document.getElementById("Suppr"));

            deleteMessage("fail_load",3, 3000);
        }
})();
}

function toggleDetails(detailsId, button) {
    const details = document.getElementById(detailsId);
    
    if (details.style.display === "none" || details.style.display === "") {
    details.style.display = "block";
    button.textContent = "🔼"; // Change l'icône en flèche vers le haut
    } else {
    details.style.display = "none";
    button.textContent = "🔽";// Change l'icône en flèche vers le bas
    }
} 
// Fonction pour afficher/masquer le mot de passe
function togglePassword(passwordId, toggleButton) {
    const passwordElement = document.getElementById(passwordId);
        
    // Vérifier si le mot de passe est masqué ou visible
    if (passwordElement.classList.contains("hidden-password")) {
    passwordElement.classList.remove("hidden-password"); // Rendre le mot de passe visible
    passwordElement.textContent = passwordElement.dataset.password; // Afficher le mot de passe complet
    toggleButton.textContent = "🙈"; // Mettre à jour le bouton pour masquer le mot de passe
    } else {
    passwordElement.classList.add("hidden-password"); // Masquer le mot de passe
    passwordElement.textContent = "••••••••••••"; // Afficher des points
    toggleButton.textContent = "👁️"; // Mettre à jour le bouton pour afficher le mot de passe
    }
}
  
function loadConfig(){

    console.log("loading config ");

    const msg = createMsg("récupération des informations du module", "Rconfig", "green");
    document.getElementById("paramForm").insertBefore(msg, document.getElementById("enregistrer"));
    
    (async () => {
        const toSend = {
            do : "loadInfos"
        };
        console.log("Sending request to server");
        const infos = await sendRequest('LoadConfig', toSend); // Remplace 'endpoint' par le nom de la requête
        console.log('Réponse traitée:', infos); // Utilise les données JSON reçues

        deleteMessage("Rconfig",0,0);

        if(infos.s == "success"){

            document.getElementById("Name").value = infos["nom"];
            document.getElementById("AP_SSID").value = infos["AP_SSID"];
            document.getElementById("AP_Pass").value = infos["AP_pass"];

        }
        else{//error during the scan
            const msg = createMsg("Echec du chargement", "fail_load", "red");
            document.getElementById("paramForm").insertBefore(msg, document.getElementById("enregistrer"));

            deleteMessage("fail_load",3, 3000);
        }
    })();
}

// Fonction pour afficher/masquer l'overlay
function toggleSensorListOverlay(overlayId) {
    const sensorListOverlay = document.getElementById(overlayId);
    sensorListOverlay.style.display = sensorListOverlay.style.display === "block" ? "none" : "block";
}

// Fonction pour afficher/masquer le contenu associé à un module
function toggleSensor(sensorId, bntId) {
    const sensorDiv = document.getElementById(sensorId);
    const button = document.getElementById(bntId);
    if (sensorDiv) {
        const isHidden = sensorDiv.style.display === "none";
        sensorDiv.style.display = isHidden ? "flex" : "none";
        button.innerHTML = isHidden ? "🙈" : "👁️";
    }
}

function hide(id){
    document.getElementById(id).style.display = "none";
}

document.addEventListener('DOMContentLoaded', function() {//bouton enregistrer
    hide("delForm");
    hide("paramForm");
    hide("scanBox");
});

// Initialiser le mot de passe dans un data attribute pour pouvoir le récupérer
document.querySelectorAll('.password').forEach(password => {
    password.dataset.password = password.textContent; // Stocker le mot de passe original
    password.classList.add('hidden-password'); // Par défaut, masquer le mot de passe
    password.textContent = "••••••••••••"; // Initialiser l'affichage du mot de passe avec des points
});

document.addEventListener('DOMContentLoaded', function() {//bouton supprimer
    document.getElementById('Suppr').addEventListener('click', deleteNetwork);
});

document.addEventListener('DOMContentLoaded', function() {//bouton connecter
    document.getElementById('connect').addEventListener('click', AddNetwork);
});

document.addEventListener('DOMContentLoaded', function() {//bouton enregistrer
    document.getElementById('enregistrer').addEventListener('click', ChangeInfos);
});

document.addEventListener('DOMContentLoaded', function() {//bouton enregistrer
    document.getElementById('Scanner').addEventListener('click', scanNetworks);
});

document.addEventListener("DOMContentLoaded", majSensors);
setInterval(majSensors, 2000);
document.addEventListener("DOMContentLoaded", loadConfig);
document.addEventListener("DOMContentLoaded", storedNetworks);
document.addEventListener("DOMContentLoaded", scanNetworks);
