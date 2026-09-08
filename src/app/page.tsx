import { client } from '@/sanity/lib/client'
import { componentsQuery } from '@/sanity/lib/queries'
import { Nav } from './components/ui/Nav'
import Link from 'next/link'

type Component = {
  _id: string
  name: string
  slug?: {
    current: string
  }
  shortDescription?: string
  featured?: boolean
  order?: number
}

export default async function Home() {
  const components = await client.fetch<Component[]>(componentsQuery);

  return (
    <div className='relative'>
      {/* <h1 className="text-3xl font-bold">IDEA Lab CET</h1>

<h2 className="mt-8 text-2xl font-semibold">Components</h2>

<ul className="mt-4 space-y-2">
{components.map((component) => (
  <li key={component._id}>
  <strong>{component.name}</strong>
  <p>{component.shortDescription}</p>
  </li>
  ))}
  </ul> */}

  <Nav />

      <main className="">
        <section id='hero' className='px-10 py-14 bg-secondary'>
          <div className=''>
            <span className='uppercase font-semibold text-indigo-200'>COLLEGE OF ENGINEERING TRIVANDRUM</span>
            <h1 className='text-6xl md:text-7xl font-bold mt-4 text-white md:leading-20'>
              AICTE {" "}
              <br className='md:hidden' />
              <span className='text-primary-v2'>
                IDEA LAB
              </span>
            </h1>

            <p className="text-lg md:text-xl font-semibold text-white mt-3 md:mt-1">
              From Ideas
              to Prototypes
            </p>

            <p className='text-white/90 text-normal md:text-lg mt-4 md:mt-6'>A hub for innovation, creativity and hands-on-learning, <br />
              Transforming ideas into real-world solutions.</p>

            <div className="grid grid-cols-2 md:flex flex-row gap-4 items-center mt-6">
              <Link href='/components' className='rounded-xl focus-within:ring-primary ring-0 focus-within:ring-offset-2 transition-all font-medium shadow-sm border border-primary/70 px-4 py-2 bg-primary text-white'>View Components</Link>
              <Link href='/tools' className='rounded-xl focus-within:ring-primary ring-0 focus-within:ring-offset-2 transition-all font-medium shadow-sm px-4 py-2 border border-neutral-500 text-white'>View Tools</Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 items-center mt-10">
            <div className='flex flex-row gap-3 items-center'>
              <i className='ph ph-chalkboard text-neutral-300 text-3xl bg-primary/10 p-3 rounded-lg'></i>
              <div>
                <p className='text-neutral-50'>
                  Learn by Doing
                </p>
                <p className='text-sm md:text-base text-neutral-300'>
                  Hands-on experience
                </p>
              </div>
            </div>

            <div className='flex flex-row gap-3 items-center'>
              <i className='ph ph-gear text-neutral-300 text-3xl bg-primary/10 p-3 rounded-lg'></i>
              <div>
                <p className='text-neutral-50'>
                  Innovate
                </p>
                <p className='text-sm md:text-base text-neutral-300'>
                  Think. Design, Build
                </p>
              </div>
            </div>

            <div className='flex flex-row gap-3 items-center'>
              <i className='ph ph-users text-neutral-300 text-3xl bg-primary/10 p-3 rounded-lg'></i>
              <div>
                <p className='text-neutral-50'>
                  Collaborate
                </p>
                <p className='text-sm md:text-base text-neutral-300'>
                  Work together
                </p>
              </div>
            </div>

            <div className='flex flex-row gap-3 items-center'>
              <i className='ph ph-trend-up text-neutral-300 text-3xl bg-primary/10 p-3 rounded-lg'></i>
              <div>
                <p className='text-neutral-50'>
                  Excel
                </p>
                <p className='text-sm md:text-base text-neutral-300'>
                  Create impact
                </p>
              </div>
            </div>
          </div>

        </section>

        <section id="about" className='px-10 py-14'>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className='text-xl font-semibold uppercase'>
                About IDEA Lab
              </p>

              <h2 className='text-3xl font-bold mt-3'>
                What is {" "}
                <span className="text-primary">
                  AICTE IDEA Lab?
                </span>
              </h2>

              <p className='max-w-xl font-medium text-base md:text-lg mt-5'>
                AICTE IDEA Lab (Idea Development, Evaluation & Application) is a
                common facility established in AICTE approved institutions to
                encourage students to apply STEM fundamentals for innovation and
                prototype development.
              </p>

              <ul className='mt-6 flex text-secondary flex-col gap-2 [&>li]:flex [&>li]:flex-row [&>li]:gap-2 [&>li]:items-center [&>li>i]:text-sm [&>li>i]:rounded-full [&>li>i]:bg-primary [&>li>i]:p-1 [&>li>i]:text-white'>
                <li>
                  <i className='ph-bold ph-check' />
                  <p>
                    Enhances creativity, imagination & innovation
                  </p>
                </li>
                <li>
                  <i className='ph-bold ph-check' />
                  <p>
                    Promotes 21st century skills
                  </p>
                </li>
                <li>
                  <i className='ph-bold ph-check' />
                  <p>
                    Encourages interdisciplinary learning
                  </p>
                </li>
                <li>
                  <i className='ph-bold ph-check' />
                  <p>
                    Transforms ideas into prototypes
                  </p>
                </li>
                <li>
                  <i className='ph-bold ph-check' />
                  <p>
                    Supports students & faculty projects
                  </p>
                </li>
              </ul>
            </div>

            <div>
              <p className='text-xl font-semibold'>Purpose</p>
              <p className='text-base font-medium mt-3 max-w-sm'>To provide all facilities under one roof for conversion
                of an idea into a prototype and to nurture innovative
                minds through training, exposure and support.</p>

              <div className='flex flex-row items-center gap-2 mt-4'>
                <div className="flex flex-col gap-2 items-center justify-center">
                  <i className="ph ph-lightbulb text-xl md:text-3xl p-2 md:p-3 border border-neutral-400 rounded-full"></i>
                  <p className='text-sm font-semibold'>Ideate</p>
                </div>
                <div><i className="ph ph-arrow-right md:text-xl"></i></div>
                <div className="flex flex-col gap-2 items-center justify-center">
                  <i className="ph ph-pen text-xl md:text-3xl p-2 md:p-3 border border-neutral-400 rounded-full"></i>
                  <p className='text-sm font-semibold'>Design</p>
                </div>
                <div><i className="ph ph-arrow-right md:text-xl"></i></div>
                <div className="flex flex-col gap-2 items-center justify-center">
                  <i className="ph ph-wrench text-xl md:text-3xl p-2 md:p-3 border border-neutral-400 rounded-full"></i>
                  <p className='text-sm font-semibold'>Build</p>
                </div>
                <div><i className="ph ph-arrow-right md:text-xl"></i></div>
                <div className="flex flex-col gap-2 items-center justify-center">
                  <i className="ph ph-circle-half-tilt text-xl md:text-3xl p-2 md:p-3 border border-neutral-400 rounded-full"></i>
                  <p className='text-sm font-semibold'>Prototype</p>
                </div>
                <div><i className="ph ph-arrow-right md:text-xl"></i></div>
                <div className="flex flex-col gap-2 items-center justify-center">
                  <i className="ph ph-users-three text-xl md:text-3xl p-2 md:p-3 border border-neutral-400 rounded-full"></i>
                  <p className='text-sm font-semibold'>Impact</p>
                </div>
              </div>
            </div>
          </div>

          <div className='px-6 md:px-10 py-6 md:py-8 rounded-xl bg-secondary mt-10'>
            <h3 className='text-indigo-50 text-sm md:text-base font-bold uppercase inline-flex items-center'>
              <span className='text-indigo-200'>
                IDEA LAB CET
              </span>
              <i className="ph ph-dot text-xl"></i>
              {" "}
              at a glance</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 items-center justify-between gap-4 mt-4">
              <div className="flex flex-row items-center gap-3">
                <i className="text-white p-3 rounded-lg bg-primary/80 ph ph-currency-inr text-3xl"></i>
                <div
                  className='flex flex-col gap'
                ><p className='text-white text-xl font-semibold'>90 Lakhs</p>
                  <p className='text-sm md:text-lg text-neutral-300'>
                    Total Project Cost
                  </p>
                </div>
              </div>
              <div className="flex flex-row items-center gap-3">
                <i className="text-white p-3 rounded-lg bg-primary/80 ph ph-gear text-3xl"></i>
                <div
                  className='flex flex-col gap'
                ><p className='text-white text-xl font-semibold'>60 Lakhs</p>
                  <p className='text-sm md:text-lg text-neutral-300'>
                    For Equipment
                  </p>
                </div>
              </div>
              <div className="flex flex-row items-center gap-3">
                <i className="text-white p-3 rounded-lg bg-primary/80 ph ph-users text-3xl"></i>
                <div
                  className='flex flex-col gap'
                ><p className='text-white text-xl font-semibold'>30 Lakhs</p>
                  <p className='text-sm md:text-lg text-neutral-300'>
                    For Activities
                  </p>
                </div>
              </div>
              <div className="flex flex-row items-center gap-3">
                <i className="text-white p-3 rounded-lg bg-primary/80 ph ph-building-office text-3xl"></i>
                <div
                  className='flex flex-col gap'
                ><p className='text-white text-xl font-semibold'>Established</p>
                  <p className='text-sm md:text-lg text-neutral-300'>
                    With support from AICTE
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>


        <section id="catalogue" className='grid grid-cols-1 lg:grid-cols-2 gap-8 px-10 pb-8'>
          <div>
            <div className="flex flex-row items-center justify-between gap-4">
              <h2 className='text-lg uppercase font-semibold'>Available Components</h2>
              <a href="/components" className='inline-flex items-center gap-1 text-primary whitespace-nowrap focus-within:underline'>View All Components
                <i className="ph ph-arrow-right"></i>
              </a>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-2 gap-4">
              <div className="flex flex-col p-2 bg-white border border-neutral-300 rounded-lg">
                <img src="https://picsum.photos/800/450" alt="Img" className='rounded-lg shadow-sm object-cover mb-3' />
                <p className='text-lg font-bold'>
                  Microcontrollers
                </p>
                <p className='text-base text-neutral-700 font-medium'>
                  High performance boards
                  for rapid prototyping.
                </p>
                <span className='w-fit bg-primary/10 px-2 py-1 rounded-full text-primary font-bold uppercase mt-2 text-xs'>
                  Electronics
                </span>
              </div>

              <div className="flex flex-col p-2 bg-white border border-neutral-300 rounded-lg">
                <img src="https://picsum.photos/800/450" alt="Img" className='rounded-lg shadow-sm object-cover mb-3' />
                <p className='text-lg font-bold'>
                  Stepper Motor
                </p>
                <p className='text-base text-neutral-700 font-medium'>
                  Precision motors for accurate
                  motion control.
                </p>
                <span className='w-fit bg-primary/10 px-2 py-1 rounded-full text-primary font-bold uppercase mt-2 text-xs'>
                  Electromechanical
                </span>
              </div>

              <div className="flex flex-col p-2 bg-white border border-neutral-300 rounded-lg">
                <img src="https://picsum.photos/800/450" alt="Img" className='rounded-lg shadow-sm object-cover mb-3' />
                <p className='text-lg font-bold'>
                  Various Sensors
                </p>
                <p className='text-base text-neutral-700 font-medium'>
                  Wide range of sensors for
                  multiple applications.
                </p>
                <span className='w-fit bg-primary/10 px-2 py-1 rounded-full text-primary font-bold uppercase mt-2 text-xs'>
                  Electronics
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-row items-center justify-between gap-4">
              <h2 className='text-lg uppercase font-semibold'>Available Tools</h2>
              <a href="/tools" className='inline-flex items-center gap-1 text-primary whitespace-nowrap focus-within:underline'>View All Tools
                <i className="ph ph-arrow-right"></i>
              </a>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-2 gap-4">
              <div className="flex flex-col p-2 bg-white border border-neutral-300 rounded-lg">
                <img src="https://picsum.photos/800/450" alt="Img" className='rounded-lg shadow-sm object-cover mb-3' />
                <p className='text-lg font-bold'>
                  CNC Wood Router
                </p>
                <p className='text-base text-neutral-700 font-medium'>
                  High precision CNC router
                  for multi-materials.</p>
                <span className='w-fit bg-primary/10 px-2 py-1 rounded-full text-primary font-bold uppercase mt-2 text-xs'>
                  Machining
                </span>
              </div>

              <div className="flex flex-col p-2 bg-white border border-neutral-300 rounded-lg">
                <img src="https://picsum.photos/800/450" alt="Img" className='rounded-lg shadow-sm object-cover mb-3' />
                <p className='text-lg font-bold'>
                  3D Printers
                </p>
                <p className='text-base text-neutral-700 font-medium'>
                  Multi material 3D printing
                  or rapid prototyping.
                </p>
                <span className='w-fit bg-primary/10 px-2 py-1 rounded-full text-primary font-bold uppercase mt-2 text-xs'>
                  Manufacturing
                </span>
              </div>

              <div className="flex flex-col p-2 bg-white border border-neutral-300 rounded-lg">
                <img src="https://picsum.photos/800/450" alt="Img" className='rounded-lg shadow-sm object-cover mb-3' />
                <p className='text-lg font-bold'>
                  Mechanical Tools
                </p>
                <p className='text-base text-neutral-700 font-medium'>
                  A wide range of tools for
                  fabrication and assembly.
                </p>
                <span className='w-fit bg-primary/10 px-2 py-1 rounded-full text-primary font-bold uppercase mt-2 text-xs'>
                  Fabrication
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="facilities" className='px-10 pb-8'>
          <h2 className='text-lg uppercase font-semibold'>Facilities & Capabilities</h2>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="flex flex-row items-start gap-4">
              <i className="ph ph-gear text-4xl text-neutral-700"></i>
              <div className="flex flex-col gap-1">
                <p className='font-bold'>CNC Machining</p>
                <p>Precision cutting & shaping</p>
              </div>
            </div>

            <div className="flex flex-row items-start gap-4">
              <i className="ph ph-cube text-4xl text-neutral-700"></i>
              <div className="flex flex-col gap-1">
                <p className="font-bold">3D Printing</p>
                <p>Multi-material prototyping</p>
              </div>
            </div>

            <div className="flex flex-row items-start gap-4">
              <i className="ph ph-cpu text-4xl text-neutral-700"></i>
              <div className="flex flex-col gap-1">
                <p className="font-bold">Electronics Lab</p>
                <p>Design, test & development</p>
              </div>
            </div>

            <div className="flex flex-row items-start gap-4">
              <i className="ph ph-wrench text-4xl text-neutral-700"></i>
              <div className="flex flex-col gap-1">
                <p className="font-bold">Mechanical Tools</p>
                <p>Fabrication & assembly</p>
              </div>
            </div>

            <div className="flex flex-row items-start gap-4">
              <i className="ph ph-desktop text-4xl text-neutral-700"></i>
              <div className="flex flex-col gap-1">
                <p className="font-bold">Design & Simulation</p>
                <p>From concept to virtual testing</p>
              </div>
            </div>

            <div className="flex flex-row items-start gap-4">
              <i className="ph ph-lightbulb text-4xl text-neutral-700"></i>
              <div className="flex flex-col gap-1">
                <p className="font-bold">Innovation Support</p>
                <p>Mentorship, training & resources</p>
              </div>
            </div>
          </div>
        </section>

        <section id='gallery' className='px-10 pb-8'>
          <div className="flex flex-row items-center justify-between gap-4">
            <h2 className='text-lg uppercase font-semibold'>Lab Gallery</h2>
            <a href="/gallery" className='inline-flex items-center gap-1 text-primary'>View Gallery
              <i className="ph ph-arrow-right"></i>
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mt-4 gap-4">
            {(new Array(5)).fill(0).map((_v, i) => {
              return (
                <img key={i} src="https://picsum.photos/800/450" alt="Gallery" className='h-40 w-full object-cover rounded-lg' />
              )
            })}
          </div>
        </section>

        <section id="ready" className='px-10 pb-8'>
          <div className="px-6 md:px-6 py-6 md:py-8 bg-secondary rounded-xl flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex flex-row items-center gap-4">
              <i className="text-white p-3 rounded-lg bg-primary ph ph-books text-3xl"></i>
              <div>
                <p className='text-lg text-white font-semibold'>
                  Ready to innovate?
                </p>
                <p className='font-medium text-neutral-300'>
                  Visit the IDEA Lab CET and turn your ideas into reality.
                </p>
              </div>
            </div>

            <button className='focus-within:ring-primary ring-0 focus-within:ring-offset-2 mt-6 md:mt-0 rounded-xl shadow-sm border border-primary/70 px-4 py-2 bg-primary text-white font-semibold'>Contact Us</button>
          </div>
        </section>

        <section id="footer" className='px-10 md:px-20 bg-secondary text-white py-10'>
          <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6'>
            <div className="flex flex-row gap-4">
              <img src="/icon.png" className='block size-20' alt="AICTE IDEA LAB, CET Icon" />
              <a className='block' href="https://cet.ac.in">
                <img src="/cet.png" className='block size-20' alt="CET Icon" />
              </a>
            </div>

            <div>
              <p className="font-semibold mb-2">
                AICTE IDEA Lab CET
              </p>
              <p className='text-neutral-300'>
                Empowering innovators of today
                to build a better tomorrow.
              </p>
            </div>

            <div>
              <p className="font-semibold mb-2">
                Quick Links
              </p>
              <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-neutral-300 [&>p]:hover:underline">
                <a href='/'>
                  Home
                </a>
                <a href='/#about'>
                  About
                </a>
                <a href='/components'>
                  Components
                </a>
                <a href='/tools'>
                  Tools
                </a>
                <a href='/#facilities'>
                  Facliities
                </a>
                <a href='/gallery'>
                  Gallery
                </a>
                <a href='/#footer'>
                  Contact
                </a>
              </div>
            </div>  

            <div>
              <p className="font-semibold mb-2">
                Contact Us
              </p>

              <div className="flex flex-col gap-1 text-neutral-300">
                <div className='inline-flex item-center gap-1.5'>
                  <i className="ph ph-map-pin text-lg pt-1"></i>
                  <p>
                    College Of Engineering Trivandrum
                    Thiruvananthapuram, Kerala, India
                  </p>
                </div>
                <div className='inline-flex item-center gap-1.5'>
                  <i className="ph ph-envelope text-lg pt-1"></i>
                  <p>
                    idealab@cet.ac.in
                  </p>
                </div>
                <div className='inline-flex item-center gap-1.5'>
                  <i className="ph ph-phone text-lg pt-1"></i>
                  <p>
                    Set number here
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">
                Follow Us
              </p>

              <div className="flex flex-row gap-2 text-3xl text-neutral-300">
                <a href="#">
                  <i className="ph ph-instagram-logo"></i>
                </a>
                <a href="#">
                  <i className="ph ph-linkedin-logo"></i>
                </a>
                <a href="#">
                  <i className="ph ph-youtube-logo"></i>
                </a>
              </div>
            </div>
          </div>

          <p className='text-xs text-neutral-300 mt-6'>Copyright{" "}
            <i className="ph ph-copyright inline-block"></i>
            {" "}{new Date().getFullYear()}{" "}IIC Developers Team, College Of Engineering Trivandrum
          </p>
        </section>
      </main>
    </div>
  )
}