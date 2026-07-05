const supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

let packsList = [];
let creatorsList = [];
let categoriesList = [];

let currentUserRole = null; 
let currentCreatorId = null;

let editingPackId = null;
let editingCreatorId = null;

async function loadData() {
    try {
        const { data: creators } = await supabaseClient.from('creators').select('*');
        const { data: packs } = await supabaseClient.from('packs').select('*');
        const { data: cats } = await supabaseClient.from('categories').select('*');
        
        if (creators) creatorsList = creators;
        if (packs) packsList = packs;
        if (cats) categoriesList = cats;
        
        renderCategoryFilters();
        applyFilters();
    } catch (err) {
        console.error("Erreur Supabase:", err);
    }
}
loadData();

function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
        view.classList.remove('active');
    });
    
    if (viewId === 'admin' && !currentUserRole) {
        document.getElementById('view-login').style.display = 'flex';
        return;
    }

    document.getElementById(`view-${viewId}`).style.display = viewId === 'login' ? 'flex' : 'block';
    
    if (viewId === 'home') applyFilters();
    if (viewId === 'admin') setupDashboard();
}

function loginUser() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error');
    
    if (user === CONFIG.ADMIN_USER && pass === CONFIG.ADMIN_PASS) {
        currentUserRole = 'admin';
        currentCreatorId = null;
        errorMsg.style.display = 'none';
        document.getElementById('btn-login-top').innerText = "Dashboard Admin";
        showView('admin');
        return;
    } 

    const creator = creatorsList.find(c => c.name === user && c.password === pass);
    if (creator) {
        currentUserRole = 'creator';
        currentCreatorId = creator.id;
        errorMsg.style.display = 'none';
        document.getElementById('btn-login-top').innerText = "Mon Espace";
        showView('admin');
    } else {
        errorMsg.style.display = 'block';
    }
}

function logoutUser() {
    currentUserRole = null;
    currentCreatorId = null;
    document.getElementById('btn-login-top').innerText = "Se connecter";
    document.getElementById('login-password').value = "";
    showView('home');
}

function setupDashboard() {
    const roleSpan = document.getElementById('dashboard-role');
    const tabCreator = document.getElementById('tab-btn-creator');
    const tabCat = document.getElementById('tab-btn-category');
    const tabProfile = document.getElementById('tab-btn-profile');
    const titleList = document.getElementById('pack-list-title');

    if (currentUserRole === 'admin') {
        roleSpan.innerText = "Administrateur";
        tabCreator.style.display = 'inline-block';
        tabCat.style.display = 'inline-block';
        tabProfile.style.display = 'none';
        titleList.innerText = "Tous les packs publiés :";
    } else if (currentUserRole === 'creator') {
        roleSpan.innerText = "Espace Créateur";
        tabCreator.style.display = 'none';
        tabCat.style.display = 'none';
        tabProfile.style.display = 'inline-block';
        titleList.innerText = "Mes packs publiés :";
        
        // Préremplir le formulaire de profil
        const me = creatorsList.find(c => c.id === currentCreatorId);
        if (me) {
            document.getElementById('prof-avatar').value = me.avatar || "";
            document.getElementById('prof-banner').value = me.banner || "";
            document.getElementById('prof-color').value = me.color || "#6366f1";
            document.getElementById('prof-bio').value = me.bio || "";
            document.getElementById('prof-discord').value = me.discord || "";
            document.getElementById('prof-youtube').value = me.youtube || "";
            document.getElementById('prof-patreon').value = me.patreon || "";
        }
    }
    
    switchAdminTab('tab-pack');
    renderAdminLists();
}

function switchAdminTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-btn-${tabId.split('-')[1]}`).classList.add('active');

    document.getElementById('tab-pack-content').style.display = 'none';
    document.getElementById('tab-creator-content').style.display = 'none';
    document.getElementById('tab-category-content').style.display = 'none';
    document.getElementById('tab-profile-content').style.display = 'none';
    
    document.getElementById(`${tabId}-content`).style.display = 'block';
}

function renderCategoryFilters() {
    const filter = document.getElementById('filter-category');
    filter.innerHTML = '<option value="Tous">Toutes catégories</option>';
    categoriesList.forEach(c => {
        filter.innerHTML += `<option value="${c.name}">${c.name}</option>`;
    });
}

function formatPrice(priceStr) {
    if (!priceStr) return "";
    return priceStr.includes('€') ? priceStr : `${priceStr} €`;
}

// Fonction pour parser proprement la colonne "category" (qui peut être un string ou un string JSON)
function getPackCategoriesArray(packCatRaw) {
    if (!packCatRaw) return [];
    try {
        const parsed = JSON.parse(packCatRaw);
        if (Array.isArray(parsed)) return parsed;
        return [packCatRaw];
    } catch (e) {
        return [packCatRaw]; // C'est un string simple (anciennes données)
    }
}

function applyFilters() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const categoryFilter = document.getElementById('filter-category').value;
    const typeFilter = document.getElementById('filter-price').value;

    let filtered = packsList.filter(pack => {
        const matchSearch = pack.name.toLowerCase().includes(search);
        const matchType = typeFilter === "Tous" || pack.type === typeFilter;
        
        // Vérifier si la catégorie recherchée est dans le tableau des catégories du pack
        const packCats = getPackCategoriesArray(pack.category);
        const matchCat = categoryFilter === "Tous" || packCats.includes(categoryFilter);
        
        return matchSearch && matchCat && matchType;
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
        
        const priceClass = pack.type === "Gratuit" ? "price-gratuit" : "price-payant";
        const priceText = pack.type === "Gratuit" ? "Gratuit" : `Payant - ${formatPrice(pack.price)}`;

        // Rendu des multiples badges de catégories
        const packCats = getPackCategoriesArray(pack.category);
        let catsHTML = packCats.map(c => `<span class="card-category" style="color: ${creator ? creator.color : 'white'}">${c}</span>`).join('');

        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => openPackPage(pack.id);
        
        card.innerHTML = `
            <img src="${pack.image}" class="card-img" onerror="this.src='https://via.placeholder.com/600x300/111/fff?text=Image'">
            <div class="card-content">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 10px;">
                    <div class="cats-container">${catsHTML}</div>
                    <div class="price-badge ${priceClass}" style="margin:0;">${priceText}</div>
                </div>
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
    const priceText = pack.type === "Gratuit" ? "Gratuit" : `Payant - ${formatPrice(pack.price)}`;

    const packCats = getPackCategoriesArray(pack.category);
    let catsHTML = packCats.map(c => `<span class="card-category" style="background: rgba(255,255,255,0.05); color: #fff; margin-left: 0; margin-right: 10px;">${c}</span>`).join('');

    const container = document.getElementById('pack-content');
    container.innerHTML = `
        <div class="pack-header">
            <img src="${pack.image}" onerror="this.src='https://via.placeholder.com/1200x400/111/fff?text=Image'">
            <div style="display:flex; align-items:center; margin-bottom:15px;">
                <div class="price-badge ${priceClass}" style="font-size:0.9rem; margin-right: 15px; margin-bottom: 0;">${priceText}</div>
                ${catsHTML}
            </div>
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
            const priceText = pack.type === "Gratuit" ? "Gratuit" : `Payant - ${formatPrice(pack.price)}`;

            const packCats = getPackCategoriesArray(pack.category);
            let catsHTML = packCats.map(c => `<span class="card-category" style="color: ${creator.color}">${c}</span>`).join('');

            const card = document.createElement('div');
            card.className = 'card';
            card.onclick = () => openPackPage(pack.id);
            card.innerHTML = `
                <img src="${pack.image}" class="card-img" onerror="this.src='https://via.placeholder.com/600x300/111/fff?text=Image'">
                <div class="card-content">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 10px;">
                        <div class="cats-container">${catsHTML}</div>
                        <div class="price-badge ${priceClass}" style="margin:0;">${priceText}</div>
                    </div>
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
    document.getElementById('btn-submit-creator').innerText = "Sauvegarde...";

    const creatorData = {
        id: editingCreatorId || "c_" + Date.now().toString(),
        name: document.getElementById('creator-name').value,
        password: document.getElementById('creator-password').value,
        // (Les autres infos sont mises par l'admin ou par le profil créateur plus tard)
    };

    const { error } = await supabaseClient.from('creators').upsert([creatorData]);
    if (error) alert("Erreur: " + error.message);
    else { await loadData(); resetCreatorForm(); setupDashboard(); }
    document.getElementById('btn-submit-creator').innerText = "Enregistrer";
}
document.getElementById('form-creator').addEventListener('submit', saveCreator);

// Profil Créateur (Mise à jour par lui-même)
async function updateMyProfile(e) {
    e.preventDefault();
    if (currentUserRole !== 'creator') return;

    document.getElementById('btn-submit-profile').innerText = "Sauvegarde...";
    
    // On récupère ses anciennes données pour ne pas écraser nom/mot de passe
    const me = creatorsList.find(c => c.id === currentCreatorId);

    const updatedData = {
        id: currentCreatorId,
        name: me.name,
        password: me.password,
        avatar: document.getElementById('prof-avatar').value,
        banner: document.getElementById('prof-banner').value,
        color: document.getElementById('prof-color').value,
        bio: document.getElementById('prof-bio').value,
        discord: document.getElementById('prof-discord').value,
        youtube: document.getElementById('prof-youtube').value,
        patreon: document.getElementById('prof-patreon').value
    };

    const { error } = await supabaseClient.from('creators').upsert([updatedData]);
    if (error) alert("Erreur: " + error.message);
    else { alert("Profil mis à jour !"); await loadData(); }
    document.getElementById('btn-submit-profile').innerText = "Mettre à jour mon profil";
}
document.getElementById('form-profile').addEventListener('submit', updateMyProfile);

// Catégories (Admin)
async function saveCategory(e) {
    e.preventDefault();
    const newCat = {
        id: "cat_" + Date.now().toString(),
        name: document.getElementById('category-name').value
    };
    const { error } = await supabaseClient.from('categories').insert([newCat]);
    if (error) alert("Erreur: " + error.message);
    else { document.getElementById('category-name').value = ""; await loadData(); setupDashboard(); }
}
document.getElementById('form-category').addEventListener('submit', saveCategory);

async function deleteCategory(id) {
    if(confirm("Supprimer cette catégorie ?")) {
        await supabaseClient.from('categories').delete().eq('id', id);
        await loadData();
        setupDashboard();
    }
}

// Packs (Modal)
function togglePriceField() {
    const type = document.getElementById('pack-type').value;
    const priceContainer = document.getElementById('price-container');
    if (type === 'Payant') {
        priceContainer.style.display = 'flex';
        document.getElementById('pack-price-val').required = true;
    } else {
        priceContainer.style.display = 'none';
        document.getElementById('pack-price-val').required = false;
    }
}

function openPackModal() {
    // Préparer la liste des créateurs (si Admin)
    const selectCreator = document.getElementById('pack-creator');
    if (currentUserRole === 'admin') {
        document.getElementById('pack-creator-group').style.display = 'flex';
        selectCreator.innerHTML = '<option value="">-- Choisir un créateur --</option>';
        creatorsList.forEach(c => selectCreator.innerHTML += `<option value="${c.id}">${c.name}</option>`);
    } else {
        document.getElementById('pack-creator-group').style.display = 'none';
        selectCreator.innerHTML = `<option value="${currentCreatorId}">Moi</option>`;
    }

    // Préparer les cases à cocher des catégories
    const catContainer = document.getElementById('categories-checkboxes');
    catContainer.innerHTML = '';
    categoriesList.forEach(c => {
        catContainer.innerHTML += `
            <label class="checkbox-pill">
                <input type="checkbox" name="packCats" value="${c.name}">
                <span>${c.name}</span>
            </label>
        `;
    });

    document.getElementById('pack-modal').style.display = 'block';
}

function closePackModal() {
    document.getElementById('pack-modal').style.display = 'none';
    resetPackForm();
}

async function savePack(e) {
    e.preventDefault();
    document.getElementById('btn-submit-pack').innerText = "Sauvegarde...";

    const cId = currentUserRole === 'creator' ? currentCreatorId : document.getElementById('pack-creator').value;

    // Récupérer toutes les catégories cochées
    const checkboxes = document.querySelectorAll('input[name="packCats"]:checked');
    let selectedCats = [];
    checkboxes.forEach((cb) => { selectedCats.push(cb.value); });
    
    // On sauvegarde ça en string JSON pour la base de données
    const categoryString = JSON.stringify(selectedCats);

    const packData = {
        id: editingPackId || "p_" + Date.now().toString(),
        name: document.getElementById('pack-name').value,
        creatorId: cId,
        description: document.getElementById('pack-desc').value,
        category: categoryString,
        type: document.getElementById('pack-type').value,
        price: document.getElementById('pack-type').value === 'Payant' ? document.getElementById('pack-price-val').value : null,
        image: document.getElementById('pack-image').value,
        video: document.getElementById('pack-video').value,
        link: document.getElementById('pack-link').value
    };

    const { error } = await supabaseClient.from('packs').upsert([packData]);
    if (error) alert("Erreur: " + error.message);
    else { await loadData(); closePackModal(); setupDashboard(); }
    document.getElementById('btn-submit-pack').innerText = "Enregistrer le Pack";
}
document.getElementById('form-pack').addEventListener('submit', savePack);

// Listes Admin
function renderAdminLists() {
    const packsContainer = document.getElementById('admin-packs-list');
    packsContainer.innerHTML = '';
    
    const filteredPacks = currentUserRole === 'creator' 
        ? packsList.filter(p => p.creatorId === currentCreatorId)
        : packsList;

    filteredPacks.forEach(p => {
        packsContainer.innerHTML += `
            <div class="admin-item">
                <span class="admin-item-title">${p.name}</span>
                <div class="admin-item-actions">
                    <button class="btn-edit" onclick="editPack('${p.id}')">Éditer</button>
                    <button class="btn-delete" onclick="deletePack('${p.id}')">X</button>
                </div>
            </div>
        `;
    });

    if (currentUserRole === 'admin') {
        const creatorsContainer = document.getElementById('admin-creators-list');
        creatorsContainer.innerHTML = '';
        creatorsList.forEach(c => {
            creatorsContainer.innerHTML += `
                <div class="admin-item">
                    <span class="admin-item-title" style="color: ${c.color}">${c.name}</span>
                    <div class="admin-item-actions">
                        <button class="btn-edit" onclick="editCreator('${c.id}')">Éditer (Reset MDP)</button>
                        <button class="btn-delete" onclick="deleteCreator('${c.id}')">X</button>
                    </div>
                </div>
            `;
        });

        const catContainer = document.getElementById('admin-categories-list');
        catContainer.innerHTML = '';
        categoriesList.forEach(c => {
            catContainer.innerHTML += `
                <div class="admin-item">
                    <span class="admin-item-title">${c.name}</span>
                    <div class="admin-item-actions">
                        <button class="btn-delete" onclick="deleteCategory('${c.id}')">X</button>
                    </div>
                </div>
            `;
        });
    }
}

function editPack(id) {
    const p = packsList.find(x => x.id === id);
    if(!p) return;
    editingPackId = id;
    openPackModal();

    document.getElementById('pack-form-title').innerText = "Modifier : " + p.name;
    document.getElementById('pack-name').value = p.name;
    if (currentUserRole === 'admin') document.getElementById('pack-creator').value = p.creatorId;
    document.getElementById('pack-desc').value = p.description || "";
    
    // Cocher les bonnes catégories
    const packCats = getPackCategoriesArray(p.category);
    const checkboxes = document.querySelectorAll('input[name="packCats"]');
    checkboxes.forEach(cb => {
        if (packCats.includes(cb.value)) cb.checked = true;
    });

    document.getElementById('pack-type').value = p.type || "Gratuit";
    document.getElementById('pack-price-val').value = p.price || "";
    togglePriceField(); 
    document.getElementById('pack-image').value = p.image;
    document.getElementById('pack-video').value = p.video || "";
    document.getElementById('pack-link').value = p.link;
    document.getElementById('btn-submit-pack').innerText = "Mettre à jour le pack";
}

function resetPackForm() {
    editingPackId = null;
    document.getElementById('form-pack').reset();
    togglePriceField();
    document.getElementById('pack-form-title').innerText = "Publier un Pack";
    document.getElementById('btn-submit-pack').innerText = "Enregistrer le Pack";
}

async function deletePack(id) {
    if(confirm("Vraiment supprimer ce pack ?")) {
        await supabaseClient.from('packs').delete().eq('id', id);
        await loadData();
        setupDashboard();
    }
}

// L'édition Créateur par l'Admin se limite maintenant au nom/mot de passe
function editCreator(id) {
    const c = creatorsList.find(x => x.id === id);
    if(!c) return;
    editingCreatorId = id;
    
    document.getElementById('creator-form-title').innerText = "Modifier l'accès : " + c.name;
    document.getElementById('creator-name').value = c.name;
    document.getElementById('creator-password').value = c.password || "";
    
    document.getElementById('btn-submit-creator').innerText = "Mettre à jour l'accès";
    document.getElementById('btn-cancel-creator').style.display = "block";
    window.scrollTo(0, 0);
}

function resetCreatorForm() {
    editingCreatorId = null;
    document.getElementById('form-creator').reset();
    document.getElementById('creator-form-title').innerText = "Créer un compte Créateur";
    document.getElementById('btn-submit-creator').innerText = "Enregistrer";
    document.getElementById('btn-cancel-creator').style.display = "none";
}

async function deleteCreator(id) {
    if(confirm("Supprimer ce compte ? (Ses packs resteront en base, sans auteur)")) {
        await supabaseClient.from('creators').delete().eq('id', id);
        await loadData();
        setupDashboard();
    }
}