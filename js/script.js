const key = document.getElementById('key-img')
const openModal = document.querySelector('.nav-toggle');
let navOpen = false;
key.addEventListener('click', () => {
  if (!navOpen) {
    openModal.classList.add('open');
    navOpen = true;
  } else {
    openModal.classList.remove('open');
    navOpen = false;
  }
}); 


const modalTriggerBtn = document.querySelector('#tapMeContainer');
const inception = document.querySelector(".project-visual");
let modalOpen = false;

modalTriggerBtn.addEventListener("click", () => {
  if (!modalOpen) {
    openBtnContainer.classList.add("open");
    inception.classList.add("inception");
    tapMe.classList.add("tapped");
    modalOpen = true;
  }
}); 

const openBtnContainer = document.querySelector(".modal-trigger");
const tapMe = document.querySelector("#levelOne");
const closeModal = document.querySelector(".close-btn");


openBtnContainer.addEventListener("click", () => {
  if (!modalOpen) {
    openBtnContainer.classList.add("open");
    tapMe.classList.add("tapped")
    inception.classList.add("inception");
    modalOpen = true;
  }
}); 
closeModal.addEventListener('click', () => {
  if (modalOpen) {
    openBtnContainer.classList.remove("open");
    tapMe.classList.remove("tapped");
    inception.classList.remove("inception");
    modalOpen = false;
  }
});

const stickyCheck = document.querySelector("#navigation");
const observer = new IntersectionObserver(
  ([e]) => {
    return e.target.classList.toggle("is-pinned", e.intersectionRatio < 1);
  },
  { threshold: [1] }
);
observer.observe(stickyCheck);

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();

    document.querySelector(this.getAttribute("href")).scrollIntoView({
      behavior: "smooth",
    });
  });
});


const pikaNumberText = document.getElementById('pikaNumber-text');
let projectMobileVisual = document.getElementsByClassName("projectImgContainer")[0];
let linkContainer = document.getElementsByClassName("link-container")[0];
let cloudClose = document.getElementsByClassName("cyClose-btn")[0];
let pikaNumberGif = document.getElementById('pikaNumber-gif');

pikaNumberText.addEventListener('click', projectToggle);

function projectToggle() {

  pikaNumberGif.style.setProperty("filter", "saturate(0)");

  pikaNumberText.style.setProperty('opacity', '0.5');
  pikaNumberText.style.setProperty('cursor', 'initial');
  
  projectMobileVisual.style.setProperty('z-index', '1');
  projectMobileVisual.style.setProperty("transform", "translate(-50%, -50%) scale(1.4) rotate(0deg)");

  cloudClose.style.setProperty('opacity', '1');
  cloudClose.style.setProperty('visibility', 'visible');

  linkContainer.style.setProperty('opacity', '1');
  linkContainer.style.setProperty('visibility', 'visible');

  document.documentElement.style.setProperty('--js-opacity', '1');
  document.documentElement.style.setProperty('--project-filter', 'drop-shadow(0 11px 11px black)');

  cloudClose.addEventListener('click', () => {
    pikaNumberGif.style.setProperty("filter", "saturate(1)");

    pikaNumberText.style.setProperty("opacity", "1");
    pikaNumberText.style.setProperty("cursor", "pointer");

    projectMobileVisual.style.setProperty("z-index", "0");
    projectMobileVisual.style.setProperty("transform", "translate(-50%, -50%) scale(1.2) rotate(13deg)");
    
    cloudClose.style.setProperty('opacity', '0');
    cloudClose.style.setProperty("visibility", "hidden");

    linkContainer.style.setProperty("opacity", "0");
    linkContainer.style.setProperty("visibility", "hidden");

    document.documentElement.style.setProperty("--js-opacity", "0");
    document.documentElement.style.setProperty('--project-filter', 'drop-shadow(0 0 11px #ffd73f)');
  });
};

// const width  = window.innerWidth || document.documentElement.clientWidth || 
// document.body.clientWidth;
// const height = window.innerHeight|| document.documentElement.clientHeight|| 
// document.body.clientHeight;

// console.log(width, height);
