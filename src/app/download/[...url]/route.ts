import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'edge';
export async function GET(request: NextRequest) {
  const { nextUrl } = request;
  let url = nextUrl.href.split(`${nextUrl.host}/download/`)[1];
  url = decodeURIComponent(url);

  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    // Fetch the image from the provided URL
    const response = await fetch(url, { method: 'GET', redirect: "follow" });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Get the image as a buffer
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'image/png';

    // Map content types to file extensions
    const extensionMap: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/x-icon': 'ico',
      'image/svg+xml': 'svg',
    };

    const fileExtension = extensionMap[contentType];

    if (!fileExtension) NextResponse.json({ error: 'Content-Type', message: contentType }, { status: 500 });

    // Create the response with the image buffer and appropriate headers
    return new NextResponse(Buffer.from(imageBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename=favicon.${fileExtension}`,
      },
    });
  } catch (error: any) {
    console.error('Error downloading image:', error);
    return NextResponse.json({ error: 'Failed to download image', messages: error.message }, { status: 500 });
  }
}
