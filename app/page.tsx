'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)
  const [showJoinUs, setShowJoinUs] = useState(false)
  const slideState = useRef<Record<string, number>>({ clinic: 1, staff: 1 })
  const updateSlideshow = (id: string, index: number) => {
    slideState.current[id] = index
    const slidesEl = document.getElementById(`${id}-slides`)
    if (slidesEl) slidesEl.style.transform = `translateX(-${index * 100}%)`
    document.querySelectorAll(`#${id}-dots .slide-dot`).forEach((d, i) => {
      d.classList.toggle('active', i === index)
    })
  }

  const slideShow = (id: string, dir: number, total: number) => {
    const current = slideState.current[id]
    const next = (current + dir + total) % total
    updateSlideshow(id, next)
  }

  const goToSlide = (id: string, index: number) => {
    updateSlideshow(id, index)
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const services = [
    { icon: '🧠', name: 'Occupational Therapy', desc: 'Building independence in daily activities and sensory processing' },
    { icon: '💬', name: 'Speech Therapy', desc: 'Communication, language development, and fluency' },
    { icon: '🏃', name: 'Physical Therapy', desc: 'Motor skills, strength, and physical development' },
    { icon: '📚', name: 'Special Education Tutorials', desc: 'Individualized academic support for children with special needs' },
    { icon: '🎮', name: 'Playgroup Classes', desc: 'Social skills and peer interaction in a structured environment' },
    { icon: '🧩', name: 'Cognitive Behavioral Therapy', desc: 'Managing emotions, behavior, and thought patterns' },
    { icon: '👄', name: 'Oral Placement Therapy', desc: 'Improving oral motor function and feeding skills' },
    { icon: '🔤', name: 'AAC', desc: 'Augmentative & Alternative Communication systems' },
    { icon: '🗣️', name: 'PROMPT Therapy', desc: 'Tactile-kinesthetic approach to speech motor control' },
    { icon: '✋', name: 'Sensory Integration', desc: 'Processing and responding to sensory information' },
    { icon: '🍽️', name: 'Pediatric Dysphagia', desc: 'Feeding therapy and swallowing difficulties' },
    { icon: '🌈', name: '..and more!', desc: 'All tailored to your child’s unique developmental needs'}
  ]

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#fff', color: '#1a1a2e', minHeight: '100vh' }}>
        <style>{`
        .desktop-links { display: flex !important; }
        .hamburger-btn { display: none !important; }
        @media (max-width: 768px) {
          .desktop-links { display: none !important; }
          .hamburger-btn { display: flex !important; }
        }
      `}</style>

      {/* Navbar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 2rem',
        background: scrolled ? '#ffffff' : 'transparent',
        boxShadow: scrolled ? '0 2px 20px #00000014' : 'none',
        transition: 'all 0.3s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '70px'
      }}>
        <img src="/logo.png" alt="Potentials Therapy Center" style={{ background:'transparent', height: '44px', objectFit: 'contain' }} />
        <div className="desktop-links" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          {[
            { label: 'Home', href: '#home' },
            { label: 'Services', href: '#services' },
            { label: 'Find Us', href: '#location' },
            { label: 'Book an Appointment', href: 'https://www.facebook.com/potentialstherapycenter' },
          ].map(l => (
            <a key={l.label} href={l.href}
                target={l.href.startsWith('http') ? '_blank' : undefined}
                rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined} 
                style={{
                    fontSize: '14px',
                    color: scrolled ? '#0f4c81' : '#545454',
                    textDecoration: 'none', fontWeight: '500',
                    transition: 'opacity 0.2s'
            }}>{l.label}</a>
          ))}
          <span onClick={() => setShowJoinUs(true)} style={{
            fontSize: '14px',
            color: scrolled ? '#0f4c81' : '#545454',
            fontWeight: '500', cursor: 'pointer'
          }}>Join us</span>
          <a href="/therapist/login" style={{
            padding: '9px 20px', borderRadius: '6px',
            background: '#0f4c81', color: 'white',
            textDecoration: 'none', fontSize: '13px', fontWeight: '700'
          }}>Therapist Login</a>
          <Link href="/login" style={{
            padding: '9px 20px', borderRadius: '6px',
            background: '#fcc200', color: '#0f4c81',
            textDecoration: 'none', fontSize: '13px', fontWeight: '700'
          }}>Staff Login</Link>
        </div>
        
        {/* Hamburger Navigation */}
        <button
          className="hamburger-btn"
          onClick={() => {
            const menu = document.getElementById('public-mobile-menu')
            if (menu) menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex'
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px', flexDirection: 'column',
            gap: '5px', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <span style={{ display: 'block', width: '22px', height: '2px', background: scrolled ? '#0f4c81' : '#545454', borderRadius: '2px' }} />
          <span style={{ display: 'block', width: '22px', height: '2px', background: scrolled ? '#0f4c81' : '#545454', borderRadius: '2px' }} />
          <span style={{ display: 'block', width: '22px', height: '2px', background: scrolled ? '#0f4c81' : '#545454', borderRadius: '2px' }} />
        </button>
      </nav>

      <div id="public-mobile-menu" style={{
        display: 'none', position: 'fixed', top: '70px', left: 0, right: 0,
        background: 'white', zIndex: 99, padding: '8px 0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        flexDirection: 'column'
      }}>
        {[
          { label: 'Home', href: '#home' },
          { label: 'Services', href: '#services' },
          { label: 'Find Us', href: '#location' },
          { label: 'Book an Appointment', href: 'https://www.facebook.com/potentialstherapycenter' },
        ].map(l => (
          <a key={l.label} href={l.href}
            target={l.href.startsWith('http') ? '_blank' : undefined}
            rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            onClick={() => {
              const menu = document.getElementById('public-mobile-menu')
              if (menu) menu.style.display = 'none'
            }}
            style={{
              display: 'block', padding: '13px 24px',
              fontSize: '14px', color: '#0f4c81',
              textDecoration: 'none', fontWeight: '500',
              borderBottom: '1px solid #f0f0f0'
            }}>{l.label}</a>
        ))}  
        <span onClick={() => {
          setShowJoinUs(true)
          const menu = document.getElementById('public-mobile-menu')
          if (menu) menu.style.display = 'none'
        }} style={{
          display: 'block', padding: '13px 24px',
          fontSize: '14px', color: '#0f4c81',
          fontWeight: '500', borderBottom: '1px solid #f0f0f0',
          cursor: 'pointer'
        }}>Join us</span>     
        <div style={{ padding: '12px 24px 0' }}>
          <a href="/therapist/login" style={{
            display: 'block', padding: '10px 20px', borderRadius: '6px',
            background: '#0f4c81', color: 'white', textAlign: 'center',
            textDecoration: 'none', fontSize: '13px', fontWeight: '700'
          }}>Therapist Login</a>
        </div>
        <div style={{ padding: '12px 24px' }}>
          <Link href="/login" style={{
            display: 'block', padding: '10px 20px', borderRadius: '6px',
            background: '#fcc200', color: '#0f4c81', textAlign: 'center',
            textDecoration: 'none', fontSize: '13px', fontWeight: '700'
          }}>Staff Login</Link>
        </div>
      </div>

      {/* Hero */}
      <section id="home" style={{
        minHeight: '100vh',
        backgroundImage: 'url("/hero.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        textAlign: 'center',
        padding: '8rem 2rem 4rem',
        position: 'relative',
        overflow: 'hidden'
      }}>

        <img src="/logobig.png" alt="Potentials Therapy Center" 
            style={{ width: '300px', objectFit: 'contain', marginBottom: '1.5rem'
        }} />

        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#545454',
          fontWeight: '800', margin: '0 0 1rem', lineHeight: '1.2',
          maxWidth: '700px', fontFamily: "'Nunito', sans-serif"
        }}>Potentials Therapy Center</h1>

        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: '#545454',
          maxWidth: '560px', lineHeight: '1.7', margin: '0 0 2.5rem'
        }}>
          🔹 unlocking your child’s best 🔸
        </p>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a target="_blank" rel="noopener noreferrer" href="https://www.facebook.com/potentialstherapycenter" style={{
          padding: '14px 32px', borderRadius: '40px',
          background: '#fcc200', color: '#0f4c81',
          textDecoration: 'none', fontSize: '15px', fontWeight: '700',
          fontFamily: "'Nunito', sans-serif"
        }}>Book an Appointment</a>
        <a href="#services" style={{
          padding: '14px 32px', borderRadius: '40px',
          background: '#0f4c81', color: '#fff',
          textDecoration: 'none', fontSize: '15px', fontWeight: '600',
          fontFamily: "'Nunito', sans-serif"
        }}>Our Services</a>
        <a href="#location" style={{
          padding: '14px 32px', borderRadius: '40px',
          background: 'transparent', color: '#545454',
          textDecoration: 'none', fontSize: '15px', fontWeight: '600',
          border: '1.5px solid #545454',
          fontFamily: "'Nunito', sans-serif"
        }}>Find Us</a>
        </div>
      </section>

      {/* Intro & Pictures */}
      <section id="intro" style={{ padding: '6rem 2rem', background: '#e9ebee' }}>
        <style>{`
          .slideshow {
              position: relative;
              border-radius: 8px; /* reduced from 14px */
              overflow: hidden;
              width: 100%;
              max-height: 380px;
              aspect-ratio: 16/9;
            }
          .slides { display: flex; transition: transform 0.4s cubic-bezier(0.4,0,0.2,1); height: 100%; }
          .slide { flex-shrink: 0; width: 100%; height: 100%; }
          .slide img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 0;}
          .slide-arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,0.9); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s, transform 0.2s; z-index: 2; }
          .slide-arrow:hover { background: #fcc200; transform: translateY(-50%) scale(1.08); }
          .slide-arrow-left { left: 12px; }
          .slide-arrow-right { right: 12px; }
          .slide-dots { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 12px; }
          .slide-dot { width: 7px; height: 7px; border-radius: 50%; background: #0f4c81; opacity: 0.2; cursor: pointer; border: none; padding: 0; transition: opacity 0.2s, transform 0.2s; }
          .slide-dot.active { opacity: 1; transform: scale(1.2); }
          .ab-strip { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; scroll-snap-type: x mandatory; scrollbar-width: none; cursor: grab; }
          .ab-strip::-webkit-scrollbar { display: none; }
          .ab-photo { flex-shrink: 0; width: 260px; height: 180px; border-radius: 12px; overflow: hidden; scroll-snap-align: start; transition: width 0.4s ease; }
          @media (hover: hover) { .ab-photo:hover { width: 360px; } }
          .ab-photo img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
          @media (hover: hover) { .ab-photo:hover img { transform: scale(1.05); } }
          .team-track {
            display: flex;
            gap: 10px;
            width: max-content;
            animation: teamScroll 18s linear infinite;
          }
          .team-track:hover {
            animation-play-state: paused;
          }
          .team-photo {
            flex-shrink: 0;
            width: 280px;
            height: 200px;
            border-radius: 6px;
            overflow: hidden;
          }
          .team-photo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          @keyframes teamScroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.18em', color: '#fcc200', fontWeight: '600', marginBottom: '10px', textTransform: 'uppercase' }}>
            Who are we
          </div>
          <h2 style={{ fontFamily: "'Nunito', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: '#0f4c81', margin: '0 0 14px', fontWeight: '800' }}>
            Get to Know Us
          </h2>
          <p style={{ color: '#666', fontSize: '15px', maxWidth: '540px', margin: '0 auto', lineHeight: '1.75', fontWeight: '300' }}>
            Potentials Therapy Center is a special needs therapy center built to become partners with families that are committed to unlocking their child's best through individualized programs created, executed, and managed by our excellent roster of clinicians and teachers.
          </p>
        </div>

        {/* Our Facility — Slideshow */}
        <div style={{ maxWidth: '1100px', margin: '0 auto 2.5rem', padding: '0 1rem' }}>
        <div style={{ width: '100%' }} className="slideshow" id="clinic-show">
        <div style={{ maxWidth: '1100px', margin: '0 auto 2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'rgba(15,76,129,0.15)' }} />
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: '13px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0f4c81' }}>Our Facility</div>
            <div style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'rgba(15,76,129,0.15)' }} />
          </div>
          <div className="slideshow" id="clinic-show">
            <div className="slides" id="clinic-slides" style={{ transform: 'translateX(-100%)' }}>
              {['/clinic1.jpg', '/clinic2.jpg', '/clinic3.jpg'].map((src, i) => (
                <div key={i} className="slide"><img src={src} alt="Our Facility" /></div>
              ))}
            </div>
            <button className="slide-arrow slide-arrow-left" onClick={() => slideShow('clinic', -1, 3)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f4c81" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button className="slide-arrow slide-arrow-right" onClick={() => slideShow('clinic', 1, 3)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f4c81" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          <div className="slide-dots" id="clinic-dots">
            {[0, 1, 2].map(i => (
              <button key={i} className={`slide-dot${i === 1 ? ' active' : ''}`} onClick={() => goToSlide('clinic', i)} />
            ))}
          </div>
        </div>
        </div>
        </div>

      {/* Our Team — Auto Scroll Strip */}
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'rgba(15,76,129,0.15)' }} />
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: '13px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0f4c81' }}>Our Team</div>
          <div style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'rgba(15,76,129,0.15)' }} />
        </div>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px' }}>
          <div className="team-track">
            {/* Duplicate photos for seamless loop */}
            {['/staff1.jpg', '/staff2.jpg', '/staff3.jpg', '/staff1.jpg', '/staff2.jpg', '/staff3.jpg'].map((src, i) => (
              <div key={i} className="team-photo">
                <img src={src} alt="Our Team" />
              </div>
            ))}
          </div>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '60px', height: '100%', background: 'linear-gradient(to right, #e9ebee, transparent)', pointerEvents: 'none', zIndex: 1 }} />
          <div style={{ position: 'absolute', top: 0, right: 0, width: '60px', height: '100%', background: 'linear-gradient(to left, #e9ebee, transparent)', pointerEvents: 'none', zIndex: 1 }} />
        </div>
      </div>
      </section>

      {/* Services */}
      <section id="services" style={{ padding: '6rem 2rem', background: '#f8f9fb' }}>
        <style>{`
          .service-card {
            background: #fff;
            border-radius: 14px;
            border: 1px solid #e8edf5;
            cursor: pointer;
            overflow: hidden;
            height: 130px;
            transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease, height 0.3s ease;
          }
          @media (hover: hover) {
            .service-card:hover {
              transform: translateY(-5px);
              box-shadow: 0 16px 32px rgba(252,194,0,0.18);
              border-color: #fcc200;
              background: #fffbec;
              height: 175px;
            }
            .service-card:hover .service-card-icon { background: #fef3c7; }
            .service-card:hover .service-card-desc { opacity: 1; transform: translateY(0); }
          }
          @media (max-width: 768px) {
            .service-card { height: auto !important; }
            .service-card-desc { opacity: 1 !important; transform: none !important; }
          }
          .service-card-icon {
            width: 46px; height: 46px; border-radius: 12px;
            background: #f0f4fa; display: flex; align-items: center;
            justify-content: center; font-size: 22px; margin-bottom: 12px;
            flex-shrink: 0; transition: background 0.25s ease;
          }
          .service-card-desc {
            font-size: 13px; color: #888; line-height: 1.6; margin-top: 8px;
            opacity: 0; transform: translateY(6px);
            transition: opacity 0.25s ease 0.05s, transform 0.25s ease 0.05s;
          }
        `}</style>

        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.18em', color: '#fcc200', fontWeight: '600', marginBottom: '10px', textTransform: 'uppercase' }}>
              What We Offer
            </div>
            <h2 style={{ fontFamily: "'Nunito', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: '#0f4c81', margin: '0 0 14px', fontWeight: '800' }}>
              Our Therapy Services
            </h2>
            <p style={{ color: '#666', fontSize: '15px', maxWidth: '500px', margin: '0 auto', lineHeight: '1.75', fontWeight: '300' }}>
              Comprehensive, evidence-based therapies tailored to each child's unique needs.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {services.map((s, i) => (
              <div key={i} className="service-card">
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                  <div className="service-card-icon">{s.icon}</div>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: '14px', fontWeight: '700', color: '#0f4c81', lineHeight: '1.3' }}>
                    {s.name}
                  </div>
                  <div className="service-card-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

     {/* How to Avail Services */}
      <section id="how-to-avail" style={{ padding: '6rem 2rem', background: '#e9ebee' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div style={{ fontSize: '12px', letterSpacing: '0.15em', color: '#fcc200', fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase' }}>How to Avail Our Services</div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: '#0f4c81', margin: 0, fontWeight: '700' }}>Get Started With Us</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
            {[
              { num: '01', title: 'Get a Referral', content: 'Obtain a referral from a developmental pediatrician. Your child may be recommended for Physical Therapy, Occupational Therapy, Speech Therapy, or Playschool Services.' },
              { num: '02', title: 'Initial Contact', content: 'Call or visit Potentials Therapy Center to check service availability, enrollment steps, new client acceptance, and cost of services.' },
              { num: '03', title: 'Assessment & Evaluation', content: 'Schedule the initial assessment to determine needs and create a therapy plan. Bring relevant records and referral letters.' },
              { num: '04', title: 'Enroll in Services', content: 'Fill out registration forms with personal and medical details. Schedule therapy sessions right after registration.' },
              { num: '05', title: 'Attend Therapy Sessions', content: 'Attend sessions as recommended. Complete home exercises provided by therapists to support progress.' },
              { num: '06', title: 'Monitor Progress', content: 'Communicate regularly with your child\'s therapists about goals, progress, and any concerns.' },
            ].map((step, i) => (
              <div key={i} style={{
                background: 'white', padding: '25px', borderRadius: '14px',
                border: '2px solid #fcc200', boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
              }}>
                <h3 style={{ color: '#0f4c81', marginTop: 0 }}>{step.num} • {step.title}</h3>
                <p style={{ color: '#666', lineHeight: '1.6', margin: 0 }}>{step.content}</p>
              </div>
            ))}
          </div>
          <h3 style={{ textAlign: 'center', marginTop: '50px', color: '#0f4c81', fontWeight: '600' }}>
            Work with us to unlock the best in your child! 💙💛
          </h3>
        </div>
      </section>

      {/* Location */}
      <section id="location" style={{ padding: '6rem 2rem', background: '#fff' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', letterSpacing: '0.15em', color: '#fcc200', fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase' }}>Where To Find Us</div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: '#0f4c81', margin: '0 0 1.5rem', fontWeight: '700' }}>Visit Our Clinic</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>📍</span>
                <div>
                  <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Address</div>
                  <div style={{ color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
                    Unit 2A, #72, MIC Building, Bukidnon Street<br />
                    Brgy. Ramon Magsaysay, Bago Bantay<br />
                    Quezon City, Philippines 1105<br />
                    <span style={{ color: '#999', fontSize: '13px' }}>Near Grass Residences, SM North Edsa Annex</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>✉️</span>
                <div>
                  <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Email</div>
                  <a target="_blank" rel="noopener noreferrer" href="mailto:potentialstherapycenter@gmail.com" style={{ color: '#0f4c81', fontSize: '14px', textDecoration: 'none' }}>
                    potentialstherapycenter@gmail.com
                  </a>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>📱</span>
                <div>
                  <div style={{ fontWeight: '600', color: '#333', marginBottom: '8px' }}>Follow Us</div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <a target="_blank" rel="noopener noreferrer" href="https://www.facebook.com/potentialstherapycenter" style={{
                      padding: '8px 16px', borderRadius: '6px', background: '#1877f2', color: '#fff',
                      textDecoration: 'none', fontSize: '13px', fontWeight: '500'
                    }}>Facebook</a>
                    <a target="_blank" rel="noopener noreferrer" href="https://www.instagram.com/potentialstherapycenter/" style={{
                      padding: '8px 16px', borderRadius: '6px', background: '#e1306c', color: '#fff',
                      textDecoration: 'none', fontSize: '13px', fontWeight: '500'
                    }}>Instagram</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', height: '380px' }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3859.9362508724644!2d121.02258107404421!3d14.65955918583378!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b7d948f8a53d%3A0xbeb6658438477430!2sPotentials%20Therapy%20Center!5e0!3m2!1sfr!2sfr!4v1775319508687!5m2!1sfr!2sfr"
              width="100%" height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* Join Us Pop up */}
      {showJoinUs && (
        <div onClick={() => setShowJoinUs(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src="/joinus.jpg" alt="Join us" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '12px', display: 'block' }} />
            <button onClick={() => setShowJoinUs(false)} style={{
              position: 'absolute', top: '-12px', right: '-12px',
              background: 'white', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', cursor: 'pointer',
              fontSize: '16px', fontWeight: '700', color: '#333',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>✕</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ background: '#0f4c81', color: 'rgba(255,255,255,0.7)', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', marginBottom: '8px' }}>
          © {new Date().getFullYear()} Potentials Therapy Center · Quezon City, Philippines
        </div>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', fontSize: '13px' }}>
          <a href="/privacy" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Privacy Policy</a>
          <a target="_blank" rel="noopener noreferrer"href="mailto:potentialstherapycenter@gmail.com" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Contact</a>
          <Link href="/login" style={{ color: '#fcc200', textDecoration: 'none', fontWeight: '500' }}>Staff Login</Link>
          <Link href="/therapist/login" style={{ color: '#fcc200', textDecoration: 'none', fontWeight: '500' }}>Therapist Login</Link>
        </div>
      </footer>
    </div>
  )
}
