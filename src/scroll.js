/**
 * SmoothScroll maps native vertical scrolling to a lerped horizontal
 * translation of the track — the native scrollbar, keyboard, and touch
 * momentum all keep working. On small / touch viewports it steps aside
 * and the page falls back to a natural vertical document flow.
 */
export class SmoothScroll {
  constructor(track, container) {
    this.track = track
    this.container = container
    this.current = 0
    this.target = 0
    this.velocity = 0
    this.max = 0
    this.horizontal = false
    this.reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    this.onScroll = this.onScroll.bind(this)
    window.addEventListener('scroll', this.onScroll, { passive: true })

    this.refresh()
  }

  isDesktop() {
    return (
      window.innerWidth > 820 &&
      !(window.matchMedia('(pointer: coarse)').matches && window.innerWidth <= 1024)
    )
  }

  refresh() {
    this.horizontal = this.isDesktop()
    document.body.classList.toggle('is-vertical', !this.horizontal)

    if (this.horizontal) {
      this.max = Math.max(this.track.scrollWidth - window.innerWidth, 1)
      // Vertical scroll range drives horizontal travel
      this.container.style.height = `${this.max + window.innerHeight}px`
      this.track.style.position = 'fixed'
      this.track.style.top = '0'
      this.track.style.left = '0'
    } else {
      this.container.style.height = ''
      this.track.style.position = ''
      this.track.style.top = ''
      this.track.style.left = ''
      this.track.style.transform = ''
      this.max = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      )
    }
    this.target = Math.min(window.scrollY, this.max)
    this.current = this.target
  }

  onScroll() {
    this.target = Math.min(window.scrollY, this.max)
  }

  /** Scrolls so the given element is brought into view on either axis. */
  scrollToElement(el) {
    if (this.horizontal) {
      const trackRect = this.track.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const offset = elRect.left - trackRect.left
      window.scrollTo({
        top: Math.min(offset, this.max),
        behavior: this.reducedMotion ? 'auto' : 'smooth',
      })
    } else {
      el.scrollIntoView({
        behavior: this.reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    }
  }

  update() {
    const ease = this.reducedMotion ? 1 : 0.085
    const previous = this.current
    this.current += (this.target - this.current) * ease
    if (Math.abs(this.target - this.current) < 0.05) {
      this.current = this.target
    }
    this.velocity = this.current - previous

    if (this.horizontal) {
      this.track.style.transform = `translate3d(${-this.current}px, 0, 0)`
    }

    return {
      progress: this.max > 0 ? this.current / this.max : 0,
      velocity: this.velocity,
    }
  }
}
