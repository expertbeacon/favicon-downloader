import { ResponseInfo } from "@/types";
import { type ClassValue, clsx } from "clsx";
import { NextRequest } from "next/server";
import { twMerge } from "tailwind-merge";

// Utility function to combine Tailwind CSS classes with clsx and merge conflicts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a canonical link based on the environment
export const canonicalLink = (domain: string, pathname: string) => {
  const isProduction = process.env.NODE_ENV === 'production';
  return `${isProduction ? "https" : "http"}://${domain}${pathname}`;
}

// Fetch favicons from a given URL and return ResponseInfo
export const getFavicons = async ({ url, headers }: { url: string, headers?: Headers }): Promise<ResponseInfo> => {
  const newUrl = new URL(url); // Create a URL object to extract the host

  try {
    // Perform the fetch request with optional headers and redirection follow
    const response = await fetch(newUrl.toString(), {
      method: "GET",
      redirect: "follow",
      headers
    });

    const body = await response.text();
    const responseUrl = new URL(response.url);

    // Regex to match <link> tags with "rel" containing "icon"
    const regex = /<link[^>]*rel=['"][^'"]*icon[^'"]*['"][^>]*>/gi;
    const matches = Array.from(body.matchAll(regex));
    const icons: { sizes: string, href: string }[] = [];

    matches.forEach((match) => {
      const linkTag = match[0];

      // Extract href value
      const hrefMatch = linkTag.match(/href=['"](.*?)['"]/i);
      const href = hrefMatch ? hrefMatch[1] : null;

      // Extract sizes value
      const sizesMatch = linkTag.match(/sizes=['"](.*?)['"]/i);
      const sizes = sizesMatch ? sizesMatch[1] : null;

      if (href) {
        icons.push({
          sizes: sizes || 'unknown',
          href: href.startsWith('http') ? href : `${responseUrl.protocol}//${responseUrl.host}${href}`
        });
      }
    });

    return {
      url: responseUrl.href,
      host: responseUrl.host,
      status: response.status,
      statusText: response.statusText,
      icons
    };
  } catch (error) {
    console.error(`Error fetching favicons: ${error}`);
    return {
      url: newUrl.href,
      host: newUrl.host,
      status: 500,
      statusText: 'Failed to fetch icons',
      icons: []
    };
  }
};

// Function to fetch favicon from alternative sources
export const proxyFavicon = async ({ domain, request }: { domain: string; request: NextRequest }) => {
  // List of alternative sources to fetch favicons
  const sources = [
    `https://www.google.com/s2/favicons?domain=${domain}`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`
    // `https://icon.horse/icon/${domain}`
  ];
  let response: Response = new Response();
  // Attempt to fetch favicon from each source
  for (const source of sources) {
    try {
      response = await fetch(source, {
        method: request.method,
        headers: request.headers,
        redirect: 'follow'
      });
      if (response.status == 200) {
        break;
      }

      console.log("icon source:", source);

    } catch (error) {
      console.error(`Error fetching proxy favicon: ${error}`);
    }
  }
  if (response.status !== 200) {
    const firstLetter = domain.charAt(0).toUpperCase();
    const svgContent = `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#cccccc"/>
        <text x="50%" y="50%" font-size="48" text-anchor="middle" dominant-baseline="middle" fill="#000000">${firstLetter}</text>
      </svg>
    `;
    return new Response(svgContent, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=86400',
        'Content-Type': 'image/svg+xml'
      }
    });
  } else {
    // Return the fetched favicon
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/x-icon',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

};
