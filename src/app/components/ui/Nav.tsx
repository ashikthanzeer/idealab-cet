"use client"

import { useState } from "react";

function NavList() {
    return (
        <>
            <li>
                <a className='hover:underline' href='/'>
                    Home
                </a>
            </li>
            <li>
                <a className='hover:underline' href='/#about'>
                    About
                </a>
            </li>
            <li>
                <a className='hover:underline' href='/components'>
                    Components
                </a>
            </li>
            <li>
                <a className='hover:underline' href='/tools'>
                    Tools
                </a>
            </li>
            <li>
                <a className='hover:underline' href='/#facilities'>
                    Facilities
                </a>
            </li>
            <li>
                <a className='hover:underline' href='/#gallery'>
                    Gallery
                </a>
            </li>
            <li>
                <a className='hover:underline' href='/#footer'>
                    Contact
                </a>
            </li>
        </>
    )
}

export function Nav() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <>

            {menuOpen &&
                <div className="absolute top-22 w-full">
                    <div className="mx-4 bg-[#030919] border border-neutral-800 rounded-lg p-4">
                        <nav>
                            <ul className='flex lg:hidden flex-col gap-4 text-lg text-neutral-200 font-medium'>
                                <NavList />
                            </ul>
                        </nav>
                    </div>
                </div>
            }


            <header className='sticky top-0 bg-[#030919] flex flex-row items-center px-4 py-2 justify-between'>
                <div className="flex flex-row gap-4">
                    <img src="/icon.png" className='block size-16 md:size-20' alt="AICTE IDEA LAB, CET Icon" />
                    <a className='block' href="https://cet.ac.in">
                        <img src="/cet.png" className='block size-16 md:size-20' alt="CET Icon" />
                    </a>
                </div>

                <div className="flex flex-row items-center gap-16">
                    <nav>
                        <ul className='hidden lg:flex flex-row gap-6 text-neutral-200 font-medium'>
                            <NavList />
                        </ul>
                    </nav>

                    <div className='flex flex-row items-center gap-4'>
                        <button
                            className='focus-within:ring-primary ring-0 focus-within:ring-offset-2 transition-all bg-primary text-white px-3 md:px-4 py-1 lg:py-2 rounded-md'>
                            Visit the Lab
                        </button>
                        <button className="lg:hidden" onClick={() => {
                            setMenuOpen(!menuOpen);
                        }}>
                            {menuOpen ?

                                <i className="text-neutral-300 text-2xl ph ph-x"></i>
                                :
                                <i className="text-neutral-300 text-2xl ph ph-list"></i>
                            }
                        </button>
                    </div>
                </div>
            </header>
        </>
    )
}