import { supabase } from './src/config/db.js';
import { hashPassword } from './src/utils/passwordUtils.js';

const createAdmin = async () => {
    const username = 'admin';
    const password = 'admin123';
    const role = 'ADMIN';

    try {
        console.log(`Creating user: ${username}...`);

        const hashedPassword = await hashPassword(password);

        const { data, error } = await supabase
            .from('users')
            .insert([
                { username, password_hash: hashedPassword, role }
            ])
            .select();

        if (error) {
            console.error('Error creating user:', error.message);
        } else {
            console.log('User created successfully:', data);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
};

createAdmin();
