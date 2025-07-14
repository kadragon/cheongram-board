import { parse } from 'node-html-parser';

export async function scrapeGame(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.warn(`Failed to fetch page: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }

    const html = await response.text();
    const root = parse(html);

    const name = root.querySelector('.prd_title')?.text.trim();
    if (!name) {
      console.warn("Could not find game name with selector '.prd_title'");
      throw new Error("Could not extract the game name.");
    }

    let min_players = null;
    let max_players = null;
    let play_time = null;

    root.querySelectorAll('.item_guide_info .htit').forEach(element => {
      const htitText = element.text.trim();
      const pText = element.nextElementSibling?.text.trim();

      if (pText) {
        if (htitText === '인원') {
          const matches = pText.match(/(\d+)\s*[~-]\s*(\d+)/);
          if (matches && matches.length >= 3) {
            min_players = parseInt(matches[1], 10);
            max_players = parseInt(matches[2], 10);
          } else {
            const singlePlayerMatch = pText.match(/(\d+)/);
            if (singlePlayerMatch) {
              min_players = parseInt(singlePlayerMatch[1], 10);
              max_players = parseInt(singlePlayerMatch[1], 10);
            }
          }
        } else if (htitText === '소요시간') {
          const matches = pText.match(/(\d+)/);
          if (matches && matches.length > 0) {
            play_time = parseInt(matches[1], 10);
          }
        }
      }
    });

    const imageUrl =
      root.querySelector('img[alt="메인이미지"]')?.getAttribute('src') ||
      root.querySelector('#main_image')?.getAttribute('src') ||
      root.querySelector('.product-image img')?.getAttribute('src') ||
      null;

    if (!imageUrl) {
      console.warn("Could not find image URL.");
    }

    return {
      title: name,
      min_players,
      max_players,
      play_time,
      koreaboardgames_url: url,
      image_url: imageUrl,
    };

  } catch (error: any) {
    console.error("Error during scraping:", error.message);
    throw new Error(`Scraping failed: ${error.message}`);
  }
}