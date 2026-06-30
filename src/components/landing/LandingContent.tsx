import './landing.css'
import LandingNav from './LandingNav'
import Hero from './Hero'
import TrustMarquee from './TrustMarquee'
import StatsBand from './StatsBand'
import HowItFeels from './HowItFeels'
import Features from './Features'
import Testimonials from './Testimonials'
import FAQ from './FAQ'
import FinalCTA from './FinalCTA'
import LandingFooter from './LandingFooter'

export default function LandingContent() {
  return (
    <div className="telivio-landing">
      <div className="grain" />
      <LandingNav />
      <Hero />
      <TrustMarquee />
      <StatsBand />
      <HowItFeels />
      <Features />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <LandingFooter />
    </div>
  )
}
