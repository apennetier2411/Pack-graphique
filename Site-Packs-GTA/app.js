// Initialisation de Supabase
const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

let packsList = [];
let creatorsList = [];
let isAuthenticated = false;

let editingPackId = null;
let editingCreatorId = null;

// Charger les données au démarrage
async function loadData() {
    try {
        const { data: creators } = await supabase.from('creators').select('*');
        const { data: packs } = await supabase.from('packs').select('*');
        
        if (creators) creatorsList = creators;
        if (packs) packsList = packs;
        
        applyFilters();
    } catch (err) {
        console.error("Erreur de connexion Supabase:", err);
        document.getElementById('packs-grid').innerHTML = '<p style="color: red;">Erreur de connexion à la base de données.</p>';
    }
}

// Lancer le chargement
loadData();

function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
        view.classList.remove('active');
    });
    
    if (viewId === 'admin' && !isAuthenticated) {
        document.getElementById('view-login').style.display = 'block';
        return;
    }

    document.getElementById(`view-${viewId}`).style.display = 'block';
    
    if (viewId === 'home') applyFilters();
    if (viewId === 'admin') {
        updateCreatorSelect();
        renderAdminLists();
    }
}

// Connexion avec les identifiants du config.js
function loginAdmin() {
    const user = document.getElementById('admin-username').value;
    const pass = document.getElementById('admin-password').value;
    
    if (user === CONFIG.ADMIN_USER && pass === CONFIG.ADMIN_PASS) {
        isAuthenticated = true;
        document.getElementById('admin-password').value = "";
        document.getElementById('login-error').style.display = 'none';
        showView('admin');
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function logoutAdmin() {
    isAuthenticated = false;
    showView('home');
}

function switchAdminTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (tabId === 'tab-pack') {
        document.getElementById('tab-pack-content').style.display = 'block';
        document.getElementById('tab-creator-content').style.display = 'none';
    } else {
        document.getElementById('tab-pack-content').style.display = 'none';
        document.getElementById('tab-creator-content').style.display = 'block';
    }
}

// Afficher/Cacher le champ Prix
function togglePriceField() {
    const type = document.getElementById('pack-type').value;
    const priceContainer = document.getElementById('price-container');
    if (type === 'Payant') {
        priceContainer.style.display = 'block';
        document.getElementById('pack-price-val').required = true;
    } else {
        priceContainer.style.display = 'none';
        document.getElementById('pack-price-val').required = false;
    }
}

function updateCreatorSelect() {
    const select = document.getElementById('pack-creator');
    select.innerHTML = '<option value="">-- Choisir un créateur --</option>';
    creatorsList.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
}

function applyFilters() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const category = document.getElementById('filter-category').value;
    const typeFilter = document.getElementById('filter-price').value;

    let filtered = packsList.filter(pack => {
        const matchSearch = pack.name.toLowerCase().includes(search);
        const matchCat = category === "Tous" || pack.category === category;
        const matchPrice = typeFilter === "Tous" || pack.type === typeFilter;
        return matchSearch && matchCat && matchPrice;
    });

    renderGrid(filtered);
}

function renderGrid(packsToRender) {
    const grid = document.getElementById('packs-grid');
    grid.innerHTML = ''; 

    if (packsToRender.length === 0) {
        grid.innerHTML = '<p style="color: #666; width:100%; text-align:center;">Aucun pack trouvé.</p>';
        return;
    }

    [...packsToRender].reverse().forEach(pack => {
        const creator = creatorsList.find(c => c.id === pack.creatorId);
        const creatorName = creator ? creator.name : "Inconnu";
        
        // Affichage du prix complet
        const priceClass = pack.type === "Gratuit" ? "price-gratuit" : "price-payant";
        const priceText = pack.type === "Gratuit" ? "Gratuit" : `Payant - ${pack.price}`;

        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => openPackPage(pack.id);
        
        card.innerHTML = `
            <img src="${pack.image}" class="card-img" onerror="this.src='https://via.placeholder.com/600x300/111/fff?text=Image'">
            <div class="card-content">
                <div class="price-badge ${priceClass}">${priceText}</div>
                <div class="card-category">${pack.category}</div>
                <h3 class="card-title">${pack.name}</h3>
                <p class="card-creator">Par ${creatorName}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    let videoId = "";
    if (url.includes("v=")) videoId = url.split("v=")[1].substring(0, 11);
    else if (url.includes("youtu.be/")) videoId = url.split("youtu.be/")[1].substring(0, 11);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

function openPackPage(packId) {
    const pack = packsList.find(p => p.id === packId);
    if (!pack) return;

    const creator = creatorsList.find(c => c.id === pack.creatorId);
    const creatorName = creator ? creator.name : "Inconnu";
    const embedUrl = getYouTubeEmbedUrl(pack.video);
    
    const priceClass = pack.type === "Gratuit" ? "price-gratuit" : "price-payant";
    const priceText = pack.type === "Gratuit" ? "Gratuit" : `Payant - ${pack.price}`;

    const container = document.getElementById('pack-content');
    container.innerHTML = `
        <div class="pack-header">
            <img src="${pack.image}" onerror="this.src='https://via.placeholder.com/1200x400/111/fff?text=Image'">
            <div class="price-badge ${priceClass}" style="font-size:0.9rem;">${priceText}</div>
            <div class="card-category" style="margin-left: 10px;">${pack.category}</div>
            <h1 class="pack-title-large">${pack.name}</h1>
            <div class="pack-meta">
                <span class="link" onclick="openCreatorPage('${pack.creatorId}')">👤 Par ${creatorName}</span>
            </div>
        </div>
        
        ${pack.description ? `<div class="pack-description">${pack.description}</div>` : ''}
        
        ${embedUrl ? `<div class="video-container"><iframe src="${embedUrl}" allowfullscreen></iframe></div>` : ''}
        
        <a href="${pack.link}" target="_blank" class="download-btn">Obtenir le pack</a>
    `;
    showView('pack');
}

function openCreatorPage(creatorId) {
    const creator = creatorsList.find(c => c.id === creatorId);
    if (!creator) return;

    let socialHTML = '';
    if(creator.discord) socialHTML += `<a href="${creator.discord}" target="_blank" class="social-btn btn-discord">▶ Discord</a>`;
    if(creator.youtube) socialHTML += `<a href="${creator.youtube}" target="_blank" class="social-btn btn-youtube">▶ YouTube</a>`;
    if(creator.patreon) socialHTML += `<a href="${creator.patreon}" target="_blank" class="social-btn btn-patreon">▶ Patreon</a>`;

    document.getElementById('creator-header').innerHTML = `
        <img src="${creator.banner}" class="creator-banner" onerror="this.src='https://via.placeholder.com/1200x300/222/fff?text=Bannière'">
        <div class="creator-info">
            <img src="${creator.avatar}" style="border-color: ${creator.color}" onerror="this.src='https://via.placeholder.com/120/333/fff?text=C'">
            <div class="creator-text">
                <h2>${creator.name}</h2>
                ${creator.bio ? `<p>${creator.bio}</p>` : ''}
                <div class="social-links">${socialHTML}</div>
            </div>
        </div>
    `;

    const creatorPacks = packsList.filter(p => p.creatorId === creatorId);
    const grid = document.getElementById('creator-packs-grid');
    grid.innerHTML = '';

    if (creatorPacks.length === 0) {
        grid.innerHTML = '<p style="color: #666;">Ce créateur n\'a pas encore de packs.</p>';
    } else {
        creatorPacks.reverse().forEach(pack => {
            const priceClass = pack.type === "Gratuit" ? "price-gratuit" : "price-payant";
            const priceText = pack.type === "Gratuit" ? "Gratuit" : `Payant - ${pack.price}`;

            const card = document.createElement('div');
            card.className = 'card';
            card.onclick = () => openPackPage(pack.id);
            card.innerHTML = `
                <img src="${pack.image}" class="card-img" onerror="this.src='https://via.placeholder.com/600x300/111/fff?text=Image'">
                <div class="card-content">
                    <div class="price-badge ${priceClass}">${priceText}</div>
                    <div class="card-category" style="color: ${creator.color}">${pack.category}</div>
                    <h3 class="card-title">${pack.name}</h3>
                </div>
            `;
            grid.appendChild(card);
        });
    }
    showView('creator');
}

// --- CRUD BASE DE DONNÉES ---

async function saveCreator(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-creator');
    btn.innerText = "Sauvegarde en cours...";

    const creatorData = {
        id: editingCreatorId || "c_" + Date.now().toString(),
        name: document.getElementById('creator-name').value,
        color: document.getElementById('creator-color').value,
        avatar: document.getElementById('creator-avatar').value,
        banner: document.getElementById('creator-banner').value,
        bio: document.getElementById('creator-bio').value,
        discord: document.getElementById('creator-discord').value,
        youtube: document.getElementById('creator-youtube').value,
        patreon: document.getElementById('creator-patreon').value
    };

    const { error } = await supabase.from('creators').upsert([creatorData]);
    
    if (error) {
        alert("Erreur: " + error.message);
    } else {
        await loadData(); // Recharger depuis la DB
        resetCreatorForm();
    }
    btn.innerText = "Enregistrer";
}
document.getElementById('form-creator').addEventListener('submit', saveCreator);

async function savePack(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-pack');
    btn.innerText = "Sauvegarde en cours...";

    const packData = {
        id: editingPackId || "p_" + Date.now().toString(),
        name: document.getElementById('pack-name').value,
        creatorId: document.getElementById('pack-creator').value,
        description: document.getElementById('pack-desc').value,
        category: document.getElementById('pack-category').value,
        type: document.getElementById('pack-type').value,
        price: document.getElementById('pack-type').value === 'Payant' ? document.getElementById('pack-price-val').value : null,
        image: document.getElementById('pack-image').value,
        video: document.getElementById('pack-video').value,
        link: document.getElementById('pack-link').value
    };

    const { error } = await supabase.from('packs').upsert([packData]);
    
    if (error) {
        alert("Erreur: " + error.message);
    } else {
        await loadData();
        resetPackForm();
    }
    btn.innerText = "Enregistrer";
}
document.getElementById('form-pack').addEventListener('submit', savePack);

function renderAdminLists() {
    const packsContainer = document.getElementById('admin-packs-list');
    packsContainer.innerHTML = '';
    packsList.forEach(p => {
        packsContainer.innerHTML += `
            <div class="admin-item">
                <span class="admin-item-title">${p.name} <span style="color:#666; font-size:0.8rem;">(${p.type})</span></span>
                <div class="admin-item-actions">
                    <button class="btn-edit" onclick="editPack('${p.id}')">Éditer</button>
                    <button class="btn-delete" onclick="deletePack('${p.id}')">X</button>
                </div>
            </div>
        `;
    });

    const creatorsContainer = document.getElementById('admin-creators-list');
    creatorsContainer.innerHTML = '';
    creatorsList.forEach(c => {
        creatorsContainer.innerHTML += `
            <div class="admin-item">
                <span class="admin-item-title" style="color: ${c.color}">${c.name}</span>
                <div class="admin-item-actions">
                    <button class="btn-edit" onclick="editCreator('${c.id}')">Éditer</button>
                    <button class="btn-delete" onclick="deleteCreator('${c.id}')">X</button>
                </div>
            </div>
        `;
    });
}

function editCreator(id) {
    const c = creatorsList.find(x => x.id === id);
    if(!c) return;
    editingCreatorId = id;
    
    document.getElementById('creator-form-title').innerText = "Modifier : " + c.name;
    document.getElementById('creator-name').value = c.name;
    document.getElementById('creator-color').value = c.color || "#6366f1";
    document.getElementById('creator-avatar').value = c.avatar;
    document.getElementById('creator-banner').value = c.banner || "";
    document.getElementById('creator-bio').value = c.bio || "";
    document.getElementById('creator-discord').value = c.discord || "";
    document.getElementById('creator-youtube').value = c.youtube || "";
    document.getElementById('creator-patreon').value = c.patreon || "";

    document.getElementById('btn-submit-creator').innerText = "Mettre à jour";
    document.getElementById('btn-cancel-creator').style.display = "block";
    window.scrollTo(0, 0);
}

function resetCreatorForm() {
    editingCreatorId = null;
    document.getElementById('form-creator').reset();
    document.getElementById('creator-form-title').innerText = "Ajouter un Créateur";
    document.getElementById('btn-submit-creator').innerText = "Enregistrer";
    document.getElementById('btn-cancel-creator').style.display = "none";
}

async function deleteCreator(id) {
    if(confirm("Supprimer ce créateur ?")) {
        await supabase.from('creators').delete().eq('id', id);
        await loadData();
        renderAdminLists();
    }
}

function editPack(id) {
    const p = packsList.find(x => x.id === id);
    if(!p) return;
    editingPackId = id;

    document.getElementById('pack-form-title').innerText = "Modifier : " + p.name;
    document.getElementById('pack-name').value = p.name;
    document.getElementById('pack-creator').value = p.creatorId;
    document.getElementById('pack-desc').value = p.description || "";
    document.getElementById('pack-category').value = p.category;
    document.getElementById('pack-type').value = p.type || "Gratuit";
    document.getElementById('pack-price-val').value = p.price || "";
    togglePriceField(); // Met à jour l'affichage de l'input prix
    document.getElementById('pack-image').value = p.image;
    document.getElementById('pack-video').value = p.video || "";
    document.getElementById('pack-link').value = p.link;

    document.getElementById('btn-submit-pack').innerText = "Mettre à jour";
    document.getElementById('btn-cancel-pack').style.display = "block";
    window.scrollTo(0, 0);
}

function resetPackForm() {
    editingPackId = null;
    document.getElementById('form-pack').reset();
    togglePriceField();
    document.getElementById('pack-form-title').innerText = "Ajouter un Pack";
    document.getElementById('btn-submit-pack').innerText = "Enregistrer";
    document.getElementById('btn-cancel-pack').style.display = "none";
}

async function deletePack(id) {
    if(confirm("Vraiment supprimer ce pack ?")) {
        await supabase.from('packs').delete().eq('id', id);
        await loadData();
        renderAdminLists();
    }
}