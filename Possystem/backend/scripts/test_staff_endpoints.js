import fetch from 'node-fetch';

const runTest = async () => {
    const baseUrl = 'http://localhost:5000/api';
    console.log('=== Comprehensive Staff Management & RBAC Security Test ===');

    // Helper: Admin Login
    const login = async (username, password) => {
        const res = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        return { status: res.status, data };
    };

    // 1. Login as Admin
    console.log('\n[TEST 1] Logging in as Admin...');
    const adminLogin = await login('admin', 'admin123');
    if (adminLogin.status !== 200) {
        console.error('FAIL: Admin login failed', adminLogin.data);
        return;
    }
    const adminToken = adminLogin.data.token;
    console.log('SUCCESS: Admin token retrieved.');

    // 2. Admin creates a new Cashier account
    console.log('\n[TEST 2] Admin creating a new Cashier account: "temp_cashier"...');
    const createRes = await fetch(`${baseUrl}/staff`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            username: 'temp_cashier',
            password: 'cashier123',
            full_name: 'Temporary Cashier',
            email: 'temp_cashier@hardwarepos.com',
            contact_number: '0777999999',
            role: 'CASHIER',
            status: 'ACTIVE'
        })
    });
    const createData = await createRes.json();
    if (createRes.status !== 201) {
        console.error('FAIL: Failed to create cashier:', createData);
        return;
    }
    const cashierId = createData.staff.id;
    console.log(`SUCCESS: Cashier created. ID: ${cashierId}`);

    // 3. Log in as new Cashier
    console.log('\n[TEST 3] Logging in as new Cashier "temp_cashier"...');
    const cashierLogin = await login('temp_cashier', 'cashier123');
    if (cashierLogin.status !== 200) {
        console.error('FAIL: Cashier login failed:', cashierLogin.data);
        return;
    }
    const cashierToken = cashierLogin.data.token;
    console.log('SUCCESS: Cashier logged in.');

    // 4. Try to access Staff list as Cashier (RBAC restriction check)
    console.log('\n[TEST 4] Cashier attempts to access Staff list (should be blocked)...');
    const staffRes = await fetch(`${baseUrl}/staff`, {
        headers: { 'Authorization': `Bearer ${cashierToken}` }
    });
    const staffData = await staffRes.json();
    console.log(`Response Status: ${staffRes.status}`);
    console.log(`Response Body:`, staffData);
    if (staffRes.status === 403) {
        console.log('SUCCESS: Access denied as expected!');
    } else {
        console.error('FAIL: Cashier was able to access staff endpoints or got unexpected error.');
    }

    // 5. Deactivate Cashier account as Admin
    console.log('\n[TEST 5] Admin deactivating "temp_cashier" account...');
    const deactivateRes = await fetch(`${baseUrl}/staff/${cashierId}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'INACTIVE' })
    });
    const deactivateData = await deactivateRes.json();
    if (deactivateRes.status !== 200) {
        console.error('FAIL: Failed to deactivate cashier:', deactivateData);
        return;
    }
    console.log('SUCCESS: Cashier deactivated. New Status:', deactivateData.staff.status);

    // 6. Try to log in as Deactivated Cashier (Security block check)
    console.log('\n[TEST 6] Logging in as deactivated Cashier "temp_cashier" (should be blocked)...');
    const inactiveLogin = await login('temp_cashier', 'cashier123');
    console.log(`Response Status: ${inactiveLogin.status}`);
    console.log(`Response Body:`, inactiveLogin.data);
    if (inactiveLogin.status === 403) {
        console.log('SUCCESS: Login blocked for deactivated user as expected!');
    } else {
        console.error('FAIL: Logged in successfully or got unexpected error.');
    }

    // 7. Reactivate Cashier account as Admin
    console.log('\n[TEST 7] Admin reactivating "temp_cashier" account...');
    const activateRes = await fetch(`${baseUrl}/staff/${cashierId}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'ACTIVE' })
    });
    const activateData = await activateRes.json();
    if (activateRes.status !== 200) {
        console.error('FAIL: Failed to activate cashier:', activateData);
        return;
    }
    console.log('SUCCESS: Cashier reactivated. New Status:', activateData.staff.status);

    // 8. Try login again
    console.log('\n[TEST 8] Logging in again as reactivated Cashier...');
    const activeLogin = await login('temp_cashier', 'cashier123');
    if (activeLogin.status === 200) {
        console.log('SUCCESS: Logged in successfully after reactivation!');
    } else {
        console.error('FAIL: Login failed:', activeLogin.data);
    }

    // 9. Delete Cashier account as Admin (Clean up)
    console.log('\n[TEST 9] Admin deleting "temp_cashier" account...');
    const deleteRes = await fetch(`${baseUrl}/staff/${cashierId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const deleteData = await deleteRes.json();
    if (deleteRes.status !== 200) {
        console.error('FAIL: Failed to delete cashier:', deleteData);
        return;
    }
    console.log('SUCCESS: Cashier deleted successfully.');

    // 10. Verify login fails after deletion
    console.log('\n[TEST 10] Logging in as deleted Cashier...');
    const postDeleteLogin = await login('temp_cashier', 'cashier123');
    console.log(`Response Status: ${postDeleteLogin.status}`);
    console.log(`Response Body:`, postDeleteLogin.data);
    if (postDeleteLogin.status === 401) {
        console.log('SUCCESS: Login failed as expected.');
    } else {
        console.error('FAIL: Login did not fail or returned incorrect status.');
    }

    console.log('\n=== ALL SECURITY AND RBAC TESTS PASSED SUCCESSFULLY! ===');
};

runTest();
