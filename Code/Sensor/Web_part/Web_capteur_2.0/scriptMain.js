function mettreAJourSpans() {
   /* const donnees = {
        temp: (Math.floor(Math.random() * 20) + 15).toFixed(1), // Exemple de valeur de température
        lum:Math.floor(Math.random() * 2582170).toFixed(0),
        hum: Math.floor(Math.random() * 100).toFixed(1),    // Exemple de valeur d'humidité
        press: (1013.15 - Math.floor(Math.random() * 1000)).toFixed(1) ,    // Exemple de valeur de pression
        CO2: (Math.floor(Math.random() * 1000) + 400).toFixed(1)
    };*/
    const toSend = {
        do : "getMesurements"
    }
    var donnees = Object.parse(sendRequest("getMesurements", toSend));

    console.log(donnees);
    // Remplir chaque span avec la valeur correspondante
    document.getElementById("temp").textContent = donnees.temp;
    document.getElementById("hum").textContent = donnees.hum;
    document.getElementById("press").textContent = donnees.press;
    document.getElementById("lum").textContent = donnees.lum;
    document.getElementById("CO2").textContent = donnees.CO2;
}

function deleteNetwork() {
    // Récupérer la liste d'éléments <li>
    const liste = document.getElementById('savednet');

    const items = liste.querySelectorAll(".li");
   
    const SSIDToDelete = {};

    // Parcourir chaque élément de la liste
    var i = 0;

    items.forEach(function(item) {
        const checkBox = item.querySelector(".check");
        const txt = item.querySelector(".netName");
        if (checkBox.checked) {
            i = i + 1;
            checkBox.checked = false;
            const ssid = txt.textContent; // Récupérer l'ID de l'élément
            SSIDToDelete[i] = ssid;
            //txt.textContent = "Not registered";
            item.remove();//remove the line from the list
        }
    });
   
    // Si des éléments ont été cochés, envoyer la requête au serveur
    if (Object.keys(SSIDToDelete).length > 0) {
        console.log("Sending request");
        sendRequest("DeleteNetwork", SSIDToDelete);
        console.log(JSON.stringify(SSIDToDelete));
        //sendDeleteRequest(idsToDelete);
    }
}

function sendRequest(requestName, data) {
   
    // Envoyer une requête POST au serveur
    fetch('/' + requestName, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data), // Convertir les données en JSON
    })
    .then(response => response.json())
    .then(data => {
        console.log('Réponse du serveur :', data);
        return data;
    })
    .catch((error) => {
        console.error('Erreur lors de la requête :', error);
    });
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

   /* console.log("Data retreived : ");
    console.log(SSID);
    console.log(pass);*/

    if((SSID.length >= 2) && (pass.length >= 8)){//all conditions satisfied

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

        liste.appendChild(ligne);
        //console.log("everything went good");
        document.getElementById('SSID_input').value = "";
        document.getElementById('Pass_input').value = "";

        if(deleteMessage("error_ssid", 0,0.001)){
            document.getElementById('SSID_input').style.borderColor= "black"; 
        }

        if(deleteMessage("error_pass", 0,0.001)){
            document.getElementById('Pass_input').style.borderColor= "black"; 
        }

        if(!exist("success")){
            const success = createMsg("Network registered, the sensor will restart", "success", "green");
            document.getElementById("passForm").insertBefore(success, document.getElementById("Connect"));
            deleteMessage("success", 2,3000);
        }

        const toSend = {
            SSID : SSID,
            pass : pass
        };
        console.log("sending to esp");
        console.log(JSON.stringify(toSend));
        sendRequest("NewNetwork", toSend);
       

    }
    else{//wrong inputs lenght
        deleteMessage("success", 0);

        if((SSID.length < 2)){
            document.getElementById('SSID_input').style.borderColor= "red"; 

            if(!exist("error_ssid")){
                const msg = createMsg("The network name must contain at least 2 characters", "error_ssid", "red");
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

                const msg = createMsg("The password must contain at least 8 characters", "error_pass", "red");
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

    const toSend = {
        Name : Name,
        AP_SSID: AP_SSID,
        AP_Pass: AP_Pass
    };

    if(checkLenght(Name,2) && checkLenght(AP_SSID, 2) && checkLenght(AP_Pass, 8)){//everything ok
        
        deleteMessage("fail_name",0,0);
        deleteMessage("fail_ssid",0,0);
        deleteMessage("fail_pass",0,0);

        const msg = createMsg("Changes saved", "success_param", "green");
        document.getElementById("paramForm").insertBefore(msg, document.getElementById("enregistrer"));

        deleteMessage("success_param",2, 3000);

    }
    else{

        deleteMessage("success_param");

        if(!checkLenght(Name,2)){
            if(!exist("fail_name")){
                const msg1 = createMsg("The name must contain at least 2 characters", "fail_name", "red");
                document.getElementById("paramForm").insertBefore(msg1, document.getElementById("enregistrer"));
            }
        }
        else{
            deleteMessage("fail_name",0.5,0);
        }

        if(!checkLenght(AP_SSID,2)){
            if(!exist("fail_ssid")){
                const msg2 = createMsg("The hotspot name must contain at least 2 characters", "fail_ssid", "red");
                document.getElementById("paramForm").insertBefore(msg2, document.getElementById("enregistrer"));
            }
        }
        else{
            deleteMessage("fail_ssid",0.5,0);
        }

        if(!checkLenght(AP_Pass,8)){
            if(!exist("fail_pass")){
                const msg3 = createMsg("The password must contain at least 8 characters", "fail_pass", "red");
                document.getElementById("paramForm").insertBefore(msg3, document.getElementById("enregistrer"));
            }
        }
        else{
            deleteMessage("fail_pass",0.5,0);
        }
    }

    console.log("Sending to ESP32");
    sendRequest("NewInfos", toSend);
    console.log(JSON.stringify(toSend));


}
/*
function espGetData(){
    const networks = [];
    

    for(var i = 0; i < Math.floor(Math.random() * 50).toFixed(0); i++){
        const network = [];
        network.push("Réseau" + Math.floor(Math.random() * 1250).toFixed(0));
        network.push("(-" +  Math.floor(Math.random() * 100).toFixed(0) +")");

        networks.push(network);
    }

    //console.log(networks);
    return networks;
}*/

function scanNetworks(){

    const netList = document.getElementById("Netlist");

    //console.log("Deleting old list");

    while (netList.firstChild) {//deleting all scan networks
        netList.removeChild(netList.firstChild);
    }

    console.log("Sending request to server");
    toSend = {
        do : "scan"
    };

    const networks = JSON.parse(sendRequest("ScanNetwork", toSend));

    const keys = Object.keys(networks);
    //const networks = espGetData();


    keys.forEach(function(SSID) {
        console.log("Running");
        //const SSID = network;
        const RSSI = networks[SSID];

        const ligne = document.createElement("li");
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
        ligne.appendChild(force);
        

        netList.append(ligne);
    });

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

document.addEventListener("DOMContentLoaded", mettreAJourSpans);
setInterval(mettreAJourSpans, 2000);
