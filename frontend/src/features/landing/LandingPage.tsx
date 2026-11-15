'use client';

import { LandingTopNav } from './components/LandingTopNav/LandingTopNav';
import { HeroSection } from './components/Hero/HeroSection';
import { FeaturesSection } from './components/Features/FeaturesSection';
import { PostBentoHeroSection } from './components/PostBentoHero/PostBentoHeroSection';
import { FamilyPrivacySection } from './components/Family/FamilyPrivacySection';
import { FamilyFaqSection } from './components/Family/FamilyFaqSection';
import { FamilyFooter } from './components/Family/FamilyFooter';
import { FinalCtaSection } from './components/CTA/FinalCtaSection';
import { ScrollToTopButton } from './components/Overlays/ScrollToTopButton';
import { CookieConsentCard } from './components/Overlays/CookieConsentCard';
import styles from './LandingPage.module.css';

export function LandingPage() {
  return (
    <div className={styles.page}>
      <a href="#contenido" className={styles.skipLink}>
        Ir al contenido
      </a>
      <LandingTopNav />

      <main id="contenido">
        <HeroSection />
        <FeaturesSection />
        <PostBentoHeroSection />
        <FamilyPrivacySection />
        <FamilyFaqSection />
        <FinalCtaSection />
      </main>

      <FamilyFooter />

      <ScrollToTopButton />
      <CookieConsentCard />
    </div>
  );
}
