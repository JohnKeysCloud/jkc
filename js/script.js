const anchors = document.querySelectorAll('a[href^="#"]');
const inception = document.querySelector('.project-visual');
const key = document.getElementById('key-img')
const modalTriggerBtn = document.querySelector('#tapMeContainer');
const nav = document.querySelector("#navigation");
const navButtons = document.querySelectorAll('nav li');
const navModal = document.querySelector('.nav-toggle');
const observer = new IntersectionObserver(
  ([e]) => {
    return e.target.classList.toggle('is-pinned', e.intersectionRatio < 1);
  },
  { threshold: [1] }
);
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

anchors.forEach((anchor) => {
  anchor.addEventListener("click", function(e) {
    e.preventDefault();
    
    document.querySelector(this.getAttribute("href")).scrollIntoView({
      behavior: "smooth",
    });
  });
});

navButtons.forEach((button) =>
  button.addEventListener('click', () => key.click())
);
observer.observe(nav);
key.addEventListener('click', toggleNav); 
tcnyModalCloseButton.addEventListener('click', deactivateLevelOne);
openBtnContainer.addEventListener('click', initiateLevelOne);

modalTriggerBtn.addEventListener("click", initiateLevelOne);
openBtnContainer.addEventListener('click', initiateLevelOne);