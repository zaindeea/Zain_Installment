// --- المتغيرات الرئيسية ---
let users = JSON.parse(localStorage.getItem('zain_users')) || [];
let contracts = JSON.parse(localStorage.getItem('zain_contracts')) || [];
let currentUser = null;
let currentFilter = 'all';
let editingContractId = null;

// تهيئة الحساب الافتراضي للمصمم
if (users.length === 0) {
    users.push({ id: 1, name: 'Zain', pass: '01327798', role: 'admin', perms: { add_contract:true, edit_contract:true, del_contract:true, add_payment:true, manage_cust:true, view_accounts:true } });
    localStorage.setItem('zain_users', JSON.stringify(users));
} else {
    let needsUpdate = false;
    users.forEach(u => {
        if(!u.perms) {
            u.perms = u.role === 'admin' 
                ? { add_contract:true, edit_contract:true, del_contract:true, add_payment:true, manage_cust:true, view_accounts:true } 
                : { add_contract:true, edit_contract:false, del_contract:false, add_payment:true, manage_cust:false, view_accounts:false };
            needsUpdate = true;
        } else if (typeof u.perms.view_accounts === 'undefined') {
             u.perms.view_accounts = (u.role === 'admin');
             needsUpdate = true;
        }
    });
    if(needsUpdate) localStorage.setItem('zain_users', JSON.stringify(users));
}

// دالة فحص الصلاحيات
function hasPerm(permKey) {
    if(!currentUser) return false;
    if(currentUser.role === 'admin') return true;
    return currentUser.perms && currentUser.perms[permKey] === true;
}

window.onload = () => {
    const savedTheme = localStorage.getItem('zain_theme') || 'light';
    if(savedTheme === 'dark') toggleTheme(true);
    
    const savedWaText = localStorage.getItem('wa_template');
    if(savedWaText && document.getElementById('wa-template')) {
        document.getElementById('wa-template').value = savedWaText;
    } else if(document.getElementById('wa-template')) {
        document.getElementById('wa-template').value = "مرحباً [الاسم]، نود تذكيرك بتسديد القسط المتأخر بقيمة [المبلغ] دينار عن شراء ([المنتج]). يرجى التسديد في أقرب وقت وشكراً.";
    }

    const sessionUser = sessionStorage.getItem('zain_logged_in');
    if (sessionUser) {
        currentUser = JSON.parse(sessionUser);
        initApp();
    } else {
        setTimeout(() => {
            document.getElementById('splash-screen').classList.add('hidden');
            document.getElementById('login-screen').classList.remove('hidden');
        }, 2800);
    }
};

function toggleTheme(forceDark = false) {
    const root = document.documentElement;
    const icon = document.getElementById('theme-icon');
    if (forceDark || root.getAttribute('data-theme') !== 'dark') {
        root.setAttribute('data-theme', 'dark');
        localStorage.setItem('zain_theme', 'dark');
        if(icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
    } else {
        root.removeAttribute('data-theme');
        localStorage.setItem('zain_theme', 'light');
        if(icon) { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); }
    }
}

function initLogoAnimation() {
    const logo = document.getElementById('app-logo');
    if(!logo) return;
    setInterval(() => {
        logo.className = '';
        const randAnim = Math.floor(Math.random() * 10) + 1;
        setTimeout(() => { logo.classList.add('anim-' + randAnim); }, 50);
    }, 8000);
}

function login() {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const found = users.find(u => u.name === user && u.pass === pass);
    
    if (found) {
        currentUser = found;
        sessionStorage.setItem('zain_logged_in', JSON.stringify(found));
        document.getElementById('splash-screen').classList.add('hidden');
        document.getElementById('login-screen').classList.add('hidden');
        initApp();
    } else {
        document.getElementById('login-error').innerText = "البيانات غير صحيحة!";
    }
}

function logout() {
    sessionStorage.removeItem('zain_logged_in');
    location.reload();
}

function initApp() {
    document.getElementById('splash-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    
    document.getElementById('current-user-role').innerText = currentUser.role === 'admin' ? 'مدير النظام' : 'موظف';
    
    // إخفاء الأزرار للمدير
    if (currentUser.role !== 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    }

    // إخفاء الأزرار حسب الصلاحيات
    if(!hasPerm('add_contract')) document.querySelectorAll('.perm-add-contract').forEach(el => el.style.display = 'none');
    if(!hasPerm('view_accounts')) document.querySelectorAll('.perm-view-accounts').forEach(el => el.style.display = 'none');
    
    // Auto-fill customer data based on typed name
    document.getElementById('c-name').addEventListener('input', function(e) {
        const val = e.target.value.trim();
        const cust = customers.find(c => c.name === val);
        if(cust) {
            document.getElementById('c-phone').value = cust.phone || '';
            document.getElementById('c-address').value = cust.address || '';
            document.getElementById('c-sponsor').value = cust.sponsor || '';
            document.getElementById('c-record-no').value = cust.recordNo || '';
            document.getElementById('c-page-no').value = cust.pageNo || '';
        }
    });

    initLogoAnimation();
    updateDatalist();
    updateDashboard();
    renderContracts();
    renderCustomers();
    renderUsers();
}

function switchTab(tabId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${tabId}`).classList.remove('hidden');
    document.getElementById(`nav-${tabId}`).classList.add('active');
    
    if(tabId === 'dashboard') updateDashboard();
    if(tabId === 'accounts') updateAccounts();
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// --- واتساب ---
function formatWaNumber(phone) {
    if(!phone) return '';
    phone = phone.trim();
    if(phone.startsWith('0')) return '964' + phone.substring(1);
    if(phone.startsWith('+')) return phone.substring(1);
    return phone;
}

function openWhatsApp(phone, defaultMsg = '') {
    if(!phone) return alert('لا يوجد رقم هاتف للزبون');
    let formattedPhone = formatWaNumber(phone);
    let url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(defaultMsg)}`;
    window.open(url, '_blank');
}

function saveWaTemplate() {
    const text = document.getElementById('wa-template').value;
    localStorage.setItem('wa_template', text);
    alert('تم حفظ نص رسالة المتأخرين بنجاح!');
}

function sendBulkWhatsApp() {
    const template = document.getElementById('wa-template').value;
    const today = new Date().toISOString().split('T')[0];
    
    let delayedList = [];
    contracts.forEach(c => {
        c.payments.forEach(p => {
            if (!p.paid && p.date < today) {
                const cust = getCustomer(c.customerId);
                if(cust && cust.phone && cust.phone.length > 5) {
                    delayedList.push({ cust, contract: c, payment: p });
                }
            }
        });
    });

    if (delayedList.length === 0) return alert('لا يوجد زبائن متأخرين لديهم أرقام هواتف مسجلة.');
    if (!confirm(`تحذير: سيتم فتح ${delayedList.length} نافذة واتساب. هل تأكدت من السماح بالنوافذ المنبثقة (Pop-ups) من المتصفح؟`)) return;

    delayedList.forEach((item, index) => {
        let msg = template.replace('\[الاسم\]', item.cust.name)
                          .replace('\[المبلغ\]', item.payment.amount.toLocaleString())
                          .replace('\[المنتج\]', item.contract.product);
        
        let url = `https://wa.me/${formatWaNumber(item.cust.phone)}?text=${encodeURIComponent(msg)}`;
        setTimeout(() => { window.open(url, '_blank'); }, index * 1000);
    });
}

function calcPreview() {
    const price = parseFloat(document.getElementById('c-price').value) || 0;
    const percent = parseFloat(document.getElementById('c-percent').value) || 0;
    const advance = parseFloat(document.getElementById('c-advance').value) || 0;
    let months = parseInt(document.getElementById('c-months').value) || 1;
    if (months < 1) months = 1;

    const interest = price * (percent / 100);
    const total = price + interest;
    const rem = total - advance;
    const monthly = rem > 0 ? (rem / months) : 0;

    document.getElementById('pre-total').innerText = total.toLocaleString();
    document.getElementById('pre-rem').innerText = rem.toLocaleString();
    document.getElementById('pre-monthly').innerText = Math.ceil(monthly).toLocaleString();
    return { total, rem, monthly: Math.ceil(monthly) };
}

function updateDatalist() {
    const dl = document.getElementById('customers-list');
    dl.innerHTML = '';
    customers.forEach(c => {
        let opt = document.createElement('option');
        opt.value = c.name;
        dl.appendChild(opt);
    });
}

function openNewContractModal() {
    editingContractId = null;
    document.getElementById('contract-modal-title').innerText = 'عقد جديد';
    document.getElementById('btn-save-contract').innerText = 'حفظ وإنشاء العقد';
    
    document.getElementById('c-name').value = '';
    document.getElementById('c-phone').value = '';
    document.getElementById('c-address').value = '';
    document.getElementById('c-sponsor').value = '';
    document.getElementById('c-record-no').value = '';
    document.getElementById('c-page-no').value = '';
    document.getElementById('c-product').value = '';
    document.getElementById('c-price').value = '';
    document.getElementById('c-advance').value = '0';
    document.getElementById('c-months').value = '1';
    
    openModal('new-contract-modal');
}

function editContractBtn(contractId) {
    const contract = contracts.find(c => c.id === contractId);
    const cust = getCustomer(contract.customerId);
    if(!contract || !cust) return;

    editingContractId = contractId;
    document.getElementById('contract-modal-title').innerText = 'تعديل العقد (سيؤدي لجدولة جديدة)';
    document.getElementById('btn-save-contract').innerText = 'حفظ التعديلات وإعادة الجدولة';
    
    document.getElementById('c-name').value = cust.name;
    document.getElementById('c-phone').value = cust.phone;
    document.getElementById('c-address').value = cust.address;
    document.getElementById('c-sponsor').value = cust.sponsor;
    document.getElementById('c-record-no').value = cust.recordNo || '';
    document.getElementById('c-page-no').value = cust.pageNo || '';
    
    document.getElementById('c-product').value = contract.product;
    document.getElementById('c-date').value = contract.buyDate;
    
    document.getElementById('c-price').value = contract.totalPrice; 
    document.getElementById('c-advance').value = contract.advance;
    document.getElementById('c-months').value = contract.payments.length;
    document.getElementById('c-percent').value = "0"; 
    
    calcPreview();
    openModal('new-contract-modal');
}

function saveContract() {
    const name = document.getElementById('c-name').value;
    const dateInput = document.getElementById('c-date').value;
    if (!name || !dateInput) return alert('يرجى إدخال اسم الزبون وتاريخ الشراء');

    if(editingContractId) {
        if(!confirm('تنبيه هام: تعديل بيانات العقد سيؤدي إلى إعادة جدولة الدفعات وتصفير التسديدات السابقة. هل أنت متأكد؟')) {
            return;
        }
    }

    // This handles appending to an existing customer or creating a new one
    const customerId = addCustomer(
        name, 
        document.getElementById('c-phone').value,
        document.getElementById('c-address').value, 
        document.getElementById('c-sponsor').value,
        document.getElementById('c-record-no').value,
        document.getElementById('c-page-no').value
    );

    const calc = calcPreview();
    const months = Math.max(1, parseInt(document.getElementById('c-months').value) || 1);
    
    let payments = [];
    let curDate = new Date(dateInput);
    for (let i = 1; i <= months; i++) {
        curDate.setMonth(curDate.getMonth() + 1);
        payments.push({ id: i, date: curDate.toISOString().split('T')[0], amount: calc.monthly, paid: false, payDate: null });
    }

    const contractData = {
        id: editingContractId ? editingContractId : Date.now(), 
        customerId: customerId,
        product: document.getElementById('c-product').value,
        buyDate: dateInput, 
        totalPrice: calc.total,
        advance: parseFloat(document.getElementById('c-advance').value) || 0,
        remaining: calc.rem, 
        status: calc.rem <= 0 ? 'completed' : 'active', 
        payments: payments
    };

    if(editingContractId) {
        const idx = contracts.findIndex(c => c.id === editingContractId);
        contracts[idx] = contractData;
    } else {
        contracts.push(contractData);
    }
    
    localStorage.setItem('zain_contracts', JSON.stringify(contracts));
    
    closeModal('new-contract-modal');
    updateDatalist();
    renderContracts();
    updateDashboard();
    renderCustomers();
    
    if (confirm('تم حفظ العقد بنجاح! هل تريد طباعة العقد (أو تصديره كـ PDF) الآن؟')) {
        printContract(contractData.id);
    }
    
    switchTab('contracts');
}

// --- عرض العقود ---
let currentContractPage = 1;
const itemsPerPage = 8;

function setFilter(status, btnElement) {
    currentFilter = status;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btnElement.classList.add('active');
    currentContractPage = 1;
    renderContracts();
}

function renderContracts() {
    const list = document.getElementById('contracts-list');
    const search = document.getElementById('search-contract').value.toLowerCase();
    
    let filtered = contracts.filter(c => {
        const cust = getCustomer(c.customerId);
        const matchName = cust ? cust.name.toLowerCase().includes(search) : false;
        const matchStatus = currentFilter === 'all' ? true : c.status === currentFilter;
        return matchName && matchStatus;
    });
    
    filtered.sort((a,b) => b.id - a.id);
    
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    if (currentContractPage > totalPages) currentContractPage = totalPages;
    
    const start = (currentContractPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);
    
    list.innerHTML = '';
    
    if(paginated.length === 0) {
        list.innerHTML = '<div class="text-center text-muted mt-20"><i class="fa fa-folder-open mb-10" style="font-size:40px;"></i><br>لا توجد عقود مطابقة</div>';
    }
    
    paginated.forEach(c => {
        const cust = getCustomer(c.customerId);
        const cName = cust ? cust.name : 'غير معروف';
        const isCompleted = c.status === 'completed';
        
        let card = document.createElement('div');
        card.className = 'list-item';
        card.innerHTML = `
            <div class="list-item-header">
                <h4><i class="fa fa-user-circle text-primary"></i> ${cName}</h4>
                <div class="action-btns">
                    ${cust && cust.phone ? `<button class="icon-btn text-green" onclick="openWhatsApp('${cust.phone}')"><i class="fab fa-whatsapp"></i></button>` : ''}
                    <span class="badge" style="background:${isCompleted ? 'rgba(49,162,76,0.1)' : 'rgba(255,96,101,0.1)'}; color:${isCompleted ? 'var(--success)' : 'var(--accent)'};">${isCompleted ? 'مكتمل' : 'مستمر'}</span>
                </div>
            </div>
            <div class="list-item-body">
                <span><i class="fa fa-box"></i> ${c.product}</span>
                <span class="text-red font-bold">المتبقي: ${c.remaining.toLocaleString()}</span>
            </div>
            <div class="list-item-footer">
                <span style="font-size:12px; color:var(--text-muted);">${c.buyDate}</span>
                <div class="action-btns">
                    <button class="btn btn-outline btn-sm" onclick="printContract(${c.id})" title="طباعة"><i class="fa fa-print"></i></button>
                    <button class="btn btn-primary btn-sm" onclick="openPayments(${c.id})"><i class="fa fa-list"></i> الدفعات</button>
                    ${hasPerm('edit_contract') ? `<button class="btn btn-outline btn-sm" onclick="editContractBtn(${c.id})"><i class="fa fa-edit"></i></button>` : ''}
                    ${hasPerm('del_contract') ? `<button class="btn btn-outline-danger btn-sm" onclick="deleteContract(${c.id})"><i class="fa fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
        list.appendChild(card);
    });
    
    const pg = document.getElementById('contracts-pagination');
    pg.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        let btn = document.createElement('button');
        btn.className = `page-btn ${i === currentContractPage ? 'active' : ''}`;
        btn.innerText = i;
        btn.onclick = () => { currentContractPage = i; renderContracts(); };
        pg.appendChild(btn);
    }
}

function deleteContract(id) {
    if(confirm('هل أنت متأكد من حذف العقد نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) {
        contracts = contracts.filter(c => c.id !== id);
        localStorage.setItem('zain_contracts', JSON.stringify(contracts));
        renderContracts(); updateDashboard();
    }
}

// --- الدفعات ---
let activeContractId = null;
function openPayments(id) {
    activeContractId = id;
    const contract = contracts.find(c => c.id === id);
    const cust = getCustomer(contract.customerId);
    document.getElementById('pay-title').innerText = `دفعات: ${cust ? cust.name : ''}`;
    
    const list = document.getElementById('pay-list');
    list.innerHTML = '';
    
    const today = new Date().toISOString().split('T')[0];
    
    contract.payments.forEach(p => {
        let isDelayed = !p.paid && p.date < today;
        let card = document.createElement('div');
        card.className = 'list-item';
        card.innerHTML = `
            <div class="list-item-header" style="border:none; padding:0;">
                <div>
                    <strong>الدفعة #${p.id}</strong>
                    <div style="font-size:12px; color:${isDelayed ? 'var(--danger)' : 'var(--text-muted)'}; margin-top:3px;"><i class="fa fa-calendar-alt"></i> ${p.date}</div>
                </div>
                ${p.paid 
                    ? `<span class="text-green font-bold"><i class="fa fa-check-circle"></i> مسدد</span>` 
                    : `<div style="display:flex; align-items:center; gap:5px;">
                         <input type="number" id="pay-amt-${p.id}" value="${p.amount}" style="width:70px; padding:5px; border-radius:5px; border:1px solid var(--border); background:var(--bg-color); color:var(--text-main);">
                         ${hasPerm('add_payment') ? `<button class="btn btn-success btn-sm" onclick="payInstallment(${p.id})">تسديد</button>` : ''}
                       </div>`
                }
            </div>
            ${p.paid ? `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:10px; border-top:1px solid var(--border);">
                <span style="font-size:12px; color:var(--text-muted);">سددت في: ${p.payDate}</span>
                <button class="btn btn-outline btn-sm" onclick="printReceipt(${contract.id}, ${p.id})"><i class="fa fa-print"></i> وصل</button>
            </div>
            ` : ''}
        `;
        list.appendChild(card);
    });
    openModal('payments-modal');
}

function payInstallment(payId) {
    const contract = contracts.find(c => c.id === activeContractId);
    const payment = contract.payments.find(p => p.id === payId);
    const amt = parseFloat(document.getElementById(`pay-amt-${payId}`).value);
    
    if (isNaN(amt) || amt <= 0) return alert('مبلغ غير صحيح');
    if (confirm('تأكيد الاستلام؟')) {
        payment.amount = amt;
        payment.paid = true;
        payment.payDate = new Date().toISOString().split('T')[0];
        contract.remaining -= amt;
        
        if (contract.remaining <= 0) {
            contract.remaining = 0;
            contract.status = 'completed';
        }
        
        localStorage.setItem('zain_contracts', JSON.stringify(contracts));
        openPayments(activeContractId);
        renderContracts();
        updateDashboard();
        updateAccounts();
    }
}

// --- الإحصائيات والحسابات ---
function updateDashboard() {
    let sales = 0, collected = 0, rem = 0;
    const delayedList = document.getElementById('delayed-list');
    delayedList.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];
    let delayCount = 0;

    contracts.forEach(c => {
        sales += c.totalPrice;
        rem += c.remaining;
        collected += c.advance;
        
        c.payments.forEach(p => {
            if (p.paid) {
                collected += p.amount;
            } else if (p.date < today) {
                delayCount++;
                const cust = getCustomer(c.customerId);
                let item = document.createElement('div');
                item.className = 'list-item';
                item.style.borderLeft = '4px solid var(--danger)';
                item.innerHTML = `
                    <div class="list-item-header" style="border:none; padding:0;">
                        <div>
                            <strong>${cust?cust.name:''}</strong>
                            <div class="text-red mt-5" style="font-size:12px;">استحقت في: ${p.date}</div>
                        </div>
                        <div class="text-center">
                            <div class="font-bold">${p.amount}</div>
                            <div class="action-btns mt-5">
                                ${cust && cust.phone ? `<button class="btn btn-whatsapp btn-sm" onclick="openWhatsApp('${cust.phone}')"><i class="fab fa-whatsapp"></i></button>` : ''}
                                <button class="btn btn-outline btn-sm" onclick="switchTab('contracts'); openPayments(${c.id})">الذهاب</button>
                            </div>
                        </div>
                    </div>
                `;
                delayedList.appendChild(item);
            }
        });
    });

    if(delayCount === 0) {
        delayedList.innerHTML = '<div class="text-center text-muted"><i class="fa fa-check-circle text-green mb-10" style="font-size:30px;"></i><br>لا توجد دفعات متأخرة!</div>';
    }

    document.getElementById('stat-total-sales').innerText = sales.toLocaleString();
    document.getElementById('stat-collected').innerText = collected.toLocaleString();
    document.getElementById('stat-remaining').innerText = rem.toLocaleString();
    document.getElementById('stat-delayed').innerText = delayCount;
}

function updateAccounts() {
    let totalSales = 0, totalCollected = 0, totalRemaining = 0;
    let recentPayments = [];

    contracts.forEach(c => {
        totalSales += c.totalPrice;
        totalRemaining += c.remaining;
        totalCollected += c.advance; 
        
        c.payments.forEach(p => {
            if (p.paid) {
                totalCollected += p.amount;
                recentPayments.push({ ...p, custId: c.customerId, product: c.product });
            }
        });
    });

    document.getElementById('acc-total-capital').innerText = totalSales.toLocaleString() + ' دينار';
    document.getElementById('acc-cash').innerText = totalCollected.toLocaleString();
    document.getElementById('acc-debt').innerText = totalRemaining.toLocaleString();

    const recentList = document.getElementById('recent-payments-list');
    recentList.innerHTML = '';
    
    recentPayments.sort((a,b) => new Date(b.payDate) - new Date(a.payDate));
    recentPayments.slice(0, 10).forEach(p => {
        const cust = getCustomer(p.custId);
        let item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-header" style="border:none; padding:0;">
                <div>
                    <strong><i class="fa fa-arrow-down text-success"></i> ${p.amount.toLocaleString()} دينار</strong>
                    <div class="text-muted mt-5" style="font-size:12px;">من: ${cust?cust.name:''} (${p.product})</div>
                </div>
                <div style="font-size:12px; color:var(--text-muted);">${p.payDate}</div>
            </div>
        `;
        recentList.appendChild(item);
    });
    
    if(recentPayments.length === 0) {
        recentList.innerHTML = '<div class="text-center text-muted">لا توجد تحصيلات بعد</div>';
    }
}

// --- الزبائن وملف القيود ---
function renderCustomers() {
    const search = document.getElementById('search-customer').value.toLowerCase();
    const list = document.getElementById('customers-list');
    list.innerHTML = '';
    
    let result = customers.filter(c => c.name.toLowerCase().includes(search) || c.phone.includes(search));
    
    if(result.length === 0) {
        list.innerHTML = '<div class="text-center text-muted mt-20">لا يوجد زبائن مطابقين</div>';
    }
    
    result.forEach(c => {
        let card = document.createElement('div');
        card.className = 'list-item';
        card.innerHTML = `
            <div class="list-item-header" style="border:none; padding:0;">
                <h4 style="color:var(--text-main);"><i class="fa fa-user-circle text-primary"></i> ${c.name}</h4>
                <div class="action-btns">
                    ${c.phone ? `
                    <button class="icon-btn text-green" onclick="openWhatsApp('${c.phone}')"><i class="fab fa-whatsapp"></i></button>
                    <a href="tel:${c.phone}" class="icon-btn text-primary"><i class="fa fa-phone"></i></a>
                    ` : ''}
                </div>
            </div>
            <div class="mt-10" style="font-size:13px; color:var(--text-muted); display:grid; grid-template-columns:1fr 1fr; gap:5px;">
                <div><i class="fa fa-mobile-alt"></i> ${c.phone || '-'}</div>
                <div><i class="fa fa-map-marker-alt"></i> ${c.address || '-'}</div>
            </div>
            <div class="list-item-footer mt-10" style="border-top:1px solid var(--border); padding-top:10px;">
                <button class="btn btn-primary w-100" onclick="viewCustomerProfile(${c.id})">ملف القيود <i class="fa fa-folder-open ml-5"></i></button>
                ${hasPerm('manage_cust') ? `
                <button class="btn btn-outline btn-sm ml-10" onclick="editCustomerModal(${c.id})"><i class="fa fa-edit"></i></button>
                <button class="btn btn-outline-danger btn-sm" onclick="deleteCustomerBtn(${c.id})"><i class="fa fa-trash"></i></button>
                ` : ''}
            </div>
        `;
        list.appendChild(card);
    });
}

function viewCustomerProfile(custId) {
    const cust = getCustomer(custId);
    document.getElementById('prof-cust-name').innerText = cust.name;
    document.getElementById('prof-cust-phone').innerText = cust.phone || 'لا يوجد رقم';
    document.getElementById('prof-cust-address').innerText = cust.address || 'لا يوجد عنوان';
    document.getElementById('prof-cust-sponsor').innerText = cust.sponsor || 'لا يوجد كفيل';
    document.getElementById('prof-cust-record').innerText = cust.recordNo || '-';
    document.getElementById('prof-cust-page').innerText = cust.pageNo || '-';

    const custContracts = contracts.filter(c => c.customerId === custId);
    const list = document.getElementById('prof-contracts-list');
    list.innerHTML = '';
    
    if(custContracts.length === 0) {
        list.innerHTML = '<div class="text-center text-muted">لا توجد قيود مسجلة لهذا الزبون</div>';
    } else {
        custContracts.forEach((c, index) => {
            const isCompleted = c.status === 'completed';
            let item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-header">
                    <h4>قيد #${index+1} - ${c.product}</h4>
                    <span class="badge" style="background:${isCompleted ? 'rgba(49,162,76,0.1)' : 'rgba(255,96,101,0.1)'}; color:${isCompleted ? 'var(--success)' : 'var(--accent)'};">${isCompleted ? 'مكتمل' : 'مستمر'}</span>
                </div>
                <div class="list-item-body">
                    <span>السعر: ${c.totalPrice.toLocaleString()}</span>
                    <span class="text-red font-bold">المتبقي: ${c.remaining.toLocaleString()}</span>
                </div>
                <div class="list-item-footer">
                    <span style="font-size:12px; color:var(--text-muted);">${c.buyDate}</span>
                    <button class="btn btn-primary btn-sm" onclick="closeModal('customer-profile-modal'); openPayments(${c.id})">الدفعات</button>
                </div>
            `;
            list.appendChild(item);
        });
    }
    openModal('customer-profile-modal');
}

function editCustomerModal(id) {
    const cust = getCustomer(id);
    if(!cust) return;
    document.getElementById('edit-cust-id').value = id;
    document.getElementById('edit-cust-name').value = cust.name;
    document.getElementById('edit-cust-phone').value = cust.phone;
    document.getElementById('edit-cust-address').value = cust.address;
    document.getElementById('edit-cust-sponsor').value = cust.sponsor;
    document.getElementById('edit-cust-record-no').value = cust.recordNo || '';
    document.getElementById('edit-cust-page-no').value = cust.pageNo || '';
    openModal('edit-customer-modal');
}

function saveCustomerEdit() {
    const id = parseInt(document.getElementById('edit-cust-id').value);
    const name = document.getElementById('edit-cust-name').value;
    const phone = document.getElementById('edit-cust-phone').value;
    const address = document.getElementById('edit-cust-address').value;
    const sponsor = document.getElementById('edit-cust-sponsor').value;
    const recordNo = document.getElementById('edit-cust-record-no').value;
    const pageNo = document.getElementById('edit-cust-page-no').value;
    
    if(!name) return alert('اسم الزبون مطلوب');
    
    updateCustomer(id, { name, phone, address, sponsor, recordNo, pageNo });
    closeModal('edit-customer-modal');
    renderCustomers();
    renderContracts();
    alert('تم تحديث بيانات الزبون بنجاح');
}

function deleteCustomerBtn(id) {
    const hasContracts = contracts.some(c => c.customerId === id);
    if(hasContracts) {
        alert('لا يمكن حذف الزبون لأن لديه عقود مسجلة. قم بحذف العقود المرتبطة أولاً.');
        return;
    }
    if(confirm('هل أنت متأكد من حذف هذا الزبون نهائياً؟')) {
        deleteCustomerData(id);
        renderCustomers();
    }
}

// --- الإعدادات (إدارة الموظفين) ---
function togglePermsBox() {
    const role = document.getElementById('new-emp-role').value;
    document.getElementById('emp-perms-box').style.display = role === 'admin' ? 'none' : 'block';
}

function openEmployeesModal() {
    document.getElementById('new-emp-role').value = 'employee';
    togglePermsBox();
    renderUsers();
    openModal('employee-settings-modal');
}

function saveEmployee() {
    const name = document.getElementById('new-emp-name').value.trim();
    const pass = document.getElementById('new-emp-pass').value.trim();
    const role = document.getElementById('new-emp-role').value;
    
    if (!name || !pass) return alert('أكمل البيانات');
    if (name.toLowerCase() === 'zain') return alert('هذا الاسم غير متاح للاستخدام');
    
    const isEdit = document.getElementById('emp-edit-id').value;
    if (!isEdit && users.find(u => u.name === name)) return alert('الاسم موجود مسبقاً');
    
    const perms = {
        add_contract: document.getElementById('perm-add-contract').checked,
        edit_contract: document.getElementById('perm-edit-contract').checked,
        del_contract: document.getElementById('perm-del-contract').checked,
        add_payment: document.getElementById('perm-add-payment').checked,
        manage_cust: document.getElementById('perm-manage-cust').checked,
        view_accounts: document.getElementById('perm-view-accounts').checked
    };
    
    if(isEdit) {
        const idx = users.findIndex(u => u.id == isEdit);
        users[idx] = { id: users[idx].id, name, pass, role, perms };
        document.getElementById('emp-edit-id').value = '';
    } else {
        users.push({ id: Date.now(), name, pass, role, perms });
    }
    
    localStorage.setItem('zain_users', JSON.stringify(users));
    
    document.getElementById('new-emp-name').value = '';
    document.getElementById('new-emp-pass').value = '';
    document.getElementById('btn-save-emp').innerText = 'إضافة / حفظ الموظف';
    renderUsers();
}

function editUser(id) {
    const user = users.find(u => u.id === id);
    if(!user) return;
    document.getElementById('emp-edit-id').value = user.id;
    document.getElementById('new-emp-name').value = user.name;
    document.getElementById('new-emp-pass').value = user.pass;
    document.getElementById('new-emp-role').value = user.role;
    
    if(user.perms) {
        document.getElementById('perm-add-contract').checked = user.perms.add_contract || false;
        document.getElementById('perm-edit-contract').checked = user.perms.edit_contract || false;
        document.getElementById('perm-del-contract').checked = user.perms.del_contract || false;
        document.getElementById('perm-add-payment').checked = user.perms.add_payment || false;
        document.getElementById('perm-manage-cust').checked = user.perms.manage_cust || false;
        document.getElementById('perm-view-accounts').checked = user.perms.view_accounts || false;
    }
    togglePermsBox();
    document.getElementById('btn-save-emp').innerText = 'حفظ التعديلات للموظف';
}

function deleteUser(id) {
    if (users.length === 1) return alert('لا يمكن حذف المستخدم الوحيد');
    if (id === currentUser.id) return alert('لا يمكنك حذف حسابك الحالي');
    users = users.filter(u => u.id !== id);
    localStorage.setItem('zain_users', JSON.stringify(users));
    renderUsers();
}

function renderUsers() {
    const list = document.getElementById('users-list');
    list.innerHTML = '';
    users.forEach(u => {
        if(u.name === 'Zain') return;

        let card = document.createElement('div');
        card.className = 'list-item';
        card.innerHTML = `
            <div class="list-item-header" style="border:none; padding:0;">
                <div>
                    <strong><i class="fa fa-user"></i> ${u.name}</strong>
                    <span class="badge ml-10" style="background:var(--bg-color); color:var(--text-muted);">${u.role==='admin'?'مدير':'موظف'}</span>
                </div>
                <div>
                    <button class="icon-btn text-primary" onclick="editUser(${u.id})"><i class="fa fa-edit"></i></button>
                    <button class="icon-btn text-danger" onclick="deleteUser(${u.id})"><i class="fa fa-trash"></i></button>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

function exportData() {
    const data = { users, contracts, customers };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Zain_Backup_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
}

function importData() {
    const file = document.getElementById('import-file').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.users && data.contracts && data.customers) {
                localStorage.setItem('zain_users', JSON.stringify(data.users));
                localStorage.setItem('zain_contracts', JSON.stringify(data.contracts));
                localStorage.setItem('zain_customers', JSON.stringify(data.customers));
                alert('تم استعادة البيانات بنجاح! سيتم تحديث الصفحة.');
                location.reload();
            } else { alert('ملف النسخة الاحتياطية غير صحيح'); }
        } catch (err) { alert('خطأ في قراءة الملف'); }
    };
    reader.readAsText(file);
}

// --- نظام الطباعة والتصدير المعالج للجوال (Mobile Print Fix & PDF) ---
function triggerPrint() {
    document.body.classList.add('printing');
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.body.classList.remove('printing');
            document.getElementById('print-area').innerHTML = '';
        }, 1000);
    }, 100);
}

// --- طباعة العقود والوصولات ---
function printContract(contractId) {
    const contract = contracts.find(c => c.id === contractId);
    const cust = getCustomer(contract.customerId);
    const printArea = document.getElementById('print-area');
    
    printArea.innerHTML = `
        <div class="print-header">عـقــد بـيـع بـالـتـقـسـيـط<br><span style="font-size:12px; color:#555; background:#eee; padding:3px 10px; border-radius:10px; font-weight:normal;">نسخة العقد الأساسية</span></div>
        <div class="print-row"><span>رقم العقد: <b style="color:var(--primary)">#${contract.id.toString().slice(-6)}</b></span><span>تاريخ الشراء: ${contract.buyDate}</span></div>
        
        <h4 style="margin-top:20px; border-bottom:1px solid #ccc; padding-bottom:5px;">الطرفان</h4>
        <div class="print-box">
            <div class="print-row"><span>الطرف الأول (البائع):</span> <strong>Zain للاقساط</strong></div>
            <div class="print-row"><span>الطرف الثاني (المشتري):</span> <strong>${cust ? cust.name : ''}</strong></div>
            <div class="print-row"><span>رقم الهاتف:</span> <strong>${cust ? cust.phone : ''}</strong></div>
            <div class="print-row"><span>العنوان:</span> <strong>${cust ? cust.address : ''}</strong></div>
            <div class="print-row"><span>الكفيل:</span> <strong>${cust ? cust.sponsor : 'لا يوجد'}</strong></div>
            ${cust && cust.recordNo ? `<div class="print-row"><span>رقم السجل:</span> <strong>${cust.recordNo}</strong></div>` : ''}
            ${cust && cust.pageNo ? `<div class="print-row"><span>رقم الصفحة:</span> <strong>${cust.pageNo}</strong></div>` : ''}
        </div>

        <h4 style="margin-top:20px; border-bottom:1px solid #ccc; padding-bottom:5px;">تفاصيل المبيع والأقساط</h4>
        <div class="print-box">
            <div class="print-row"><span>نوع المنتج:</span> <strong>${contract.product}</strong></div>
            <div class="print-row"><span>إجمالي المبلغ الكلي:</span> <strong>${contract.totalPrice.toLocaleString()} دينار</strong></div>
            <div class="print-row"><span>الدفعة المقدمة (إن وجدت):</span> <strong>${contract.advance.toLocaleString()} دينار</strong></div>
            <div class="print-row"><span>المبلغ المتبقي للتقسيط:</span> <strong class="text-red" style="font-size:16px;">${contract.remaining.toLocaleString()} دينار</strong></div>
            <div class="print-row"><span>مدة الأقساط:</span> <strong>${contract.payments.length} أشهر</strong></div>
            <div class="print-row"><span>مبلغ القسط الشهري:</span> <strong class="text-green" style="font-size:16px;">${contract.payments.length > 0 ? contract.payments[0].amount.toLocaleString() : 0} دينار</strong></div>
        </div>

        <div class="print-footer" style="margin-top:50px;">
            <div>توقيع الطرف الثاني (المشتري)<br><br>..................................</div>
            <div>توقيع الطرف الأول (البائع)<br><br>..................................</div>
        </div>
    `;
    triggerPrint();
}

function printReceipt(contractId, payId) {
    const contract = contracts.find(c => c.id === contractId);
    const payment = contract.payments.find(p => p.id === payId);
    const cust = getCustomer(contract.customerId);
    const paidTotal = contract.totalPrice - contract.remaining;

    const printArea = document.getElementById('print-area');
    printArea.innerHTML = `
        <div class="print-header">وصــل قـسـط<br><span style="font-size:12px; color:#555; background:#eee; padding:3px 10px; border-radius:10px; font-weight:normal;">استلام دفعة نقدية</span></div>
        <div class="print-row"><span>رقم الوصل: <b style="color:var(--danger)">#${payId}${contractId.toString().slice(-4)}</b></span><span>التاريخ: ${payment.payDate}</span></div>
        <div class="print-inline"><span>استلمنا من السيد/ة:</span><span>${cust ? cust.name : ''}</span></div>
        <div class="print-row mt-10"><span>مبلغاً وقدره:</span> <span class="text-green font-bold" style="font-size:16px;">${payment.amount.toLocaleString()} دينار</span></div>
        <div class="print-inline"><span>وذلك عن:</span><span>الدفعة الشهرية رقم (${payment.id}) لشراء (${contract.product})</span></div>
        <div class="print-box mt-10">
            <div class="print-row"><span>إجمالي المبالغ المسددة:</span> <span>${paidTotal.toLocaleString()} دينار</span></div>
            <div class="print-row mt-5"><span>الرصيد المتبقي:</span> <span class="text-red font-bold">${contract.remaining.toLocaleString()} دينار</span></div>
        </div>
        <div class="print-footer">
            <div>توقيع الزبون</div>
            <div>توقيع الإدارة</div>
        </div>
    `;
    triggerPrint();
}

// --- إعداد التقارير المالية التفصيلية (يومي، شهري، سنوي) ---
function setReportDate(type) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    
    if (type === 'today') {
        document.getElementById('report-from').value = todayStr;
        document.getElementById('report-to').value = todayStr;
    } else if (type === 'month') {
        document.getElementById('report-from').value = `${yyyy}-${mm}-01`;
        const lastDay = new Date(yyyy, today.getMonth() + 1, 0).getDate();
        document.getElementById('report-to').value = `${yyyy}-${mm}-${lastDay}`;
    } else if (type === 'year') {
        document.getElementById('report-from').value = `${yyyy}-01-01`;
        document.getElementById('report-to').value = `${yyyy}-12-31`;
    }
}

function generateReportHTML() {
    const fromDate = document.getElementById('report-from').value;
    const toDate = document.getElementById('report-to').value;
    
    if(!fromDate || !toDate) {
        alert('يرجى تحديد فترة التقرير (من - إلى)');
        return null;
    }

    let periodSales = 0;
    let periodCollected = 0;
    
    let newContractsLog = [];
    let paymentsLog = [];

    contracts.forEach(c => {
        const cust = getCustomer(c.customerId);
        const custName = cust ? cust.name : 'غير معروف';

        // مبيعات تمت في هذه الفترة
        if (c.buyDate >= fromDate && c.buyDate <= toDate) {
            periodSales += c.totalPrice;
            periodCollected += c.advance;
            newContractsLog.push({
                date: c.buyDate,
                customer: custName,
                product: c.product,
                total: c.totalPrice,
                advance: c.advance
            });
        }

        // دفعات تم تسديدها في هذه الفترة
        c.payments.forEach(p => {
            if (p.paid && p.payDate >= fromDate && p.payDate <= toDate) {
                periodCollected += p.amount;
                paymentsLog.push({
                    date: p.payDate,
                    customer: custName,
                    product: c.product,
                    amount: p.amount,
                    installmentNo: p.id
                });
            }
        });
    });

    newContractsLog.sort((a,b) => new Date(a.date) - new Date(b.date));
    paymentsLog.sort((a,b) => new Date(a.date) - new Date(b.date));

    let html = `
        <div class="print-header">Zain للاقساط<br><span style="font-size:14px; font-weight:normal; background:#eee; padding:5px 15px; border-radius:10px;">تقرير مالي مفصل</span></div>
        <div class="print-row" style="justify-content:center; margin-bottom:20px;">
            <span style="font-size:14px;">الفترة من: <strong dir="ltr">${fromDate}</strong> &nbsp; إلى: <strong dir="ltr">${toDate}</strong></span>
        </div>
        
        <h4 style="border-bottom:1px solid #ccc; padding-bottom:5px;">الملخص المالي للفترة</h4>
        <div class="print-box mt-10">
            <div class="print-row"><span>إجمالي المبيعات الجديدة:</span> <strong>${periodSales.toLocaleString()} دينار</strong></div>
            <div class="print-row"><span>إجمالي التحصيلات (مقدم + أقساط):</span> <strong class="text-green" style="font-size:16px;">${periodCollected.toLocaleString()} دينار</strong></div>
        </div>

        <h4 style="margin-top:20px; border-bottom:1px solid #ccc; padding-bottom:5px;">تفاصيل التحصيلات (الأقساط المسددة)</h4>
        <table class="report-table">
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>الزبون</th>
                    <th>المنتج</th>
                    <th>القسط رقم</th>
                    <th>المبلغ</th>
                </tr>
            </thead>
            <tbody>
                ${paymentsLog.length > 0 ? paymentsLog.map(p => `
                    <tr>
                        <td>${p.date}</td>
                        <td>${p.customer}</td>
                        <td>${p.product}</td>
                        <td>${p.installmentNo}</td>
                        <td class="text-green font-bold">${p.amount.toLocaleString()}</td>
                    </tr>
                `).join('') : '<tr><td colspan="5" style="text-align:center;">لا توجد تحصيلات</td></tr>'}
            </tbody>
        </table>

        <h4 style="margin-top:20px; border-bottom:1px solid #ccc; padding-bottom:5px;">تفاصيل المبيعات (العقود الجديدة)</h4>
        <table class="report-table">
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>الزبون</th>
                    <th>المنتج</th>
                    <th>المقدم</th>
                    <th>الإجمالي</th>
                </tr>
            </thead>
            <tbody>
                ${newContractsLog.length > 0 ? newContractsLog.map(c => `
                    <tr>
                        <td>${c.date}</td>
                        <td>${c.customer}</td>
                        <td>${c.product}</td>
                        <td>${c.advance.toLocaleString()}</td>
                        <td class="font-bold">${c.total.toLocaleString()}</td>
                    </tr>
                `).join('') : '<tr><td colspan="5" style="text-align:center;">لا توجد مبيعات جديدة</td></tr>'}
            </tbody>
        </table>
        
        <div class="print-footer" style="margin-top:40px;">
            <div>توقيع أمين الصندوق<br><br>..................................</div>
            <div>توقيع الإدارة<br><br>..................................</div>
        </div>
    `;
    return { html, title: `Report_${fromDate}_to_${toDate}` };
}

function printReport() {
    const report = generateReportHTML();
    if(!report) return;
    document.getElementById('print-area').innerHTML = report.html;
    triggerPrint();
}

function exportReportPDF() {
    if(typeof html2pdf === 'undefined') {
        alert('حدث خطأ في تحميل مكتبة PDF. يرجى التحقق من اتصال الإنترنت.');
        return;
    }
    const report = generateReportHTML();
    if(!report) return;

    const element = document.createElement('div');
    element.innerHTML = report.html;
    element.style.padding = '20px';
    element.style.fontFamily = 'Cairo, sans-serif';
    element.style.direction = 'rtl';
    element.style.background = 'white';
    
    document.body.classList.add('printing');
    
    const opt = {
        margin:       10,
        filename:     `${report.title}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save().then(() => {
        document.body.classList.remove('printing');
    });
}
