import Nav from "./components/Nav";
import Hero from "./components/Hero";
import IntroSection from "./components/home/IntroSection";
import Newsfeed from "./components/home/Newsfeed";
import AboutCondensed from "./components/home/AboutCondensed";
import HowItWorksCondensed from "./components/home/HowItWorksCondensed";
import CategoriesShowcase from "./components/home/CategoriesShowcase";
import YouTubeSection from "./components/home/YouTubeSection";
import ContributorCTA from "./components/home/ContributorCTA";
import Newsletter from "./components/home/Newsletter";
import Footer from "./components/layout/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main-content">
        {/* Hero - Animated logo, tagline */}
        <section id="hero">
          <Hero />
        </section>
        
        {/* Mission Statement - "taking back the media" */}
        <section id="intro">
          <IntroSection />
        </section>
        
        {/* Latest Articles - Novara-style grid */}
        <section id="newsfeed">
          <Newsfeed />
        </section>
        
        {/* About - Condensed pillars */}
        <section id="about">
          <AboutCondensed />
        </section>
        
        {/* How It Works - 4 steps */}
        <section id="how-it-works">
          <HowItWorksCondensed />
        </section>
        
        {/* Categories */}
        <section id="categories">
          <CategoriesShowcase />
        </section>
        
        {/* Podcast / YouTube Content */}
        <section id="podcast">
          <YouTubeSection />
        </section>
        
        {/* Contributor CTA */}
        <section id="cta">
          <ContributorCTA />
        </section>
        
        {/* Newsletter Signup */}
        <section id="newsletter">
          <Newsletter />
        </section>
      </main>
      <Footer />
    </>
  );
}
