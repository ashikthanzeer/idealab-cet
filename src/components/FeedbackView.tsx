"use client"

import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useState, useEffect, useRef } from 'react'
// Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react';
// Import Swiper styles
import 'swiper/css';
import 'swiper/css/autoplay';
import 'swiper/css/effect-coverflow';
import { Autoplay, EffectCoverflow } from 'swiper/modules';
import { Swiper as SwiperType } from 'swiper';
import { useMedia } from 'react-use';

export type Feedback = {
  _id: string
  name: string
  validId: string
  date: Date
  equipmentsUsed: string[]
  purpose: string
  feedback: string
}

function getIconClass(equipmentName: string) {
  const fl = equipmentName[0].toLowerCase();
  //   'Hall Only': 'ph ph-buildings',
  // '3D Printer': 'ph ph-cube',
  // 'Laser Cutter': 'ph ph-crosshair',
  // 'Wood Router': 'ph ph-hammer',
  // 'Mechanical Tools': 'ph ph-wrench',
  // 'Other': 'ph ph-dots-three-circle',
  switch (fl) {
    case 'h':
      return 'ph-buildings';
    case '3':
      return 'ph-cube';
    case 'l':
      return 'ph-crosshair';
    case 'w':
      return 'ph-hammer';
    case 'm':
      return 'ph-wrench';

    default:
      return 'ph-dots-three-circle';
  }
}

export default function FeedbackView({ feedbacks }: { feedbacks: Feedback[] }) {
  let [isExpanded, setIsExpanded] = useState<number | false>(false)
  const [currFeedback, setCurrFeedback] = useState<Feedback | null>(null);
  const swiper = useRef<SwiperType | null>(null);
  const isWide = useMedia('(min-width: 768px)');

  useEffect(() => {
    if (typeof isExpanded === 'number') {
      setCurrFeedback(feedbacks[isExpanded]);
      swiper.current?.autoplay.stop();
    } else {
      setCurrFeedback(null);
      swiper.current?.autoplay.start();
    }
  }, [isExpanded, feedbacks]);

  return (
    <>
      <Dialog
        transition
        open={(isExpanded !== false) && !!currFeedback}
        onClose={() => setIsExpanded(false)}
        className="fixed z-100 inset-0 flex w-screen items-center justify-center bg-black/10 backdrop-blur-sm p-4 transition duration-300 ease-in-out data-closed:opacity-0"
      >
        {currFeedback &&
          <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
            <DialogPanel className="max-w-lg h-fit max-h-[70vh] flex flex-col relative border border-neutral-300 shadow-xl bg-neutral-50 p-6 rounded-lg">
              <div className="flex flex-row items-center justify-start">
                <div className='mr-3'>
                  <i className={`text-2xl p-2 size-10 aspect-square block ph ${getIconClass(currFeedback?.equipmentsUsed[0])}`}></i>
                </div>

                <div className='mr-3'>
                  <DialogTitle className="font-bold text-lg/6">
                    {currFeedback?.name}
                  </DialogTitle>
                  <Description className="font-semibold uppercase text-neutral-600">{currFeedback?.equipmentsUsed[0]}</Description>
                </div>

                <button className='ml-auto text-lg grid place-items-center size-8 focus-within:border aspect-square rounded-lg hover:bg-neutral-200' onClick={() => setIsExpanded(false)}>
                  <i className="ph ph-x"></i>
                </button>
              </div>
              <div className="mt-2 block max-h-[20%] overflow-y-auto">
                {currFeedback?.purpose &&
                  <p className="mb-1 text-sm font-semibold text-neutral-600 line-clamp-1">{currFeedback?.purpose}</p>
                }
                <p className=''>
                  {currFeedback?.feedback}
                </p>
              </div>
              {/* <div className="flex gap-4">
              <button onClick={() => setIsExpanded(false)}>Cancel</button>
              <button onClick={() => setIsExpanded(false)}>Deactivate</button>
              </div> */}
            </DialogPanel>
          </div>
        }
      </Dialog>

      {feedbacks.length > 0 ? (
        <div className="mt-4">
          <Swiper
            spaceBetween={isWide ? 16 : 0}
            slidesPerView={(isWide) ? (feedbacks.length >= 3 ? 3 : feedbacks.length) : 1}
            coverflowEffect={feedbacks.length >= 3 ? {
              rotate: 30,
              slideShadows: false,
            } : {
              rotate: 0,
              slideShadows: false,
            }}
            autoplay={{ delay: 3000, pauseOnMouseEnter: true }}
            loop
            effect='coverflow'
            modules={[Autoplay, EffectCoverflow]}
            onSwiper={(_swiper) => {
              swiper.current = _swiper;
            }}
          >
            {feedbacks.map((feedback, i) => (
              <SwiperSlide>
                <div
                  key={feedback._id}
                  onClick={() => {
                    setIsExpanded(i);
                  }}
                  className="min-w-[80vw] flex flex-col h-full max-w-[80vw] md:min-w-xs md:max-w-xs ring-2 ring-primary/5 hover:shadow-lg transition-all bg-white shadow-xs rounded-lg border border-neutral-300 px-4 py-4"
                >
                  <div className="flex flex-row items-center gap-2">
                    <div>
                      <i className={`text-2xl p-2 size-10 aspect-square mt-1 block ph ${getIconClass(feedback.equipmentsUsed[0])}`}></i>
                    </div>
                    <div>
                      <p className="text-sm font-semibold capitalize">{feedback.name}</p>
                      <p className="text-xs font-semibold uppercase text-neutral-700">{feedback.equipmentsUsed[0]}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-neutral-600 line-clamp-1">{feedback.purpose}</p>
                  <p className="mt-1 text-base text-neutral-800 line-clamp-5">{feedback.feedback}</p>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      ) : (
        <div className="border border-neutral-300 rounded-lg bg-white p-10 text-center">
          <p className="font-medium text-neutral-600">
            No feedbacks yet.
            <br />
            <span className="text-lg text-black">
              Been to <b>IdeaLAB</b>? Drop your feedback <b>here</b>.
            </span>
          </p>
        </div>
      )}</>
  );
}
