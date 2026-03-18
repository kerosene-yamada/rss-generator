export interface FeedItem {
  title: string;
  link: string;
  date: string;
  description?: string;
}

export interface SiteConfig {
  name: string;
  url: string;
  scraper: (html: string, baseUrl: string) => FeedItem[];
}

export interface LoginSiteConfig {
  name: string;
  loginUrl: string;
  url: string;
  scraper: (html: string, baseUrl: string) => FeedItem[];
}
