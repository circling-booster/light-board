import re
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

URL_REGEX = re.compile(r"https?://[^\s)\]}>'\"]+")


def extract_first_url(text: str) -> str | None:
    match = URL_REGEX.search(text)
    return match.group(0) if match else None


async def fetch_og(url: str) -> dict[str, str | None]:
    try:
        async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        og_title = soup.find("meta", property="og:title")
        og_image = soup.find("meta", property="og:image")

        title = og_title.get("content") if og_title else None
        if not title:
            title_tag = soup.find("title")
            title = title_tag.text.strip() if title_tag else None

        image = og_image.get("content") if og_image else None
        if image:
            image = urljoin(str(response.url), image)

        return {"url": str(response.url), "title": title, "image": image}
    except Exception:
        return {"url": url, "title": None, "image": None}
