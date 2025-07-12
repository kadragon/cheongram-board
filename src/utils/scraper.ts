import * as cheerio from 'cheerio';

export async function scrapeGameData(url: string) {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  const gameData = {
    name: $('.product_title').text(),
    // Add other data extraction logic here
  };

  return gameData;
}
