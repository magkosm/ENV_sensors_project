
const LoadedNetworks = "";


function majSensors() {
    (async () => {
        const toSend = { do: "getMesurements" }; // Remplace par les données à envoyer
        const donnees = await sendRequest('getMesurements', toSend); // Remplace 'endpoint' par le nom de la requête
        console.log('Réponse traitée:', donnees); // Utilise les données JSON reçues
    
        // Remplir chaque span avec la valeur correspondante
        document.getElementById("temp").textContent = parseFloat(donnees.temp).toFixed(2);
        document.getElementById("hum").textContent = parseFloat(donnees.hum).toFixed(2);
        document.getElementById("press").textContent = parseFloat(donnees.press).toFixed(2);
        document.getElementById("lum").textContent = parseFloat(donnees.lum).toFixed(2);
        document.getElementById("CO2").textContent = parseFloat(donnees.CO2).toFixed(2);
    })();
}

function deleteNetwork() {
    // Récupérer la liste d'éléments <li>
    const liste = document.getElementById('savednet');

    const items = liste.querySelectorAll(".li");
   
    var SSIDToDelete = {};

    // Parcourir chaque élément de la liste

    items.forEach(function(item) {
        const checkBox = item.querySelector(".check");
        const txt = item.querySelector(".netName");
        if (checkBox.checked) {
            //checkBox.checked = false;
            const ssid = txt.textContent; // Récupérer l'ID de l'élément

            SSIDToDelete[ssid] = "true";
            //txt.textContent = "Non enregistré";
            //item.remove();//remove the line from the list
        }
    });

    
    // Si des éléments ont été cochés, envoyer la requête au serveur
    if (Object.keys(SSIDToDelete).length > 0) {
        console.log("Sending request");
        (async () => {
            const resp = await sendRequest('deleteNetwork', SSIDToDelete, true); // Remplace 'endpoint' par le nom de la requête
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
    const liste = document.getElementById('savednet');
    const SSID = document.getElementById('SSID_input').value;
    const pass = document.getElementById('Pass_input').value;

    console.log("Data retreived : ");
    console.log(SSID);
    console.log(pass);

    if((SSID.length >= 2) && (pass.length >= 8)){//all conditions satisfied

        (async () => {

            const toSend = {
                SSID : SSID,
                pass : pass
            };

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
    else{//wrong inputs lenght
        deleteMessage("success", 0);

        if((SSID.length < 2)){
            document.getElementById('SSID_input').style.borderColor= "red"; 

            if(!exist("error_ssid")){
                const msg = createMsg("Le nom du réseau doit contenir au moins 2 caractères", "error_ssid", "red");
                document.getElementById("passForm").insertBefore(msg, document.getElementById("Connect"));
            }
        }
        else{
            //console.log("ssid ok");
            deleteMessage("error_ssid",1,0);
            document.getElementById('SSID_input').style.borderColor= "black"; 

        }

        if(pass.length < 8){
            document.getElementById('Pass_input').style.borderColor= "red"; 
            document.getElementById('Pass_input').value = "";

            if(!exist("error_pass")){

                const msg = createMsg("Le mot de passe doit contenir au moins 8 caractères", "error_pass", "red");
                document.getElementById("passForm").insertBefore(msg, document.getElementById("Connect"));
            }
        }
        else{
            //console.log("pass_ok")
            deleteMessage("error_pass",1,0);
            document.getElementById('Pass_input').style.borderColor= "black"; 
        }
    }
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

                const msg = createMsg("Changements enregistrés", "success_param", "green");
                document.getElementById("paramForm").insertBefore(msg, document.getElementById("enregistrer"));

                deleteMessage("success_param",2, 3000);

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

function scanNetworks(){

    const loading = document.getElementById("scanning");

    if(loading == null){
        const netList = document.getElementById("Netlist");

        while (netList.firstChild) {//deleting all scan networks
            netList.removeChild(netList.firstChild);
        }
        console.log("Deleting old list");

        const msg = createMsg("Scan en cours", "scanning", "green");
        document.getElementById("scanBox").insertBefore(msg, document.getElementById("Scanner"));

        (async () => {
            const toSend = {
                do : "scan"
            };
            console.log("Sending request to server");
            const networks = await sendRequest('NetScan', toSend); // Remplace 'endpoint' par le nom de la requête
            LoadedNetworks = networks;
            console.log('Réponse traitée:', networks); // Utilise les données JSON reçues

            deleteMessage("scanning",0,0);

            if(networks.s == "success"){

                const keys = Object.keys(networks);
                //const networks = espGetData();
                //Netlist
                keys.forEach(function(SSID) {
                    console.log("Running");
                    //const SSID = network;
                    if(SSID != "s"){//skip first keys wich is success message
                        const RSSI = networks[SSID]["RSSI"].replace('*', '\uD83D\uDD12').replace('+', '\uD83D\uDD13');
                        //const Secu = networks[SSID]["SECU_TYPE"];
                        const li = document.createElement("li");

                        li.innerHTML = `
                        <div class="network-info">
                            <span>${SSID}</span>
                            <span>${RSSI} </span>
                        </div>
                        <button class="connect-btn" onclick="showConnectPopup(${SSID})">Se connecter</button>
                    `   ;
                     /*   const ligne = document.createElement("li");
                        ligne.className = "li scroll";
                        //ligne.id = "Ni";

                        //console.log("ligne created");
                        const nom = document.createElement("a");
                        nom.className = "netName";
                        nom.textContent = SSID;

                        const force = document.createElement("a");
                        force.className = "netName";
                        force.textContent = RSSI;

                        ligne.appendChild(nom);
                        ligne.appendChild(force);*/
                        
                        netList.append(li);
                    }
                });
            }
            else{//error during the scan
                const msg = createMsg("Echec du scan", "fail_scan", "red");
                document.getElementById("scanBox").insertBefore(msg, document.getElementById("Scanner"));

                deleteMessage("fail_scan",3, 3000);
            }
        })();
    }
}

function showConnectPopup(SSID) {
    const network = LoadedNetworks[SSID];
    popupTitle.textContent = `Connexion à ${SSID}`;
    credentialsForm.innerHTML = "";

    // Champs dynamiques pour les identifiants
    if (network["SECU_TYPE"] == "WIFI_AUTH_WPA2_ENTERPRISE") {
        const passwordField = document.createElement("input");
        passwordField.type = "password";
        passwordField.placeholder = "Mot de passe";
        credentialsForm.appendChild(passwordField);
    }
    else {
        const usernameField = document.createElement("input");
        usernameField.type = "text";
        usernameField.placeholder = "Nom d'utilisateur";
        const passwordField = document.createElement("input");
        passwordField.type = "password";
        passwordField.placeholder = "Mot de passe";
        credentialsForm.appendChild(usernameField);
        credentialsForm.appendChild(passwordField);
    }

    connectPopup.classList.remove("hidden");
}














function storedNetworks(){
    const netList = document.getElementById("savednet");

    while (netList.firstChild) {//deleting all scan networks
        netList.removeChild(netList.firstChild);
    }
    console.log("Deleting old list");

    const msg = createMsg("récupération des réseaux enregitrés en cours", "reading", "green");
    document.getElementById("delForm").insertBefore(msg, document.getElementById("Suppr"));
    
    (async () => {
        const toSend = {
            do : "loadNetworks"
        };
        console.log("Sending request to server");
        const networks = await sendRequest('NetLoad', toSend); // Remplace 'endpoint' par le nom de la requête
        console.log('Réponse traitée:', networks); // Utilise les données JSON reçues

        deleteMessage("reading",0,0);

        if(networks.s == "success"){

            const keys = Object.keys(networks);
            //const networks = espGetData();

            keys.forEach(function(SSID) {
                console.log("Running");
                //const SSID = network;
                if(SSID != "s"){//skip first keys wich is success message
                    const ligne = document.createElement("li");
                    ligne.className = "li scroll";
                    ligne.id = "Ni";

                    //console.log("ligne created");

                    const nom = document.createElement("a");
                    nom.className = "netName";
                    nom.textContent = SSID;

                    //console.log("Nom create");

                    const check = document.createElement("input");
                    check.type = "checkbox";
                    check.className = "check";

                    //console.log("check box created");
                    
                    ligne.appendChild(nom);
                    //console.log("nom append");
                    ligne.appendChild(check);
                    //console.log("check append");

                    netList.appendChild(ligne);
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

document.addEventListener('DOMContentLoaded', function() {//bouton supprimer
    document.getElementById('Suppr').addEventListener('click', deleteNetwork);
});

document.addEventListener('DOMContentLoaded', function() {//bouton connecter
    document.getElementById('Connect').addEventListener('click', AddNetwork);
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
