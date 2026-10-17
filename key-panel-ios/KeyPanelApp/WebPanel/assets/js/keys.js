(function () {
    'use strict';

    const KEY_SYSTEM_PASSWORD_HASH = '5c0980f32c0787ab23ecf475602f1105b2d9ef453db169cd84b57fe8172086bb';
    const DAY_MS = 24 * 60 * 60 * 1000;
    const FIREBASE_CONFIG = {
        apiKey: 'AIzaSyBh5oRgp6JDWZ9releBezsKcepERuLA0r4',
        authDomain: 'aimforge-331a9.firebaseapp.com',
        databaseURL: 'https://aimforge-331a9-default-rtdb.firebaseio.com',
        projectId: 'aimforge-331a9',
        storageBucket: 'aimforge-331a9.firebasestorage.app',
        messagingSenderId: '705278943003',
        appId: '1:705278943003:web:f31cb07fb5ed51b6f4bdbe',
        measurementId: 'G-C33H30T3V4',
    };

    const keyAccessGate = document.getElementById('key-access-gate');
    const keyAccessForm = document.getElementById('key-access-form');
    const keyAccessPassword = document.getElementById('key-access-password');
    const keyAccessMessage = document.getElementById('key-access-message');
    const cancelKeyAccess = document.getElementById('cancel-key-access');
    const keyManager = document.getElementById('key-manager');
    const generatorForm = document.getElementById('key-generator-form');
    const durationSelect = document.getElementById('key-duration');
    const customDurationWrap = document.getElementById('custom-duration-wrap');
    const customDurationInput = document.getElementById('custom-duration');
    const generatorMessage = document.getElementById('key-generator-message');
    const validationInput = document.getElementById('key-validation-input');
    const validationButton = document.getElementById('validate-key-button');
    const validationMessage = document.getElementById('key-validation-message');
    const keyCloudStatus = document.getElementById('key-cloud-status');
    const keysList = document.getElementById('keys-list');
    const closeButton = document.getElementById('close-key-manager');
    const clearButton = document.getElementById('clear-keys-button');
    const exportButton = document.getElementById('export-keys-button');
    const importButton = document.getElementById('import-keys-button');

    if (!keyAccessGate || !keyAccessForm || !keyAccessPassword || !keyManager || !generatorForm || !durationSelect || !keysList) {
        return;
    }

    let database = null;
    let cloudListenerAttached = false;

    function setMessage(element, message, type) {
        if (!element) return;
        element.textContent = message;
        element.hidden = !message;
        element.classList.remove('is-success', 'is-error');
        if (type) element.classList.add(`is-${type}`);
    }

    function setCloudStatus(message, type) {
        if (!keyCloudStatus) return;
        keyCloudStatus.textContent = message;
        keyCloudStatus.classList.remove('is-online', 'is-error');
        if (type) keyCloudStatus.classList.add(`is-${type}`);
    }

    function initializeDatabase() {
        if (typeof firebase === 'undefined' || !firebase.database) {
            setCloudStatus('Firebase no está disponible.', 'error');
            return;
        }
        try {
            if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
            database = firebase.database();
            setCloudStatus('Sincronizado con la nube.', 'online');
        } catch (error) {
            setCloudStatus('No se pudo conectar con Firebase.', 'error');
        }
    }

    function generateHWID() {
        const storageKey = 'sensiaura_device_id';
        let hwid = localStorage.getItem(storageKey);
        if (!hwid) {
            const screenInfo = `${window.screen.width}x${window.screen.height}`;
            const platform = navigator.platform || 'browser';
            const randomValues = new Uint32Array(2);
            if (window.crypto && window.crypto.getRandomValues) {
                window.crypto.getRandomValues(randomValues);
            }
            const randomPart = Array.from(randomValues, value => value.toString(36)).join('').slice(0, 9).toUpperCase();
            const encodedScreen = window.btoa ? window.btoa(`${screenInfo}${platform}`).slice(0, 8).toUpperCase() : 'LOCALDEV';
            hwid = `SA-${encodedScreen}-${randomPart || 'DEVICE01'}`;
            localStorage.setItem(storageKey, hwid);
        }
        return hwid;
    }

    function randomSegment() {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const values = new Uint32Array(4);
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(values);
        } else {
            for (let index = 0; index < values.length; index += 1) {
                values[index] = Math.floor(Math.random() * 0xffffffff);
            }
        }
        return Array.from(values, value => alphabet[value % alphabet.length]).join('');
    }

    function createKeyValue() {
        return `SA-${randomSegment()}-${randomSegment()}-${randomSegment()}`;
    }

    function normalizeKey(value) {
        return String(value || '').trim().toUpperCase();
    }

    function formatDate(timestamp) {
        return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(timestamp));
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
        }[character]));
    }

    function renderCloudKeys(keysData) {
        const keys = Object.values(keysData || {}).sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0));
        keysList.innerHTML = '';
        if (!keys.length) {
            keysList.innerHTML = '<p class="keys-empty">Todavía no hay keys en la nube.</p>';
            return;
        }

        keys.forEach(item => {
            const expired = item.expiration !== 'PERMANENTE' && Number(item.expiration) <= Date.now();
            const key = normalizeKey(item.key);
            const row = document.createElement('div');
            row.className = `key-row${expired ? ' is-expired' : ''}`;
            row.innerHTML = `
                <div class="key-row-main">
                    <code>${escapeHtml(key)}</code>
                    <span class="key-row-meta">${item.expiration === 'PERMANENTE' ? 'Permanente' : `Vence ${formatDate(Number(item.expiration))}`} · ${item.hwid ? `HWID ${escapeHtml(item.hwid)}` : 'Libre'}</span>
                </div>
                <div class="key-row-actions">
                    ${item.hwid ? `<button type="button" class="key-reset-button" data-key="${escapeHtml(key)}">Liberar</button>` : ''}
                    <button type="button" class="key-copy-button" data-key="${escapeHtml(key)}">Copiar</button>
                    <button type="button" class="key-delete-button" data-key="${escapeHtml(key)}">Eliminar</button>
                </div>`;
            keysList.appendChild(row);
        });
    }

    function attachCloudListener() {
        if (!database || cloudListenerAttached) return;
        cloudListenerAttached = true;
        database.ref('keys').on('value', snapshot => {
            renderCloudKeys(snapshot.val());
            setCloudStatus('Sincronizado con la nube.', 'online');
        }, () => {
            renderCloudKeys(null);
            setCloudStatus('Firebase rechazó la lectura. Revisa las reglas.', 'error');
        });
    }

    async function hashValue(value) {
        if (!window.crypto || !window.crypto.subtle) return '';
        const encoded = new TextEncoder().encode(value);
        const digest = await window.crypto.subtle.digest('SHA-256', encoded);
        return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
    }

    async function validateKey(value) {
        if (!database) return false;
        const normalized = normalizeKey(value);
        if (!normalized) return false;
        try {
            const snapshot = await database.ref(`keys/${normalized}`).once('value');
            const item = snapshot.val();
            if (!item || item.status === 'REVOKED') return false;
            if (item.expiration !== 'PERMANENTE' && Number(item.expiration) <= Date.now()) return false;
            const hwid = generateHWID();
            if (item.hwid && item.hwid !== hwid) return false;
            if (!item.hwid) await database.ref(`keys/${normalized}`).update({ hwid, lastUsedAt: Date.now() });
            return true;
        } catch (error) {
            return false;
        }
    }

    function showAccessGate() {
        keyManager.hidden = true;
        keyAccessGate.hidden = false;
        keyAccessPassword.value = '';
        setMessage(keyAccessMessage, '', null);
        window.setTimeout(() => keyAccessPassword.focus(), 0);
    }

    function hideAccessGate() {
        keyAccessGate.hidden = true;
        keyAccessPassword.value = '';
        setMessage(keyAccessMessage, '', null);
    }

    function showManager() {
        keyAccessGate.hidden = true;
        keyManager.hidden = false;
        attachCloudListener();
        const firstInput = durationSelect;
        if (firstInput) firstInput.focus();
    }

    function hideManager() {
        keyManager.hidden = true;
        setMessage(generatorMessage, '', null);
        setMessage(validationMessage, '', null);
    }

    function getDurationDays() {
        const days = durationSelect.value === 'custom'
            ? Number.parseInt(customDurationInput.value, 10)
            : Number.parseInt(durationSelect.value, 10);
        return Number.isInteger(days) && days >= 1 && days <= 3650 ? days : null;
    }

    function downloadJson(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `backup_keys_${Date.now()}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    initializeDatabase();
    window.KeyManager = { validateKey };
    window.addEventListener('open-key-manager', showAccessGate);

    keyAccessForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const password = keyAccessPassword.value;
        if (!password) {
            setMessage(keyAccessMessage, 'Escribe la contraseña para continuar.', 'error');
            keyAccessPassword.focus();
            return;
        }
        try {
            const isValid = (await hashValue(password)) === KEY_SYSTEM_PASSWORD_HASH;
            if (isValid) {
                showManager();
            } else {
                setMessage(keyAccessMessage, 'Contraseña incorrecta.', 'error');
                keyAccessPassword.select();
            }
        } catch (error) {
            setMessage(keyAccessMessage, 'No se pudo validar la contraseña.', 'error');
        }
    });

    cancelKeyAccess.addEventListener('click', hideAccessGate);
    keyAccessGate.addEventListener('click', event => {
        if (event.target === keyAccessGate) hideAccessGate();
    });

    durationSelect.addEventListener('change', function () {
        const custom = durationSelect.value === 'custom';
        customDurationWrap.hidden = !custom;
        if (custom) customDurationInput.focus();
    });

    generatorForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (!database) {
            setMessage(generatorMessage, 'Firebase no está conectado.', 'error');
            return;
        }
        const days = getDurationDays();
        if (!days) {
            setMessage(generatorMessage, 'Indica entre 1 y 3650 días.', 'error');
            return;
        }
        const value = createKeyValue();
        const item = {
            key: value,
            durationDays: days,
            createdAt: Date.now(),
            expiration: Date.now() + days * DAY_MS,
            hwid: null,
            status: 'ACTIVE',
        };
        try {
            await database.ref(`keys/${value}`).set(item);
            setMessage(generatorMessage, `Key creada en la nube: ${value}`, 'success');
        } catch (error) {
            setMessage(generatorMessage, 'No se pudo guardar la key. Revisa las reglas de Firebase.', 'error');
        }
    });

    validationButton.addEventListener('click', async function () {
        if (!database) {
            setMessage(validationMessage, 'Firebase no está conectado.', 'error');
            return;
        }
        validationButton.disabled = true;
        const valid = await validateKey(validationInput.value);
        validationButton.disabled = false;
        if (valid) {
            const snapshot = await database.ref(`keys/${normalizeKey(validationInput.value)}`).once('value');
            const item = snapshot.val();
            setMessage(validationMessage, `Key válida. ${item && item.expiration !== 'PERMANENTE' ? `Vence el ${formatDate(Number(item.expiration))}.` : 'Es permanente.'}`, 'success');
        } else {
            setMessage(validationMessage, 'Key inexistente, expirada o vinculada a otro dispositivo.', 'error');
        }
    });

    keysList.addEventListener('click', async function (event) {
        const button = event.target.closest('button');
        if (!button || !database) return;
        const value = normalizeKey(button.dataset.key);
        if (button.classList.contains('key-copy-button')) {
            try {
                await navigator.clipboard.writeText(value);
                button.textContent = 'Copiada';
                window.setTimeout(() => { button.textContent = 'Copiar'; }, 1200);
            } catch (error) {
                setMessage(generatorMessage, 'No se pudo copiar automáticamente.', 'error');
            }
        } else if (button.classList.contains('key-reset-button')) {
            try {
                await database.ref(`keys/${value}`).update({ hwid: null, lastUsedAt: null });
            } catch (error) {
                setMessage(generatorMessage, 'No se pudo liberar el HWID.', 'error');
            }
        } else if (button.classList.contains('key-delete-button')) {
            if (window.confirm('¿Eliminar esta key de la nube?')) await database.ref(`keys/${value}`).remove();
        }
    });

    clearButton.addEventListener('click', async function () {
        if (database && window.confirm('¿Borrar todas las keys de la nube?')) {
            try {
                await database.ref('keys').remove();
            } catch (error) {
                setMessage(generatorMessage, 'No se pudo borrar la base de keys.', 'error');
            }
        }
    });

    exportButton.addEventListener('click', async function () {
        if (!database) return;
        try {
            const snapshot = await database.ref('keys').once('value');
            downloadJson(snapshot.val() || {});
        } catch (error) {
            setMessage(generatorMessage, 'No se pudo exportar el backup.', 'error');
        }
    });

    importButton.addEventListener('click', function () {
        if (!database) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.addEventListener('change', function () {
            const file = input.files && input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async function () {
                try {
                    const data = JSON.parse(reader.result);
                    if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('Invalid backup');
                    await database.ref('keys').update(data);
                    setMessage(generatorMessage, 'Backup importado en la nube.', 'success');
                } catch (error) {
                    setMessage(generatorMessage, 'El archivo de backup no es válido.', 'error');
                }
            };
            reader.readAsText(file);
        });
        input.click();
    });

    closeButton.addEventListener('click', hideManager);
    keyManager.addEventListener('click', event => {
        if (event.target === keyManager) hideManager();
    });
    document.addEventListener('keydown', event => {
        if (!keyManager.hidden && event.key === 'Escape') hideManager();
        if (!keyAccessGate.hidden && event.key === 'Escape') hideAccessGate();
    });
})();
