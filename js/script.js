const anchors = document.querySelectorAll('a[href^="#"]');
const inception = document.querySelector('.project-visual');
const key = document.getElementById('key-img')
const modalTriggerBtn = document.querySelector('#tapMeContainer');
const nav = document.querySelector("#navigation");
const navButtons = document.querySelectorAll('nav li');
const navModal = document.querySelector('.nav-toggle');
const openBtnContainer = document.querySelector('.modal-trigger');
const tapMe = document.querySelector('#levelOne');
const tcnyModalCloseButton = document.querySelector('.close-btn');
let modalOpen = false;


function toggleNav() {
  navModal.classList.toggle('open');
}

function initiateLevelOne() {
  if (!modalOpen) {
    openBtnContainer.classList.add('open');
    inception.classList.add('inception');
    tapMe.classList.add('tapped');
    modalOpen = true;
  }
}

function deactivateLevelOne() {
  if (modalOpen) {
    openBtnContainer.classList.remove('open');
    tapMe.classList.remove('tapped');
    inception.classList.remove('inception');
    modalOpen = false;
  }
}

const observer = new IntersectionObserver(
  ([e]) => {
    return e.target.classList.toggle('is-pinned', e.intersectionRatio < 1);
  },
  { threshold: [1] }
);

observer.observe(nav);

// scrolls section into view smoothly
anchors.forEach((anchor) => {
  anchor.addEventListener("click", function(e) {
    e.preventDefault();
    
    document.querySelector(this.getAttribute("href")).scrollIntoView({
      behavior: "smooth",
    });
  });
});

// resets key on nav anchor click
navButtons.forEach((button) =>
  button.addEventListener('click', () => key.click())
);

key.addEventListener('click', toggleNav); 
openBtnContainer.addEventListener('click', initiateLevelOne);
modalTriggerBtn.addEventListener("click", initiateLevelOne);
tcnyModalCloseButton.addEventListener('click', deactivateLevelOne);