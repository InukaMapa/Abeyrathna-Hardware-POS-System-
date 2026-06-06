import { supabase } from '../src/config/db.js';

const setAdminEmail = async () => {
    const email = 'admin@chillgrand.com'; // You can change this to your real email
    const username = 'admin';

    console.log(`Updating email for user: ${username} to ${email}...`);

    try {
        const { data, error } = await supabase
            .from('users')
            .update({ email: email })
            .eq('username', username)
            .select();

        if (error) {
            console.error('Error updating user:', error.message);
        } else if (data.length === 0) {
            console.error('User "admin" not found. Please run "node create_admin.js" first.');
        } else {
            console.log('Success! Admin email updated.');
            console.log('You can now test Forgot Password with email:', email);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
};

setAdminEmail();
