// --- المتغيرات الرئيسية ---
let users = JSON.parse(localStorage.getItem('zain_users')) || [];
let contracts = JSON.parse(localStorage.getItem('zain_contracts')) || [];
let currentUser = null;
let currentFilter = 'all';
let editingContractId = null;

// تهيئة الحساب الافتراضي للمصمم
if (users.length === 0) {
    users.push({ id: 1, name: 'Zain', pass: '01327798', role: 'admin' });
    localStorage.setItem('zain_users', JSON.stringify(users));
}

// --- توليد نماذج الزبائن والعقود الوهمية (Mock Data) ---
function loadMockData() {
    if (customers.length === 0 && contracts.length === 0) {
        const d1 = new Date(); d1.setMonth(d1.getMonth() - 2); const twoMonthsAgo = d1.toISOString().split('T')[0];
        const d2 = new Date(); d2.setMonth(d2.getMonth() - 1); const oneMonthAgo = d2.toISOString().split('T')[0];
        const d3 = new Date(); const todayStr = d3.toISOString().split('T')[0];
        const d4 = new Date(); d4.setMonth(d4.getMonth() + 1); const nextMonth = d4.toISOString().split('T')[0];

        let c1Id = addCustomer('علي قاسم (متأخر)', '07701234567', 'بغداد، الكرادة', 'محمد سالم');
        let c2Id = addCustomer('سارة حسن (مستمر)', '07801234567', 'بغداد، المنصور', 'بدون كفيل');
        let c3Id = addCustomer('عمر خالد (مكتمل)', '07901234567', 'بغداد، الأعظمية', 'أحمد محمود');

        // 1. عقد متأخر (Delayed)
        contracts.push({
            id: 101, customerId: c1Id, product: 'ثلاجة LG', buyDate: twoMonthsAgo, 
            totalPrice: 500000, advance: 100000, remaining: 400000, status: 'active',
            payments: [
                { id: 1, date: oneMonthAgo, amount: 200000, paid: false, payDate: null }, // متأخر
                { id: 2, date: todayStr, amount: 200000, paid: false, payDate: null }
            ]
        });

        // 2. عقد مستمر (Active)
        contracts.push({
            id: 102, customerId: c2Id, product: 'غسالة سامسونج', buyDate: todayStr, 
            totalPrice: 300000, advance: 50000, remaining: 250000, status: 'active',
            payments: [
                { id: 1, date: nextMonth, amount: 250000, paid: false, payDate: null }
            ]
        });

        // 3. عقد مكتمل (Completed)
        contracts.push({
            id: 103, customerId: c3Id, product: 'شاشة سوني 55 بوصة', buyDate: twoMonthsAgo, 
            totalPrice: 400000, advance: 200000, remaining: 0, status: 'completed',
            payments: [
                { id: 1, date: oneMonthAgo, amount: 200000, paid: true, payDate: oneMonthAgo }
            ]
        });

        localStorage.setItem('zain_contracts', JSON.stringify(contracts));
    }
}

// --- عند التحميل ---
window.onload = () => {
    const savedTheme = localStorage.getItem('zain_theme') || 'light';
    if(savedTheme === 'dark') toggleTheme(true);
    
    // تحميل نص الواتساب المحفوظ
    const savedWaText = localStorage.getItem('wa_template');
    if(savedWaText && document.getElementById('wa-template')) {
        document.getElementById('wa-template').value = savedWaText;
    } else if(document.getElementById('wa-template')) {
        document.getElementById('wa-template').value = "مرحباً [الاسم]، نود تذكيرك بتسديد القسط المتأخر بقيمة [المبلغ] دينار عن شراء ([المنتج]). يرجى التسديد في أقرب وقت وشكراً.";
    }

    const sessionUser = sessionStorage.getItem('zain_logged_in');
    if (sessionUser) {
        currentUser = JSON.parse(sessionUser);
        loadMockData(); // توليد البيانات إذا كانت فارغة
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

// --- نظام الدخول ---
function login() {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const found = users.find(u => u.name === user && u.pass === pass);
    
    if (found) {
        currentUser = found;
        sessionStorage.setItem('zain_logged_in', JSON.stringify(found));
        document.getElementById('splash-screen').classList.add('hidden');
        document.getElementById('login-screen').classList.add('hidden');
        loadMockData();
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
    if (currentUser.role !== 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    }
    
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
        
        // استخدام تايمر لتأخير فتح النوافذ لتجنب الحظر
        setTimeout(() => { window.open(url, '_blank'); }, index * 1000);
    });
}

// --- العمليات الحسابية ---
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

// --- إدارة العقود (إضافة وتعديل وحذف) ---
function openNewContractModal() {
    editingContractId = null;
    document.getElementById('contract-modal-title').innerText = 'عقد جديد';
    document.getElementById('btn-save-contract').innerText = 'حفظ وإنشاء العقد';
    
    document.getElementById('c-name').value = '';
    document.getElementById('c-phone').value = '';
    document.getElementById('c-address').value = '';
    document.getElementById('c-sponsor').value = '';
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
    document.getElementById('c-product').value = contract.product;
    document.getElementById('c-date').value = contract.buyDate;
    
    // استنتاج السعر والمقدم (بشكل تقريبي إذا لم تكن مخزنة بدقة)
    document.getElementById('c-price').value = contract.totalPrice; 
    document.getElementById('c-advance').value = contract.advance;
    document.getElementById('c-months').value = contract.payments.length;
    document.getElementById('c-percent').value = "0"; // الفائدة لا يتم حفظها بشكل مفصول، نفترضها 0
    
    calcPreview();
    openModal('new-contract-modal');
}

function saveContract() {
    const name = document.getElementById('c-name').value;
    const dateInput = document.getElementById('c-date').value;
    if (!name || !dateInput) return alert('يرجى إدخال اسم الزبون وتاريخ الشراء');

    if(editingContractId) {
        if(!confirm('تنبيه هام: تعديل بيانات العقد (السعر أو المدة) سيؤدي إلى إلغاء جميع الدفعات السابقة وإعادة جدولة العقد من الصفر. هل أنت متأكد؟\n\nملاحظة: إذا كنت تريد تعديل اسم الزبون فقط، استخدم (سجل الزبائن).')) {
            return;
        }
    }

    const customerId = addCustomer(
        name, document.getElementById('c-phone').value,
        document.getElementById('c-address').value, document.getElementById('c-sponsor').value
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

// --- عرض العقود  ---
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
                    <button class="btn btn-outline btn-sm" onclick="printContract(${c.id})" title="طباعة / تصدير PDF"><i class="fa fa-print"></i> طباعة</button>
                    <button class="btn btn-primary btn-sm" onclick="openPayments(${c.id})"><i class="fa fa-list"></i> الدفعات</button>
                    ${currentUser.role === 'admin' ? `
                        <button class="btn btn-outline btn-sm" onclick="editContractBtn(${c.id})"><i class="fa fa-edit"></i></button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteContract(${c.id})"><i class="fa fa-trash"></i></button>
                    ` : ''}
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
                         <button class="btn btn-success btn-sm" onclick="payInstallment(${p.id})">تسديد</button>
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
    }
}

// --- لوحة الإحصائيات ---
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

// --- الزبائن (تعديل وحذف) ---
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
                <div><i class="fa fa-user-shield"></i> كفيل: ${c.sponsor || '-'}</div>
                <div><i class="fa fa-calendar"></i> ${c.createdAt}</div>
            </div>
            ${currentUser.role === 'admin' ? `
            <div class="list-item-footer mt-10" style="border-top:1px solid var(--border); padding-top:10px;">
                <button class="btn btn-outline btn-sm w-100" onclick="editCustomerModal(${c.id})"><i class="fa fa-edit"></i> تعديل</button>
                <button class="btn btn-outline-danger btn-sm ml-10" onclick="deleteCustomerBtn(${c.id})"><i class="fa fa-trash"></i></button>
            </div>
            ` : ''}
        `;
        list.appendChild(card);
    });
}

function editCustomerModal(id) {
    const cust = getCustomer(id);
    if(!cust) return;
    document.getElementById('edit-cust-id').value = id;
    document.getElementById('edit-cust-name').value = cust.name;
    document.getElementById('edit-cust-phone').value = cust.phone;
    document.getElementById('edit-cust-address').value = cust.address;
    document.getElementById('edit-cust-sponsor').value = cust.sponsor;
    openModal('edit-customer-modal');
}

function saveCustomerEdit() {
    const id = parseInt(document.getElementById('edit-cust-id').value);
    const name = document.getElementById('edit-cust-name').value;
    const phone = document.getElementById('edit-cust-phone').value;
    const address = document.getElementById('edit-cust-address').value;
    const sponsor = document.getElementById('edit-cust-sponsor').value;
    
    if(!name) return alert('اسم الزبون مطلوب');
    
    updateCustomer(id, { name, phone, address, sponsor });
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

// --- الإعدادات (الموظفين والنسخ) ---
function addUser() {
    const name = document.getElementById('new-emp-name').value.trim();
    const pass = document.getElementById('new-emp-pass').value.trim();
    const role = document.getElementById('new-emp-role').value;
    if (!name || !pass) return alert('أكمل البيانات');
    
    // منع إضافة مستخدم باسم Zain
    if (name.toLowerCase() === 'zain') return alert('هذا الاسم غير متاح للاستخدام');
    if (users.find(u => u.name === name)) return alert('الاسم موجود مسبقاً');
    
    users.push({ id: Date.now(), name, pass, role });
    localStorage.setItem('zain_users', JSON.stringify(users));
    
    document.getElementById('new-emp-name').value = '';
    document.getElementById('new-emp-pass').value = '';
    renderUsers();
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
                <button class="btn btn-outline-danger btn-sm" onclick="deleteUser(${u.id})"><i class="fa fa-trash"></i></button>
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

// --- الطباعة (A5) ---
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
    window.print();
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
    window.print();
}


// --- تسجيل PWA Service Worker للعمل كتطبيق حقيقي وبدون إنترنت ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => {
            console.log('Service Worker Registered successfully.', reg);
        }).catch(err => {
            console.log('Service Worker Registration failed.', err);
        });
    });
}
