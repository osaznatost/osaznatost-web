import type { MetadataRoute } from "next";

// Докато сайтът е вътрешен прототип с парола, търсачките не го индексират. При пускане: махнете паролата (SITE_PASSWORD) и правилото става „allow“.
export default function robots(): MetadataRoute.Robots {
  const open = !process.env.SITE_PASSWORD;
  return {
    rules: open ? { userAgent: "*", allow: "/" } : { userAgent: "*", disallow: "/" },
    sitemap: "https://osaznatost-web.vercel.app/sitemap.xml",
  };
}
