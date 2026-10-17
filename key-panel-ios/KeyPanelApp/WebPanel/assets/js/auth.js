(function () {
    'use strict';

    const AUTH_KEY = 'sensiaura-authenticated';
    const PASSWORD_HASH = 'c3273eba3f78c13cfc0b9fd7d075fe0f503be591042d7069be65b9785ab2069b';
    const SECRET_KEY = 's';
    const SECRET_KEY_PRESS_LIMIT = 30;
    let secretKeyPressCount = 0;

    const loginScreen = document.getElementById('login-screen');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('login-password');
    const loginError = document.getElementById('login-error');
    const loginCard = document.querySelector('.login-card');
    const dashboardContainer = document.querySelector('.container');
    const logoutButton = document.getElementById('logout-btn');
    const togglePasswordButton = document.getElementById('toggle-password');
    const passwordVisibilityLabel = document.getElementById('password-visibility-label');
    const capsLockMessage = document.getElementById('login-caps-lock');
    const submitButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;

    if (!loginScreen || !loginForm || !passwordInput || !loginError || !dashboardContainer) {
        return;
    }

    function showDashboard() {
        document.body.classList.remove('auth-locked');
        loginScreen.hidden = true;
        dashboardContainer.setAttribute('aria-hidden', 'false');
        setLoading(false);
    }

    function showLogin() {
        secretKeyPressCount = 0;
        document.body.classList.add('auth-locked');
        loginScreen.hidden = false;
        dashboardContainer.setAttribute('aria-hidden', 'true');
        passwordInput.value = '';
        passwordInput.type = 'password';
        if (togglePasswordButton) {
            togglePasswordButton.classList.remove('is-visible');
            togglePasswordButton.setAttribute('aria-label', 'Mostrar senha');
            togglePasswordButton.setAttribute('aria-pressed', 'false');
        }
        if (passwordVisibilityLabel) {
            passwordVisibilityLabel.textContent = 'Mostrar';
        }
        setLoading(false);
        window.setTimeout(function () {
            passwordInput.focus();
        }, 0);
    }

    async function hashPassword(value) {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Web Crypto API unavailable');
        }

        const encoded = new TextEncoder().encode(value);
        const digest = await window.crypto.subtle.digest('SHA-256', encoded);
        return Array.from(new Uint8Array(digest))
            .map(function (byte) { return byte.toString(16).padStart(2, '0'); })
            .join('');
    }

    function setError(message) {
        loginError.textContent = message;
        loginError.hidden = !message;
        passwordInput.setAttribute('aria-invalid', message ? 'true' : 'false');

        if (message && loginCard) {
            loginCard.classList.remove('is-error');
            void loginCard.offsetWidth;
            loginCard.classList.add('is-error');
        }
    }

    function setLoading(isLoading) {
        if (submitButton) {
            submitButton.disabled = isLoading;
            submitButton.classList.toggle('is-loading', isLoading);
        }
        loginForm.setAttribute('aria-busy', String(isLoading));
    }

    function updateCapsLockState(event) {
        if (!capsLockMessage || !event.getModifierState) {
            return;
        }
        capsLockMessage.hidden = !event.getModifierState('CapsLock');
    }

    function openKeyManager() {
        secretKeyPressCount = 0;
        window.dispatchEvent(new CustomEvent('open-key-manager'));
    }

    function handleSecretKeySequence(event) {
        if (loginScreen.hidden || event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }

        if (event.key && event.key.toLowerCase() === SECRET_KEY) {
            secretKeyPressCount += 1;
            if (secretKeyPressCount >= SECRET_KEY_PRESS_LIMIT) {
                event.preventDefault();
                openKeyManager();
            }
            return;
        }

        secretKeyPressCount = 0;
    }

    if (localStorage.getItem(AUTH_KEY) === 'true') {
        showDashboard();
    } else {
        showLogin();
    }

    document.addEventListener('keydown', handleSecretKeySequence);

    passwordInput.setAttribute('aria-invalid', 'false');
    passwordInput.addEventListener('input', function () {
        if (!loginError.hidden) {
            setError('');
        }
    });
    passwordInput.addEventListener('keydown', updateCapsLockState);
    passwordInput.addEventListener('keyup', updateCapsLockState);
    passwordInput.addEventListener('blur', function () {
        if (capsLockMessage) {
            capsLockMessage.hidden = true;
        }
    });

    if (togglePasswordButton) {
        togglePasswordButton.addEventListener('click', function () {
            const isVisible = passwordInput.type === 'text';
            passwordInput.type = isVisible ? 'password' : 'text';
            togglePasswordButton.classList.toggle('is-visible', !isVisible);
            togglePasswordButton.setAttribute('aria-label', isVisible ? 'Mostrar senha' : 'Ocultar senha');
            togglePasswordButton.setAttribute('aria-pressed', String(!isVisible));
            if (passwordVisibilityLabel) {
                passwordVisibilityLabel.textContent = isVisible ? 'Mostrar' : 'Ocultar';
            }
            passwordInput.focus();
        });
    }

    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        setError('');

        const password = passwordInput.value;
        if (!password) {
            setError('Digite a senha para continuar.');
            passwordInput.focus();
            return;
        }

        setLoading(true);

        try {
            const isValid = (await hashPassword(password)) === PASSWORD_HASH
                || (window.KeyManager && await window.KeyManager.validateKey(password));
            if (isValid) {
                localStorage.setItem(AUTH_KEY, 'true');
                showDashboard();
            } else {
                setError('Senha incorreta. Tente novamente.');
                passwordInput.select();
            }
        } catch (error) {
            setError('Não foi possível validar o acesso. Recarregue a página e tente novamente.');
        } finally {
            setLoading(false);
        }
    });

    if (logoutButton) {
        logoutButton.addEventListener('click', function (event) {
            event.preventDefault();
            localStorage.removeItem(AUTH_KEY);
            setError('');
            showLogin();
        });
    }
})();
