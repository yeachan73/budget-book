// Firebase SDK 함수 가져오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, onValue, push, remove, get, update, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Firebase 프로젝트 설정
const firebaseConfig = {
  apiKey: "AIzaSyAeAtH6qoB5mVhva5F-iFmiledU2VqSi8M",
  authDomain: "budget-book-294d2.firebaseapp.com",
  databaseURL: "https://budget-book-294d2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "budget-book-294d2",
  storageBucket: "budget-book-294d2.appspot.com",
  messagingSenderId: "315007462405",
  appId: "1:315007462405:web:971804da255eac61ea006c",
  measurementId: "G-2TCJ35L68D"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Firebase 데이터베이스 참조
const transactionsRef = ref(database, 'transactions');
const assetsRef = ref(database, 'assets');
const categoriesRef = ref(database, 'categories');

// DOM 요소 선택
const form = document.getElementById('transaction-form');
const dateInput = document.getElementById('date');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const amountInput = document.getElementById('amount');
const assetSelect = document.getElementById('asset-select');
const transactionList = document.getElementById('transaction-list');

// 필터 관련 DOM 요소
const filterStartDateInput = document.getElementById('filter-start-date');
const filterEndDateInput = document.getElementById('filter-end-date');
const filterBtn = document.getElementById('filter-btn');
const resetFilterBtn = document.getElementById('reset-filter-btn');

const assetForm = document.getElementById('asset-form');
const assetNameInput = document.getElementById('asset-name');
const assetTypeInput = document.getElementById('asset-type');
const initialBalanceInput = document.getElementById('initial-balance');
const assetList = document.getElementById('asset-list');
const creditCardFields = document.getElementById('credit-card-fields');
const paymentDayInput = document.getElementById('payment-day');
const linkedAccountSelect = document.getElementById('linked-account-select');

// 모달 관련 DOM 요소
const assetEditModal = document.getElementById('asset-edit-modal');
const assetEditForm = document.getElementById('asset-edit-form');
const editAssetNameInput = document.getElementById('edit-asset-name');
const editAssetTypeInput = document.getElementById('edit-asset-type');
const editAssetBalanceInput = document.getElementById('edit-asset-balance');
const deleteAssetBtn = document.getElementById('delete-asset-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const editCreditCardFields = document.getElementById('edit-credit-card-fields');
const editPaymentDayInput = document.getElementById('edit-payment-day');
const editLinkedAccountSelect = document.getElementById('edit-linked-account-select');

// 데이터 관리 DOM 요소
const exportCsvBtn = document.getElementById('export-csv-btn');
const importCsvInput = document.getElementById('import-csv-input');

// 통계 관련 DOM 요소 및 변수
const statsMonthInput = document.getElementById('stats-month');
const expenseChartCanvas = document.getElementById('expense-chart').getContext('2d');
let expenseChart = null; // Chart.js 인스턴스를 저장할 변수
let allTransactions = {}; // 모든 거래 내역을 저장할 변수
const summaryIncomeEl = document.getElementById('summary-income');
const summaryExpenseEl = document.getElementById('summary-expense');
const summaryNetEl = document.getElementById('summary-net');

// 카테고리 관리 DOM 요소
const categoryForm = document.getElementById('category-form');
const categoryNameInput = document.getElementById('category-name');
const categoryTypeInput = document.getElementById('category-type');
const incomeCategoryListEl = document.getElementById('income-category-list');
const expenseCategoryListEl = document.getElementById('expense-category-list');


// 카테고리 목록 정의
let incomeCategories = [];
let expenseCategories = [];

/**
 * 현재 한국 표준시(KST) 날짜를 'YYYY-MM-DD' 형식의 문자열로 반환합니다.
 * KST는 UTC+9 입니다.
 * @returns {string} 'YYYY-MM-DD' 형식의 한국 날짜 문자열
 */
function getKoreanDateString() {
    const now = new Date();
    // UTC 시간(밀리초) + 현재 타임존 오프셋(밀리초) = UTC 시간
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    const KST_OFFSET = 9 * 60 * 60 * 1000; // 9시간을 밀리초로 변환
    const kstDate = new Date(utc + KST_OFFSET);

    const year = kstDate.getFullYear();
    const month = (kstDate.getMonth() + 1).toString().padStart(2, '0'); // 월은 0부터 시작하므로 +1
    const day = kstDate.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 현재 한국 표준시(KST) 날짜를 'YYYY-MM' 형식의 문자열로 반환합니다.
 * @returns {string} 'YYYY-MM' 형식의 한국 날짜 문자열
 */
function getKoreanYearMonthString() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    const kstDate = new Date(utc + (9 * 60 * 60 * 1000));
    return kstDate.toISOString().slice(0, 7);
}

/**
 * 화면에 거래 내역 렌더링
 * @param {object} transactions - Firebase에서 가져온 거래 내역 객체
 */
function renderTransactions(transactions) {
    // 목록 초기화
    transactionList.innerHTML = '';

    if (!transactions) {
        transactionList.innerHTML = '<tr><td colspan="5">거래 내역이 없습니다.</td></tr>';
        return;
    }

    // 날짜순으로 정렬 (최신 날짜가 위로)
    const sortedTransactionKeys = Object.keys(transactions).sort((a, b) => {
        const dateA = new Date(transactions[a].date);
        const dateB = new Date(transactions[b].date);
        return dateB - dateA;
    });

    if (sortedTransactionKeys.length === 0) {
        transactionList.innerHTML = '<tr><td colspan="5">해당 기간의 거래 내역이 없습니다.</td></tr>';
        return;
    }

    // 정렬된 키를 기반으로 순회
    sortedTransactionKeys.forEach(key => {
        const transaction = transactions[key];
        const row = document.createElement('tr');
        
        // 수입/지출에 따라 클래스 추가
        row.classList.add(transaction.type);

        row.innerHTML = `
            <td>${transaction.date}</td>
            <td>${transaction.type === 'income' ? '수입' : '지출'}</td>
            <td>${transaction.category}</td>
            <td>${Number(transaction.amount).toLocaleString()}원</td>
            <td><button class="delete-btn" data-id="${key}">삭제</button></td>
        `;
        transactionList.appendChild(row);
    });
}

/**
 * 화면에 자산 목록 렌더링 및 드롭다운 업데이트
 * @param {object} assets - Firebase에서 가져온 자산 객체
 */
function renderAssets(assets) {
    assetList.innerHTML = '';
    assetSelect.innerHTML = '<option value="">-- 결제 수단 선택 --</option>'; // 드롭다운 초기화
    linkedAccountSelect.innerHTML = ''; // 연동 계좌 드롭다운도 여기서 초기화

    if (!assets) {
        assetList.innerHTML = '<li>등록된 자산이 없습니다.</li>';
        return;
    }

    Object.keys(assets).forEach(key => {
        // 이 루프는 결제 수단 현황 목록과 거래 내역 폼의 드롭다운만 채웁니다.
        const paymentMethod = assets[key];

        // 자산 현황 목록에 아이템 추가
        const li = document.createElement('li');
        let typeText = (paymentMethod.type === 'credit_card') ? '신용카드' : '계좌';
        let pendingAmountHtml = '';
        let balanceHtml = '';

        if (paymentMethod.type === 'credit_card') {
            pendingAmountHtml = `<span class="asset-details">(결제예정: ${Number(paymentMethod.pendingAmount || 0).toLocaleString()}원)</span>`;
            balanceHtml = `한도: ${Number(paymentMethod.balance).toLocaleString()}원`;
        } else { // account
            balanceHtml = `${Number(paymentMethod.balance).toLocaleString()}원`;
        }

        li.innerHTML = `<div>
            <span class="asset-name" data-id="${key}">${paymentMethod.name}</span> <span class="asset-details">(${typeText})</span>
            ${pendingAmountHtml}
            </div>
            <span class="asset-balance">${balanceHtml}</span>`;
        assetList.appendChild(li);

        // 거래 내역 폼의 자산 선택 드롭다운에 옵션 추가
        const option = document.createElement('option');
        option.value = key; // Firebase의 고유 키를 값으로 사용
        option.textContent = paymentMethod.name;
        assetSelect.appendChild(option);

        // 자산 유형이 '계좌'인 경우, '연동 계좌' 드롭다운에도 추가
        // 자산 유형이 '계좌'이거나, 유형이 지정되지 않은 경우(구 데이터 호환) '연동 계좌' 드롭다운에 추가
        if (paymentMethod.type === 'account' || paymentMethod.type === undefined) {
            const accountOption = document.createElement('option');
            accountOption.value = key;
            accountOption.textContent = paymentMethod.name;
            linkedAccountSelect.appendChild(accountOption.cloneNode(true)); // 생성 폼용
            editLinkedAccountSelect.appendChild(accountOption.cloneNode(true)); // 수정 폼용
        }
    });
}

/**
 * 자산 수정 모달 열기
 * @param {string} assetId - 수정할 자산의 Firebase 키
 */
function openAssetEditModal(assetId) {
    const assetRef = ref(database, `assets/${assetId}`);
    get(assetRef).then(snapshot => {
        if (snapshot.exists()) {
            const asset = snapshot.val();
            const { name, balance, type, paymentDay, linkedAccountId } = asset;

            assetEditModal.style.display = 'flex';
            editAssetNameInput.value = name;
            editAssetBalanceInput.value = balance;
            // type이 없는 구 데이터는 'account'로 처리
            editAssetTypeInput.value = type || 'account';

            assetEditForm.dataset.id = assetId; // 수정/삭제 시 사용할 ID 저장
            deleteAssetBtn.dataset.id = assetId; // 수정/삭제 시 사용할 ID 저장

            // 신용카드 필드 처리
            if (editAssetTypeInput.value === 'credit_card') {
                editCreditCardFields.style.display = 'flex';
                editPaymentDayInput.value = paymentDay || '';
                editLinkedAccountSelect.value = linkedAccountId || '';
            } else {
                editCreditCardFields.style.display = 'none';
            }
        }
    });
}

/**
 * 자산 수정 모달 닫기
 */
function closeAssetEditModal() {
    assetEditModal.style.display = 'none';
}

/**
 * 카테고리 관리 목록을 화면에 렌더링
 * @param {object} categories - Firebase에서 가져온 카테고리 객체
 */
function renderCategoryLists(categories) {
    incomeCategoryListEl.innerHTML = '';
    expenseCategoryListEl.innerHTML = '';

    // 전역 변수 업데이트
    incomeCategories = categories.income ? Object.values(categories.income) : [];
    expenseCategories = categories.expense ? Object.values(categories.expense) : [];

    // 수입 카테고리 렌더링
    if (categories.income) {
        Object.entries(categories.income).forEach(([key, name]) => {
            const categorySpan = document.createElement('span');
            categorySpan.className = 'category-item';
            categorySpan.innerHTML = `${name} <button class="delete-btn" data-id="${key}" data-type="income" style="padding: 2px 5px; font-size: 0.8em;">&times;</button>`;
            incomeCategoryListEl.appendChild(categorySpan);
        });
    }

    // 지출 카테고리 렌더링
    if (categories.expense) {
        Object.entries(categories.expense).forEach(([key, name]) => {
            const categorySpan = document.createElement('span');
            categorySpan.className = 'category-item';
            categorySpan.innerHTML = `${name} <button class="delete-btn" data-id="${key}" data-type="expense" style="padding: 2px 5px; font-size: 0.8em;">&times;</button>`;
            expenseCategoryListEl.appendChild(categorySpan);
        });
    }

    // 거래 내역 폼의 카테고리 드롭다운도 업데이트
    updateCategoryOptions();
}

/**
 * 새 카테고리 추가
 * @param {Event} e - 폼 제출 이벤트
 */
function addCategory(e) {
    e.preventDefault();
    const name = categoryNameInput.value.trim();
    const type = categoryTypeInput.value;

    if (!name) {
        alert('카테고리 이름을 입력해주세요.');
        return;
    }

    const categoryListRef = ref(database, `categories/${type}`);
    push(categoryListRef, name);
    categoryForm.reset();
}

/**
 * 항목(수입/지출) 선택에 따라 카테고리 옵션 업데이트
 */
function updateCategoryOptions() {
    const selectedType = typeInput.value;

    if (selectedType) { // '수입' 또는 '지출'이 선택된 경우
        // 플레이스홀더의 selected 속성을 제거하여 목록이 바로 보이게 함
        categoryInput.innerHTML = '<option value="">-- 카테고리 선택 --</option>';
        const categories = selectedType === 'income' ? incomeCategories : expenseCategories;

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryInput.appendChild(option);
        });
    } else { // 항목이 선택되지 않은 경우
        // 플레이스홀더를 기본 선택값으로 설정
        categoryInput.innerHTML = '<option value="" selected>-- 카테고리 선택 --</option>';
    }
}

/**
 * 자산 추가
 * @param {Event} e - 폼 제출 이벤트
 */
function addAsset(e) {
    e.preventDefault();
    const name = assetNameInput.value;
    const type = assetTypeInput.value;
    const balance = +initialBalanceInput.value; // 잔액 또는 한도

    if (name.trim() === '' || initialBalanceInput.value.trim() === '') {
        alert('결제 수단 이름과 잔액/한도를 모두 입력해주세요.');
        return;
    }

    let newAsset = {
        name,
        type,
        balance,
    };

    if (type === 'credit_card') {
        const paymentDay = +paymentDayInput.value;
        const linkedAccountId = linkedAccountSelect.value;
        if (!paymentDay || !linkedAccountId) {
            alert('신용카드는 결제일과 연동 계좌를 모두 선택해야 합니다.');
            return;
        }
        newAsset.paymentDay = paymentDay;
        newAsset.linkedAccountId = linkedAccountId;
        newAsset.pendingAmount = 0; // 결제 예정 금액 초기화
    }

    push(assetsRef, newAsset);
    assetForm.reset();
    // 폼 리셋 후 신용카드 필드 숨김 처리
    creditCardFields.style.display = 'none';
}

/**
 * 거래 내역 추가
 * @param {Event} e - 폼 제출 이벤트
 */
function addTransaction(e) {
    e.preventDefault();

    // 입력값 유효성 검사
    if (dateInput.value.trim() === '' || categoryInput.value.trim() === '' || amountInput.value.trim() === '' || assetSelect.value === '') {
        alert('모든 필드를 입력해주세요.');
        return;
    }
    
    const amount = +amountInput.value;
    if (amount <= 0) {
        alert('금액은 0보다 커야 합니다.');
        return;
    }

    const assetId = assetSelect.value;
    const transactionType = typeInput.value;

    // 새 거래 내역 객체 생성
    const newTransaction = {
        date: dateInput.value,
        type: transactionType,
        category: categoryInput.value,
        amount: amount,
        assetId: assetId,
    };

    // 1. Firebase에 거래 내역 추가 (나중에 잔액 업데이트 후 실행)
    const newTransactionRef = push(transactionsRef, newTransaction);

    // 2. 결제 수단 유형에 따라 잔액 업데이트
    const assetRef = ref(database, `assets/${assetId}`);
    get(assetRef).then(snapshot => {
        if (snapshot.exists()) {
            const paymentMethod = snapshot.val();
            if (paymentMethod.type === 'credit_card' && transactionType === 'expense') {
                // 신용카드 지출: 결제 예정 금액(pendingAmount)만 증가
                const newPendingAmount = (paymentMethod.pendingAmount || 0) + amount;
                update(assetRef, { pendingAmount: newPendingAmount });
            } else {
                // 계좌 거래(수입/지출) 또는 신용카드 수입(취소 등): 즉시 잔액 변경
                const currentBalance = paymentMethod.balance;
                let newBalance;
                if (paymentMethod.type === 'credit_card' && transactionType === 'income') {
                    const newPendingAmount = (paymentMethod.pendingAmount || 0) - amount;
                    update(assetRef, { pendingAmount: newPendingAmount });
                } else {
                    newBalance = transactionType === 'income' ? currentBalance + amount : currentBalance - amount;
                    update(assetRef, { balance: newBalance });
                }
            }
        }
    });

    // 폼 초기화
    form.reset();
    // 날짜는 오늘 날짜로 다시 설정
    dateInput.value = getKoreanDateString();
    // 폼 리셋 후 카테고리 옵션을 다시 업데이트
    updateCategoryOptions(); // form.reset()으로 type이 ''가 되었으므로, category 목록을 비워줌
}

/**
 * 자산 정보 수정
 * @param {Event} e - 폼 제출 이벤트
 */
function updateAsset(e) {
    e.preventDefault();
    const assetId = e.target.dataset.id;
    const newName = editAssetNameInput.value.trim();
    const newBalance = Number(editAssetBalanceInput.value);
    const newType = editAssetTypeInput.value;

    const assetRef = ref(database, `assets/${assetId}`);

    let updatedAssetData = {
        name: newName,
        balance: newBalance,
        type: newType
    };

    if (newType === 'credit_card') {
        const paymentDay = +editPaymentDayInput.value;
        const linkedAccountId = editLinkedAccountSelect.value;
        if (!paymentDay || !linkedAccountId) {
            alert('신용카드는 결제일과 연동 계좌를 모두 선택해야 합니다.');
            return;
        }
        updatedAssetData.paymentDay = paymentDay;
        updatedAssetData.linkedAccountId = linkedAccountId;
        // 만약 계좌 -> 신용카드로 변경하는 경우, pendingAmount 필드 추가
        get(assetRef).then(snapshot => {
            if (snapshot.exists() && snapshot.val().type !== 'credit_card') {
                updatedAssetData.pendingAmount = 0;
            }
            update(assetRef, updatedAssetData);
        });
    } else { // 계좌로 변경하는 경우, 신용카드 관련 필드 제거
        updatedAssetData.paymentDay = null;
        updatedAssetData.linkedAccountId = null;
        updatedAssetData.pendingAmount = null;
        update(assetRef, updatedAssetData);
    }

    // 참고: 잔액 조정 로직은 단순화를 위해 이번 수정에서는 제외했습니다.
    // 필요하다면 이전 코드처럼 추가할 수 있습니다.
    closeAssetEditModal();
}

/**
 * 자산 삭제
 */
async function deleteAsset() {
    const assetId = deleteAssetBtn.dataset.id;
    if (!confirm("정말로 이 자산을 삭제하시겠습니까?\n연결된 거래 내역이 없는 경우에만 삭제할 수 있습니다.")) return;

    // 1. 이 자산과 연결된 거래 내역이 있는지 확인
    const transactionsQuery = query(transactionsRef, orderByChild('assetId'), equalTo(assetId));
    const snapshot = await get(transactionsQuery);

    if (snapshot.exists()) {
        alert("이 자산에 연결된 거래 내역이 있어 삭제할 수 없습니다.");
        return;
    }

    // 2. 연결된 거래 내역이 없으면 자산 삭제
    await remove(ref(database, `assets/${assetId}`));
    closeAssetEditModal();
}

/**
 * 카테고리 삭제
 * @param {Event} e - 클릭 이벤트
 */
async function deleteCategory(e) {
    if (!e.target.classList.contains('delete-btn') || !e.target.dataset.id || !e.target.dataset.type) return;

    const categoryId = e.target.dataset.id;
    const categoryType = e.target.dataset.type;
    const categoryRef = ref(database, `categories/${categoryType}/${categoryId}`);

    // 1. 삭제할 카테고리 이름 가져오기
    const categorySnapshot = await get(categoryRef);
    if (!categorySnapshot.exists()) return;
    const categoryName = categorySnapshot.val();

    if (!confirm(`'${categoryName}' 카테고리를 삭제하시겠습니까?\n이 카테고리를 사용하는 거래 내역이 있으면 삭제할 수 없습니다.`)) return;

    // 2. 해당 카테고리를 사용하는 거래 내역이 있는지 확인
    const transactionsQuery = query(transactionsRef, orderByChild('category'), equalTo(categoryName));
    const snapshot = await get(transactionsQuery);

    if (snapshot.exists()) {
        alert("이 카테고리를 사용하는 거래 내역이 있어 삭제할 수 없습니다.");
        return;
    }
    // 3. 연결된 거래 내역이 없으면 카테고리 삭제
    await remove(categoryRef);
}

/**
 * 거래 내역 삭제
 * @param {Event} e - 클릭 이벤트
 */
function deleteTransaction(e) {
    if (!e.target.classList.contains('delete-btn')) return;

    const transactionId = e.target.getAttribute('data-id');
    const transactionToDeleteRef = ref(database, `transactions/${transactionId}`);

    // 1. 삭제할 거래 내역 정보를 먼저 가져옴
    get(transactionToDeleteRef).then((snapshot) => {
        if (snapshot.exists()) {
            const { amount, type, assetId } = snapshot.val();
            
            // 2. 해당 결제 수단의 잔액/예정금액을 복구
            const assetRef = ref(database, `assets/${assetId}`);
            get(assetRef).then(assetSnapshot => {
                if (assetSnapshot.exists()) {
                    const paymentMethod = assetSnapshot.val();
                    if (paymentMethod.type === 'credit_card' && type === 'expense') {
                        // 신용카드 지출 삭제: 결제 예정 금액에서 차감
                        const newPendingAmount = (paymentMethod.pendingAmount || 0) - amount;
                        update(assetRef, { pendingAmount: newPendingAmount });
                    } else {
                        // 계좌 거래 또는 신용카드 수입(취소) 삭제: 잔액 복구
                        const currentBalance = paymentMethod.balance;
                        const restoredBalance = type === 'income' ? currentBalance - amount : currentBalance + amount;
                        update(assetRef, { balance: restoredBalance });
                    }
                }
            });
            // 3. 거래 내역 삭제
            remove(transactionToDeleteRef);
        }
    });
}

/**
 * 거래 내역 데이터를 CSV 파일로 내보내는 함수
 */
async function exportToCSV() {
    try {
        const [transactionsSnapshot, assetsSnapshot] = await Promise.all([
            get(transactionsRef),
            get(assetsRef)
        ]);

        if (!transactionsSnapshot.exists()) {
            alert('내보낼 거래 내역이 없습니다.');
            return;
        }

        const transactions = transactionsSnapshot.val();
        const assets = assetsSnapshot.val() || {};

        // assetId를 assetName으로 변환하기 위한 맵 생성
        const assetIdToNameMap = Object.keys(assets).reduce((map, key) => {
            map[key] = assets[key].name;
            return map;
        }, {});

        // CSV 헤더
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "날짜,항목,카테고리,금액,결제수단\r\n";

        // CSV 데이터 행
        Object.values(transactions).forEach(tx => {
            const row = [
                tx.date,
                tx.type === 'income' ? '수입' : '지출',
                tx.category,
                tx.amount,
                assetIdToNameMap[tx.assetId] || '알 수 없음' // 자산이 삭제된 경우 대비
            ];
            csvContent += row.join(",") + "\r\n";
        });

        // 파일 다운로드
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `가계부_거래내역_${getKoreanDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("CSV 내보내기 중 오류 발생:", error);
        alert("데이터를 내보내는 중 오류가 발생했습니다.");
    }
}

/**
 * CSV 파일을 읽어 거래 내역을 가져오는 함수
 * @param {Event} e - 파일 입력 변경 이벤트
 */
async function importFromCSV(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm("CSV 파일의 모든 내역을 데이터베이스에 추가하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) {
        importCsvInput.value = ''; // 파일 선택 취소
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        const csvData = event.target.result;
        const lines = csvData.split(/\r\n|\n/).slice(1); // 헤더 제외

        const assetsSnapshot = await get(assetsRef);
        const assets = assetsSnapshot.val() || {};
        const assetNameToIdMap = Object.keys(assets).reduce((map, key) => {
            map[assets[key].name] = key;
            return map;
        }, {});

        lines.forEach(line => {
            if (!line) return;
            const [date, type, category, amount, assetName] = line.split(',');
            
            const assetId = assetNameToIdMap[assetName];
            if (!assetId) {
                console.warn(`'${assetName}'에 해당하는 자산을 찾을 수 없어 다음 거래를 건너뜁니다:`, line);
                return;
            }

            // addTransaction 함수를 재사용하지 않고 직접 push (잔액 계산 중복 방지)
            push(transactionsRef, { date, type: type === '수입' ? 'income' : 'expense', category, amount: +amount, assetId });
        });
        alert('가져오기가 완료되었습니다. 페이지가 새로고침될 수 있습니다.');
    };
    reader.readAsText(file, 'UTF-8');
}

/**
 * 선택된 월의 총수입, 총지출, 순수익을 계산하고 화면에 표시하는 함수
 */
function updateSummary() {
    const selectedMonth = statsMonthInput.value;
    if (!selectedMonth) return;

    let totalIncome = 0;
    let totalExpense = 0;

    Object.values(allTransactions).forEach(tx => {
        // 선택된 월의 내역만 필터링
        if (tx.date.startsWith(selectedMonth)) {
            if (tx.type === 'income') {
                totalIncome += tx.amount;
            } else if (tx.type === 'expense') {
                totalExpense += tx.amount;
            }
        }
    });

    const netIncome = totalIncome - totalExpense;

    summaryIncomeEl.textContent = `${totalIncome.toLocaleString()}원`;
    summaryExpenseEl.textContent = `${totalExpense.toLocaleString()}원`;
    summaryNetEl.textContent = `${netIncome.toLocaleString()}원`;

    // 순수익에 따라 색상 변경
    if (netIncome > 0) {
        summaryNetEl.style.color = 'var(--income-color)';
    } else if (netIncome < 0) {
        summaryNetEl.style.color = 'var(--expense-color)';
    } else {
        summaryNetEl.style.color = '#333';
    }
}

/**
 * 선택된 월의 카테고리별 지출 데이터를 기반으로 차트를 업데이트하는 함수
 */
function updateChart() {
    const selectedMonth = statsMonthInput.value;
    if (!selectedMonth) return;

    const expenseData = {};

    Object.values(allTransactions).forEach(tx => {
        // 선택된 월의 지출 내역만 필터링
        if (tx.type === 'expense' && tx.date.startsWith(selectedMonth)) {
            if (expenseData[tx.category]) {
                expenseData[tx.category] += tx.amount;
            } else {
                expenseData[tx.category] = tx.amount;
            }
        }
    });

    const labels = Object.keys(expenseData);
    const data = Object.values(expenseData);

    // 기존 차트가 있으면 파괴
    if (expenseChart) {
        expenseChart.destroy();
    }

    // 새 차트 생성
    expenseChart = new Chart(expenseChartCanvas, {
        type: 'pie', // 파이 차트
        data: {
            labels: labels,
            datasets: [{
                label: '카테고리별 지출',
                data: data,
                backgroundColor: [ // 다양한 색상 배열
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
                    '#FFCD56', '#C9CBCF', '#3FC380', '#FA6E59', '#A2D0EA', '#F9D423'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: `${selectedMonth}월 지출 내역`
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(context.parsed);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

/**
 * 기간별 거래 내역을 필터링하는 함수
 */
function filterTransactionsByDate() {
    const startDate = filterStartDateInput.value;
    const endDate = filterEndDateInput.value;

    if (!startDate || !endDate) {
        alert('시작일과 종료일을 모두 선택해주세요.');
        return;
    }

    const filteredTransactions = Object.entries(allTransactions)
        .filter(([key, tx]) => {
            return tx.date >= startDate && tx.date <= endDate;
        })
        .reduce((obj, [key, tx]) => {
            obj[key] = tx;
            return obj;
        }, {});

    renderTransactions(filteredTransactions);
}


/**
 * 초기화 함수
 */
function init() {
    // 오늘 날짜를 기본값으로 설정
    dateInput.value = getKoreanDateString();
    statsMonthInput.value = getKoreanYearMonthString(); // 통계 월 기본값 설정
    
    // 이벤트 리스너 등록
    assetForm.addEventListener('submit', addAsset);
    assetTypeInput.addEventListener('change', (e) => {
        // 신용카드 선택 시 추가 필드 표시/숨김
        creditCardFields.style.display = e.target.value === 'credit_card' ? 'flex' : 'none';
    });
    typeInput.addEventListener('change', updateCategoryOptions); // 항목 변경 시 카테고리 업데이트
    form.addEventListener('submit', addTransaction);
    transactionList.addEventListener('click', deleteTransaction);
    assetList.addEventListener('click', (e) => {
        if (e.target.classList.contains('asset-name')) {
            openAssetEditModal(e.target.dataset.id);
        }
    });
    editAssetTypeInput.addEventListener('change', (e) => {
        // 수정 모달에서 신용카드 선택 시 추가 필드 표시/숨김
        editCreditCardFields.style.display = e.target.value === 'credit_card' ? 'flex' : 'none';
    });
    categoryForm.addEventListener('submit', addCategory);
    document.addEventListener('click', deleteCategory); // 이벤트 위임으로 카테고리 삭제 처리
    assetEditForm.addEventListener('submit', updateAsset);
    deleteAssetBtn.addEventListener('click', deleteAsset);
    closeModalBtn.addEventListener('click', closeAssetEditModal);
    assetEditModal.addEventListener('click', (e) => {
        if (e.target === assetEditModal) { // 오버레이 클릭 시 닫기
            closeAssetEditModal();
        }
    });
    exportCsvBtn.addEventListener('click', exportToCSV);
    importCsvInput.addEventListener('change', importFromCSV);
    statsMonthInput.addEventListener('change', () => {
        updateChart();
        updateSummary();
    });
    filterBtn.addEventListener('click', filterTransactionsByDate);
    resetFilterBtn.addEventListener('click', () => {
        filterStartDateInput.value = '';
        filterEndDateInput.value = '';
        renderTransactions(allTransactions); // 전체 목록 다시 렌더링
    });

    // Firebase 데이터베이스의 변경사항을 실시간으로 감지
    onValue(transactionsRef, (snapshot) => {
        allTransactions = snapshot.val() || {};
        renderTransactions(allTransactions); // 초기 로드 시 전체 목록 렌더링
        updateChart(); // 거래 내역 변경 시 차트와 요약 업데이트
        updateSummary();
    });

    // 자산 데이터 변경 감지
    onValue(assetsRef, (snapshot) => {
        const data = snapshot.val();
        renderAssets(data);
    });

    // 카테고리 데이터 변경 감지
    onValue(categoriesRef, (snapshot) => {
        const data = snapshot.val() || { income: {}, expense: {} };
        renderCategoryLists(data);
    });

    // 매일 자정에 카드값 자동 결제 로직 실행 (실제 앱에서는 서버 기능 필요)
    // 여기서는 페이지 로드 시 오늘 날짜가 결제일인 카드를 찾아 처리하는 방식으로 간소화
    checkForCardPayments();
}

/**
 * 신용카드 결제일 도래 시 자동 결제 처리 (간소화된 버전)
 */
function checkForCardPayments() {
    const today = new Date().getDate();
    const cardsQuery = query(assetsRef, orderByChild('type'), equalTo('credit_card'));

    get(cardsQuery).then(snapshot => {
        if (!snapshot.exists()) return;

        snapshot.forEach(childSnapshot => {
            const cardId = childSnapshot.key;
            const card = childSnapshot.val();

            // 결제일이 오늘이고, 결제할 금액이 있는 경우
            if (card.paymentDay === today && card.pendingAmount > 0) {
                const linkedAccountRef = ref(database, `assets/${card.linkedAccountId}`);
                get(linkedAccountRef).then(accountSnapshot => {
                    if (accountSnapshot.exists()) {
                        const account = accountSnapshot.val();
                        // 1. 연동 계좌에서 카드값만큼 잔액 차감
                        update(linkedAccountRef, { balance: account.balance - card.pendingAmount });
                        // 2. 신용카드의 결제 예정 금액을 0으로 리셋
                        update(ref(database, `assets/${cardId}`), { pendingAmount: 0 });
                    }
                });
            }
        });
    });
}

// 페이지 로드 시 초기화 함수 실행
init();
