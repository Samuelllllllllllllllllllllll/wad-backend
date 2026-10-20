// src/lib/utils.js

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import corsHeaders from "./cors";

export function printExceptionLog(logMessage, error) {
  console.log(`==>${logMessage} Exception`);
  console.log(error);
}

export function errorResponse(message, status) {
  return NextResponse.json(
    {
      message: message,
    },
    {
      status: status,
      headers: corsHeaders,
    },
  );
}

export function successResponse(jsonData, status) {
  return NextResponse.json(jsonData, {
    status: status,
    headers: corsHeaders,
  });
}

// Response for CORS preflight requests
export function optionsResponse() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export function toObjectId(id) {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === String(id)
    ? new ObjectId(id)
    : null;
}

export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
