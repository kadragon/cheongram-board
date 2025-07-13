import * as cheerio from 'cheerio';

export async function scrapeGame(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      // Log the status and return a structured error
      console.warn(`Failed to fetch page: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const name = $('.prd_title').first().text().trim();
    if (!name) {
      console.warn("Could not find game name with selector '.prd_title'");
      // We can decide to throw an error or return partial data.
      // For now, let's throw, as the name is essential.
      throw new Error("Could not extract the game name.");
    }

    let min_players = null;
    let max_players = null;
    let play_time = null;

    $('.item_guide_info .htit').each((index, element) => {
      const htitText = $(element).text().trim();
      const pText = $(element).siblings('p.desc').text().trim();

      if (htitText === '인원') {
        // More robust regex to handle different formats like "2~4", "2-4", "2 ~ 4"
        const matches = pText.match(/(\d+)\s*[~-]\s*(\d+)/);
        if (matches && matches.length >= 3) {
          min_players = parseInt(matches[1], 10);
          max_players = parseInt(matches[2], 10);
        } else {
          // Handle single player count like "1인" or "8인 이상"
          const singlePlayerMatch = pText.match(/(\d+)/);
          if (singlePlayerMatch) {
            min_players = parseInt(singlePlayerMatch[1], 10);
            max_players = parseInt(singlePlayerMatch[1], 10); // Or set to null if it's a minimum
          }
        }
      } else if (htitText === '소요시간') {
        // More robust regex for time, e.g., "30분", "60-90분"
        const matches = pText.match(/(\d+)/);
        if (matches && matches.length > 0) {
          play_time = parseInt(matches[1], 10);
        }
      }
    });

    // Try multiple selectors for the image for better resilience
    const imageUrl = 
      $('img[alt="메인이미지"]').attr('src') || 
      $('#main_image').attr('src') || // A hypothetical alternative selector
      $('.product-image img').first().attr('src') ||
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
    // Ensure the error is re-thrown so the API route can catch it
    throw new Error(`Scraping failed: ${error.message}`);
  }
}

