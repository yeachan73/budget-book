// DOM 요소 선택
const form = document.getElementById('transaction-form');
const dateInput = document.getElementById('date');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const amountInput = document.getElementById('amount');
const transactionList = document.getElementById('transaction-list');

// localStorage에서 데이터 불러오기. 데이터가 없으면 빈 배열로 초기화
const LOCAL_STORAGE_KEY = 'transactions';
let transactions = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];

/**
 * localStorage에 거래 내역 저장
 */
function saveTransactions() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(transactions));
}

/**
 * 화면에 거래 내역 렌더링
 */
function renderTransactions() {
    // 목록 초기화
    transactionList.innerHTML = '';

    if (transactions.length === 0) {
        transactionList.innerHTML = '<tr><td colspan="5">거래 내역이 없습니다.</td></tr>';
        return;
    }

    transactions.forEach((transaction, index) => {
        const row = document.createElement('tr');
        
        // 수입/지출에 따라 클래스 추가
        row.classList.add(transaction.type);

        row.innerHTML = `
            <td>${transaction.date}</td>
            <td>${transaction.type === 'income' ? '수입' : '지출'}</td>
            <td>${transaction.category}</td>
            <td>${Number(transaction.amount).toLocaleString()}원</td>
            <td><button class="delete-btn" data-index="${index}">삭제</button></td>
        `;
        transactionList.appendChild(row);
    });
}

/**
 * 거래 내역 추가
 * @param {Event} e - 폼 제출 이벤트
 */
function addTransaction(e) {
    e.preventDefault();

    // 입력값 유효성 검사
    if (dateInput.value.trim() === '' || categoryInput.value.trim() === '' || amountInput.value.trim() === '') {
        alert('모든 필드를 입력해주세요.');
        return;
    }
    
    const amount = +amountInput.value;
    if (amount <= 0) {
        alert('금액은 0보다 커야 합니다.');
        return;
    }

    // 새 거래 내역 객체 생성
    const transaction = {
        id: Date.now(), // 고유 ID 생성
        date: dateInput.value,
        type: typeInput.value,
        category: categoryInput.value,
        amount: amount,
    };

    // 배열에 추가
    transactions.push(transaction);

    // 저장 및 화면 업데이트
    saveTransactions();
    renderTransactions();

    // 폼 초기화
    form.reset();
    // 날짜는 오늘 날짜로 다시 설정
    dateInput.value = new Date().toISOString().slice(0, 10);
}

/**
 * 거래 내역 삭제
 * @param {Event} e - 클릭 이벤트
 */
function deleteTransaction(e) {
    if (e.target.classList.contains('delete-btn')) {
        const index = e.target.getAttribute('data-index');
        
        // 배열에서 해당 인덱스의 항목 1개 제거
        transactions.splice(index, 1);

        // 저장 및 화면 업데이트
        saveTransactions();
        renderTransactions();
    }
}

/**
 * 초기화 함수
 */
function init() {
    // 오늘 날짜를 기본값으로 설정
    dateInput.value = new Date().toISOString().slice(0, 10);
    
    // 이벤트 리스너 등록
    form.addEventListener('submit', addTransaction);
    transactionList.addEventListener('click', deleteTransaction);

    // 초기 데이터 렌더링
    renderTransactions();
}

// 페이지 로드 시 초기화 함수 실행
init();
