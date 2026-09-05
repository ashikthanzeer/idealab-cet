import { client } from '@/sanity/lib/client'
import { componentsQuery } from '@/sanity/lib/queries'

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
  const components = await client.fetch<Component[]>(componentsQuery)

  return (
    <div>
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

      <header className='bg-[#112244] flex flex-row items-center px-4 py-2 justify-between'>
        <div className="w-40 h-15 bg-indigo-500 grid place-items-center">
          Icon
        </div>

        <div className="flex flex-row items-center gap-16">
          <ul className='flex flex-row gap-6'>
            <li>
              <a className='text-white hover:underline'>
                Home
              </a>
            </li>
            <li>
              <a className='text-white hover:underline'>
                About
              </a>
            </li>
            <li>
              <a className='text-white hover:underline'>
                Components
              </a>
            </li>
            <li>
              <a className='text-white hover:underline'>
                Tools
              </a>
            </li>
            <li>
              <a className='text-white hover:underline'>
                Facilities
              </a>
            </li>
            <li>
              <a className='text-white hover:underline'>
                Gallery
              </a>
            </li>
            <li>
              <a className='text-white hover:underline'>
                Contact
              </a>
            </li>
          </ul>
          <button
            className='bg-indigo-700 text-white px-4 py-2 rounded-md'>
            Visit the Lab
          </button>
        </div>
      </header>

      <main className="">
        <section id='hero' className='px-10 py-14 bg-[#111122]'>
          <div className=''>
            <span className='uppercase font-semibold text-indigo-200'>COLLEGE OF ENGINEERING TRIVANDRUM</span>
            <h1 className='text-7xl font-bold mt-4 text-white leading-20'>
              AICTE {" "}
              <span className='text-indigo-500'>
              IDEA LAB
              </span>
            </h1>

            <p className="text-xl font-semibold text-white mt-1">
              From Ideas
                to Prototypes
            </p>

            <p className='text-white/90 text-lg mt-6'>A hub for innovation, creativity and hands-on-learning, <br />
              Transforming ideas into real-worls solutions.</p>

            <div className="flex flex-row gap-4 items-center mt-6">
              <button className='rounded-xl font-medium shadow-sm border border-indigo-700 px-4 py-2 bg-indigo-800 text-white'>View Available Components</button>
              <button className='rounded-xl font-medium shadow-sm px-4 py-2 border border-neutral-500 text-white'>View Available Tools</button>
            </div>
          </div>

          <div className="flex flex-row gap-5 items-center mt-10">
            <div className='flex flex-row gap-3 items-center'>
              <i className='ph ph-chalkboard text-neutral-300 text-3xl bg-[#111133] p-3 rounded-lg'></i>
              <div>
                <p className='text-neutral-50'>
                  Learn by Doing
                </p>
                <p className='text-neutral-300'>
                  Hands-on experience
                </p>
              </div>
            </div>

            <div className='flex flex-row gap-3 items-center'>
              <i className='ph ph-gear text-neutral-300 text-3xl bg-[#111133] p-3 rounded-lg'></i>
              <div>
                <p className='text-neutral-50'>
                  Innovate
                </p>
                <p className='text-neutral-300'>
                  Think. Design, Build,
                </p>
              </div>
            </div>

            <div className='flex flex-row gap-3 items-center'>
              <i className='ph ph-users text-neutral-300 text-3xl bg-[#111133] p-3 rounded-lg'></i>
              <div>
                <p className='text-neutral-50'>
                  Collaborate
                </p>
                <p className='text-neutral-300'>
                  Work together
                </p>
              </div>
            </div>

            <div className='flex flex-row gap-3 items-center'>
              <i className='ph ph-trend-up text-neutral-300 text-3xl bg-[#111133] p-3 rounded-lg'></i>
              <div>
                <p className='text-neutral-50'>
                  Excel
                </p>
                <p className='text-neutral-300'>
                  Create impact
                </p>
              </div>
            </div>
          </div>

        </section>

        <section id="what" className='px-10 py-14'>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className='text-xl font-semibold uppercase'>
                About IDEA Lab
              </p>

              <h2 className='text-3xl font-bold mt-3'>
                What is an {" "}
                <span className="text-indigo-800">
                  AICTE IDEA Lab?
                </span>
              </h2>

              <p className='max-w-xl font-medium text-lg mt-5'>
                AICTE IDEA Lab (Idea Development, Evaluation & Application) is a
                common facility established in AICTE approved institutions to
                encourage students to apply STEM fundamentals for innovation and
                prototype development.
              </p>

              <ul className='mt-6 flex flex-col gap-2 [&>li]:flex [&>li]:flex-row [&>li]:gap-2 [&>li]:items-center [&>li>i]:text-sm [&>li>i]:rounded-full [&>li>i]:bg-indigo-800 [&>li>i]:p-1 [&>li>i]:text-white'>
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
                  <i className="ph ph-lightbulb text-3xl p-3 border border-neutral-400 rounded-full"></i>
                  <p className='text-sm font-semibold'>Ideate</p>
                </div>
                <div><i className="ph ph-arrow-right text-xl"></i></div>
                <div className="flex flex-col gap-2 items-center justify-center">
                  <i className="ph ph-pen text-3xl p-3 border border-neutral-400 rounded-full"></i>
                  <p className='text-sm font-semibold'>Design</p>
                </div>
                <div><i className="ph ph-arrow-right text-xl"></i></div>
                <div className="flex flex-col gap-2 items-center justify-center">
                  <i className="ph ph-wrench text-3xl p-3 border border-neutral-400 rounded-full"></i>
                  <p className='text-sm font-semibold'>Build</p>
                </div>
                <div><i className="ph ph-arrow-right text-xl"></i></div>
                <div className="flex flex-col gap-2 items-center justify-center">
                  <i className="ph ph-circle-half-tilt text-3xl p-3 border border-neutral-400 rounded-full"></i>
                  <p className='text-sm font-semibold'>Prototype</p>
                </div>
                <div><i className="ph ph-arrow-right text-xl"></i></div>
                <div className="flex flex-col gap-2 items-center justify-center">
                  <i className="ph ph-users-three text-3xl p-3 border border-neutral-400 rounded-full"></i>
                  <p className='text-sm font-semibold'>Impact</p>
                </div>
              </div>
            </div>
          </div>

          <div className='px-10 py-8 rounded-xl bg-[#111122] mt-10'>
            <h3 className='text-indigo-50 font-bold uppercase inline-flex items-center'>
              <span className='text-indigo-200'>
                IDEA LAB CET
              </span>
              <i className="ph ph-dot text-xl"></i>
              {" "}
              at a glance</h3>

            <div className="flex flex-row items-center justify-between gap-4 mt-4">
              <div className="flex flex-row items-center gap-3">
                <i className="text-white p-3 rounded-lg bg-indigo-800 ph ph-currency-inr text-3xl"></i>
                <div
                  className='flex flex-col gap'
                ><p className='text-white text-xl font-semibold'>90 Lakhs</p>
                  <p className='text-lg text-neutral-200'>
                    Total Project Cost
                  </p>
                </div>
              </div>
              <div className="flex flex-row items-center gap-3">
                <i className="text-white p-3 rounded-lg bg-indigo-800 ph ph-gear text-3xl"></i>
                <div
                  className='flex flex-col gap'
                ><p className='text-white text-xl font-semibold'>60 Lakhs</p>
                  <p className='text-lg text-neutral-200'>
                    For Equipment
                  </p>
                </div>
              </div>
              <div className="flex flex-row items-center gap-3">
                <i className="text-white p-3 rounded-lg bg-indigo-800 ph ph-users text-3xl"></i>
                <div
                  className='flex flex-col gap'
                ><p className='text-white text-xl font-semibold'>30 Lakhs</p>
                  <p className='text-lg text-neutral-200'>
                    For Activities
                  </p>
                </div>
              </div>
              <div className="flex flex-row items-center gap-3">
                <i className="text-white p-3 rounded-lg bg-indigo-800 ph ph-building-office text-3xl"></i>
                <div
                  className='flex flex-col gap'
                ><p className='text-white text-xl font-semibold'>Established</p>
                  <p className='text-lg text-neutral-200'>
                    With support from AICTE
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>


        <section id="catalogue" className='grid grid-cols-2 gap-8 px-10 pb-8'>
          <div>
            <div className="flex flex-row items-center justify-between gap-4">
              <h2 className='text-lg uppercase font-semibold'>Available Components</h2>
              <a href="#" className='inline-flex items-center gap-1 text-indigo-800'>View All Components
                <i className="ph ph-arrow-right"></i>
              </a>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-4">
              <div className="flex flex-col p-2 bg-white border border-neutral-300 rounded-lg">
                <img src="https://picsum.photos/800/450" alt="Img" className='rounded-lg shadow-sm object-cover mb-3' />
                <p className='text-lg font-bold'>
                  Microcontrollers
                </p>
                <p className='text-base text-neutral-700 font-medium'>
                  High performance boards
                  for rapid prototyping.
                </p>
                <span className='w-fit bg-indigo-100 px-2 py-1 rounded-full text-indigo-800 font-bold uppercase mt-2 text-xs'>
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
                <span className='w-fit bg-indigo-100 px-2 py-1 rounded-full text-indigo-800 font-bold uppercase mt-2 text-xs'>
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
                <span className='w-fit bg-indigo-100 px-2 py-1 rounded-full text-indigo-800 font-bold uppercase mt-2 text-xs'>
                  Electronics
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-row items-center justify-between gap-4">
              <h2 className='text-lg uppercase font-semibold'>Available Tools</h2>
              <a href="#" className='inline-flex items-center gap-1 text-indigo-800'>View All Components
                <i className="ph ph-arrow-right"></i>
              </a>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-4">
              <div className="flex flex-col p-2 bg-white border border-neutral-300 rounded-lg">
                <img src="https://picsum.photos/800/450" alt="Img" className='rounded-lg shadow-sm object-cover mb-3' />
                <p className='text-lg font-bold'>
                  CNC Wood Router
                </p>
                <p className='text-base text-neutral-700 font-medium'>
                  High precision CNC router
                  for multi-materials.</p>
                <span className='w-fit bg-indigo-100 px-2 py-1 rounded-full text-indigo-800 font-bold uppercase mt-2 text-xs'>
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
                <span className='w-fit bg-indigo-100 px-2 py-1 rounded-full text-indigo-800 font-bold uppercase mt-2 text-xs'>
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
                <span className='w-fit bg-indigo-100 px-2 py-1 rounded-full text-indigo-800 font-bold uppercase mt-2 text-xs'>
                  Fabrication
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="facilities" className='px-10 pb-8'>
          <h2 className='text-lg uppercase font-semibold'>Facilities & Capabilities</h2>

          <div className="mt-6 grid grid-cols-6 gap-4">
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
            <a href="#" className='inline-flex items-center gap-1 text-indigo-800'>View Gallery
              <i className="ph ph-arrow-right"></i>
            </a>
          </div>

          <div className="grid grid-cols-5 mt-4 h-40 gap-4">
            {(new Array(5)).fill(0).map((_v, i) => {
              return (
                <img key={i} src="https://picsum.photos/800/450" alt="Gallery" className='object-cover rounded-lg' />
              )
            })}
          </div>
        </section>

        <section id="ready" className='px-10 pb-8'>
          <div className="px-10 py-8 bg-[#111122] rounded-xl flex flex-row items-center justify-between">
            <div className="flex flex-row items-center gap-4">
              <i className="text-white p-3 rounded-lg bg-indigo-800 ph ph-books text-3xl"></i>
              <div>
                <p className='text-lg text-white font-semibold'>
                  Ready to innovate?
                </p>
                <p className='font-medium text-neutral-300'>
                  Visit the IDEA Lab CET and turn your ideas into reality.
                </p>
              </div>
            </div>

            <button className='rounded-xl shadow-sm border border-indigo-700 px-4 py-2 bg-indigo-800 text-white font-semibold'>Contact Us</button>
          </div>
        </section>

        <section id="footer" className='grid grid-cols-5 gap-6 px-20 bg-[#111122] text-white py-10'>
          <div className="w-40 h-15 bg-indigo-500 grid place-items-center">
            Icon
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
            <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-neutral-300">
              <p>
                Home
              </p>
              <p>
                About
              </p>
              <p>
                Components
              </p>
              <p>
                Tools
              </p>
              <p>
                Facliities
              </p>
              <p>
                Gallery
              </p>
              <p>
                Contact
              </p>
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
        </section>
      </main>
    </div>
  )
}