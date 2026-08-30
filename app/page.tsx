'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)
  const [showJoinUs, setShowJoinUs] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [mobOpen, setMobOpen] = useState(0)
  const [stackIndex, setStackIndex] = useState(0)
  const slideState = useRef<Record<string, number>>({ clinic: 1, staff: 1 })
  const FEEDBACK_IMAGES = ['/feedback1.png', '/feedback2.png', '/feedback3.png', '/feedback4.png', '/feedback5.png', '/feedback6.png', '/feedback7.png', '/feedback8.png']
  const [feedbackIndex, setFeedbackIndex] = useState(0)
  const [feedbackPerView, setFeedbackPerView] = useState(2)
  const [showLoginMenu, setShowLoginMenu] = useState(false)
  const [showParentComingSoon, setShowParentComingSoon] = useState(false)

  const SONGS = ['/song1.mp3', '/song2.mp3']
  const SONG_TITLES = ['Unlock The Best Ver. 1', 'Unlock The Best Ver. 2']
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [musicTrack, setMusicTrack] = useState(0)
  const [musicCurrentTime, setMusicCurrentTime] = useState(0)
  const [musicDuration, setMusicDuration] = useState(0)

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const renderHighlighted = (segments: { text: string; highlight?: boolean }[]) =>
    segments.map((seg, i) =>
      seg.highlight
        ? <mark key={i} style={{ background: 'linear-gradient(to right, rgba(252,194,0,0.3), rgba(252,194,0,0.1))', borderRadius: '3px', padding: '1px 3px', fontWeight: '500', color: '#333', fontStyle: 'inherit' }}>{seg.text}</mark>
        : <span key={i} style={{ whiteSpace: 'pre-line' }}>{seg.text}</span>
    )

  const [facilityIndex, setFacilityIndex] = useState(0)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [openService, setOpenService] = useState<number | null>(null)
  const [openTestimonial, setOpenTestimonial] = useState<number | null>(null)
  const [testimonialsStart, setTestimonialsStart] = useState(0)

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

  useEffect(() => {
    const script = document.createElement('script')
    script.async = true
    script.charset = 'UTF-8'
    script.src = 'https://cdn.curator.io/published/86f456eb-f528-4228-a9b3-705552a7c017.js'
    document.body.appendChild(script)
    return () => { document.body.removeChild(script) }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)')
    const applyPerView = () => { setFeedbackPerView(mq.matches ? 2 : 1); setFeedbackIndex(0) }
    applyPerView()
    mq.addEventListener('change', applyPerView)
    return () => mq.removeEventListener('change', applyPerView)
  }, [])

  const feedbackGroupCount = Math.ceil(FEEDBACK_IMAGES.length / feedbackPerView)

  useEffect(() => {
    const id = setInterval(() => setFeedbackIndex(i => (i + 1) % feedbackGroupCount), 6000)
    return () => clearInterval(id)
  }, [feedbackGroupCount])

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('reveal-visible')
          observer.unobserve(e.target)
        }
      })
    }, { threshold: 0.12 })
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const toggleMusic = () => {
    const audio = audioRef.current
    if (!audio) return
    if (musicPlaying) { audio.pause(); setMusicPlaying(false) }
    else { audio.play(); setMusicPlaying(true) }
  }

  const handleSongEnded = () => {
    if (musicTrack === 0) {
      setMusicTrack(1)
      setTimeout(() => audioRef.current?.play(), 0)
    } else {
      setMusicPlaying(false)
      setMusicTrack(0)
    }
  }

  const skipToNextSong = () => {
    if (musicTrack === 0) {
      setMusicTrack(1)
      setTimeout(() => audioRef.current?.play(), 0)
      setMusicPlaying(true)
    }
  }

  const skipToPrevSong = () => {
    if (musicTrack === 1) {
      setMusicTrack(0)
      setTimeout(() => audioRef.current?.play(), 0)
      setMusicPlaying(true)
    }
  }

  const seekMusic = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Number(e.target.value)
    setMusicCurrentTime(Number(e.target.value))
  }

  const clinicCards = [
    { photo: '/clinic-new1.jpeg', label: 'A Warm Welcome', title: "You're in good hands from day one", body: 'Our reception team is your first point of contact — ready to guide you through enrollment, scheduling, and everything in between.', tag: 'Friendly & organized' },
    { photo: '/clinic-new2.jpg', label: 'Our Facility', title: 'Spaces built for your child to thrive', body: 'From sensory swings to climbing walls and slides, our facility is purpose-built to support every type of therapeutic and developmental need.', tag: 'Purpose-built spaces' },
    { photo: '/clinic-new3.jpg', label: 'Evidence-Based Tools', title: 'The right tools for every session', body: "Hundreds of carefully selected therapy materials, games, and activities — all organized and ready to support your child's specific goals.", tag: 'Well-resourced' },
    { photo: '/clinic-new4.jpg', label: 'Individualized Care', title: 'Every child gets a program built just for them', body: 'Whether in individual or group settings, every session is guided by a plan designed specifically around your child\'s goals, strengths, and pace.', tag: 'Personalized programs' },
    { photo: '/clinic-new5.jpg', label: 'Play-Based Learning', title: 'Therapy that feels like play', body: 'We use age-appropriate toys, sensory tools, and play-based activities to make therapy engaging, motivating, and effective for every child.', tag: 'Play-based approach' },
    { photo: '/clinic-new6.jpg', label: 'Structured & Systematic', title: 'Nothing left to chance', body: 'Our therapists work from a vast, meticulously organized library of evidence-based materials — ensuring every session is targeted and intentional.', tag: 'Systematic & thorough' },
    { photo: '/clinic-new7.jpg', label: 'Family Partnership', title: "We don't just work with your child — we work with you", body: "Therapy doesn't stop at the clinic door. We partner closely with families, keeping parents informed, involved, and equipped to support their child's progress at home.", tag: 'Family-centered care' },
  ]

  const services = [
    { icon: '🧠', name: 'Occupational Therapy', what: 'Occupational Therapy helps children develop the skills they need for daily life. For kids, their "occupation" is playing, learning, and growing — and our OTs make sure nothing gets in the way of that.', who: 'Children who struggle with fine motor skills, self-care tasks, sensory sensitivities, handwriting, attention, or social participation.', expect: 'Sessions are play-based and fun. Our therapists observe how your child moves, interacts, and responds to their environment, then work on targeted skills through activities your child enjoys.' },
    { icon: '💬', name: 'Speech Therapy', what: 'Speech Therapy addresses how children talk, understand language, and communicate — covering everything from first words to fluency, articulation, and social communication.', who: 'Children with delayed speech, language difficulties, stuttering, articulation issues, or challenges with social communication and pragmatics.', expect: "Our SLPs use play, stories, and structured activities to make communication feel natural and achievable — tailored to your child's pace and goals." },
    { icon: '🏃', name: 'Physical Therapy', what: "Physical Therapy focuses on gross motor development — how your child moves their body. Our PTs work on strength, balance, coordination, and mobility.", who: 'Children with developmental delays, low muscle tone, coordination difficulties, balance issues, or those recovering from injury or surgery.', expect: 'Sessions involve movement-based activities, exercises, and play that build physical strength and confidence in a safe, supportive setting.' },
    { icon: '📚', name: 'Special Education Tutorials', what: 'One-on-one academic support designed specifically for children with learning differences, developmental delays, or special needs.', who: 'Children who need extra support in reading, writing, math, or other academic areas — especially those with learning disabilities, ADHD, autism, or developmental delays.', expect: "Our special educators assess your child's current level and design a personalized learning plan, structured and paced to your child's unique learning style." },
    { icon: '🎮', name: 'Playgroup Classes', what: 'Small-group sessions where children practice social skills in a real-world setting — with other kids their age, guided by trained therapists.', who: 'Children who struggle with social interaction, turn-taking, sharing, following group instructions, or peer engagement.', expect: 'Fun group activities that naturally build communication, cooperation, and friendship skills in a safe, supervised environment.' },
    { icon: '🧩', name: 'Cognitive Behavioral Therapy', what: 'A structured, evidence-based approach that helps children recognize how their thoughts, feelings, and behaviors are connected — and how to change unhelpful patterns.', who: 'Children dealing with anxiety, emotional dysregulation, behavioral challenges, OCD, or difficulty coping with everyday stress.', expect: 'Age-appropriate activities, storytelling, and guided conversations to help children build coping strategies they can use in real life.' },
    { icon: '👄', name: 'Oral Placement Therapy', what: 'OPT uses specific tactile and movement techniques to improve the strength, coordination, and movement of the lips, tongue, and jaw.', who: 'Children with feeding difficulties, drooling, unclear speech, or weak oral motor function — often seen in Down syndrome, cerebral palsy, or developmental delays.', expect: 'Our therapists use specialized tools and techniques to stimulate and strengthen oral muscles, supporting better feeding and clearer speech over time.' },
    { icon: '🔤', name: 'AAC', what: 'AAC encompasses all the tools and strategies that support or replace spoken language — from picture boards and sign language to high-tech speech-generating devices.', who: 'Children who are non-verbal, minimally verbal, or have significant difficulty with spoken communication due to autism, cerebral palsy, or other conditions.', expect: "Our therapists assess your child's communication needs and introduce the most appropriate AAC system, then work with your family to integrate it into everyday life." },
    { icon: '🗣️', name: 'PROMPT Therapy', what: 'PROMPT uses touch cues on the face and jaw to guide correct speech movement — helping children feel, not just hear, how sounds and words are formed.', who: "Children with motor speech disorders, childhood apraxia of speech, or those who haven't responded well to traditional speech therapy.", expect: 'Our PROMPT-trained therapists use gentle physical guidance alongside verbal and visual cues to help your child develop clearer, more consistent speech.' },
    { icon: '✋', name: 'Sensory Integration', what: 'Sensory Integration Therapy helps children who have difficulty processing sensory information — affecting behavior, attention, and daily functioning.', who: 'Children who are overly sensitive or under-responsive to touch, sound, movement, or other sensory input — often seen in autism, ADHD, and sensory processing disorder.', expect: 'Sessions take place in a sensory-rich environment with swings, trampolines, textures, and movement activities designed to help the brain process sensory input more effectively.' },
    { icon: '🍽️', name: 'Pediatric Dysphagia', what: 'Pediatric Dysphagia refers to feeding and swallowing difficulties in children. Our therapists assess and treat the underlying causes to make eating safer and more enjoyable.', who: 'Children who cough or choke during meals, refuse certain food textures, have difficulty chewing, or show signs of unsafe swallowing.', expect: 'Our therapists conduct a thorough feeding evaluation and develop a personalized plan — working closely with families to improve mealtimes at home and in therapy.' },
    { icon: '🌈', name: '..and more!', what: "Beyond our core services, we offer a range of specialized programs tailored to your child's unique developmental needs.", who: "Any child who needs support beyond what's listed — our team will assess and guide you to the right program.", expect: "Reach out to us and we'll work with you to find the best fit for your child." },
  ]

  const steps = [
    {
      title: 'Initial Contact',
      content: 'Reach out to us via Facebook, email, or phone to express your interest. Let us know a bit about your child — their age, concerns, and what type of therapy you\'re looking into. We\'ll check slot availability and walk you through the next steps. A referral from a developmental pediatrician is helpful but not always required — we can guide you on this during your inquiry.'
    },
    {
      title: 'Enroll in Services',
      content: 'Once we confirm availability, we\'ll set your child\'s schedule — including how many sessions per week works best for your family. You\'ll be informed of our clinic policies, session guidelines, and everything you need to know before your child\'s first visit.'
    },
    {
      title: 'Assessment & Evaluation',
      content: 'We\'ll conduct either an Initial Evaluation (IE) or Functional Evaluation (FE). This will help us understand your child\'s current strengths, challenges, and developmental profile — giving us the foundation to build the right program for them.'
    },
    {
      title: 'Program Planning',
      content: 'Based on the evaluation results, your child\'s therapist will design an individualized program tailored to their specific goals, pace, and learning style. We\'ll walk you through the plan and make sure you understand every part of it.'
    },
    {
      title: 'Attend Sessions',
      content: 'Your child begins therapy! Sessions are structured around their individualized plan, using play-based and evidence-based approaches. We\'ll also provide home exercises and activities so progress continues beyond the clinic.'
    },
    {
      title: 'Monitor Progress',
      content: 'We believe in keeping families in the loop. After every session, we share feedback on how your child did. We conduct regular progress reviews and adjust the program as your child grows and achieves their goals.'
    },
  ]

  const testimonials = [
    {
      photo: '/feedback1.png',
      name: 'Carer of K.',
      pull: 'What sets this center apart is their genuine compassion and empathy, fostering independence in their students.',
      full: [
        { text: 'K began speech therapy in December 2022 and has made ' },
        { text: 'significant progress.', highlight: true },
        { text: ' Now capable of expressing himself in sentences and engaging in back-and-forth communication, his progress is attributed to the dedicated efforts of the team. While refining sentence structures and adapting to verbal cues is still underway, K\'s ' },
        { text: 'remarkable development has alleviated stress for our family.', highlight: true },
        { text: ' Special appreciation goes to his Occupational therapist for her collaborative approach in addressing behavioral concerns.' },
        { text: '\n\nWhat sets this center apart is their ' },
        { text: 'genuine compassion and empathy, fostering independence in their students.', highlight: true },
      ]
    },
    {
      photo: '/feedback2.png',
      name: 'Carer of N.',
      pull: 'We\'ve seen tremendous progress — thanks to the continuity and consistency of their speech therapists.',
      full: [
        { text: 'We started with Potentials way back 2022 and ' },
        { text: 'we\'re thankful to have been with them ever since.', highlight: true },
        { text: ' We\'ve seen ' },
        { text: 'tremendous progress', highlight: true },
        { text: ' with N the past couple of years, thanks to the continuity and consistency of their speech therapists.\n\nEvery after session, we\'re given feedback about how N did as an individual and as part of the group. We also receive details of areas of opportunities and strengths as well as what we can do on our end to help him improve.\n\n' },
        { text: 'We appreciate all the guidance N has gotten from them throughout his speech journey.', highlight: true },
        { text: ' Thank you and more power to you, Potentials.' },
      ]
    },
    {
      photo: '/feedback3.png',
      name: 'Carer of S.',
      pull: 'Super daldal na nya — nakakasali na din sya ng Declamation Contest sa school. Trusted, magagaling at mababait ang lahat.',
      full: [
        { text: 'Thank you sa Potentials Therapy Center — ' },
        { text: 'malaki po ang naging improvement ni S.', highlight: true },
        { text: ' nung mag-start po sya ng Speech Therapy (dyad) last January 2023 until March 2024. ' },
        { text: 'Super daldal na nya and he can communicate na ng maayos sa mga ibang tao', highlight: true },
        { text: ' — nakakasali na din sya ng Declamation Contest sa school at very good in Reading. Kaya sobrang thankful po namin sa mga therapist ni S. na nag-guide sa amin since day 1 ng ST at hands-on sa pag-continue ng pagtuturo hanggang matapos ang ST, at sa mga naging partners ni S sa weekly session.\n\n' },
        { text: 'I highly recommend Potentials Therapy Center — trusted, magagaling at mababait ang mga teachers at staff pati mga guards.', highlight: true },
      ]
    },
    {
      photo: '/feedback4.png',
      name: 'Carer of L.',
      pull: 'The individualized approach has made a significant difference. We have seen remarkable progress in communication skills, social interactions, and overall confidence.',
      full: [
        { text: 'From the very first visit, ' },
        { text: 'we felt welcomed and supported by your team.', highlight: true },
        { text: ' The environment was warm and inviting, which helped ease our initial anxieties. It was clear that your staff is not only highly skilled but also genuinely compassionate and dedicated to the well-being of each child.\n\nThe ' },
        { text: 'individualized approach to therapy has made a significant difference', highlight: true },
        { text: ' in our child\'s development. The tailored activities and interventions have not only fostered our child\'s growth but have also empowered us as parents with strategies to support their development at home.\n\nWe have seen ' },
        { text: 'remarkable progress in communication skills, social interactions, and overall confidence.', highlight: true },
        { text: ' The structured yet flexible approach has allowed our child to thrive in a safe and nurturing environment.\n\nThe support groups and workshops for parents have been invaluable. ' },
        { text: 'Connecting with other families has provided us with a sense of community and reassurance.', highlight: true },
        { text: ' Overall, our experience has been overwhelmingly positive. Thank you for all that you do to support children with GDD and their families.' },
      ]
    },
    {
      photo: '/feedback5.png',
      name: 'Carer of E.',
      pull: 'The practitioners are very passionate and patient. E did improve — he\'s like another kid.',
      full: [
        { text: 'After E was assessed with his development pediatrician on his autism condition, I immediately scouted some clinics which can cater both occupational and speech therapies. At first, adjusting was challenging since E is very shy and easily have tantrums.\n\nBut ' },
        { text: 'the clinic\'s OT/ST interns and licensed practitioners are very passionate and patient', highlight: true },
        { text: ' in handling my son and other children with special needs. We have been with Potentials since Nov 2022 and we can say, ' },
        { text: 'E did improve — he\'s like another kid.', highlight: true },
        { text: ' He knows some gestures, follows simple orders/instructions, and imitates what he sees/hears. Though his speech hasn\'t recovered, ' },
        { text: 'we know we\'ll get there', highlight: true },
        { text: ' with the help of our family, supporting loved ones, and the endless dedication of Potentials clinic.' },
      ]
    },
    {
      photo: '/feedback6.png',
      name: 'Carer of A.',
      pull: 'Sobrang happy namin — napakalaki ng improvement ng aming anak. Every session is another learning and development.',
      full: [
        { text: 'Year 2022 nagstart si A magtherapy. ' },
        { text: 'Sobrang happy namin dahil napakalaki ng improvement ng aming anak', highlight: true },
        { text: ' simula nung pinasok namin sa Potentials Therapy. Every session is another learning and development para sa aming anak.\n\nBefore kasi pagnatatalo sa games na activity niya sobrang iyak niya pero ngayon ' },
        { text: 'hindi na umiiyak — marunong na siyang magcalm down ng kanyang sarili.', highlight: true },
        { text: ' And dati hirap siya makipagcommunicate at makipagconversation sa amin, ' },
        { text: 'but now sobrang daldal na.', highlight: true },
        { text: '\n\nSa lahat ng naging teachers niya — maraming salamat. Malaki ang naging improvement ng aming anak. Hoping for continued improvement. Thank you Potentials Therapy Center and God bless!!! 😊' },
      ]
    },
    {
      photo: '/feedback7.png',
      name: 'Carer of T.',
      pull: 'Marami na improvement nakita for 2 weeks — natuto humawak ng pencil, knows how to write ng name, more patient na siya.',
      full: [
        { text: 'Ng start po c T mg therapy sa Potentials Therapy Feb 29 po, under internship program — ' },
        { text: 'marami na improvement nakita for 2 weeks.', highlight: true },
        { text: ' Natuto humawak ng pencil — dati po kasi hirap siya mag-grip. ' },
        { text: 'Nakaka-wait na rin siya, marami na ring improve up to now.', highlight: true },
        { text: ' Ng improve na rin writing nya. Knows how to write ng name with guidance, kaya na nga spell name nya, knows to write numbers, shape. Kaya na rin niya mag-save ng basic need nya.\n\n' },
        { text: 'More patient na siya unlike before — dati marami tantrums, now nawala na.', highlight: true },
        { text: '\n\nSa speech po kailangan pa niya more focus. Paunti-unti kahit papano, ' },
        { text: 'my progress.', highlight: true },
        { text: ' I\'m looking forward sa speech nya.' },
      ]
    },
    {
      photo: '/feedback8.png',
      name: 'Carer of T.',
      pull: 'Now, the difference is like night & day. She\'s more patient and can handle waiting without getting upset.',
      full: [
        { text: 'When we first brought T to the center, we weren\'t sure what to expect. But from the very beginning, ' },
        { text: 'we started to see real changes in her behavior and communication.', highlight: true },
        { text: ' Before therapy, she had a tough time in school — teachers often mentioned her difficulty in sitting still and expressing herself. It was challenging for all of us.\n\n' },
        { text: 'Now, the difference is like night & day.', highlight: true },
        { text: ' T can sit through longer activities, and while her speech isn\'t perfect yet, she\'s much better at expressing her thoughts. Those first few weeks were really tough — she was always restless and easily bored. But now, ' },
        { text: 'she\'s more patient and can handle waiting without getting upset.', highlight: true },
      ]
    },
  ]

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#fff', color: '#1a1a2e', minHeight: '100vh' }}>
      <style>{`
        .desktop-links { display: flex !important; }
        .hamburger-btn { display: none !important; }

        /* Scroll reveal */
        .reveal {
          opacity: 0;
          transform: translateY(36px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .reveal.reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .reveal.d1 { transition-delay: 0.1s; }
        .reveal.d2 { transition-delay: 0.2s; }
        .reveal.d3 { transition-delay: 0.3s; }
        .reveal.d4 { transition-delay: 0.4s; }
        .reveal.d5 { transition-delay: 0.5s; }
        .reveal.d6 { transition-delay: 0.6s; }
        .reveal.d7 { transition-delay: 0.7s; }
        .reveal.d8 { transition-delay: 0.8s; }
        .reveal.d9 { transition-delay: 0.9s; }
        .reveal.d10 { transition-delay: 1.0s; }
        .reveal.d11 { transition-delay: 1.1s; }
        .reveal.d12 { transition-delay: 1.2s; }

        @media (max-width: 768px) {
          .desktop-links { display: none !important; }
          .hamburger-btn { display: flex !important; }
          #location > div { grid-template-columns: 1fr !important; gap: 2rem !important; }
          .stack-layout { flex-direction: column !important; align-items: center !important; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroZoomOut {
          from { transform: scale(1.08); }
          to   { transform: scale(1); }
        }
        .hero-logo    { animation: fadeUp 0.9s ease 0.2s both; }
        .hero-title   { animation: fadeUp 0.9s ease 0.5s both; }
        .hero-tagline { animation: fadeUp 0.9s ease 0.75s both; }
        .hero-buttons { animation: fadeUp 0.9s ease 1s both; }
        .hero-bg-zoom { animation: heroZoomOut 2.5s ease-out both; }

        .team-track { display: flex; gap: 10px; width: max-content; animation: teamScroll 18s linear infinite; }
        .team-track:hover { animation-play-state: paused; }
        .team-photo { flex-shrink: 0; width: 280px; height: 200px; overflow: hidden; }
        .team-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
        @keyframes teamScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .stack-card-item {
          position: absolute; width: 100%; height: 100%;
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          transition: transform 0.5s cubic-bezier(0.34,1.1,0.64,1), opacity 0.4s ease, box-shadow 0.3s ease;
          cursor: zoom-in;
        }
        .stack-card-item .zoom-hint {
          position: absolute; bottom: 12px; right: 12px;
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(255,255,255,0.9);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transform: scale(0.8);
          transition: opacity 0.25s ease, transform 0.25s ease;
          pointer-events: none; font-size: 16px;
        }
        .stack-card-item:hover .zoom-hint { opacity: 1; transform: scale(1); }
        .stack-card-item img { width: 100%; height: 100%; object-fit: cover; display: block; }

        .services-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .service-card { background: #fff; border-radius: 14px; border: 1px solid #e8edf5; cursor: pointer; overflow: hidden; transition: border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease; }
        .service-card.open { border-color: #fcc200; background: #fffbec; box-shadow: 0 8px 24px rgba(252,194,0,0.15); grid-column: span 3; }
        .service-card-top { display: flex; align-items: center; gap: 12px; padding: 1.1rem 1.25rem; }
        .service-card-icon { width: 46px; height: 46px; border-radius: 12px; background: #f0f4fa; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; transition: background 0.25s; }
        .service-card.open .service-card-icon { background: #fef3c7; }
        .service-card-name { font-family: 'Nunito', sans-serif; font-size: 16px; font-weight: 700; color: #0f4c81; flex: 1; line-height: 1.3; }
        .service-card-chevron { font-size: 11px; color: #ccc; transition: transform 0.25s, color 0.25s; flex-shrink: 0; }
        .service-card.open .service-card-chevron { transform: rotate(180deg); color: #fcc200; }
        .service-card-body { max-height: 0; overflow: hidden; transition: max-height 0.4s ease; }
        .service-card.open .service-card-body { max-height: 600px; }
        .service-card-body-inner { padding: 1rem 1.25rem 1.25rem; border-top: 1px solid rgba(252,194,0,0.2); display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.25rem; }
        .service-body-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #fcc200; font-weight: 700; margin-bottom: 6px; font-family: 'Nunito', sans-serif; }
        .service-body-text { font-size: 13px; color: #777; line-height: 1.7; }

        .stepper-row { display: flex; align-items: flex-start; }
        .step { flex: 1; display: flex; flex-direction: column; align-items: center; cursor: pointer; }
        .step-top { display: flex; align-items: center; width: 100%; }
        .step-circle { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #e8edf5; background: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 800; color: #ccc; flex-shrink: 0; transition: all 0.25s; z-index: 1; }
        .step.active .step-circle { background: #0f4c81; border-color: #0f4c81; color: #fff; transform: scale(1.1); }
        .step.done .step-circle { background: #fcc200; border-color: #fcc200; color: #0f4c81; }
        .step-line { flex: 1; height: 2px; background: #e0e0e0; transition: background 0.25s; }
        .step-line.done { background: #fcc200; }
        .step-label { font-size: 11px; color: #aaa; margin-top: 8px; text-align: center; max-width: 90px; line-height: 1.4; font-weight: 500; }
        .step.active .step-label { color: #0f4c81; font-weight: 700; }
        .step.done .step-label { color: #b89a00; }
        .step-content-box { background: #fff; border-radius: 14px; border: 2px solid #0f4c81; padding: 1.5rem; margin-top: 1.5rem; }
        .step-nav-btn { padding: 9px 22px; border-radius: 40px; font-size: 13px; font-weight: 700; font-family: 'Nunito', sans-serif; cursor: pointer; border: none; transition: all 0.2s; }
        .step-nav-btn:hover { opacity: 0.85; }
        .mob-item { background: #fff; border-radius: 12px; border: 1px solid #e8edf5; margin-bottom: 8px; overflow: hidden; transition: border-color 0.2s; }
        .mob-item.active { border-color: #0f4c81; }
        .mob-header { display: flex; align-items: center; gap: 12px; padding: 14px 16px; cursor: pointer; }
        .mob-num { width: 34px; height: 34px; border-radius: 50%; background: #f0f4fa; display: flex; align-items: center; justify-content: center; font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 800; color: #0f4c81; flex-shrink: 0; transition: all 0.2s; }
        .mob-item.active .mob-num { background: #0f4c81; color: #fff; }
        .mob-title { font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 700; color: #0f4c81; flex: 1; }
        .mob-chevron { font-size: 11px; color: #ccc; transition: transform 0.2s; }
        .mob-item.active .mob-chevron { transform: rotate(180deg); color: #0f4c81; }
        .mob-body { max-height: 0; overflow: hidden; transition: max-height 0.35s ease; }
        .mob-item.active .mob-body { max-height: 150px; }
        .mob-body-inner { padding: 0 16px 14px 62px; font-size: 13px; color: #888; line-height: 1.65; }

        @media (max-width: 768px) {
          .services-grid { grid-template-columns: 1fr; }
          .service-card.open { grid-column: span 1; }
          .service-card-body-inner { grid-template-columns: 1fr; gap: 1rem; }
          .stepper-desktop { display: none !important; }
          .stepper-mobile { display: block !important; }
        }
        @media (min-width: 769px) {
          .stepper-desktop { display: block !important; }
          .stepper-mobile { display: none !important; }
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
        <img src="/logo.png" alt="Potentials Therapy Center" style={{ background: 'transparent', height: '44px', objectFit: 'contain' }} />
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
              style={{ fontSize: '14px', color: scrolled ? '#0f4c81' : '#545454', textDecoration: 'none', fontWeight: '500', transition: 'opacity 0.2s' }}>{l.label}</a>
          ))}
          <span onClick={() => setShowJoinUs(true)} style={{ fontSize: '14px', color: scrolled ? '#0f4c81' : '#545454', fontWeight: '500', cursor: 'pointer' }}>Join us</span>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowLoginMenu(!showLoginMenu)} style={{ padding: '9px 20px', borderRadius: '6px', background: '#fcc200', color: '#0f4c81', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Login ▾
            </button>
            {showLoginMenu && (
              <>
                <div onClick={() => setShowLoginMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 149 }} />
                <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, background: 'white', borderRadius: '10px', boxShadow: '0 12px 32px rgba(15,76,129,0.18)', border: '1px solid #eee', width: '180px', overflow: 'hidden', zIndex: 150 }}>
                  <div onClick={() => { setShowLoginMenu(false); setShowParentComingSoon(true) }} style={{ padding: '13px 18px', cursor: 'pointer', fontFamily: "'Nunito', sans-serif", fontWeight: '700', fontSize: '13px', color: '#0f4c81', borderBottom: '1px solid #f5f5f5' }}>Parent Login</div>
                  <a href="/therapist/login" style={{ display: 'block', padding: '13px 18px', cursor: 'pointer', fontFamily: "'Nunito', sans-serif", fontWeight: '700', fontSize: '13px', color: '#0f4c81', borderBottom: '1px solid #f5f5f5', textDecoration: 'none' }}>Therapist Login</a>
                  <Link href="/login" style={{ display: 'block', padding: '13px 18px', cursor: 'pointer', fontFamily: "'Nunito', sans-serif", fontWeight: '700', fontSize: '13px', color: '#0f4c81', textDecoration: 'none' }}>Staff Login</Link>
                </div>
              </>
            )}
          </div>
        </div>
        <button className="hamburger-btn" onClick={() => {
          const menu = document.getElementById('public-mobile-menu')
          if (menu) menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex'
        }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', flexDirection: 'column', gap: '5px', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ display: 'block', width: '22px', height: '2px', background: scrolled ? '#0f4c81' : '#545454', borderRadius: '2px' }} />
          <span style={{ display: 'block', width: '22px', height: '2px', background: scrolled ? '#0f4c81' : '#545454', borderRadius: '2px' }} />
          <span style={{ display: 'block', width: '22px', height: '2px', background: scrolled ? '#0f4c81' : '#545454', borderRadius: '2px' }} />
        </button>
      </nav>

      {/* Mobile Menu */}
      <div id="public-mobile-menu" style={{ display: 'none', position: 'fixed', top: '70px', left: 0, right: 0, background: 'white', zIndex: 99, padding: '8px 0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', flexDirection: 'column' }}>
        {[
          { label: 'Home', href: '#home' },
          { label: 'Services', href: '#services' },
          { label: 'Find Us', href: '#location' },
          { label: 'Book an Appointment', href: 'https://www.facebook.com/potentialstherapycenter' },
        ].map(l => (
          <a key={l.label} href={l.href}
            target={l.href.startsWith('http') ? '_blank' : undefined}
            rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            onClick={() => { const menu = document.getElementById('public-mobile-menu'); if (menu) menu.style.display = 'none' }}
            style={{ display: 'block', padding: '13px 24px', fontSize: '14px', color: '#0f4c81', textDecoration: 'none', fontWeight: '500', borderBottom: '1px solid #f0f0f0' }}>{l.label}</a>
        ))}
        <span onClick={() => { setShowJoinUs(true); const menu = document.getElementById('public-mobile-menu'); if (menu) menu.style.display = 'none' }}
          style={{ display: 'block', padding: '13px 24px', fontSize: '14px', color: '#0f4c81', fontWeight: '500', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}>Join us</span>
        <div onClick={() => { const menu = document.getElementById('public-mobile-menu'); if (menu) menu.style.display = 'none'; setShowParentComingSoon(true) }}
          style={{ display: 'block', padding: '13px 24px', fontSize: '14px', color: '#0f4c81', fontWeight: '700', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}>Parent Login</div>
        <a href="/therapist/login" style={{ display: 'block', padding: '13px 24px', fontSize: '14px', color: '#0f4c81', fontWeight: '700', borderBottom: '1px solid #f0f0f0', textDecoration: 'none' }}>Therapist Login</a>
        <Link href="/login" style={{ display: 'block', padding: '13px 24px', fontSize: '14px', color: '#0f4c81', fontWeight: '700', textDecoration: 'none' }}>Staff Login</Link>
      </div>

      {/* Hero */}
      <section id="home" className="hero-bg-zoom" style={{
        minHeight: '100vh', backgroundImage: 'url("/hero.png")', backgroundSize: 'cover',
        backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
        textAlign: 'center', padding: '8rem 2rem 4rem', position: 'relative', overflow: 'hidden'
      }}>
        <img src="/logobig.png" alt="Potentials Therapy Center" className="hero-logo" style={{ width: '300px', objectFit: 'contain', marginBottom: '1.5rem' }} />
        <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#545454', fontWeight: '800', margin: '0 0 1rem', lineHeight: '1.2', maxWidth: '700px', fontFamily: "'Nunito', sans-serif" }}>Potentials Therapy Center</h1>
        <p className="hero-tagline" style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: '#545454', maxWidth: '560px', lineHeight: '1.7', margin: '0 0 2.5rem' }}>
          🔹 unlocking your child's best 🔸
        </p>
        <div className="hero-buttons" style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a target="_blank" rel="noopener noreferrer" href="https://www.facebook.com/potentialstherapycenter" style={{ padding: '14px 32px', borderRadius: '40px', background: '#fcc200', color: '#0f4c81', textDecoration: 'none', fontSize: '15px', fontWeight: '700', fontFamily: "'Nunito', sans-serif" }}>Book an Appointment</a>
          <a href="#services" style={{ padding: '14px 32px', borderRadius: '40px', background: '#0f4c81', color: '#fff', textDecoration: 'none', fontSize: '15px', fontWeight: '600', fontFamily: "'Nunito', sans-serif" }}>Our Services</a>
          <a href="#location" style={{ padding: '14px 32px', borderRadius: '40px', background: 'transparent', color: '#545454', textDecoration: 'none', fontSize: '15px', fontWeight: '600', border: '1.5px solid #545454', fontFamily: "'Nunito', sans-serif" }}>Find Us</a>
        </div>
      </section>

      {/* ── INTRO ── yellow top-left, navy bottom-right */}
      <section id="intro" style={{ padding: '6rem 2rem', background: '#e9ebee', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: '400px', height: '400px', background: 'rgba(252,194,0,0.1)', borderRadius: '60% 40% 70% 30%', top: '-120px', left: '-120px', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: '300px', height: '300px', background: 'rgba(15,76,129,0.07)', borderRadius: '40% 60% 30% 70%', bottom: '-80px', right: '-80px', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: '200px', height: '200px', background: 'rgba(252,194,0,0.08)', borderRadius: '50%', top: '80px', right: '120px', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: '160px', height: '160px', background: 'rgba(15,76,129,0.05)', borderRadius: '60% 40% 50% 60%', bottom: '100px', left: '80px', pointerEvents: 'none', zIndex: 0 }} />

        {/* Header */}
        <div className="reveal" style={{ textAlign: 'center', marginBottom: '3rem', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.18em', color: '#fcc200', fontWeight: '600', marginBottom: '10px', textTransform: 'uppercase' }}>Who are we</div>
          <h2 style={{ fontFamily: "'Nunito', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: '#0f4c81', margin: '0 0 14px', fontWeight: '800' }}>Get to Know Us</h2>
          <p style={{ color: '#666', fontSize: '15px', maxWidth: '540px', margin: '0 auto', lineHeight: '1.75', fontWeight: '300' }}>
            Potentials Therapy Center is a special needs therapy center built to become partners with families that are committed to unlocking their child's best through individualized programs created, executed, and managed by our excellent roster of clinicians and teachers.
          </p>
        </div>

        {/* Card Stack + Description */}
        <div className="reveal d2 stack-layout" style={{ maxWidth: '780px', margin: '0 auto 5rem', display: 'flex', gap: '3rem', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          {/* Left — Stack */}
          <div style={{ position: 'relative', height: '480px', width: '360px', flexShrink: 0 }}>
            {clinicCards.map((card, i) => {
              const total = clinicCards.length
              const offset = (i - stackIndex + total) % total
              const isTop = offset === 0
              const is2nd = offset === 1
              const is3rd = offset === 2
              const cardStyle: React.CSSProperties = {
                zIndex: isTop ? 10 : is2nd ? 9 : is3rd ? 8 : 7,
                transform: isTop ? 'rotate(0deg) translateY(0px) scale(1)' : is2nd ? 'rotate(-4deg) translateY(10px) scale(0.97)' : is3rd ? 'rotate(3deg) translateY(18px) scale(0.94)' : 'rotate(-2deg) translateY(24px) scale(0.91)',
                opacity: isTop ? 1 : is2nd ? 0.85 : is3rd ? 0.6 : 0.3,
                boxShadow: isTop ? '0 12px 36px rgba(0,0,0,0.18)' : '0 4px 12px rgba(0,0,0,0.08)',
              }
              return (
                <div key={i} className="stack-card-item" style={cardStyle}
                  onClick={() => { if (isTop) setLightbox(card.photo); else setStackIndex(i) }}>
                  <img src={card.photo} alt={card.label} />
                  {isTop && <div className="zoom-hint">🔍</div>}
                </div>
              )
            })}
            <button onClick={() => setStackIndex((stackIndex + 1) % clinicCards.length)}
              style={{ position: 'absolute', bottom: '-48px', left: '50%', transform: 'translateX(-50%)', padding: '9px 24px', borderRadius: '40px', background: '#0f4c81', color: '#fff', border: 'none', fontFamily: "'Nunito', sans-serif", fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fcc200')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0f4c81')}>
              Next ›
            </button>
          </div>

          {/* Right — Description */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: '11px', fontWeight: '800', color: '#fcc200', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>{clinicCards[stackIndex].label}</div>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: '22px', fontWeight: '800', color: '#0f4c81', marginBottom: '12px', lineHeight: '1.25' }}>{clinicCards[stackIndex].title}</div>
            <div style={{ fontSize: '14px', color: '#777', lineHeight: '1.75', fontWeight: '300' }}>{clinicCards[stackIndex].body}</div>
            <div style={{ display: 'inline-block', marginTop: '16px', padding: '5px 16px', borderRadius: '40px', background: '#fef3c7', color: '#0f4c81', fontSize: '12px', fontWeight: '700', fontFamily: "'Nunito', sans-serif" }}>{clinicCards[stackIndex].tag}</div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '1.5rem' }}>
              {clinicCards.map((_, i) => (
                <button key={i} onClick={() => setStackIndex(i)} style={{ width: i === stackIndex ? '20px' : '7px', height: '7px', borderRadius: '4px', border: 'none', background: i === stackIndex ? '#fcc200' : '#0f4c81', opacity: i === stackIndex ? 1 : 0.2, cursor: 'pointer', transition: 'all 0.2s', padding: 0 }} />
              ))}
            </div>
          </div>
        </div>

        {/* Lightbox */}
        {lightbox && (
          <div onClick={() => setLightbox(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
            <img src={lightbox} alt="Facility" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
          </div>
        )}

        {/* Our Team */}
        <div className="reveal d3" style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'rgba(15,76,129,0.15)' }} />
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: '13px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0f4c81' }}>Our Team</div>
            <div style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'rgba(15,76,129,0.15)' }} />
          </div>
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <div className="team-track">
              {['/staff1.jpg', '/staff2.jpg', '/staff3.jpg', '/staff1.jpg', '/staff2.jpg', '/staff3.jpg'].map((src, i) => (
                <div key={i} className="team-photo"><img src={src} alt="Our Team" /></div>
              ))}
            </div>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '60px', height: '100%', background: 'linear-gradient(to right, #e9ebee, transparent)', pointerEvents: 'none', zIndex: 1 }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: '60px', height: '100%', background: 'linear-gradient(to left, #e9ebee, transparent)', pointerEvents: 'none', zIndex: 1 }} />
          </div>
        </div>

        {/* Follow Us / Curator */}
        <div className="reveal d4" style={{ maxWidth: '1100px', margin: '2.5rem auto 0', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'rgba(15,76,129,0.15)' }} />
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: '13px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0f4c81' }}>Follow Us</div>
            <div style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'rgba(15,76,129,0.15)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', width: '100%' }}>
            <div id="curator-feed-default-feed-layout" style={{ width: '100%' }}>
              <a href="https://curator.io" target="_blank" className="crt-logo crt-tag" style={{ fontSize: '8px', opacity: 0.5 }}>Powered by Curator.io</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── navy top-right, yellow bottom-left */}
      <section id="services" style={{ padding: '6rem 2rem', background: '#f8f9fb', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: '360px', height: '360px', background: 'rgba(15,76,129,0.06)', borderRadius: '30% 70% 50% 50%', top: '-100px', right: '-100px', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: '260px', height: '260px', background: 'rgba(15,76,129,0.04)', borderRadius: '60% 40% 30% 70%', top: '40%', right: '-60px', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: '220px', height: '220px', background: 'rgba(252,194,0,0.08)', borderRadius: '50% 50% 40% 60%', bottom: '-60px', left: '-60px', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: '140px', height: '140px', background: 'rgba(252,194,0,0.06)', borderRadius: '40% 60% 70% 30%', bottom: '30%', left: '40px', pointerEvents: 'none', zIndex: 0 }} />

        <style>{`
            .services-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 14px;
            }
            .service-card {
              background: #fff;
              border-radius: 14px;
              border: 1px solid #e8edf5;
              cursor: pointer;
              overflow: hidden;
              transition: border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
            }
            .service-card.open {
              border-color: #fcc200;
              background: #fffbec;
              box-shadow: 0 8px 24px rgba(252,194,0,0.15);
              grid-column: span 3;
            }
            .service-card-top {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 1.1rem 1.25rem;
            }
            .service-card-icon {
              width: 46px; height: 46px; border-radius: 12px;
              background: #f0f4fa; display: flex;
              align-items: center; justify-content: center;
              font-size: 22px; flex-shrink: 0;
              transition: background 0.25s;
            }
            .service-card.open .service-card-icon { background: #fef3c7; }
            .service-card-name {
              font-family: 'Nunito', sans-serif;
              font-size: 16px; font-weight: 700;
              color: #0f4c81; flex: 1; line-height: 1.3;
            }
            .service-card-chevron {
              font-size: 11px; color: #ccc;
              transition: transform 0.25s, color 0.25s;
              flex-shrink: 0;
            }
            .service-card.open .service-card-chevron { transform: rotate(180deg); color: #fcc200; }
            .service-card-body { max-height: 0; overflow: hidden; transition: max-height 0.4s ease; }
            .service-card.open .service-card-body { max-height: 600px; }
            .service-card-body-inner {
              padding: 1rem 1.25rem 1.25rem;
              border-top: 1px solid rgba(252,194,0,0.2);
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 1.25rem;
            }
            .service-body-label {
              font-size: 10px; letter-spacing: 0.12em;
              text-transform: uppercase; color: #fcc200;
              font-weight: 700; margin-bottom: 6px;
              font-family: 'Nunito', sans-serif;
            }
            .service-body-text { font-size: 13px; color: #777; line-height: 1.7; }
            @media (max-width: 768px) {
              .services-grid { grid-template-columns: 1fr; }
              .service-card.open { grid-column: span 1; }
              .service-card-body-inner { grid-template-columns: 1fr; gap: 1rem; }
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

            <div className="services-grid">
              {services.map((s, i) => (
                <div
                  key={i}
                  className={`service-card${openService === i ? ' open' : ''}`}
                  onClick={() => setOpenService(openService === i ? null : i)}
                >
                  <div className="service-card-top">
                    <div className="service-card-icon">{s.icon}</div>
                    <div className="service-card-name">{s.name}</div>
                    <div className="service-card-chevron">▼</div>
                  </div>
                  <div className="service-card-body">
                    <div className="service-card-body-inner">
                      <div>
                        <div className="service-body-label">What is it?</div>
                        <div className="service-body-text">{s.what}</div>
                      </div>
                      <div>
                        <div className="service-body-label">Who is it for?</div>
                        <div className="service-body-text">{s.who}</div>
                      </div>
                      <div>
                        <div className="service-body-label">What to expect?</div>
                        <div className="service-body-text">{s.expect}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      {/* ── HOW TO AVAIL ── yellow-heavy: large yellow bottom-right, small navy top-left */}
      <section id="how-to-avail" style={{ padding: '6rem 2rem', background: '#e9ebee', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: '180px', height: '180px', background: 'rgba(15,76,129,0.06)', borderRadius: '50% 50% 60% 40%', top: '-60px', left: '-60px', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: '120px', height: '120px', background: 'rgba(15,76,129,0.04)', borderRadius: '40% 60% 50% 50%', top: '30%', left: '20px', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: '380px', height: '380px', background: 'rgba(252,194,0,0.1)', borderRadius: '40% 60% 30% 70%', bottom: '-100px', right: '-100px', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: '200px', height: '200px', background: 'rgba(252,194,0,0.07)', borderRadius: '60% 40% 70% 30%', bottom: '20%', right: '60px', pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.18em', color: '#fcc200', fontWeight: '600', marginBottom: '10px', textTransform: 'uppercase' }}>How to Avail Our Services</div>
            <h2 style={{ fontFamily: "'Nunito', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: '#0f4c81', margin: 0, fontWeight: '800' }}>Get Started With Us</h2>
          </div>

          {/* Desktop Stepper */}
          <div className="stepper-desktop">
            <div className="reveal d2 stepper-row">
              {steps.map((s, i) => (
                <div key={i} className={`step${i < stepIndex ? ' done' : i === stepIndex ? ' active' : ''}`} onClick={() => setStepIndex(i)}>
                  <div className="step-top">
                    <div className="step-circle">{i + 1}</div>
                    {i < steps.length - 1 && <div className={`step-line${i < stepIndex ? ' done' : ''}`} />}
                  </div>
                  <div className="step-label">{s.title}</div>
                </div>
              ))}
            </div>
            <div className="reveal d3 step-content-box">
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: '11px', fontWeight: '800', color: '#fcc200', letterSpacing: '0.1em', marginBottom: '6px' }}>STEP 0{stepIndex + 1}</div>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: '20px', fontWeight: '800', color: '#0f4c81', marginBottom: '8px' }}>{steps[stepIndex].title}</div>
              <div style={{ fontSize: '14px', color: '#777', lineHeight: '1.7' }}>{steps[stepIndex].content}</div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '1.25rem' }}>
                {stepIndex > 0 && <button className="step-nav-btn" style={{ background: '#f0f4fa', color: '#0f4c81' }} onClick={() => setStepIndex(stepIndex - 1)}>← Back</button>}
                {stepIndex < steps.length - 1 && <button className="step-nav-btn" style={{ background: '#0f4c81', color: '#fff' }} onClick={() => setStepIndex(stepIndex + 1)}>Next →</button>}
              </div>
            </div>
          </div>

          {/* Mobile Accordion */}
          <div className="stepper-mobile">
            {steps.map((s, i) => (
              <div key={i} className={`mob-item${mobOpen === i ? ' active' : ''}`} onClick={() => setMobOpen(mobOpen === i ? -1 : i)}>
                <div className="mob-header">
                  <div className="mob-num">{i + 1}</div>
                  <div className="mob-title">{s.title}</div>
                  <div className="mob-chevron">▼</div>
                </div>
                <div className="mob-body"><div className="mob-body-inner">{s.content}</div></div>
              </div>
            ))}
          </div>

          <div className="reveal d4" style={{ textAlign: 'center', marginTop: '3rem' }}>
            <h3 style={{ color: '#0f4c81', fontWeight: '700', fontFamily: "'Nunito', sans-serif" }}>
              Work with us to unlock the best in your child! 💙💛
            </h3>
          </div>
        </div>
      </section>

      {/* ── REACHING POTENTIALS ── */}
      <section id="reaching-potentials" style={{ padding: '6rem 2rem', background: '#f8f9fb', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: '340px', height: '340px', background: 'rgba(15,76,129,0.06)', borderRadius: '50% 40% 60% 40%', top: '-80px', left: '-80px', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: '200px', height: '200px', background: 'rgba(15,76,129,0.04)', borderRadius: '40% 60% 50% 50%', top: '20%', left: '20px', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: '180px', height: '180px', background: 'rgba(252,194,0,0.08)', borderRadius: '50%', top: '-40px', right: '80px', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: '260px', height: '260px', background: 'rgba(15,76,129,0.05)', borderRadius: '60% 40% 30% 70%', bottom: '-60px', right: '-60px', pointerEvents: 'none', zIndex: 0 }} />

        <style>{`
          .t-card { background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #e8edf5; box-shadow: 0 2px 12px rgba(15,76,129,0.06); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; display: flex; flex-direction: column; }
          .t-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(15,76,129,0.12); border-color: #fcc200; }
          .t-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1rem; }
          .t-modal { background: #fff; border-radius: 20px; max-width: 580px; width: 100%; max-height: 88vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.2); position: relative; }
          .t-modal-photo { height: 220px; overflow: hidden; flex-shrink: 0; }
          .t-modal-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .t-modal-body { padding: 1.75rem; overflow-y: auto; flex: 1; }
          .t-modal-close { position: absolute; top: 12px; right: 12px; width: 30px; height: 30px; border-radius: 50%; background: white; border: none; cursor: pointer; font-size: 14px; font-weight: 700; color: #333; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 10; display: flex; align-items: center; justify-content: center; }
          .t-nav-btn { width: 38px; height: 38px; border-radius: 50%; background: #fff; border: 1px solid #e0e0e0; cursor: pointer; font-size: 18px; color: #0f4c81; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: all 0.2s; flex-shrink: 0; }
          .t-nav-btn:hover:not(:disabled) { background: #fcc200; color: #0f4c81; border-color: #fcc200; }
          .t-nav-btn:disabled { background: #f0f0f0; color: #ccc; border-color: #e0e0e0; cursor: not-allowed; box-shadow: none; }
          .t-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; flex: 1; }
          @media (max-width: 768px) { .t-grid { grid-template-columns: 1fr; } }
        `}</style>

        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

          {/* Header */}
          <div className="reveal" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.18em', color: '#fcc200', fontWeight: '600', marginBottom: '10px', textTransform: 'uppercase' }}>In Their Words</div>
            <h2 style={{ fontFamily: "'Nunito', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: '#0f4c81', margin: '0 0 10px', fontWeight: '800' }}>Reaching Potentials</h2>
            <p style={{ color: '#666', fontSize: '15px', maxWidth: '480px', margin: '0 auto', lineHeight: '1.75', fontWeight: '300' }}>Real stories from families we've had the privilege of walking alongside.</p>
          </div>

          {/* Cards + side arrows */}
          <div className="reveal d2" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

            {/* Left arrow */}
            <button
              className="t-nav-btn"
              onClick={() => setTestimonialsStart(p => (p - 1 + testimonials.length) % testimonials.length)}
            >‹</button>

            {/* Card grid */}
            <div className="t-grid">
              {[0, 1, 2].map((offset) => {
                const globalIndex = (testimonialsStart + offset) % testimonials.length
                const t = testimonials[globalIndex]
                return (
                  <div key={globalIndex} className="t-card" onClick={() => setOpenTestimonial(globalIndex)}>
                    <div style={{ height: '160px', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={t.photo} alt="Session" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ fontSize: '32px', color: '#fcc200', lineHeight: '0.6', marginBottom: '8px', fontFamily: 'Georgia, serif', opacity: 0.7 }}>"</div>
                      <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.7', fontStyle: 'italic', marginBottom: '10px', flex: 1 }}>{t.pull}</div>
                      <div style={{ fontSize: '11px', color: '#0f4c81', fontWeight: '700', fontFamily: "'Nunito', sans-serif", marginBottom: '10px' }}>Read full story →</div>
                      <div style={{ paddingTop: '10px', borderTop: '1px solid #f0f4fa' }}>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: '12px', fontWeight: '800', color: '#0f4c81' }}>{t.name}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Right arrow */}
            <button
              className="t-nav-btn"
              onClick={() => setTestimonialsStart(p => (p + 1) % testimonials.length)}
            >›</button>

    </div>

    {/* Modal */}
    {openTestimonial !== null && (
      <div className="t-modal-overlay" onClick={() => setOpenTestimonial(null)}>
        <div className="t-modal" onClick={e => e.stopPropagation()}>
          <button className="t-modal-close" onClick={() => setOpenTestimonial(null)}>✕</button>
          <div className="t-modal-photo">
            <img src={testimonials[openTestimonial].photo} alt="Session" />
          </div>
          <div className="t-modal-body">
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: '14px', fontWeight: '800', color: '#0f4c81', marginBottom: '1.25rem' }}>
              {testimonials[openTestimonial].name}
            </div>
            <div style={{ fontSize: '14px', color: '#555', lineHeight: '1.85' }}>
              {renderHighlighted(testimonials[openTestimonial].full)}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Music Player */}
    <div className="reveal d3" style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 18px', borderRadius: '40px', border: '1px solid #e0e0e0', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', fontFamily: "'Nunito', sans-serif", maxWidth: '380px', width: '100%' }}>
        <button onClick={skipToPrevSong} disabled={musicTrack === 0} style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: musicTrack === 0 ? '#f0f0f0' : '#f0f4fa', color: musicTrack === 0 ? '#ccc' : '#0f4c81', cursor: musicTrack === 0 ? 'not-allowed' : 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏮</button>
        <button onClick={toggleMusic} style={{ flexShrink: 0, width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{musicPlaying ? '⏸' : '▶'}</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>{SONG_TITLES[musicTrack]}</span>
            <span style={{ fontSize: '11px', color: '#999' }}>{formatTime(musicCurrentTime)} / {formatTime(musicDuration)}</span>
          </div>
          <input type="range" min={0} max={musicDuration || 0} value={musicCurrentTime} onChange={seekMusic} style={{ width: '100%', accentColor: '#fcc200', height: '4px', cursor: 'pointer' }} />
        </div>
        <button onClick={skipToNextSong} disabled={musicTrack === 1} style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: musicTrack === 1 ? '#f0f0f0' : '#f0f4fa', color: musicTrack === 1 ? '#ccc' : '#0f4c81', cursor: musicTrack === 1 ? 'not-allowed' : 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏭</button>
      </div>
      <audio ref={audioRef} src={SONGS[musicTrack]} onEnded={handleSongEnded} onTimeUpdate={e => setMusicCurrentTime(e.currentTarget.currentTime)} onLoadedMetadata={e => setMusicDuration(e.currentTarget.duration)} />
    </div>

  </div>
</section>

      {/* ── LOCATION ── yellow-heavy: yellow bottom-left, tiny navy top-right */}
      <section id="location" style={{ padding: '6rem 2rem', background: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: '100px', height: '100px', background: 'rgba(15,76,129,0.04)', borderRadius: '50%', top: '-30px', right: '120px', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: '60px', height: '60px', background: 'rgba(15,76,129,0.03)', borderRadius: '50%', top: '60px', right: '60px', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: '320px', height: '320px', background: 'rgba(252,194,0,0.08)', borderRadius: '60% 40% 50% 50%', bottom: '-80px', left: '-80px', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: '180px', height: '180px', background: 'rgba(252,194,0,0.05)', borderRadius: '40% 60% 30% 70%', bottom: '30%', left: '40px', pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div className="reveal">
            <div style={{ fontSize: '11px', letterSpacing: '0.18em', color: '#fcc200', fontWeight: '600', marginBottom: '10px', textTransform: 'uppercase' }}>Where to find us</div>
            <h2 style={{ fontFamily: "'Nunito', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: '#0f4c81', margin: '0 0 2rem', fontWeight: '800' }}>Visit Our Clinic</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f0f4fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f4c81" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Address</div>
                  <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.65' }}>
                    Unit 2A, #72, MIC Building, Bukidnon Street<br />
                    Brgy. Ramon Magsaysay, Bago Bantay<br />
                    Quezon City, Philippines 1105
                  </div>
                  <div style={{ fontSize: '12px', color: '#bbb', marginTop: '3px' }}>Near Grass Residences, SM North Edsa Annex</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f0f4fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f4c81" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    <a target="_blank" rel="noopener noreferrer" href="mailto:potentialstherapycenter@gmail.com" style={{ color: '#0f4c81', textDecoration: 'none' }}>potentialstherapycenter@gmail.com</a>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f0f4fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f4c81" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Follow Us</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <a target="_blank" rel="noopener noreferrer" href="https://www.facebook.com/potentialstherapycenter"
                      style={{ padding: '8px 20px', borderRadius: '40px', background: '#0f4c81', color: '#fff', textDecoration: 'none', fontSize: '12px', fontWeight: '700', fontFamily: "'Nunito', sans-serif", display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                      Facebook
                    </a>
                    <a target="_blank" rel="noopener noreferrer" href="https://www.instagram.com/potentialstherapycenter/"
                      style={{ padding: '8px 20px', borderRadius: '40px', background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', color: '#fff', textDecoration: 'none', fontSize: '12px', fontWeight: '700', fontFamily: "'Nunito', sans-serif", display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="white" stroke="none"/></svg>
                      Instagram
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="reveal d2" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(15,76,129,0.1)', border: '1px solid #e8edf5', height: '380px' }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3859.936250872463!2d121.02258107440107!3d14.659559185833862!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b7d948f8a53d%3A0xbeb6658438477430!2sPotentials%20Therapy%20Center!5e0!3m2!1sen!2sfr!4v1780397807353!5m2!1sen!2sfr"
              width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" />
          </div>
        </div>
      </section>

      {/* Join Us Popup */}
      {showJoinUs && (
        <div onClick={() => setShowJoinUs(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src="/joinus.jpg" alt="Join us" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '12px', display: 'block' }} />
            <button onClick={() => setShowJoinUs(false)} style={{ position: 'absolute', top: '-12px', right: '-12px', background: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', fontWeight: '700', color: '#333', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>✕</button>
          </div>
        </div>
      )}

      {showParentComingSoon && (
        <div onClick={() => setShowParentComingSoon(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,25,40,0.55)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '18px', padding: '2.5rem 2rem', width: '380px', maxWidth: '100%', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', position: 'relative' }}>
            <button onClick={() => setShowParentComingSoon(false)} style={{ position: 'absolute', top: '14px', right: '16px', border: 'none', background: 'none', fontSize: '18px', color: '#bbb', cursor: 'pointer' }}>✕</button>
            <div style={{ fontSize: '40px', marginBottom: '14px' }}>👪</div>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: '800', fontSize: '19px', color: '#0f4c81', marginBottom: '8px' }}>Parent Portal is coming soon!</div>
            <div style={{ fontSize: '13.5px', color: '#7a7f87', lineHeight: '1.6', marginBottom: '1.5rem' }}>We're building a space where you can check your child's upcoming sessions, attendance, and payments. Hang tight — we'll let you know once it's ready.</div>
            <button onClick={() => setShowParentComingSoon(false)} style={{ fontFamily: "'Nunito', sans-serif", fontWeight: '700', fontSize: '13px', padding: '10px 26px', borderRadius: '8px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer' }}>Got it</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ background: '#0f4c81', color: 'rgba(255,255,255,0.7)', padding: '2rem', textAlign: 'center', borderTop: '3px solid #fcc200' }}>
        <div style={{ fontSize: '13px', marginBottom: '8px', fontFamily: "'Nunito', sans-serif", fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>
          © {new Date().getFullYear()} Potentials Therapy Center · Quezon City, Philippines
        </div>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', fontSize: '13px', fontFamily: "'Nunito', sans-serif", flexWrap: 'wrap' }}>
          <a href="/privacy" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Privacy Policy</a>
          <a target="_blank" rel="noopener noreferrer" href="mailto:potentialstherapycenter@gmail.com" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Contact</a>
        </div>
      </footer>
    </div>
  )
}
