// NEIS School Meal Information Service Application Logic

// 1. App State
const state = {
  date: new Date(),
  schoolCode: '7010703', // 자운고등학교
  officeCode: 'B10',     // 서울특별시교육청
  schoolName: '자운고등학교',
  schoolLocation: '서울특별시',
  schoolType: '고등학교',
  schoolCoeducation: '남여공학',
  theme: 'dark',
  activeAllergenFilter: null
};

// 2. Allergen Mapping
const ALLERGEN_MAP = {
  1: '난류 (가금류)',
  2: '우유',
  3: '메밀',
  4: '땅콩',
  5: '대두 (콩)',
  6: '밀',
  7: '고등어',
  8: '게',
  9: '새우',
  10: '돼지고기',
  11: '복숭아',
  12: '토마토',
  13: '아황산류',
  14: '호두',
  15: '닭고기',
  16: '쇠고기',
  17: '오징어',
  18: '조개류 (굴/전복/홍합 등)',
  19: '잣'
};

// 3. DOM Elements
const el = {
  schoolName: document.getElementById('school-name'),
  schoolLocation: document.getElementById('school-location'),
  schoolType: document.getElementById('school-type'),
  schoolCoeducation: document.getElementById('school-coeducation'),
  liveTime: document.getElementById('live-time'),
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  openSearchBtn: document.getElementById('open-search-btn'),
  prevDayBtn: document.getElementById('prev-day-btn'),
  nextDayBtn: document.getElementById('next-day-btn'),
  dateText: document.getElementById('date-text'),
  dateInput: document.getElementById('date-input'),
  todayBtn: document.getElementById('today-btn'),
  loader: document.getElementById('loader'),
  mealCardsGrid: document.getElementById('meal-cards-grid'),
  emptyState: document.getElementById('empty-state'),
  allergenBtns: document.querySelectorAll('.allergen-filter-btn'),
  clearAllergenBtn: document.getElementById('clear-allergen-btn'),
  
  // Modal Elements
  searchModal: document.getElementById('search-modal'),
  closeSearchBtn: document.getElementById('close-search-btn'),
  searchSchoolInput: document.getElementById('search-school-input'),
  searchSubmitBtn: document.getElementById('search-submit-btn'),
  searchLoading: document.getElementById('search-loading'),
  searchNoResults: document.getElementById('search-no-results'),
  searchResultsList: document.getElementById('search-results-list')
};

// 4. Initializer
function init() {
  // Load saved theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    state.theme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon();
  }
  
  // Set initial display
  updateDateDisplay();
  renderSchoolHeader();
  
  // Fetch initial meals
  fetchMeals();
  
  // Start clock
  startLiveClock();
  
  // Attach Event Listeners
  setupEventListeners();
}

// 5. Date Helpers
function updateDateDisplay() {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const year = state.date.getFullYear();
  const month = String(state.date.getMonth() + 1).padStart(2, '0');
  const dateStr = String(state.date.getDate()).padStart(2, '0');
  const day = days[state.date.getDay()];
  
  el.dateText.textContent = `${year}년 ${month}월 ${dateStr}일 (${day})`;
  
  // Synchronize with hidden input date
  const yyyy = year;
  const mm = month;
  const dd = dateStr;
  el.dateInput.value = `${yyyy}-${mm}-${dd}`;
}

function getFormattedDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dateStr = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${dateStr}`;
}

// 6. Theme Toggle
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('theme', state.theme);
  updateThemeIcon();
}

function updateThemeIcon() {
  const icon = el.themeToggleBtn.querySelector('i');
  if (state.theme === 'dark') {
    icon.className = 'fa-solid fa-sun';
    el.themeToggleBtn.title = '라이트 모드로 전환';
  } else {
    icon.className = 'fa-solid fa-moon';
    el.themeToggleBtn.title = '다크 모드로 전환';
  }
}

// 7. Live Clock
function startLiveClock() {
  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    el.liveTime.innerHTML = `<i class="fa-regular fa-clock"></i> ${hours}:${minutes}:${seconds}`;
  }
  updateClock();
  setInterval(updateClock, 1000);
}

// 8. Render School Header Information
function renderSchoolHeader() {
  el.schoolName.textContent = state.schoolName;
  el.schoolLocation.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${state.schoolLocation || '전국'}`;
  el.schoolType.innerHTML = `<i class="fa-solid fa-school"></i> ${state.schoolType || '학교'}`;
  el.schoolCoeducation.innerHTML = `<i class="fa-solid fa-venus-mars"></i> ${state.schoolCoeducation || '남여공학'}`;
}

// 9. API Calls: Fetch Meals
async function fetchMeals() {
  // Show loading skeleton / spinner
  el.loader.classList.remove('hidden');
  el.mealCardsGrid.classList.add('hidden');
  el.emptyState.classList.add('hidden');
  
  const formattedDate = getFormattedDate(state.date);
  let data = null;
  
  // 1. Try local Express proxy first
  try {
    const url = `/api/meal?officeCode=${state.officeCode}&schoolCode=${state.schoolCode}&date=${formattedDate}`;
    const response = await fetch(url);
    data = await response.json();
  } catch (localError) {
    console.warn('Local Express proxy failed. Trying direct NEIS fetch via CORS-bypassing proxy...', localError);
    
    // 2. Fallback to public CORS proxy (allorigins.win)
    try {
      const neisUrl = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&ATPT_OFCDC_SC_CODE=${state.officeCode}&SD_SCHUL_CODE=${state.schoolCode}&MLSV_YMD=${formattedDate}`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(neisUrl)}`;
      const response = await fetch(proxyUrl);
      const proxyData = await response.json();
      data = JSON.parse(proxyData.contents);
    } catch (proxyError) {
      console.error('Direct CORS-bypass API fetch failed:', proxyError);
    }
  }
  
  // 3. Render meals if we successfully got data
  try {
    if (data && data.RESULT && data.RESULT.CODE === 'INFO-200') {
      showEmptyState();
    } else if (data && data.mealServiceDietInfo) {
      const rows = data.mealServiceDietInfo[1].row;
      renderMealCards(rows);
    } else {
      showEmptyState();
    }
  } catch (renderError) {
    console.error('Failed rendering meals:', renderError);
    showEmptyState();
  } finally {
    el.loader.classList.add('hidden');
  }
}

// Empty state handler
function showEmptyState() {
  el.mealCardsGrid.innerHTML = '';
  el.emptyState.classList.remove('hidden');
}

// Parse dish string, e.g. "돈육모듬장조림 (5.6.10.13)"
function parseDish(dishStr) {
  // Trim white spaces
  const cleanStr = dishStr.trim();
  
  // Find allergen parenthesis (e.g. "(5.6.10.13)")
  const allergenRegex = /\(([\d.]+)\)/;
  const match = cleanStr.match(allergenRegex);
  
  if (match) {
    const allergenNums = match[1].split('.').map(n => parseInt(n, 10));
    // Remove the allergen part from the name
    const cleanName = cleanStr.replace(allergenRegex, '').trim();
    return {
      name: cleanName,
      allergens: allergenNums
    };
  }
  
  return {
    name: cleanStr,
    allergens: []
  };
}

// Render Meal Cards
function renderMealCards(mealRows) {
  el.mealCardsGrid.innerHTML = '';
  el.mealCardsGrid.classList.remove('hidden');
  
  // Meal service rows (Breakfast, Lunch, Dinner etc.)
  // Sort them: 조식(1) -> 중식(2) -> 석식(3) based on MMEAL_SC_CODE
  mealRows.sort((a, b) => parseInt(a.MMEAL_SC_CODE, 10) - parseInt(b.MMEAL_SC_CODE, 10));
  
  mealRows.forEach(row => {
    // Determine card icon and meal name background based on MMEAL_SC_NM
    const mealCode = row.MMEAL_SC_CODE; // "1"=조식, "2"=중식, "3"=석식
    let mealType = 'lunch';
    let iconClass = 'fa-solid fa-sun-plant-wilt';
    
    if (mealCode === '1') {
      mealType = 'breakfast';
      iconClass = 'fa-solid fa-mug-saucer';
    } else if (mealCode === '2') {
      mealType = 'lunch';
      iconClass = 'fa-solid fa-bowl-rice';
    } else if (mealCode === '3') {
      mealType = 'dinner';
      iconClass = 'fa-solid fa-moon';
    }
    
    // Create card element
    const card = document.createElement('article');
    card.className = 'meal-card glass-panel';
    card.setAttribute('data-meal-type', mealType);
    
    // Parse dishes
    // NEIS DDISH_NM can contain <br/> or <br> to separate dishes
    const rawDishes = row.DDISH_NM.split(/<br\s*\/?>/i);
    const parsedDishes = rawDishes.map(d => parseDish(d)).filter(d => d.name.length > 0);
    
    // Construct Menu Items HTML
    let menuHTML = '';
    parsedDishes.forEach(dish => {
      // Build dots for allergens
      let dotsHTML = '';
      dish.allergens.forEach(num => {
        const allergenName = ALLERGEN_MAP[num] || '알레르기';
        dotsHTML += `<span class="allergen-dot" data-allergen-id="${num}" data-tooltip="${allergenName}">${num}</span>`;
      });
      
      menuHTML += `
        <li class="menu-item" data-allergens="${dish.allergens.join(',')}">
          <span class="menu-item-name">${dish.name}</span>
          <span class="menu-item-allergens">${dotsHTML}</span>
        </li>
      `;
    });
    
    // Parse Nutrition
    // NTR_INFO contains items like "탄수화물(g) : 109.1<br/>단백질(g) : 43.1"
    const rawNutri = row.NTR_INFO ? row.NTR_INFO.split(/<br\s*\/?>/i) : [];
    let nutriItemsHTML = '';
    
    rawNutri.forEach(n => {
      const parts = n.split(':');
      if (parts.length === 2) {
        const label = parts[0].trim();
        const val = parts[1].trim();
        nutriItemsHTML += `
          <div class="nutri-item">
            <span class="nutri-label">${label}</span>
            <span class="nutri-value">${val}</span>
          </div>
        `;
      }
    });
    
    // Parse Origins (ORPLC_INFO)
    const originsHTML = row.ORPLC_INFO ? row.ORPLC_INFO : '등록된 원산지 정보가 없습니다.';
    
    // Card Inner Content
    card.innerHTML = `
      <div class="meal-card-header">
        <div class="meal-title-group">
          <div class="meal-icon">
            <i class="fa-solid ${iconClass}"></i>
          </div>
          <h3>${row.MMEAL_SC_NM}</h3>
        </div>
        <span class="calories-badge">${row.CAL_INFO || '0 Kcal'}</span>
      </div>
      
      <ul class="menu-list">
        ${menuHTML}
      </ul>
      
      <div class="card-details">
        <details class="accordion-details">
          <summary>영양 분석 정보</summary>
          <div class="accordion-content">
            <div class="nutritional-grid">
              ${nutriItemsHTML || '<p class="origin-text">영양 정보가 제공되지 않습니다.</p>'}
            </div>
          </div>
        </details>
        
        <details class="accordion-details">
          <summary>원산지 정보</summary>
          <div class="accordion-content">
            <p class="origin-text">${originsHTML}</p>
          </div>
        </details>
      </div>
    `;
    
    el.mealCardsGrid.appendChild(card);
  });
  
  // Re-apply allergen filter highlighting if active
  if (state.activeAllergenFilter) {
    applyAllergenHighlight(state.activeAllergenFilter);
  }
}

// 10. Allergen Highlights
function setupAllergenFilters() {
  el.allergenBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const allergenId = parseInt(btn.dataset.allergen, 10);
      
      if (state.activeAllergenFilter === allergenId) {
        // Clear filter
        clearAllergenFilter();
      } else {
        // Apply filter
        state.activeAllergenFilter = allergenId;
        
        // Update button styles
        el.allergenBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        applyAllergenHighlight(allergenId);
        el.clearAllergenBtn.classList.remove('hidden');
      }
    });
  });
  
  el.clearAllergenBtn.addEventListener('click', clearAllergenFilter);
}

function applyAllergenHighlight(allergenId) {
  // Remove existing highlights
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('highlight-allergen');
    item.querySelectorAll('.allergen-dot').forEach(dot => dot.classList.remove('active-filter'));
  });
  
  // Find menu items containing this allergen
  document.querySelectorAll('.menu-item').forEach(item => {
    const allergensStr = item.dataset.allergens;
    if (allergensStr) {
      const allergens = allergensStr.split(',').map(n => parseInt(n, 10));
      if (allergens.includes(allergenId)) {
        item.classList.add('highlight-allergen');
        
        // Highlight the specific allergen dot inside the list
        item.querySelectorAll(`.allergen-dot[data-allergen-id="${allergenId}"]`).forEach(dot => {
          dot.classList.add('active-filter');
        });
      }
    }
  });
}

function clearAllergenFilter() {
  state.activeAllergenFilter = null;
  
  // Reset buttons
  el.allergenBtns.forEach(b => b.classList.remove('active'));
  el.clearAllergenBtn.classList.add('hidden');
  
  // Remove list highlights
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('highlight-allergen');
    item.querySelectorAll('.allergen-dot').forEach(dot => dot.classList.remove('active-filter'));
  });
}

// Debounce helper for autocomplete
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// 11. School Search Logic
async function searchSchools(isSilent = false) {
  const query = el.searchSchoolInput.value.trim();
  if (query.length < 2) {
    if (!isSilent) {
      alert('학교명을 두 글자 이상 입력해 주세요.');
    }
    el.searchResultsList.innerHTML = '';
    el.searchNoResults.classList.add('hidden');
    return;
  }
  
  // Show search loader
  el.searchLoading.classList.remove('hidden');
  el.searchNoResults.classList.add('hidden');
  el.searchResultsList.innerHTML = '';
  
  let data = null;
  
  // 1. Try local Express proxy first
  try {
    const url = `/api/school?name=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    data = await response.json();
  } catch (localError) {
    console.warn('Local Express proxy search failed. Trying direct NEIS search via CORS-bypassing proxy...', localError);
    
    // 2. Fallback to public CORS proxy
    try {
      const neisUrl = `https://open.neis.go.kr/hub/schoolInfo?Type=json&SCHUL_NM=${encodeURIComponent(query)}&pIndex=1&pSize=20`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(neisUrl)}`;
      const response = await fetch(proxyUrl);
      const proxyData = await response.json();
      data = JSON.parse(proxyData.contents);
    } catch (proxyError) {
      console.error('Direct CORS-bypass school search failed:', proxyError);
    }
  }
  
  // 3. Render school search results
  el.searchLoading.classList.add('hidden');
  
  try {
    if (data && data.RESULT && data.RESULT.CODE === 'INFO-200') {
      el.searchNoResults.classList.remove('hidden');
    } else if (data && data.schoolInfo) {
      const results = data.schoolInfo[1].row;
      renderSearchResults(results);
    } else {
      el.searchNoResults.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error processing school search results:', error);
    el.searchNoResults.classList.remove('hidden');
  }
}

function renderSearchResults(schools) {
  el.searchResultsList.innerHTML = '';
  
  schools.forEach(school => {
    const li = document.createElement('li');
    li.className = 'search-result-item';
    
    // Address detail display
    const address = school.ORG_RDNMA || school.LCTN_SC_NM;
    
    li.innerHTML = `
      <span class="result-school-name">${school.SCHUL_NM}</span>
      <span class="result-school-location"><i class="fa-solid fa-location-dot"></i> ${address}</span>
    `;
    
    // Click result handler
    li.addEventListener('click', () => {
      // Set new state
      state.schoolCode = school.SD_SCHUL_CODE;
      state.officeCode = school.ATPT_OFCDC_SC_CODE;
      state.schoolName = school.SCHUL_NM;
      state.schoolLocation = school.LCTN_SC_NM;
      state.schoolType = school.SCHUL_KND_SC_NM;
      state.schoolCoeducation = school.COEDU_SC_NM;
      
      // Update header UI
      renderSchoolHeader();
      
      // Close modal
      closeSearchModal();
      
      // Clear search inputs
      el.searchSchoolInput.value = '';
      el.searchResultsList.innerHTML = '';
      
      // Fetch new meals
      fetchMeals();
    });
    
    el.searchResultsList.appendChild(li);
  });
}

function openSearchModal() {
  el.searchModal.classList.remove('hidden');
  el.searchSchoolInput.focus();
  document.body.style.overflow = 'hidden'; // Stop background scrolling
}

function closeSearchModal() {
  el.searchModal.classList.add('hidden');
  document.body.style.overflow = '';
}

// 12. Setup All Event Listeners
function setupEventListeners() {
  // Theme Toggle
  el.themeToggleBtn.addEventListener('click', toggleTheme);
  
  // Date Nav Arrow Buttons
  el.prevDayBtn.addEventListener('click', () => {
    state.date.setDate(state.date.getDate() - 1);
    updateDateDisplay();
    fetchMeals();
  });
  
  el.nextDayBtn.addEventListener('click', () => {
    state.date.setDate(state.date.getDate() + 1);
    updateDateDisplay();
    fetchMeals();
  });
  
  // Today Button
  el.todayBtn.addEventListener('click', () => {
    state.date = new Date();
    updateDateDisplay();
    fetchMeals();
  });
  
  // Hidden Date Picker Input
  el.dateInput.addEventListener('change', (e) => {
    const selectedDate = new Date(e.target.value);
    if (!isNaN(selectedDate.getTime())) {
      state.date = selectedDate;
      updateDateDisplay();
      fetchMeals();
    }
  });
  
  // Search Modal Handlers
  el.openSearchBtn.addEventListener('click', openSearchModal);
  el.closeSearchBtn.addEventListener('click', closeSearchModal);
  
  // Close modal when clicking on backdrop
  el.searchModal.addEventListener('click', (e) => {
    if (e.target === el.searchModal) {
      closeSearchModal();
    }
  });
  
  // School Search Submission
  el.searchSubmitBtn.addEventListener('click', () => searchSchools(false));
  el.searchSchoolInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      searchSchools(false);
    }
  });
  
  // School Autocomplete as user types
  const debouncedSearch = debounce(() => {
    searchSchools(true);
  }, 300);
  el.searchSchoolInput.addEventListener('input', debouncedSearch);
  
  // Allergen highlight setups
  setupAllergenFilters();
}

// Run initializer on window load
window.addEventListener('DOMContentLoaded', init);
