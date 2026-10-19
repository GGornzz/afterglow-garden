
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');
const authMessage = document.getElementById('authMessage');

function showMessage(message, type = 'error') {
    authMessage.textContent = message;
    authMessage.className = `form-message ${type}`;
}

function clearMessage() {
    showMessage('', '');
}

function switchTab(tab) {
    const isLogin = tab === 'login';

    loginTab.classList.toggle('active', isLogin);
    registerTab.classList.toggle('active', !isLogin);

    loginForm.classList.toggle('hidden', !isLogin);
    registerForm.classList.toggle('hidden', isLogin);

    formTitle.textContent = isLogin
        ? 'Welcome Back'
        : 'Start Your Journey';

    formSubtitle.textContent = isLogin
        ? 'เข้าสู่ระบบเพื่อดูสวนแห่งความสำเร็จของคุณ'
        : 'สร้างบัญชีเพื่อเริ่มปลูกสวนแห่งความสำเร็จ';

    clearMessage();
}

async function requestAPI(url, body) {
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
        );
    }

    return data;
}

function setLoading(form, loading) {
    const button = form.querySelector('button[type="submit"]');

    if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent;
    }

    button.disabled = loading;
    button.textContent = loading
        ? 'Please wait...'
        : button.dataset.originalText;
}

loginTab.addEventListener('click', () => {
    switchTab('login');
});

registerTab.addEventListener('click', () => {
    switchTab('register');
});

// ======================
// LOGIN
// ======================

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage();

    const email = document
        .getElementById('loginEmail')
        .value.trim();

    const password = document
        .getElementById('loginPassword')
        .value;

    setLoading(loginForm, true);

    try {
        await requestAPI('/api/auth/login', {
            email,
            password
        });

        showMessage(
            'เข้าสู่ระบบสำเร็จ กำลังเปิดสวนของคุณ...',
            'success'
        );

        window.location.replace('/dashboard.html');
    } catch (error) {
        showMessage(error.message);
    } finally {
        setLoading(loginForm, false);
    }
});

// ======================
// REGISTER
// ======================

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage();

    const username = document
        .getElementById('registerUsername')
        .value.trim();

    const email = document
        .getElementById('registerEmail')
        .value.trim();

    const password = document
        .getElementById('registerPassword')
        .value;

    const confirmPassword = document
        .getElementById('confirmPassword')
        .value;

    if (password !== confirmPassword) {
        showMessage('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
        return;
    }

    setLoading(registerForm, true);

    try {
        await requestAPI('/api/auth/register', {
            username,
            email,
            password
        });

        loginForm.reset();

        document.getElementById('loginEmail').value = email;

        registerForm.reset();
        switchTab('login');

        showMessage(
            'สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ',
            'success'
        );
    } catch (error) {
        showMessage(error.message);
    } finally {
        setLoading(registerForm, false);
    }
});

// หาก Login อยู่แล้ว ให้เข้าสู่ Dashboard
async function checkCurrentLogin() {
    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'same-origin',
            cache: 'no-store'
        });

        if (response.ok) {
            window.location.replace('/dashboard.html');
        }
    } catch (error) {
        console.log('Session check:', error.message);
    }
}

checkCurrentLogin();

console.log('🌿 AFTERGLOW Authentication Loaded');
