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
const editAssetBalanceInput = document.getElementById('edit-asset-balance');
const deleteAssetBtn = document.getElementById('delete-asset-btn');
const closeModalBtn = document.getElementById('close-modal-btn');

// 카테고리 목록 정의
const incomeCategories = ['월급', '성과급', '복지포인트', '기타수당', '판매수익', '이벤트수익', '용돈'];
const expenseCategories = ['보험료', '통신료', '관리비', '교통비', 'OTT', '대출이자', '세금', '생활비', '용돈', '경조사비', '여행', '취미', '교육', '지역화폐', '데이트', '판매대금'];

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
    assetSelect.innerHTML = '<option value="">-- 결제 수단 선택 --</option>'; // 드롭다운 초기화

    if (!assets) {
        assetList.innerHTML = '<li>등록된 자산이 없습니다.</li>';
        return;
    }

    Object.keys(assets).forEach(key => {
        // 이 루프는 결제 수단 현황 목록과 거래 내역 폼의 드롭다운만 채웁니다.
        const paymentMethod = assets[key];

        // 자산 현황 목록에 아이템 추가
        const li = document.createElement('li');
        let detailsHtml = '';
        let balanceHtml = '';

        if (paymentMethod.type === 'credit_card') {
            detailsHtml = `<span class="asset-details">(결제예정: ${Number(paymentMethod.pendingAmount || 0).toLocaleString()}원)</span>`;
            balanceHtml = `한도: ${Number(paymentMethod.balance).toLocaleString()}원`;
        } else { // account
            balanceHtml = `${Number(paymentMethod.balance).toLocaleString()}원`;
        }

        li.innerHTML = `<div>
            <span class="asset-name" data-id="${key}">${paymentMethod.name}</span>
            ${detailsHtml}
            </div>
            <span class="asset-balance">${balanceHtml}</span>`;
        assetList.appendChild(li);

        // 거래 내역 폼의 자산 선택 드롭다운에 옵션 추가
        const option = document.createElement('option');
        option.value = key; // Firebase의 고유 키를 값으로 사용
        option.textContent = paymentMethod.name;
        assetSelect.appendChild(option);
    });

    // '연동 계좌' 드롭다운은 별도로 채웁니다.
    linkedAccountSelect.innerHTML = ''; // 여기서 초기화
    Object.keys(assets).forEach(key => {
        const paymentMethod = assets[key];
        if (paymentMethod.type === 'account') { // 계좌 유형만 필터링
            const accountOption = document.createElement('option');
            accountOption.value = key;
            accountOption.textContent = paymentMethod.name;
            linkedAccountSelect.appendChild(accountOption);
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
            const { name, balance } = snapshot.val();
            assetEditModal.style.display = 'flex';
            editAssetNameInput.value = name;
            editAssetBalanceInput.value = balance;
            assetEditForm.dataset.id = assetId; // 수정/삭제 시 사용할 ID 저장
            deleteAssetBtn.dataset.id = assetId; // 수정/삭제 시 사용할 ID 저장
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
    const newBalanceValue = editAssetBalanceInput.value;
    
    const newBalance = Number(newBalanceValue);
    const assetRef = ref(database, `assets/${assetId}`);

    // 1. 기존 자산 정보를 가져와서 금액 변동을 계산
    get(assetRef).then(snapshot => {
        if (!snapshot.exists()) return;
        
        const currentAsset = snapshot.val();

        // 신용카드의 경우 '결제 예정 금액'은 직접 수정하지 않음 (거래 내역 기반)
        if (currentAsset.type === 'credit_card') {
            // 한도만 수정
            update(assetRef, { name: newName, balance: newBalance });
        } else { // 계좌의 경우
            const currentBalance = currentAsset.balance;
            const balanceDifference = newBalance - currentBalance;

            // 2. 자산 이름과 최종 잔액 업데이트
            update(assetRef, { name: newName, balance: newBalance });

            // 3. 금액에 변동이 있을 경우 '잔액 조정' 거래 내역 자동 생성
            if (balanceDifference !== 0) {
                const adjustmentTransaction = {
                    date: getKoreanDateString(),
                    type: balanceDifference > 0 ? 'income' : 'expense',
                    category: '잔액 조정',
                    amount: Math.abs(balanceDifference),
                    assetId: assetId,
                };
                push(transactionsRef, adjustmentTransaction);
            }
        }
        closeAssetEditModal();

    }).catch(error => {
        console.error("자산 수정 중 오류 발생:", error);
        alert("자산 정보를 수정하는 데 실패했습니다.");
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
 * 초기화 함수
 */
function init() {
    // 오늘 날짜를 기본값으로 설정
    dateInput.value = getKoreanDateString();
    
    // 이벤트 리스너 등록
    assetForm.addEventListener('submit', addAsset);
    assetTypeInput.addEventListener('change', async (e) => {
        // 신용카드 선택 시 추가 필드 표시
        if (e.target.value === 'credit_card') {
            // 연동 계좌 목록을 채우기 위해 현재 자산 데이터를 다시 가져옵니다.
            const snapshot = await get(assetsRef);
            const assets = snapshot.val();

            linkedAccountSelect.innerHTML = ''; // 목록 초기화
            if (assets) {
                Object.keys(assets).forEach(key => {
                    const asset = assets[key];
                    if (asset.type === 'account') {
                        const option = document.createElement('option');
                        option.value = key;
                        option.textContent = asset.name;
                        linkedAccountSelect.appendChild(option);
                    }
                });
            }
        }
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
