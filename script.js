document.addEventListener('DOMContentLoaded', () => {
  // العناصر الأساسية
  const settingsMenu = document.getElementById('settingsMenu');
  const settingsButton = document.getElementById('settingsButton');
  const clickSound = document.getElementById('clickSound');
  const correctSound = document.getElementById('correctSound');
  const wrongSound = document.getElementById('wrongSound');
  const rainSound = document.getElementById('rainSound');
  const soundToggle = document.getElementById('soundToggle');
  const darkToggle = document.getElementById('darkModeToggle');
  const fontSlider = document.getElementById('fontSlider');
  const nextBtn = document.querySelector('.next-btn');
  const retryBtn = document.querySelector('.retry-btn');
  const progressBar = document.getElementById('progressBar');
  const timeLabel = document.getElementById('timeLabel');
  const timeCount = document.getElementById('timeCount');
  const timerFill = document.getElementById('timerFill');
  let starsDisplay = document.getElementById('starsDisplay');
  const countdownElement = document.querySelector('#countdownTimer .time-text');
  const progressRing = document.querySelector('#countdownTimer .progress-ring');
  const countdownTimer = document.getElementById('countdownTimer');

  // التحقق من العناصر مع تسجيل تحذير
  const requiredElements = { settingsMenu, settingsButton, clickSound, correctSound, wrongSound, rainSound, soundToggle, darkToggle, fontSlider, nextBtn, retryBtn, progressBar, timeLabel, timeCount, timerFill, starsDisplay, countdownElement, progressRing, countdownTimer };
  for (const [key, value] of Object.entries(requiredElements)) {
    if (!value) console.warn(`عنصر ${key} غير موجود في DOM`);
  }

  // إعدادات الصوت
  if (clickSound) clickSound.volume = 0.3;
  if (correctSound) correctSound.volume = 0.6;
  if (wrongSound) wrongSound.volume = 0.7;
  if (rainSound) rainSound.volume = 0.2;

  const TIME_LIMIT = 15; // مدة الكويز بالثواني
  const RESET_INTERVAL = 30 * 60; // 30 دقيقة لإعادة تعيين النجوم
 const MAX_STARS = 3; // ✅ عدد النجوم عند أول دخول
  let timer;
  let timeLeft = TIME_LIMIT;
  let quizData = [];
  let currentQuestionIndex = 0;
  let correctCount = 0;
  let currentQuizType = '';
let stars = parseInt(localStorage.getItem('quizStars'));
if (isNaN(stars)) {
  stars = MAX_STARS; // فقط في أول مرة
}
  let lockoutUntil = parseInt(localStorage.getItem('lockoutUntil')) || 0;
  let consecutiveCorrectAnswers = 0;

  // إضافة تحقق بسيط لمنع التلاعب
  const STORAGE_KEY = 'appIntegrityCheck';
  function validateStorage() {
    const storedChecksum = localStorage.getItem(STORAGE_KEY);
    const currentChecksum = btoa(stars + lockoutUntil);
    if (storedChecksum && storedChecksum !== currentChecksum) {
      console.warn('تم الكشف عن محاولة تلاعب في localStorage');
      stars = MAX_STARS; // إعادة تعيين النجوم إلى الحد الأقصى بدلاً من 0
      lockoutUntil = 0;
      localStorage.setItem('quizStars', stars);
      localStorage.setItem('lockoutUntil', lockoutUntil);
      localStorage.setItem('starsResetStartTime', Date.now());
      localStorage.setItem(STORAGE_KEY, btoa(stars + lockoutUntil));
    }
  }

  // تحميل الإعدادات من localStorage
  if (soundToggle) {
    soundToggle.checked = localStorage.getItem('soundEnabled') !== 'false';
  }
  if (darkToggle) {
    darkToggle.checked = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark-mode', darkToggle.checked);
  }
  if (fontSlider) {
    fontSlider.value = localStorage.getItem('fontSize') || 100;
    document.documentElement.style.fontSize = fontSlider.value + '%';
  }
  if (rainSound && soundToggle && soundToggle.checked) {
    rainSound.muted = false;
    rainSound.play().catch(e => console.warn('خطأ في تشغيل صوت المطر:', e));
  } else if (rainSound) {
    rainSound.muted = true;
  }

  // عرض النجوم في واجهة المستخدم
  function updateStarsDisplay() {
    if (!starsDisplay) {
      starsDisplay = document.createElement('div');
      starsDisplay.id = 'starsDisplay';
      starsDisplay.className = 'stars-display glass-effect';
      document.body.appendChild(starsDisplay);
    }
    starsDisplay.innerHTML = `🌟 النجوم: ${stars}`;
    localStorage.setItem('quizStars', stars);
    localStorage.setItem(STORAGE_KEY, btoa(stars + lockoutUntil));
  }

  // إدارة عداد dispensary الوقت العصري
  function manageCountdown() {
    if (!countdownElement || !progressRing || !countdownTimer) {
      console.warn('عناصر countdownTimer مفقودة');
      return;
    }

    validateStorage(); // التحقق من سلامة البيانات

    // إذا كانت النجوم أكثر من 0، أخفِ العداد
    if (stars > 0 || lockoutUntil === 0) {
      countdownTimer.classList.remove('active');
      localStorage.removeItem('starsResetStartTime');
      return;
    }

    // إذا كانت النجوم 0، أظهر العداد
    countdownTimer.classList.add('active');

    // استرجع وقت البدء من localStorage أو ابدأ من جديد
    let startTime = parseInt(localStorage.getItem('starsResetStartTime')) || Date.now();
    if (!localStorage.getItem('starsResetStartTime')) {
      localStorage.setItem('starsResetStartTime', startTime);
    }

    // التحقق من التلاعب بوقت الجهاز
    const now = Date.now();
    if (startTime > now) {
      console.warn('تم الكشف عن تغيير في وقت الجهاز');
      startTime = now;
      lockoutUntil = now + 1800 * 1000; // 1800 seconds = 30 minutes
      localStorage.setItem('starsResetStartTime', startTime);
      localStorage.setItem('lockoutUntil', lockoutUntil);
      localStorage.setItem(STORAGE_KEY, btoa(stars + lockoutUntil));
    }

    const countdown = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      let timeLeft = RESET_INTERVAL - elapsed;

      if (timeLeft <= 0) {
        clearInterval(countdown);
        stars = MAX_STARS;
        lockoutUntil = 0;
        localStorage.setItem('quizStars', stars);
        localStorage.setItem('lockoutUntil', lockoutUntil);
        localStorage.setItem(STORAGE_KEY, btoa(stars + lockoutUntil));
        localStorage.removeItem('starsResetStartTime');
        updateStarsDisplay();
        countdownTimer.classList.remove('active');
        updateButtonStates(); // تحديث حالة الأزرار بعد إعادة تعيين النجوم
        return;
      }

      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      const circumference = window.innerWidth <= 600 ? 150.7 : 188.4;
      const progress = (timeLeft / RESET_INTERVAL) * circumference;
      progressRing.style.strokeDashoffset = circumference - progress;
    }, 1000);
  }

  // التحقق من الحظر
  function checkLockout() {
    validateStorage(); // التحقق من سلامة البيانات
    const now = Date.now();
    if (stars <= 0 && now < lockoutUntil) {
      const timeLeft = Math.ceil((lockoutUntil - now) / 60000);
      const quizPopup = document.getElementById('quizPopup');
      if (quizPopup) {
        const content = quizPopup.querySelector('.popup-content');
        if (content) {
          content.classList.remove('quiz-popup', 'date-quiz-popup');
          const quizTitle = document.getElementById('quiz-title');
          const quizQuestion = document.getElementById('quiz-question');
          const quizOptions = document.getElementById('quiz-options');
          const quizFeedback = document.getElementById('quiz-feedback');
          if (quizTitle && quizQuestion && quizOptions && quizFeedback) {
            quizTitle.textContent = '🚫 نفاد النجوم!';
            quizQuestion.textContent = `لا يمكنك اللعب حتى بعد ${timeLeft} دقيقة.`;
            quizOptions.innerHTML = '<button class="ad-button">📺 شاهد إعلانًا لربح 3 نجوم</button>';
            quizFeedback.textContent = '';
            quizPopup.style.display = 'flex';
            const adButton = quizOptions.querySelector('.ad-button');
            if (adButton) {
              adButton.addEventListener('click', window.watchAd);
            }
          }
        }
      }
      manageCountdown();
      updateButtonStates();
      return true;
    } else if (stars <= 0) {
      stars = MAX_STARS; // إعادة تعيين النجوم إلى الحد الأقصى
      lockoutUntil = 0;
      localStorage.setItem('quizStars', stars);
      localStorage.setItem('lockoutUntil', lockoutUntil);
      localStorage.setItem(STORAGE_KEY, btoa(stars + lockoutUntil));
      manageCountdown();
      updateButtonStates();
    }
    return false;
  }

  // تحديث حالة الأزرار بناءً على عدد النجوم
  function updateButtonStates() {
    const quizButtons = document.querySelectorAll('.quiz-btn');
    quizButtons.forEach(button => {
      button.disabled = stars <= 0;
      button.style.opacity = stars <= 0 ? '0.5' : '1';
      button.style.cursor = stars <= 0 ? 'not-allowed' : 'pointer';
    });
    if (nextBtn) {
      nextBtn.disabled = stars <= 0 || currentQuestionIndex >= quizData.length;
      nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '1';
      nextBtn.style.cursor = nextBtn.disabled ? 'not-allowed' : 'pointer';
    }
    if (retryBtn) {
      retryBtn.disabled = stars <= 0;
      retryBtn.style.opacity = retryBtn.disabled ? '0.5' : '1';
      retryBtn.style.cursor = retryBtn.disabled ? 'not-allowed' : 'pointer';
    }
  }
 // دالة لمحاكاة مشاهدة إعلان

// دالة مشاهدة إعلان مع عداد وقت
window.watchAd = () => {
    if (stars < MAX_STARS) {
        // 🔹 فتح نافذة الإعلان
        let adWindow = window.open(
            "https://www.profitableratecpm.com/iqsjviky6?key=f911fc91ce0af61916ad5c868fdeaf1e",
            "_blank",
            "width=800,height=600"
        );

        if (!adWindow) {
            alert("⚠️ الرجاء السماح بفتح النوافذ المنبثقة لمشاهدة الإعلان.");
            return;
        }

        // 🔹 إنشاء نافذة Popup للعداد
        let countdownPopup = document.createElement("div");
        countdownPopup.id = "adCountdownPopup";
        countdownPopup.style.position = "fixed";
        countdownPopup.style.top = "50%";
        countdownPopup.style.left = "50%";
        countdownPopup.style.transform = "translate(-50%, -50%)";
        countdownPopup.style.padding = "20px";
        countdownPopup.style.background = "#fff";
        countdownPopup.style.border = "2px solid #333";
        countdownPopup.style.borderRadius = "10px";
        countdownPopup.style.textAlign = "center";
        countdownPopup.style.fontSize = "18px";
        countdownPopup.style.zIndex = "9999";
        countdownPopup.innerHTML = `
            ⏳ الرجاء الانتظار... 
            <br> 
            <span id="adTimer">10</span> ثانية
        `;
        document.body.appendChild(countdownPopup);

        // 🔹 مدة المشاهدة المطلوبة
        let watchTime = 10;
        let elapsed = 0;

        let adInterval = setInterval(() => {
            // إذا أغلق الإعلان بكري
            if (adWindow.closed) {
                clearInterval(adInterval);
                document.body.removeChild(countdownPopup);
                alert("❌ يجب مشاهدة الإعلان كاملاً لربح النجوم.");
                return;
            }

            elapsed++;
            let remaining = watchTime - elapsed;
            document.getElementById("adTimer").textContent = remaining;

            if (elapsed >= watchTime) {
                clearInterval(adInterval);
                adWindow.close();
                document.body.removeChild(countdownPopup);

                // ✅ يكسب النجوم
                alert('✅ انتهى الوقت! ربحت 3 نجوم 🎉');
                stars = Math.min(MAX_STARS, stars + 3);
                lockoutUntil = 0;
                localStorage.setItem('quizStars', stars);
                localStorage.setItem('lockoutUntil', lockoutUntil);
                localStorage.setItem(STORAGE_KEY, btoa(stars + lockoutUntil));
                localStorage.removeItem('starsResetStartTime');
                updateStarsDisplay();
                closeAllPopups();
                manageCountdown();
                updateButtonStates();
                playClickSound();
            }
        }, 1000);
    }
};


   // التعديل المطلوب: ملخص الجغرافيا
function closeAllPopups() {
  document.querySelectorAll('.popup-overlay').forEach(popup => popup.remove());
}

function playClickSound() {
  if (clickSound && soundToggle && soundToggle.checked) {
    clickSound.currentTime = 0; // إعادة تعيين الصوت للبداية
    clickSound.play().catch(e => console.warn('فشل تشغيل صوت النقر:', e));
  }
}


window.showGeographySummaries = () => {
  closeAllPopups();
  const popup = document.createElement('div');
  popup.className = 'popup-overlay';
  popup.innerHTML = `
    <div class="popup-content modern-glass" style="direction: rtl; max-width: 900px; max-height: 85vh; overflow-y: auto; font-family: 'Tajawal', sans-serif; padding: 30px; border-radius: 20px;">
      <button class="close-btn" onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 15px; left: 15px; font-size: 28px; cursor: pointer; color: #fff; background: rgba(255, 0, 0, 0.7); border-radius: 50%; width: 40px; height: 40px; display: flex; justify-content: center; align-items: center;">×</button>
      <h2 style="text-align: center; color: #fff; font-size: 2rem; margin-bottom: 30px;">🗺️ ملخص دروس الجغرافيا</h2>
      
      <!-- الدرس الأول: إشكالية التقدم والتخلف -->
      <div class="lesson-section">
        <h3 class="lesson-title">📘 الدرس الأول: إشكالية التقدم والتخلف</h3>
        <div class="lesson-content">
          <div class="content-box">
            <h4>🔹 معايير ومؤشرات تصنيف الدول</h4>
            <p class="sub-title">1. المعايير الاقتصادية 💰</p>
            <ul>
              <li>حجم القطاع الصناعي 🏭</li>
              <li>نوع النشاط الصناعي (ثقيل، خفيف...) 🔩</li>
              <li>حالة الميزان التجاري ⚖️</li>
              <li>الدخل الفردي والوطني 💵</li>
              <li>نوعية وحجم الصادرات والواردات 📦🚢</li>
            </ul>
            <p class="comment">💬 يعني: ينظرون إلى ما تنتجه الدولة، ما تبيعه، دخل المواطن، وكمية الصادرات والواردات.</p>
          </div>
          <div class="content-box">
            <p class="sub-title">2. المعيار الاجتماعي 👨‍👩‍👧‍👦</p>
            <ul>
              <li>مستوى المعيشة 🏠</li>
              <li>نسبة الأمية 📚❌</li>
              <li>معدل الولادات والوفيات 👶⚰️</li>
              <li>مؤشر التنمية البشرية (IDH) 📊</li>
              <li>عدد الاختراعات والإصدارات العلمية 🔬</li>
            </ul>
            <p class="comment">💬 يعني: يهتمون بالحالة الاجتماعية، هل الناس متعلمة؟ هل تعيش برفاهية؟ هل هناك اختراعات؟</p>
          </div>
          <div class="content-box">
            <h4>🔹 أسباب التخلف في عالم الجنوب 🌍⬇️</h4>
            <ul>
              <li>الاستعمار ونهب الثروات ⚔️💎</li>
              <li>سوء استغلال الثروات الطبيعية والبشرية ❌⛏️</li>
              <li>التبعية الاقتصادية لدول الشمال 🌐💸</li>
              <li>ضعف الصناعة، الاعتماد على الصناعة الاستخراجية 🛢️</li>
              <li>غياب الأمن والاستقرار السياسي 🚫🛡️</li>
              <li>تحكم الشركات الأجنبية في الاقتصاد 🏢💼</li>
            </ul>
            <p class="comment">💬 الجنوب متخلف بسبب الاستعمار، التبعية، وسيطرة الشركات الأجنبية.</p>
          </div>
          <div class="content-box">
            <h4>🔹 أسباب تقدم عالم الشمال 🌍⬆️</h4>
            <ul>
              <li>الاستفادة من الاستعمار سابقًا 💰</li>
              <li>استغلال جيد للإمكانيات 🚜</li>
              <li>قطاع صناعي قوي ومتطور 🏭</li>
              <li>استقرار سياسي وأمني 🕊️</li>
              <li>السيطرة على الأسواق العالمية 🛍️🌍</li>
            </ul>
            <p class="comment">💬 الشمال متقدم لأنه استغل موارده وسيطر على الأسواق.</p>
          </div>
          <div class="content-box">
            <h4>🔹 مظاهر التخلف في عالم الجنوب ⚠️</h4>
            <ul>
              <li>عدم تحقيق الاكتفاء الذاتي 🚫🌾</li>
              <li>ضعف العملة المحلية 💱⬇️</li>
              <li>انهيار القطاع الصناعي 🏭❌</li>
              <li>البطالة، الأمراض، الأمية 😷📚🚫</li>
              <li>التضخم النقدي 💸🔥</li>
            </ul>
            <p class="comment">💬 الناس تعاني من البطالة، ضعف العملة، وغياب الصناعة.</p>
          </div>
          <div class="content-box">
            <h4>🔹 مظاهر التقدم في عالم الشمال ✅</h4>
            <ul>
              <li>الاكتفاء الذاتي الغذائي 🍞</li>
              <li>عملة قوية 🪙⬆️</li>
              <li>نظام صحي متطور 🏥</li>
              <li>أمية قليلة وأمراض نادرة 📚✔️</li>
              <li>تعليم متطور 🎓</li>
              <li>استقرار اقتصادي</li>
            </ul>
            <p class="comment">💬 الشمال لديه صحة، تعليم، واستقرار اقتصادي قوي.</p>
          </div>
          <div class="content-box">
            <h4>🔹 الحلول الممكنة للخروج من دائرة التخلف 💡</h4>
            <ul>
              <li>دعم الطبقة المثقفة 🧠</li>
              <li>استغلال جيد للموارد 🏞️</li>
              <li>التخلص من التبعية الاقتصادية 🔓</li>
              <li>دعم الزراعة والصناعة 🚜🏭</li>
              <li>تطوير الصناعة التحويلية 🛠️</li>
            </ul>
            <p class="comment">💬 للخروج من التخلف، يجب الاعتماد على أنفسنا وتطوير الصناعة.</p>
          </div>
        </div>
      </div>

      <!-- الدرس الثاني: المبادلات والتنقلات في العالم -->
      <div class="lesson-section">
        <h3 class="lesson-title">📘 الدرس الثاني: المبادلات والتنقلات في العالم</h3>
        <div class="lesson-content">
          <div class="content-box">
            <h4>🔹 العوامل المتحكمة في أسعار البترول 🛢️</h4>
            <ul>
              <li>قانون العرض والطلب ⚖️</li>
              <li>تحكم الكارتل العالمي 🌐</li>
              <li>جودة البترول (مثال: برنت) ⭐</li>
              <li>الأزمات السياسية في الدول المنتجة ⚔️</li>
              <li>سياسات منظمة أوبك OPEC 🏛️</li>
            </ul>
            <p class="comment">💬 الأسعار تعتمد على العرض والطلب، الأزمات، وجودة البترول.</p>
          </div>
          <div class="content-box">
            <h4>🔹 أهمية البترول كمادة ⛽</h4>
            <ul>
              <li>مصدر طاقة رئيسي 🔋</li>
              <li>تعدد مشتقاته (بنزين، ديزل...) 🚗</li>
              <li>يوفر مناصب شغل 👷‍♂️</li>
              <li>مصدر دخل كبير 💵</li>
              <li>سهل التخزين والنقل 🚛</li>
            </ul>
            <p class="comment">💬 البترول أساسي للطاقة، الصناعة، والنقل.</p>
          </div>
          <div class="content-box">
            <h4>🔹 العوامل المتحكمة في أسعار القمح 🌾</h4>
            <ul>
              <li>  قانون العرض والطلب  📈</li>
              <li>تحكم الدول الكبرى المنتجة 🏛️</li>
              <li>جودة القمح 🍞</li>
              <li>أزمات سياسية وأمنية ⚠️</li>
              <li>المناخ العام خلال الموسم ☀️🌧️</li>
            </ul>
            <p class="comment">💬 الأسعار تتأثر بالإنتاج، الطلب، والمناخ.</p>
          </div>
          <div class="content-box">
            <h4>🔹 أهمية القمح 🍞</h4>
            <ul>
              <li>غذاء أساسي للشعوب 🧑‍🍳</li>
              <li>يدخل في الصناعات الغذائية 🍪</li>
              <li>يوفر مناصب شغل 🧑‍🌾</li>
              <li>مصدر دخل أساسي 💵</li>
              <li>سلاح اقتصادي ⚔️</li>
            </ul>
            <p class="comment">💬 القمح غذاء رئيسي، ويُستخدم كسلاح اقتصادي.</p>
          </div>
          <div class="content-box">
            <h4>🔹 منظمة الأوبك OPEC 🏛️</h4>
            <ul>
              <li>منظمة دول منتجة للبترول</li>
              <li>تأسست عام 1960: السعودية، العراق، إيران، الكويت، فنزويلا 🛢️</li>
              <li>تنظم الإنتاج والأسعار</li>
            </ul>
            <p class="comment">💬 تسعى لتنظيم سوق البترول وتثبيت الأسعار. يمكنك حفظ الدول على شكل كلمة اسعفك</p>
          </div>
          <div class="content-box">
            <h4>🔹 مشاكل منظمة الأوبك ⚠️</h4>
            <ul>
              <li>عدم احترام القوانين من الأعضاء ❌</li>
              <li>مشاكل داخلية وصراعات سياسية ⚔️</li>
              <li>ضغط من الشركات الكبرى 🏢</li>
              <li>ضغط من الدول الرأسمالية 🧊</li>
              <li>البحث عن طاقات بديلة 🌱</li>
            </ul>
            <p class="comment">💬 الأوبك تواجه تحديات من الأعضاء والدول الكبرى.</p>
          </div>
          <div class="content-box">
            <h4>🔹 دور حركة رؤوس الأموال 💸</h4>
            <ul>
              <li>تمويل المشاريع 🏗️</li>
              <li>توفير سلع من الخارج 🛍️</li>
              <li>خلق مناصب شغل 👨‍🔧</li>
              <li>ضرائب للخزينة العامة 🏦</li>
              <li>نقل التكنولوجيا من الشمال للجنوب 🧠</li>
            </ul>
            <p class="comment">💬 الأموال تدعم المشاريع وتنقل التكنولوجيا.</p>
          </div>
          <div class="content-box">
            <h4>🔹 دور الإعلام في المبادلات 📺</h4>
            <ul>
              <li>الإشهار والترويج للمنتجات 📢</li>
              <li>مراقبة السوق والأسعار 🧾</li>
              <li>تسهيل التجارة الإلكترونية 💻</li>
              <li>شراكات بين رجال الأعمال 🤝</li>
              <li>تقليص دور الوسيط 🪪</li>
            </ul>
            <p class="comment">💬 الإعلام يعزز التجارة ويربط رجال الأعمال.</p>
          </div>
        </div>
      </div>

      <!-- الوحدة الثانية: القوى الاقتصادية الكبرى -->
      <div class="lesson-section">
        <h3 class="lesson-title">🌍 الوحدة الثانية: القوى الاقتصادية الكبرى</h3>
        <div class="lesson-content">
          <div class="content-box">
            <h4>📘 الدرس الأول: مصادر القوة الاقتصادية الأمريكية 🇺🇸</h4>
            <h5>🔹 عوامل القوة الاقتصادية</h5>
            <ul>
              <li>اتساع المساحة وتنوع الثروات الطبيعية ⛏️</li>
              <li>طول الشريط الساحلي واستعماله في الصيد والنقل 🌊</li>
              <li>الموقع الجغرافي الجيد وسهولة الاتصال بالعالم 🗺️</li>
              <li>تعدد الأقاليم المناخية وتنوع المحاصيل الزراعية 🌾</li>
              <li>وفرة الثروة المائية من الأنهار والبحيرات 💧</li>
              <li>القوة الديموغرافية ووفرة اليد العاملة 👨‍👩‍👧‍👦</li>
              <li>أهمية الأقاليم الاقتصادية الأمريكية 🏭</li>
            </ul>
          </div>
          <div class="content-box">
            <h5>🔹 دور إقليم الشمال الشرقي 🧭</h5>
            <ul>
              <li>يقع في الشرق ويطل على المحيط الأطلسي 🌊</li>
              <li>كثافة سكانية عالية 👥</li>
              <li>تجمع المدن “ميغالوبوليس” 🏙️</li>
              <li>أهم إقليم صناعي (الحزام الصناعي) 🏭</li>
              <li>يساهم بـ 48% من الإنتاج الصناعي 📊</li>
              <li>مؤسسات مالية وسياسية 🏦</li>
              <li>منطقة زراعية معروفة بزراعة الذرة 🌽</li>
            </ul>
          </div>
          <div class="content-box">
            <h5>🔹 مظاهر القوة الاقتصادية 💪💰</h5>
            <ul>
              <li>تنوع وضخامة الإنتاج الصناعي والزراعي 🏭🌾</li>
              <li>قوة الدولار وانتشاره عالمياً 💵</li>
              <li>امتلاك شركات متعددة الجنسيات 🏢</li>
              <li>شبكة نقل كبيرة وحديثة 🚄</li>
              <li>أكبر المؤسسات المالية في العالم 🏦</li>
            </ul>
          </div>
          <div class="content-box">
            <h5>🔹 أثر الاقتصاد الأمريكي على الاقتصاد العالمي 🌎</h5>
            <ul>
              <li>التدخل في دول الجنوب لخدمة مصالحها 🛬</li>
              <li>السيطرة على الأسواق العالمية الاستراتيجية 🛢️</li>
              <li>قوة الأسطول البحري والجوي 🚢</li>
              <li>تحديد أسعار المواد الأولية من بورصتها 💹</li>
              <li>الهيمنة على المؤسسات المالية العالمية 🏦</li>
            </ul>
          </div>
          <div class="content-box">
            <h4>📘 الدرس الثالث: الاتحاد الأوروبي قوة اقتصادية كبرى</h4>
            <h5>✅ مظاهر القوة الاقتصادية</h5>
            <p class="sub-title">الزراعة:</p>
            <ul>
              <li>تطبيق سياسة فلاحية مشتركة (PAC) 🇪🇺</li>
              <li>تحقيق الأمن الغذائي وتصدير الفائض 📦</li>
            </ul>
            <p class="sub-title">الصناعة:</p>
            <ul>
              <li>قوة صناعية ضخمة في الميكانيك، السيارات، الفضاء 🚗✈️</li>
            </ul>
            <p class="sub-title">التجارة:</p>
            <ul>
              <li>ثاني قوة تجارية في العالم بعد الصين 📈</li>
              <li>تبادل تجاري كبير بين الدول الأعضاء وخارجها 🌍</li>
            </ul>
            <p class="sub-title">الخدمات:</p>
            <ul>
              <li>تطور السياحة، النقل، والبنوك 🏦🧳🚄</li>
            </ul>
          </div>
          <div class="content-box">
            <h5>✅ عوامل القوة</h5>
            <p class="sub-title">طبيعية:</p>
            <ul>
              <li>تنوع المناخات والتربة 🌦️🌾</li>
              <li>موارد طبيعية كثيرة (فحم، حديد، غاز) ⛏️</li>
            </ul>
            <p class="sub-title">بشرية:</p>
            <ul>
              <li>يد عاملة مؤهلة 👨‍🏭</li>
              <li>كثافة سكانية (450 مليون نسمة) 👥</li>
            </ul>
            <p class="sub-title">اقتصادية وتنظيمية:</p>
            <ul>
              <li>وجود سوق موحدة وحرية تنقل السلع والأشخاص 🚛🛂</li>
              <li>عملة موحدة (الأورو €) 💶</li>
            </ul>
          </div>
          <div class="content-box">
            <h4>📘 الدرس الرابع: القوة الاقتصادية لشرق وجنوب شرق آسيا</h4>
            <h5>✅ مظاهر القوة الاقتصادية</h5>
            <p class="sub-title">الصناعة:</p>
            <ul>
              <li>قوة صناعية عالمية (اليابان، كوريا، الصين...) 🏭🔋</li>
              <li>تخصص في التكنولوجيا، الإلكترونيات، النسيج، السيارات 💻📱🚗</li>
            </ul>
            <p class="sub-title">الزراعة:</p>
            <ul>
              <li>إنتاج الأرز (خاصة في الصين والهند) 🍚</li>
              <li>استخدام طرق حديثة (الري، التهجين) 🌾</li>
            </ul>
            <p class="sub-title">الخدمات:</p>
            <ul>
              <li>تطور التجارة والنقل والخدمات المالية 💹📦🚢</li>
            </ul>
          </div>
          <div class="content-box">
            <h5>✅ عوامل القوة</h5>
            <p class="sub-title">بشرية:</p>
            <ul>
              <li>عدد سكان كبير (أكثر من 3 مليار نسمة) 🧍‍♂️🧍‍♀️</li>
              <li>يد عاملة كثيرة ورخيصة 👷‍♂️</li>
            </ul>
            <p class="sub-title">علمية:</p>
            <ul>
              <li>تقدم في التعليم والبحث العلمي 📚🔬</li>
            </ul>
            <p class="sub-title">تنظيمية:</p>
            <ul>
              <li>وجود تنظيمات اقتصادية (رابطة الآسيان ASEAN) 🤝</li>
            </ul>
            <p class="sub-title">دور الدولة:</p>
            <ul>
              <li>دعم الدولة للشركات وتسهيل التصدير 📤</li>
            </ul>
          </div>
          <div class="content-box">
            <h4>📘 الدرس الخامس: البرازيل قوة اقتصادية صاعدة</h4>
            <h5>✅ مظاهر القوة الاقتصادية</h5>
            <p class="sub-title">الزراعة:</p>
            <ul>
              <li>إنتاج كبير للسكر، البن، الصوجا، البرتقال 🍊☕</li>
            </ul>
            <p class="sub-title">الصناعة:</p>
            <ul>
              <li>تطور في صناعات السيارات، الطائرات، الفولاذ، المواد الغذائية 🚗✈️🥫</li>
            </ul>
            <p class="sub-title">الخدمات:</p>
            <ul>
              <li>تطور السياحة، البنوك، النقل 🏖️💵🚢</li>
            </ul>
            <p class="sub-title">التجارة:</p>
            <ul>
              <li>تصدير نحو أوروبا، أمريكا، آسيا 📦</li>
            </ul>
          </div>
          <div class="content-box">
            <h5>✅ عوامل القوة</h5>
            <p class="sub-title">طبيعية:</p>
            <ul>
              <li>تنوع مناخي، تربة خصبة، غابات الأمازون 🌳🌧️</li>
            </ul>
            <p class="sub-title">بشرية:</p>
            <ul>
              <li>سكان كثيرين (أكثر من 200 مليون نسمة) 👨‍👩‍👧‍👦</li>
            </ul>
            <p class="sub-title">اقتصادية:</p>
            <ul>
              <li>خصخصة الشركات وجلب الاستثمارات 📈💰</li>
            </ul>
            <p class="sub-title">دولية:</p>
            <ul>
              <li>عضو في مجموعة بريكس (BRICS) 🌍</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <style>
      .popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }
      .modern-glass {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(12px);
        border-radius: 20px;
        padding: 30px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: #fff;
      }
      .modern-glass::-webkit-scrollbar {
        width: 10px;
      }
      .modern-glass::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        margin: 5px;
      }
      .modern-glass::-webkit-scrollbar-thumb {
        background: #1a73e8;
        border-radius: 10px;
        transition: background 0.3s ease;
      }
      .modern-glass::-webkit-scrollbar-thumb:hover {
        background: #1557b0;
      }
      .lesson-section {
        margin-bottom: 30px;
        padding: 20px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        transition: transform 0.3s ease;
      }
      .lesson-section:hover {
        transform: translateY(-5px);
      }
      .lesson-title {
        color: #1a73e8;
        font-size: 1.8rem;
        margin-bottom: 15px;
        text-align: right;
        font-weight: bold;
      }
      .lesson-content {
        margin-top: 15px;
      }
      .content-box {
        margin-bottom: 20px;
        padding: 15px;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 10px;
      }
      .content-box h4 {
        color: #1a73e8;
        font-size: 1.3rem;
        margin-bottom: 10px;
      }
      .content-box h5 {
        color: #fff;
        font-size: 1.1rem;
        margin: 10px 0 5px;
      }
      .content-box ul {
        list-style-type: disc;
        margin-right: 25px;
        margin-bottom: 10px;
      }
      .content-box li {
        margin-bottom: 8px;
        font-size: 1rem;
        line-height: 1.5;
      }
      .content-box p.sub-title {
        font-weight: bold;
        color: #fff;
        margin: 10px 0 5px;
        font-size: 1.1rem;
      }
      .content-box p.comment {
        color: #b0b0b0;
        font-style: italic;
        font-size: 0.95rem;
        margin-top: 10px;
      }
      .close-btn {
        background: rgba(255, 0, 0, 0.7);
        border: none;
        color: #fff;
        font-size: 28px;
        cursor: pointer;
        transition: background 0.3s ease;
      }
      .close-btn:hover {
        background: rgba(255, 0, 0, 1);
      }
    </style>
  `;
  document.body.appendChild(popup);
  popup.style.display = 'flex';
  playClickSound();
};

  // دالة لإغلاق جميع النوافذ المنبثقة
  function closeAllPopups() {
    document.querySelectorAll('.popup-overlay').forEach(popup => {
      popup.style.display = 'none';
    });
    if (nextBtn) nextBtn.style.display = 'none';
    if (retryBtn) retryBtn.style.display = 'none';
    if (timerFill) {
      timerFill.style.width = '100%';
      timerFill.style.animation = 'none';
    }
    clearInterval(timer);
    timeLeft = TIME_LIMIT;
    if (timeCount) timeCount.textContent = TIME_LIMIT;
    if (timeLabel) timeLabel.style.display = 'none';
  }

  // دالة إغلاق واجهة الإعدادات عند النقر خارجها
  function closeSettingsOnOutsideClick(event) {
    if (settingsMenu && settingsButton && settingsMenu.style.display === 'flex') {
      if (!settingsMenu.contains(event.target) && !settingsButton.contains(event.target)) {
        settingsMenu.style.display = 'none';
        playClickSound();
        document.removeEventListener('click', closeSettingsOnOutsideClick);
        console.log('تم إغلاق واجهة الإعدادات بسبب النقر خارجها');
      }
    }
  }

  // إعدادات القائمة
  window.toggleSettings = () => {
    if (settingsMenu && settingsButton) {
      console.log('تم النقر على زر الإعدادات');
      closeAllPopups();
      settingsMenu.style.display = settingsMenu.style.display === 'flex' ? 'none' : 'flex';
      playClickSound();
      if (settingsMenu.style.display === 'flex') {
        setTimeout(() => {
          document.addEventListener('click', closeSettingsOnOutsideClick);
          console.log('تم إضافة مستمع النقر الخارجي');
        }, 0);
      } else {
        document.removeEventListener('click', closeSettingsOnOutsideClick);
        console.log('تم إزالة مستمع النقر الخارجي');
      }
    } else {
      console.warn('عنصر settingsMenu أو settingsButton غير موجود');
    }
  };

  // دالة إغلاق قائمة الإعدادات
  window.closeSettings = () => {
    if (settingsMenu) {
      settingsMenu.style.display = 'none';
      playClickSound();
      document.removeEventListener('click', closeSettingsOnOutsideClick);
      console.log('تم إغلاق واجهة الإعدادات باستخدام زر الإغلاق');
    } else {
      console.warn('عنصر settingsMenu غير موجود');
    }
  };

  // إضافة حدث لزر الإغلاق داخل واجهة الإعدادات
  if (settingsMenu) {
    const closeBtn = settingsMenu.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeSettings);
      console.log('تم إضافة حدث النقر لزر الإغلاق داخل واجهة الإعدادات');
    } else {
      console.warn('زر الإغلاق داخل settingsMenu غير موجود');
    }
  }

  // التحكم في الصوت
  window.toggleSound = () => {
    if (soundToggle && clickSound && correctSound && wrongSound && rainSound) {
      const isOn = soundToggle.checked;
      clickSound.muted = !isOn;
      correctSound.muted = !isOn;
      wrongSound.muted = !isOn;
      rainSound.muted = !isOn;
      localStorage.setItem('soundEnabled', isOn);
      if (isOn) {
        rainSound.play().catch(e => console.warn('خطأ في تشغيل صوت المطر:', e));
      } else {
        rainSound.pause();
        rainSound.currentTime = 0;
      }
      playClickSound();
    }
  };

  // التحكم في الوضع الداكن
  window.toggleDarkMode = () => {
    if (darkToggle) {
      document.body.classList.toggle('dark-mode', darkToggle.checked);
      localStorage.setItem('darkMode', darkToggle.checked);
      playClickSound();
    }
  };

  // التحكم في حجم الخط
  if (fontSlider) {
    fontSlider.addEventListener('input', () => {
      document.documentElement.style.fontSize = fontSlider.value + '%';
      localStorage.setItem('fontSize', fontSlider.value);
      playClickSound();
    });
  }

  // تشغيل صوت النقر
  window.playClickSound = () => {
    if (clickSound && !clickSound.muted) {
      clickSound.pause();
      clickSound.currentTime = 0;
      clickSound.play().catch(e => console.warn('خطأ في تشغيل صوت النقر:', e));
    }
  };

  // دالة مشاركة التطبيق
  window.shareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: 'تطبيق تعليمي للتاريخ والجغرافيا',
        text: 'جرب هذا التطبيق التعليمي الممتع لمراجعة التاريخ والجغرافيا بطريقة تفاعلية!',
        url: window.location.href
      }).catch(e => console.warn('خطأ في المشاركة:', e));
    } else {
      alert('خاصية المشاركة غير مدعومة في متصفحك. يمكنك نسخ الرابط يدويًا.');
    }
    playClickSound();
  };

  // دوال النوافذ المنبثقة
  window.showAbout = () => {
    closeAllPopups();
    const aboutPopup = document.getElementById('aboutPopup');
    if (aboutPopup) {
      aboutPopup.style.display = 'flex';
      playClickSound();
    } else {
      console.warn('عنصر aboutPopup غير موجود');
    }
  };

  window.closeAbout = () => {
    const aboutPopup = document.getElementById('aboutPopup');
    if (aboutPopup) {
      aboutPopup.style.display = 'none';
      playClickSound();
    }
  };

  window.showDatePopup = () => {
    closeAllPopups();
    const datePopup = document.getElementById('datePopup');
    if (datePopup) {
      datePopup.style.display = 'flex';
      playClickSound();
    } else {
      console.warn('عنصر datePopup غير موجود');
    }
  };

  window.closeDatePopup = () => {
    const datePopup = document.getElementById('datePopup');
    if (datePopup) {
      datePopup.style.display = 'none';
      playClickSound();
    }
  };

  window.showCharacterOptions = () => {
    closeAllPopups();
    const characterPopup = document.getElementById('characterPopup');
    if (characterPopup) {
      characterPopup.style.display = 'flex';
      playClickSound();
    } else {
      console.warn('عنصر characterPopup غير موجود');
    }
  };

  window.closeCharacterPopup = () => {
    const characterPopup = document.getElementById('characterPopup');
    if (characterPopup) {
      characterPopup.style.display = 'none';
      playClickSound();
    }
  };

  window.showTipPopup = () => {
    closeAllPopups();
    const tipPopup = document.getElementById('tipPopup');
    if (tipPopup) {
      tipPopup.style.display = 'flex';
      playClickSound();
    } else {
      console.warn('عنصر tipPopup غير موجود');
    }
  };

  window.closeTipPopup = () => {
    const tipPopup = document.getElementById('tipPopup');
    if (tipPopup) {
      tipPopup.style.display = 'none';
      playClickSound();
    }
  };

  window.showPrivacyPolicy = () => {
    closeAllPopups();
    const privacyPopup = document.getElementById('privacyPopup');
    if (privacyPopup) {
      privacyPopup.style.display = 'flex';
      playClickSound();
    } else {
      console.warn('عنصر privacyPopup غير موجود');
    }
  };

  window.closePrivacyPopup = () => {
    const privacyPopup = document.getElementById('privacyPopup');
    if (privacyPopup) {
      privacyPopup.style.display = 'none';
      playClickSound();
    }
  };

  window.showHistorySummaries = () => {
    closeAllPopups();
    const historySummariesPopup = document.getElementById('historySummariesPopup');
    if (historySummariesPopup) {
      historySummariesPopup.style.display = 'flex';
      playClickSound();
    } else {
      console.warn('عنصر historySummariesPopup غير موجود');
    }
  };

  window.closeHistorySummaries = () => {
    const historySummariesPopup = document.getElementById('historySummariesPopup');
    if (historySummariesPopup) {
      historySummariesPopup.style.display = 'none';
      playClickSound();
    }
  };
window.showColdWarSummary = () => {
  closeAllPopups();
  const content = `
    <div class="summary-section" style="text-align: right; direction: rtl; font-family: 'Amiri', Arial, sans-serif; padding: 20px; max-width: 900px; margin: auto; line-height: 1.6; color: #333; font-weight: 500;">
      <h3 class="section-title" style="font-size: 28px; color: #1a5276; text-align: center; margin-bottom: 20px; font-weight: bold; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);">🧭 ملخص الحرب الباردة</h3>

      <!-- مفاهيم ومصطلحات مهمة -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f5f7fa; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr style="background-color: #e3f2fd;">
          <th style="padding: 12px; font-size: 22px; color: #1a5276; border-bottom: 2px solid #e0e0e0; font-weight: bold;">✅ مفاهيم ومصطلحات مهمة</th>
        </tr>
        <tr>
          <td style="padding: 12px; font-size: 16px;">
            <ul style="list-style-type: none; padding: 0;">
              <li><span style="color: #2e7d32; font-weight: bold;">📌 الثنائية القطبية:</span> نظام ظهر بعد الحرب العالمية الثانية يتميز بوجود قطبين متصارعين (الاتحاد السوفياتي والولايات المتحدة) يتصارعان على الزعامة الدولية.</li>
              <li><span style="color: #2e7d32; font-weight: bold;">📌 الحرب الباردة:</span> صراع إيديولوجي بعد الحرب العالمية الثانية بين المعسكر الشرقي بقيادة الاتحاد السوفياتي، والمعسكر الغربي بقيادة الولايات المتحدة، استُعملت فيه جميع الوسائل ما عدا المواجهة العسكرية المباشرة.</li>
              <li><span style="color: #2e7d32; font-weight: bold;">📌 المعسكر الشرقي (م.ش):</span> يضم دول شرق أوروبا، يتبنى النظام السياسي الشيوعي والاقتصادي الاشتراكي بقيادة الاتحاد السوفياتي.</li>
              <li><span style="color: #2e7d32; font-weight: bold;">📌 المعسكر الغربي:</span> يضم دول غرب أوروبا، يتبنى النظام السياسي الليبرالي والاقتصادي الرأسمالي بقيادة الولايات المتحدة.</li>
              <li><span style="color: #2e7d32; font-weight: bold;">📌 الشيوعية:</span> مذهب سياسي يقوم على مبدأ الحزب الواحد في الحكم، تبناه الاتحاد السوفياتي بعد الثورة البلشفية.</li>
            </ul>
          </td>
        </tr>
      </table>

      <!-- معايير تشكل العالم بعد الحرب العالمية الثانية -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f5f7fa; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr style="background-color: #e3f2fd;">
          <th style="padding: 12px; font-size: 22px; color: #1a5276; border-bottom: 2px solid #e0e0e0; font-weight: bold;">✅ معايير تشكل العالم بعد الحرب العالمية الثانية</th>
        </tr>
        <tr>
          <td style="padding: 12px; font-size: 16px;">
            <strong style="color: #2e7d32; font-weight: bold;">🔹 معايير تاريخية وسياسية:</strong>
            <ul style="list-style-type: none; padding: 0;">
              <li style="color: #34495e;">⚔️ سقوط الأنظمة الديكتاتورية (ألمانيا النازية، إيطاليا الفاشية)</li>
              <li style="color: #34495e;">📉 تراجع الاستعمار التقليدي (فرنسا 🇫🇷، بريطانيا 🇬🇧)</li>
              <li style="color: #34495e;">🌍 انتقال الزعامة من أوروبا إلى 🇺🇸 أمريكا و🇷🇺 الاتحاد السوفياتي</li>
              <li style="color: #34495e;">🛑 خروج الولايات المتحدة من العزلة السياسية 1941</li>
              <li style="color: #34495e;">🗺️ تغير الخريطة الجيوسياسية للعالم</li>
              <li style="color: #34495e;">🕊️ ظهور هيئة الأمم المتحدة 1945</li>
            </ul>
            <strong style="color: #2e7d32; font-weight: bold;">🔹 معايير اقتصادية:</strong>
            <ul style="list-style-type: none; padding: 0;">
              <li style="color: #34495e;">💰 سيطرة الولايات المتحدة على الاقتصاد العالمي بعد اتفاقية بريتون وودز 1944</li>
              <li style="color: #34495e;">🧱 نشر الاتحاد السوفياتي لنظامه الاقتصادي الاشتراكي</li>
              <li style="color: #34495e;">🪙 امتلاك الولايات المتحدة 80% من احتياطي الذهب العالمي</li>
              <li style="color: #34495e;">📉 انهيار وتراجع الاقتصاد الأوروبي</li>
            </ul>
          </td>
        </tr>
      </table>

      <!-- استراتيجيات الكتلتين في الحرب الباردة -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f5f7fa; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr style="background-color: #e3f2fd;">
          <th style="padding: 12px; font-size: 22px; color: #1a5276; border-bottom: 2px solid #e0e0e0; font-weight: bold;">🎯 استراتيجيات الكتلتين في الحرب الباردة</th>
        </tr>
        <tr>
          <td style="padding: 12px; font-size: 16px;">
            <strong style="color: #1976d2; font-weight: bold;">🔵 المعسكر الغربي الرأسمالي (الولايات المتحدة 🇺🇸):</strong>
            <ul style="list-style-type: none; padding: 0;">
              <li><strong style="color: #2e7d32; font-weight: bold;">🪙 الاستراتيجية الاقتصادية:</strong>
                <ul style="list-style-type: none; padding-right: 20px;">
                  <li style="color: #34495e;">❌ المقاطعة الاقتصادية: التوقف عن التبادل التجاري مع المعسكر الشرقي.</li>
                  <li style="color: #34495e;">💰 المشاريع الاقتصادية:</li>
                  <li style="color: #34495e;">  - مشروع ترومان (12 مارس 1947): 🟢 مساعدة بـ400 مليون دولار لليونان وتركيا لمحاربة الشيوعية.</li>
                  <li style="color: #34495e;">  - مشروع مارشال (5 جوان 1947): 🟢 مساعدات بـ12 مليار دولار لإعمار أوروبا الغربية.</li>
                  <li style="color: #34495e;">  - مشروع أيزنهاور (5 جانفي 1957): 🟢 200 مليون دولار لدول الشرق الأوسط.</li>
                </ul>
              </li>
              <li><strong style="color: #2e7d32; font-weight: bold;">🏛️ الاستراتيجية السياسية:</strong>
                <ul style="list-style-type: none; padding-right: 20px;">
                  <li style="color: #34495e;">🧱 سياسة الاحتواء: محاصرة الشيوعية ومنع انتشارها.</li>
                  <li style="color: #34495e;">🕸️ سياسة التطويق: عزل الاتحاد السوفياتي.</li>
                  <li style="color: #34495e;">🕳️ سياسة ملء الفراغ: تعويض الدول الاستعمارية كي تنسحب.</li>
                </ul>
              </li>
              <li><strong style="color: #2e7d32; font-weight: bold;">🪖 الاستراتيجية العسكرية:</strong>
                <ul style="list-style-type: none; padding-right: 20px;">
                  <li style="color: #34495e;">🤝 سياسة الأحلاف:</li>
                  <li style="color: #34495e;">  - حلف الناتو (4 أفريل 1949): 📍 مقره بروكسل، ضد التوسع السوفياتي.</li>
                  <li style="color: #34495e;">  - حلف سياتو (8 سبتمبر 1954): 🛑 لمحاربة حركات التحرر في فيتنام.</li>
                  <li style="color: #34495e;">  - حلف بغداد (24 فيفري 1955): 🏃 تحول إلى تركيا سنة 1958 بعد انسحاب العراق.</li>
                </ul>
              </li>
              <li><strong style="color: #2e7d32; font-weight: bold;">🧪 الاستراتيجية العلمية:</strong>
                <ul style="list-style-type: none; padding-right: 20px;">
                  <li style="color: #34495e;">☢️ سباق التسلح النووي</li>
                  <li style="color: #34495e;">📺 الدعاية المغرضة عبر الإعلام.</li>
                </ul>
              </li>
            </ul>
            <strong style="color: #d32f2f; font-weight: bold;">🔴 المعسكر الشرقي الاشتراكي (الاتحاد السوفياتي 🇷🇺):</strong>
            <ul style="list-style-type: none; padding: 0;">
              <li><strong style="color: #2e7d32; font-weight: bold;">🪙 الاستراتيجية الاقتصادية:</strong>
                <ul style="list-style-type: none; padding-right: 20px;">
                  <li style="color: #34495e;">❌ مقاطعة المنتجات الغربية</li>
                  <li style="color: #34495e;">🧾 تأسيس الكوميكون (25 جانفي 1949): منظمة للتعاون الاقتصادي بين دول المعسكر الشرقي.</li>
                </ul>
              </li>
              <li><strong style="color: #2e7d32; font-weight: bold;">🏛️ الاستراتيجية السياسية:</strong>
                <ul style="list-style-type: none; padding-right: 20px;">
                  <li style="color: #34495e;">🟥 مبدأ جدانوف (22 سبتمبر 1947): دعم الثورات في العالم.</li>
                  <li style="color: #34495e;">🕵️ تأسيس الكومنفورم (5 أكتوبر 1947): مكتب للتجسس والدعاية الشيوعية.</li>
                  <li style="color: #34495e;">✊ دعم حركات التحرر في إفريقيا وآسيا.</li>
                </ul>
              </li>
              <li><strong style="color: #2e7d32; font-weight: bold;">🪖 الاستراتيجية العسكرية:</strong>
                <ul style="list-style-type: none; padding-right: 20px;">
                  <li style="color: #34495e;">🛡️ حلف وارسو (14 ماي 1955): الرد على حلف الناتو.</li>
                  <li style="color: #34495e;">🧱 الستار الحديدي: مصطلح أطلقه تشرشل لوصف العزلة بين الشرق والغرب.</li>
                </ul>
              </li>
              <li><strong style="color: #2e7d32; font-weight: bold;">🧪 الاستراتيجية العلمية:</strong>
                <ul style="list-style-type: none; padding-right: 20px;">
                  <li style="color: #34495e;">🚀 سباق غزو الفضاء</li>
                  <li style="color: #34495e;">🕵️‍♂️ الجاسوسية المضادة</li>
                </ul>
              </li>
            </ul>
            <p style="font-size: 16px; color: #555; font-weight: bold;"><span style="color: #2e7d32;">📌 ملاحظة نهائية:</span> كل معسكر كان يستعمل كل الوسائل: المال، السياسة، السلاح، العلم وحتى الإعلام باش يربح الحرب بدون ما يدخل في حرب مباشرة ⚔️.</p>
          </td>
        </tr>
      </table>

      <!-- أهداف مشروع مارشال -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f5f7fa; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr style="background-color: #e3f2fd;">
          <th style="padding: 12px; font-size: 22px; color: #1a5276; border-bottom: 2px solid #e0e0e0; font-weight: bold;">💼 أهداف مشروع مارشال (5 جوان 1947)</th>
        </tr>
        <tr>
          <td style="padding: 12px; font-size: 16px;">
            <strong style="color: #2e7d32; font-weight: bold;">🔷 الأهداف الخفية (الحقيقية 🕵️‍♂️):</strong>
            <ul style="list-style-type: none; padding: 0;">
              <li style="color: #34495e;">📦 التخلص من فائض الإنتاج</li>
              <li style="color: #34495e;">🔗 ربط الاقتصاد الأوروبي بالاقتصاد الأمريكي</li>
              <li style="color: #34495e;">🛡️ محاربة المد الشيوعي</li>
            </ul>
            <strong style="color: #2e7d32; font-weight: bold;">🔷 الأهداف المعلنة (الظاهرية 📢):</strong>
            <ul style="list-style-type: none; padding: 0;">
              <li style="color: #34495e;">💸 تقديم مساعدات مالية لدول أوروبا المنكوبة</li>
              <li style="color: #34495e;">🏗️ إنعاش الاقتصاد الأوروبي المحطم</li>
            </ul>
          </td>
        </tr>
      </table>

      <!-- عوامل بروز الصراع بين الشرق والغرب -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f5f7fa; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr style="background-color: #e3f2fd;">
          <th style="padding: 12px; font-size: 22px; color: #1a5276; border-bottom: 2px solid #e0e0e0; font-weight: bold;">✅ عوامل بروز الصراع بين الشرق والغرب</th>
        </tr>
        <tr>
          <td style="padding: 12px; font-size: 16px;">
            <ul style="list-style-type: none; padding: 0;">
              <li style="color: #34495e;">⚔️ الاختلاف الإيديولوجي بين أنظمة المعسكرين</li>
              <li style="color: #34495e;">👥 تعصب قادة المعسكرين (ستالين / ترومان)</li>
              <li style="color: #34495e;">📈 استفادة المعسكرين من الحرب العالمية الثانية (الولايات المتحدة اقتصاديًا / الاتحاد السوفياتي عسكريًا)</li>
              <li style="color: #34495e;">🌍 انتشار الشيوعية الاشتراكي وخروجها من الاتحاد السوفياتي</li>
              <li style="color: #34495e;">🥇 تصادم مصالح المعسكرين بسبب سعيهما لنفس الهدف: الزعامة الدولية</li>
            </ul>
          </td>
        </tr>
      </table>

      <!-- درس التعايش السلمي -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f5f7fa; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr style="background-color: #e3f2fd;">
          <th style="padding: 12px; font-size: 22px; color: #1a5276; border-bottom: 2px solid #e0e0e0; font-weight: bold;">✅ درس التعايش السلمي</th>
        </tr>
        <tr>
          <td style="padding: 12px; font-size: 16px;">
            <strong style="color: #2e7d32; font-weight: bold;">🔹 أسباب لجوء المعسكرين إلى السلم:</strong>
            <ul style="list-style-type: none; padding: 0;">
              <li style="color: #34495e;">⚖️ توازن الرعب النووي وامتلاك نفس السلاح.</li>
              <li style="color: #34495e;">☠️ وفاة ستالين المتعصب وظهور القيادة الثلاثية (الترويكا).</li>
              <li style="color: #34495e;">💣 كثرة الأزمات الدولية التي سببت خسائر للمعسكرين.</li>
              <li style="color: #34495e;">🧱 تشققات داخل المعسكرين بسبب الخلافات بين الدول.</li>
              <li style="color: #34495e;">📣 ضغط الرأي العام خوفًا من حرب عالمية ثالثة.</li>
              <li style="color: #34495e;">👨‍💼 ترحيب الرئيس الأمريكي أيزنهاور بفكرة السلم.</li>
            </ul>
            <strong style="color: #2e7d32; font-weight: bold;">🔹 الظروف الدولية المساعدة على السلم:</strong>
            <ul style="list-style-type: none; padding: 0;">
              <li style="color: #34495e;">✊ انتشار الحركات التحررية في العالم الثالث.</li>
              <li style="color: #34495e;">⚠️ كثرة الأزمات الدولية وتداعياتها.</li>
              <li style="color: #34495e;">🌍 ظهور الحركة الأفرو-آسيوية سنة 1955.</li>
              <li style="color: #34495e;">🕊️ إنشاء حركة عدم الانحياز سنة 1961.</li>
              <li style="color: #34495e;">🏛️ حل أزمة كوريا من طرف هيئة الأمم المتحدة سنة 1953.</li>
            </ul>
            <strong style="color: #2e7d32; font-weight: bold;">🔹 مظاهر التعايش السلمي:</strong>
            <ul style="list-style-type: none; padding: 0;">
              <li style="color: #34495e;">🇰🇷 انتهاء الأزمة الكورية سنة 1953.</li>
              <li style="color: #34495e;">🇩🇪 اعتراف الاتحاد السوفياتي بدولة ألمانيا الغربية.</li>
              <li style="color: #34495e;">❌ حل الاتحاد السوفياتي لمكتب الكومنفورم في 17 أبريل 1956.</li>
              <li style="color: #34495e;">☎️ إنشاء الخط الهاتفي الأحمر بين موسكو وواشنطن في 20 جوان 1963.</li>
              <li style="color: #34495e;">🤝 توقيع اتفاقيتي سالت 1 (1972) وسالت 2 (1979).</li>
              <li style="color: #34495e;">🕊️ عقد قمة مالطا في 3-4 ديسمبر 1989.</li>
            </ul>
            <strong style="color: #2e7d32; font-weight: bold;">🔹 نتائج التعايش السلمي:</strong>
            <ul style="list-style-type: none; padding: 0;">
              <li style="color: #34495e;">📉 تخفيف الصراع بين العسكريين.</li>
              <li style="color: #34495e;">🛑 زوال خطر الحرب العالمية الثالثة.</li>
              <li style="color: #34495e;">🧨 نهاية السباق نحو التسلح.</li>
              <li style="color: #34495e;">❎ زوال نشأة الهيئات الخطيرة.</li>
              <li style="color: #34495e;">🌍 ظهور التقارب الأفروآسيوي.</li>
            </ul>
          </td>
        </tr>
      </table>

      <!-- درس حركة عدم الانحياز -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f5f7fa; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr style="background-color: #e3f2fd;">
          <th style="padding: 12px; font-size: 22px; color: #1a5276; border-bottom: 2px solid #e0e0e0; font-weight: bold;">✅ درس حركة عدم الانحياز</th>
        </tr>
        <tr>
          <td style="padding: 12px; font-size: 16px;">
            <strong style="color: #2e7d32; font-weight: bold;">🔹 نشأتها:</strong>
            <ul style="list-style-type: none; padding: 0;">
              <li style="color: #34495e;">📍 مؤتمر باندونغ 1955 وظهور الحركة الأفروآسيوية.</li>
              <li style="color: #34495e;">📍 مؤتمر بلغراد 1961 الذي أدى إلى تأسيس حركة عدم الانحياز.</li>
            </ul>
            <strong style="color: #2e7d32; font-weight: bold;">🔹 مبادئ حركة عدم الانحياز:</strong>
            <ul style="list-style-type: none; padding: 0;">
              <li style="color: #34495e;">🕊️ عدم التدخل في الشؤون الداخلية للدول.</li>
              <li style="color: #34495e;">⚖️ الحياد الإيجابي.</li>
              <li style="color: #34495e;">🛡️ عدم الانضمام للأحلاف العسكرية.</li>
              <li style="color: #34495e;">📜 الحفاظ على سيادة الدول واستقرارها.</li>
              <li style="color: #34495e;">🤝 التعاون بين الدول الأعضاء.</li>
            </ul>
            <strong style="color: #2e7d32; font-weight: bold;">🔹 أهداف حركة عدم الانحياز:</strong>
            <ul style="list-style-type: none; padding: 0;">
              <li style="color: #34495e;">🧨 تخفيف الصراع بين المعسكرين.</li>
              <li style="color: #34495e;">🕊️ نشر السلام في العالم.</li>
              <li style="color: #34495e;">📢 رعاية حقوق الإنسان.</li>
              <li style="color: #34495e;">🛡️ الدفاع عن الشعوب الضعيفة.</li>
              <li style="color: #34495e;">✊ دعم حركات التحرر في العالم الثالث.</li>
            </ul>
          </td>
        </tr>
      </table>

      <!-- درس سقوط الاتحاد السوفياتي -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f5f7fa; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr style="background-color: #e3f2fd;">
          <th style="padding: 12px; font-size: 22px; color: #1a5276; border-bottom: 2px solid #e0e0e0; font-weight: bold;">✅ درس سقوط الاتحاد السوفياتي</th>
        </tr>
        <tr>
          <td style="padding: 12px; font-size: 16px;">
            <strong style="color: #2e7d32; font-weight: bold;">🔹 عوامل داخلية:</strong>
            <ul style="list-style-type: none; padding: 0;">
              <li style="color: #34495e;">💸 فشل النظام الاقتصادي الاشتراكي (الملكية العامة).</li>
              <li style="color: #34495e;">🗺️ اتساع المساحة وعدم السيطرة على الدولة (22 مليون كم²).</li>
              <li style="color: #34495e;">🧾 إفلاس الخزينة السوفياتية بسبب النفقات العسكرية.</li>
              <li style="color: #34495e;">🧬 تعدد القوميات المختلفة (اللغة، الدين، الأصل) – 32 قومية.</li>
              <li style="color: #34495e;">🔥 تشققات داخل المعسكر الشرقي (خلافات بين الدول).</li>
              <li style="color: #34495e;">🔧 فشل إصلاحات الرئيس غورباتشوف: البروسترويكا (إعادة البناء) والغلاسنوست (الشفافية).</li>
            </ul>
            <strong style="color: #2e7d32; font-weight: bold;">🔹 عوامل خارجية:</strong>
            <ul style="list-style-type: none; padding: 0;">
              <li style="color: #34495e;">🪖 نجاح سياسة التطويق الأمريكية</li>
              <li style="color: #34495e;">💣 التدخلات العسكرية في دول العالم الثالث</li>
              <li style="color: #34495e;">📺 تأثير الإعلام الغربي على شعوب أوروبا الشرقية</li>
              <li style="color: #34495e;">🕊️ دعم الولايات المتحدة الأمريكية للمعارضة والحركات الانفصالية داخل الاتحاد السوفياتي</li>
            </ul>
            <strong style="color: #2e7d32; font-weight: bold;">🔹 مظاهر سقوط الاتحاد السوفياتي:</strong>
            <ul style="list-style-type: none; padding: 0;">
              <li style="color: #34495e;">🛑 نهاية الحرب الباردة</li>
              <li style="color: #34495e;">🇷🇺 ظهور روسيا كوريث شرعي للاتحاد السوفياتي</li>
              <li style="color: #34495e;">📉 تراجع دور المعسكر الشرقي في العلاقات الدولية</li>
              <li style="color: #34495e;">🧩 تفكك الكتلة الشرقية</li>
              <li style="color: #34495e;">❌ حل المنظمات التابعة للاتحاد السوفياتي:</li>
              <li style="color: #34495e;">  - الكوميكون (28 جوان 1991)</li>
              <li style="color: #34495e;">  - حلف وارسو (1 جويلية 1991)</li>
              <li style="color: #34495e;">🇩🇪 توحيد الألمانيتين (3 أكتوبر 1990)</li>
              <li style="color: #34495e;">💣 تحطيم جدار برلين (9 نوفمبر 1989)</li>
            </ul>
          </td>
        </tr>
      </table>

      <!-- مظاهر الأحادية القطبية -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f5f7fa; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr style="background-color: #e3f2fd;">
          <th style="padding: 12px; font-size: 22px; color: #1a5276; border-bottom: 2px solid #e0e0e0; font-weight: bold;">✅ مظاهر الأحادية القطبية</th>
        </tr>
        <tr>
          <td style="padding: 12px; font-size: 16px;">
            <ul style="list-style-type: none; padding: 0;">
              <li style="color: #34495e;">🇺🇸 سيطرة الولايات المتحدة على القرار الدولي</li>
              <li style="color: #34495e;">🌍 تدخل الولايات المتحدة في العديد من الأزمات العالمية</li>
              <li style="color: #34495e;">💥 فرض سياسة الأمر الواقع</li>
              <li style="color: #34495e;">⚖️ تحكم أمريكا في المؤسسات المالية (صندوق النقد، البنك العالمي...)</li>
              <li style="color: #34495e;">🧠 التأثير الثقافي والإعلامي الأمريكي عبر وسائل الإعلام والإنترنت</li>
              <li style="color: #34495e;">💰 نشر العولمة وخدمة مصالحها الاقتصادية</li>
            </ul>
          </td>
        </tr>
      </table>

      <!-- مؤسسات النظام الدولي الجديد -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f5f7fa; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr style="background-color: #e3f2fd;">
          <th style="padding: 12px; font-size: 22px; color: #1a5276; border-bottom: 2px solid #e0e0e0; font-weight: bold;">✅ مؤسسات النظام الدولي الجديد</th>
        </tr>
        <tr>
          <td style="padding: 12px; font-size: 16px;">
            <ul style="list-style-type: none; padding: 0;">
              <li style="color: #34495e;">🏛️ هيئة الأمم المتحدة: أهم مؤسسة في النظام الدولي، تسهر على حفظ السلم والأمن الدوليين</li>
              <li style="color: #34495e;">⚖️ مجلس الأمن: يملك سلطة اتخاذ القرارات الملزمة، تهيمن عليه الدول الكبرى (خاصة أمريكا)</li>
              <li style="color: #34495e;">🏦 صندوق النقد الدولي (FMI): يساعد الدول اقتصاديًا لكن بشروط</li>
              <li style="color: #34495e;">💳 البنك العالمي للإنشاء والتعمير: يمول مشاريع تنموية ويخدم مصالح الغرب</li>
              <li style="color: #34495e;">👩‍⚖️ محكمة العدل الدولية: تحكم في النزاعات الدولية بين الدول</li>
              <li style="color: #34495e;">📺 المنظمات غير الحكومية والإعلام الدولي: أصبح لهم دور في التأثير على الرأي العام العالمي</li>
            </ul>
          </td>
        </tr>
      </table>
    </div>
  `;
  showSummaryDetail('عالم الشمال والجنوب (القطبية الثنائية والحرب الباردة)', content, 'cold-war');
};

window.showAlgerianRevolutionSummary = () => {
    closeAllPopups();
    const content = `
      <h3 style="color: #2ecc71; font-weight: bold; font-size: 24px; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);">⚔️ ملخص الثورة الجزائرية</h3>
      <div class="summary-section" style="background-color: #ffffff; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
        <h4 style="color: #3498db; font-weight: bold; font-size: 20px; text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.1);">🔷 1. التخطيط لثورة التحرير الجزائرية</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-weight: 500; color: #333;">
          <tr style="background-color: #ecf0f1;">
            <th style="border: 1px solid #ddd; padding: 10px; color: #2c3e50; font-weight: bold;">التاريخ</th>
            <th style="border: 1px solid #ddd; padding: 10px; color: #2c3e50; font-weight: bold;">الحدث</th>
            <th style="border: 1px solid #ddd; padding: 10px; color: #2c3e50; font-weight: bold;">التفسير</th>
          </tr>
          <tr style="background-color: #ffffff;">
            <td style="border: 1px solid #ddd; padding: 10px; font-weight: 500;">23 مارس 1954</td>
            <td style="border: 1px solid #ddd; padding: 10px;">تأسيس اللجنة الثورية للوحدة والعمل</td>
            <td style="border: 1px solid #ddd; padding: 10px;">باش يوحدو المناضلين ويحضرو للثورة 🤝</td>
          </tr>
          <tr style="background-color: #f5f6f5;">
            <td style="border: 1px solid #ddd; padding: 10px; font-weight: 500;">ماي 1954</td>
            <td style="border: 1px solid #ddd; padding: 10px;">انتصار الفيتناميين في ديان بيان فو</td>
            <td style="border: 1px solid #ddd; padding: 10px;">هذا النصر شجع الجزائريين على الكفاح المسلح 🏆</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td style="border: 1px solid #ddd; padding: 10px; font-weight: 500;">23 جوان 1954</td>
            <td style="border: 1px solid #ddd; padding: 10px;">اجتماع مجموعة الـ22</td>
            <td style="border: 1px solid #ddd; padding: 10px;">قرروا تفجير الثورة وعيّنوا لجنة الـ6 💡</td>
          </tr>
          <tr style="background-color: #f5f6f5;">
            <td style="border: 1px solid #ddd; padding: 10px; font-weight: 500;">10 أكتوبر 1954</td>
            <td style="border: 1px solid #ddd; padding: 10px;">اجتماع لجنة الـ6</td>
            <td style="border: 1px solid #ddd; padding: 10px;">داروا خطة تنظيم العمل المسلح 📋</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td style="border: 1px solid #ddd; padding: 10px; font-weight: 500;">أكتوبر 1954</td>
            <td style="border: 1px solid #ddd; padding: 10px;">اجتماع العرين السري</td>
            <td style="border: 1px solid #ddd; padding: 10px;">داروا آخر اللمسات لانطلاق الثورة 🔐</td>
          </tr>
          <tr style="background-color: #f5f6f5;">
            <td style="border: 1px solid #ddd; padding: 10px; font-weight: 500;">1 نوفمبر 1954</td>
            <td style="border: 1px solid #ddd; padding: 10px;">إصدار بيان أول نوفمبر واندلاع الثورة</td>
            <td style="border: 1px solid #ddd; padding: 10px;">بداية الكفاح المسلح في الأوراس 🔥</td>
          </tr>
        </table>

        <h4 style="color: #3498db; font-weight: bold; font-size: 20px; text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.1);">🔷 2. ظروف اندلاع الثورة التحريرية</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-weight: 500; color: #333;">
          <tr style="background-color: #ecf0f1;">
            <th style="border: 1px solid #ddd; padding: 10px; color: #2c3e50; font-weight: bold;">النوع</th>
            <th style="border: 1px solid #ddd; padding: 10px; color: #2c3e50; font-weight: bold;">العامل</th>
            <th style="border: 1px solid #ddd; padding: 10px; color: #2c3e50; font-weight: bold;">التفسير</th>
          </tr>
          <tr style="background-color: #ffffff;">
            <td rowspan="5" style="border: 1px solid #ddd; padding: 10px; background-color: #e74c3c; color: #fff; font-weight: bold;">العوامل الداخلية</td>
            <td style="border: 1px solid #ddd; padding: 10px;">مجازر 8 ماي 1945</td>
            <td style="border: 1px solid #ddd; padding: 10px;">زادت الوعي الوطني ☠️</td>
          </tr>
          <tr style="background-color: #f5f6f5;">
            <td style="border: 1px solid #ddd; padding: 10px;">انتشار الوعي السياسي</td>
            <td style="border: 1px solid #ddd; padding: 10px;">الناس فهمت لازم الاستقلال 📣</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td style="border: 1px solid #ddd; padding: 10px;">السياسات الفرنسية الظالمة</td>
            <td style="border: 1px solid #ddd; padding: 10px;">تمييز، تجويع، قمع 🛑</td>
          </tr>
          <tr style="background-color: #f5f6f5;">
            <td style="border: 1px solid #ddd; padding: 10px;">فشل الإصلاحات الفرنسية</td>
            <td style="border: 1px solid #ddd; padding: 10px;">ما كانتش صادقة 📄</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td style="border: 1px solid #ddd; padding: 10px;">أزمة حركة الانتصار للحريات</td>
            <td style="border: 1px solid #ddd; padding: 10px;">صراعات داخلية 🥀</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td rowspan="4" style="border: 1px solid #ddd; padding: 10px; background-color: #27ae60; color: #fff; font-weight: bold;">العوامل الخارجية</td>
            <td style="border: 1px solid #ddd; padding: 10px;">نجاح الثورة المصرية 1952</td>
            <td style="border: 1px solid #ddd; padding: 10px;">🇪🇬</td>
          </tr>
          <tr style="background-color: #f5f6f5;">
            <td style="border: 1px solid #ddd; padding: 10px;">دعم مصر، تونس، المغرب للثورة</td>
            <td style="border: 1px solid #ddd; padding: 10px;">🤝</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td style="border: 1px solid #ddd; padding: 10px;">دعم الأمم المتحدة وجامعة الدول العربية</td>
            <td style="border: 1px solid #ddd; padding: 10px;">🕊️</td>
          </tr>
          <tr style="background-color: #f5f6f5;">
            <td style="border: 1px solid #ddd; padding: 10px;">بداية استقلال بعض الدول الإفريقية</td>
            <td style="border: 1px solid #ddd; padding: 10px;">🌍</td>
          </tr>
        </table>

        <h4 style="color: #3498db; font-weight: bold; font-size: 20px; text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.1);">🔷 3. استراتيجية الثورة الجزائرية</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-weight: 500; color: #333;">
          <tr style="background-color: #ecf0f1;">
            <th style="border: 1px solid #ddd; padding: 10px; color: #2c3e50; font-weight: bold;">المجال</th>
            <th style="border: 1px solid #ddd; padding: 10px; color: #2c3e50; font-weight: bold;">الخطوة</th>
            <th style="border: 1px solid #ddd; padding: 10px; color: #2c3e50; font-weight: bold;">التفسير</th>
          </tr>
          <tr style="background-color: #ffffff;">
            <td rowspan="4" style="border: 1px solid #ddd; padding: 10px; background-color: #e67e22; color: #fff; font-weight: bold;">داخلية - سياسية</td>
            <td style="border: 1px solid #ddd; padding: 10px;">تعبئة الشعب بالإعلام وبيان نوفمبر</td>
            <td style="border: 1px solid #ddd; padding: 10px;">📢</td>
          </tr>
          <tr style="background-color: #f5f6f5;">
            <td style="border: 1px solid #ddd; padding: 10px;">تنظيم الجماهير في اتحادات</td>
            <td style="border: 1px solid #ddd; padding: 10px;">عمال، طلبة، تجار 👥</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td style="border: 1px solid #ddd; padding: 10px;">تنظيم الإضرابات</td>
            <td style="border: 1px solid #ddd; padding: 10px;">إضراب 8 أيام، إضراب الطلبة ✋</td>
          </tr>
          <tr style="background-color: #f5f6f5;">
            <td style="border: 1px solid #ddd; padding: 10px;">بناء مؤسسات الثورة</td>
            <td style="border: 1px solid #ddd; padding: 10px;">مؤتمر الصومام 🏛️</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td rowspan="3" style="border: 1px solid #ddd; padding: 10px; background-color: #9b59b6; color: #fff; font-weight: bold;">داخلية - عسكرية</td>
            <td style="border: 1px solid #ddd; padding: 10px;">انطلاق الثورة المسلحة</td>
            <td style="border: 1px solid #ddd; padding: 10px;">1 نوفمبر 🔫</td>
          </tr>
          <tr style="background-color: #f5f6f5;">
            <td style="border: 1px solid #ddd; padding: 10px;">حرب العصابات</td>
            <td style="border: 1px solid #ddd; padding: 10px;">كمائن، نصب، مناوشات ⚔️</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td style="border: 1px solid #ddd; padding: 10px;">هجومات الشمال القسنطيني</td>
            <td style="border: 1px solid #ddd; padding: 10px;">20 أوت 1955 🔥</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td rowspan="3" style="border: 1px solid #ddd; padding: 10px; background-color: #1abc9c; color: #fff; font-weight: bold;">خارجية - دبلوماسية</td>
            <td style="border: 1px solid #ddd; padding: 10px;">تأسيس الوفد الخارجي</td>
            <td style="border: 1px solid #ddd; padding: 10px;">بن بلة وآخرين ✈️</td>
          </tr>
          <tr style="background-color: #f5f6f5;">
            <td style="border: 1px solid #ddd; padding: 10px;">تشكيل الحكومة المؤقتة بالقاهرة</td>
            <td style="border: 1px solid #ddd; padding: 10px;">1958 🇩🇿</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td style="border: 1px solid #ddd; padding: 10px;">فتح فروع خارجية للجبهة</td>
            <td style="border: 1px solid #ddd; padding: 10px;">🤝</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td rowspan="3" style="border: 1px solid #ddd; padding: 10px; background-color: #d35400; color: #fff; font-weight: bold;">خارجية - عسكرية</td>
            <td style="border: 1px solid #ddd; padding: 10px;">تأمين مصادر السلاح</td>
            <td style="border: 1px solid #ddd; padding: 10px;">💣</td>
          </tr>
          <tr style="background-color: #f5f6f5;">
            <td style="border: 1px solid #ddd; padding: 10px;">إنشاء قواعد حدودية</td>
            <td style="border: 1px solid #ddd; padding: 10px;">🏞️</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td style="border: 1px solid #ddd; padding: 10px;">إفشال مخططات شال وموريس</td>
            <td style="border: 1px solid #ddd; padding: 10px;">🛡️</td>
          </tr>
        </table>

        <h4 style="color: #3498db; font-weight: bold; font-size: 20px; text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.1);">🔷 4. هجومات الشمال القسنطيني – 20 أوت 1955</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-weight: 500; color: #333;">
          <tr style="background-color: #ecf0f1;">
            <th style="border: 1px solid #ddd; padding: 10px; color: #2c3e50; font-weight: bold;">النوع</th>
            <th style="border: 1px solid #ddd; padding: 10px; color: #2c3e50; font-weight: bold;">الوصف</th>
          </tr>
          <tr style="background-color: #ffffff;">
            <td style="border: 1px solid #ddd; padding: 10px;">🎯 الأهداف</td>
            <td style="border: 1px solid #ddd; padding: 10px;">تخفيف الضغط على الأوراس 🔄، توسيع رقعة الثورة 🗺️، حث المترددين على الالتحاق 👣، إيصال صوت الثورة للعالم 🌐</td>
          </tr>
          <tr style="background-color: #f5f6f5;">
            <td style="border: 1px solid #ddd; padding: 10px;">📍 النتائج</td>
            <td style="border: 1px solid #ddd; padding: 10px;">رد دموي من فرنسا ☠️، مجازر سكيكدة ⚰️، إدراج القضية الجزائرية في الأمم المتحدة 📝، خسائر كبيرة للجيش الفرنسي 💥</td>
          </tr>
        </table>

        <h4 style="color: #3498db; font-weight: bold; font-size: 20px; text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.1);">🔷 5. مؤتمر الصومام – 20 أوت 1956</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-weight: 500; color: #333;">
          <tr style="background-color: #ecf0f1;">
            <th style="border: 1px solid #ddd; padding: 10px; color: #2c3e50; font-weight: bold;">النوع</th>
            <th style="border: 1px solid #ddd; padding: 10px; color: #2c3e50; font-weight: bold;">الوصف</th>
          </tr>
          <tr style="background-color: #ffffff;">
            <td style="border: 1px solid #ddd; padding: 10px;">🎯 الأسباب</td>
            <td style="border: 1px solid #ddd; padding: 10px;">تقييم مرحلتين الثورة 🕰️، تنظيم الثورة وهيكلة الجيش ⚙️، تحفيز الشعب على الالتحاق 🤝</td>
          </tr>
          <tr style="background-color: #f5f6f5;">
            <td style="border: 1px solid #ddd; padding: 10px;">📍 القرارات</td>
            <td style="border: 1px solid #ddd; padding: 10px;">تقسيم الجزائر لـ6 ولايات عسكرية 📍، إنشاء المجلس الوطني للثورة ولجنة التنسيق والتنفيذ 🏛️، أولوية الداخل على الخارج والسياسي على العسكري ⚖️</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td style="border: 1px solid #ddd; padding: 10px;">🚫 رد فعل فرنسا</td>
            <td style="border: 1px solid #ddd; padding: 10px;">اختطاف قادة الوفد الخارجي ✈️، إنشاء مناطق محرمة ومراكز تعذيب 😡، قصف القرى والعدوان على مصر 💣</td>
          </tr>
        </table>

        <h4 style="color: #3498db; font-weight: bold; font-size: 20px; text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.1);">🔷 6. رد فعل فرنسا – استراتيجية القضاء على الثورة</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-weight: 500; color: #333;">
          <tr style="background-color: #ecf0f1;">
            <th style="border: 1px solid #ddd; padding: 10px; color: #2c3e50; font-weight: bold;">المجال</th>
            <th style="border: 1px solid #ddd; padding: 10px; color: #2c3e50; font-weight: bold;">الخطوة</th>
          </tr>
          <tr style="background-color: #ffffff;">
            <td rowspan="3" style="border: 1px solid #ddd; padding: 10px; background-color: #e74c3c; color: #fff; font-weight: bold;">داخلية - سياسية</td>
            <td style="border: 1px solid #ddd; padding: 10px;">مشروع جاك سوستال الإغرائي</td>
          </tr>
          <tr style="background-color: #f5f6f5;">
            <td style="border: 1px solid #ddd; padding: 10px;">تزوير استفتاء تقرير المصير</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td style="border: 1px solid #ddd; padding: 10px;">مشروع سلم الشجعان</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td rowspan="3" style="border: 1px solid #ddd; padding: 10px; background-color: #e74c3c; color: #fff; font-weight: bold;">داخلية - عسكرية</td>
            <td style="border: 1px solid #ddd; padding: 10px;">زيادة عدد الجنود الفرنسيين</td>
          </tr>
          <tr style="background-color: #f5f6f5;">
            <td style="border: 1px solid #ddd; padding: 10px;">الاستنجاد بحلف الناتو</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td style="border: 1px solid #ddd; padding: 10px;">قمع الشعب وإنشاء المناطق المحرمة</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td rowspan="2" style="border: 1px solid #ddd; padding: 10px; background-color: #3498db; color: #fff; font-weight: bold;">خارجية - سياسية</td>
            <td style="border: 1px solid #ddd; padding: 10px;">تشويه الثورة في الخارج</td>
          </tr>
          <tr style="background-color: #f5f6f5;">
            <td style="border: 1px solid #ddd; padding: 10px;">منع مناقشة القضية دوليًا</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td rowspan="3" style="border: 1px solid #ddd; padding: 10px; background-color: #3498db; color: #fff; font-weight: bold;">خارجية - عسكرية</td>
            <td style="border: 1px solid #ddd; padding: 10px;">العدوان الثلاثي على مصر</td>
          </tr>
          <tr style="background-color: #f5f6f5;">
            <td style="border: 1px solid #ddd; padding: 10px;">قصف ساقية سيدي يوسف</td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td style="border: 1px solid #ddd; padding: 10px;">قمع مظاهرات باريس – 17 أكتوبر 1961</td>
          </tr>
        </table>
      </div>
    `;
    showSummaryDetail('الثورة الجزائرية', content, 'revolution');
  };

  function showSummaryDetail(title, content, theme) {
    const summaryPopup = document.createElement('div');
    summaryPopup.className = 'popup-overlay';
    summaryPopup.id = 'summaryDetailPopup';
    summaryPopup.innerHTML = `
      <div class="popup-content glass-popup modern-glass ${theme}-summary">
        <button class="close-btn">×</button>
        <button class="back-btn">⬅️</button>
        <h2>${title}</h2>
        <div class="summary-content">${content}</div>
      </div>
    `;
    document.body.appendChild(summaryPopup);
    summaryPopup.style.display = 'flex';
    
    const closeBtn = summaryPopup.querySelector('.close-btn');
    const backBtn = summaryPopup.querySelector('.back-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeSummaryDetail);
    }
    if (backBtn) {
      backBtn.addEventListener('click', showHistorySummaries);
    }
    playClickSound();
  }

  window.closeSummaryDetail = () => {
    const summaryPopup = document.getElementById('summaryDetailPopup');
    if (summaryPopup) {
      summaryPopup.style.display = 'none';
      summaryPopup.remove();
      playClickSound();
    }
  };

  window.showColdWarCharacters = () => {
    if (!checkLockout()) {
      startQuiz('coldwar', 'characters');
    }
  };

  window.showAlgerianRevolutionCharacters = () => {
    if (!checkLockout()) {
      startQuiz('revolution', 'characters');
    }
  };

  window.startDateQuiz = (type) => {
    if (!checkLockout()) {
      if (!allDateQuizzes[type]) {
        console.warn(`البيانات غير متوفرة للنوع: ${type}`);
        const quizPopup = document.getElementById('quizPopup');
        if (quizPopup) {
          const quizTitle = document.getElementById('quiz-title');
          const quizQuestion = document.getElementById('quiz-question');
          const quizOptions = document.getElementById('quiz-options');
          const quizFeedback = document.getElementById('quiz-feedback');
          if (quizTitle && quizQuestion && quizOptions && quizFeedback) {
            quizTitle.textContent = '❌ خطأ';
            quizQuestion.textContent = 'البيانات غير متوفرة لهذا الاختبار. حاول مرة أخرى لاحقًا.';
            quizOptions.innerHTML = '';
            quizFeedback.textContent = '';
            quizPopup.style.display = 'flex';
          }
        }
        return;
      }
      startQuiz(type, 'dates');
    }
  };

  window.nextQuestion = () => {
    if (stars <= 0) {
      checkLockout();
      return;
    }
    currentQuestionIndex++;
    if (currentQuestionIndex < quizData.length) {
      currentQuizType === 'dates' ? showDateQuestion() : showQuizQuestion();
    } else {
      clearInterval(timer);
      if (progressBar) progressBar.style.width = '100%';
      if (timeLabel) timeLabel.style.display = 'none';
      if (timerFill) {
        timerFill.style.width = '0%';
        timerFill.style.animation = 'none';
      }
      consecutiveCorrectAnswers = 0;
      const pctFinal = Math.round((correctCount / quizData.length) * 100);
      const quizTitle = document.getElementById('quiz-title');
      const quizQuestion = document.getElementById('quiz-question');
      const quizOptions = document.getElementById('quiz-options');
      const quizFeedback = document.getElementById('quiz-feedback');
      if (quizTitle && quizQuestion && quizOptions && quizFeedback) {
        quizTitle.textContent = currentQuizType === 'dates' ? '🎉 لعبة التواريخ' : '🎉 من أنا؟';
        quizQuestion.textContent = `انتهت الأسئلة! لقد حفظت ${pctFinal}%`;
        quizOptions.innerHTML = '';
        quizFeedback.textContent = '';
        if (nextBtn) nextBtn.style.display = 'none';
        if (retryBtn) retryBtn.style.display = 'block';
      }
      updateButtonStates();
    }
  };

  window.restartQuiz = () => {
    if (!checkLockout()) {
      currentQuestionIndex = 0;
      correctCount = 0;
      consecutiveCorrectAnswers = 0;
      quizData = shuffleArray(quizData);
      if (nextBtn) nextBtn.style.display = 'none';
      if (retryBtn) retryBtn.style.display = 'none';
      if (timerFill) timerFill.style.animation = `timerColorShift ${TIME_LIMIT}s linear forwards`;
      if (timeCount) timeCount.textContent = TIME_LIMIT;
      if (timeLabel) timeLabel.style.display = 'block';
      currentQuizType === 'dates' ? showDateQuestion() : showQuizQuestion();
      updateButtonStates();
    }
  };

  window.closeQuiz = () => {
    const quizPopup = document.getElementById('quizPopup');
    if (quizPopup) {
      quizPopup.style.display = 'none';
      clearInterval(timer);
      currentQuestionIndex = 0;
      correctCount = 0;
      consecutiveCorrectAnswers = 0;
      quizData = [];
      currentQuizType = '';
      timeLeft = TIME_LIMIT;
      if (timerFill) {
        timerFill.style.width = '100%';
        timerFill.style.animation = 'none';
      }
      if (timeCount) timeCount.textContent = TIME_LIMIT;
      if (timeLabel) timeLabel.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      if (retryBtn) retryBtn.style.display = 'none';
      playClickSound();
      updateButtonStates();
    }
  };

  window.startQuiz = (type, quizType) => {
    if (!checkLockout()) {
      closeAllPopups();
      let rawData = quizType === 'dates' ? allDateQuizzes[type] : allQuizzes[type];

      if (!rawData || rawData.length === 0) {
        console.warn(`لا توجد بيانات للاختبار من النوع: ${type}, quizType: ${quizType}`);
        const quizPopup = document.getElementById('quizPopup');
        if (quizPopup) {
          const quizTitle = document.getElementById('quiz-title');
          const quizQuestion = document.getElementById('quiz-question');
          const quizOptions = document.getElementById('quiz-options');
          const quizFeedback = document.getElementById('quiz-feedback');
          if (quizTitle && quizQuestion && quizOptions && quizFeedback) {
            quizTitle.textContent = '❌ خطأ';
            quizQuestion.textContent = 'البيانات غير متوفرة لهذا الاختبار. حاول مرة أخرى لاحقًا.';
            quizOptions.innerHTML = '';
            quizFeedback.textContent = '';
            quizPopup.style.display = 'flex';
          }
        }
        return;
      }

      if (quizType === 'dates') {
        let expandedData = [];
        rawData.forEach(item => {
          expandedData.push({
            question: item.question.trim(),
            options: item.options.map(opt => opt.trim()),
            correct: item.correct,
            type: 'event-to-date'
          });
          expandedData.push({
            question: item.reverseQuestion.trim(),
            options: createEventOptions(item.event.trim(), rawData),
            event: item.event.trim(),
            type: 'date-to-event'
          });
        });
        quizData = shuffleArray(expandedData);
      } else {
        quizData = shuffleArray(rawData);
      }

      currentQuestionIndex = 0;
      correctCount = 0;
      consecutiveCorrectAnswers = 0;
      timeLeft = TIME_LIMIT;
      currentQuizType = quizType;
      const quizPopup = document.getElementById('quizPopup');
      if (quizPopup) {
        const content = quizPopup.querySelector('.popup-content');
        if (content) {
          content.classList.remove('quiz-popup', 'date-quiz-popup');
          content.classList.add(quizType === 'dates' ? 'date-quiz-popup' : 'quiz-popup');
          const quizTitle = document.getElementById('quiz-title');
          if (quizTitle) quizTitle.textContent = quizType === 'dates' ? '📅 لعبة التواريخ' : '👤 من أنا؟';
          quizType === 'dates' ? showDateQuestion() : showQuizQuestion();
          quizPopup.style.display = 'flex';
        }
      } else {
        console.warn('عنصر quizPopup غير موجود');
      }
      updateStarsDisplay();
      updateButtonStates();
    }
  };

  function createEventOptions(correctEvent, allData) {
    const events = [...new Set(allData.map(item => item.event.trim()))];
    const otherEvents = events.filter(event => event !== correctEvent);
    const shuffledOthers = shuffleArray(otherEvents);
    const options = [correctEvent, ...shuffledOthers.slice(0, 2)];
    return shuffleArray(options);
  }

  function showQuizQuestion() {
    if (stars <= 0) {
      checkLockout();
      return;
    }
    clearInterval(timer);
    timeLeft = TIME_LIMIT;
    if (timeCount) timeCount.textContent = TIME_LIMIT;
    if (timeLabel) timeLabel.style.display = 'block';
    if (timerFill) {
      timerFill.style.width = '100%';
      timerFill.style.animation = `timerColorShift ${TIME_LIMIT}s linear forwards`;
    }

    const progressPct = (currentQuestionIndex / quizData.length) * 100;
    if (progressBar) progressBar.style.width = progressPct + '%';

    const q = quizData[currentQuestionIndex];
    const quizTitle = document.getElementById('quiz-title');
    const quizQuestion = document.getElementById('quiz-question');
    const quizOptions = document.getElementById('quiz-options');
    const quizFeedback = document.getElementById('quiz-feedback');

    if (!quizTitle || !quizQuestion || !quizOptions || !quizFeedback) {
      console.warn('أحد عناصر الاختبار غير موجود');
      return;
    }

    quizTitle.textContent = '👤 من أنا؟';
    quizQuestion.textContent = q.question.trim();
    quizFeedback.textContent = '';
    quizOptions.innerHTML = '';
    if (nextBtn) nextBtn.style.display = 'none';
    if (retryBtn) retryBtn.style.display = 'none';

    let optionObjects = q.options.map((opt, i) => ({ text: opt.trim(), isCorrect: i === q.correct }));
    optionObjects = shuffleArray(optionObjects);

    optionObjects.forEach((optObj) => {
      const btn = document.createElement('button');
      btn.textContent = optObj.text;
      btn.className = 'quiz-btn';
      btn.disabled = stars <= 0;
      btn.style.opacity = stars <= 0 ? '0.5' : '1';
      btn.style.cursor = stars <= 0 ? 'not-allowed' : 'pointer';
      btn.addEventListener('click', () => {
        if (stars <= 0) {
          checkLockout();
          return;
        }
        clearInterval(timer);
        handleAnswer(optObj.isCorrect, btn, q);
      });
      quizOptions.appendChild(btn);
    });

    startCountdown();
    updateButtonStates();
  }

  function showDateQuestion() {
    if (stars <= 0) {
      checkLockout();
      return;
    }
    clearInterval(timer);
    timeLeft = TIME_LIMIT;
    if (timeCount) timeCount.textContent = TIME_LIMIT;
    if (timeLabel) timeLabel.style.display = 'block';
    if (timerFill) {
      timerFill.style.width = '100%';
      timerFill.style.animation = `timerColorShift ${TIME_LIMIT}s linear forwards`;
    }

    const progressPct = (currentQuestionIndex / quizData.length) * 100;
    if (progressBar) progressBar.style.width = progressPct + '%';

    const q = quizData[currentQuestionIndex];
    const quizTitle = document.getElementById('quiz-title');
    const quizQuestion = document.getElementById('quiz-question');
    const quizOptions = document.getElementById('quiz-options');
    const quizFeedback = document.getElementById('quiz-feedback');

    if (!quizTitle || !quizQuestion || !quizOptions || !quizFeedback) {
      console.warn('أحد عناصر الاختبار غير موجود');
      return;
    }

    quizTitle.textContent = '📅 لعبة التواريخ';
    quizQuestion.textContent = q.question.trim();
    quizFeedback.textContent = '';
    quizOptions.innerHTML = '';
    if (nextBtn) nextBtn.style.display = 'none';
    if (retryBtn) retryBtn.style.display = 'none';

    // إنشاء كائنات الخيارات مع التحقق من نوع السؤال
    let optionObjects;
    if (q.type === 'event-to-date') {
      if (typeof q.correct !== 'number' || !q.options[q.correct]) {
        console.warn('خطأ في بيانات السؤال (event-to-date):', q);
        quizFeedback.textContent = 'خطأ في تحميل السؤال، جاري الانتقال إلى السؤال التالي...';
        setTimeout(nextQuestion, 2000);
        return;
      }
      optionObjects = q.options.map((opt, i) => ({
        text: opt.trim(),
        isCorrect: i === q.correct
      }));
    } else if (q.type === 'date-to-event') {
      if (!q.event) {
        console.warn('خطأ في بيانات السؤال (date-to-event):', q);
        quizFeedback.textContent = 'خطأ في تحميل السؤال، جاري الانتقال إلى السؤال التالي...';
        setTimeout(nextQuestion, 2000);
        return;
      }
      optionObjects = q.options.map(opt => ({
        text: opt.trim(),
        isCorrect: opt.trim() === q.event.trim()
      }));
    } else {
      console.warn('نوع السؤال غير معروف:', q.type);
      quizFeedback.textContent = 'خطأ في تحميل السؤال، جاري الانتقال إلى السؤال التالي...';
      setTimeout(nextQuestion, 2000);
      return;
    }

    // التحقق من وجود إجابة صحيحة
    if (!optionObjects.some(opt => opt.isCorrect)) {
      console.warn('خطأ: لا توجد إجابة صحيحة بين الخيارات للسؤال:', q);
      quizFeedback.textContent = 'خطأ في تحميل السؤال، جاري الانتقال إلى السؤال التالي...';
      setTimeout(nextQuestion, 2000);
      return;
    }

    optionObjects = shuffleArray(optionObjects);

    optionObjects.forEach((optObj) => {
      const btn = document.createElement('button');
      btn.textContent = optObj.text;
      btn.className = 'quiz-btn';
      btn.disabled = stars <= 0;
      btn.style.opacity = stars <= 0 ? '0.5' : '1';
      btn.style.cursor = stars <= 0 ? 'not-allowed' : 'pointer';
      btn.addEventListener('click', () => {
        if (stars <= 0) {
          checkLockout();
          return;
        }
        clearInterval(timer);
        handleAnswer(optObj.isCorrect, btn, q);
      });
      quizOptions.appendChild(btn);
    });

    startCountdown();
    updateButtonStates();
  }

  function startCountdown() {
    if (stars <= 0) {
      checkLockout();
      return;
    }
    timer = setInterval(() => {
      timeLeft--;
      if (timeCount) timeCount.textContent = timeLeft;
      const pct = (timeLeft / TIME_LIMIT) * 100;
      if (timerFill) timerFill.style.width = pct + '%';

      if (timeLeft <= 0) {
        clearInterval(timer);
        autoRevealAnswer();
      }
    }, 1000);
  }

  function autoRevealAnswer() {
    const q = quizData[currentQuestionIndex];
    const quizFeedback = document.getElementById('quiz-feedback');
    const quizOptions = document.getElementById('quiz-options');
    if (!quizFeedback || !quizOptions) {
      console.warn('عنصر quiz-feedback أو quiz-options غير موجود');
      return;
    }

    const opts = quizOptions.querySelectorAll('button');
    opts.forEach((btn) => {
      btn.disabled = true;
      const correctAnswer = q.type === 'date-to-event' ? q.event.trim() : q.options[q.correct]?.trim();
      if (btn.textContent.trim() === correctAnswer) {
        btn.classList.add('correct');
      }
    });

    stars = Math.max(0, stars - 1);
    localStorage.setItem('quizStars', stars);
    localStorage.setItem(STORAGE_KEY, btoa(stars + lockoutUntil));
    updateStarsDisplay();
    if (stars <= 0) {
      lockoutUntil = Date.now() + RESET_INTERVAL * 1000;
      localStorage.setItem('lockoutUntil', lockoutUntil);
      localStorage.setItem('starsResetStartTime', Date.now());
      localStorage.setItem(STORAGE_KEY, btoa(stars + lockoutUntil));
    }
    checkLockout();

    quizFeedback.textContent = `⌛ انتهى الوقت! الإجابة الصحيحة هي: ${q.type === 'date-to-event' ? q.event.trim() : q.options[q.correct]?.trim() || 'غير متوفر'}`;
    if (nextBtn) nextBtn.style.display = 'block';
    if (correctSound && !correctSound.muted) {
      correctSound.pause();
      correctSound.currentTime = 0;
      correctSound.play().catch(e => console.warn('خطأ في تشغيل صوت الإجابة الصحيحة:', e));
    }
  }

  function handleAnswer(isCorrect, button, question) {
    const quizOptions = document.getElementById('quiz-options');
    const quizFeedback = document.getElementById('quiz-feedback');
    if (!quizOptions || !quizFeedback) {
      console.warn('عنصر quiz-options أو quiz-feedback غير موجود');
      return;
    }

    quizOptions.querySelectorAll('button').forEach(b => {
      b.disabled = true;
      b.style.opacity = '0.5';
      b.style.cursor = 'not-allowed';
    });

    if (correctSound) {
      correctSound.pause();
      correctSound.currentTime = 0;
    }
    if (wrongSound) {
      wrongSound.pause();
      wrongSound.currentTime = 0;
    }

    if (isCorrect) {
      correctCount++;
      consecutiveCorrectAnswers++;
      if (consecutiveCorrectAnswers >= 2) {
        stars = Math.min(MAX_STARS, stars + 1);
        consecutiveCorrectAnswers = 0;
      }
      localStorage.setItem('quizStars', stars);
      localStorage.setItem(STORAGE_KEY, btoa(stars + lockoutUntil));
      updateStarsDisplay();
      if (correctSound && !correctSound.muted) {
        correctSound.play().catch(e => console.warn('خطأ في تشغيل صوت الإجابة الصحيحة:', e));
      }
      button.classList.add('correct');
      quizFeedback.textContent = "✅ إجابة صحيحة!";
    } else {
      stars = Math.max(0, stars - 1);
      consecutiveCorrectAnswers = 0;
      localStorage.setItem('quizStars', stars);
      localStorage.setItem(STORAGE_KEY, btoa(stars + lockoutUntil));
      updateStarsDisplay();
      if (stars <= 0) {
        lockoutUntil = Date.now() + RESET_INTERVAL * 1000;
        localStorage.setItem('lockoutUntil', lockoutUntil);
        localStorage.setItem('starsResetStartTime', Date.now());
        localStorage.setItem(STORAGE_KEY, btoa(stars + lockoutUntil));
      }
      if (wrongSound && !wrongSound.muted) {
        wrongSound.play().catch(e => console.warn('خطأ في تشغيل صوت الإجابة الخاطئة:', e));
      }
      button.classList.add('wrong');
      quizOptions.querySelectorAll('button').forEach(b => {
        const correctAnswer = question.type === 'date-to-event' ? question.event?.trim() : question.options[question.correct]?.trim();
        if (b.textContent.trim() === correctAnswer) {
          b.classList.add('correct');
        }
      });
      quizFeedback.textContent = `❌ إجابة خاطئة! الإجابة الصحيحة هي: ${question.type === 'date-to-event' ? question.event?.trim() : question.options[question.correct]?.trim() || 'غير متوفر'}`;
    }

    if (stars <= 0) {
      checkLockout();
    } else {
      if (nextBtn) nextBtn.style.display = 'block';
    }
    updateButtonStates();
  }

  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  const allQuizzes = {
    coldwar: [
      {
        question: "أنا وزير أمريكي معروف، طرحت مشروع اقتصادي سنة 1947 سمي باسمي، عاونت به 16 دولة أوروبية باش يعمرو بعد الحرب. من أنا؟",
        options: ["جورج مارشال", "هاري ترومان", "جون كينيدي"],
        correct: 0
      },
      {
        question: "أنا رئيس أمريكي، في 1947 قلت لازم نوقفو انتشار الشيوعية، وطرحت مبدأ باسمي دعم تركيا واليونان. من أنا؟",
        options: ["هاري ترومان", "فرانكلين روزفلت", "أديناور"],
        correct: 0
      },
      {
        question: "أنا زعيم سوفياتي، خلفت ستالين، وكنت صاحب سياسة التعايش السلمي، ومن قادة أزمة كوبا. من أنا؟",
        options: ["نيكيتا خروتشوف", "جوزيف ستالين", "مولوتوف"],
        correct: 0
      },
      {
        question: "أنا رئيس أمريكي واجهت أزمة كوبا النووية سنة 1962 وهددت بحرب ضد الاتحاد السوفياتي. من أنا؟",
        options: ["جون كينيدي", "هاري ترومان", "ريتشارد نيكسون"],
        correct: 0
      },
      {
        question: "أنا آخر رئيس للاتحاد السوفياتي، حاولت نصلح البلاد بالبروسترويكا والغلاسنوست، وانتهى عهدي بسقوط الاتحاد. من أنا؟",
        options: ["ميخائيل غورباتشوف", "خروتشوف", "جدانوف"],
        correct: 0
      },
      {
        question: "أنا زعيم شيوعي متشدد، حكمت بعد الحرب العالمية الثانية، وكنت سبب انطلاق الحرب الباردة بسبب العناد. من أنا؟",
        options: ["جوزيف ستالين", "مولوتوف", "خروتشوف"],
        correct: 0
      },
      {
        question: "أنا مفكر وسياسي سوفياتي، رديت على مبدأ ترومان بتقسيم العالم إلى معسكرين، وسميت فكرتي باسمي. من أنا؟",
        options: ["جدانوف", "مولوتوف", "ستالين"],
        correct: 0
      },
      {
        question: "كنت مسؤول سوفياتي، أنشأت منظمة الكومنفورم باش ننسق بين الأحزاب الشيوعية فالعالم. من أنا؟",
        options: ["مولوتوف", "جدانوف", "خروتشوف"],
        correct: 0
      },
      {
        question: "رئيس أمريكي خلال الحرب العالمية الثانية، حضرت مؤتمر يالطا مع ستالين وتشرشل. من أنا؟",
        options: ["فرانكلين روزفلت", "هاري ترومان", "ريغان"],
        correct: 0
      },
      {
        question: "رئيس وزراء بريطانيا، ألقيت خطاباً سنة 1946 وتكلمت فيه عن 'الستار الحديدي' يفصل أوروبا. من أنا؟",
        options: ["وينستون تشرشل", "روزفلت", "ترومان"],
        correct: 0
      },
      {
        question: "أنا رئيس أمريكي خلال الثمانينات، دعيت لتكثيف الضغط على الاتحاد السوفياتي، وساهمت في سقوطه. من أنا؟",
        options: ["رونالد ريغان", "بوش الأب", "جورج مارشال"],
        correct: 0
      },
      {
        question: "أنا مستشار ألمانيا الغربية بعد الحرب، ساعدت بلادي على النهوض الاقتصادي، وتحالفت مع الغرب. من أنا؟",
        options: ["كونراد أديناور", "هتلر", "تشرشل"],
        correct: 0
      }
    ],
    revolution: [
      {
        question: "من قادة تفجير الثورة، كنت مسؤول منطقة الأوراس، واستشهدت سنة 1956 بعد توقيفي في الجبل. من أنا؟",
        options: ["مصطفى بن بولعيد", "عبان رمضان", "ديدوش مراد"],
        correct: 0
      },
      {
        question: "شاركت في مؤتمر الصومام 1956، وكنت من منظري الثورة سياسياً، واغتيلت في المغرب. من أنا؟",
        options: ["عبان رمضان", "العربي بن مهيدي", "محمد بوضياف"],
        correct: 0
      },
      {
        question: "من مؤسسي المنظمة الخاصة وجبهة التحرير، أصبحت رئيس بعد الاستقلال، وتم اعتقالي في فرنسا. من أنا؟",
        options: ["أحمد بن بلة", "محمد بوضياف", "زيغود يوسف"],
        correct: 0
      },
      {
        question: "كنت من قادة معركة الجزائر، اعتقلني العدو وقتلني تحت التعذيب، وقلت: 'ألقوا بالثورة إلى الشارع...'. من أنا؟",
        options: ["العربي بن مهيدي", "ديدوش مراد", "بن طوبال"],
        correct: 0
      },
      {
        question: "قائد المنطقة الثانية، نظمت هجومات الشمال القسنطيني يوم 20 أوت 1955، واستشهدت في معركة. من أنا؟",
        options: ["زيغود يوسف", "كريم بلقاسم", "مصطفى بن بولعيد"],
        correct: 0
      },
      {
        question: "أنا من أعضاء مجموعة الـ6، وشاركت في تأسيس جبهة التحرير، تم اعتقالي في عملية اختطاف بالطائرة. من أنا؟",
        options: ["محمد بوضياف", "أحمد بن بلة", "حسين آيت أحمد"],
        correct: 2
      },
      {
        question: "أنا أول رئيس للحكومة المؤقتة 1958، كنت إصلاحي سابقًا ثم التحقت بالثورة، ومثلتها سياسياً. من أنا؟",
        options: ["فرحات عباس", "بن يوسف بن خدة", "بن مهيدي"],
        correct: 0
      },
      {
        question: "أنا مناضل وسياسي، أصبحت رئيسًا للجزائر بعد وفاة بومدين، وسميت مرحلة حكمتي بالانفتاح السياسي. من أنا؟",
        options: ["الشاذلي بن جديد", "أحمد بن بلة", "محمد بوضياف"],
        correct: 0
      },
      {
        question: "كنت شاب مثقف، من أوائل قادة الولايات التاريخية، واستشهدت في معركة سنة 1955. من أنا؟",
        options: ["ديدوش مراد", "عبان رمضان", "أحمد زبانة"],
        correct: 0
      }
    ]
  };

  const allDateQuizzes = {
    coldwar: [
      {
        date: "1945/02/04",
        event: "مؤتمر يالطا",
        question: "متى عُقد مؤتمر يالطا؟",
        reverseQuestion: "ماذا يمثل تاريخ 4 فبراير 1945؟",
        options: ["1943/02/04", "1945/02/04", "1947/02/04"],
        correct: 1
      },
      {
        date: "1945/10/24",
        event: "تأسيس هيئة الأمم المتحدة",
        question: "متى تأسست هيئة الأمم المتحدة؟",
        reverseQuestion: "ماذا يمثل تاريخ 24 أكتوبر 1945؟",
        options: ["1943/10/24", "1945/10/24", "1947/10/24"],
        correct: 1
      },
      {
        date: "1947/03/12",
        event: "مبدأ ترومان",
        question: "متى أُعلن مبدأ ترومان؟",
        reverseQuestion: "ماذا يمثل تاريخ 12 مارس 1947؟",
        options: ["1945/03/12", "1947/03/12", "1949/03/12"],
        correct: 1
      },
      {
        date: "1947/06/05",
        event: "مشروع مارشال",
        question: "متى أُطلق مشروع مارشال؟",
        reverseQuestion: "ماذا يمثل تاريخ 5 يونيو 1947؟",
        options: ["1945/06/05", "1947/06/05", "1949/06/05"],
        correct: 1
      },
      {
        date: "1947/09/22",
        event: "مبدأ جدانوف",
        question: "متى ظهر مبدأ جدانوف؟",
        reverseQuestion: "ماذا يمثل تاريخ 22 سبتمبر 1947؟",
        options: ["1945/09/22", "1947/09/22", "1949/09/22"],
        correct: 1
      },
      {
        date: "1947/10/05",
        event: "تأسيس الكومنفورم",
        question: "متى تأسس الكومنفورم؟",
        reverseQuestion: "ماذا يمثل تاريخ 5 أكتوبر 1947؟",
        options: ["1945/10/05", "1947/10/05", "1949/10/05"],
        correct: 1
      },
      {
        date: "1949/01/25",
        event: "تأسيس الكوميكون",
        question: "متى تأسس الكوميكون؟",
        reverseQuestion: "ماذا يمثل تاريخ 25 يناير 1949؟",
        options: ["1947/01/25", "1949/01/25", "1951/01/25"],
        correct: 1
      },
      {
        date: "1949/04/04",
        event: "تأسيس حلف الناتو",
        question: "متى تأسس حلف الناتو؟",
        reverseQuestion: "ماذا يمثل تاريخ 4 أبريل 1949؟",
        options: ["1947/04/04", "1949/04/04", "1951/04/04"],
        correct: 1
      },
      {
        date: "1953/03/05",
        event: "وفاة ستالين",
        question: "متى توفي جوزيف ستالين؟",
        reverseQuestion: "ماذا يمثل تاريخ 5 مارس 1953؟",
        options: ["1951/03/05", "1953/03/05", "1955/03/05"],
        correct: 1
      },
      {
        date: "1953",
        event: "نهاية الأزمة الكورية",
        question: "متى انتهت الأزمة الكورية؟",
        reverseQuestion: "ماذا يمثل عام 1953؟",
        options: ["1951", "1953", "1955"],
        correct: 1
      },
      {
        date: "1954/09/08",
        event: "تأسيس حلف جنوب شرق آسيا",
        question: "متى تأسس حلف جنوب شرق آسيا؟",
        reverseQuestion: "ماذا يمثل تاريخ 8 سبتمبر 1954؟",
        options: ["1952/09/08", "1954/09/08", "1956/09/08"],
        correct: 1
      },
      {
        date: "1955/02/24",
        event: "تأسيس حلف بغداد",
        question: "متى تأسس حلف بغداد؟",
        reverseQuestion: "ماذا يمثل تاريخ 24 فبراير 1955؟",
        options: ["1953/02/24", "1955/02/24", "1957/02/24"],
        correct: 1
      },
      {
        date: "1955/04/18",
        event: "مؤتمر باندونغ",
        question: "متى عُقد مؤتمر باندونغ؟",
        reverseQuestion: "ماذا يمثل تاريخ 18 أبريل 1955؟",
        options: ["1953/04/18", "1955/04/18", "1957/04/18"],
        correct: 1
      },
      {
        date: "1955/05/14",
        event: "تأسيس حلف وارسو",
        question: "متى تأسس حلف وارسو؟",
        reverseQuestion: "ماذا يمثل تاريخ 14 مايو 1955؟",
        options: ["1953/05/14", "1955/05/14", "1957/05/14"],
        correct: 1
      },
      {
        date: "1956/04/17",
        event: "حل الكومنفورم",
        question: "متى حُلّ الكومنفورم؟",
        reverseQuestion: "ماذا يمثل تاريخ 17 أبريل 1956؟",
        options: ["1954/04/17", "1956/04/17", "1958/04/17"],
        correct: 1
      },
      {
        date: "1956/07/26",
        event: "تأميم قناة السويس",
        question: "متى تم تأميم قناة السويس؟",
        reverseQuestion: "ماذا يمثل تاريخ 26 يوليو 1956؟",
        options: ["1954/07/26", "1956/07/26", "1958/07/26"],
        correct: 1
      },
      {
        date: "1956/10/29",
        event: "العدوان الثلاثي على مصر",
        question: "متى حدث العدوان الثلاثي على مصر؟",
        reverseQuestion: "ماذا يمثل تاريخ 29 أكتوبر 1956؟",
        options: ["1954/10/29", "1956/10/29", "1958/10/29"],
        correct: 1
      },
      {
        date: "1957/01/05",
        event: "مشروع أيزنهاور",
        question: "متى أُعلن مشروع أيزنهاور؟",
        reverseQuestion: "ماذا يمثل تاريخ 5 يناير 1957؟",
        options: ["1955/01/05", "1957/01/05", "1959/01/05"],
        correct: 1
      },
      {
        date: "1961/08/13",
        event: "بناء جدار برلين",
        question: "متى بُني جدار برلين؟",
        reverseQuestion: "ماذا يمثل تاريخ 13 أغسطس 1961؟",
        options: ["1959/08/13", "1961/08/13", "1963/08/13"],
        correct: 1
      },
      {
        date: "1963/06/20",
        event: "إنشاء الخط الأحمر الهاتفي",
        question: "متى أُنشئ الخط الأحمر الهاتفي؟",
        reverseQuestion: "ماذا يمثل تاريخ 20 يونيو 1963؟",
        options: ["1961/06/20", "1963/06/20", "1965/06/20"],
        correct: 1
      },
      {
        date: "1972/05/26",
        event: "اتفاقية SALT 1",
        question: "متى وُقّعت اتفاقية SALT 1؟",
        reverseQuestion: "ماذا يمثل تاريخ 26 مايو 1972؟",
        options: ["1970/05/26", "1972/05/26", "1974/05/26"],
        correct: 1
      },
      {
        date: "1979/06/18",
        event: "اتفاقية SALT 2",
        question: "متى وُقّعت اتفاقية SALT 2؟",
        reverseQuestion: "ماذا يمثل تاريخ 18 يونيو 1979؟",
        options: ["1977/06/18", "1979/06/18", "1981/06/18"],
        correct: 1
      },
      {
        date: "1989/11/09",
        event: "تحطيم جدار برلين",
        question: "متى تحطم جدار برلين؟",
        reverseQuestion: "ماذا يمثل تاريخ 9 نوفمبر 1989؟",
        options: ["1987/11/09", "1989/11/09", "1991/11/09"],
        correct: 1
      },
      {
        date: "1989/12/03",
        event: "قمة مالطا",
        question: "متى عُقدت قمة مالطا؟",
        reverseQuestion: "ماذا يمثل تاريخ 3 ديسمبر 1989؟",
        options: ["1987/12/03", "1989/12/03", "1991/12/03"],
        correct: 1
      },
      {
        date: "1990/10/03",
        event: "توحيد الألمانيتين",
        question: "متى توحدت الألمانيتان؟",
        reverseQuestion: "ماذا يمثل تاريخ 3 أكتوبر 1990؟",
        options: ["1988/10/03", "1990/10/03", "1992/10/03"],
        correct: 1
      },
      {
        date: "1990/12/23",
        event: "مؤتمر باريس ونهاية الحرب الباردة",
        question: "متى عُقد مؤتمر باريس؟",
        reverseQuestion: "ماذا يمثل تاريخ 23 ديسمبر 1990؟",
        options: ["1988/12/23", "1990/12/23", "1992/12/23"],
        correct: 1
      },
      {
        date: "1991/06/28",
        event: "حل الكوميكون",
        question: "متى حُلّ الكوميكون؟",
        reverseQuestion: "ماذا يمثل تاريخ 28 يونيو 1991؟",
        options: ["1989/06/28", "1991/06/28", "1993/06/28"],
        correct: 1
      },
      {
        date: "1991/07/01",
        event: "حل حلف وارسو",
        question: "متى حُلّ حلف وارسو؟",
        reverseQuestion: "ماذا يمثل تاريخ 1 يوليو 1991؟",
        options: ["1989/07/01", "1991/07/01", "1993/07/01"],
        correct: 1
      },
      {
        date: "1991/12/25",
        event: "سقوط الاتحاد السوفياتي",
        question: "متى سقط الاتحاد السوفياتي؟",
        reverseQuestion: "ماذا يمثل تاريخ 25 ديسمبر 1991؟",
        options: ["1989/12/25", "1991/12/25", "1993/12/25"],
        correct: 1
      }
    ],
   
  "algerianRevolution": [
    {
      "date": "1945/05/08",
      "event": "مجازر 8 ماي",
      "question": "متى وقعت مجازر 8 ماي؟",
      "reverseQuestion": "ماذا يمثل تاريخ 8 ماي 1945؟",
      "options": ["8 ماي 1947", "8 ماي 1945", "20 أوت 1955"],
      "correct": 1
    },
    {
      "date": "1947/02/15",
      "event": "إنشاء المنظمة الخاصة",
      "question": "متى تم إنشاء المنظمة الخاصة؟",
      "reverseQuestion": "ماذا يمثل تاريخ 15 فيفري 1947؟",
      "options": ["15 فيفري 1947", "3 مارس 1954", "20 أوت 1956"],
      "correct": 0
    },
    {
      "date": "1947/09/28",
      "event": "إصدار الدستور الخاص بالجزائر",
      "question": "متى صدر الدستور الخاص بالجزائر؟",
      "reverseQuestion": "ماذا يمثل تاريخ 28 سبتمبر 1947؟",
      "options": ["28 سبتمبر 1947", "28 جويلية 1958", "1 نوفمبر 1954"],
      "correct": 0
    },
    {
      "date": "1954/03/03",
      "event": "إنشاء اللجنة الثورية للوحدة والعمل",
      "question": "متى تم إنشاء اللجنة الثورية؟",
      "reverseQuestion": "ماذا يمثل تاريخ 03 مارس 1954؟",
      "options": ["03 مارس 1954", "23 أكتوبر 1956", "19 سبتمبر 1958"],
      "correct": 0
    },
    {
      "date": "1954/06/23",
      "event": "اجتماع مجموعة الـ22",
      "question": "متى انعقد اجتماع مجموعة الـ22؟",
      "reverseQuestion": "ماذا يمثل تاريخ 23 جوان 1954؟",
      "options": ["10 أكتوبر 1954", "23 جوان 1954", "1 نوفمبر 1954"],
      "correct": 1
    },
    {
      "date": "1954/10/10",
      "event": "اجتماع اللجنة الستة الأول",
      "question": "متى انعقد اجتماع اللجنة الستة الأول؟",
      "reverseQuestion": "ماذا يمثل تاريخ 10 أكتوبر 1954؟",
      "options": ["10 أكتوبر 1954", "20 أوت 1955", "3 مارس 1954"],
      "correct": 0
    },
    {
      "date": "1954/10/23",
      "event": "اجتماع اللجنة الستة الثاني",
      "question": "متى انعقد اجتماع اللجنة الستة الثاني؟",
      "reverseQuestion": "ماذا يمثل تاريخ 23 أكتوبر 1954؟",
      "options": ["23 أكتوبر 1954", "23 جوان 1954", "22 أكتوبر 1956"],
      "correct": 0
    },
    {
      "date": "1955/02/15",
      "event": "تعيين جاك سوستال والياً على الجزائر",
      "question": "متى تم تعيين جاك سوستال؟",
      "reverseQuestion": "ماذا يمثل تاريخ 15 فيفري 1955؟",
      "options": ["15 فيفري 1955", "15 مارس 1956", "24 فيفري 1956"],
      "correct": 0
    },
    {
      "date": "1955/08/20",
      "event": "هجومات الشمال القسنطيني",
      "question": "متى وقعت هجومات الشمال القسنطيني؟",
      "reverseQuestion": "ماذا يمثل تاريخ 20 أغسطس 1955؟",
      "options": ["20 أوت 1954", "20 أوت 1955", "20 أوت 1956"],
      "correct": 1
    },
    {
      "date": "1956/02/24",
      "event": "إنشاء الاتحاد العام للعمال الجزائريين",
      "question": "متى تم إنشاء الاتحاد العام للعمال الجزائريين؟",
      "reverseQuestion": "ماذا يمثل تاريخ 24 فيفري 1956؟",
      "options": ["24 فيفري 1955", "24 فيفري 1956", "24 فيفري 1958"],
      "correct": 1
    },
    {
      "date": "1956/05/19",
      "event": "إضراب الطلبة والتحاقهم بالثورة",
      "question": "متى وقع إضراب الطلبة؟",
      "reverseQuestion": "ماذا يمثل تاريخ 19 ماي 1956؟",
      "options": ["19 ماي 1955", "19 ماي 1956", "19 ماي 1957"],
      "correct": 1
    },
    {
      "date": "1956/08/20",
      "event": "مؤتمر الصومام",
      "question": "متى انعقد مؤتمر الصومام؟",
      "reverseQuestion": "ماذا يمثل تاريخ 20 أغسطس 1956؟",
      "options": ["20 أوت 1955", "20 أوت 1956", "22 أكتوبر 1956"],
      "correct": 1
    },
    {
      "date": "1956/10/22",
      "event": "القرصنة الجوية (اختطاف زعماء الثورة)",
      "question": "متى وقع حادث القرصنة الجوية؟",
      "reverseQuestion": "ماذا يمثل تاريخ 22 أكتوبر 1956؟",
      "options": ["22 أكتوبر 1955", "22 أكتوبر 1956", "22 أكتوبر 1957"],
      "correct": 1
    },
    {
      "date": "1957/01/25",
      "event": "إضراب 8 أيام",
      "question": "متى وقع إضراب 8 أيام؟",
      "reverseQuestion": "ماذا يمثل تاريخ 25 جانفي - 4 فيفري 1957؟",
      "options": ["جانفي 1956", "جانفي 1957", "جانفي 1958"],
      "correct": 1
    },
    {
      "date": "1958/02/08",
      "event": "قصف قرية سيدي يوسف",
      "question": "متى وقع قصف سيدي يوسف؟",
      "reverseQuestion": "ماذا يمثل تاريخ 08 فيفري 1958؟",
      "options": ["08 فيفري 1957", "08 فيفري 1958", "08 فيفري 1962"],
      "correct": 1
    },
    {
      "date": "1958/07/28",
      "event": "الاستفتاء حول دستور الجمهورية الخامسة",
      "question": "متى وقع الاستفتاء حول الدستور الفرنسي؟",
      "reverseQuestion": "ماذا يمثل تاريخ 28 جويلية 1958؟",
      "options": ["28 جويلية 1958", "28 سبتمبر 1947", "3 أكتوبر 1958"],
      "correct": 0
    },
    {
      "date": "1958/09/19",
      "event": "تشكيل الحكومة المؤقتة للجمهورية الجزائرية",
      "question": "متى تم تشكيل الحكومة المؤقتة؟",
      "reverseQuestion": "ماذا يمثل تاريخ 19 سبتمبر 1958؟",
      "options": ["19 سبتمبر 1958", "3 أكتوبر 1958", "1 نوفمبر 1954"],
      "correct": 0
    },
    {
      "date": "1958/10/03",
      "event": "مشروع قسنطينة",
      "question": "متى أُعلن عن مشروع قسنطينة؟",
      "reverseQuestion": "ماذا يمثل تاريخ 03 أكتوبر 1958؟",
      "options": ["03 أكتوبر 1958", "03 مارس 1954", "08 فيفري 1958"],
      "correct": 0
    },
    {
      "date": "1958/10/23",
      "event": "سلم الشجعان",
      "question": "متى أُعلن عن سلم الشجعان؟",
      "reverseQuestion": "ماذا يمثل تاريخ 23 أكتوبر 1958؟",
      "options": ["23 أكتوبر 1958", "19 جوان 1965", "22 أكتوبر 1956"],
      "correct": 0
    },
    {
      "date": "1959/09/16",
      "event": "مشروع تقرير المصير",
      "question": "متى طُرح مشروع تقرير المصير؟",
      "reverseQuestion": "ماذا يمثل تاريخ 16 سبتمبر 1959؟",
      "options": ["16 سبتمبر 1959", "19 مارس 1962", "03 أكتوبر 1958"],
      "correct": 0
    },
    {
      "date": "1960/12/11",
      "event": "المظاهرات الشعبية في الجزائر",
      "question": "متى وقعت المظاهرات الشعبية الكبرى؟",
      "reverseQuestion": "ماذا يمثل تاريخ 11 ديسمبر 1960؟",
      "options": ["11 ديسمبر 1960", "17 أكتوبر 1961", "08 ماي 1945"],
      "correct": 0
    },
    {
      "date": "1961/10/17",
      "event": "مظاهرات المهاجرين الجزائريين في فرنسا",
      "question": "متى وقعت مظاهرات 17 أكتوبر؟",
      "reverseQuestion": "ماذا يمثل تاريخ 17 أكتوبر 1961؟",
      "options": ["17 أكتوبر 1960", "17 أكتوبر 1961", "18 مارس 1962"],
      "correct": 1
    },
    {
      "date": "1962/03/18",
      "event": "توقيع اتفاقية إيفيان",
      "question": "متى تم توقيع اتفاقيات إيفيان؟",
      "reverseQuestion": "ماذا يمثل تاريخ 18 مارس 1962؟",
      "options": ["19 مارس 1962", "18 مارس 1962", "03 أكتوبر 1958"],
      "correct": 1
    },
    {
      "date": "1962/03/19",
      "event": "وقف إطلاق النار",
      "question": "متى بدأ وقف إطلاق النار رسميًا؟",
      "reverseQuestion": "ماذا يمثل تاريخ 19 مارس 1962؟",
      "options": ["19 مارس 1962", "18 مارس 1962", "1 نوفمبر 1954"],
      "correct": 0
    },
    {
      "date": "1962/05/27",
      "event": "مؤتمر طرابلس",
      "question": "متى انعقد مؤتمر طرابلس؟",
      "reverseQuestion": "ماذا يمثل تاريخ 27 ماي - 4 جوان 1962؟",
      "options": ["ماي 1962", "جويلية 1962", "مارس 1962"],
      "correct": 0
    },
    {
      "date": "1965/06/19",
      "event": "التصحيح الثوري",
      "question": "متى وقع التصحيح الثوري بقيادة بومدين؟",
      "reverseQuestion": "ماذا يمثل تاريخ 19 جوان 1965؟",
      "options": ["19 جوان 1962", "19 جوان 1965", "1 نوفمبر 1954"],
      "correct": 1
    }
  ]
}
  

  // إضافة مستمعات الأحداث للأزرار
  if (nextBtn) {
    nextBtn.addEventListener('click', nextQuestion);
  }
  if (retryBtn) {
    retryBtn.addEventListener('click', restartQuiz);
  }

  // إضافة مستمع حدث لزر الثورة الجزائرية في نافذة "احفظ معي تواريخ"
  const datePopup = document.getElementById('datePopup');
  if (datePopup) {
    const algerianRevolutionDateButton = datePopup.querySelector('#algerian-revolution-date-btn');
    if (algerianRevolutionDateButton) {
      algerianRevolutionDateButton.addEventListener('click', () => {
        window.startDateQuiz('algerianRevolution');
      });
      console.log('تم إضافة مستمع حدث لزر الثورة الجزائرية في لعبة التواريخ');
    } else {
      console.warn('زر الثورة الجزائرية (#algerian-revolution-date-btn) غير موجود في datePopup');
    }
  } else {
    console.warn('عنصر datePopup غير موجود');
  }

  // تشغيل العداد وتحديث النجوم عند تحميل الصفحة
  updateStarsDisplay();
  manageCountdown();
  updateButtonStates();
});
// التحقق من حالة الاتصال بالإنترنت
const offlineOverlay = document.getElementById('offlineOverlay');

function checkOnlineStatus() {
  // التحقق الأولي باستخدام navigator.onLine
  if (!navigator.onLine) {
    offlineOverlay.classList.add('active');
    return;
  }

  // تحقق إضافي باستخدام fetch لضمان الدقة
  fetch('https://www.google.com/favicon.ico', {
    method: 'HEAD',
    mode: 'no-cors',
    cache: 'no-store'
  })
    .then(() => {
      offlineOverlay.classList.remove('active');
    })
    .catch(() => {
      offlineOverlay.classList.add('active');
    });
}

function retryConnection() {
  checkOnlineStatus();
}

// تحقق من حالة الاتصال عند تحميل الصفحة
function checkOnlineStatus() {
  if (navigator.onLine) {
    document.getElementById("offline-overlay").style.display = "none";
  } else {
    document.getElementById("offline-overlay").style.display = "flex";
  }
}

// تحقق عند تحميل الصفحة
window.addEventListener('load', checkOnlineStatus);

// عند تغيير حالة الاتصال
window.addEventListener('online', checkOnlineStatus);
window.addEventListener('offline', checkOnlineStatus);

// تحقق كل 10 ثواني
setInterval(checkOnlineStatus, 10000);

