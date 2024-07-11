const getElement = (selector, scope = document) => scope.querySelector(selector);
const getAllElements = (selector, scope = document) => scope.querySelectorAll(selector);
const addListener = (element, event, handler) => element.addEventListener(event, handler);
const removeListener = (element, event, handler) => element.removeEventListener(event, handler);
const toggleClass = (element, action, className) => element.classList[action](className);
const setDisabledState = (element, state) => element.disabled = state;

// 💭 --------------------------------------------------------------

const elementSet = {
	withListeners: {
		anchors: () => getAllElements('a[href ^= "#"]'),
		navKeyButton: () => getElement('#nav-key-button'),
		navListItems: () => getAllElements('.nav-list-item'),
		tcnyLevelOneCloseButton: () => getElement('#tcny-level-one-close-button'),
		tcnyTapHereContainer: () => getElement('#tcny-tap-here-container'),
		tcnyWidgetVisualContainer: () => getElement('#tcny-widget-visual-container'),
	},
	withoutListeners: {
		footerYear: () => getElement('#footer-year'),
		nav: () => getElement('#nav'),
		tcnyWidgetContainer: () => getElement('#tcny-widget-container'),
		tcnyWidgetTextContainer: () => getElement('#tcny-widget-text-container'),
	}
}

// 💭 --------------------------------------------------------------
  
function toggleLevelOne() {
  elementSet.withoutListeners.tcnyWidgetContainer().classList.toggle('active');
}

function toggleNav() {
	elementSet.withListeners.navKeyButton().classList.toggle('active');
}

function smoothScoll(e) {
	e.preventDefault();

	document.querySelector(this.getAttribute("href")).scrollIntoView({
		behavior: "smooth",
	});
}

// 💭 --------------------------------------------------------------

function addListeners() {
	elementSet.withListeners.navKeyButton().addEventListener('click', toggleNav);
	elementSet.withListeners.tcnyTapHereContainer().addEventListener('click', toggleLevelOne);
	elementSet.withListeners.tcnyWidgetVisualContainer().addEventListener('click', toggleLevelOne);
	elementSet.withListeners.tcnyLevelOneCloseButton().addEventListener('click', toggleLevelOne);
	elementSet.withListeners.navListItems().forEach((listItem) =>
		listItem.addEventListener('click', toggleNav)
	);
	elementSet.withListeners.anchors().forEach((anchor) => 
		anchor.addEventListener("click", smoothScoll));
}

function attachKeyObserver() {
	const observer = new IntersectionObserver(
		([e]) => {
			return e.target.classList.toggle('is-pinned', e.intersectionRatio < 1);
		},
		{ threshold: [1] }
	);

	observer.observe(elementSet.withoutListeners.nav());
}

function addDynamicYear() {
	const currentYear = new Date().getFullYear();
	elementSet.withoutListeners.footerYear().innerHTML = currentYear;
}

// 💭 --------------------------------------------------------------

function init() {
	addDynamicYear();
	attachKeyObserver();
	addListeners();
}

// 💭 --------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
	init();
});

// // window.onload = () => {
// // 	console.log('All resources finished loading!');
// // 	init();
// // };

/* 
	┌─────────────────────────────────────────────────────────────────────────┐
	│ In most cases, you would use `DOMContentLoaded` as it ensures that your │
	│ script runs as soon as the DOM is ready, without waiting for the        │
	│ entire page to load, which can improve the perceived performance of     │
	│ your application. `window.onload` waits for all to load (styles/imgs).  │
	└─────────────────────────────────────────────────────────────────────────┘
 */