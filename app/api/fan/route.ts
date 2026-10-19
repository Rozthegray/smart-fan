import { NextResponse } from 'next/server';

const ESP_IP = process.env.NEXT_PUBLIC_ESP32_IP || "192.168.4.1";

// GET: Fetch status from ESP32
export async function GET() {
  try {
    const response = await fetch(`http://${ESP_IP}/status`, { cache: 'no-store' });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to connect to ESP32" }, { status: 500 });
  }
}

// POST: Send control commands to ESP32
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const speed = searchParams.get('speed');
    const mode = searchParams.get('mode');

    let url = `http://${ESP_IP}/control?`;
    if (state) url += `state=${state}&`;
    if (speed) url += `speed=${speed}&`;
    if (mode) url += `mode=${encodeURIComponent(mode)}`;

    const response = await fetch(url, { method: 'POST' });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to control ESP32" }, { status: 500 });
  }
}