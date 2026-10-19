"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Thermometer, Droplets, Power, ArrowLeft, 
  Activity, Zap, MapPin, Clock, User
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid 
} from "recharts";

interface TelemetryPoint {
  time: string;
  temperature: number;
  humidity: number;
  powerWatts: number;
  pwmPercent: number;
}

export default function FanControlPage() {
  const [fanOn, setFanOn] = useState<boolean>(false);
  const [speedLevel, setSpeedLevel] = useState<string>("Medium");
  const [speedValue, setSpeedValue] = useState<number>(195);
  const [temperature, setTemperature] = useState<number>(31.5);
  const [humidity, setHumidity] = useState<number>(63);
  const [systemMode, setSystemMode] = useState<string>("Fuzzy Auto");
  const [chartData, setChartData] = useState<TelemetryPoint[]>([]);
  const [usageTime, setUsageTime] = useState<number>(0);

  // Fetch telemetry every 3 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/fan", { cache: "no-store" });
        const data = await res.json();
        
        setTemperature(data.temperature);
        setHumidity(data.humidity);
        setFanOn(data.fanStatus === "ON");
        setSpeedValue(data.speed);
        setSystemMode(data.mode);

        const now = new Date();
        const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
        
        const currentDuty = data.fanStatus === "ON" ? data.speed : 0;
        const dutyRatio = currentDuty / 255;
        const estimatedWatts = parseFloat((dutyRatio * 6.5).toFixed(2));
        const dutyPercentage = Math.round(dutyRatio * 100);

        setChartData((prev) => {
          const newPoint: TelemetryPoint = {
            time: timeStr,
            temperature: data.temperature,
            humidity: data.humidity,
            powerWatts: estimatedWatts,
            pwmPercent: dutyPercentage,
          };
          const updated = [...prev, newPoint];
          return updated.slice(-12);
        });
      } catch (err) {
        console.error("ESP32 sync error:", err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Track Fan Usage Time (Timer)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (fanOn) {
      timer = setInterval(() => setUsageTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [fanOn]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const togglePower = async () => {
    const newState = fanOn ? "off" : "on";
    try {
      await fetch(`/api/fan?state=${newState}`, { method: "POST" });
      setFanOn(!fanOn);
    } catch (err) {
      console.error("Power toggle failed:", err);
    }
  };

  const handleLevelChange = async (level: string, pwm: number, mode: string) => {
    setSpeedLevel(level);
    setSpeedValue(pwm);
    setSystemMode(mode);
    try {
      await fetch(`/api/fan?state=on&speed=${pwm}&mode=${encodeURIComponent(mode)}`, { method: "POST" });
      if (!fanOn) setFanOn(true);
    } catch (err) {
      console.error("Speed update failed:", err);
    }
  };

  // Light Mode Fuzzy Tiers
  const getFuzzyTier = (temp: number) => {
    if (temp < 28.5) return { name: "Standby (<28.5°C)", color: "text-slate-500 bg-slate-100 border-slate-200" };
    if (temp >= 28.5 && temp < 34.0) return { name: "Eco / Low (28.5°C+)", color: "text-sky-600 bg-sky-100 border-sky-200" };
    if (temp >= 34.0 && temp < 38.0) return { name: "Comfort / Med (34°C+)", color: "text-amber-600 bg-amber-100 border-amber-200" };
    return { name: "Turbo / High (38°C+)", color: "text-rose-600 bg-rose-100 border-rose-200" };
  };

  const activeTier = getFuzzyTier(temperature);

  return (
    <main className="min-h-screen bg-sky-50 text-slate-800 flex items-center justify-center p-4 font-sans selection:bg-sky-200">
      <div className="w-full max-w-sm bg-white rounded-[40px] overflow-hidden shadow-[0_20px_50px_-12px_rgba(14,165,233,0.15)] flex flex-col h-[940px] relative border-[6px] border-white ring-1 ring-slate-100">
        
        {/* Top Header */}
        <div className="pt-6 px-6 flex justify-between items-center z-10">
          <Link href="/" className="p-2 bg-slate-50 rounded-full hover:bg-sky-50 text-slate-600 hover:text-sky-600 transition shadow-sm border border-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm text-slate-800">Smart Fan</span>
            <span className="text-[10px] text-sky-500 font-semibold uppercase tracking-wider">Innovator</span>
          </div>
          <div className="w-9 h-9 bg-sky-100 rounded-full flex items-center justify-center border border-sky-200 shadow-sm">
            <User className="w-4 h-4 text-sky-600" />
          </div>
        </div>

        {/* Animated Fan Visual */}
        <div className="flex flex-col items-center justify-center relative px-6 py-4">
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold border shadow-sm ${activeTier.color}`}>
            ⚡ {activeTier.name}
          </div>

          <div className="relative w-36 h-36 rounded-full border-[6px] border-sky-50 bg-white flex items-center justify-center shadow-inner mt-5">
            <div 
              className={`w-28 h-28 rounded-full flex items-center justify-center ${fanOn ? "animate-spin" : ""}`} 
              style={{ animationDuration: speedValue > 200 ? "0.4s" : speedValue > 150 ? "0.8s" : "1.5s" }}
            >
              <div className="absolute w-8 h-12 bg-sky-100/80 rounded-full top-1 border border-sky-200" />
              <div className="absolute w-8 h-12 bg-sky-100/80 rounded-full bottom-1 border border-sky-200" />
              <div className="absolute w-12 h-8 bg-sky-100/80 rounded-full left-1 border border-sky-200" />
              <div className="absolute w-12 h-8 bg-sky-100/80 rounded-full right-1 border border-sky-200" />
              <div className="w-6 h-6 rounded-full bg-sky-500 border-[3px] border-white z-10 shadow-md" />
            </div>
          </div>
          <div className="w-3 h-12 bg-gradient-to-b from-sky-100 to-sky-50 rounded-b-md shadow-inner border-x border-b border-sky-100" />
        </div>

        {/* Diagnostic Scroll Sheet */}
        <div className="bg-slate-50 text-slate-800 rounded-t-[36px] p-5 space-y-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] border-t border-slate-100 overflow-y-auto flex-1 pb-10">
          
          {/* Main Controls Row */}
          <div className="flex justify-between items-center px-1">
            <div className="flex flex-col items-center bg-white px-3 py-2.5 rounded-2xl border border-slate-100 shadow-sm w-24">
              <Thermometer className="w-5 h-5 text-sky-500" />
              <span className="font-extrabold text-sm text-slate-800 mt-1">{temperature}°C</span>
              <span className="text-[10px] text-slate-400 font-medium">Temp</span>
            </div>

            <button 
              onClick={togglePower}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition transform active:scale-95 border-2 ${
                fanOn 
                  ? "bg-sky-500 text-white shadow-sky-500/30 border-white ring-4 ring-sky-100" 
                  : "bg-white text-slate-400 border-slate-100 shadow-sm"
              }`}
            >
              <Power className="w-7 h-7" />
            </button>

            <div className="flex flex-col items-center bg-white px-3 py-2.5 rounded-2xl border border-slate-100 shadow-sm w-24">
              <Droplets className="w-5 h-5 text-blue-500" />
              <span className="font-extrabold text-sm text-slate-800 mt-1">{humidity}%</span>
              <span className="text-[10px] text-slate-400 font-medium">Humidity</span>
            </div>
          </div>

          {/* Map & Location Card (with Usage Timer) */}
          <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-sm relative overflow-hidden">
            {/* Stylized Map Background Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#0ea5e9_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
            <div className="relative flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-sky-500" /> Lagos, Nigeria
                </h3>
                <p className="text-[10px] text-slate-500 mt-1 font-medium bg-slate-50/80 px-2 py-0.5 rounded-md inline-block">
                  Connected: SmartFan-Setup
                </p>
              </div>
              <div className="text-right border-l border-sky-100 pl-4">
                <p className="text-[10px] text-slate-400 font-semibold flex items-center justify-end gap-1">
                  <Clock className="w-3 h-3" /> Usage
                </p>
                <p className="font-mono font-bold text-sky-600 text-sm mt-0.5">{formatTime(usageTime)}</p>
              </div>
            </div>
          </div>

          {/* Quick Mode Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Auto", pwm: 195, mode: "Fuzzy Auto" },
              { label: "Low", pwm: 140, mode: "Manual Low" },
              { label: "Med", pwm: 195, mode: "Manual Med" },
              { label: "Turbo", pwm: 255, mode: "Manual Turbo" },
            ].map((lvl) => {
              const isActive = systemMode === lvl.mode || (systemMode === "Fuzzy Auto" && lvl.label === "Auto");
              return (
                <button
                  key={lvl.label}
                  onClick={() => handleLevelChange(lvl.label, lvl.pwm, lvl.mode)}
                  className={`py-2 rounded-xl text-[10px] font-bold uppercase transition border ${
                    isActive 
                      ? "bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20" 
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>

          {/* Chart 1: Room Climate Trend */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="p-1 bg-sky-50 rounded-lg">
                  <Activity className="w-4 h-4 text-sky-500" />
                </div>
                <span className="text-xs font-bold text-slate-700">Room Climate</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-sky-500 bg-sky-50 px-2 py-1 rounded-md">{temperature}°C / {humidity}%</span>
            </div>
            
            <div className="h-28 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="humGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} domain={["dataMin - 2", "dataMax + 2"]} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "11px", color: "#0f172a", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Area type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#tempGradient)" />
                  <Area type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#3b82f6" strokeWidth={1.5} fill="url(#humGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Energy Flow */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="p-1 bg-amber-50 rounded-lg">
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-xs font-bold text-slate-700">Energy Flow</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-md">
                {fanOn ? `${((speedValue / 255) * 6.5).toFixed(1)}W (${Math.round((speedValue / 255) * 100)}%)` : "0.0W (0%)"}
              </span>
            </div>

            <div className="h-28 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} domain={[0, 7]} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "11px", color: "#0f172a", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Area type="monotone" dataKey="powerWatts" name="Power (Watts)" stroke="#f59e0b" strokeWidth={2.5} fill="url(#powerGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}