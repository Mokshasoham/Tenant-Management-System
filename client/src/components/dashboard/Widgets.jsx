import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, MapPin, Globe } from 'lucide-react';

export function CalendarWidget() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

    const monthName = today.toLocaleString('default', { month: 'long' });
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col h-full overflow-hidden">
            <div className="flex items-center gap-2 mb-4 shrink-0">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <CalendarIcon className="w-4 h-4" />
                </div>
                <span className="font-bold text-white text-sm">{monthName} {currentYear}</span>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-white/30 mb-2 shrink-0">
                {days.map(d => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-fr">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const isToday = day === today.getDate();
                    return (
                        <div
                            key={day}
                            className={`flex items-center justify-center rounded-lg text-xs
                                ${isToday
                                    ? 'bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20'
                                    : 'text-white/70 hover:bg-white/5'
                                }`}
                        >
                            {day}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Helper: Analog Clock Face
function AnalogClock({ tz, name, code }) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Get time for specific timezone
    const localTimeStr = time.toLocaleString('en-US', { timeZone: tz });
    const localDate = new Date(localTimeStr);

    const seconds = localDate.getSeconds();
    const minutes = localDate.getMinutes();
    const hours = localDate.getHours();

    // Calculate angles
    const secondAngle = seconds * 6;
    const minuteAngle = minutes * 6 + seconds * 0.1;
    const hourAngle = (hours % 12) * 30 + minutes * 0.5;

    // Day/Night indicator (6am to 6pm is day)
    const isDay = hours >= 6 && hours < 18;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-20 h-20 rounded-full border-2 border-white/10 bg-white/5 shadow-inner flex items-center justify-center">
                {/* Clock Face Markers */}
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className={`absolute w-0.5 bg-white/20 origin-bottom ${i % 3 === 0 ? 'h-2 bg-white/40' : 'h-1'}`}
                        style={{
                            transform: `rotate(${i * 30}deg) translate(0, -9px)`, // Push to edge
                            top: 0,
                            bottom: '50%',
                            left: 'calc(50% - 1px)',
                            transformOrigin: '50% 100%',
                            height: '50%'
                        }}
                    >
                        <div className="absolute top-0 w-full bg-white/20" style={{ height: i % 3 === 0 ? 6 : 3 }} />
                    </div>
                ))}

                {/* Center dot */}
                <div className="absolute w-1.5 h-1.5 bg-white rounded-full z-10 box-content border border-[#0a0a16]" />

                {/* Hour Hand */}
                <motion.div
                    className="absolute w-1 bg-white rounded-full origin-bottom"
                    style={{ height: '25%', bottom: '50%', left: 'calc(50% - 2px)' }}
                    animate={{ rotate: hourAngle }}
                    transition={{ type: "spring", stiffness: 50, damping: 15 }}
                />

                {/* Minute Hand */}
                <motion.div
                    className="absolute w-0.5 bg-white/70 rounded-full origin-bottom"
                    style={{ height: '35%', bottom: '50%', left: 'calc(50% - 1px)' }}
                    animate={{ rotate: minuteAngle }}
                    transition={{ type: "spring", stiffness: 50, damping: 15 }}
                />

                {/* Second Hand */}
                <motion.div
                    className="absolute w-0.5 bg-rose-500 rounded-full origin-bottom"
                    style={{ height: '40%', bottom: '50%', left: 'calc(50% - 1px)' }}
                    animate={{ rotate: secondAngle }}
                    transition={{ duration: 0 }} // Linear movement for seconds
                />
            </div>
            <div className="text-center">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">{code}</p>
                <p className="text-[9px] text-white/40 font-medium">
                    {localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {/* Day/Night Icon */}
                    <span className="ml-1 opacity-50">{isDay ? '☀️' : '🌙'}</span>
                </p>
            </div>
        </div>
    );
}

export function WorldClockWidget() {
    const cities = [
        { name: 'India', tz: 'Asia/Kolkata', code: 'IND' },
        { name: 'New York', tz: 'America/New_York', code: 'NYC' },
        { name: 'London', tz: 'Europe/London', code: 'LDN' },
        { name: 'Tokyo', tz: 'Asia/Tokyo', code: 'TYO' },
        { name: 'Dubai', tz: 'Asia/Dubai', code: 'DXB' },
    ];

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 h-full flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2 shrink-0">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Globe className="w-4 h-4" />
                </div>
                <span className="font-bold text-white text-sm">World Clock</span>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-2 place-items-center flex-1 overflow-y-auto custom-scrollbar">
                {cities.map(city => (
                    <AnalogClock key={city.code} {...city} />
                ))}
            </div>
        </div>
    );
}

export default { CalendarWidget, WorldClockWidget };
