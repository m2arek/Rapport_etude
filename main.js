
    /***************************************************
     * GESTION DES ONGLETS + AJUSTEMENT CARTE
     ***************************************************/
    function openTab(evt, tabId) {
      const tabContents = document.getElementsByClassName("tabContent");
      for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove("activeTab");
      }
      const tablinks = document.getElementsByClassName("tablinks");
      for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("activeTab");
      }
      document.getElementById(tabId).classList.add("activeTab");
      evt.currentTarget.classList.add("activeTab");

      if (tabId === 'tab1') {
        setTimeout(() => { map.invalidateSize(); }, 300);
      }
    }

    /***************************************************
     *  VARIABLES GLOBALES & DONNÉES PRIMES INTÉGRÉES
     ***************************************************/
    let monthlyProductionData = [];
    /**Tablau**/
    const primeTarifsData = {
      "France Metropolitaine": {
        "tarif_rachat": [
          { "min": 0, "max": 3, "tarif": 0.1269 },
          { "min": 4, "max": 9, "tarif": 0.1269 },
          { "min": 10, "max": 36, "tarif": 0.0761 },
          { "min": 37, "max": 100, "tarif": 0.0761 },
          { "min": 101, "max": 500, "tarif": 0.0761 }
        ],
        "primes": [
          { "min": 0, "max": 3, "montant_euros_par_wc": 0.22 },
          { "min": 4, "max": 9, "montant_euros_par_wc": 0.16 },
          { "min": 10, "max": 36, "montant_euros_par_wc": 0.19 },
          { "min": 37, "max": 100, "montant_euros_par_wc": 0.10 },
          { "min": 101, "max": 500, "montant_euros_par_wc": 0.10 }
        ]
      },
      "Corse": {
        "tarif_rachat": [
          { "min": 0, "max": 3, "tarif": 0.1641 },
          { "min": 4, "max": 9, "tarif": 0.1641 },
          { "min": 10, "max": 36, "tarif": 0.0891 },
          { "min": 37, "max": 100, "tarif": 0.0891 },
          { "min": 101, "max": 500, "tarif": 0.1335 }
        ],
        "primes": [
          { "min": 0, "max": 3, "montant_euros_par_wc": 1.26 },
          { "min": 4, "max": 9, "montant_euros_par_wc": 0.71 },
          { "min": 10, "max": 36, "montant_euros_par_wc": 0.36 },
          { "min": 37, "max": 100, "montant_euros_par_wc": 0.48 },
          { "min": 101, "max": 500, "montant_euros_par_wc": 0.00 }
        ]
      },
      "Reunion": {
        "tarif_rachat": [
          { "min": 0, "max": 3, "tarif": 0.1735 },
          { "min": 4, "max": 9, "tarif": 0.1735 },
          { "min": 10, "max": 36, "tarif": 0.0891 },
          { "min": 37, "max": 100, "tarif": 0.0891 },
          { "min": 101, "max": 500, "tarif": 0.1483 }
        ],
        "primes": [
          { "min": 0, "max": 3, "montant_euros_par_wc": 1.62 },
          { "min": 4, "max": 9, "montant_euros_par_wc": 0.97 },
          { "min": 10, "max": 36, "montant_euros_par_wc": 0.51 },
          { "min": 37, "max": 100, "montant_euros_par_wc": 0.39 },
          { "min": 101, "max": 500, "montant_euros_par_wc": 0.00 }
        ]
      }
    };

    function detectTerritoryFromZip(cpStr) {
      if(!cpStr || cpStr.length < 2) return "France Metropolitaine";
      let prefix2 = cpStr.substring(0,2); 
      if(prefix2 === "20") return "Corse";
      if(prefix2 === "97") return "Reunion";
      return "France Metropolitaine";
    }

    /***************************************************
     *  INITIALISATION PAGE
     ***************************************************/
    window.addEventListener("load", function() {
      const firstTabButton = document.querySelector(".tabNav button");
      if (firstTabButton) { firstTabButton.click(); }
      // Ajoutez l'écouteur pour le sélecteur de Leaser ici :
  document.getElementById("leasingCompany").addEventListener("change", function() {
    const ldInput = document.getElementById("leaseDuration");
    if (this.value === "Leasecom") {
      ldInput.value = 72; // Force 72 mois pour Leasecom
      ldInput.disabled = true;
    } else {
      ldInput.disabled = false;
    }
  });
      const consumptionTableBody = document.getElementById("consumptionTableBody");
      const months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
      const lastRow = consumptionTableBody.querySelector("tr");
      months.forEach((month, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${month}</td>
          <td>
            <input type="number" id="euros_${index}" name="euros_${index}" placeholder="€" style="width: 90%;" oninput="calculateCost(${index})" />
          </td>
          <td>
            <input type="number" id="kwh_${index}" name="kwh_${index}" placeholder="kWh" style="width: 90%;" oninput="calculateCost(${index})" />
          </td>
          <td id="costPerKwh_${index}">-</td>
        `;
        consumptionTableBody.insertBefore(row, lastRow);
      });
    });

    /***************************************************
     * 1) INITIALISER LA CARTE
     ***************************************************/
    const map = L.map("map").setView([48.8566, 2.3522], 18);
    const tileLayer = L.tileLayer("https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
      maxZoom: 20,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      attribution: "© Google",
    });
    tileLayer.addTo(map);
    let searchMarker = null;

    /***************************************************
     * 2) DESSIN LIBRE SUR CANVAS
     ***************************************************/
    const drawingCanvas = document.getElementById("drawingCanvas");
    const ctx = drawingCanvas.getContext("2d");
    const AdresseField = document.getElementById("Adresse");
    let drawing = false;
    let drawingEnabled = false;
    const toggleDrawingButton = document.getElementById("toggleDrawingButton");
    toggleDrawingButton.addEventListener("click", () => {
      drawingEnabled = !drawingEnabled;
      drawingCanvas.style.pointerEvents = drawingEnabled ? "auto" : "none";
      toggleDrawingButton.textContent = drawingEnabled ? "Désactiver le dessin" : "Activer le dessin (main levée)";
    });
    function resizeCanvas() {
      drawingCanvas.width = drawingCanvas.offsetWidth;
      drawingCanvas.height = drawingCanvas.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    drawingCanvas.addEventListener("mousedown", (event) => {
      if (!drawingEnabled) return;
      drawing = true;
      ctx.beginPath();
      const rect = drawingCanvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      ctx.moveTo(x, y);
    });
    drawingCanvas.addEventListener("mouseup", () => {
      if (!drawingEnabled) return;
      drawing = false;
      ctx.beginPath();
    });
    drawingCanvas.addEventListener("mousemove", (event) => {
      if (!drawing || !drawingEnabled) return;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "red";
      const rect = drawingCanvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
    });

    /***************************************************
     * A) OUTILS LEAFLET DRAW
     ***************************************************/
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    const drawControl = new L.Control.Draw({
      draw: {
        marker: false,
        circle: false,
        circlemarker: false,
        polygon: true,
        rectangle: true,
        polyline: true
      },
      edit: {
        featureGroup: drawnItems
      }
    });
    let measureActive = false;
    const measureButton = document.getElementById("toggleMeasureButton");
    measureButton.addEventListener("click", () => {
      measureActive = !measureActive;
      if (measureActive) {
        map.addControl(drawControl);
        measureButton.textContent = "Terminer la mesure";
      } else {
        map.removeControl(drawControl);
        measureButton.textContent = "Mesurer une surface";
      }
    });
    function computeBearing(lat1, lng1, lat2, lng2) {
      const toRad = (val) => val * Math.PI / 180;
      const toDeg = (val) => val * 180 / Math.PI;
      const dLon = toRad(lng2 - lng1);
      const y = Math.sin(dLon) * Math.cos(toRad(lat2));
      const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
      let brng = Math.atan2(y, x);
      brng = toDeg(brng);
      return (brng + 360) % 360;
    }
    map.on(L.Draw.Event.CREATED, function (e) {
      const layer = e.layer;
      drawnItems.addLayer(layer);
      if (e.layerType === "polygon" || e.layerType === "rectangle") {
        let latLngs = layer.getLatLngs();
        if (Array.isArray(latLngs[0])) { latLngs = latLngs[0]; }
        const area = L.GeometryUtil.geodesicArea(latLngs);
        const areaInt = Math.round(area);
        alert(`Surface mesurée : ${areaInt.toLocaleString('fr-FR')} m²`);
        document.getElementById("Surface toiture").value = areaInt;
        updateProductionPotential();
      } else if (e.layerType === "polyline") {
        const latLngs = layer.getLatLngs();
        if (latLngs.length < 2) {
          alert("Tracez au moins 2 points pour la ligne d'orientation.");
          return;
        }
        const first = latLngs[0];
        const last = latLngs[latLngs.length - 1];
        const angle = computeBearing(first.lat, first.lng, last.lat, last.lng);
        let aspectVal = angle - 180;
        aspectVal = (aspectVal + 180 + 360) % 360 - 180;
        document.getElementById("orientationIrr").value = aspectVal.toFixed(1);
        document.getElementById("orientation").value = aspectVal.toFixed(1);
        alert(`Orientation déterminée: ${aspectVal.toFixed(1)}° (0 = Sud)`);
        drawnItems.removeLayer(layer);
      }
    });

    /***************************************************
     * 3) RECHERCHE D'ADRESSE + MARQUEUR + TERRITOIRE
     ***************************************************/
    const addressSearchBtn = document.getElementById("addressSearchBtn");
    addressSearchBtn.addEventListener("click", searchAddress);
    function searchAddress() {
      const address = document.getElementById("address").value;
      if(!address) return;
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
        .then(r => r.json())
        .then(data => {
          if(data.length > 0){
            const { lat, lon, display_name } = data[0];
            map.setView([lat, lon], 18);
            AdresseField.value = address;
            if(searchMarker){ map.removeLayer(searchMarker); }
            searchMarker = L.marker([lat, lon]).addTo(map);
            searchMarker.bindPopup(`Adresse trouvée : ${address}`).openPopup();
            document.getElementById("latitudeIrr").value = lat;
            document.getElementById("longitudeIrr").value = lon;
            let foundCP = null;
            if(data[0].address && data[0].address.postcode){
              foundCP = data[0].address.postcode;
            } else {
              const patternCP = /\b(\d{4,5})\b/;
              let match = display_name.match(patternCP);
              if(match) foundCP = match[1];
            }
            if(foundCP){
              const territoryValue = detectTerritoryFromZip(foundCP);
              document.getElementById("territory").value = territoryValue;
            } else {
              document.getElementById("territory").value = "France Metropolitaine";
            }
          } else { alert("Adresse introuvable."); }
        })
        .catch(err => {
          console.error("Erreur recherche adresse:", err);
          alert("Une erreur est survenue lors de la recherche de l'adresse.");
        });
    }

    /***************************************************
     * 3B) CALCUL PRODUCTIBLE (API PVGIS)
     ***************************************************/
    async function getProductible(lat, lon, aspectValue){
      const angleValue = parseFloat(document.getElementById("angleIrr").value) || 35;
      const originalUrl = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?outputformat=basic&lat=${lat}&lon=${lon}&raddatabase=PVGIS-SARAH2&peakpower=1&loss=14&pvtechchoice=crystSi&angle=${angleValue}&aspect=${aspectValue}&usehorizon=1`;
      const proxyUrl = `https://corsproxy.io/?key=a32495b2&url=${encodeURIComponent(originalUrl)}`;
      try {
        const response = await fetch(proxyUrl);
        if(!response.ok) return null;
        const text = await response.text();
        const lines = text.split("\n");
        let yearProduction = null;
        let tempMonthly = [];
        for(let line of lines){
          let cleanLine = line.trim();
          if(!cleanLine) continue;
          if(cleanLine.includes("Year")){
            const parts = cleanLine.split("\t").map(s => s.trim());
            yearProduction = parseFloat(parts[1]);
          }
          else if(/^\d+\s/.test(cleanLine)){
            const parts = cleanLine.split("\t").map(s => s.trim());
            if(parts.length >= 3){
              const monthNumber = parseInt(parts[0], 10);
              const E_mValue = parseFloat(parts[2]);
              tempMonthly.push({month: monthNumber, E_m: E_mValue});
            }
          }
        }
        monthlyProductionData = tempMonthly;
        return {yearProduction, monthlyProduction: tempMonthly};
      } catch(e){
        console.error(e);
        return null;
      }
    }

    const calculateIrrButton = document.getElementById("calculateIrrButton");
    calculateIrrButton.addEventListener("click", async () => {
      const lat = parseFloat(document.getElementById("latitudeIrr").value);
      const lon = parseFloat(document.getElementById("longitudeIrr").value);
      const aspectValue = parseFloat(document.getElementById("orientation").value);
      if(isNaN(lat) || isNaN(lon)){
        alert("Veuillez d'abord renseigner la latitude et la longitude.");
        return;
      }
      const result = await getProductible(lat, lon, aspectValue);
      if(result && result.yearProduction !== null){
        document.getElementById("productible").value = result.yearProduction.toLocaleString('fr-FR');
        fillMonthlyProductionTable(result.monthlyProduction);
      } else {
        alert("Impossible de récupérer le productible. Vérifiez la connexion ou les données.");
      }
      updateProductionPotential();
    });

    function fillMonthlyProductionTable(monthlyData){
      const tableBody = document.querySelector("#monthlyProductionTable tbody");
      tableBody.innerHTML = "";
      const moisNoms = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
      monthlyData.forEach(item => {
        const row = document.createElement("tr");
        const monthCell = document.createElement("td");
        const productionCell = document.createElement("td");
        const idx = item.month - 1;
        monthCell.textContent = (idx >= 0 && idx < 12) ? moisNoms[idx] : `Mois ${item.month}`;
        productionCell.textContent = item.E_m?.toLocaleString('fr-FR') || "-";
        row.appendChild(monthCell);
        row.appendChild(productionCell);
        tableBody.appendChild(row);
      });
    }

    /***************************************************
     * 3C) CALCUL "POTENTIEL DE PRODUCTION"
     ***************************************************/
    function updateProductionPotential(){
      const surfaceStr = (document.getElementById("Surface toiture").value || "")
        .replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".");
      const exclStr = document.getElementById("exclusionPercent").value || "0";
      const panelPowerStr = document.getElementById("puissancePanneau").value || "420";
      const productibleStr = (document.getElementById("productible").value || "")
        .replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".");
      const surface = parseFloat(surfaceStr) || 0;
      const exclusionPercent = parseFloat(exclStr) || 0;
      const panelPower = parseFloat(panelPowerStr) || 420;
      const productibleVal = parseFloat(productibleStr) || 0;
      const surfaceUtile = surface * (1 - (exclusionPercent/100));
      const nbPanels = Math.floor(surfaceUtile / 2);
      const puissanceMaxW = nbPanels * panelPower;
      const puissanceMaxKW = Math.round(puissanceMaxW / 1000);
      const production = Math.round(puissanceMaxKW * productibleVal);
      document.getElementById("nombrePVMax").value = nbPanels.toLocaleString('fr-FR');
      document.getElementById("puissanceMaxPV").value = puissanceMaxKW.toLocaleString('fr-FR');
      document.getElementById("productionInstall").value = production.toLocaleString('fr-FR');
    }
    const surfaceInput = document.getElementById("Surface toiture");
    const exclInput = document.getElementById("exclusionPercent");
    const panelSelect = document.getElementById("puissancePanneau");
    const productibleInput = document.getElementById("productible");
    surfaceInput.addEventListener("input", updateProductionPotential);
    exclInput.addEventListener("input", updateProductionPotential);
    panelSelect.addEventListener("change", updateProductionPotential);
    productibleInput.addEventListener("input", updateProductionPotential);

    /***************************************************
     * PARTIE : EXPORT  AVEC CAPTURE CARTE
     ***************************************************/
    const mapCaptureFileInput = document.getElementById("mapCaptureFile");
    const exportPDFBtn = document.getElementById("exportPDFBtn");
    let mapCaptureDataURL = null;
    let mapCaptureFormat = null;
    mapCaptureFileInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) { mapCaptureDataURL = null; mapCaptureFormat = null; return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        mapCaptureDataURL = e.target.result;
        if (file.type.toLowerCase().includes("jpeg")) { mapCaptureFormat = "JPEG"; }
        else if (file.type.toLowerCase().includes("png")) { mapCaptureFormat = "PNG"; }
        else { mapCaptureFormat = "PNG"; }
        alert("Capture de carte sélectionnée !");
      };
      reader.readAsDataURL(file);
    });
    exportPDFBtn.addEventListener("click", generatePdfReport);

/***************************************************
 * MODULE : PLAN DE TRÉSORERIE (ONGLET 12)
 ***************************************************/

/**
 * Fonction pour obtenir le coefficient Grenke selon le barème.
 * Le tableau est basé sur :
 * 
 * | Montant HT                   | 60 mois | 72 mois         | 84 mois         | 96 mois         |
 * |------------------------------|--------:|----------------:|----------------:|----------------:|
 * | 12 501 – 25 000 €            | 2.07    | non available   | non available   | non available   |
 * | 25 001 – 37 500 €            | 2.06    | 1.77            | non available   | non available   |
 * | 37 501 – 50 000 €            | 2.05    | 1.76            | 1.56            | non available   |
 * | 50 001 – 75 000 €            | 2.04    | 1.75            | 1.55            | 1.40            |
 * | 75 001 – 100 500 €           | 2.03    | 1.74            | 1.54            | 1.39            |
 * | 100 000 € et +               | 2.02    | 1.73            | 1.53            | 1.38            |
 * 
 * Pour les valeurs "non available", la fonction renverra null.
 */
 function getGrenkeFactor(amountHT, months) {
  const baremeGrenke = [
    { min: 12501, max: 25000,  factor60: 2.07, factor72: null,  factor84: null,  factor96: null },
    { min: 25001, max: 37500,  factor60: 2.06, factor72: 1.77,  factor84: null,  factor96: null },
    { min: 37501, max: 50000,  factor60: 2.05, factor72: 1.76,  factor84: 1.56,  factor96: null },
    { min: 50001, max: 75000,  factor60: 2.04, factor72: 1.75,  factor84: 1.55,  factor96: 1.40 },
    { min: 75001, max: 100500, factor60: 2.03, factor72: 1.74,  factor84: 1.54,  factor96: 1.39 },
    { min: 100501, max: Infinity, factor60: 2.02, factor72: 1.73, factor84: 1.53, factor96: 1.38 }
  ];

  for (let bracket of baremeGrenke) {
    if (amountHT >= bracket.min && amountHT <= bracket.max) {
      let factor = null;
      switch (months) {
        case 60:
          factor = bracket.factor60;
          break;
        case 72:
          factor = bracket.factor72;
          break;
        case 84:
          factor = bracket.factor84;
          break;
        case 96:
          factor = bracket.factor96;
          break;
        default:
          factor = null;
      }
      return factor;
    }
  }
  return null;
}


function calculatePlanTresorerie(){
  const financementMode = document.getElementById("financementMode").value;
  const scenarioPlan = document.getElementById("scenarioPlan").value;
  
  // Mise à jour dynamique de l'en-tête : le 3ème titre passe à "Loyer" si leasing
  const headerRow = document.getElementById("planTresorerieHeader").querySelector("tr");
  if(financementMode === "leasing") {
    headerRow.cells[2].innerHTML = "Loyer";
  } else {
    headerRow.cells[2].innerHTML = "Remboursement du prêt";
  }
  
  let autoYear1_val, surplus_val;
  if(scenarioPlan === "standard"){
    autoYear1_val = parseFloat(document.getElementById("monthlyTotalAuto").textContent.replace("€","").trim());
    surplus_val = parseFloat(document.getElementById("monthlyTotalRevente").textContent.replace("€","").trim());
  } else {
    autoYear1_val = parseFloat(document.getElementById("monthlyTotalAutoForced").textContent.replace("€","").trim());
    surplus_val = parseFloat(document.getElementById("monthlyTotalReventeForced").textContent.replace("€","").trim());
  }
  const recettesAnnee1 = autoYear1_val + surplus_val;
  
  let installationCostHT = 0;
  if(scenarioPlan === "standard"){
    installationCostHT = parseFloat(document.getElementById("coutInstallation").textContent.replace(/[^0-9.]/g,"")) || 0;
  } else {
    installationCostHT = parseFloat(document.getElementById("coutInstallationForced").textContent.replace(/[^0-9.]/g,"")) || 0;
  }
  
  // Application de la remise, si renseignée
  let remise = 0;
  if(scenarioPlan === "standard"){
    remise = parseFloat(document.getElementById("remise").value) || 0;
  } else {
    remise = parseFloat(document.getElementById("remiseForced").value) || 0;
  }
  // Le coût HT effectif est le coût HT moins la remise
  installationCostHT = installationCostHT - remise;
  if(installationCostHT < 0) {
    installationCostHT = 0;
  }
  
  let preconisePower = 0;
  if(scenarioPlan === "standard"){
      preconisePower = parseFloat(document.getElementById("puissanceReco").textContent) || 0;
  } else {
      preconisePower = parseFloat(document.getElementById("puissanceRecoForced").textContent) || 0;
  }
  
  const inflation = parseFloat(document.getElementById("inflation_estimee").value) || 0;
  const taux_emprunt = parseFloat(document.getElementById("taux_emprunt").value) || 0;
  const duree_pret = parseFloat(document.getElementById("duree_pret").value) || 0;
  const index_leasing = parseFloat(document.getElementById("index_leasing").value) || 0;
  // Le champ "duree_leasing" est toujours présent pour d'autres références
  const duree_leasing = parseFloat(document.getElementById("duree_leasing").value) || 0;
  
  let annualRepayment = 0;
  if(financementMode === "banque" && duree_pret > 0){
    const n = duree_pret * 12;
    const i = taux_emprunt / 100 / 12;
    const monthlyPayment = installationCostHT * (i * Math.pow(1+i, n)) / (Math.pow(1+i, n) - 1);
    annualRepayment = monthlyPayment * 12;
  }
  
  let annualLeasing = 0;
  if(financementMode === "leasing"){
    // Nouveaux champs pour le Leasing
    const leasingCompany = document.getElementById("leasingCompany").value;
    // Utilisation du champ "leaseDuration" ajouté en HTML pour la durée choisie
    const chosenLeaseDuration = parseInt(document.getElementById("leaseDuration").value) || 0;
    
    if (leasingCompany === "Leasecom") {
      // Pour Leasecom, on force 72 mois et on applique la logique existante basée sur index_leasing
      annualLeasing = installationCostHT * (index_leasing/100) * 12;
    } else if (leasingCompany === "Grenke") {
      // Pour Grenke, on utilise le tableau de coefficients selon le montant HT et la durée choisie.
      const factor = getGrenkeFactor(installationCostHT, chosenLeaseDuration);
      if (factor === null) {
        alert("La durée de " + chosenLeaseDuration + " mois n'est pas possible pour un montant HT de " 
              + installationCostHT + " € selon le barème Grenke.");
        annualLeasing = 0;
      } else {
        const monthlyLease = (installationCostHT * factor) / 100;
        annualLeasing = monthlyLease * 12;
      }
    }
  }
  
  let totalRecettes = 0;
  let totalFinancement = 0;
  let totalSoldeNet = 0;
  
  const tableBody = document.getElementById("planTresorerieBody");
  tableBody.innerHTML = "";
  
  for(let year = 1; year <= 20; year++){
    const factorYear = (year === 1) ? 1 : Math.pow(1 + inflation/100, year-1);
    
    let recettes;
    if(year === 1){
      recettes = recettesAnnee1;
    } else {
      let projTable;
      if(scenarioPlan === "standard"){
        projTable = document.getElementById("preconisationTable");
      } else {
        projTable = document.getElementById("preconisationTableForced");
      }
      const rows = projTable.querySelectorAll("tbody tr");
      if(rows.length >= year){
        const row = rows[year - 1];
        const econ = parseFloat(row.cells[2].textContent.replace(/[^0-9.-]+/g,"")) || 0;
        const revente = parseFloat(row.cells[4].textContent.replace(/[^0-9.-]+/g,"")) || 0;
        recettes = econ + revente;
        if(year === 2) {
          let S = 0;
          if(scenarioPlan === "standard"){
            S = parseFloat(document.getElementById("puissanceReco").textContent) || 0;
          } else {
            S = parseFloat(document.getElementById("puissanceRecoForced").textContent) || 0;
          }
          const territory = document.getElementById("territory").value || "France Metropolitaine";
          const tObj = getTarifRachatAndPrime(S, territory);
          const primeTotal = Math.round(tObj.primeByWc * (S * 1000));
          recettes += primeTotal;
        }
      } else {
        recettes = recettesAnnee1;
      }
    }
  
    let financementCost = 0;
    if(financementMode === "banque"){
      financementCost = (year <= duree_pret) ? annualRepayment : 0;
    } else {
      // Pour Leasing : le contrat est actif pendant (leaseDuration / 12) années.
      financementCost = (year <= (parseInt(document.getElementById("leaseDuration").value)/12)) ? annualLeasing : 0;
    }
    
    const soldeNet = recettes - financementCost;
    
    totalRecettes += recettes;
    totalFinancement += financementCost;
    totalSoldeNet += soldeNet;
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${year}</td>
      <td>${recettes.toFixed(2)} €</td>
      <td>${financementCost.toFixed(2)} €</td>
      <td>${soldeNet.toFixed(2)} €</td>
    `;
    tableBody.appendChild(row);
  }
  
  const totauxRow = document.createElement("tr");
  totauxRow.innerHTML = `
    <th>Totaux</th>
    <th>${totalRecettes.toFixed(2)} €</th>
    <th>${totalFinancement.toFixed(2)} €</th>
    <th>${totalSoldeNet.toFixed(2)} €</th>
  `;
  tableBody.appendChild(totauxRow);
}
 
const calculateTresorerieBtn = document.getElementById("calculateTresorerieBtn");
calculateTresorerieBtn.addEventListener("click", calculatePlanTresorerie);


    /***************************************************
     * 5) SAUVEGARDER / CHARGER JSON
     ***************************************************/
    const saveButton = document.getElementById("saveToFile");
    const loadFileInput = document.getElementById("loadFromFile");
    const uploadButton = document.getElementById("uploadFile");
    saveButton.addEventListener("click", () => {
      const form = document.getElementById("userForm");
      const rawFormData = new FormData(form);
      const formObject = {};
      rawFormData.forEach((value, key) => {
        if(formObject[key] !== undefined){
          if(!Array.isArray(formObject[key])){
            formObject[key] = [formObject[key]];
          }
          formObject[key].push(value);
        } else {
          formObject[key] = value;
        }
      });
      const center = map.getCenter();
      formObject["mapCenterLat"] = center.lat;
      formObject["mapCenterLng"] = center.lng;
      formObject["mapZoom"] = map.getZoom();
      formObject["canvasImage"] = drawingCanvas.toDataURL();
      const shapesGeoJSON = drawnItems.toGeoJSON();
      formObject["drawnShapes"] = shapesGeoJSON;
      formObject["monthlyProductionData"] = monthlyProductionData;
      const companyName = formObject["companyName"] || "Formulaire";
      const fileName = `Formulaire_${companyName}.json`;
      const jsonString = JSON.stringify(formObject, null, 2);
      const blob = new Blob([jsonString], { type:"application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
    });
    uploadButton.addEventListener("click", () => { loadFileInput.click(); });
    loadFileInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if(file){
        const reader = new FileReader();
        reader.onload = e => {
          const jsonData = JSON.parse(e.target.result);
          const form = document.getElementById("userForm");
          Object.keys(jsonData).forEach(key => {
            if(["mapCenterLat","mapCenterLng","mapZoom","canvasImage","drawnShapes","monthlyProductionData"].includes(key)){
              return;
            }
            const dataValue = jsonData[key];
            if(Array.isArray(dataValue)){
              dataValue.forEach(val => {
                const checkbox = form.querySelector(`[name="${key}"][value="${val}"]`);
                if(checkbox){ checkbox.checked = true; }
              });
            } else {
              const input = form.querySelector(`[name="${key}"]`);
              if(input){ input.value = dataValue; }
            }
          });
          if(jsonData["mapCenterLat"] !== undefined && jsonData["mapCenterLng"] !== undefined && jsonData["mapZoom"] !== undefined){
            map.setView([jsonData["mapCenterLat"], jsonData["mapCenterLng"]], jsonData["mapZoom"]);
          }
          if(jsonData["canvasImage"]){
            const image = new Image();
            image.onload = function(){
              ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
              ctx.drawImage(image, 0, 0);
            };
            image.src = jsonData["canvasImage"];
          }
          if(jsonData["drawnShapes"]){
            drawnItems.clearLayers();
            L.geoJson(jsonData["drawnShapes"]).eachLayer(layer => {
              drawnItems.addLayer(layer);
            });
          }
          if(jsonData["monthlyProductionData"]){
            monthlyProductionData = jsonData["monthlyProductionData"];
            fillMonthlyProductionTable(monthlyProductionData);
          }
          for(let i = 0; i < 12; i++){ calculateCost(i); }
          updateProductionPotential();
        };
        reader.readAsText(file);
      }
    });

    /***************************************************
     * 6) CALCUL DU COÛT PAR kWh
     ***************************************************/
    function calculateCost(index){
      const eurosInput = document.getElementById(`euros_${index}`);
      const kwhInput = document.getElementById(`kwh_${index}`);
      const costCell = document.getElementById(`costPerKwh_${index}`);
      if(!eurosInput || !kwhInput || !costCell) return;
      const euros = parseFloat(eurosInput.value) || 0;
      const kwh = parseFloat(kwhInput.value) || 0;
      if(kwh > 0){
        const costPerKwh = (euros / kwh).toFixed(2);
        costCell.textContent = `${costPerKwh} €`;
      } else { costCell.textContent = "-"; }
      calculateTotals();
    }
    function calculateTotals(){
      let totalEuros = 0, totalKwh = 0;
      for(let i = 0; i < 12; i++){
        const eurosVal = document.getElementById(`euros_${i}`);
        const kwhVal = document.getElementById(`kwh_${i}`);
        if(!eurosVal || !kwhVal) continue;
        const eVal = parseFloat(eurosVal.value) || 0;
        const kVal = parseFloat(kwhVal.value) || 0;
        totalEuros += eVal;
        totalKwh += kVal;
      }
      const averageCostPerKwh = totalKwh > 0 ? (totalEuros / totalKwh).toFixed(2) : "-";
      const totalEurosCell = document.getElementById("totalEuros");
      const totalKwhCell = document.getElementById("totalKwh");
      const totalCostPerKwhCell = document.getElementById("totalCostPerKwh");
      if(totalEurosCell) totalEurosCell.textContent = totalEuros.toFixed(2).toLocaleString('fr-FR') + " €";
      if(totalKwhCell) totalKwhCell.textContent = totalKwh.toFixed(2).toLocaleString('fr-FR') + " kWh";
      if(totalCostPerKwhCell){
        totalCostPerKwhCell.textContent = averageCostPerKwh !== "-" ? `${averageCostPerKwh} €` : "-";
      }
    }

    /***************************************************
     * 7) CALCUL DE LA PRÉCONISATION
     ***************************************************/
    function costInstallation(S, territory){
      let raw;
      if (S <= 100) { raw = S * ((1.9093 - (0.00659 * S))) * 1000; }
      else { raw = S * 1.15 * 1000; }
      if (territory === "Corse") { raw *= 1.00; }
      else if (territory === "Reunion") { raw *= 1.13; }
      return Math.round(raw / 100) * 100;
    }
    function getClosedDaysFraction() {
      const closedDays = [];
      document.querySelectorAll('input[name="joursConges[]"]:checked').forEach(chk => closedDays.push(chk.value));
      const nbClosed = closedDays.length;
      const fraction = nbClosed / 7.0;
      return fraction;
    }
    function getTarifRachatAndPrime(S, territory){
      if(!primeTarifsData) {
        console.warn("primeTarifsData introuvable, on retourne par défaut 0.0761 et prime=0");
        return {tarif:0.0761, primeByWc:0};
      }
      const tData = primeTarifsData[territory] || primeTarifsData["France Metropolitaine"];
      let foundTarif = 0.0761;
      let foundPrime = 0;
      if(tData){
        if(Array.isArray(tData.tarif_rachat)){
          for(let range of tData.tarif_rachat){
            if(S >= range.min && S <= range.max){ foundTarif = range.tarif; break; }
          }
        }
        if(Array.isArray(tData.primes)){
          for(let range of tData.primes){
            if(S >= range.min && S <= range.max){ foundPrime = range.montant_euros_par_wc; break; }
          }
        }
      }
      return {tarif: foundTarif, primeByWc: foundPrime};
    }
    function calculateROI(coutInstallation, autoYear1, surplusYear1, primeTotal, annualPriceIncrease) {
      let cumulativeSavings = 0;
      let roiYears = 0;
      while (roiYears < 100) {
        roiYears++;
        let econAuto = autoYear1 * Math.pow(1 + annualPriceIncrease / 100, roiYears - 1);
        let gainsRev = surplusYear1;
        let prime = (roiYears === 2) ? primeTotal : 0;
        let totalYearSavings = econAuto + gainsRev + prime;
        cumulativeSavings += totalYearSavings;
        if (cumulativeSavings >= coutInstallation) { break; }
      }
      return roiYears;
    }
    function computeAutoAndSurplusForPower(S, globalTarif){
      const ratioDStr = document.getElementById("ratioDiurne").value || "50";
      const ratioD = parseFloat(ratioDStr) || 50;
      const fractionClosed = getClosedDaysFraction();
      let totalGain = 0;
      for(let i = 0; i < 12; i++){
        const kwhInput = document.getElementById(`kwh_${i}`);
        const costCell = document.getElementById(`costPerKwh_${i}`);
        if(!kwhInput || !costCell || !monthlyProductionData[i]) continue;
        const consoKwh = parseFloat(kwhInput.value) || 0;
        const p_kWh = parseFloat(costCell.textContent) || 0;
        const E_m1kW = monthlyProductionData[i].E_m || 0;
        const production = S * E_m1kW;
        const forcedSurplus = fractionClosed * production;
        const leftover = production - forcedSurplus;
        const consoKwhDiurne = consoKwh * (ratioD / 100);
        const autoCons = Math.min(leftover, consoKwhDiurne);
        const leftoverAfter = leftover - autoCons;
        const finalSurplus = forcedSurplus + Math.max(leftoverAfter, 0);
        const gainMonth = (autoCons * p_kWh);
        totalGain += gainMonth;
      }
      return totalGain;
    }
    function calculatePreconisationWithPower(S, firstYearGain, territoryObj){
      fillMonthlyPreconisation(S, territoryObj.tarif);
      fill20YearsPreconisation(S, firstYearGain, territoryObj);
    }
    let monthlyBarChart = null;
    function createMonthlyBarChart(labels, consoData, autoData, revData){
      const ctx = document.getElementById("monthlyBarChart").getContext("2d");
      if(monthlyBarChart){ monthlyBarChart.destroy(); }
      monthlyBarChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            { label: "Conso kWh", data: consoData, backgroundColor: "rgba(255,99,132,0.6)" },
            { label: "Autoconso kWh", data: autoData, backgroundColor: "rgba(75,192,75,0.6)" },
            { label: "Revente kWh", data: revData, backgroundColor: "rgba(54,162,235,0.6)" },
          ]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true, title: { display: true, text: "kWh" } } }
        }
      });
    }
    function fillMonthlyPreconisation(S, globalTarif){
      const showKwh = document.getElementById("showKwhColumns").checked;
      const table = document.getElementById("preconisationMonthlyTable");
      table.innerHTML = "";
      let headerRow = `<tr>
        <th>Mois</th>
        ${ showKwh ? '<th>Conso kWh</th>' : '' }
        ${ showKwh ? '<th>Production kWh</th>' : '' }
        ${ showKwh ? '<th>Autoconso kWh</th>' : '' }
        ${ showKwh ? '<th>Revente kWh</th>' : '' }
        <th>Facture Sans Centrale</th>
        <th>Économies Autoconso</th>
        <th>Facture Avec Centrale</th>
        <th>Gains Revente</th>
        <th>Total Économies</th>
        <th>% Auto prod</th>
        <th>% Auto conso</th>
        <th>% Revente</th>
      </tr>`;
      const thead = document.createElement("thead");
      thead.innerHTML = headerRow;
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      table.appendChild(tbody);
      let footRow = `<tr>
        <th>Totaux</th>
        ${ showKwh ? '<td id="monthlySumKwhConso">-</td>' : '' }
        ${ showKwh ? '<td id="monthlySumProduction">-</td>' : '' }
        ${ showKwh ? '<td id="monthlySumKwhAuto">-</td>' : '' }
        ${ showKwh ? '<td id="monthlySumKwhRevente">-</td>' : '' }
        <td id="monthlyTotalSansPv">-</td>
        <td id="monthlyTotalAuto">-</td>
        <td id="monthlyTotalAvecPv">-</td>
        <td id="monthlyTotalRevente">-</td>
        <td id="monthlyTotalEconomies">-</td>
        <td id="monthlyTotalAutoProdPerc">-</td>
        <td id="monthlyTotalAutoConsoPerc">-</td>
        <td id="monthlyTotalRevPerc">-</td>
      </tr>`;
      const tfoot = document.createElement("tfoot");
      tfoot.innerHTML = footRow;
      table.appendChild(tfoot);
      let sumSansPv = 0, sumAuto = 0, sumRev = 0, sumAvecPv = 0, sumEco = 0;
      let sumKwhConso = 0, sumKwhAuto = 0, sumKwhRev = 0, sumProduction = 0;
      const moisNoms = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
      const fractionClosed = getClosedDaysFraction();
      const ratioD = parseFloat(document.getElementById("ratioDiurne").value) || 50;
      const chartConso = [], chartAuto = [], chartRev = [];
      for(let i = 0; i < 12; i++){
        const eurosStr = document.getElementById(`euros_${i}`)?.value || "0";
        const factureSansPv = parseFloat(eurosStr) || 0;
        const consoKwh = parseFloat(document.getElementById(`kwh_${i}`)?.value) || 0;
        const costText = document.getElementById(`costPerKwh_${i}`)?.textContent || "0";
        const costUnit = parseFloat(costText) || 0;
        if(!monthlyProductionData[i]) continue;
        const E_m1kW = monthlyProductionData[i].E_m || 0;
        const production = S * E_m1kW;
        sumProduction += production;
        const forcedSurplus = fractionClosed * production;
        const leftover = production - forcedSurplus;
        const consoKwhDiurne = consoKwh * (ratioD/100);
        const autoCons = Math.min(leftover, consoKwhDiurne);
        const leftoverAfter = leftover - autoCons;
        const finalSurplus = forcedSurplus + Math.max(leftoverAfter, 0);
        const economies = autoCons * costUnit;
        const revente = finalSurplus * globalTarif;
        const totalEco = economies + revente;
        const factureAvecPv = factureSansPv - economies;
        sumSansPv += factureSansPv;
        sumAuto += economies;
        sumRev += revente;
        sumAvecPv += factureAvecPv;
        sumEco += totalEco;
        sumKwhConso += consoKwh;
        sumKwhAuto += autoCons;
        sumKwhRev += finalSurplus;
        let autoprodPerc = 0;
        if(consoKwh > 0) autoprodPerc = 100*(autoCons/consoKwh);
        const totProd = production;
        let percAutoConsoGlobal = 0, percReventeGlobal = 0;
        if(totProd > 0){
          percAutoConsoGlobal = 100*(autoCons/totProd);
          percReventeGlobal = 100*(finalSurplus/totProd);
        }
        let row = document.createElement("tr");
        let rowHTML = `<td>${moisNoms[i]}</td>`;
        if(showKwh) { rowHTML += `<td>${consoKwh.toFixed(1)}</td>`; }
        if(showKwh) { rowHTML += `<td>${production.toFixed(1)}</td>`; }
        if(showKwh) { rowHTML += `<td>${autoCons.toFixed(1)}</td>`; }
        if(showKwh) { rowHTML += `<td>${finalSurplus.toFixed(1)}</td>`; }
        rowHTML += `<td>${factureSansPv.toFixed(2)} €</td>`;
        rowHTML += `<td>${economies.toFixed(2)} €</td>`;
        rowHTML += `<td>${factureAvecPv.toFixed(2)} €</td>`;
        rowHTML += `<td>${revente.toFixed(2)} €</td>`;
        rowHTML += `<td>${totalEco.toFixed(2)} €</td>`;
        rowHTML += `<td>${autoprodPerc.toFixed(1)}%</td>`;
        rowHTML += `<td>${percAutoConsoGlobal.toFixed(1)}%</td>`;
        rowHTML += `<td>${percReventeGlobal.toFixed(1)}%</td>`;
        row.innerHTML = rowHTML;
        tbody.appendChild(row);
        chartConso.push(consoKwh);
        chartAuto.push(autoCons);
        chartRev.push(finalSurplus);
      }
      if(showKwh){
        document.getElementById("monthlySumKwhConso").textContent = sumKwhConso.toFixed(1);
        document.getElementById("monthlySumProduction").textContent = sumProduction.toFixed(1);
        document.getElementById("monthlySumKwhAuto").textContent = sumKwhAuto.toFixed(1);
        document.getElementById("monthlySumKwhRevente").textContent = sumKwhRev.toFixed(1);
      }
      document.getElementById("monthlyTotalSansPv").textContent = sumSansPv.toFixed(2)+" €";
      document.getElementById("monthlyTotalAuto").textContent = sumAuto.toFixed(2)+" €";
      document.getElementById("monthlyTotalAvecPv").textContent = sumAvecPv.toFixed(2)+" €";
      document.getElementById("monthlyTotalRevente").textContent = sumRev.toFixed(2)+" €";
      document.getElementById("monthlyTotalEconomies").textContent = sumEco.toFixed(2)+" €";
      let totProd = sumKwhAuto + sumKwhRev;
      let finalAutoProdPerc = 0, finalAutoConsoPerc = 0, finalRevPerc = 0;
      if(sumKwhConso > 0) finalAutoProdPerc = 100*(sumKwhAuto/sumKwhConso);
      if(totProd > 0){
        finalAutoConsoPerc = 100*(sumKwhAuto/totProd);
        finalRevPerc = 100*(sumKwhRev/totProd);
      }
      document.getElementById("monthlyTotalAutoProdPerc").textContent = finalAutoProdPerc.toFixed(1)+"%";
      document.getElementById("monthlyTotalAutoConsoPerc").textContent = finalAutoConsoPerc.toFixed(1)+"%";
      document.getElementById("monthlyTotalRevPerc").textContent = finalRevPerc.toFixed(1)+"%";
      createMonthlyBarChart(moisNoms, chartConso, chartAuto, chartRev);
    }
    // **** Fonction modifiée pour la préconisation standard ****
    function fill20YearsPreconisation(S, firstYearGain, territoryObj){
      const annualPriceIncrease = parseFloat(document.getElementById("annualPriceIncrease").value) || 5;
      let baseYearStr = document.getElementById("monthlyTotalSansPv").textContent.replace("€","").trim();
      let baseYearCost = parseFloat(baseYearStr) || 0;
      let strEco = document.getElementById("monthlyTotalAuto").textContent.replace("€","").trim();
      let strRev = document.getElementById("monthlyTotalRevente").textContent.replace("€","").trim();
      let autoYear1 = parseFloat(strEco) || 0;
      let surplusYear1 = parseFloat(strRev) || 0;
      const primeByWc = territoryObj.primeByWc || 0;
      const primeTotal = Math.round(primeByWc * (S * 1000));
      const preconTableBody = document.querySelector("#preconisationTable tbody");
      preconTableBody.innerHTML = "";
      let totalSansPv = 0, totalAuto = 0, totalRev = 0, totalPrime = 0, totalAvecPv = 0, totalEco = 0;
      let cumulativeEco = 0;
      const territory = document.getElementById("territory").value || "France Metropolitaine";
      const costInst = costInstallation(S, territory);
      document.getElementById("coutInstallation").textContent = costInst.toLocaleString('fr-FR');
      document.getElementById("primeValue").textContent = primeTotal.toLocaleString('fr-FR');
      const remise = parseFloat(document.getElementById("remise").value) || 0;
      let coutReel = costInst - primeTotal - remise;
      if(coutReel < 0) coutReel = 0;
      document.getElementById("coutReelInstallation").textContent = coutReel.toLocaleString('fr-FR');
      
      for(let year = 1; year <= 20; year++){
        const factureSansPv = baseYearCost * Math.pow(1+annualPriceIncrease/100, (year-1));
        const econAuto = autoYear1 * Math.pow(1+annualPriceIncrease/100, (year-1));
        const gainsRev = surplusYear1;
        let primeYear = (year === 2) ? primeTotal : 0;
        const totalEcos = econAuto + gainsRev + primeYear;
        const factureAvecPv = factureSansPv - econAuto;
        totalSansPv += factureSansPv;
        totalAuto += econAuto;
        totalRev += gainsRev;
        totalPrime += primeYear;
        totalAvecPv += factureAvecPv;
        totalEco += totalEcos;
        cumulativeEco += totalEcos;
        
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${year}</td>
          <td>${factureSansPv.toFixed(2)} €</td>
          <td>${econAuto.toFixed(2)} €</td>
          <td>${factureAvecPv.toFixed(2)} €</td>
          <td>${gainsRev.toFixed(2)} €</td>
          <td>${primeYear.toFixed(2)} €</td>
          <td>${totalEcos.toFixed(2)} €</td>
          <td>${cumulativeEco.toFixed(2)} €</td>
        `;
        preconTableBody.appendChild(row);
      }
      document.getElementById("totalSansPv").textContent = totalSansPv.toFixed(2)+" €";
      document.getElementById("totalAuto").textContent = totalAuto.toFixed(2)+" €";
      document.getElementById("totalRevente").textContent = totalRev.toFixed(2)+" €";
      document.getElementById("totalPrime").textContent = totalPrime.toFixed(2)+" €";
      document.getElementById("totalAvecPv").textContent = totalAvecPv.toFixed(2)+" €";
      document.getElementById("totalEconomies").textContent = totalEco.toFixed(2)+" €";
      document.getElementById("puissanceReco").textContent = S.toLocaleString('fr-FR');
      
      // Calcul du nombre de modules et de la surface de l'installation
      const panelPower = parseFloat(document.getElementById("puissancePanneau").value) || 420;
      const nombreModules = Math.round(S * 1000 / panelPower);
      const surfaceInstallation = nombreModules * 2;
      document.getElementById("nombreModules").textContent = nombreModules.toLocaleString('fr-FR');
      document.getElementById("surfaceInstallation").textContent = surfaceInstallation.toLocaleString('fr-FR');
      
      // Mise à jour des gains après cumul
      document.getElementById("gainSansInv").textContent = totalEco.toFixed(2);
      let gainAvecInvVal = totalEco - coutReel;
      document.getElementById("gainAvecInv").textContent = gainAvecInvVal.toFixed(2);
      
      let roiYears = calculateROI(coutReel, autoYear1, surplusYear1, primeTotal, annualPriceIncrease);
      document.getElementById("roiResult").textContent = roiYears.toFixed(1);
    }
    // **** Fonction modifiée pour la préconisation Sélection ****
     function fill20YearsPreconisationForced(S, firstYearGain, territoryObj){
      const annualPriceIncrease = parseFloat(document.getElementById("annualPriceIncrease").value) || 5;
      let baseYearStr = document.getElementById("monthlyTotalSansPvForced").textContent.replace("€","").trim();
      let baseYearCost = parseFloat(baseYearStr) || 0;
      let strEco = document.getElementById("monthlyTotalAutoForced").textContent.replace("€","").trim();
      let strRev = document.getElementById("monthlyTotalReventeForced").textContent.replace("€","").trim();
      let autoYear1 = parseFloat(strEco) || 0;
      let surplusYear1 = parseFloat(strRev) || 0;
      const primeByWc = territoryObj.primeByWc || 0;
      const primeTotal = Math.round(primeByWc * (S * 1000));
      const preconTableBody = document.querySelector("#preconisationTableForced tbody");
      preconTableBody.innerHTML = "";
      let totalSansPv = 0, totalAuto = 0, totalRev = 0, totalPrime = 0, totalAvecPv = 0, totalEco = 0;
      let cumulativeEco = 0;
      const territory = document.getElementById("territory").value || "France Metropolitaine";
      const forcedCost = costInstallation(S, territory);
      document.getElementById("coutInstallationForced").textContent = forcedCost.toLocaleString('fr-FR');
      document.getElementById("primeValueForced").textContent = primeTotal.toLocaleString('fr-FR');
      const remiseForced = parseFloat(document.getElementById("remiseForced").value) || 0;
      let coutReel = forcedCost - primeTotal - remiseForced;
      if(coutReel < 0) coutReel = 0;
      document.getElementById("coutReelInstallationForced").textContent = coutReel.toLocaleString('fr-FR');
      
      for(let year = 1; year <= 20; year++){
        const factureSansPv = baseYearCost * Math.pow(1+annualPriceIncrease/100, (year-1));
        const econAuto = autoYear1 * Math.pow(1+annualPriceIncrease/100, (year-1));
        const gainsRev = surplusYear1;
        let primeYear = (year === 2) ? primeTotal : 0;
        const totalEcos = econAuto + gainsRev + primeYear;
        const factureAvecPv = factureSansPv - econAuto;
        totalSansPv += factureSansPv;
        totalAuto += econAuto;
        totalRev += gainsRev;
        totalPrime += primeYear;
        totalAvecPv += factureAvecPv;
        totalEco += totalEcos;
        cumulativeEco += totalEcos;
        
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${year}</td>
          <td>${factureSansPv.toFixed(2)} €</td>
          <td>${econAuto.toFixed(2)} €</td>
          <td>${factureAvecPv.toFixed(2)} €</td>
          <td>${gainsRev.toFixed(2)} €</td>
          <td>${primeYear.toFixed(2)} €</td>
          <td>${totalEcos.toFixed(2)} €</td>
          <td>${cumulativeEco.toFixed(2)} €</td>
        `;
        preconTableBody.appendChild(row);
      }
      document.getElementById("totalSansPvForced").textContent = totalSansPv.toFixed(2)+" €";
      document.getElementById("totalAutoForced").textContent = totalAuto.toFixed(2)+" €";
      document.getElementById("totalReventeForced").textContent = totalRev.toFixed(2)+" €";
      document.getElementById("totalPrimeForced").textContent = totalPrime.toFixed(2)+" €";
      document.getElementById("totalAvecPvForced").textContent = totalAvecPv.toFixed(2)+" €";
      document.getElementById("totalEconomiesForced").textContent = totalEco.toFixed(2)+" €";
      document.getElementById("puissanceRecoForced").textContent = S.toLocaleString('fr-FR');
      
      // Calcul du nombre de modules et de la surface de l'installation pour la sélection
      const panelPower = parseFloat(document.getElementById("puissancePanneau").value) || 420;
      const nombreModulesForced = Math.round(S * 1000 / panelPower);
      const surfaceInstallationForced = nombreModulesForced * 2;
      document.getElementById("nombreModulesForced").textContent = nombreModulesForced.toLocaleString('fr-FR');
      document.getElementById("surfaceInstallationForced").textContent = surfaceInstallationForced.toLocaleString('fr-FR');
      
      // Mise à jour des gains après cumul
      document.getElementById("gainSansInvForced").textContent = totalEco.toFixed(2);
      let gainAvecInvVal = totalEco - coutReel;
      document.getElementById("gainAvecInvForced").textContent = gainAvecInvVal.toFixed(2);
      
      let roiYearsForced = calculateROI(coutReel, autoYear1, surplusYear1, primeTotal, annualPriceIncrease);
      document.getElementById("roiResultForced").textContent = roiYearsForced.toFixed(1);
    }
    
    const calcPrecBtn = document.getElementById("calculatePreconisation");
    calcPrecBtn.addEventListener("click", () => {
      const territory = document.getElementById("territory").value || "France Metropolitaine";
      let maxPowerStr = (document.getElementById("puissanceMaxPV").value || "0").replace(/\s/g, "");
      const maxPower = parseFloat(maxPowerStr) || 0;
      if(maxPower <= 0){ alert("Puissance max PV non définie ou nulle."); return; }
      let bestS = 1, bestTotalGain = 0;
      let bestTerritoryObj = {tarif:0.0761, primeByWc:0};
      for(let s = 1; s <= maxPower; s++){
        const tObj = getTarifRachatAndPrime(s, territory);
        const totalGain = computeAutoAndSurplusForPower(s, tObj.tarif);
        if(totalGain > bestTotalGain){
          bestTotalGain = totalGain;
          bestS = s;
          bestTerritoryObj = tObj;
        }
      }
      calculatePreconisationWithPower(bestS, bestTotalGain, bestTerritoryObj);
      document.getElementById("tarifRachat").value = bestTerritoryObj.tarif.toFixed(4);
    });
   
    let monthlyBarChartForced = null;
    function createMonthlyBarChartForced(monthLabels, consoData, autoData, revData){
      const ctx = document.getElementById("monthlyBarChartForced").getContext("2d");
      if(monthlyBarChartForced){ monthlyBarChartForced.destroy(); }
      monthlyBarChartForced = new Chart(ctx, {
        type: "bar",
        data: {
          labels: monthLabels,
          datasets: [
            { label: "Conso kWh", data: consoData, backgroundColor: "rgba(255,99,132,0.6)" },
            { label: "Autoconso kWh", data: autoData, backgroundColor: "rgba(75,192,75,0.6)" },
            { label: "Revente kWh", data: revData, backgroundColor: "rgba(54,162,235,0.6)" }
          ]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true, title: { display: true, text: "kWh" } } }
        }
      });
    }
    function fillMonthlyPreconisationForced(S, globalTarif){
      const showKwh = document.getElementById("showKwhColumns").checked;
      const table = document.getElementById("preconisationMonthlyTableForced");
      table.innerHTML = "";
      let headerRow = `<tr>
        <th>Mois</th>
        ${showKwh ? '<th>Conso kWh</th>' : ''}
        ${showKwh ? '<th>Production kWh</th>' : ''}
        ${showKwh ? '<th>Autoconso kWh</th>' : ''}
        ${showKwh ? '<th>Revente kWh</th>' : ''}
        <th>Facture Sans Centrale</th>
        <th>Économies Autoconso</th>
        <th>Facture Avec Centrale</th>
        <th>Gains Revente</th>
        <th>Total Économies</th>
        <th>% Auto prod</th>
        <th>% Auto conso</th>
        <th>% Revente</th>
      </tr>`;
      const thead = document.createElement("thead");
      thead.innerHTML = headerRow;
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      table.appendChild(tbody);
      let footRow = `<tr>
        <th>Totaux</th>
        ${showKwh ? '<td id="monthlySumKwhConsoForced">-</td>' : ''}
        ${showKwh ? '<td id="monthlySumProductionForced">-</td>' : ''}
        ${showKwh ? '<td id="monthlySumKwhAutoForced">-</td>' : ''}
        ${showKwh ? '<td id="monthlySumKwhReventeForced">-</td>' : ''}
        <td id="monthlyTotalSansPvForced">-</td>
        <td id="monthlyTotalAutoForced">-</td>
        <td id="monthlyTotalAvecPvForced">-</td>
        <td id="monthlyTotalReventeForced">-</td>
        <td id="monthlyTotalEconomiesForced">-</td>
        <td id="monthlyTotalAutoProdPercForced">-</td>
        <td id="monthlyTotalAutoConsoPercForced">-</td>
        <td id="monthlyTotalRevPercForced">-</td>
      </tr>`;
      const tfoot = document.createElement("tfoot");
      tfoot.innerHTML = footRow;
      table.appendChild(tfoot);
      let sumSansPv = 0, sumAuto = 0, sumRev = 0, sumAvecPv = 0, sumEco = 0;
      let sumKwhConso = 0, sumKwhAuto = 0, sumKwhRev = 0, sumProductionForced = 0;
      const moisNoms = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
      const chartConso = [], chartAuto = [], chartRev = [];
      const fractionClosed = getClosedDaysFraction();
      const ratioD = parseFloat(document.getElementById("ratioDiurne").value) || 50;
      for(let i = 0; i < 12; i++){
        const eurosStr = document.getElementById(`euros_${i}`)?.value || "0";
        const factureSansPv = parseFloat(eurosStr) || 0;
        const consoKwh = parseFloat(document.getElementById(`kwh_${i}`)?.value) || 0;
        const costText = document.getElementById(`costPerKwh_${i}`)?.textContent || "0";
        const costUnit = parseFloat(costText) || 0;
        if(!monthlyProductionData[i]) continue;
        const E_m1kW = monthlyProductionData[i].E_m || 0;
        const production = S * E_m1kW;
        sumProductionForced += production;
        const forcedSurplus = fractionClosed * production;
        const leftover = production - forcedSurplus;
        const consoKwhDiurne = consoKwh * (ratioD/100);
        const autoCons = Math.min(leftover, consoKwhDiurne);
        const leftoverAfter = leftover - autoCons;
        const finalSurplus = forcedSurplus + Math.max(leftoverAfter, 0);
        const economies = autoCons * costUnit;
        const revente = finalSurplus * globalTarif;
        const totalEco = economies + revente;
        const factureAvecPv = factureSansPv - economies;
        sumSansPv += factureSansPv;
        sumAuto += economies;
        sumRev += revente;
        sumAvecPv += factureAvecPv;
        sumEco += totalEco;
        sumKwhConso += consoKwh;
        sumKwhAuto += autoCons;
        sumKwhRev += finalSurplus;
        let autoprodPerc = 0;
        if(consoKwh > 0) autoprodPerc = 100*(autoCons/consoKwh);
        const totProd = production;
        let percAutoConsoGlobal = 0, percReventeGlobal = 0;
        if(totProd > 0){
          percAutoConsoGlobal = 100*(autoCons/totProd);
          percReventeGlobal = 100*(finalSurplus/totProd);
        }
        let row = document.createElement("tr");
        let rowHTML = `<td>${moisNoms[i]}</td>`;
        if(showKwh) { rowHTML += `<td>${consoKwh.toFixed(1)}</td>`; }
        if(showKwh) { rowHTML += `<td>${production.toFixed(1)}</td>`; }
        if(showKwh) { rowHTML += `<td>${autoCons.toFixed(1)}</td>`; }
        if(showKwh) { rowHTML += `<td>${finalSurplus.toFixed(1)}</td>`; }
        rowHTML += `<td>${factureSansPv.toFixed(2)} €</td>`;
        rowHTML += `<td>${economies.toFixed(2)} €</td>`;
        rowHTML += `<td>${factureAvecPv.toFixed(2)} €</td>`;
        rowHTML += `<td>${revente.toFixed(2)} €</td>`;
        rowHTML += `<td>${totalEco.toFixed(2)} €</td>`;
        rowHTML += `<td>${autoprodPerc.toFixed(1)}%</td>`;
        rowHTML += `<td>${percAutoConsoGlobal.toFixed(1)}%</td>`;
        rowHTML += `<td>${percReventeGlobal.toFixed(1)}%</td>`;
        row.innerHTML = rowHTML;
        tbody.appendChild(row);
        chartConso.push(consoKwh);
        chartAuto.push(autoCons);
        chartRev.push(finalSurplus);
      }
      if(showKwh){
        document.getElementById("monthlySumKwhConsoForced").textContent = sumKwhConso.toFixed(1);
        document.getElementById("monthlySumProductionForced").textContent = sumProductionForced.toFixed(1);
        document.getElementById("monthlySumKwhAutoForced").textContent = sumKwhAuto.toFixed(1);
        document.getElementById("monthlySumKwhReventeForced").textContent = sumKwhRev.toFixed(1);
      }
      document.getElementById("monthlyTotalSansPvForced").textContent = sumSansPv.toFixed(2)+" €";
      document.getElementById("monthlyTotalAutoForced").textContent = sumAuto.toFixed(2)+" €";
      document.getElementById("monthlyTotalAvecPvForced").textContent = sumAvecPv.toFixed(2)+" €";
      document.getElementById("monthlyTotalReventeForced").textContent = sumRev.toFixed(2)+" €";
      document.getElementById("monthlyTotalEconomiesForced").textContent = sumEco.toFixed(2)+" €";
      let totProd = sumKwhAuto + sumKwhRev;
      let finalAutoProdPerc = 0, finalAutoConsoPerc = 0, finalRevPerc = 0;
      if(sumKwhConso > 0) finalAutoProdPerc = 100*(sumKwhAuto/sumKwhConso);
      if(totProd > 0){
        finalAutoConsoPerc = 100*(sumKwhAuto/totProd);
        finalRevPerc = 100*(sumKwhRev/totProd);
      }
      document.getElementById("monthlyTotalAutoProdPercForced").textContent = finalAutoProdPerc.toFixed(1)+"%";
      document.getElementById("monthlyTotalAutoConsoPercForced").textContent = finalAutoConsoPerc.toFixed(1)+"%";
      document.getElementById("monthlyTotalRevPercForced").textContent = finalRevPerc.toFixed(1)+"%";
      createMonthlyBarChartForced(moisNoms, chartConso, chartAuto, chartRev);
    }
    const applyForcedPreconisationBtn = document.getElementById("applyForcedPreconisationBtn");
    applyForcedPreconisationBtn.addEventListener("click", () => {
      const territory = document.getElementById("territory").value || "France Metropolitaine";
      const forcedPowerStr = document.getElementById("forcedPower").value || "1";
      let S = parseFloat(forcedPowerStr);
      if(isNaN(S) || S <= 0){
        alert("Veuillez saisir une valeur > 0 pour l'installation choisie (kWc).");
        return;
      }
      const territoryObj = getTarifRachatAndPrime(S, territory);
      fillMonthlyPreconisationForced(S, territoryObj.tarif);
      const totalGain = computeAutoAndSurplusForPower(S, territoryObj.tarif);
      fill20YearsPreconisationForced(S, totalGain, territoryObj);
    });
    flatpickr("#rdvDate", {
      locale: "fr",
      dateFormat: "d/m/Y"
    });

    /***************************************************
     * FONCTION DE GÉNÉRATION DU RAPPORT PDF (5 pages) AVEC FUSION DU TEMPLATE
     ***************************************************/
  async function generatePdfReport() {
  // Demande à l'utilisateur de choisir la version du rapport
  let choix = prompt("Tapez 1 pour Préconisation Sélection, 2 pour Préconisation Standard", "2");
  console.log("Choix saisi :", choix);
  let reportType;
  if (choix === "1") {
    reportType = "selection";
  } else if (choix === "2") {
    reportType = "standard";
  } else {
    reportType = "standard";
  }
  console.log("Report type :", reportType);

  // Affectation des id des éléments en fonction du choix
  let monthlyTableId, projectionTableId, chartId;
  if (reportType === "selection") {
    monthlyTableId = "preconisationMonthlyTableForced";
    projectionTableId = "preconisationTableForced";
    chartId = "monthlyBarChartForced";
  } else {
    monthlyTableId = "preconisationMonthlyTable";
    projectionTableId = "preconisationTable";
    chartId = "monthlyBarChart";
  }
  
  // ... puis le reste de votre code de génération du PDF ...

  
  // Reste de la fonction (pages 1 à 5, fusion avec template, etc.)
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // -------------------------------
// PAGE 1 : Titre, Informations sur l'installation et Capture de carte
// -------------------------------

// Titre et nom de la société
pdf.setFontSize(16);
pdf.text("Rapport d'étude Photovoltaïque", pageWidth / 2, 60, { align: "center" });
const companyName = document.getElementById("companyName")?.value || "";
pdf.text(companyName, pageWidth / 2, 70, { align: "center" });

// Bloc Informations sur l'installation placé juste sous le header
const infoTitleY = 80; // Position verticale du titre info
pdf.setFontSize(14);
pdf.text("Informations sur l'installation", pageWidth / 2, infoTitleY, { align: "center" });

// Création du conteneur d'informations (par exemple 10 mm sous le titre info)
const containerX = 15;
const containerY = infoTitleY + 10;
const containerWidth = pageWidth - 30;
const containerHeight = 34;
pdf.setLineWidth(0.5);
pdf.setDrawColor(150);
pdf.setFillColor(22, 160, 132);
pdf.roundedRect(containerX, containerY, containerWidth, containerHeight, 3, 3, "DF");

// Remplissage du conteneur
const boxPadding = 2;
const lineHeight = 6;
const fieldX = containerX + boxPadding;
const fieldWidthFull = containerWidth - 2 * boxPadding;
const fieldWidthHalf = (containerWidth - 3 * boxPadding) / 2;

const fieldY1 = containerY + boxPadding;
pdf.setFillColor(255, 255, 255);
pdf.roundedRect(fieldX, fieldY1, fieldWidthFull, lineHeight, 2, 2, "DF");
pdf.setFontSize(10);
pdf.text("Adresse: " + document.getElementById("address").value, fieldX + 1, fieldY1 + lineHeight - 2);

const fieldY2 = fieldY1 + lineHeight + 2;
pdf.setFillColor(255, 255, 255);
pdf.roundedRect(fieldX, fieldY2, fieldWidthHalf, lineHeight, 2, 2, "DF");
pdf.text("Latitude: " + document.getElementById("latitudeIrr").value, fieldX + 1, fieldY2 + lineHeight - 2);
const fieldX2 = fieldX + fieldWidthHalf + boxPadding;
pdf.setFillColor(255, 255, 255);
pdf.roundedRect(fieldX2, fieldY2, fieldWidthHalf, lineHeight, 2, 2, "DF");
pdf.text("Longitude: " + document.getElementById("longitudeIrr").value, fieldX2 + 1, fieldY2 + lineHeight - 2);

const fieldY3 = fieldY2 + lineHeight + 2;
pdf.setFillColor(255, 255, 255);
pdf.roundedRect(fieldX, fieldY3, fieldWidthHalf, lineHeight, 2, 2, "DF");
pdf.text("Orientation (azimut)°: " + document.getElementById("orientation").value, fieldX + 1, fieldY3 + lineHeight - 2);
pdf.setFillColor(255, 255, 255);
pdf.roundedRect(fieldX2, fieldY3, fieldWidthHalf, lineHeight, 2, 2, "DF");
let prodStr = document.getElementById("productible").value;
prodStr = prodStr.replace(/[\u00A0\u202F]/g, " ");
pdf.text("Productible kWh/kWc: " + prodStr, fieldX2 + 1, fieldY3 + lineHeight - 2);

const fieldY4 = fieldY3 + lineHeight + 2;
pdf.setFillColor(255, 255, 255);
pdf.roundedRect(fieldX, fieldY4, fieldWidthHalf, lineHeight, 2, 2, "DF");
const puissanceRecoVal = (reportType === "selection")
  ? document.getElementById("puissanceRecoForced").textContent
  : document.getElementById("puissanceReco").textContent;
pdf.text("Puissance préconisée Kwc: " + puissanceRecoVal, fieldX + 1, fieldY4 + lineHeight - 2);

pdf.setFillColor(255, 255, 255);
pdf.roundedRect(fieldX2, fieldY4, fieldWidthHalf, lineHeight, 2, 2, "DF");
const nombreModulesVal = (reportType === "selection")
  ? document.getElementById("nombreModulesForced").textContent
  : document.getElementById("nombreModules").textContent;
pdf.text("Nombre de modules: " + nombreModulesVal, fieldX2 + 1, fieldY4 + lineHeight - 2);

// Positionnement de l'image : descendre l'image pour qu'elle apparaisse sous le bloc d'informations
let yPos, imgWidth, imgHeight;
if (mapCaptureDataURL) {
  imgWidth = pageWidth - 30;
  imgHeight = imgWidth * 0.6;
  yPos = containerY + containerHeight + 15; // 15 mm sous le conteneur d'informations
  pdf.addImage(mapCaptureDataURL, mapCaptureFormat || "PNG", 15, yPos, imgWidth, imgHeight);
} else {
  yPos = containerY + containerHeight + 15;
  imgHeight = 0;
  pdf.text("Aucune capture de carte disponible", pageWidth / 2, yPos, { align: "center" });
}

{
  pdf.addPage();
  // Titre principal de la page
  pdf.setFontSize(12);
  pdf.text("Détails par mois (année 1)", pageWidth / 2, 60, { align: "center" });
  
  // Récupération de l'élément du tableau mensuel
  const monthlyTableEl = document.getElementById(monthlyTableId);
  
  // Extraction des totaux depuis le tableau, si disponible
  let totalConso = "-";
  let totalProd  = "-";
  let totalAuto  = "-";
  let totalRev   = "-";
  let totalEcon  = "-";
  if (monthlyTableEl) {
    const tfoot = monthlyTableEl.querySelector("tfoot");
    if (tfoot) {
      const lastRow = tfoot.querySelector("tr");
      if (lastRow) {
        const cellConso = lastRow.querySelector("td:nth-child(2)");
        if (cellConso) totalConso = cellConso.textContent.trim();
        const cellProd = lastRow.querySelector("td:nth-child(3)");
        if (cellProd) totalProd = cellProd.textContent.trim();
        const cellAuto = lastRow.querySelector("td:nth-child(4)");
        if (cellAuto) totalAuto = cellAuto.textContent.trim();
        const cellRev = lastRow.querySelector("td:nth-child(5)");
        if (cellRev) totalRev = cellRev.textContent.trim();
        const cellEcon = lastRow.querySelector("td:nth-child(11)");
        if (cellEcon) totalEcon = cellEcon.textContent.trim();
      }
    }
  }
  
  // Bloc "Informations sur la production" placé juste sous le titre de la page
  const infoTitleY = 75; // Position du titre du bloc info
  pdf.setFontSize(14);
  pdf.text("Informations sur la production", pageWidth / 2, infoTitleY, { align: "center" });
  
  const containerX = 15;
  const containerY = infoTitleY + 5; // 5 mm sous le titre "Informations sur la production"
  const containerWidth = pageWidth - 30;
  const containerHeight = 3 * 8 + 2; // hauteur calculée sur 3 lignes
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(150);
  pdf.setFillColor(22, 160, 132);
  pdf.roundedRect(containerX, containerY, containerWidth, containerHeight, 3, 3, "DF");
  
  const boxPadding = 2;
  const lineHeight = 6;
  const fieldX = containerX + boxPadding;
  const fieldWidthFull = containerWidth - 2 * boxPadding;
  const fieldWidthHalf = (containerWidth - 3 * boxPadding) / 2;
  
  const fieldY1 = containerY + boxPadding;
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(fieldX, fieldY1, fieldWidthHalf, lineHeight, 2, 2, "DF");
  pdf.setFontSize(10);
  pdf.text("Votre consommation annuelle Kwh: " + totalConso, fieldX + 1, fieldY1 + lineHeight - 2);
  
  const fieldX2 = fieldX + fieldWidthHalf + boxPadding;
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(fieldX2, fieldY1, fieldWidthHalf, lineHeight, 2, 2, "DF");
  pdf.text("Production annuelle Kwh: " + totalProd, fieldX2 + 1, fieldY1 + lineHeight - 2);
  
  const fieldY2 = fieldY1 + lineHeight + 2;
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(fieldX, fieldY2, fieldWidthHalf, lineHeight, 2, 2, "DF");
  pdf.text("Electricité produite consommée Kwh: " + totalAuto, fieldX + 1, fieldY2 + lineHeight - 2);
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(fieldX2, fieldY2, fieldWidthHalf, lineHeight, 2, 2, "DF");
  pdf.text("Electricité produite revendue Kwh: " + totalRev, fieldX2 + 1, fieldY2 + lineHeight - 2);
  
  const fieldY3 = fieldY2 + lineHeight + 2;
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(fieldX, fieldY3, fieldWidthFull, lineHeight, 2, 2, "DF");
  pdf.text("Economies réalisés avec la centrale %: " + totalEcon, fieldX + 1, fieldY3 + lineHeight - 2);
  
  // Tableau "Détails par mois (année 1)" déplacé sous le bloc "Informations sur la production"
  const tableStartY = containerY + containerHeight + 15; // 15 mm sous le bloc info
  if (monthlyTableEl) {
    pdf.autoTable({
      html: monthlyTableEl,
      startY: tableStartY,
      margin: { left: 5 },
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak", halign: "center", valign: "middle" },
      headStyles: { fillColor: [0, 92, 160], textColor: 255, fontSize: 7, halign: "center", valign: "middle" },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 15 },
        2: { cellWidth: 15 },
        3: { cellWidth: 15 },
        4: { cellWidth: 15 },
        5: { cellWidth: 18 },
        6: { cellWidth: 18 },
        7: { cellWidth: 18 },
        8: { cellWidth: 15 },
        9: { cellWidth: 15 },
        10: { cellWidth: 12 },
        11: { cellWidth: 12 },
        12: { cellWidth: 12 }
      }
    });
  } else {
    pdf.text("Tableau Détails par mois non disponible", 10, tableStartY);
  }
}

  // -------------------------------
// -------------------------------
// PAGE 3 : Graphique en barre + Graphique en anneau (donut chart) avec légende à droite et pourcentages
// -------------------------------
pdf.addPage();
pdf.setFontSize(14);
pdf.text("Graphique des productions", pageWidth / 2, 85, { align: "center" });

// --- Partie existante : Affichage du graphique en barre ---
let chartImage = "";
if (reportType === "selection") {
  if (monthlyBarChartForced && typeof monthlyBarChartForced.toBase64Image === "function") {
    chartImage = monthlyBarChartForced.toBase64Image();
  }
} else {
  if (monthlyBarChart && typeof monthlyBarChart.toBase64Image === "function") {
    chartImage = monthlyBarChart.toBase64Image();
  }
}
const chartWidth = pageWidth - 30;
let chartHeight, yPosChart;
if (chartImage) {
  const chartHeightPx = 300; 
  chartHeight = chartHeightPx * 0.264583; // conversion approximative px -> mm
  yPosChart = (pageHeight - chartHeight) / 2;
  pdf.addImage(chartImage, "PNG", 15, yPosChart, chartWidth, chartHeight);
} else {
  pdf.text("Graphique non disponible", 10, 30);
  yPosChart = 80;
  chartHeight = 50;
}

// --- Nouvelle partie : Création du donut avec légende à droite et pourcentages ---
// On crée un canvas avec un repère virtuel élargi pour laisser suffisamment d'espace à la légende
const scaleFactor = 2;         
const virtualWidth = 600;      // largeur virtuelle (inchangée)
const virtualHeight = 200;     // hauteur virtuelle augmentée pour éviter que le haut et le bas du donut soient coupés
const donutCanvas = document.createElement("canvas");
donutCanvas.width = virtualWidth * scaleFactor;   // 1200 px
donutCanvas.height = virtualHeight * scaleFactor; // 400 px
const ctx = donutCanvas.getContext("2d");
ctx.scale(scaleFactor, scaleFactor); // travaille dans un repère virtuel de 600x200

// Extraction des données depuis le tableau "Détails par mois (année 1)"
const monthlyTableEl = document.getElementById(monthlyTableId);
let totalConso = 0, totalAuto = 0, totalRev = 0;
if (monthlyTableEl) {
  const tfoot = monthlyTableEl.querySelector("tfoot");
  if (tfoot) {
    const lastRow = tfoot.querySelector("tr");
    if (lastRow) {
      const cellConso = lastRow.querySelector("td:nth-child(2)");
      if (cellConso) totalConso = parseFloat(cellConso.textContent.trim());
      const cellAuto = lastRow.querySelector("td:nth-child(4)");
      if (cellAuto) totalAuto = parseFloat(cellAuto.textContent.trim());
      const cellRev = lastRow.querySelector("td:nth-child(5)");
      if (cellRev) totalRev = parseFloat(cellRev.textContent.trim());
    }
  }
}
const consoAvecCentrale = totalConso - totalAuto;
const donutTotal = consoAvecCentrale + totalAuto + totalRev;

// Dessiner le donut dans la partie gauche du canvas
// On réserve la zone gauche pour le donut ; ici, on utilise la même zone (150x150) dans la partie gauche
const donutCenterX = 90;                    // centre ajusté (précédemment 75, augmenté pour s'adapter à l'espace élargi)
const donutCenterY = virtualHeight / 2;       // maintenant 200/2 = 100
const outerRadius = 60 * 1.3;                 // outerRadius passe de 60 à 78 (agrandi de 30%)
const innerRadius = 30 * 1.3;                 // innerRadius passe de 30 à 39 (agrandi de 30%)

let startAngle = 0;
function drawSegment(value, color) {
  const segmentAngle = (value / donutTotal) * 2 * Math.PI;
  const endAngle = startAngle + segmentAngle;
  ctx.beginPath();
  ctx.moveTo(donutCenterX, donutCenterY);
  ctx.arc(donutCenterX, donutCenterY, outerRadius, startAngle, endAngle);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  
  // Calcul et affichage du pourcentage au centre de la portion
  const midAngle = startAngle + segmentAngle / 2;
  const textRadius = (outerRadius + innerRadius) / 2;
  const textX = donutCenterX + textRadius * Math.cos(midAngle);
  const textY = donutCenterY + textRadius * Math.sin(midAngle);
  const percentText = ((value / donutTotal) * 100).toFixed(1) + "%";
  ctx.fillStyle = "black";
  ctx.font = "13px Arial";  // police agrandie de 30%
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(percentText, textX, textY);
  
  startAngle = endAngle;
}
drawSegment(consoAvecCentrale, "lightcoral");
drawSegment(totalAuto, "lightgreen");
drawSegment(totalRev, "lightskyblue");

// Création du trou central pour obtenir l'effet "donut"
ctx.beginPath();
ctx.arc(donutCenterX, donutCenterY, innerRadius, 0, 2 * Math.PI);
ctx.fillStyle = "white";
ctx.fill();

// Ajout de la légende à droite du donut
ctx.textAlign = "left";
ctx.textBaseline = "middle";
ctx.font = "13px Arial";  // police agrandie
const legendBoxSize = 12 * 1.3;  // environ 15.6, arrondissons à 16
const legendX = 220;             // position horizontale ajustée pour laisser plus d'espace
let legendY = 30;                // première ligne de légende
ctx.fillStyle = "lightcoral";
ctx.fillRect(legendX, legendY - legendBoxSize / 2, legendBoxSize, legendBoxSize);
ctx.fillStyle = "black";
ctx.fillText("Consommation electrique avec centrale: " + Math.round(consoAvecCentrale) + " kWh", legendX + legendBoxSize + 5, legendY);

legendY += 40;  // espacement vertical augmenté
ctx.fillStyle = "lightgreen";
ctx.fillRect(legendX, legendY - legendBoxSize / 2, legendBoxSize, legendBoxSize);
ctx.fillStyle = "black";
ctx.fillText("Electricité photovoltaique utilisée: " + totalAuto + " kWh", legendX + legendBoxSize + 5, legendY);

legendY += 40;  // espacement vertical augmenté
ctx.fillStyle = "lightskyblue";
ctx.fillRect(legendX, legendY - legendBoxSize / 2, legendBoxSize, legendBoxSize);
ctx.fillStyle = "black";
ctx.fillText("Electricité photovoltaique revendue: " + totalRev + " kWh", legendX + legendBoxSize + 5, legendY);

// Conversion du canvas en image PNG
const donutImage = donutCanvas.toDataURL("image/png");

// Positionnement du donut avec légende dans le PDF
// Le canvas a un ratio de 600:200, on calcule la hauteur d'insertion en fonction de la largeur d'insertion
const donutChartWidth = (pageWidth - 30) * 0.6; 
const donutChartHeight = donutChartWidth * (virtualHeight / virtualWidth); // 200/600 = 0.333...
const yPosDonut = yPosChart + chartHeight + 10; // 10 mm sous le graphique en barre
pdf.addImage(donutImage, "PNG", 15, yPosDonut, donutChartWidth, donutChartHeight);




  {
  // -------------------------------
  // PAGE 4 : Tableau "Projection sur 20 ans"
  // -------------------------------
  pdf.addPage();
  pdf.setFontSize(14);
  pdf.text("Projection sur 20 ans", pageWidth / 2, 60, { align: "center" });
  const projectionTableEl = document.getElementById(projectionTableId);
  if (projectionTableEl) {
    const tempPdf2 = new jsPDF("p", "mm", "a4");
    tempPdf2.autoTable({
      html: projectionTableEl,
      startY: 0,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [22, 160, 133], textColor: 255, fontSize: 9 }
    });
    const projTableHeight = tempPdf2.lastAutoTable ? tempPdf2.lastAutoTable.finalY : 0;
    const newStartY2 = ((pageHeight - projTableHeight) / 2)+40;
    pdf.autoTable({
      html: projectionTableEl,
      startY: newStartY2,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [22, 160, 133], textColor: 255, fontSize: 9 }
    });
  } else {
    pdf.text("Tableau Projection sur 20 ans non disponible", 10, 30);
  }
  
  // -------------------------------
  // Ajout du bloc "Synthèse des résultats"
  // -------------------------------
  // Positionner le bloc 20 mm sous la fin du tableau Projection
  const projEndY = pdf.lastAutoTable ? pdf.lastAutoTable.finalY : 100;
  const synthTitleY = 70; // titre synthese du resultat 60 mm du debut
  pdf.setFontSize(14);
  pdf.text("Synthèse des résultats", pageWidth / 2, synthTitleY, { align: "center" });
  
  // Définir le conteneur pour 3 lignes
  const synthContainerX = 15;
  const synthContainerY = synthTitleY + 5; // 5 mm sous le titre
  const synthContainerWidth = pageWidth - 30;
  const synthContainerHeight = 26;  // Par exemple, 26 mm pour 3 lignes
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(150);
  pdf.setFillColor(22, 160, 132);
  pdf.roundedRect(synthContainerX, synthContainerY, synthContainerWidth, synthContainerHeight, 3, 3, "DF");
  
  // Paramètres internes du conteneur
  const synthBoxPadding = 2;
  const synthLineHeight = 6;
  const synthFieldX = synthContainerX + synthBoxPadding;
  const synthFieldWidthHalf = (synthContainerWidth - 3 * synthBoxPadding) / 2;
  
  // ----- Première ligne -----
  const synthRow1Y = synthContainerY + synthBoxPadding;
  pdf.setFillColor(255,255,255);
  pdf.roundedRect(synthFieldX, synthRow1Y, synthFieldWidthHalf, synthLineHeight, 2, 2, "DF");
  pdf.setFontSize(10);
  const annualIncrease = document.getElementById("annualPriceIncrease").value;
  pdf.text("Augmentation annuelle du prix de l'électricité (%): " + annualIncrease, synthFieldX + 1, synthRow1Y + synthLineHeight - 2);
  
  const synthFieldX2 = synthFieldX + synthFieldWidthHalf + synthBoxPadding;
  pdf.setFillColor(255,255,255);
  pdf.roundedRect(synthFieldX2, synthRow1Y, synthFieldWidthHalf, synthLineHeight, 2, 2, "DF");
  const tarifRachat = document.getElementById("tarifRachat").value;
  pdf.text("Tarif de rachat du surplus (€/kWh): " + tarifRachat, synthFieldX2 + 1, synthRow1Y + synthLineHeight - 2);
  
  // ----- Deuxième ligne -----
  const synthRow2Y = synthRow1Y + synthLineHeight + 2;
  pdf.setFillColor(255,255,255);
  pdf.roundedRect(synthFieldX, synthRow2Y, synthFieldWidthHalf, synthLineHeight, 2, 2, "DF");
  const totalEconomies = (reportType === "selection")
  ? (document.getElementById("totalEconomiesForced") ? document.getElementById("totalEconomiesForced").textContent.trim() : "-")
  : (document.getElementById("totalEconomies") ? document.getElementById("totalEconomies").textContent.trim() : "-");
  pdf.text("Total des économies réalisés sur 20 ans: " + totalEconomies, synthFieldX + 1, synthRow2Y + synthLineHeight - 2);
  
  pdf.setFillColor(255,255,255);
  pdf.roundedRect(synthFieldX2, synthRow2Y, synthFieldWidthHalf, synthLineHeight, 2, 2, "DF");
  let primeValue = (reportType === "selection")
    ? (document.getElementById("primeValueForced") ? document.getElementById("primeValueForced").textContent.trim() : "-")
    : (document.getElementById("primeValue") ? document.getElementById("primeValue").textContent.trim() : "-");
  primeValue = String(primeValue).replace(/[\u00A0\u202F]/g, " ");
  pdf.text("Prime à l'autoconsommation €: " + primeValue, synthFieldX2 + 1, synthRow2Y + synthLineHeight - 2);
  
  // ----- Troisième ligne -----
  const synthRow3Y = synthRow2Y + synthLineHeight + 2;
  pdf.setFillColor(255,255,255);
  pdf.roundedRect(synthFieldX, synthRow3Y, synthFieldWidthHalf, synthLineHeight, 2, 2, "DF");
  let coutNet = (reportType === "selection")
    ? (document.getElementById("coutReelInstallationForced") ? document.getElementById("coutReelInstallationForced").textContent.trim() : "-")
    : (document.getElementById("coutReelInstallation") ? document.getElementById("coutReelInstallation").textContent.trim() : "-");
    coutNet = String(coutNet).replace(/[\u00A0\u202F]/g, " ");
  pdf.text("Cout net de la centrale €: " + coutNet, synthFieldX + 1, synthRow3Y + synthLineHeight - 2);
  
  pdf.setFillColor(255,255,255);
  pdf.roundedRect(synthFieldX2, synthRow3Y, synthFieldWidthHalf, synthLineHeight, 2, 2, "DF");
  const roiVal = (reportType === "selection")
    ? (document.getElementById("roiResultForced") ? document.getElementById("roiResultForced").textContent.trim() : "-")
    : (document.getElementById("roiResult") ? document.getElementById("roiResult").textContent.trim() : "-");
  pdf.text("Retour sur investissement années: " + roiVal, synthFieldX2 + 1, synthRow3Y + synthLineHeight - 2);
}

 
  
  // -------------------------------
  // PAGE 5 : Tableau "Plan de trésorerie (Annuel)"
  // -------------------------------
  pdf.addPage();
  pdf.setFontSize(14);
  pdf.text("Plan de trésorerie (Annuel)", pageWidth / 2, 60, { align: "center" });
  const tresorerieTableEl = document.getElementById("planTresorerieTable");
  if (tresorerieTableEl) {
    const tempPdf3 = new jsPDF("p", "mm", "a4");
    tempPdf3.autoTable({
      html: tresorerieTableEl,
      startY: 0,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [200, 200, 200] }
    });
    const tresoTableHeight = tempPdf3.lastAutoTable.finalY;
    const newStartY3 = (pageHeight - tresoTableHeight) / 2;
    pdf.autoTable({
      html: tresorerieTableEl,
      startY: newStartY3,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [200, 200, 200] }
    });
  } else {
    pdf.text("Tableau Plan de trésorerie non disponible", 10, 30);
  }
  
  // -------------------------------
  // Fusion avec le template selon territoire
  // -------------------------------
  const generatedPdfBytes = pdf.output("arraybuffer");
  let territory = document.getElementById("territory").value || "France Metropolitaine";
  let templateFile = "";
  if (territory === "Corse") {
    templateFile = "template corse.pdf";
  } else if (territory === "Reunion") {
    templateFile = "template reunion.pdf";
  } else {
    templateFile = "template metro.pdf";
  }
  
  fetch(templateFile)
    .then(response => response.arrayBuffer())
    .then(async templateBytes => {
      const { PDFDocument } = PDFLib;
      const templatePdf = await PDFDocument.load(templateBytes);
      const generatedPdf = await PDFDocument.load(generatedPdfBytes);
      const mergedPdf = await PDFDocument.create();
      
      // On suppose que le template contient une seule page servant de fond pour chaque page
      const [templatePage] = await mergedPdf.copyPages(templatePdf, [0]);
      const generatedPages = generatedPdf.getPages();
      for (let i = 0; i < generatedPages.length; i++) {
        const { width, height } = templatePage.getSize();
        const newPage = mergedPdf.addPage([width, height]);
        
        // Dessiner le template en fond
        const embeddedTemplate = await mergedPdf.embedPage(templatePage);
        newPage.drawPage(embeddedTemplate, { x: 0, y: 0, width, height });
        
        // Dessiner la page générée par-dessus
        const embeddedGenerated = await mergedPdf.embedPage(generatedPages[i]);
        newPage.drawPage(embeddedGenerated, { x: 0, y: 0, width, height });
      }
      
      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      let companyName = document.getElementById("companyName")?.value || "";
      let pdfFileName = "Rapport_Photovoltaïque.pdf";
      if (companyName) { pdfFileName = `Rapport_${companyName}.pdf`; }
      link.download = pdfFileName;
      link.click();
    })
    .catch(err => {
      console.error("Erreur lors du chargement du template:", err);
      pdf.save();
    });
}


