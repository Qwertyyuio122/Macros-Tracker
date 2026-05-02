import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } },
};

export function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Hero Parallax (applied only when hero is in view/start of scroll)
  const heroOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.1], [0, -40]);

  // Sticky Showcase Animations
  const mockupScale = useTransform(scrollYProgress, [0.12, 0.22, 0.35, 0.45], [0.85, 1, 1, 0.9]);
  const mockupOpacity = useTransform(scrollYProgress, [0.12, 0.18, 0.4, 0.45], [0, 1, 1, 0]);
  const mockupRotate = useTransform(scrollYProgress, [0.15, 0.3, 0.45], [3, 0, -2]);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#06120d] text-white selection:bg-[#cdff64] selection:text-black">
      {/* GLOBAL BACKGROUND ELEMENTS */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div 
          className="absolute -left-[10%] -top-[10%] h-[800px] w-[800px] rounded-full bg-[#10b981]/10 blur-[160px]" 
          style={{ transform: "translateZ(0)", willChange: "transform" }}
        />
        <div 
          className="absolute -right-[10%] bottom-[10%] h-[700px] w-[700px] rounded-full bg-[#cdff64]/5 blur-[180px]" 
          style={{ transform: "translateZ(0)", willChange: "transform" }}
        />
      </div>

      <header className="fixed inset-x-0 top-0 z-[100] border-b border-white/5 bg-[#06120d]/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <Link to="/" className="flex items-center gap-3 transition hover:opacity-80">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#cdff64] to-[#10b981] text-lg font-black text-[#06120d] shadow-lg shadow-[#cdff64]/20">
              N
            </span>
            <span className="font-display text-2xl font-bold tracking-tight text-white">NutraFlow</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/login" className="text-sm font-semibold text-white/60 transition hover:text-white">Log in</Link>
            <Link to="/register" className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-[#06120d] transition hover:bg-[#cdff64] hover:shadow-[0_0_20px_rgba(205,255,100,0.4)]">
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* HERO SECTION - NON-STICKY */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
          <motion.div 
            style={{ opacity: heroOpacity, y: heroY, willChange: "transform, opacity" }}
            className="px-6 text-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 flex justify-center"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#cdff64] backdrop-blur-md">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#cdff64]" />
                Real-time Nutrition Intelligence
              </span>
            </motion.div>
            <h1 className="mx-auto max-w-5xl font-display text-6xl font-extrabold leading-[1.05] tracking-tight sm:text-8xl lg:text-9xl">
              Track your health, <br />
              <span className="bg-gradient-to-r from-[#cdff64] via-[#10b981] to-[#cdff64] bg-clip-text text-transparent">
                elevated.
              </span>
            </h1>
            <p className="mx-auto mt-10 max-w-2xl text-lg text-white/50 sm:text-xl">
              No more manual entry. No more guessing. Just real results powered by advanced food vision and automated macro tracking.
            </p>
            <div className="mt-12 flex flex-wrap justify-center gap-4">
              <Link to="/register" className="group flex items-center gap-3 rounded-full bg-[#cdff64] px-10 py-5 text-lg font-black text-[#06120d] transition-all hover:scale-105 hover:bg-white">
                Launch Your Journey
                <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* STICKY PRODUCT SHOWCASE AREA */}
        <section className="relative h-[150vh]">
          <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden px-6">
            <motion.div
              style={{ 
                scale: mockupScale, 
                opacity: mockupOpacity, 
                rotateX: mockupRotate,
                willChange: "transform, opacity"
              }}
              className="relative z-10 w-full max-w-6xl"
            >
              <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur-2xl sm:p-4">
                <div className="flex items-center gap-2 px-6 py-3">
                  <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                  <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                  <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
                  <div className="ml-4 h-6 w-full max-w-md rounded-md bg-white/5 px-3 text-[10px] leading-6 text-white/20">nutraflow.app/dashboard</div>
                </div>
                <img 
                  src="/assets/real_dashboard.png" 
                  alt="NutraFlow Real Dashboard" 
                  className="w-full rounded-[1.2rem] shadow-2xl"
                />
              </div>
              
              <motion.div 
                style={{ opacity: useTransform(scrollYProgress, [0.2, 0.25, 0.35, 0.4], [0, 1, 1, 0]) }}
                className="absolute -right-12 top-1/4 hidden w-72 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-2xl lg:block shadow-2xl"
              >
                <h4 className="text-sm font-bold text-[#cdff64]">Live Progress Tracking</h4>
                <p className="mt-3 text-xs leading-relaxed text-white/50">Watch your bars fill in real-time as you log. Our engine calculates everything from calories to micronutrients instantly.</p>
              </motion.div>

              <motion.div 
                style={{ opacity: useTransform(scrollYProgress, [0.25, 0.3, 0.4, 0.45], [0, 1, 1, 0]) }}
                className="absolute -left-12 bottom-1/4 hidden w-72 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-2xl lg:block shadow-2xl"
              >
                <h4 className="text-sm font-bold text-[#10b981]">Intelligent Logging</h4>
                <p className="mt-3 text-xs leading-relaxed text-white/50">Type natural language or upload photos. We extract the data so you don't have to search for ingredients.</p>
              </motion.div>
            </motion.div>

            <div className="absolute inset-0 flex items-center justify-center">
              <motion.h2 
                style={{ 
                  opacity: useTransform(scrollYProgress, [0.15, 0.25, 0.4, 0.5], [0, 0.08, 0.08, 0]),
                  scale: useTransform(scrollYProgress, [0.15, 0.5], [0.9, 1.1])
                }}
                className="pointer-events-none select-none font-display text-[15vw] font-black uppercase text-white"
              >
                Actual App
              </motion.h2>
            </div>
          </div>
        </section>

        {/* VISION SECTION */}
        <section className="relative border-t border-white/5 bg-[#06120d] py-32 lg:py-48">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="grid gap-20 lg:grid-cols-2 lg:items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <h3 className="font-display text-5xl font-bold tracking-tight text-white sm:text-7xl">
                  Advanced <br />
                  <span className="text-[#cdff64]">Food Vision.</span>
                </h3>
                <p className="mt-8 text-xl leading-relaxed text-white/60">
                  Our proprietary AI models don't just recognize food; they understand portions, density, and nutrient profiles. Simply snap a photo and let NutraFlow do the heavy lifting.
                </p>
                <div className="mt-12 grid gap-6">
                  {[
                    { t: "Multi-Item Detection", d: "Scan complex plates with multiple ingredients effortlessly." },
                    { t: "Portion Estimation", d: "High-accuracy volume analysis for precise calorie counting." }
                  ].map((item) => (
                    <div key={item.t} className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md">
                      <h5 className="font-bold text-[#cdff64]">{item.t}</h5>
                      <p className="mt-1 text-sm text-white/40">{item.d}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative overflow-hidden rounded-[3.5rem] border border-white/10 shadow-2xl"
              >
                <img src="https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=85" alt="Professional Food Photography" className="w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#06120d]/60 via-transparent to-transparent" />
                <div className="absolute bottom-10 left-10 right-10 flex items-center justify-between rounded-2xl bg-black/40 p-4 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-[#cdff64]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">AI Analysis Active</span>
                  </div>
                  <span className="text-xs font-medium text-white/60">Salmon & Avocado Bowl detected</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* LIFESTYLE & CTA SECTION */}
        <section className="relative overflow-hidden border-t border-white/5 py-32 lg:py-48">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#10b981]/5 blur-[150px]" />
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative overflow-hidden rounded-[3.5rem] shadow-2xl lg:order-2"
              >
                <img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=85" alt="Healthy Lifestyle Food" className="w-full object-cover" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="lg:order-1"
              >
                <h3 className="font-display text-5xl font-bold tracking-tight text-white sm:text-7xl">
                  Built for <br />
                  <span className="bg-gradient-to-r from-[#cdff64] to-[#10b981] bg-clip-text text-transparent">real life.</span>
                </h3>
                <p className="mt-8 text-xl leading-relaxed text-white/60">
                  NutraFlow isn't just about numbers; it's about freedom. Freedom to enjoy your meals while knowing exactly how they support your long-term health and performance.
                </p>
                
                <div className="mt-16 border-t border-white/10 pt-12">
                  <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
                    Start your transformation.
                  </h2>
                  <div className="mt-10 flex flex-wrap gap-4">
                    <Link to="/register" className="inline-flex rounded-full bg-gradient-to-r from-[#cdff64] to-[#10b981] px-12 py-5 text-lg font-black text-[#06120d] shadow-2xl shadow-[#cdff64]/20 transition-transform hover:scale-105">
                      Create Profile
                    </Link>
                    <Link to="/login" className="inline-flex rounded-full border border-white/10 bg-white/5 px-12 py-5 text-lg font-bold text-white backdrop-blur-md transition-colors hover:bg-white/10">
                      Log In
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <footer className="relative border-t border-white/5 py-12 text-center">
          <div className="mx-auto max-w-7xl px-6">
            <p className="text-sm font-medium text-white/20">© 2024 NutraFlow. Precision Nutrition for the Modern Human.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
