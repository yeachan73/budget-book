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

// DOM 요소 선택
const form = document.getElementById('transaction-form');
const dateInput = document.getElementById('date');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const amountInput = document.getElementById('amount');
const assetSelect = document.getElementById('asset-select');
const transactionList = document.getElementById('transaction-list');

const assetForm = document.getElementById('asset-form');
const assetNameInput = document.getElementById('asset-name');
const initialBalanceInput = document.getElementById('initial-balance');
const assetList = document.getElementById('asset-list');

// 모달 관련 DOM 요소
const assetEditModal = document.getElementById('asset-edit-modal');
const assetEditForm = document.getElementById('asset-edit-form');
const editAssetNameInput = document.getElementById('edit-asset-name');
const editAssetBalanceInput = document.getElementById('edit-asset-balance');
const deleteAssetBtn = document.getElementById('delete-asset-btn');
const closeModalBtn = document.getElementById('close-modal-btn');

// 카테고리 목록 정의
const incomeCategories = ['월급', '성과급', '복지포인트', '기타수당', '판매수익', '이벤트수익', '용돈'];
const expenseCategories = ['보험료', '통신료', '관리비', '교통비', 'OTT', '대출이자', '세금', '생활비', '용돈', '경조사비', '여행', '취미', '교육', '지역화폐', '데이트', '판매대금'];


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

    // Firebase에서 받은 객체를 순회
    Object.keys(transactions).forEach(key => {
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
    assetSelect.innerHTML = '<option value="">-- 자산 선택 --</option>'; // 드롭다운 초기화

    if (!assets) {
        assetList.innerHTML = '<li>등록된 자산이 없습니다.</li>';
        return;
    }

    Object.keys(assets).forEach(key => {
        const asset = assets[key];

        // 자산 현황 목록에 아이템 추가
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="asset-name" data-id="${key}" data-name="${asset.name}">${asset.name}</span>
            <span class="asset-balance">${Number(asset.balance).toLocaleString()}원</span>
        `;
        assetList.appendChild(li);

        // 거래 내역 폼의 자산 선택 드롭다운에 옵션 추가
        const option = document.createElement('option');
        option.value = key; // Firebase의 고유 키를 값으로 사용
        option.textContent = asset.name;
        assetSelect.appendChild(option);
    });
}

/**
 * 자산 수정 모달 열기
 * @param {string} assetId - 수정할 자산의 Firebase 키
 */
function openAssetEditModal(assetId) {
    const assetRef = ref(database, `assets/${assetId}`);
    get(assetRef).then((snapshot) => {
        if (snapshot.exists()) {
            const { name, balance } = snapshot.val();
            assetEditModal.style.display = 'flex';
            editAssetNameInput.value = name;
            editAssetBalanceInput.value = balance;
            assetEditForm.dataset.id = assetId;
            deleteAssetBtn.dataset.id = assetId;
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
 * 항목(수입/지출) 선택에 따라 카테고리 옵션 업데이트
 */
function updateCategoryOptions() {
    const selectedType = typeInput.value;
    const previousCategory = categoryInput.value;
    
    categoryInput.innerHTML = '<option value="" selected>-- 카테고리 선택 --</option>'; // 플레이스홀더 옵션 추가

    if (selectedType) { // '수입' 또는 '지출'이 선택된 경우
        const categories = selectedType === 'income' ? incomeCategories : expenseCategories;

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryInput.appendChild(option);
        });
    }
}

/**
 * 자산 추가
 * @param {Event} e - 폼 제출 이벤트
 */
function addAsset(e) {
    e.preventDefault();
    const name = assetNameInput.value;
    const balance = +initialBalanceInput.value;

    if (name.trim() === '' || initialBalanceInput.value.trim() === '') {
        alert('자산 이름과 초기 잔액을 모두 입력해주세요.');
        return;
    }
    push(assetsRef, { name, balance });
    assetForm.reset();
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
    const transaction = {
        date: dateInput.value,
        type: transactionType,
        category: categoryInput.value,
        amount: amount,
        assetId: assetId,
    };

    // 1. Firebase에 거래 내역 추가
    push(transactionsRef, transaction);

    // 2. 해당 자산의 잔액 업데이트
    const assetRef = ref(database, `assets/${assetId}`);
    get(assetRef).then((snapshot) => {
        if (snapshot.exists()) {
            const currentBalance = snapshot.val().balance;
            const newBalance = transactionType === 'income' ? currentBalance + amount : currentBalance - amount;
            update(assetRef, { balance: newBalance });
        }
    });

    // 폼 초기화
    form.reset();
    // 날짜는 오늘 날짜로 다시 설정
    dateInput.value = new Date().toISOString().slice(0, 10);
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
    const newBalance = editAssetBalanceInput.value;

    if (!newName || newBalance === '') {
        alert('자산 이름과 금액을 모두 입력해주세요.');
        return;
    }

    const assetRef = ref(database, `assets/${assetId}`);
    update(assetRef, { name: newName, balance: Number(newBalance) })
        .then(() => {
            closeAssetEditModal();
        })
        .catch((error) => {
            console.error("자산 수정 실패:", error);
            alert("자산 수정 중 오류가 발생했습니다.");
        });
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
            const assetRef = ref(database, `assets/${assetId}`);

            // 2. 해당 자산의 잔액을 복구
            get(assetRef).then((assetSnapshot) => {
                if (assetSnapshot.exists()) {
                    const currentBalance = assetSnapshot.val().balance;
                    const restoredBalance = type === 'income' ? currentBalance - amount : currentBalance + amount;
                    update(assetRef, { balance: restoredBalance });
                }
            });
            // 3. 거래 내역 삭제
            remove(transactionToDeleteRef);
        }
    });
}

/**
 * 초기화 함수
 */
function init() {
    // 오늘 날짜를 기본값으로 설정
    dateInput.value = new Date().toISOString().slice(0, 10);
    
    // 이벤트 리스너 등록
    assetForm.addEventListener('submit', addAsset);
    typeInput.addEventListener('change', updateCategoryOptions); // 항목 변경 시 카테고리 업데이트
    form.addEventListener('submit', addTransaction);
    transactionList.addEventListener('click', deleteTransaction);
    assetList.addEventListener('click', (e) => {
        if (e.target.classList.contains('asset-name')) {
            openAssetEditModal(e.target.dataset.id);
        }
    });
    assetEditForm.addEventListener('submit', updateAsset);
    deleteAssetBtn.addEventListener('click', deleteAsset);
    closeModalBtn.addEventListener('click', closeAssetEditModal);
    assetEditModal.addEventListener('click', (e) => {
        if (e.target === assetEditModal) { // 오버레이 클릭 시 닫기
            closeAssetEditModal();
        }
    });

    // Firebase 데이터베이스의 변경사항을 실시간으로 감지
    onValue(transactionsRef, (snapshot) => {
        const data = snapshot.val();
        renderTransactions(data);
    });

    // 자산 데이터 변경 감지
    onValue(assetsRef, (snapshot) => {
        const data = snapshot.val();
        renderAssets(data);
    });

    // 페이지 로드 시 초기 카테고리 옵션 설정
    updateCategoryOptions();
}

// 페이지 로드 시 초기화 함수 실행
init();
