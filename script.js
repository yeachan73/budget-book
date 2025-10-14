// Firebase SDK 함수 가져오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, onValue, push, remove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

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
const transactionsRef = ref(database, 'transactions');

const form = document.getElementById('transaction-form');
const dateInput = document.getElementById('date');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const amountInput = document.getElementById('amount');
const transactionList = document.getElementById('transaction-list');

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
        date: dateInput.value,
        type: typeInput.value,
        category: categoryInput.value,
        amount: amount,
    };
    // Firebase에 데이터 추가
    push(transactionsRef, transaction);

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
        const id = e.target.getAttribute('data-id');
        const transactionToDeleteRef = ref(database, `transactions/${id}`);

        // Firebase에서 데이터 삭제
        remove(transactionToDeleteRef);
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

    // Firebase 데이터베이스의 변경사항을 실시간으로 감지
    onValue(transactionsRef, (snapshot) => {
        const data = snapshot.val();
        renderTransactions(data);
    });
}

// 페이지 로드 시 초기화 함수 실행
init();
