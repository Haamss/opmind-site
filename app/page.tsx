import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Problem } from "@/components/Problem";
import { Solution } from "@/components/Solution";
import { Features } from "@/components/Features";
import { PourQui } from "@/components/PourQui";
import { CTA } from "@/components/CTA";
import { ZoomSlider } from "@/components/ZoomSlider";
import { AnimatedBackground } from "@/components/motion/AnimatedBackground";

export default function Home() {
  return (
    <>
      <AnimatedBackground />
      <Nav />
      <main className="relative">
        <ZoomSlider>
          <Hero />
          <Problem />
          <Solution />
          <Features />
          <PourQui />
          <CTA />
        </ZoomSlider>
      </main>
    </>
  );
}
