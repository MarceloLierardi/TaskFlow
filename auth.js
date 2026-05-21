// Configuração do Supabase
const supabaseUrl = '';
const supabaseKey = '';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const CURRENT_USER_KEY = 'taskflow_current_user_v2';

// Get the current logged-in user (Usando LocalStorage para não bater limites de API)
async function getCurrentUser() {
    const userStr = localStorage.getItem(CURRENT_USER_KEY);
    if (!userStr) return null;
    return JSON.parse(userStr);
}

// Register a new user
async function registerUser(name, email, password) {
    if (password.length < 6) {
        return { success: false, message: 'A senha deve ter pelo menos 6 caracteres.' };
    }

    try {
        // Encriptando a senha antes de enviar
        const passwordHash = CryptoJS.SHA256(password).toString();

        const { data, error } = await supabaseClient
            .from('usuarios')
            .insert([
                { name: name, email: email, password_hash: passwordHash }
            ])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Código para "unique violation"
                return { success: false, message: 'Este e-mail já está em uso.' };
            }
            return { success: false, message: 'Erro ao cadastrar: ' + error.message };
        }

        return { success: true };
    } catch (err) {
        console.error(err);
        return { success: false, message: 'Erro inesperado ao cadastrar.' };
    }
}

// Login an existing user
async function loginUser(email, password) {
    try {
        const passwordHash = CryptoJS.SHA256(password).toString();

        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .eq('password_hash', passwordHash)
            .single();

        if (error || !data) {
            return { success: false, message: 'E-mail ou senha inválidos.' };
        }

        // Criando uma estrutura parecida com o Auth do Supabase para não quebrar as outras páginas
        const sessionUser = {
            id: data.id,
            email: data.email,
            user_metadata: { name: data.name },
            createdAt: data.created_at
        };

        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));
        return { success: true };
    } catch (err) {
        console.error(err);
        return { success: false, message: 'Erro inesperado ao fazer login.' };
    }
}

// Logout
async function logoutUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = 'login.html';
}

// Route Protection (Call this on every protected page)
async function requireAuth() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return null;
    }
    return currentUser;
}

// Call this on login/register pages to redirect if already logged in
async function requireNoAuth() {
    const currentUser = await getCurrentUser();
    if (currentUser) {
        window.location.href = 'index.html'; // Default redirect
    }
}

// Delete account
async function deleteAccount() {
    if (confirm('Tem certeza que deseja apagar sua conta? Isso será permanente.')) {
        const user = await getCurrentUser();
        if (user) {
            await supabaseClient.from('usuarios').delete().eq('id', user.id);
            await logoutUser();
        }
    }
}
