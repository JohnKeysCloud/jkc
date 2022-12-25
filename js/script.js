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



navButtons.forEach(button => button.addEventListener('click', () => key.click()));


function toggleNav() {
  navModal.classList.toggle('open');
}
key.addEventListener('click', toggleNav); 

function initiateLevelOne() {
  if (!modalOpen) {
    openBtnContainer.classList.add('open');
    inception.classList.add('inception');
    tapMe.classList.add('tapped');
    modalOpen = true;
  }
}
modalTriggerBtn.addEventListener("click", initiateLevelOne);
openBtnContainer.addEventListener("click", initiateLevelOne);

function deactivateLevelOne() {
  if (modalOpen) {
    openBtnContainer.classList.remove('open');
    tapMe.classList.remove('tapped');
    inception.classList.remove('inception');
    modalOpen = false;
  }
}
tcnyModalCloseButton.addEventListener('click', deactivateLevelOne);

anchors.forEach((anchor) => {
  anchor.addEventListener("click", function(e) {
    e.preventDefault();
    
    document.querySelector(this.getAttribute("href")).scrollIntoView({
      behavior: "smooth",
    });
  });
});

observer.observe(nav);

// const width  = window.innerWidth || document.documentElement.clientWidth || 
// document.body.clientWidth;
// const height = window.innerHeight|| document.documentElement.clientHeight|| 
// document.body.clientHeight;

// console.log(width, height);