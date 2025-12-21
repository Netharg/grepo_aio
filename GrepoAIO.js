// ==UserScript==
// @name         Grepolis AIO Azert
// @namespace    http://tampermonkey.net/
// @version      6.1
// @description  Version Intégrale - UI Dragable & Fix Alignement
// @author       Azert
// @match        https://*.grepolis.com/game/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// @updateURL    https://github.com/Netharg/grepo_aio/blob/main/GrepoAIO.js
// @downloadURL  https://github.com/Netharg/grepo_aio/blob/main/GrepoAIO.js
// ==/UserScript==

(function() {
    'use strict';

    const AUTH_URL = "https://script.google.com/macros/s/AKfycbxZsQGGGgI1mMlW-9sMw-SZkoA5Uv9lb63J61WjweVgz43ksTronkQieVZkijN0Gls3/exec";
    const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1365001940840484924/b4iYxv5Zw_5vojdWzHTrOPsduZttC3LBldjCosf3jNzC6UK6DLXwKdvqbiSZTNRfNBmJ";
    const BOT_AVATAR = "https://i.pinimg.com/1200x/a7/58/66/a7586656e6fe9cd2fbe506db216845fa.jpg";

    function sendDiscord(content) {
        const playerName = unsafeWindow.Game.player_name || "Inconnu";
        const worldId = unsafeWindow.Game.world_id || "";
        GM_xmlhttpRequest({
            method: "POST",
            url: DISCORD_WEBHOOK,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify({
                content: content,
                username: playerName + " " + worldId,
                avatar_url: BOT_AVATAR
            })
        });
    }

    function generateHWID() {
        return btoa(navigator.userAgent + screen.width + screen.height).substring(0, 32);
    }

    function checkAuth() {
        const gameLoaded = typeof unsafeWindow.Game !== 'undefined' && unsafeWindow.Game.player_name;
        if (!gameLoaded) {
            setTimeout(checkAuth, 1000);
            return;
        }
        const currentPlayer = unsafeWindow.Game.player_name;
        const lastPlayer = GM_getValue("aio_last_player");
        let userKey = GM_getValue("aio_user_key");

        if (lastPlayer && lastPlayer !== currentPlayer) {
            console.log("%c[SYSTEM] Changement de compte détecté.", "color: #ff0000; font-weight: bold;");
            GM_setValue("aio_user_key", "");
            userKey = "";
        }
        if (!userKey) {
            userKey = prompt("Compte : " + currentPlayer + "\nVeuillez entrer votre clé d'activation AIO :");
            if (userKey) {
                GM_setValue("aio_user_key", userKey);
                GM_setValue("aio_last_player", currentPlayer);
            } else return;
        }
        GM_xmlhttpRequest({
            method: "GET",
            url: "https://api.ipify.org?format=json",
            onload: function(ipRes) {
                let userIP = "Inconnue";
                try { userIP = JSON.parse(ipRes.responseText).ip; } catch(e) {}
                proceedWithAuth(userKey, currentPlayer, userIP);
            },
            onerror: () => proceedWithAuth(userKey, currentPlayer, "Inconnue")
        });
    }

    function proceedWithAuth(userKey, currentPlayer, userIP) {
        const params = { key: userKey, user: currentPlayer, userId: unsafeWindow.Game.player_id, hwid: generateHWID() };
        const queryString = Object.keys(params).map(function(k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
        GM_xmlhttpRequest({
            method: "GET",
            url: AUTH_URL + "?" + queryString,
            onload: function(response) {
                const res = response.responseText.trim();
                if (res.includes("AUTHORIZED") || res.includes("SUCCESS_BOUND")) {
                    console.log("%c[AUTH] Accès Autorisé.", "color: #28a745; font-weight: bold;");
                    sendDiscord("🟢 **Connexion Réussie**\n👤 Joueur : `" + currentPlayer + "`\n🆔 ID : `" + unsafeWindow.Game.player_id + "`\n🌍 Serveur : `" + unsafeWindow.Game.world_id + "`\n🔑 Clé : `" + userKey + "`\n🌐 IP : `" + userIP + "`");
                    initScript();
                } else {
                    const reason = res || "Réponse vide du serveur";
                    console.log("%c[AUTH] Accès Refusé : " + reason, "color: #dc3545; font-weight: bold;");
                    sendDiscord("🔴 **Accès Refusé**\n👤 Joueur : `" + currentPlayer + "`\n🔑 Clé : `" + userKey + "`\n🌐 IP : `" + userIP + "`\n⚠️ **Raison** : `" + reason + "`");
                    alert("AIO SECURITY : Accès Refusé (" + reason + ")");
                    GM_setValue("aio_user_key", "");
                }
            }
        });
    }

    function initScript() {
        const Game = unsafeWindow.Game;
        const $ = unsafeWindow.jQuery;
        const MM = unsafeWindow.MM;

        let isRunning = false, isCultureRunning = false, isGrottoRunning = false;
        let timerTimeout = null, cultureTimeout = null, grottoTimeout = null;
        let countdownInterval = null, farmCountdownInterval = null, cultureCountdownInterval = null;
        let captchaDetected = false;

        const logC = function(type, message, color) {
            const now = new Date().toLocaleTimeString();
            let finalColor = color || "#007bff";
            if (type === "VP") finalColor = "#28a745";
            if (type === "CULTURE") finalColor = "#007bff";
            if (type === "GROTTE") finalColor = "#6f42c1";
            if (type === "SÉCURITÉ") finalColor = "#dc3545";
            console.log("%c[" + now + "] [" + type + "] %c" + message, "color: " + finalColor + "; font-weight: bold; border: 1px solid " + finalColor + "; padding: 1px 4px; border-radius: 3px;", "color: #ddd;");
        };

        const wait = async function(ms, context) {
            logC("ATTENTE", "[" + context + "] Temporisation de " + (ms/1000).toFixed(2) + "s...", "#ffc107");
            return new Promise(function(res) { setTimeout(res, ms); });
        };

        const getRandomDelay = function(min, max) { return (Math.random() * (max - min) + min) * 1000; };
        const getRandomLongDelay = function() { return (Math.random() * (15 - 1) + 1) * 1000; };

        function checkCaptcha() {
            const hCaptcha = document.getElementById('hcaptcha_window');
            if (hCaptcha && hCaptcha.style.display !== 'none' && !captchaDetected) {
                captchaDetected = true;
                logC("SÉCURITÉ", "!!! CAPTCHA DÉTECTÉ !!! ARRÊT IMMÉDIAT", "#dc3545");
                sendDiscord("⚠️ 🆘 **ALERTE CAPTCHA** 🆘 ⚠️\nUn captcha est apparu sur le compte de **" + Game.player_name + "** ! Arrêt de sécurité des modules.");
                isRunning = false; isCultureRunning = false; isGrottoRunning = false;
                clearTimeout(timerTimeout); clearTimeout(cultureTimeout); clearTimeout(grottoTimeout);
                clearInterval(countdownInterval); clearInterval(farmCountdownInterval); clearInterval(cultureCountdownInterval);
                if (document.getElementById('f_btn')) { document.getElementById('f_btn').textContent = 'DÉMARRER'; document.getElementById('f_btn').style.background = '#28a745'; }
                if (document.getElementById('c_btn')) { document.getElementById('c_btn').textContent = 'FESTI JO'; document.getElementById('c_btn').style.background = '#007bff'; }
                if (document.getElementById('g_btn')) { document.getElementById('g_btn').textContent = 'DÉMARRER'; document.getElementById('g_btn').style.background = '#007bff'; }
                document.getElementById('farm_status').textContent = 'BLOQUÉ';
                document.getElementById('culture_status').textContent = 'BLOQUÉ';
                alert("SÉCURITÉ AIO : Captcha détecté !");
            } else if (!hCaptcha || hCaptcha.style.display === 'none') {
                captchaDetected = false;
            }
        }
        setInterval(checkCaptcha, 1000);

        const pad = function(n) { return n.toString().padStart(2, '0'); };
        const hms = function(s) { return pad(Math.floor(s/3600)) + ":" + pad(Math.floor((s%3600)/60)) + ":" + pad(s%60); };

        function processRuntimes() {
            const movements = (typeof MM !== 'undefined') ? MM.getModels().MovementsUnits : null;
            if (!movements) return;
            Object.values(movements).forEach(function(mov) {
                const cmdId = mov.attributes.command_id;
                const $row = $("li#command_" + cmdId + ", li#command_colonization_" + cmdId + ", #command_" + cmdId);
                if (!$row.length) return;
                const $eta = $row.find("span.eta-command-" + cmdId + ", span.eta-command-colonization_" + cmdId + ", .eta");
                if ($eta.length && !$row.find(".gt-runtime").length) {
                    const arr = mov.attributes.arrival_at;
                    const vis = mov.attributes.visible_since || mov.attributes.cap_of_invisibility_effective_until || (arr - 1);
                    const runtimeSec = Math.max(1, Math.floor((arr - vis) / 0.9));
                    $eta.after("<span class=\"gt-runtime\" style=\"color: black; font-weight: bold; margin-left: 8px; font: 13px Verdana, Arial, Helvetica, sans-serif;\">(Temps de trajet : " + hms(runtimeSec) + ")</span>");
                }
            });
        }
        setInterval(processRuntimes, 1500);

        function toggleCurtain(show, message) {
            let curtain = document.getElementById('farm_curtain');
            if (!curtain) {
                curtain = document.createElement('div');
                curtain.id = 'farm_curtain';
                curtain.style.position = "fixed"; curtain.style.top = "0"; curtain.style.left = "0"; curtain.style.width = "100vw"; curtain.style.height = "100vh"; curtain.style.background = "rgba(0, 0, 0, 0.4)"; curtain.style.zIndex = "20000"; curtain.style.display = "none"; curtain.style.alignItems = "center"; curtain.style.justifyContent = "center";
                const textBox = document.createElement('div'); textBox.id = 'curtain_text';
                textBox.style.background = "#111"; textBox.style.color = "#ebc172"; textBox.style.padding = "25px 45px"; textBox.style.border = "2px solid #ebc172"; textBox.style.borderRadius = "8px"; textBox.style.fontWeight = "bold"; textBox.style.textAlign = "center"; textBox.style.fontFamily = "Verdana";
                curtain.appendChild(textBox); document.body.appendChild(curtain);
            }
            document.getElementById('curtain_text').innerText = message || "";
            curtain.style.display = show ? 'flex' : 'none';
        }

        // --- MODULES (VP, CULTURE, GROTTE) ---
        function startFarmCountdown(durationMs) {
            clearInterval(farmCountdownInterval);
            let remaining = Math.floor(durationMs / 1000);
            farmCountdownInterval = setInterval(function() {
                if (remaining <= 0) { clearInterval(farmCountdownInterval); return; }
                remaining--;
                document.getElementById('farm_status').textContent = Math.floor(remaining/60) + ":" + (remaining%60).toString().padStart(2,'0');
            }, 1000);
        }

        async function runFarmSequence() {
            if (!isRunning || captchaDetected) return;
            logC("VP", "Lancement séquence de récolte...");
            toggleCurtain(true, "AIO VP : Récolte en cours...");
            try {
                await wait(getRandomDelay(2, 5), "Ouverture VP");
                $('a[name="farm_town_overview"]').click();
                await wait(getRandomDelay(2, 6), "Sélection");
                $('a.checkbox.select_all').click();
                await wait(getRandomDelay(2, 5), "Récupération");
                $('#fto_claim_button').click();
                await wait(getRandomDelay(3, 6), "Fermeture");
                $('.ui-dialog-titlebar-close').last().click();
                logC("VP", "Récolte terminée.");
                sendDiscord("🌾 **VP récolté avec succès**");
            } finally { toggleCurtain(false); scheduleNextRun(); }
        }

        function scheduleNextRun() {
            if (!isRunning || captchaDetected) return;
            const interval = parseInt(document.getElementById('farm_interval').value) * 60000;
            const alea = getRandomDelay(20, 120);
            const total = interval + alea;
            logC("VP", "Prochaine relance dans " + (total/60000).toFixed(2) + " min.");
            sendDiscord("🕒 **VP Planifié** : Prochaine récolte dans `" + (total/60000).toFixed(1) + " min` text");
            startFarmCountdown(total);
            timerTimeout = setTimeout(runFarmSequence, total);
        }

        function startCultureCountdown(durationMs) {
            clearInterval(cultureCountdownInterval);
            let remaining = Math.floor(durationMs / 1000);
            cultureCountdownInterval = setInterval(function() {
                if (remaining <= 0) { clearInterval(cultureCountdownInterval); return; }
                remaining--;
                const h = Math.floor(remaining / 3600), m = Math.floor((remaining % 3600) / 60), s = remaining % 60;
                document.getElementById('culture_status').textContent = h + ":" + m.toString().padStart(2,'0') + ":" + s.toString().padStart(2,'0');
            }, 1000);
        }

        async function runCultureSequence() {
            if (!isCultureRunning || captchaDetected) return;
            logC("CULTURE", "Lancement séquence culturelle...");
            toggleCurtain(true, "AIO Culture : Festivals en cours...");
            try {
                await wait(getRandomDelay(2, 4), "Ouverture Culture");
                $('a[name="culture_overview"]').click();
                await wait(getRandomDelay(2, 5), "Lancement Festis");
                $('#start_all_celebrations').click();
                await wait(getRandomDelay(3, 6), "Ouverture JO");
                $('#place_celebration_select').click();
                await wait(1000, "Choix JO");
                $('#place_celebration_select_list .option[name="games"]').click();
                await wait(getRandomDelay(2, 4), "Validation JO");
                $('#start_all_celebrations').click();
                await wait(getRandomDelay(2, 4), "Fermeture");
                $('.ui-dialog-titlebar-close').last().click();
                logC("CULTURE", "Séquence terminée.");
                sendDiscord("🎭 **Culture : Festivals et JO lancés**");
            } finally { toggleCurtain(false); scheduleNextCulture(); }
        }

        function scheduleNextCulture() {
            if (!isCultureRunning || captchaDetected) return;
            const delay = ((24 / (Game.game_speed || 1)) * 3600000) + getRandomDelay(15, 90);
            logC("CULTURE", "Relance dans " + (delay/3600000).toFixed(2) + "h.");
            sendDiscord("🕒 **Culture Planifiée** : Relance dans `" + (delay/3600000).toFixed(1) + " heures`");
            startCultureCountdown(delay);
            cultureTimeout = setTimeout(runCultureSequence, delay);
        }

        function startGrottoCountdown(durationMs) {
            clearInterval(countdownInterval);
            let remaining = Math.floor(durationMs / 1000);
            countdownInterval = setInterval(function() {
                if (remaining <= 0) { clearInterval(countdownInterval); return; }
                remaining--;
                document.getElementById('grotto_status').textContent = Math.floor(remaining/60) + ":" + (remaining%60).toString().padStart(2,'0');
            }, 1000);
        }

        async function runGrottoSequence() {
            if (!isGrottoRunning || captchaDetected) return;
            logC("GROTTE", "Lancement séquence grotte...");
            toggleCurtain(true, "AIO Grotte : Remplissage...");
            try {
                await wait(getRandomDelay(2, 5), "Ouverture Grotte");
                $('a[name="hides_overview"]').click();
                await wait(getRandomLongDelay(), "Analyse");
                const target = parseInt(document.getElementById('grotto_amount').value) || 1000;
                const diff = target - 1000;
                if (diff !== 0) {
                    const btn = diff > 0 ? '.button_increase' : '.button_decrease';
                    const clicks = Math.abs(diff / 500);
                    for(let i=0; i < clicks; i++) {
                        $(btn).click();
                        await wait(getRandomDelay(1, 4), "Ajustement clic " + (i+1));
                    }
                }
                $('#store_iron_in_all_towns').click();
                await wait(getRandomLongDelay(), "Fermeture");
                $('.ui-dialog-titlebar-close').last().click();
                logC("GROTTE", "Opération terminée.");
                sendDiscord("💰 **Grotte : Pièces stockées (" + target + ")**");
            } finally { toggleCurtain(false); scheduleNextGrotto(); }
        }

        function scheduleNextGrotto() {
            if (!isGrottoRunning || captchaDetected) return;
            const mins = parseInt(document.getElementById('grotto_cycle_min').value);
            const total = (mins * 60000) + getRandomDelay(30, 90);
            logC("GROTTE", "Relance dans " + (total/60000).toFixed(2) + " min.");
            sendDiscord("🕒 **Grotte Planifiée** : Relance dans `" + (total/60000).toFixed(1) + " min` text");
            startGrottoCountdown(total);
            grottoTimeout = setTimeout(runGrottoSequence, total);
        }

        // --- CALAGE V3 ---
        const timeCalage = document.createElement("input");
        timeCalage.id = "timeCalage"; timeCalage.type = "time"; timeCalage.step = "2";
        Object.assign(timeCalage.style, { position: "absolute", bottom: "13px", left: "15px", backgroundColor: "rgb(0 0 0 / 25%)", backdropFilter: 'blur(10px)', zIndex: "1001", padding: "5px", width: "90px", height: "20px", borderRadius: "8px", color: "white", border: '1px solid black' });
        const c1 = document.createElement('div'); Object.assign(c1.style, { position: 'fixed', bottom: '13px', left: '123px', zIndex: '9999', backgroundColor: 'rgb(0 0 0 / 25%)', backdropFilter: 'blur(10px)', padding: '3px', borderRadius: '4px', border: '1px solid black' });
        const cb1 = document.createElement('input'); cb1.type = 'checkbox';
        const c2 = document.createElement('div');
        Object.assign(c2.style, { position: 'fixed', bottom: '13px', left: '150px', zIndex: '9999', backgroundColor: 'rgb(0 0 0 / 25%)', backdropFilter: 'blur(10px)', padding: '3px', borderRadius: '4px', border: '1px solid black' });
        const cb2 = document.createElement('input'); cb2.type = 'checkbox';
        document.body.append(timeCalage, c1, c2); c1.append(cb1); c2.append(cb2);

        // --- UI ---
        const commonStyle = "position: fixed; left: 20px; z-index: 10000; background: rgba(10, 10, 10, 0.95); color: #ddd; padding: 10px; border-radius: 4px; font-size: 10px; border: 1px solid #ebc172; width: 140px; font-family: Verdana; box-shadow: 2px 2px 10px black; display: none; cursor: grab;";
        const fUI = document.createElement('div'); fUI.style.cssText = commonStyle + "bottom: 50px;";
        fUI.innerHTML = '<div style="text-align:center; margin-bottom:6px; pointer-events:none;"><span style="font-weight:bold; color:#ebc172;">AIO VP</span><span id="f_dot" style="color:#dc3545; float:right;">●</span></div><select id="farm_interval" style="width:100%; background:#222; color:white; border:1px solid #444; font-size:10px; margin-bottom:6px;"><option value="5">Cycle 5 min</option><option value="10">Cycle 10 min</option></select><button id="f_btn" style="width:100%; background:#28a745; color:white; border:none; padding:6px; cursor:pointer; font-weight:bold;">DÉMARRER</button><div id="farm_status" style="color:#28a745; text-align:center; font-weight:bold; margin-top:6px; pointer-events:none;">PRÊT</div>';
        const cUI = document.createElement('div'); cUI.style.cssText = commonStyle + "bottom: 165px;";
        cUI.innerHTML = '<div style="font-weight:bold; color:#ebc172; margin-bottom:6px; text-align:center; pointer-events:none;">AIO Culture</div><button id="c_btn" style="width:100%; background:#007bff; color:white; border:none; padding:6px; cursor:pointer; font-weight:bold;">FESTI JO</button><div id="culture_status" style="color:#007bff; text-align:center; font-weight:bold; margin-top:6px; pointer-events:none;">PRÊT</div>';
        const gUI = document.createElement('div'); gUI.style.cssText = commonStyle + "bottom: 260px;";
        gUI.innerHTML = '<div style="text-align:center; margin-bottom:6px; pointer-events:none;"><span style="font-weight:bold; color:#ebc172;">AIO GROTTE</span><span id="g_dot" style="color:#dc3545; float:right;">●</span></div><div style="margin-bottom:6px;"><label>Temps relance (min) :</label><input type="number" id="grotto_cycle_min" value="60" style="width:100%; background:#222; color:white; border:1px solid #444; font-size:10px;"></div><div style="margin-bottom:6px;"><label>Nombre pièces :</label><input type="number" id="grotto_amount" value="1000" step="500" style="width:100%; background:#222; color:white; border:1px solid #444; font-size:10px;"></div><button id="g_btn" style="width:100%; background:#007bff; color:white; border:none; padding:6px; cursor:pointer; font-weight:bold;">DÉMARRER</button><div id="grotto_status" style="color:#ff4d4d; text-align:center; font-weight:bold; margin-top:6px; pointer-events:none;">PRÊT</div>';
        document.body.append(fUI, cUI, gUI);

        // --- FONCTION DRAG (AJOUTÉ) ---
        function makeDraggable(el) {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            el.onmousedown = function(e) {
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
                e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY;
                document.onmouseup = function() { document.onmouseup = null; document.onmousemove = null; el.style.cursor = 'grab'; };
                document.onmousemove = function(e) {
                    e.preventDefault(); pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY; pos3 = e.clientX; pos4 = e.clientY;
                    el.style.top = (el.offsetTop - pos2) + "px"; el.style.left = (el.offsetLeft - pos1) + "px";
                    el.style.bottom = 'auto'; el.style.cursor = 'grabbing';
                };
            };
        }
        [fUI, cUI, gUI].forEach(makeDraggable);

        function injectMenu() {
            const menuList = document.querySelector('.nui_main_menu .middle .content ul');
            const forumBtn = document.querySelector('.main_menu_item.forum');
            if (menuList && !document.getElementById('aio_menu_btn')) {
                const li = document.createElement('li');
                li.id = 'aio_menu_btn'; li.className = 'main_menu_item';
                li.innerHTML = '<span class="content_wrapper"><span class="button_wrapper"><span class="button"><span class="icon" style="background:url(' + BOT_AVATAR + ') no-repeat; background-size:contain;"></span></span></span><span class="name_wrapper"><span class="name">AIO Bot</span></span></span>';
                li.onclick = function() {
                    const isVisible = fUI.style.display === 'block';
                    fUI.style.display = cUI.style.display = gUI.style.display = isVisible ? 'none' : 'block';
                };
                if (forumBtn) menuList.insertBefore(li, forumBtn); else menuList.appendChild(li);
            }
        }
        setInterval(injectMenu, 2000);

        document.getElementById('f_btn').onclick = function() {
            isRunning = !isRunning;
            this.textContent = isRunning ? 'ARRÊTER' : 'DÉMARRER'; this.style.background = isRunning ? '#dc3545' : '#28a745';
            document.getElementById('f_dot').style.color = isRunning ? '#28a745' : '#dc3545';
            if (isRunning) { logC("VP", "Démarrage."); sendDiscord("▶️ **Module VP activé**"); runFarmSequence(); } else { logC("VP", "Arrêt."); sendDiscord("⏹️ **Module VP désactivé**"); clearTimeout(timerTimeout); clearInterval(farmCountdownInterval); document.getElementById('farm_status').textContent = 'ARRÊTÉ'; }
        };

        document.getElementById('c_btn').onclick = function() {
            isCultureRunning = !isCultureRunning;
            this.textContent = isCultureRunning ? 'ARRÊTER' : 'FESTI JO'; this.style.background = isCultureRunning ? '#dc3545' : '#007bff';
            if (isCultureRunning) { logC("CULTURE", "Démarrage."); sendDiscord("▶️ **Module Culture activé**"); runCultureSequence(); } else { logC("CULTURE", "Arrêt."); sendDiscord("⏹️ **Module Culture désactivé**"); clearTimeout(cultureTimeout); clearInterval(cultureCountdownInterval); document.getElementById('culture_status').textContent = 'ARRÊTÉ'; }
        };

        document.getElementById('g_btn').onclick = function() {
            isGrottoRunning = !isGrottoRunning;
            this.textContent = isGrottoRunning ? 'ARRÊTER' : 'DÉMARRER'; this.style.background = isGrottoRunning ? '#dc3545' : '#007bff';
            document.getElementById('g_dot').style.color = isGrottoRunning ? '#28a745' : '#dc3545';
            if (isGrottoRunning) { logC("GROTTE", "Démarrage."); sendDiscord("▶️ **Module Grotte activé**"); runGrottoSequence(); } else { logC("GROTTE", "Arrêt."); sendDiscord("⏹️ **Module Grotte désactivé**"); toggleCurtain(false); clearTimeout(grottoTimeout); clearInterval(countdownInterval); document.getElementById('grotto_status').textContent = 'ARRÊTÉ'; }
        };
    }
    checkAuth();
})();
