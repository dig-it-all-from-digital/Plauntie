import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        pixel_5 = p.devices['Pixel 5']
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(**pixel_5)
        page = await context.new_page()

        try:
            await page.goto("http://localhost:3000/", timeout=60000)
            await expect(page.get_by_role("heading", name="Plauntie")).to_be_visible()
            await page.screenshot(path="jules-scratch/verification/01_mobile_main_view_v2.png")
            print("Screenshot of main view (v2) taken.")

        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
