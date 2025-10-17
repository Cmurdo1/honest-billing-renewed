from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    context = browser.new_context(viewport={'width': 375, 'height': 667})
    page = context.new_page()
    page.goto("http://127.0.0.1:5173/")
    page.screenshot(path="jules-scratch/verification/verification.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)