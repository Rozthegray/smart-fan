import { NextResponse } from 'next/server';

const FIREBASE_URL = process.env.NEXT_PUBLIC_FIREBASE_URL || "https://smartfan-7f946-default-rtdb.europe-west1.firebasedatabase.app";

// GET: Fetch live telemetry status from Firebase
export async function GET() {
  try {
    const response = await fetch(`${FIREBASE_URL}/status.json`, { cache: 'no-store' });
    const data = await response.json();
    return NextResponse.json(data || {});
  } catch (error) {
    return NextResponse.json({ error: "Failed to connect to Firebase" }, { status: 500 });
  }
}

// POST: Send control commands to Firebase control node
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const updates: Record<string, any> = {};

    // Extract query parameters
    if (searchParams.has('state')) updates.state = searchParams.get('state');
    if (searchParams.has('speed')) updates.speed = Number(searchParams.get('speed'));
    if (searchParams.has('mode')) updates.mode = searchParams.get('mode');

    // Use PATCH to only update the provided fields without overwriting the entire node
    const response = await fetch(`${FIREBASE_URL}/control.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update Firebase" }, { status: 500 });
  }
}
