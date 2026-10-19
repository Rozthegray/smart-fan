"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  CloudSun, MapPin, Power, Sun, Wind, 
  Clock, User, Home, Zap
} from "lucide-react";

export default function HomeDashboard() {
  const [fanOn, setFanOn] = useState<boolean>(false);
  const [lampOn, setLampOn] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("All Room");
  const [weather, setWeather] = useState<{ temp: number; condition: string } | null>(null);
  
  // Safe Client-Side State for Time & Greeting
  const [currentTime, setCurrentTime] = useState<string>("--");
  const [greeting, setGreeting] = useState<string>("Welcome");
  const [usageTime, setUsageTime] = useState<number>(0);

  useEffect(() => {
    // 1. Clock & Greeting Logic
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      const hour = now.getHours();
      setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);

    // 2. Fetch Open-Meteo Weather for Lagos
    async function fetchWeather() {
      try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=6.5244&longitude=3.3792&current=temperature_2m,weather_code&timezone=Africa%2FLagos");
        const data = await res.json();
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          condition: "Partly Cloudy"
        });
      } catch (err) {
        console.error("Weather fetch failed:", err);
      }
    }
    fetchWeather();

    // 3. Sync initial Fan State from ESP32
    async function syncFan() {
      try {
        const res = await fetch('/api/fan', { cache: 'no-store' });
        const data = await res.json();
        setFanOn(data.fanStatus === "ON");
      } catch (err) {}
    }
    syncFan();

    return () => clearInterval(timer);
  }, []);

  // Track Fan Usage when ON
  useEffect(() => {
    let usageTimer: NodeJS.Timeout;
    if (fanOn) {
      usageTimer = setInterval(() => setUsageTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(usageTimer);
  }, [fanOn]);

  const formatUsage = (seconds: number) => {
    if (seconds === 0) return "Standby";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s active`;
  };

  // Fixed Fan Toggle (Using Next.js Proxy instead of raw IP)
  const toggleFan = async (e: React.MouseEvent) => {
    e.preventDefault();
    const newState = fanOn ? "off" : "on";
    try {
      await fetch(`/api/fan?state=${newState}`, { method: "POST" });
      setFanOn(!fanOn);
    } catch (err) {
      console.error("Failed to toggle fan:", err);
    }
  };

  return (
    <main className="min-h-screen bg-sky-50 text-slate-800 flex items-center justify-center p-4 font-sans selection:bg-sky-200">
      <div className="w-full max-w-sm bg-white rounded-[40px] overflow-hidden shadow-[0_20px_50px_-12px_rgba(14,165,233,0.15)] flex flex-col h-[840px] relative border-[6px] border-white ring-1 ring-slate-100">
        
        {/* Status Bar */}
        <div className="pt-4 px-6 flex justify-between items-center text-xs font-semibold text-slate-400">
          <span>{currentTime}</span>
          <div className="w-16 h-1.5 bg-slate-200 rounded-full mx-auto" />
          <span>Lagos 📶</span>
        </div>

        {/* Header Section */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-sm font-semibold text-slate-400">{greeting},</p>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Innovator</h1>
            </div>
            <div className="w-12 h-12 rounded-full bg-sky-100 border-2 border-white shadow-sm ring-1 ring-sky-200 flex items-center justify-center">
              <User className="w-6 h-6 text-sky-600" />
            </div>
          </div>

          {/* Map & Weather Hub Card */}
          <div className="bg-sky-500 rounded-3xl p-5 relative overflow-hidden shadow-lg shadow-sky-500/20 text-white">
            {/* Stylized Dotted Map Background */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:14px_14px] mix-blend-overlay" />
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-sky-100 flex items-center gap-1.5 mb-1 uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5" /> Current Location
                </p>
                <h2 className="text-xl font-extrabold mb-4">Lagos, Nigeria</h2>
                
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black tracking-tighter">
                    {weather ? `${weather.temp}°` : "--°"}
                  </span>
                  <span className="text-sm font-medium text-sky-100 mb-1.5">Cloudy</span>
                </div>
              </div>
              
              <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/30 shadow-inner">
                <CloudSun className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Room Tabs */}
          <div className="flex space-x-2 overflow-x-auto pt-6 pb-2 scrollbar-none">
            {["All Room", "Living Room", "Bedroom", "Kitchen"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === tab 
                    ? "bg-slate-800 text-white shadow-md" 
                    : "bg-slate-50 text-slate-500 hover:bg-sky-50 hover:text-sky-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Device Grid (Command Center Style) */}
        <div className="flex-1 px-6 py-2 overflow-y-auto bg-slate-50/50 rounded-t-[32px] border-t border-slate-100 mt-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Active Devices</h3>
            <span className="text-xs font-bold text-sky-600 bg-sky-100 px-2 py-1 rounded-lg">2 Online</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pb-6">
            
            {/* Smart Fan Card with Usage Tracker */}
            <Link href="/fan" className="group">
              <div className={`p-4 rounded-3xl flex flex-col justify-between h-44 transition-all border-2 ${
                fanOn 
                  ? "bg-white border-sky-400 shadow-lg shadow-sky-100/50" 
                  : "bg-white border-slate-100 shadow-sm"
              }`}>
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-2xl transition-colors ${fanOn ? "bg-sky-500 text-white shadow-md shadow-sky-200" : "bg-sky-50 text-sky-500"}`}>
                    <Wind className={`w-6 h-6 ${fanOn ? "animate-pulse" : ""}`} />
                  </div>
                  <button 
                    onClick={toggleFan}
                    className={`w-11 h-6 rounded-full transition-colors relative p-1 ${fanOn ? 'bg-sky-500' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${fanOn ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                
                <div>
                  <h3 className="font-extrabold text-slate-800 mb-1">Smart Fan</h3>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 mb-2">
                    <Clock className="w-3 h-3 text-sky-500" /> 
                    <span className={fanOn ? "text-sky-600" : ""}>{formatUsage(usageTime)}</span>
                  </div>
                  <div className={`text-[10px] font-bold px-2 py-1 rounded-md inline-block ${fanOn ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                    {fanOn ? 'Running' : 'Standby'}
                  </div>
                </div>
              </div>
            </Link>

            {/* Smart Lamp Card */}
            <div className={`p-4 rounded-3xl flex flex-col justify-between h-44 transition-all border-2 ${
              lampOn 
                ? "bg-white border-amber-400 shadow-lg shadow-amber-100/50" 
                : "bg-white border-slate-100 shadow-sm"
            }`}>
              <div className="flex justify-between items-start">
                <div className={`p-3 rounded-2xl transition-colors ${lampOn ? "bg-amber-400 text-white shadow-md shadow-amber-200" : "bg-amber-50 text-amber-500"}`}>
                  <Sun className="w-6 h-6" />
                </div>
                <button 
                  onClick={() => setLampOn(!lampOn)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-1 ${lampOn ? 'bg-amber-400' : 'bg-slate-200'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${lampOn ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              
              <div>
                <h3 className="font-extrabold text-slate-800 mb-1">Smart Lamp</h3>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 mb-2">
                  <Zap className="w-3 h-3 text-amber-500" /> 
                  <span className={lampOn ? "text-amber-600" : ""}>12W Draw</span>
                </div>
                <div className={`text-[10px] font-bold px-2 py-1 rounded-md inline-block ${lampOn ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"}`}>
                  {lampOn ? 'Active' : 'Off'}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="bg-white border-t border-slate-100 py-4 px-8 flex justify-between items-center text-slate-400 rounded-b-[34px]">
          <button className="flex flex-col items-center gap-1 text-sky-500 transition-transform active:scale-95">
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold">Home</span>
          </button>
          
          <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center shadow-lg shadow-sky-500/30 text-white -mt-8 border-4 border-white transition-transform hover:scale-105 active:scale-95">
            <Power className="w-5 h-5" />
          </div>

          <Link href="/fan" className="flex flex-col items-center gap-1 hover:text-sky-500 transition-all active:scale-95">
            <Wind className="w-5 h-5" />
            <span className="text-[10px] font-bold">Fan</span>
          </Link>
        </div>

      </div>
    </main>
  );
}