import { supabase } from '../src/config/db.js';

const checkUsers = async () => {
    console.log('Fetching users...');
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, email, role');

        if (error) {
            console.error('Error fetching users:', error.message);
            return;
        }

        console.log('---------------------------------------------------');
        console.log('Current Users in Database:');
        console.log('---------------------------------------------------');
        if (users.length === 0) {
            console.log('No users found.');
        } else {
            users.forEach(user => {
                console.log(`Username: ${user.username}`);
                console.log(`Email:    ${user.email || '(No email set)'}`);
                console.log(`Role:     ${user.role}`);
                console.log('---------------------------------------------------');
            });
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
};

checkUsers();
