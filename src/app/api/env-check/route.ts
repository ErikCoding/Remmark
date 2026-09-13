import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    firebase: {
      apiKey: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
      authDomain: Boolean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
      projectId: Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
      messagingSenderId: Boolean(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
      appId: Boolean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
    },
    translation: {
      apiUrl: Boolean(process.env.TRANSLATION_API_URL),
      apiKey: Boolean(process.env.TRANSLATION_API_KEY),
    },
  });
}
