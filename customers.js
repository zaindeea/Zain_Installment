// --- نظام إدارة الزبائن (customers.js) ---
let customers = JSON.parse(localStorage.getItem('zain_customers')) || [];

function addCustomer(name, phone, address, sponsor) {
    if (!name) return null;
    const existing = customers.find(c => c.name === name || (phone && c.phone === phone));
    if (existing) {
        updateCustomer(existing.id, { phone, address, sponsor });
        return existing.id;
    }
    const newCustomer = {
        id: Date.now(),
        name, phone: phone || '', address: address || '', sponsor: sponsor || '',
        createdAt: new Date().toISOString().split('T')[0]
    };
    customers.push(newCustomer);
    saveCustomers();
    return newCustomer.id;
}

function getCustomer(id) { return customers.find(c => c.id === id); }
function saveCustomers() { localStorage.setItem('zain_customers', JSON.stringify(customers)); }
function updateCustomer(id, data) {
    const idx = customers.findIndex(c => c.id === id);
    if (idx !== -1) { 
        customers[idx] = { ...customers[idx], ...data }; 
        saveCustomers(); 
    }
}
function deleteCustomerData(id) {
    customers = customers.filter(c => c.id !== id);
    saveCustomers();
}
