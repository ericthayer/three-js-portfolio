import { projects } from './data/projects.js'
import { Stage } from './gl/stage.js'
import { SmoothScroll } from './scroll.js'

const canvas = document.getElementById('gl')
const container = document.getElementById('scroll-container')
const track = document.getElementById('track')
const workWrap = document.getElementById('work')
const caseStudy = document.getElementById('case-study')

/* ---------- Build project panels ---------- */
projects.forEach((project, i) => {
  const panel = document.createElement('section')
  panel.className = 'panel panel--project'
  panel.dataset.index = i
  panel.setAttribute('tabindex', '0')
  panel.setAttribute('role', 'button')
  panel.setAttribute('aria-label', `Open case study: ${project.title}`)
  panel.innerHTML = `
    <div class="project-media" data-media></div>
    <div class="project-info">
      <p class="project-index">${project.index}</p>
      <h2 class="project-title">${project.title}</h2>
      <p class="project-meta">${project.meta}</p>
      <p class="project-cta">View case study →</p>
    </div>
  `
  workWrap.appendChild(panel)
})

/* ---------- WebGL stage + smooth scroll ---------- */
const stage = new Stage(canvas, projects)
stage.bindPlaneElements([...workWrap.querySelectorAll('[data-media]')])

const scroller = new SmoothScroll(track, container)

/* ---------- Case study transitions ---------- */
let openIndex = -1
let transitioning = false

const csHero = caseStudy.querySelector('.case-study__hero')
const csIndex = caseStudy.querySelector('.case-study__index')
const csTitle = caseStudy.querySelector('.case-study__title')
const csMeta = caseStudy.querySelector('.case-study__meta')
const csBody = caseStudy.querySelector('.case-study__body')
const csHighlights = caseStudy.querySelector('.case-study__highlights')
const csClose = caseStudy.querySelector('.case-study__close')

async function openCaseStudy(index) {
  if (transitioning || openIndex !== -1) return
  transitioning = true
  openIndex = index

  const project = projects[index]
  csIndex.textContent = `Case study ${project.index}`
  csTitle.textContent = project.title
  csMeta.textContent = `${project.meta} — ${project.tagline}`
  csBody.textContent = project.body
  csHighlights.innerHTML = project.highlights
    .map((h) => `<li>${escapeHtml(h)}</li>`)
    .join('')

  // Pixel-identical handoff: hero uses the same generated texture
  csHero.style.backgroundImage = `url(${stage.planes[index].dataUrl})`
  csHero.style.backgroundSize = 'cover'
  csHero.style.backgroundPosition = 'center'

  // Animate the WebGL plane to the hero rect, then fade the overlay in
  const heroRect = {
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight * 0.62,
  }
  await stage.transitionTo(index, heroRect)

  caseStudy.classList.add('is-open')
  caseStudy.setAttribute('aria-hidden', 'false')
  caseStudy.scrollTop = 0
  document.body.style.overflow = 'hidden'
  csClose.focus()
  transitioning = false
}

async function closeCaseStudy() {
  if (transitioning || openIndex === -1) return
  transitioning = true

  const index = openIndex
  caseStudy.classList.remove('is-open')
  caseStudy.setAttribute('aria-hidden', 'true')
  document.body.style.overflow = ''

  await stage.transitionBack(index)
  stage.clearTransition()

  const panel = workWrap.querySelector(`[data-index="${index}"]`)
  if (panel) panel.focus()
  openIndex = -1
  transitioning = false
}

workWrap.addEventListener('click', (e) => {
  const panel = e.target.closest('.panel--project')
  if (panel) openCaseStudy(Number(panel.dataset.index))
})

workWrap.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return
  const panel = e.target.closest('.panel--project')
  if (panel) {
    e.preventDefault()
    openCaseStudy(Number(panel.dataset.index))
  }
})

workWrap.addEventListener('mouseover', (e) => {
  const panel = e.target.closest('.panel--project')
  if (panel) stage.setHover(Number(panel.dataset.index), true)
})

workWrap.addEventListener('mouseout', (e) => {
  const panel = e.target.closest('.panel--project')
  if (panel) stage.setHover(Number(panel.dataset.index), false)
})

csClose.addEventListener('click', closeCaseStudy)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeCaseStudy()
})

/* ---------- Anchor navigation across the horizontal axis ---------- */
document.querySelectorAll('[data-nav]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'))
    if (!target) return
    e.preventDefault()
    if (openIndex !== -1) closeCaseStudy()
    scroller.scrollToElement(target)
  })
})

/* ---------- Resize ---------- */
let resizeTimer
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    scroller.refresh()
    stage.resize()
  }, 150)
})

/* ---------- Render loop ---------- */
function tick() {
  const { progress, velocity } = scroller.update()
  stage.update(progress, velocity)
  requestAnimationFrame(tick)
}

tick()

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}
